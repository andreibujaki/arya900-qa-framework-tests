import {probeCdp, connectCdp} from "../../driver-cdp/src/index.mjs";
import {runFreshTurn} from "./fresh-turn.mjs";
import {setKnowledgeFolder, loadModelByPath, rpc} from "./rpc.mjs";
import {
  runWriteAllow,
  runWriteDeny,
  runAbort,
  runHashOriginals
} from "./specials.mjs";

export {setKnowledgeFolder, loadModelByPath, rpc};
export {runFreshTurn} from "./fresh-turn.mjs";

export function createAryaAdapter() {
  return {
    name: "arya",
    version: "2.0.0",
    async probeCapabilities(cfg) {
      const caps = {
        cdp: false,
        modelLoaded: false,
        knowledgeFolder: false,
        confirmUi: true,
        routeDebug: true
      };
      try {
        await probeCdp(cfg.cdpPort);
        caps.cdp = true;
        const cdp = await connectCdp(cfg.cdpPort);
        try {
          const st = await rpc(cdp, "getAppState", []).catch(() => null);
          // best-effort; some builds use different RPC
          caps.modelLoaded = !!(st?.model?.loaded || st?.chatSession?.loaded);
          caps.knowledgeFolder = !!(
            st?.settings?.knowledgeFolderPath || cfg.projectRoot
          );
        } catch {
          caps.knowledgeFolder = !!cfg.projectRoot;
          caps.modelLoaded = true; // assume operator loaded if CDP up
        } finally {
          cdp.close();
        }
      } catch {
        /* down */
      }
      if (cfg.projectRoot) caps.knowledgeFolder = true;
      return caps;
    },
    async runCase(ctx, c) {
      if (c.kind === "write-allow") return runWriteAllow(ctx, c);
      if (c.kind === "write-deny") return runWriteDeny(ctx, c);
      if (c.kind === "abort") return runAbort(ctx, c);
      if (c.kind === "hash-originals") return runHashOriginals(ctx);
      return runFreshTurn({
        port: ctx.config.cdpPort,
        prompt: c.prompt,
        waitMs: c.timeoutMs || ctx.config.waitMs,
        locale: c.locale || "ro",
        chaos: ctx.chaos
      });
    }
  };
}
