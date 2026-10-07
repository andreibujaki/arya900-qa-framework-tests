import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import crypto from "node:crypto";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function loadLocal() {
  const p = path.join(pkgRoot, "config.local.json");
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return {};
  }
}

const FIXTURE_PACKS = {
  sample: path.join(pkgRoot, "fixtures", "sample-project"),
  minimal: path.join(pkgRoot, "fixtures", "minimal")
};

/**
 * @typedef {object} RuntimeConfig
 * @property {string} root
 * @property {string} cdpPort
 * @property {number} waitMs
 * @property {string} sessionDir
 * @property {string} captureDir
 * @property {string} projectRoot
 * @property {string} modelPath
 * @property {string} fromId
 * @property {number} contextSize
 * @property {string} project
 * @property {string} [suite]
 * @property {string[]} tags
 * @property {boolean} chaosEnabled
 * @property {string} chaosProfile
 * @property {boolean} strict
 * @property {boolean} strictSoft
 * @property {boolean} updateGoldens
 * @property {boolean} differential
 * @property {string} goldenScope
 * @property {number} chaosBudget
 * @property {number} abortBudget
 * @property {number} retainSessions
 * @property {string} runId
 * @property {string} configFingerprint
 */

export function loadConfig(argv = {}) {
  const file = loadLocal();
  const packName = argv.fixturePack || file.fixturePack || "sample";
  const packPath = FIXTURE_PACKS[packName] || FIXTURE_PACKS.sample;
  const projectRaw =
    process.env.ARYA_FOLDER ||
    process.env.ARYA_PROJECT ||
    argv.projectRoot ||
    file.projectRoot ||
    packPath;
  const sessionDir = path.resolve(
    process.env.ARYA_SESSION ||
      argv.session ||
      file.sessionDir ||
      path.join(pkgRoot, "sessions", "latest")
  );
  const chaosEnabled =
    argv.chaos === true ||
    process.env.CHAOS === "1" ||
    String(process.env.CHAOS || "").toLowerCase() === "true";
  const cfg = {
    root: pkgRoot,
    cdpPort: String(process.env.ARYA_CDP_PORT || argv.port || file.cdpPort || "9222"),
    waitMs: Number(process.env.ARYA_WAIT_MS || argv.waitMs || file.waitMs || 300000),
    sessionDir,
    captureDir: path.join(sessionDir, "cdp-point-captures"),
    projectRoot: path.resolve(pkgRoot, projectRaw),
    modelPath: process.env.ARYA_MODEL_PATH || argv.model || file.modelPath || "",
    fromId: String(process.env.ARYA_FROM || argv.from || "").trim(),
    contextSize: Number(process.env.ARYA_CTX || file.contextSize || 4096),
    project: argv.project || process.env.ARYA_PROJECT_NAME || "stub",
    suite: argv.suite || undefined,
    tags: String(argv.tags || process.env.ARYA_TAGS || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    chaosEnabled,
    chaosProfile: argv.chaosProfile || file.chaosProfile || "light",
    strict: !!(argv.strict || process.env.ARYA_STRICT === "1"),
    strictSoft: !!(argv.strictSoft || process.env.ARYA_STRICT_SOFT === "1"),
    updateGoldens: !!(argv.updateGoldens || process.env.ARYA_UPDATE_GOLDENS === "1"),
    differential: !!(argv.differential || process.env.ARYA_DIFFERENTIAL === "1"),
    goldenScope: argv.goldenScope || file.goldenScope || "tools+route",
    chaosBudget: Number(file.chaosBudget || 20),
    abortBudget: Number(file.abortBudget || 5),
    retainSessions: Number(file.retainSessions || 10),
    runId: `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    configFingerprint: ""
  };
  cfg.configFingerprint = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        port: cfg.cdpPort,
        project: cfg.project,
        folder: cfg.projectRoot,
        chaos: cfg.chaosEnabled,
        profile: cfg.chaosProfile
      })
    )
    .digest("hex")
    .slice(0, 16);
  return cfg;
}

export function resolveFixturePack(name = "sample") {
  return FIXTURE_PACKS[name] || FIXTURE_PACKS.sample;
}

export {pkgRoot as repoRoot, FIXTURE_PACKS};
