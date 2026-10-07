export function rpcExpr(method, args = [], timeoutMs = 60000) {
  return `(() => new Promise((resolve, reject) => {
    const callId = "arya-" + Math.random().toString(36).slice(2);
    const timer = setTimeout(() => reject(new Error("timeout")), ${timeoutMs});
    const onMsg = (_event, data) => {
      try {
        const msg = typeof data === "string" ? JSON.parse(data) : data;
        if (msg == null || msg.i !== callId) return;
        window.ipcRenderer.off("llmRpc", onMsg);
        clearTimeout(timer);
        if (msg.e != null) reject(new Error(JSON.stringify(msg.e)));
        else resolve(msg.r);
      } catch (err) { reject(err); }
    };
    window.ipcRenderer.on("llmRpc", onMsg);
    window.ipcRenderer.send("llmRpc", JSON.stringify({
      t: "q", i: callId, m: ${JSON.stringify(method)}, a: ${JSON.stringify(args)}
    }));
  }))()`;
}

export async function rpc(cdp, method, args = [], timeoutMs = 60000) {
  return cdp.evaluate(rpcExpr(method, args, timeoutMs));
}

export async function setConfirmTools(cdp, on) {
  return rpc(cdp, "updateAppSettings", [
    {
      confirmBeforeTools: !!on,
      confirmTools: {
        calculate: !!on,
        get_local_datetime: !!on,
        read_text_file: !!on,
        list_folder: !!on,
        search_knowledge_base: !!on,
        knowledge_write: true,
        knowledge_capture: true,
        knowledge_mkdir: true,
        knowledge_rename: true,
        knowledge_delete: true
      }
    }
  ]);
}

export async function setKnowledgeFolder(cdp, folder, contextSize = 4096) {
  return rpc(cdp, "updateAppSettings", [{knowledgeFolderPath: folder, contextSize}]);
}

export async function loadModelByPath(cdp, modelPath) {
  return rpc(cdp, "loadModelByPath", [modelPath], 600000);
}
