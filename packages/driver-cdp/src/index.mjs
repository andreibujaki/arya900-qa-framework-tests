/** Generic Electron CDP driver (no Arya knowledge). */

export async function connectCdp(port) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  if (!page) throw new Error(`No page target on CDP :${port}`);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();

  function send(method, params = {}) {
    const msgId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(msgId, {resolve, reject});
      ws.send(JSON.stringify({id: msgId, method, params}));
    });
  }

  ws.addEventListener("message", (ev) => {
    const data = JSON.parse(ev.data);
    if (data.id != null && pending.has(data.id)) {
      const {resolve, reject} = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(new Error(JSON.stringify(data.error)));
      else resolve(data.result);
    }
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });

  await send("Runtime.enable");
  await send("Page.enable").catch(() => undefined);
  await send("Input.enable").catch(() => undefined);

  async function evaluate(expression) {
    const r = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return r?.result?.value;
  }

  function close() {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  }

  return {ws, send, evaluate, close, port};
}

export async function probeCdp(port) {
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  return {
    version,
    pages: list.filter((t) => t.type === "page").map((t) => t.title || t.url)
  };
}

export async function clickFind(cdp, finder) {
  const box = await cdp.evaluate(`(${finder})()`);
  if (!box) return {ok: false};
  await cdp.send("Input.dispatchMouseEvent", {type: "mouseMoved", x: box.x, y: box.y});
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

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
