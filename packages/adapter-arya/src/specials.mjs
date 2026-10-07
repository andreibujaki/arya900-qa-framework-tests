import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {connectCdp} from "../../driver-cdp/src/index.mjs";
import {setConfirmTools} from "./rpc.mjs";
import {runFreshTurn} from "./fresh-turn.mjs";
import {localePack} from "./locales.mjs";

export async function runWriteAllow(ctx, c) {
  const writeName = `skill-tests/prod-write-${Date.now()}.md`;
  const cdp = await connectCdp(ctx.config.cdpPort);
  try {
    await setConfirmTools(cdp, true);
  } finally {
    cdp.close();
  }
  const capture = await runFreshTurn({
    port: ctx.config.cdpPort,
    prompt: `create file ${writeName} with text ProdWriteAllowOK`,
    waitMs: c.timeoutMs || ctx.config.waitMs,
    relaxConfirm: false,
    locale: c.locale || "ro",
    chaos: ctx.chaos
  });
  const exists = fs.existsSync(
    path.join(ctx.projectRoot, writeName.replace(/\//g, path.sep))
  );
  return {...capture, writeName, fileExists: exists, prompt: capture.prompt || c.prompt};
}

export async function runWriteDeny(ctx, c) {
  const writeName = `skill-tests/prod-write-deny-${Date.now()}.md`;
  const labels = localePack(c.locale || "ro");
  const denySrc = labels.deny.toString();
  const cdp = await connectCdp(ctx.config.cdpPort);
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
      const denyRe = ${denySrc};
      let denied = false;
      for (let i = 0; i < 80; i++) {
        await new Promise(r => setTimeout(r, 500));
        const deny = [...document.querySelectorAll("button")].find(b =>
          denyRe.test((b.innerText||"").trim())
        );
        if (deny && !deny.disabled) { deny.click(); denied = true; break; }
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
      return { deniedClick: denied, lastModel: (lastModel?.innerText || "").trim(), activityItems: items };
    })()`);
  } finally {
    cdp.close();
  }
  const exists = fs.existsSync(
    path.join(ctx.projectRoot, writeName.replace(/\//g, path.sep))
  );
  return {
    at: new Date().toISOString(),
    prompt: `create ${writeName} then Deny`,
    writeName,
    fileExists: exists,
    ...denyCapture
  };
}

export async function runAbort(ctx, c) {
  const cdp = await connectCdp(ctx.config.cdpPort);
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
        if (stop && !stop.disabled) { stop.click(); stopped = true; break; }
      }
      await new Promise(r => setTimeout(r, 2000));
      const ta2 = document.querySelector("textarea.input");
      return { stopped, taDisabled: ta2 ? ta2.disabled : true, lastModel: "", activityItems: ["abort"] };
    })()`);
  } finally {
    try {
      await setConfirmTools(cdp, false);
    } catch {
      /* ignore */
    }
    cdp.close();
  }
  return {at: new Date().toISOString(), prompt: "long list then Stop", ...abortCapture};
}

export function runHashOriginals(ctx) {
  const manifestPath = path.join(ctx.projectRoot, "MANIFEST.json");
  if (!fs.existsSync(manifestPath)) {
    return {
      at: new Date().toISOString(),
      prompt: "hash fixtures",
      lastModel: "",
      activityItems: ["NO MANIFEST"],
      extra: {manifestOk: false}
    };
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  let ok = true;
  for (const [rel, expected] of Object.entries(manifest.files || {})) {
    const abs = path.join(ctx.projectRoot, rel);
    if (!fs.existsSync(abs)) {
      ok = false;
      break;
    }
    const actual = crypto
      .createHash("sha256")
      .update(fs.readFileSync(abs))
      .digest("hex")
      .toLowerCase();
    if (actual !== String(expected).toLowerCase()) ok = false;
  }
  return {
    at: new Date().toISOString(),
    prompt: "hash fixtures",
    lastModel: ok ? "manifest intact" : "manifest mismatch",
    activityItems: [ok ? "MANIFEST ok" : "MANIFEST fail"],
    extra: {manifestOk: ok}
  };
}
