import {test} from "node:test";
import assert from "node:assert/strict";
import {runOracles, listOracles} from "./oracles.mjs";
import {runInvariants, listInvariants} from "./invariants.mjs";
import {createRng, resolveChaos, CHAOS_PROFILES} from "./chaos.mjs";
import {fingerprint, normalizeActivity} from "./goldens.mjs";
import {loadConfig} from "./config.mjs";

test("oracle catalog non-empty", () => {
  assert.ok(listOracles().includes("noKnowledgeSearch"));
  assert.ok(listInvariants().includes("ifRouteLowNoSearch"));
});

test("noKnowledgeSearch passes on low route capture", () => {
  const ctx = {
    projectRoot: ".",
    capture: {
      activityItems: ["PROIECT route low 0 · general_chat"],
      lastModel: "hello world this is long enough text for the oracle"
    }
  };
  const r = runOracles(ctx, [
    {oracle: "noKnowledgeSearch"},
    {oracle: "replyMinLength", min: 40}
  ]);
  assert.equal(r.hardFail, false);
});

test("ifRouteLowNoSearch invariant", () => {
  const ctx = {
    capture: {
      activityItems: ["PROIECT route low", "INSTRUMENT Caută în conținutul documentelor gata"],
      routeBand: "low"
    }
  };
  const r = runInvariants(ctx, ["ifRouteLowNoSearch"]);
  assert.equal(r.hardFail, true);
});

test("chaos rng reproducible", () => {
  const a = createRng(42);
  const b = createRng(42);
  assert.equal(a.next(), b.next());
  assert.ok(CHAOS_PROFILES.light);
  const cfg = loadConfig({});
  cfg.chaosEnabled = true;
  const c = resolveChaos({profile: "aggressive"}, cfg);
  assert.equal(c.profile, "aggressive");
});

test("golden normalize strips paths", () => {
  const lines = normalizeActivity(
    ["INSTRUMENT Citește D:\\Users\\Someone\\file.md at 2026-10-07T12:00:00.000Z"],
    "tools-only"
  );
  assert.ok(lines[0].includes("<redacted>"));
  const fp = fingerprint({activityItems: lines}, "tools-only");
  assert.ok(fp.length > 0);
});
