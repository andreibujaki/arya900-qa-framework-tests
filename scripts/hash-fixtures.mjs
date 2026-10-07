#!/usr/bin/env node
/** Rebuild fixtures/sample-project/MANIFEST.json from current files. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = path.join(root, "fixtures", "sample-project");
const files = [
  "demo-report.md",
  "demo report .md",
  "skill-tests/copy-alpha.md",
  "skill-tests/copy-beta.md",
  "skill-tests/copy-budget.csv",
  "skill-tests/copy-proforma.txt"
];

const hashes = {};
for (const f of files) {
  const p = path.join(project, f);
  if (!fs.existsSync(p)) {
    console.error("missing", f);
    process.exit(1);
  }
  hashes[f] = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

const out = path.join(project, "MANIFEST.json");
fs.writeFileSync(out, JSON.stringify({files: hashes}, null, 2) + "\n");
console.log("wrote", out);
console.log(hashes);
