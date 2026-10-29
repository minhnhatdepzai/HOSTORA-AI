import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.HOSTORA_LOAD_BASE_URL ?? "http://127.0.0.1:3000";
const target = new URL(baseUrl);
const loopbackHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
if (
  !loopbackHosts.has(target.hostname) &&
  process.env.HOSTORA_LOAD_ALLOW_REMOTE !== "true"
)
  throw new Error(
    "Load test chỉ được gọi loopback. Đặt HOSTORA_LOAD_ALLOW_REMOTE=true sau khi đã xác nhận staging từ xa chịu được tải.",
  );

const endpoint = process.env.HOSTORA_LOAD_ENDPOINT ?? "/api/ai/analyze";
const timeoutMs = boundedNumber(
  process.env.HOSTORA_LOAD_TIMEOUT_MS,
  1_000,
  180_000,
  100_000,
);
const cooldownMs = boundedNumber(
  process.env.HOSTORA_LOAD_COOLDOWN_MS,
  0,
  30_000,
  2_000,
);
const phases = parsePhases(
  process.env.HOSTORA_LOAD_LEVELS ?? "1:6,2:8,4:12,8:16",
);
const output = path.resolve(
  process.env.HOSTORA_LOAD_OUTPUT ??
    `output/ai-load/${new Date().toISOString().replaceAll(":", "-")}`,
);
const prompts = [
  "Tôi mở cửa hàng mỹ phẩm online, khoảng 8.000 lượt truy cập mỗi tháng, ngân sách 350.000 đồng một tháng và cần mua tên miền.",
  "Tôi chỉ làm website giới thiệu công ty nội thất, không bán hàng trực tuyến, dự kiến 2.000 lượt xem mỗi tháng, ngân sách 200.000 đồng và đã có tên miền.",
  "Mình viết blog chia sẻ công thức nấu ăn, lượng người đọc chưa rõ, chưa biết nên dành bao nhiêu tiền và cần đăng ký tên miền mới.",
  "Shop quần áo nhận đơn trên website, khoảng mười lăm nghìn khách ghé mỗi tháng, có tên miền rồi và muốn chi tối đa 500 nghìn đồng mỗi tháng.",
  "Tôi cần trang giới thiệu dịch vụ kế toán cho doanh nghiệp nhỏ, không có thanh toán online, khoảng 1.500 lượt truy cập, ngân sách 180.000 đồng mỗi tháng.",
  "Cửa hàng bán đồ thủ công cần website có đơn hàng, chưa ước lượng được lượng khách, ngân sách khoảng 300.000 đồng mỗi tháng và chưa có tên miền.",
];

function boundedNumber(raw, min, max, fallback) {
  const value = Number(raw ?? fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function parsePhases(value) {
  const parsed = value.split(",").map((item) => {
    const [rawConcurrency, rawRequests] = item.split(":");
    return {
      concurrency: boundedNumber(rawConcurrency, 1, 32, 1),
      requests: boundedNumber(rawRequests, 1, 100, 1),
    };
  });
  if (!parsed.length) throw new Error("HOSTORA_LOAD_LEVELS không hợp lệ.");
  return parsed;
}

function percentile(values, quantile) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * quantile) - 1)];
}

function round(value, digits = 2) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function validAnalysis(value) {
  return (
    value &&
    ["store", "company", "blog", "unknown"].includes(value.websiteType) &&
    Array.isArray(value.known) &&
    Array.isArray(value.missing) &&
    typeof value.followUpQuestion === "string"
  );
}

