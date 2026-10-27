import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const directory = path.join(process.cwd(), "data", "runtime", "site-studio", "feedback");
const summary = {
  total: 0,
  helpful: 0,
  needsWork: 0,
  reasons: Object.fromEntries(
    ["visual", "copy", "navigation", "business_fit", "other"].map((name) => [name, 0]),
  ),
  withRevision: 0,
};
const files = await readdir(directory).catch(() => []);
for (const file of files) {
  if (!file.endsWith(".json")) continue;
  try {
    const event = JSON.parse(await readFile(path.join(directory, file), "utf8"));
    if (!(["helpful", "needs_work"].includes(event.rating) &&
      Object.hasOwn(summary.reasons, event.reason) &&
      Number.isInteger(event.revisionCount))) continue;
    summary.total += 1;
    summary[event.rating === "helpful" ? "helpful" : "needsWork"] += 1;
    summary.reasons[event.reason] += 1;
    if (event.revisionCount > 0) summary.withRevision += 1;
  } catch {
    // Ignore malformed local records, without printing customer content.
  }
}
console.log(JSON.stringify(summary, null, 2));
