/** @returns {import('@arya-qa/core').Adapter} — shape only; wire your driver. */
export function createTemplateAdapter() {
  return {
    name: "template",
    version: "0.0.0",
    async probeCapabilities() {
      return {cdp: false, modelLoaded: false, knowledgeFolder: false, confirmUi: false};
    },
    async runCase(_ctx, c) {
      return {
        at: new Date().toISOString(),
        prompt: c.prompt || "",
        lastModel: "implement me",
        activityItems: ["TEMPLATE"]
      };
    }
  };
}