async function runRequest(index) {
  const startedAt = performance.now();
  try {
    const response = await fetch(new URL(endpoint, target), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hostora-load-test": "isolated-staging",
      },
      body: JSON.stringify({ text: prompts[index % prompts.length] }),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await response.json().catch(() => null);
    const schemaValid = response.ok && validAnalysis(body);
    return {
      index,
      status: response.status,
      ok: schemaValid,
      timeout: false,
      latencyMs: Math.round(performance.now() - startedAt),
      model: typeof body?.model === "string" ? body.model : null,
      failure: schemaValid
        ? null
        : response.ok
          ? "invalid-response-schema"
          : (body?.error ?? `HTTP ${response.status}`),
    };
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    const timeout = name === "TimeoutError" || name === "AbortError";
    return {
      index,
      status: null,
      ok: false,
      timeout,
      latencyMs: Math.round(performance.now() - startedAt),
      model: null,
      failure: timeout
        ? `client-timeout-${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

async function runPhase({ concurrency, requests }) {
  let nextIndex = 0;
  const results = [];
  const startedAt = performance.now();
  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= requests) return;
      results.push(await runRequest(index));
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, requests) }, () => worker()),
  );
  const durationMs = Math.round(performance.now() - startedAt);
  const successful = results.filter((item) => item.ok);
  const latencies = successful.map((item) => item.latencyMs);
  const timeouts = results.filter((item) => item.timeout).length;
  const failures = results.length - successful.length;
  return {
    concurrency,
    requests,
    successful: successful.length,
    failures,
    timeouts,
    errorRate: round(failures / results.length),
    durationMs,
    throughputRps: round(results.length / (durationMs / 1000), 3),
    successfulThroughputRps: round(successful.length / (durationMs / 1000), 3),
    latencyMs: {
      min: latencies.length ? Math.min(...latencies) : null,
      p50: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
      p99: percentile(latencies, 0.99),
      max: latencies.length ? Math.max(...latencies) : null,
    },
    models: [...new Set(successful.map((item) => item.model).filter(Boolean))],
    results: results.sort((left, right) => left.index - right.index),
  };
}

function markdownReport(summary) {
  const rows = summary.phases
    .map(
      (phase) =>
        `| ${phase.concurrency} | ${phase.requests} | ${phase.successful} | ${phase.timeouts} | ${phase.errorRate} | ${phase.successfulThroughputRps} | ${phase.latencyMs.p50 ?? "—"} | ${phase.latencyMs.p95 ?? "—"} | ${phase.latencyMs.max ?? "—"} |`,
    )
    .join("\n");
  return `# HOSTORA AI load test\n\n- Thời gian: ${summary.startedAt} → ${summary.finishedAt}\n- Revision: \`${summary.gitHead}\`\n- Target: \`${summary.target}\`\n- Timeout client: ${summary.timeoutMs} ms\n- Trạng thái: **${summary.status}**\n\n| Đồng thời | Request | Thành công | Timeout | Error rate | Throughput thành công (req/s) | p50 (ms) | p95 (ms) | max (ms) |\n|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n${rows}\n\n## Cách đọc\n\nLatency là end-to-end từ client staging tới khi API trả JSON hợp lệ. Throughput chỉ tính response thành công. Đây là benchmark local trên một máy, không phải SLA production hay bằng chứng chịu DDoS.\n`;
}

await mkdir(output, { recursive: true });
const startedAt = new Date().toISOString();
console.log(`Warm-up ${new URL(endpoint, target)}`);
const warmups = [await runRequest(0), await runRequest(1)];
if (warmups.some((item) => !item.ok)) {
  await writeFile(
    path.join(output, "warmup.json"),
    JSON.stringify(warmups, null, 2),
  );
  throw new Error("Warm-up AI không đạt; dừng trước khi tạo tải đồng thời.");
}

const phaseResults = [];
let stoppedEarly = false;
for (const phase of phases) {
  console.log(
    `Phase concurrency=${phase.concurrency}, requests=${phase.requests}`,
  );
  const result = await runPhase(phase);
  phaseResults.push(result);
  console.log(
    JSON.stringify({
      concurrency: result.concurrency,
      successful: result.successful,
      failures: result.failures,
      timeouts: result.timeouts,
      throughputRps: result.successfulThroughputRps,
      p50Ms: result.latencyMs.p50,
      p95Ms: result.latencyMs.p95,
      maxMs: result.latencyMs.max,
    }),
  );
  await writeFile(
    path.join(output, "progress.json"),
    JSON.stringify({ startedAt, warmups, phases: phaseResults }, null, 2),
  );
  if (
    result.errorRate > 0.25 ||
    (result.latencyMs.p95 !== null && result.latencyMs.p95 >= timeoutMs * 0.9)
  ) {
    stoppedEarly = true;
    break;
  }
  if (cooldownMs)
    await new Promise((resolve) => setTimeout(resolve, cooldownMs));
}

const baseline = phaseResults.find((phase) => phase.concurrency === 1);
const hasFailures = phaseResults.some((phase) => phase.failures > 0);
const status =
  baseline && baseline.successful !== baseline.requests
    ? "baseline-failed"
    : stoppedEarly || hasFailures
      ? "saturated"
      : "completed";
const summary = {
  schemaVersion: 1,
  startedAt,
  finishedAt: new Date().toISOString(),
  gitHead: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  target: new URL(endpoint, target).toString(),
  timeoutMs,
  cooldownMs,
  status,
  stoppedEarly,
  warmups,
  phases: phaseResults,
  limitations: [
    "Loopback single-host staging; no Internet, CDN, WAF or multi-node latency.",
    "Client end-to-end latency; server logs remain the source for model token counts and internal generation latency.",
    "Synthetic prompts without PII; this measures capacity and schema success, not full answer quality.",
  ],
};
await writeFile(
  path.join(output, "results.json"),
  JSON.stringify(summary, null, 2),
);
await writeFile(path.join(output, "report.md"), markdownReport(summary));
console.log(JSON.stringify({ output, status, phases: phaseResults }, null, 2));
if (status === "baseline-failed") process.exitCode = 1;
