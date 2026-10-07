# Chaos & goldens

## Chaos

- Off by default. Enable with `--chaos` or `CHAOS=1` (required for live Arya).
- Profiles: `light`, `aggressive` (`--chaos-profile`).
- Seeded RNG for reproducibility; suite budgets `chaosBudget` / `abortBudget`.
- Failures with chaos or `knownFlaky` go to **quarantine** unless `--strict`.
- `--differential` runs stable vs chaos and records fingerprint diffs.

## Goldens

- Stored under `goldens/`.
- Scopes: `tools-only` | `tools+route` | `tools+route+skill`.
- Ignore rules strip timestamps, absolute paths, volatile IDs.
- Refresh with `--update-goldens`.
