import {createStubAdapter} from "../../driver-stub/src/index.mjs";

/** Template adapter: shows how to wrap stub (or later a real driver). */
export function createEchoAdapter() {
  const stub = createStubAdapter("example-echo");
  return {
    ...stub,
    name: "example-echo",
    version: "2.0.0",
    async runCase(ctx, c) {
      const capture = await stub.runCase(ctx, c);
      capture.lastModel = (capture.lastModel || "") + " [echo-adapter]";
      capture.activityItems = [...(capture.activityItems || []), "ECHO adapter wrap"];
      return capture;
    }
  };
}
