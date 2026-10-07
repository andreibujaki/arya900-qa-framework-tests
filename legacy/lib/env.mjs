import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultProject = path.join(root, "fixtures", "sample-project");

function loadLocalConfig() {
  const p = path.join(root, "config.local.json");
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return {};
  }
}

/**
 * Resolve runtime config from env + optional config.local.json.
 * Defaults to the shipped sample Knowledge folder so a fresh clone works.
 */
export function loadConfig(argv = {}) {
  const file = loadLocalConfig();
  const sessionDir = path.resolve(
    process.env.ARYA_SESSION ||
      argv.session ||
      file.sessionDir ||
      path.join(root, "sessions", "latest")
  );
  const projectRaw =
    process.env.ARYA_FOLDER ||
    process.env.ARYA_PROJECT ||
    argv.project ||
    file.projectRoot ||
    defaultProject;
  return {
    root,
    cdpPort: String(process.env.ARYA_CDP_PORT || argv.port || file.cdpPort || "9222"),
    waitMs: Number(process.env.ARYA_WAIT_MS || argv.waitMs || file.waitMs || 300000),
    sessionDir,
    captureDir: path.join(sessionDir, "cdp-point-captures"),
    projectRoot: path.resolve(root, projectRaw),
    modelPath: process.env.ARYA_MODEL_PATH || argv.model || file.modelPath || "",
    fromId: String(process.env.ARYA_FROM || argv.from || "").trim(),
    contextSize: Number(process.env.ARYA_CTX || file.contextSize || 4096)
  };
}

export {root, defaultProject};
