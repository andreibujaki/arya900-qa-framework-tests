# Write an adapter

1. Implement `{ name, version, probeCapabilities(cfg), runCase(ctx, caseDef) }`
2. Reuse `@arya-qa/driver-cdp` for Electron CDP, or `@arya-qa/driver-stub` for CI
3. Map UI locale labels if your app is not Arya
4. Return a `TurnCapture` (`lastModel`, `activityItems`, optional `routeBand`, …)
5. Register in CLI `pickAdapter` and add a suite in `suites/catalog.yaml`

Example: [`packages/adapter-example-echo`](../packages/adapter-example-echo).
