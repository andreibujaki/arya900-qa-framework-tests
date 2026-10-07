import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {connectCdp} from "./cdp.mjs";
import {setConfirmTools} from "./rpc.mjs";
import {runFreshTurn} from "./fresh-turn.mjs";

/**
 * T6: write with confirm ON (Allow auto-clicked during wait loop).
 */
export async function runWriteAllow(cfg) {
  const writeName = `skill-tests/prod-write-${Date.now()}.md`;
  const cdp = await connectCdp(cfg.cdpPort);
  try {
    await setConfirmTools(cdp, true);
  } finally {
    cdp.close();
  }
  const out = path.join(cfg.captureDir, "t6_write_allow.json");
  const capture = await runFreshTurn({
    port: cfg.cdpPort,
    prompt: `create file ${writeName} with text ProdWriteAllowOK`,
    waitMs: cfg.waitMs,
    captureOut: out,
    relaxConfirm: false
  });
  const exists = fs.existsSync(
    path.join(cfg.projectRoot, writeName.replace(/\//g, path.sep))
  );
  const blob =
    (capture?.activityItems || []).join("\n") + (capture?.lastModel || "");
  const toolOk =
    /knowledge_write|Scrie|creat|wrote|Permite|Allow|approved|OK|ProdWrite/i.test(
      blob
    ) || exists;
  return {
    id: "T6-write-allow",
    prompt: `create ${writeName}`,
    pass: toolOk && exists,
    notes: [
      `${toolOk ? "OK" : "NO"} write tool or short-circuit`,
      `${exists ? "OK" : "NO"} file exists on disk`
    ],
    fileExists: exists,
    writeName
  };
}

/**
 * T7: write then click Deny / Refuză.
 */
export async function runWriteDeny(cfg) {
  const writeName = `skill-tests/prod-write-deny-${Date.now()}.md`;
  const cdp = await connectCdp(cfg.cdpPort);
  let denyCapture;
  try {
    await setConfirmTools(cdp, true);
    denyCapture = await cdp.evaluate(`(async () => {
      const call = (m, a=[]) => new Promise((resolve, reject) => {
        const callId = "arya-" + Math.random().toString(36).slice(2);
        const timer = setTimeout(() => reject(new Error("timeout "+m)), 120000);
        const onMsg = (_e, data) => {
          const msg = typeof data === "string" ? JSON.parse(data) : data;
          if (msg == null || msg.i !== callId) return;
          window.ipcRenderer.off("llmRpc", onMsg);
          clearTimeout(timer);
          if (msg.e) reject(new Error(JSON.stringify(msg.e)));
          else resolve(msg.r);
        };
        window.ipcRenderer.on("llmRpc", onMsg);
        window.ipcRenderer.send("llmRpc", JSON.stringify({ t:"q", i:callId, m, a }));
      });
      await call("newChat");
      await new Promise(r => setTimeout(r, 500));
      const ta = document.querySelector("textarea.input");
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      const prompt = ${JSON.stringify(`create file ${writeName} with text SHOULD_NOT_EXIST`)};
      setter.call(ta, prompt);
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      document.querySelector("button.sendButton")?.click();
      let denied = false;
      for (let i = 0; i < 80; i++) {
        await new Promise(r => setTimeout(r, 500));
        const deny = [...document.querySelectorAll("button")].find(b =>
          /^(Refuză|Deny|Reject|Nu)$/i.test((b.innerText||"").trim())
        );
        if (deny && !deny.disabled) { deny.click(); denied = true; break; }
        const allow = [...document.querySelectorAll("button")].find(b =>
          /^(Permite|Allow)$/i.test((b.innerText||"").trim())
        );
        if (!allow && document.querySelector("textarea.input") && !document.querySelector("textarea.input").disabled && i > 10)
          break;
      }
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 500));
        const ta2 = document.querySelector("textarea.input");
        if (ta2 && !ta2.disabled) break;
      }
      for (const b of document.querySelectorAll("button.activityToggle")) {
        if (b.getAttribute("aria-expanded") === "false") b.click();
      }
      const msgs = [...document.querySelectorAll(".message")];
      const lastModel = [...msgs].reverse().find(el => el.classList.contains("model"));
      const items = [...document.querySelectorAll(".activityItem")].map(el => (el.innerText||"").trim());
      return {
        deniedClick: denied,
        lastModel: (lastModel?.innerText || "").trim(),
        activityItems: items
      };
    })()`);
  } finally {
    cdp.close();
  }
  fs.writeFileSync(
    path.join(cfg.captureDir, "t7_write_deny.json"),
    JSON.stringify(denyCapture, null, 2)
  );
  const exists = fs.existsSync(
    path.join(cfg.projectRoot, writeName.replace(/\//g, path.sep))
  );
  return {
    id: "T7-write-deny",
    prompt: `create ${writeName} then Deny`,
    pass: !!denyCapture?.deniedClick && !exists,
    notes: [
      `${denyCapture?.deniedClick ? "OK" : "NO"} clicked Deny`,
      `${!exists ? "OK" : "NO"} file absent on disk`
    ],
    fileExists: exists,
    writeName
  };
}

/**
 * T8: start long generation then Stop.
 */
export async function runAbort(cfg) {
  const cdp = await connectCdp(cfg.cdpPort);
  let abortCapture;
  try {
    abortCapture = await cdp.evaluate(`(async () => {
      const call = (m, a=[]) => new Promise((resolve, reject) => {
        const callId = "arya-" + Math.random().toString(36).slice(2);
        const timer = setTimeout(() => reject(new Error("timeout "+m)), 120000);
        const onMsg = (_e, data) => {
          const msg = typeof data === "string" ? JSON.parse(data) : data;
          if (msg == null || msg.i !== callId) return;
          window.ipcRenderer.off("llmRpc", onMsg);
          clearTimeout(timer);
          if (msg.e) reject(new Error(JSON.stringify(msg.e)));
          else resolve(msg.r);
        };
        window.ipcRenderer.on("llmRpc", onMsg);
        window.ipcRenderer.send("llmRpc", JSON.stringify({ t:"q", i:callId, m, a }));
      });
      await call("newChat");
      await new Promise(r => setTimeout(r, 400));
      const ta = document.querySelector("textarea.input");
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      setter.call(ta, "list the documents and briefly explain each file in the Project one by one");
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      document.querySelector("button.sendButton")?.click();
      let stopped = false;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 400));
        const stop = document.querySelector("button.stopGenerationButton");
        if (stop && !stop.disabled) {
          stop.click();
          stopped = true;
          break;
        }
      }
      await new Promise(r => setTimeout(r, 2000));
      const ta2 = document.querySelector("textarea.input");
      return {
        stopped,
        taDisabled: ta2 ? ta2.disabled : true,
        lastModel: ([...document.querySelectorAll(".message.model")].pop()?.innerText || "").trim().slice(0, 400)
      };
    })()`);
  } finally {
    try {
      await setConfirmTools(cdp, false);
    } catch {
      /* ignore */
    }
    cdp.close();
  }
  fs.writeFileSync(
    path.join(cfg.captureDir, "t8_abort.json"),
    JSON.stringify(abortCapture, null, 2)
  );
  return {
    id: "T8-abort",
    prompt: "long list then Stop",
    pass: !!abortCapture?.stopped && abortCapture?.taDisabled === false,
    notes: [
      `${abortCapture?.stopped ? "OK" : "NO"} stop clicked`,
      `${abortCapture?.taDisabled === false ? "OK" : "NO"} input re-enabled`
    ]
  };
}

/**
 * T9: verify shipped sample fixtures match fixtures/sample-project/MANIFEST.json.
 */
export function runHashOriginals(cfg) {
  const manifestPath = path.join(cfg.projectRoot, "MANIFEST.json");
  if (!fs.existsSync(manifestPath)) {
    return {
      id: "T9-fixture-integrity",
      prompt: "hash fixtures",
      pass: false,
      notes: ["NO MANIFEST.json missing in projectRoot"]
    };
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return {
      id: "T9-fixture-integrity",
      prompt: "hash fixtures",
      pass: false,
      notes: ["NO MANIFEST.json invalid JSON"]
    };
  }
  const files = manifest.files || {};
  const hash = (p) =>
    crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").toLowerCase();
  const notes = [];
  let pass = true;
  for (const [rel, expected] of Object.entries(files)) {
    const abs = path.join(cfg.projectRoot, rel);
    if (!fs.existsSync(abs)) {
      notes.push(`NO missing ${rel}`);
      pass = false;
      continue;
    }
    const actual = hash(abs);
    const ok = actual === String(expected).toLowerCase();
    notes.push(`${ok ? "OK" : "NO"} ${rel}`);
    if (!ok) pass = false;
  }
  if (notes.length === 0) {
    notes.push("NO manifest has no files");
    pass = false;
  }
  return {
    id: "T9-fixture-integrity",
    prompt: "hash fixtures",
    pass,
    notes
  };
}
