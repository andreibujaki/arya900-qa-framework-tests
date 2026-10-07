# Adapter template

1. Copy this folder to `packages/adapter-myapp`
2. Implement `createMyAdapter()` with `probeCapabilities` + `runCase`
3. Register in `packages/cli/src/cli.mjs` `pickAdapter()`
4. Add a Playwright project + YAML suite
5. Document capabilities in your adapter README

See `packages/adapter-example-echo` for a complete stub-based example.
