import {test, expect} from "@playwright/test";
import {spawnSync} from "node:child_process";
import path from "node:path";

const cli = path.resolve("packages/cli/src/cli.mjs");

test("stub smoke suite exits 0", () => {
  const r = spawnSync(process.execPath, [cli, "--project", "stub", "--suite", "smoke"], {
    encoding: "utf8",
    env: {...process.env, ARYA_SESSION: path.resolve("sessions", "pw-stub")}
  });
  if (r.status !== 0) {
    console.log(r.stdout);
    console.error(r.stderr);
  }
  expect(r.status).toBe(0);
});
