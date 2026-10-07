/**
 * Stub adapter-facing driver: synthesizes TurnCapture from case id/prompt.
 * Used for CI and example-echo.
 */

export function createStubCapture(c, overrides = {}) {
  const prompt = c.prompt || c.kind || c.id;
  const base = {
    at: new Date().toISOString(),
    prompt,
    method: "stub",
    elapsedMs: 5,
    lastModel: "ECHO_OK stub reply for " + prompt,
    lastModelLen: 20,
    activityItems: ["STUB ready", "STUB done"],
    ...overrides
  };

  // Scripted behaviors for smoke / route demos
  if (/do not search|opt.?out/i.test(prompt)) {
    base.activityItems = ["PROIECT Intenție other", "PROIECT route low 0 · opt_out", "PROIECT Gata"];
    base.routeBand = "low";
    base.lastModel = "The Hodge Conjecture is an open problem in algebraic geometry. ECHO_OK";
  } else if (/Hodge Conjecture/i.test(prompt) && !/do not search/i.test(prompt)) {
    base.activityItems = ["PROIECT Intenție other", "PROIECT route low 0 · general_chat", "PROIECT Gata"];
    base.routeBand = "low";
    base.lastModel = "General fact answer about Hodge without tools. ECHO_OK";
  } else if (/listeaz|list the documents/i.test(prompt)) {
    base.activityItems = [
      "PROIECT Intenție inventory",
      "PROIECT Skill knowledge-list",
      "INSTRUMENT Listează documente gata"
    ];
    base.routeBand = "high";
    base.lastModel = "Documents: demo-report.md, copy-alpha.md. ECHO_OK";
  } else if (/analyze and summarize this situation/i.test(prompt)) {
    base.activityItems = ["PROIECT Intenție analyze", "PROIECT route mid 45 · analyze_weak", "PROIECT Gata"];
    base.routeBand = "mid";
    base.lastModel =
      "Should I answer from your Project documents (tools), or generally without searching files?";
  } else if (/demo report/i.test(prompt)) {
    base.activityItems = [
      "PROIECT Skill knowledge-read",
      "INSTRUMENT Citește document gata demo-report.md",
      "PROIECT Agent step 1/8"
    ];
    base.lastModel = "demo report contains DEMO-TOKEN-ALPHA sample office workflow. ECHO_OK";
  } else if (/compare|copy-alpha|copy-beta/i.test(prompt)) {
    base.activityItems = [
      "PROIECT Skill knowledge-compare",
      "INSTRUMENT Citește document gata copy-alpha.md",
      "INSTRUMENT Citește document gata copy-beta.md"
    ];
    base.lastModel =
      "Comparison of copy-alpha.md vs copy-beta.md: Line B differs (200 vs 250). ECHO_OK";
  } else if (/DEMO-TOKEN|search/i.test(prompt)) {
    base.activityItems = ["INSTRUMENT Caută în conținutul documentelor gata", "Skill knowledge-search"];
    base.lastModel = "Found DEMO-TOKEN-ALPHA in demo-report.md. ECHO_OK";
  } else if (c.kind === "write-allow") {
    base.activityItems = ["INSTRUMENT Scrie fișier wrote ProdWriteAllowOK"];
    base.lastModel = "Created file. ECHO_OK";
    base.fileExists = true;
  } else if (c.kind === "write-deny") {
    base.deniedClick = true;
    base.fileExists = false;
    base.activityItems = ["INSTRUMENT Scrie denied"];
    base.lastModel = "Write denied. ECHO_OK";
  } else if (c.kind === "abort") {
    base.stopped = true;
    base.taDisabled = false;
    base.activityItems = ["PROIECT Stop"];
    base.lastModel = "Stopped. ECHO_OK";
  } else if (c.kind === "hash-originals") {
    base.activityItems = ["STUB manifest check"];
    base.lastModel = "manifest. ECHO_OK";
  }

  return base;
}

export function createStubAdapter(name = "stub") {
  return {
    name,
    version: "2.0.0",
    async probeCapabilities() {
      return {
        cdp: true,
        modelLoaded: true,
        knowledgeFolder: true,
        confirmUi: true,
        routeDebug: true,
        stub: true
      };
    },
    async runCase(_ctx, c) {
      if (c.kind === "hash-originals") {
        const capture = createStubCapture(c);
        return capture;
      }
      if (_ctx.chaos?.cdpDelayMs) {
        await new Promise((r) => setTimeout(r, _ctx.chaos.cdpDelayMs));
      }
      return createStubCapture(c);
    }
  };
}
