import fs from "node:fs";
import path from "node:path";
import {runFreshTurn} from "./fresh-turn.mjs";
import {judge} from "./judge.mjs";
import {writeResults} from "./report.mjs";
import {
  runWriteAllow,
  runWriteDeny,
  runAbort,
  runHashOriginals
} from "./specials.mjs";

function shouldRun(fromId, caseId) {
  if (!fromId) return true;
  const order = [
    "R1",
    "R2",
    "R3",
    "R4",
    "T1",
    "T2",
    "T3",
    "T4",
    "T5",
    "T6",
    "T7",
    "T8",
    "T9"
  ];
  const want = fromId.replace(/-.*$/, "").toUpperCase();
  const cur = caseId.replace(/-.*$/, "").toUpperCase().slice(0, 2);
  const a = order.indexOf(want);
  const b = order.indexOf(cur);
  if (a < 0 || b < 0) return true;
  return b >= a;
}

function expandSuite(suite) {
  if (suite.compose) {
    return suite.compose.flatMap((s) =>
      (s.cases || []).map((c) => ({...c, _suiteTitle: s.title}))
    );
  }
  return (suite.cases || []).map((c) => ({...c, _suiteTitle: suite.title}));
}

async function runCase(cfg, c) {
  if (c.kind === "write-allow") return runWriteAllow(cfg);
  if (c.kind === "write-deny") return runWriteDeny(cfg);
  if (c.kind === "abort") return runAbort(cfg);
  if (c.kind === "hash-originals") return runHashOriginals(cfg);

  const out = path.join(cfg.captureDir, `${c.capture}.json`);
  console.error(`\n=== ${c.id} ===`);
  const capture = await runFreshTurn({
    port: cfg.cdpPort,
    prompt: c.prompt,
    waitMs: cfg.waitMs,
    captureOut: out
  });
  return judge(c.id, c.prompt, capture, c.rules || []);
}

/**
 * Run one named suite against a live Arya Guard/Lab CDP endpoint.
 */
export async function runSuite(suite, cfg) {
  if (!cfg.projectRoot || !fs.existsSync(cfg.projectRoot)) {
    console.error(
      "Warning: projectRoot missing — set ARYA_FOLDER or use fixtures/sample-project"
    );
  }
  fs.mkdirSync(cfg.captureDir, {recursive: true});

  const cases = expandSuite(suite);
  const results = [];
  for (const c of cases) {
    if (!shouldRun(cfg.fromId, c.id)) {
      console.error(`skip ${c.id} (ARYA_FROM=${cfg.fromId})`);
      continue;
    }
    try {
      results.push(await runCase(cfg, c));
    } catch (err) {
      results.push({
        id: c.id,
        prompt: c.prompt || c.kind || "",
        pass: false,
        notes: [`NO exception: ${err?.message || err}`]
      });
    }
  }

  const basename =
    suite.id === "lab"
      ? "LAB-TESTS"
      : suite.id === "route-gate"
        ? "ROUTE-TESTS"
        : "PROD-TESTS";
  const {summary, md, jsonPath, mdPath} = writeResults(
    cfg.sessionDir,
    basename,
    results,
    {title: suite.title, port: cfg.cdpPort, suite: suite.id}
  );
  console.log(JSON.stringify(summary, null, 2));
  console.log(md);
  console.error(`wrote ${jsonPath}`);
  console.error(`wrote ${mdPath}`);
  return summary;
}
