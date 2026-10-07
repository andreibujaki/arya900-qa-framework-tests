import fs from "node:fs";
import path from "node:path";
import {runOracles} from "./oracles.mjs";
import {runInvariants} from "./invariants.mjs";
import {resolveChaos, createBudget, createRng} from "./chaos.mjs";
import {compareGolden, fingerprint, diffFingerprints} from "./goldens.mjs";
import {writeReport, exitCodeFor} from "./report.mjs";
import {repoRoot} from "./config.mjs";

function shouldRunFrom(fromId, caseId) {
  if (!fromId) return true;
  const order = ["R1", "R2", "R3", "R4", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9"];
  const want = fromId.replace(/-.*$/, "").toUpperCase();
  const cur = caseId.replace(/-.*$/, "").toUpperCase().slice(0, 2);
  const a = order.indexOf(want);
  const b = order.indexOf(cur);
  if (a < 0 || b < 0) return true;
  return b >= a;
}

function tagMatch(caseTags = [], filter = []) {
  if (!filter.length) return true;
  return filter.every((t) => caseTags.map((x) => x.toLowerCase()).includes(t.toLowerCase()));
}

/**
 * @param {import('./types.mjs').Adapter} adapter
 * @param {{ id: string, title?: string, cases: any[] }} suite
 * @param {import('./config.mjs').RuntimeConfig} cfg
 */
export async function runSuite(adapter, suite, cfg) {
  fs.mkdirSync(cfg.captureDir, {recursive: true});
  const caps = await adapter.probeCapabilities(cfg);
  const budget = createBudget(cfg);
  const results = [];
  const passedIds = new Set();

  const hooks = {
    async beforeSuite() {},
    async beforeCase() {},
    async afterCase() {},
    async afterSuite() {}
  };

  const onSig = () => {
    try {
      writeReport(cfg, results, {partial: true, adapter: adapter.name});
    } catch {
      /* ignore */
    }
    process.exit(1);
  };
  process.once("SIGINT", onSig);
  process.once("SIGTERM", onSig);

  await hooks.beforeSuite();

  try {
    for (const c of suite.cases) {
      if (!shouldRunFrom(cfg.fromId, c.id)) {
        console.error(`skip ${c.id} (from=${cfg.fromId})`);
        continue;
      }
      if (!tagMatch(c.tags || suite.tags || [], cfg.tags)) {
        results.push({
          id: c.id,
          prompt: c.prompt || "",
          status: "skip",
          notes: ["SKIP tags filter"]
        });
        continue;
      }

      const missing = (c.requires || []).filter((r) => !caps[r]);
      if (missing.length) {
        results.push({
          id: c.id,
          prompt: c.prompt || "",
          status: "skip",
          notes: [`SKIP missing caps: ${missing.join(",")}`],
          requirementId: c.requirementId,
          risk: c.risk
        });
        continue;
      }

      if (c.dependsOn?.length) {
        const depFail = c.dependsOn.filter((d) => !passedIds.has(d));
        if (depFail.length) {
          results.push({
            id: c.id,
            prompt: c.prompt || "",
            status: "skip",
            notes: [`SKIP dependsOn failed: ${depFail.join(",")}`],
            requirementId: c.requirementId
          });
          continue;
        }
      }

      console.error(`\n=== ${c.id} ===`);
      await hooks.beforeCase(c);
      const started = Date.now();
      /** @type {import('./types.mjs').CaseResult} */
      let result;
      try {
        const chaos = resolveChaos(c.chaos, cfg);
        if (chaos && !budget.takeChaos()) {
          result = {
            id: c.id,
            prompt: c.prompt || "",
            status: "error",
            notes: ["ERROR chaos budget exceeded"],
            elapsedMs: 0
          };
        } else {
          const ctx = {
            config: {...cfg, waitMs: c.timeoutMs || cfg.waitMs},
            caps,
            projectRoot: cfg.projectRoot,
            chaos,
            rng: chaos ? createRng(chaos.seed) : null,
            budget
          };
          let capture = await adapter.runCase(ctx, c);

          if ((cfg.differential || c.differential) && chaos) {
            const stableCfg = {...cfg, chaosEnabled: false};
            const stableCtx = {
              config: stableCfg,
              caps,
              projectRoot: cfg.projectRoot,
              chaos: null,
              rng: null,
              budget
            };
            const stable = await adapter.runCase(stableCtx, {...c, chaos: undefined});
            const diffs = diffFingerprints(
              fingerprint(stable, cfg.goldenScope),
              fingerprint(capture, cfg.goldenScope)
            );
            capture.extra = {
              ...(capture.extra || {}),
              differentialDiffs: diffs.length,
              differential: diffs.slice(0, 20)
            };
          }

          const outPath = path.join(
            cfg.captureDir,
            `${c.capture || c.id.replace(/[^\w.-]+/g, "_")}.json`
          );
          fs.writeFileSync(outPath, JSON.stringify(capture, null, 2));

          const octx = {config: cfg, caps, projectRoot: cfg.projectRoot, capture};
          const o = runOracles(octx, c.expect || [], c.expectGroups || {});
          const inv = runInvariants(octx, c.invariants || []);
          const notes = [...o.notes, ...inv.notes];

          if (c.golden?.path || c.golden) {
            const gPath = path.join(
              repoRoot,
              "goldens",
              c.golden?.path || `${c.id}.txt`
            );
            const g = compareGolden(
              capture,
              gPath,
              c.golden?.scope || cfg.goldenScope,
              cfg.updateGoldens
            );
            notes.push(...g.notes);
            if (!g.ok) o.hardFail = true;
          }

          let status = "pass";
          if (o.hardFail || inv.hardFail) status = "fail";
          else if (o.softFail) status = "soft_fail";

          if ((status === "fail" || status === "soft_fail") && (c.knownFlaky || chaos)) {
            if (!cfg.strict) {
              status = "quarantine";
              notes.push("quarantine (knownFlaky/chaos; use --strict to fail)");
            }
          }

          result = {
            id: c.id,
            prompt: c.prompt || c.kind || "",
            status,
            notes,
            elapsedMs: Date.now() - started,
            requirementId: c.requirementId,
            risk: c.risk,
            quarantine: status === "quarantine",
            capture
          };

          if (c.cleanup === "deleteCreatedFiles" && capture.writeName) {
            const p = path.join(cfg.projectRoot, capture.writeName.replace(/\//g, path.sep));
            try {
              fs.unlinkSync(p);
            } catch {
              /* ignore */
            }
          }
        }
      } catch (err) {
        result = {
          id: c.id,
          prompt: c.prompt || c.kind || "",
          status: "error",
          notes: [`ERROR ${err?.message || err}`],
          elapsedMs: Date.now() - started,
          requirementId: c.requirementId
        };
      }

      results.push(result);
      if (result.status === "pass") passedIds.add(c.id);
      await hooks.afterCase(c, result);

      if (
        cfg.strict &&
        (result.status === "fail" || result.status === "error") &&
        (c.severity || "blocker") === "blocker"
      ) {
        // fail-fast for blocker when strict
        break;
      }
    }
  } finally {
    process.off("SIGINT", onSig);
    process.off("SIGTERM", onSig);
    await hooks.afterSuite();
  }

  const {summary, md} = writeReport(cfg, results, {
    title: suite.title,
    adapter: adapter.name,
    adapterVersion: adapter.version,
    caps
  });
  console.log(JSON.stringify(summary, null, 2));
  console.log(md);
  return {summary, exitCode: exitCodeFor(summary, cfg)};
}
