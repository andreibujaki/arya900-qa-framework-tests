import {test, expect} from "@playwright/test";
import {spawnSync} from "node:child_process";
import path from "node:path";

const cli = path.resolve("packages/cli/src/cli.mjs");

test("example-echo suite", () => {
  const r = spawnSync(process.execPath, [cli, "--project", "example-echo", "--suite", "echo"], {
    encoding: "utf8",
    env: {...process.env, ARYA_SESSION: path.resolve("sessions", "pw-echo")}
  });
  expect(r.status).toBe(0);
});
