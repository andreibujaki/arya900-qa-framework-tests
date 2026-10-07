function act(capture) {
  return (capture?.activityItems || []).join("\n");
}

function hasSearch(capture) {
  return /Caută în conținut|search_knowledge/i.test(act(capture));
}

function routeBand(capture) {
  const m = /route\s+(low|mid|high)/i.exec(act(capture));
  return capture?.routeBand || m?.[1] || "";
}

/** @type {Record<string, (ctx: any) => boolean>} */
export const INVARIANTS = {
  ifRouteLowNoSearch(ctx) {
    if (routeBand(ctx.capture) !== "low") return true;
    return !hasSearch(ctx.capture);
  },
  ifOptOutNoKnowledgeTools(ctx) {
    if (!/opt_out|do not search/i.test(ctx.capture?.prompt || "")) return true;
    return !/search_knowledge|Listează documente|Skill knowledge/i.test(act(ctx.capture));
  },
  ifMidThenClarifyNoTools(ctx) {
    if (routeBand(ctx.capture) !== "mid") return true;
    const clarify = /Project documents|generally|from Project/i.test(
      ctx.capture?.lastModel || ""
    );
    return clarify && !hasSearch(ctx.capture);
  },
  writeDenyImpliesFileAbsent(ctx) {
    if (!ctx.capture?.deniedClick) return true;
    return ctx.capture?.fileExists !== true;
  }
};

export function runInvariants(ctx, names = []) {
  const notes = [];
  let hardFail = false;
  for (const name of names) {
    const fn = INVARIANTS[name];
    if (!fn) {
      notes.push(`NO unknown invariant ${name}`);
      hardFail = true;
      continue;
    }
    const ok = !!fn(ctx);
    notes.push(`${ok ? "OK" : "NO"} invariant:${name}`);
    if (!ok) hardFail = true;
  }
  return {notes, hardFail};
}

export function listInvariants() {
  return Object.keys(INVARIANTS).sort();
}
