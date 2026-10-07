import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function act(capture) {
  return (capture?.activityItems || []).join("\n");
}

function model(capture) {
  return capture?.lastModel || "";
}

/** @type {Record<string, (ctx: any, spec: any) => boolean>} */
export const ORACLES = {
  noKnowledgeSearch(ctx) {
    return !/Caută în conținut|search_knowledge/i.test(act(ctx.capture));
  },
  noKnowledgeTools(ctx) {
    return !/search_knowledge|Listează documente|Citește document|Skill knowledge/i.test(
      act(ctx.capture)
    );
  },
  toolCalled(ctx, spec) {
    const tool = spec.tool || "INSTRUMENT";
    return new RegExp(tool, "i").test(act(ctx.capture));
  },
  activityMatches(ctx, spec) {
    return new RegExp(spec.pattern || ".", "i").test(act(ctx.capture) + model(ctx.capture));
  },
  replyMatches(ctx, spec) {
    return new RegExp(spec.pattern || ".", "i").test(model(ctx.capture));
  },
  replyMinLength(ctx, spec) {
    return model(ctx.capture).length > (spec.min ?? 40);
  },
  routeBand(ctx, spec) {
    const band = ctx.capture?.routeBand || "";
    const fromAct = /route\s+(low|mid|high)/i.exec(act(ctx.capture));
    const got = band || fromAct?.[1] || "";
    return new RegExp(`^${spec.band || ".*"}$`, "i").test(got);
  },
  fileExists(ctx, spec) {
    const rel = spec.path || ctx.capture?.writeName;
    if (!rel) return false;
    return fs.existsSync(path.join(ctx.projectRoot, rel.replace(/\//g, path.sep)));
  },
  fileAbsent(ctx, spec) {
    const rel = spec.path || ctx.capture?.writeName;
    if (!rel) return true;
    return !fs.existsSync(path.join(ctx.projectRoot, rel.replace(/\//g, path.sep)));
  },
  denyClicked(ctx) {
    return !!ctx.capture?.deniedClick;
  },
  stopClicked(ctx) {
    return !!ctx.capture?.stopped && ctx.capture?.taDisabled === false;
  },
  manifestIntact(ctx) {
    const manifestPath = path.join(ctx.projectRoot, "MANIFEST.json");
    if (!fs.existsSync(manifestPath)) return false;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    for (const [rel, expected] of Object.entries(manifest.files || {})) {
      const abs = path.join(ctx.projectRoot, rel);
      if (!fs.existsSync(abs)) return false;
      const actual = crypto
        .createHash("sha256")
        .update(fs.readFileSync(abs))
        .digest("hex")
        .toLowerCase();
      if (actual !== String(expected).toLowerCase()) return false;
    }
    return true;
  },
  stubEchoOk(ctx) {
    return /ECHO_OK|stub/i.test(model(ctx.capture) + act(ctx.capture));
  }
};

export function runOracles(ctx, specs = [], groups = {}) {
  const notes = [];
  let hardFail = false;
  let softFail = false;

  const runOne = (spec) => {
    const fn = ORACLES[spec.oracle];
    if (!fn) {
      notes.push(`NO unknown oracle ${spec.oracle}`);
      hardFail = true;
      return;
    }
    let ok = false;
    try {
      ok = !!fn(ctx, spec);
    } catch (e) {
      notes.push(`NO ${spec.oracle} threw ${e?.message || e}`);
      hardFail = true;
      return;
    }
    notes.push(`${ok ? "OK" : "NO"} ${spec.oracle}`);
    if (!ok) {
      if (spec.required === false) softFail = true;
      else hardFail = true;
    }
  };

  for (const s of specs) runOne(s);
  if (groups.allOf) for (const s of groups.allOf) runOne(s);
  if (groups.anyOf?.length) {
    const anyOk = groups.anyOf.some((s) => {
      const fn = ORACLES[s.oracle];
      try {
        return fn && fn(ctx, s);
      } catch {
        return false;
      }
    });
    notes.push(
      `${anyOk ? "OK" : "NO"} anyOf(${groups.anyOf.map((s) => s.oracle).join("|")})`
    );
    if (!anyOk) hardFail = true;
  }

  return {notes, hardFail, softFail};
}

export function listOracles() {
  return Object.keys(ORACLES).sort();
}
