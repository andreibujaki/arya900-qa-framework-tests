/** Seeded RNG + chaos profiles / budgets. */

export const CHAOS_PROFILES = {
  light: {denyRandom: 0.1, abortAfterMs: 0, cdpDelayMs: 50},
  aggressive: {denyRandom: 0.4, abortAfterMs: 1500, cdpDelayMs: 200}
};

export function createRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return {
    seed: s,
    next() {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 0x100000000;
    },
    bool(p = 0.5) {
      return this.next() < p;
    }
  };
}

export function resolveChaos(caseChaos, cfg) {
  if (!cfg.chaosEnabled && !caseChaos?.force) return null;
  const profileName = caseChaos?.profile || cfg.chaosProfile || "light";
  const base = {...(CHAOS_PROFILES[profileName] || CHAOS_PROFILES.light)};
  return {
    profile: profileName,
    seed: caseChaos?.seed ?? 42,
    denyRandom: caseChaos?.denyRandom ?? base.denyRandom,
    abortAfterMs: caseChaos?.abortAfterMs ?? base.abortAfterMs,
    cdpDelayMs: caseChaos?.cdpDelayMs ?? base.cdpDelayMs
  };
}

export function createBudget(cfg) {
  return {
    chaosActions: 0,
    aborts: 0,
    maxChaos: cfg.chaosBudget,
    maxAborts: cfg.abortBudget,
    takeChaos() {
      this.chaosActions += 1;
      return this.chaosActions <= this.maxChaos;
    },
    takeAbort() {
      this.aborts += 1;
      return this.aborts <= this.maxAborts;
    }
  };
}
