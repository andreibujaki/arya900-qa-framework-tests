import fs from "node:fs";
import path from "node:path";
import {connectCdp, clickFind, sleep} from "../../driver-cdp/src/index.mjs";
import {rpc, setConfirmTools} from "./rpc.mjs";
import {localePack} from "./locales.mjs";

export async function runFreshTurn({
  port,
  prompt,
  waitMs = 240000,
  captureOut = "",
  relaxConfirm = true,
  locale = "ro",
  chaos = null
}) {
  const labels = localePack(locale);
  const cdp = await connectCdp(port);
  try {
    if (chaos?.cdpDelayMs) await sleep(chaos.cdpDelayMs);
    console.error("newChat rpc…");
    await rpc(cdp, "newChat");
    await sleep(800);

    if (relaxConfirm) await setConfirmTools(cdp, false);

    for (let i = 0; i < 60; i++) {
      const ready = await cdp.evaluate(`(() => {
        const ta = document.querySelector("textarea.input");
        return { hasTa: !!ta, disabled: ta?.disabled ?? true };
      })()`);
      if (ready?.hasTa && ready.disabled === false) break;
      await sleep(1000);
    }

    await clickFind(
      cdp,
      `() => {
        const ta = document.querySelector("textarea.input");
        if (!ta) return null;
        const r = ta.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }`
    );
    await sleep(150);
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      modifiers: 2,
      key: "a",
      code: "KeyA",
      windowsVirtualKeyCode: 65
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      modifiers: 2,
      key: "a",
      code: "KeyA",
      windowsVirtualKeyCode: 65
    });
    await cdp.send("Input.insertText", {text: prompt});
    await sleep(200);
    await clickFind(
      cdp,
      `() => {
        const b = document.querySelector("button.sendButton");
        if (!b || b.disabled) return null;
        const r = b.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }`
    );

    const allowRe = labels.allow.toString();
    const started = Date.now();
    let sawGenerating = false;
    let lastModelLen = 0;
    let stablePolls = 0;
    while (Date.now() - started < waitMs) {
      try {
        await clickFind(
          cdp,
          `() => {
            const re = ${allowRe};
            const b = [...document.querySelectorAll("button")].find((el) =>
              re.test((el.innerText || "").trim())
            );
            if (!b || b.disabled) return null;
            const r = b.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          }`
        );
      } catch {
        /* busy */
      }
      await sleep(1500);
      let st = null;
      try {
        st = await cdp.evaluate(`(() => {
          const stop = document.querySelector("button.stopGenerationButton");
          const ta = document.querySelector("textarea.input");
          const msgs = [...document.querySelectorAll(".message")];
          const lastModel = [...msgs].reverse().find((el) => el.classList.contains("model"));
          return {
            stopDisabled: stop ? stop.disabled : true,
            taDisabled: ta ? ta.disabled : true,
            msgCount: msgs.length,
            modelLen: ((lastModel?.innerText || "").trim()).length
          };
        })()`);
      } catch {
        continue;
      }
      if (st && (st.stopDisabled === false || st.taDisabled === true)) sawGenerating = true;
      if (st?.msgCount >= 2 && st?.modelLen > 40 && st?.taDisabled === false) {
        if (st.modelLen === lastModelLen) stablePolls += 1;
        else stablePolls = 0;
        lastModelLen = st.modelLen;
        if (stablePolls >= 2) break;
      } else {
        stablePolls = 0;
        lastModelLen = st?.modelLen || 0;
      }
      if (sawGenerating && st?.stopDisabled !== false && st?.taDisabled === false) break;
    }

    await cdp.evaluate(`(() => {
      for (const b of document.querySelectorAll("button.activityToggle")) {
        if (b.getAttribute("aria-expanded") === "false") b.click();
      }
      return true;
    })()`);

    const snap = await cdp.evaluate(`(() => {
      const msgs = [...document.querySelectorAll(".message")];
      const lastModel = [...msgs].reverse().find((el) => el.classList.contains("model"));
      const lastUser = [...msgs].reverse().find((el) => el.classList.contains("user"));
      const items = [...document.querySelectorAll(".activityItem")].map((el) =>
        (el.innerText || "").trim().replace(/\\s+/g, " ")
      );
      const route = items.find((t) => /route\\s+(low|mid|high)/i.test(t));
      const rm = route && /route\\s+(low|mid|high)/i.exec(route);
      return {
        msgCount: msgs.length,
        lastUser: (lastUser?.innerText || "").trim(),
        lastModel: (lastModel?.innerText || "").trim(),
        lastModelLen: ((lastModel?.innerText || "").trim()).length,
        activityItems: items,
        routeBand: rm?.[1] || ""
      };
    })()`);

    if (captureOut) {
      try {
        const shot = await cdp.send("Page.captureScreenshot", {format: "png"});
        const png = captureOut.replace(/\.json$/i, ".png");
        fs.mkdirSync(path.dirname(png), {recursive: true});
        fs.writeFileSync(png, Buffer.from(shot.data, "base64"));
      } catch {
        /* optional */
      }
    }

    return {
      at: new Date().toISOString(),
      prompt,
      method: "rpc-newChat+mouse",
      elapsedMs: Date.now() - started,
      ...snap
    };
  } finally {
    cdp.close();
  }
}
