import {suite as prod} from "./prod.mjs";
import {suite as routeGate} from "./route-gate.mjs";
import {suite as lab} from "./lab.mjs";

const ALL = {
  prod,
  "route-gate": routeGate,
  lab
};

export function getSuite(name) {
  const s = ALL[name];
  if (!s) {
    throw new Error(
      `Unknown suite "${name}". Available: ${Object.keys(ALL).join(", ")}`
    );
  }
  return s;
}

export function listSuites() {
  return Object.keys(ALL);
}
