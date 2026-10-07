import fs from "node:fs";
import path from "node:path";

const VOLATILE = [
  /\b\d{4}-\d{2}-\d{2}T[\d:.Z+-]+/g,
  /[A-Za-z]:\\[^\s"']+/g,
  /\/(?:Users|home)\/[^\s"']+/g,
  /\b[a-f0-9]{32,64}\b/gi,
  /prod-write-\d+/g
];

export function normalizeActivity(items = [], scope = "tools+route") {
  let lines = (items || []).map((t) => String(t).trim());
  if (scope === "tools-only") {
    lines = lines.filter((l) => /INSTRUMENT|tool|Citește|Caută|Listează|Scrie/i.test(l));
  } else if (scope === "tools+route") {
    lines = lines.filter((l) =>
      /INSTRUMENT|tool|Citește|Caută|Listează|Scrie|route\s|Skill/i.test(l)
    );
  }
  // tools+route+skill keeps Skill lines already
  return lines
    .map((l) => {
      let s = l;
      for (const re of VOLATILE) s = s.replace(re, "<redacted>");
      return s.replace(/\s+/g, " ").trim();
    })
    .filter(Boolean);
}

export function fingerprint(capture, scope = "tools+route") {
  return normalizeActivity(capture?.activityItems || [], scope).join("\n");
}

export function compareGolden(capture, goldenPath, scope, update) {
  const fp = fingerprint(capture, scope);
  fs.mkdirSync(path.dirname(goldenPath), {recursive: true});
  if (update || !fs.existsSync(goldenPath)) {
    fs.writeFileSync(goldenPath, fp + "\n", "utf8");
    return {ok: true, updated: true, notes: ["OK golden updated"]};
  }
  const expected = fs.readFileSync(goldenPath, "utf8").trim();
  const ok = expected === fp.trim();
  return {
    ok,
    updated: false,
    notes: [`${ok ? "OK" : "NO"} golden ${path.basename(goldenPath)}`]
  };
}

export function diffFingerprints(a, b) {
  const la = a.split("\n");
  const lb = b.split("\n");
  const max = Math.max(la.length, lb.length);
  const diffs = [];
  for (let i = 0; i < max; i++) {
    if (la[i] !== lb[i]) diffs.push({line: i + 1, a: la[i] || "", b: lb[i] || ""});
  }
  return diffs;
}
