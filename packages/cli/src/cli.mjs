#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {
  loadConfig,
  loadSuite,
  listSuiteIds,
  runSuite,
  listOracles,
  listInvariants
} from "../../core/src/index.mjs";
import {
  createAryaAdapter,
  setKnowledgeFolder,
  loadModelByPath,
  runFreshTurn
} from "../../adapter-arya/src/index.mjs";
import {createEchoAdapter} from "../../adapter-example-echo/src/index.mjs";
import {createStubAdapter} from "../../driver-stub/src/index.mjs";
import {probeCdp, connectCdp} from "../../driver-cdp/src/index.mjs";

function parseArgs(argv) {
  const out = {_: []};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--suite") out.suite = argv[++i];
    else if (a === "--project") out.project = argv[++i];
    else if (a === "--from") out.from = argv[++i];
    else if (a === "--port") out.port = argv[++i];
    else if (a === "--session") out.session = argv[++i];
    else if (a === "--tags") out.tags = argv[++i];
    else if (a === "--model") out.model = argv[++i];
    else if (a === "--setup") out.setup = argv[++i];
    else if (a === "--probe") out.probe = true;
    else if (a === "--preflight") out.preflight = true;
    else if (a === "--list") out.list = true;
    else if (a === "--list-oracles") out.listOracles = true;
    else if (a === "--chaos") out.chaos = true;
    else if (a === "--chaos-profile") out.chaosProfile = argv[++i];
    else if (a === "--strict") out.strict = true;
    else if (a === "--strict-soft") out.strictSoft = true;
    else if (a === "--update-goldens") out.updateGoldens = true;
    else if (a === "--differential") out.differential = true;
    else if (a === "--turn") out.turn = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
    else out._.push(a);
  }
  return out;
}

function help() {
  console.log(`arya-qa / arya-cdp-test — CDP QA framework

  --list                 List suites
  --list-oracles         List named oracles + invariants
  --probe                CDP version check
  --preflight            Capability matrix for selected project
  --setup folder|model   Arya setup helpers
  --project stub|arya|example-echo
  --suite <id>           Run suite from suites/catalog.yaml
  --tags smoke,route     Filter cases
  --chaos [--chaos-profile light|aggressive]
  --strict / --strict-soft / --update-goldens / --differential
  --turn "prompt"        Single Arya fresh turn

Env: ARYA_CDP_PORT ARYA_FOLDER ARYA_MODEL_PATH ARYA_SESSION ARYA_FROM ARYA_WAIT_MS CHAOS
`);
}

function pickAdapter(name) {
  if (name === "arya") return createAryaAdapter();
  if (name === "example-echo") return createEchoAdapter();
  return createStubAdapter("stub");
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  help();
  process.exit(0);
}

const cfg = loadConfig(args);

if (args.list) {
  console.log(listSuiteIds().join("\n"));
  process.exit(0);
}
if (args.listOracles) {
  console.log("oracles:\n" + listOracles().map((o) => "  " + o).join("\n"));
  console.log("invariants:\n" + listInvariants().map((o) => "  " + o).join("\n"));
  process.exit(0);
}

if (args.probe) {
  try {
    console.log(JSON.stringify({port: cfg.cdpPort, ...(await probeCdp(cfg.cdpPort))}, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(`CDP :${cfg.cdpPort} unreachable:`, e.message);
    process.exit(1);
  }
}

if (args.preflight) {
  const adapter = pickAdapter(cfg.project);
  const caps = await adapter.probeCapabilities(cfg);
  console.log(
    JSON.stringify(
      {
        project: cfg.project,
        adapter: adapter.name,
        port: cfg.cdpPort,
        projectRoot: cfg.projectRoot,
        chaosEnabled: cfg.chaosEnabled,
        caps
      },
      null,
      2
    )
  );
  process.exit(caps.cdp || cfg.project !== "arya" ? 0 : 1);
}

if (args.setup === "folder") {
  const cdp = await connectCdp(cfg.cdpPort);
  try {
    console.log(
      JSON.stringify(await setKnowledgeFolder(cdp, cfg.projectRoot, cfg.contextSize), null, 2)
    );
  } finally {
    cdp.close();
  }
  process.exit(0);
}

if (args.setup === "model") {
  if (!cfg.modelPath) {
    console.error("Set ARYA_MODEL_PATH or modelPath in config.local.json");
    process.exit(1);
  }
  const cdp = await connectCdp(cfg.cdpPort);
  try {
    console.error("loading", cfg.modelPath);
    console.log(JSON.stringify(await loadModelByPath(cdp, cfg.modelPath), null, 2));
  } finally {
    cdp.close();
  }
  process.exit(0);
}

if (args.turn || (args._.length && !args.suite)) {
  const prompt = args.turn || args._.join(" ");
  const capture = await runFreshTurn({
    port: cfg.cdpPort,
    prompt,
    waitMs: cfg.waitMs
  });
  const out = path.join(cfg.captureDir, `turn_${Date.now()}.json`);
  fs.mkdirSync(cfg.captureDir, {recursive: true});
  fs.writeFileSync(out, JSON.stringify(capture, null, 2));
  console.log(JSON.stringify(capture, null, 2));
  process.exit(0);
}

if (!args.suite) {
  help();
  process.exit(1);
}

const adapter = pickAdapter(cfg.project);
const suite = loadSuite(args.suite);
cfg.suite = suite.id;
const {exitCode} = await runSuite(adapter, suite, cfg);
process.exit(exitCode);
