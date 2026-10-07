import fs from "node:fs";
import path from "node:path";

export function writeResults(sessionDir, basename, results, extra = {}) {
  fs.mkdirSync(sessionDir, {recursive: true});
  const summary = {
    at: new Date().toISOString(),
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    total: results.length,
    results,
    ...extra
  };

  const jsonPath = path.join(sessionDir, `${basename}.json`);
  const mdPath = path.join(sessionDir, `${basename}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

  const title = extra.title || basename;
  const md = [
    `# ${title}`,
    "",
    `At: ${summary.at}`,
    `Passed **${summary.passed}/${summary.total}**`,
    "",
    "| ID | Result | Notes |",
    "| --- | --- | --- |",
    ...results.map(
      (r) =>
        `| ${r.id} | ${r.pass ? "PASS" : "FAIL"} | ${(r.notes || []).join("; ").replace(/\|/g, "/")} |`
    ),
    ""
  ].join("\n");
  fs.writeFileSync(mdPath, md);

  return {summary, jsonPath, mdPath, md};
}
