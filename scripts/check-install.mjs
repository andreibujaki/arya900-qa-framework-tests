#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "packages/core/src/index.mjs",
  "packages/cli/src/cli.mjs",
  "packages/driver-stub/src/index.mjs",
  "packages/adapter-arya/src/index.mjs",
  "suites/catalog.yaml",
  "suites/yaml/smoke.yaml",
  "fixtures/sample-project/MANIFEST.json",
  "fixtures/sample-project/demo-report.md",
  "contracts/CaseDefinition.schema.json",
  "config.example.json"
];

let ok = true;
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error("[check-install] missing:", rel);
    ok = false;
  }
}
const spaced = path.join(root, "fixtures", "sample-project", "demo report .md");
if (!fs.existsSync(spaced)) {
  console.error("[check-install] missing: fixtures/sample-project/demo report .md");
  ok = false;
}
if (!ok) {
  console.error("[check-install] FAILED");
  process.exit(1);
}
console.log("[check-install] OK — framework packages + sample fixtures present");
