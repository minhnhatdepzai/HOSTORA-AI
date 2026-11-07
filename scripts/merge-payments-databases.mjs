import { mkdirSync, cpSync, readdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const [sourceArg, targetArg, sourceStudioArg, targetStudioArg] = process.argv.slice(2);
if (!sourceArg || !targetArg) {
  console.error(
    "Usage: node scripts/merge-payments-databases.mjs <source.sqlite> <target.sqlite> [source-studio] [target-studio]",
  );
  process.exit(1);
}

const source = path.resolve(sourceArg);
const target = path.resolve(targetArg);
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDirectory = path.join(path.dirname(target), "backups", timestamp);
mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });

const sqlString = (value) => `'${value.replaceAll("'", "''")}'`;
const snapshot = (filename, label) => {
  const db = new DatabaseSync(filename);
  const destination = path.join(backupDirectory, `${label}.sqlite`);
  db.exec(`VACUUM INTO ${sqlString(destination)}`);
  db.close();
  return destination;
};

const sourceBackup = snapshot(source, "source-before-merge");
const targetBackup = snapshot(target, "target-before-merge");
const db = new DatabaseSync(target);
db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 10000; PRAGMA foreign_keys = ON;");
db.exec(`ATTACH DATABASE ${sqlString(source)} AS source_db`);

const mergeTable = (table, where = "1") => {
  const targetColumns = db
    .prepare(`PRAGMA main.table_info(${JSON.stringify(table)})`)
    .all()
    .map((row) => row.name);
  const sourceColumns = new Set(
    db
      .prepare(`PRAGMA source_db.table_info(${JSON.stringify(table)})`)
      .all()
      .map((row) => row.name),
  );
  const columns = targetColumns.filter((column) => sourceColumns.has(column));
  if (!columns.length) return 0;
  const quoted = columns.map((column) => `"${column}"`).join(", ");
  const before = db.prepare(`SELECT COUNT(*) AS count FROM main."${table}"`).get().count;
  db.exec(
    `INSERT OR IGNORE INTO main."${table}" (${quoted}) SELECT ${columns.map((column) => `s."${column}"`).join(", ")} FROM source_db."${table}" s WHERE ${where}`,
  );
  const after = db.prepare(`SELECT COUNT(*) AS count FROM main."${table}"`).get().count;
  return after - before;
};

const merged = {};
db.exec("BEGIN IMMEDIATE");
try {
  merged.customer_accounts = mergeTable("customer_accounts");
  merged.invoices = mergeTable("invoices");
  merged.sale_requests = mergeTable(
    "sale_requests",
    "s.invoice_id IS NULL OR EXISTS (SELECT 1 FROM main.invoices i WHERE i.id = s.invoice_id)",
  );
  merged.vouchers = mergeTable(
    "vouchers",
    "EXISTS (SELECT 1 FROM main.invoices i WHERE i.id = s.issued_invoice_id) AND (s.redeemed_invoice_id IS NULL OR EXISTS (SELECT 1 FROM main.invoices r WHERE r.id = s.redeemed_invoice_id))",
  );
  merged.invoice_events = mergeTable(
    "invoice_events",
    "EXISTS (SELECT 1 FROM main.invoices i WHERE i.id = s.invoice_id)",
  );
  for (const table of [
    "customer_ai_memory",
    "customer_ai_sources",
    "customer_chat_messages",
    "customer_studio_preferences",
    "customer_support_cases",
  ])
    merged[table] = mergeTable(
      table,
      "EXISTS (SELECT 1 FROM main.customer_accounts c WHERE c.id = s.customer_id)",
    );
  merged.ai_conversations = mergeTable(
    "ai_conversations",
    "s.customer_id IS NULL OR EXISTS (SELECT 1 FROM main.customer_accounts c WHERE c.id = s.customer_id)",
  );
  merged.ai_conversation_messages = mergeTable(
    "ai_conversation_messages",
    "EXISTS (SELECT 1 FROM main.ai_conversations c WHERE c.id = s.conversation_id)",
  );
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
} finally {
  db.exec("DETACH DATABASE source_db");
  db.close();
}

let studioFiles = 0;
if (sourceStudioArg && targetStudioArg) {
  const sourceStudio = path.resolve(sourceStudioArg);
  const targetStudio = path.resolve(targetStudioArg);
  mkdirSync(targetStudio, { recursive: true, mode: 0o700 });
  for (const entry of readdirSync(sourceStudio, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    cpSync(path.join(sourceStudio, entry.name), path.join(targetStudio, entry.name), {
      errorOnExist: false,
      force: false,
    });
    studioFiles += 1;
  }
}

console.log(
  JSON.stringify(
    {
      source,
      target,
      backups: { source: sourceBackup, target: targetBackup },
      merged,
      studioFiles,
    },
    null,
    2,
  ),
);
