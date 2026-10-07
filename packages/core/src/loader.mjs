import fs from "node:fs";
import path from "node:path";
import {repoRoot} from "./config.mjs";
import {loadYaml} from "./mini-yaml.mjs";

export function loadCatalog() {
  const p = path.join(repoRoot, "suites", "catalog.yaml");
  if (!fs.existsSync(p)) return {suites: []};
  return loadYaml(fs.readFileSync(p, "utf8")) || {suites: []};
}

export function listSuiteIds() {
  return (loadCatalog().suites || []).map((s) => s.id);
}

export function loadSuite(suiteId) {
  const catalog = loadCatalog();
  const entry = (catalog.suites || []).find((s) => s.id === suiteId);
  if (!entry) throw new Error(`Unknown suite "${suiteId}". Known: ${listSuiteIds().join(", ")}`);

  if (entry.compose?.length) {
    const cases = [];
    for (const id of entry.compose) {
      const part = loadSuite(id);
      cases.push(...part.cases.map((c) => ({...c, _suiteTitle: part.title})));
    }
    return {id: entry.id, title: entry.title || entry.id, cases, tags: entry.tags || []};
  }

  const cases = [];
  for (const rel of entry.files || []) {
    const abs = path.join(repoRoot, rel);
    if (!fs.existsSync(abs)) throw new Error(`Suite file missing: ${rel}`);
    if (rel.endsWith(".yaml") || rel.endsWith(".yml")) {
      const doc = loadYaml(fs.readFileSync(abs, "utf8")) || {};
      for (const c of doc.cases || []) cases.push(...expandMatrix(c));
    } else if (rel.endsWith(".feature")) {
      cases.push(...loadGherkinRough(abs));
    } else if (rel.endsWith(".json")) {
      const doc = JSON.parse(fs.readFileSync(abs, "utf8"));
      for (const c of doc.cases || []) cases.push(...expandMatrix(c));
    }
  }
  return {
    id: entry.id,
    title: entry.title || entry.id,
    cases: cases.flat ? cases.flat() : cases,
    tags: entry.tags || []
  };
}

function expandMatrix(c) {
  if (!c.matrix?.length) return [c];
  return c.matrix.map((row, i) => ({
    ...c,
    id: `${c.id}[${i}]`,
    prompt: interpolate(c.prompt || "", row),
    ...row,
    matrix: undefined
  }));
}

function interpolate(s, row) {
  return String(s).replace(/\{\{(\w+)\}\}/g, (_, k) => (row[k] != null ? String(row[k]) : ""));
}

function loadGherkinRough(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const cases = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^Scenario:/i.test(line)) {
      if (current) cases.push(current);
      const title = line.replace(/^Scenario:\s*/i, "").trim();
      current = {
        id: title.replace(/\s+/g, "-").toLowerCase().slice(0, 64),
        title,
        expect: [],
        invariants: [],
        tags: ["gherkin"]
      };
    } else if (current && /^When (?:user asks|the user asks)\s+/i.test(line)) {
      const m = line.match(/When (?:user asks|the user asks)\s+"([^"]+)"/i);
      if (m) current.prompt = m[1];
    } else if (current && /^Then oracle\s+/i.test(line)) {
      const m = line.match(/^Then oracle\s+(\w+)(?:\s+(.+))?$/i);
      if (m) {
        const spec = {oracle: m[1]};
        if (m[2]) {
          const args = m[2].trim();
          if (args.startsWith("/")) spec.pattern = args.slice(1).replace(/\/$/, "");
          else if (args.includes("=")) {
            for (const part of args.split(/\s+/)) {
              const [k, v] = part.split("=");
              if (k === "min") spec.min = Number(v);
              else if (k === "band") spec.band = v;
              else if (k === "tool") spec.tool = v;
              else if (k === "path") spec.path = v;
            }
          } else spec.pattern = args;
        }
        current.expect.push(spec);
      }
    } else if (current && /^Then invariant\s+/i.test(line)) {
      const m = line.match(/^Then invariant\s+(\w+)/i);
      if (m) current.invariants.push(m[1]);
    } else if (current && /^And tags\s+/i.test(line)) {
      current.tags = line
        .replace(/^And tags\s+/i, "")
        .split(/[,\s]+/)
        .filter(Boolean);
    }
  }
  if (current) cases.push(current);
  return cases;
}
