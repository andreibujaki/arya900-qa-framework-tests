import fs from "node:fs";
import path from "node:path";

const SCHEMA_VERSION = 1;

export function redact(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    return value
      .replace(/[A-Za-z]:\\Users\\[^\\/]+/gi, "<user-home>")
      .replace(/\/Users\/[^/]+/g, "<user-home>")
      .replace(/\\Users\\[^\\]+/g, "<user-home>")
      .replace(/models\\[^\s"]+\.gguf/gi, "models/<model>.gguf");
  }
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (/modelPath|password|token|secret/i.test(k) && typeof v === "string") {
        out[k] = "<redacted>";
      } else out[k] = redact(v);
    }
    return out;
  }
  return value;
}

export function writeReport(cfg, results, extra = {}) {
  fs.mkdirSync(cfg.sessionDir, {recursive: true});
  const counts = {
    pass: results.filter((r) => r.status === "pass").length,
    fail: results.filter((r) => r.status === "fail").length,
    soft_fail: results.filter((r) => r.status === "soft_fail").length,
    skip: results.filter((r) => r.status === "skip").length,
    error: results.filter((r) => r.status === "error").length,
    quarantine: results.filter((r) => r.status === "quarantine").length
  };
  const summary = redact({
    schemaVersion: SCHEMA_VERSION,
    at: new Date().toISOString(),
    runId: cfg.runId,
    configFingerprint: cfg.configFingerprint,
    project: cfg.project,
    suite: cfg.suite,
    port: cfg.cdpPort,
    counts,
    total: results.length,
    results,
    ...extra
  });

  const jsonPath = path.join(cfg.sessionDir, "REPORT.json");
  if (cfg.fromId && fs.existsSync(jsonPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      const byId = new Map((prev.results || []).map((r) => [r.id, r]));
      for (const r of results) byId.set(r.id, r);
      summary.results = [...byId.values()];
      summary.mergedFrom = prev.runId;
    } catch {
      /* keep */
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

  const md = [
    "# Suite report",
    "",
    `At: ${summary.at}`,
    `Run: ${summary.runId}`,
    `Project: ${summary.project} / suite: ${summary.suite || "-"}`,
    "",
    `pass=${counts.pass} fail=${counts.fail} soft_fail=${counts.soft_fail} skip=${counts.skip} error=${counts.error} quarantine=${counts.quarantine}`,
    "",
    "| ID | Status | Notes | Req |",
    "| --- | --- | --- | --- |",
    ...summary.results.map(
      (r) =>
        `| ${r.id} | ${r.status} | ${(r.notes || []).join("; ").replace(/\|/g, "/")} | ${r.requirementId || ""} |`
    ),
    ""
  ].join("\n");
  const mdPath = path.join(cfg.sessionDir, "REPORT.md");
  fs.writeFileSync(mdPath, md);

  const junit = toJUnit(summary);
  fs.writeFileSync(path.join(cfg.sessionDir, "junit.xml"), junit);

  const allureDir = path.join(cfg.sessionDir, "allure-results");
  fs.mkdirSync(allureDir, {recursive: true});
  for (const r of summary.results) {
    const status =
      r.status === "pass"
        ? "passed"
        : r.status === "skip" || r.status === "quarantine"
          ? "skipped"
          : "failed";
    fs.writeFileSync(
      path.join(allureDir, `${r.id}-${Date.now()}.json`),
      JSON.stringify({
        name: r.id,
        status,
        statusDetails: {message: (r.notes || []).join("\n")},
        labels: [
          {name: "suite", value: summary.suite || "default"},
          {name: "severity", value: r.severity || "blocker"}
        ]
      })
    );
  }

  const jobSummary = [
    `### Arya QA ${summary.suite || summary.project}`,
    "",
    `pass **${counts.pass}** / fail **${counts.fail}** / skip **${counts.skip}** / quarantine **${counts.quarantine}**`,
    "",
    md
  ].join("\n");
  fs.writeFileSync(path.join(cfg.sessionDir, "job-summary.md"), jobSummary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, jobSummary + "\n");
    } catch {
      /* ignore */
    }
  }

  retainSessions(cfg);
  return {summary, jsonPath, mdPath, md};
}

function toJUnit(summary) {
  const cases = (summary.results || [])
    .map((r) => {
      const time = ((r.elapsedMs || 0) / 1000).toFixed(3);
      if (r.status === "pass") {
        return `<testcase classname="${summary.suite || "suite"}" name="${escapeXml(r.id)}" time="${time}"/>`;
      }
      if (r.status === "skip" || r.status === "quarantine") {
        return `<testcase classname="${summary.suite || "suite"}" name="${escapeXml(r.id)}" time="${time}"><skipped message="${escapeXml((r.notes || []).join("; "))}"/></testcase>`;
      }
      return `<testcase classname="${summary.suite || "suite"}" name="${escapeXml(r.id)}" time="${time}"><failure message="${escapeXml((r.notes || []).join("; "))}"/></testcase>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="${escapeXml(summary.suite || "arya-qa")}" tests="${summary.total}" failures="${summary.counts.fail + summary.counts.error}" skipped="${summary.counts.skip + summary.counts.quarantine}">\n${cases}\n</testsuite>\n`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function retainSessions(cfg) {
  const sessionsRoot = path.join(cfg.root, "sessions");
  if (!fs.existsSync(sessionsRoot)) return;
  const dirs = fs
    .readdirSync(sessionsRoot, {withFileTypes: true})
    .filter((d) => d.isDirectory() && d.name !== "latest")
    .map((d) => ({
      name: d.name,
      mtime: fs.statSync(path.join(sessionsRoot, d.name)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime);
  for (const d of dirs.slice(cfg.retainSessions)) {
    fs.rmSync(path.join(sessionsRoot, d.name), {recursive: true, force: true});
  }
}

export function exitCodeFor(summary, cfg) {
  const c = summary.counts;
  if (c.error > 0) return 1;
  if (c.fail > 0) return 2;
  if (cfg.strictSoft && c.soft_fail > 0) return 2;
  if (cfg.strict && c.quarantine > 0) return 2;
  return 0;
}
