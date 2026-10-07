import {suite as route} from "./route-gate.mjs";
import {suite as prod} from "./prod.mjs";

/** Lab pack = route gate then production pack. */
export const suite = {
  id: "lab",
  title: "Guard Lab full pack (route-gate + prod)",
  compose: [route, prod]
};
