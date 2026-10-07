import {test} from "node:test";
import assert from "node:assert/strict";
import {loadYaml} from "./mini-yaml.mjs";

test("mini-yaml parses suite shape", () => {
  const doc = loadYaml(`
cases:
  - id: A1
    prompt: "hello"
    tags: [smoke, route]
    expect:
      - oracle: replyMinLength
        min: 40
`);
  assert.equal(doc.cases[0].id, "A1");
  assert.equal(doc.cases[0].prompt, "hello");
  assert.deepEqual(doc.cases[0].tags, ["smoke", "route"]);
  assert.equal(doc.cases[0].expect[0].oracle, "replyMinLength");
  assert.equal(doc.cases[0].expect[0].min, 40);
});
