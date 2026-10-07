import fs from "node:fs";
import path from "node:path";
import {connectCdp} from "./cdp.mjs";
import {rpc, setConfirmTools} from "./rpc.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickFind(cdp, finder) {
  const box = await cdp.evaluate(`(${finder})()`);
  if (!box) return {ok: false};
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: box.x,
    y: box.y
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: box.x,
    y: box.y,
    button: "left",
    clickCount: 1
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: box.x,
    y: box.y,
    button: "left",
    clickCount: 1
  });
  return {ok: true, ...box};
}

/**
 * Fresh chat + mouse-type prompt + wait for reply + Activity snapshot.
 */
export async function runFreshTurn({
  port,
  prompt,
  waitMs = 240000,
  captureOut = "",
  relaxConfirm = true
}) {
  const cdp = await connectCdp(port);
  try {
    console.error("newChat rpc…");
    await rpc(cdp, "newChat");
    await sleep(800);

    if (relaxConfirm) {
      await setConfirmTools(cdp, false);
      console.error("confirm relaxed for read tools");
    }

    for (let i = 0; i < 60; i++) {
      const ready = await cdp.evaluate(`(() => {
        const ta = document.querySelector("textarea.input");
        return {
          hasTa: !!ta,
          disabled: ta?.disabled ?? true,
          msgCount: document.querySelectorAll(".message").length
        };
      })()`);
      if (ready?.hasTa && ready.disabled === false) {
        console.error("ready", ready);
        break;
      }
      await sleep(1000);
    }

    const focus = await clickFind(
      cdp,
      `() => {
        const ta = document.querySelector("textarea.input");
        if (!ta) return null;
        const r = ta.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }`
    );
    console.error("focus", focus);
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
    const sendClick = await clickFind(
      cdp,
      `() => {
        const b = document.querySelector("button.sendButton");
        if (!b || b.disabled) return null;
        const r = b.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }`
    );
    console.error("send", sendClick);

    const started = Date.now();
    let sawGenerating = false;
    let lastModelLen = 0;
    let stablePolls = 0;
    while (Date.now() - started < waitMs) {
      try {
        await clickFind(
          cdp,
          `() => {
            const b = [...document.querySelectorAll("button")].find((el) =>
              /^(Permite|Allow|Approve|Aprobă|Da)$/i.test((el.innerText || "").trim())
            );
            if (!b || b.disabled) return null;
            const r = b.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          }`
        );
      } catch {
        /* CDP busy */
      }
      await sleep(1500);
      let st = null;
      try {
        st = await cdp.evaluate(`(() => {
          const stop = document.querySelector("button.stopGenerationButton");
          const ta = document.querySelector("textarea.input");
          const msgs = [...document.querySelectorAll(".message")];
          const lastModel = [...msgs].reverse().find((el) => el.classList.contains("model"));
          const modelLen = ((lastModel?.innerText || "").trim()).length;
          return {
            stopDisabled: stop ? stop.disabled : true,
            taDisabled: ta ? ta.disabled : true,
            msgCount: msgs.length,
            modelLen
          };
        })()`);
      } catch {
        continue;
      }
      if (st && (st.stopDisabled === false || st.taDisabled === true))
        sawGenerating = true;
      if (st?.msgCount >= 2 && st?.modelLen > 40 && st?.taDisabled === false) {
        if (st.modelLen === lastModelLen) stablePolls += 1;
        else stablePolls = 0;
        lastModelLen = st.modelLen;
        if (stablePolls >= 2) break;
      } else {
        stablePolls = 0;
        lastModelLen = st?.modelLen || 0;
      }
      if (sawGenerating && st?.stopDisabled !== false && st?.taDisabled === false)
        break;
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
      return {
        msgCount: msgs.length,
        lastUser: (lastUser?.innerText || "").trim(),
        lastModel: (lastModel?.innerText || "").trim(),
        lastModelLen: ((lastModel?.innerText || "").trim()).length,
        activityItems: items,
        hasListFolder: items.some((t) => /list_folder/i.test(t)),
        hasReadTool: items.some((t) => /read_text_file/i.test(t)),
        skillLine: items.find((t) => /Skill|knowledge-|office-/i.test(t)) || "",
        agentLine: items.find((t) => /\\d+\\/\\d+|Agent/i.test(t)) || ""
      };
    })()`);

    if (captureOut) {
      const png = captureOut.replace(/\.json$/i, ".png");
      try {
        const shot = await cdp.send("Page.captureScreenshot", {format: "png"});
        fs.mkdirSync(path.dirname(png), {recursive: true});
        fs.writeFileSync(png, Buffer.from(shot.data, "base64"));
        console.error("shot", png);
      } catch {
        /* optional */
      }
    }

    const capture = {
      at: new Date().toISOString(),
      prompt,
      method: "rpc-newChat+mouse",
      elapsedMs: Date.now() - started,
      ...snap
    };

    if (captureOut) {
      fs.mkdirSync(path.dirname(captureOut), {recursive: true});
      fs.writeFileSync(captureOut, JSON.stringify(capture, null, 2));
      console.error("wrote", captureOut);
    }

    return capture;
  } finally {
    cdp.close();
  }
}
