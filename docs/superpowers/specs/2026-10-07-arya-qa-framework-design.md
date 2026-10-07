# Arya QA Framework Design

**Date:** 2026-10-07  
**Status:** Approved for implementation  
**Repo:** `arya-guard-cdp-tests`

## Goals

Public, installable QA framework for Arya 900 Guard / Lab that outsiders can repurpose for any Electron CDP app. Dependencies allowed. Generic core + first-class Arya adapter + stub/example adapters.

## Architecture

npm workspaces: `@arya-qa/core`, `@arya-qa/driver-cdp`, `@arya-qa/driver-stub`, `@arya-qa/adapter-arya`, `@arya-qa/adapter-example-echo`, `@arya-qa/cli`.

Authoring: YAML suites, Gherkin features, Playwright TS specs — all compile to `CaseDefinition`.

Playwright projects: `stub` (CI), `arya` (live CDP, workers=1), `example-echo` (template).

## Case model

See plan: tags, severity, requires, fixturePack, timeoutMs, dependsOn, matrix, expect allOf/anyOf, invariants, golden, chaos, retries, knownFlaky, artifacts, locale, cleanup, requirementId, risk.

## Chaos / goldens / invariants

1. Profiles `light` / `aggressive`  
2. Safety: off unless `--chaos` or `CHAOS=1` on live Arya  
3. Golden scopes: `tools-only` | `tools+route` | `tools+route+skill`  
4. Golden ignore: timestamps, absolute paths, volatile IDs  
5. Named invariant registry  
6. Quarantine lane unless `--strict`  
7. Budget caps  
8. Differential mode  

## Reporting

REPORT.md/json (schema-versioned), JUnit, Allure, redaction, retention, resume merge, preflight, Job Summary.

## Compatibility

`ARYA_*` env vars; public `fixtures/sample-project` only; old `bin/arya-cdp-test.mjs` shims to new CLI.
