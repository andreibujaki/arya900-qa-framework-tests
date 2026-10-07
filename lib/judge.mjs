/**
 * Rule-based pass/fail on a turn capture.
 * Each rule: { name, required?: boolean, check({ model, act, capture }) => boolean }
 */
export function judge(id, prompt, capture, rules) {
  const model = capture?.lastModel || "";
  const act = (capture?.activityItems || []).join("\n");
  const result = {id, prompt, pass: false, notes: []};
  for (const rule of rules) {
    let ok = false;
    try {
      ok = !!rule.check({model, act, capture});
    } catch {
      ok = false;
    }
    result.notes.push(`${ok ? "OK" : "NO"} ${rule.name}`);
    if (!ok && rule.required !== false) {
      result.pass = false;
      return result;
    }
  }
  result.pass = !result.notes.some((n) => n.startsWith("NO") && !n.includes("(soft)"));
  return result;
}

export function actText(capture) {
  return (capture?.activityItems || []).join("\n");
}
