# arya-guard-cdp-tests (Arya QA Framework v2)

Public, installable **CDP QA framework** for [Arya 900 Guard](https://github.com/andreibujaki/arya900) / Guard Lab — and a **generic core** you can repurpose for other Electron apps.

- **YAML + Gherkin** authoring (one `CaseDefinition` model); Playwright optional for TS specs
- **Zero hard npm dependencies** (Node 20+ only); `@playwright/test` is optional
- **Named oracles & invariants**, tags, severity, hooks, capability skips
- **Chaos profiles**, **goldens**, quarantine, differential mode
- **Reports:** Markdown, JSON (schema-versioned), JUnit, Allure-style results, GitHub Job Summary
- **Adapters:** `stub` (CI), `arya` (live), `example-echo` (template)
- Ships **public sample fixtures only** (`fixtures/sample-project`)

---

## Project scope: agent and AI engine testing

This repository is a **quality-assurance harness for local AI assistants that use tools and agents** — specifically Arya 900 Guard’s chat + Knowledge/Project agent stack. It does **not** train models, score academic benchmarks (MMLU, TruthfulQA, etc.), or replace unit tests inside the Guard app. It answers a different question:

> When a real user types a prompt into the running desktop app, does the **AI engine + agent + tools** behave correctly, safely, and observably?

### What “AI engine” means here

In Arya Guard, a turn is more than “call an LLM.” The **engine path** for one user message typically includes:

1. **Routing / intent** — decide plain chat vs Knowledge agent vs clarify vs write short-circuit  
2. **Skills** — pick `knowledge-search`, `knowledge-compare`, office skills, etc.  
3. **Tools** — `search_knowledge_base`, `read_text_file`, `list_folder`, `knowledge_write`, …  
4. **Confirm UI** — Allow / Deny on sensitive tools  
5. **Grounding** — answers that must come from Project files, not free invention  
6. **Abort / stop** — user can cancel mid-generation  

The framework drives that full path through the **real UI and RPC** (Chrome DevTools Protocol), then judges **observable outcomes**: Activity panel tool lines, model reply text, files on disk, route-band debug lines, confirm clicks.

### What “agent testing” means here

An **agent** turn is one where the model is allowed (or forced) to call tools in a loop under skills / step limits. Agent QA in this project focuses on:

| Concern | Examples of what we assert |
| --- | --- |
| **Activation** | Fuzzy filename read starts a skill/agent; inventory uses list tools |
| **Tool use** | Compare reads **two** files; search hits the Project; write tools fire |
| **Non-activation** | “Do not search in documents…” stays in plain chat (no Knowledge tools) |
| **Routing bands** | Ambiguous analyze → mid-band clarify, **no** tools until the user chooses |
| **Safety UX** | Write + Deny → file **absent**; long turn + Stop → input re-enabled |
| **Integrity** | Sample fixture hashes unchanged (no silent corruption of golden docs) |
| **Grounding signals** | Reply mentions demo tokens / file names from the Project, not unrelated hallucination markers |

Suites map to those concerns:

- **`route-gate` (R1–R4)** — routing confidence: opt-out, general fact, inventory, mid clarify  
- **`prod` (T1–T9)** — agent/tool production pack: fuzzy read, compare, search, csv/text analyze, write allow/deny, abort, fixture integrity  
- **`lab`** — route-gate + prod (promotion-style pack for Guard Lab)  
- **`smoke` / `echo`** — stub adapters for CI without a live model  

### Quality dimensions covered

1. **Functional correctness of the agent stack** — right tools, right files, right short-circuits  
2. **Policy / routing** — when tools must **not** run (opt-out, low route, mid clarify)  
3. **Human-in-the-loop** — confirm Allow/Deny and Stop behave as product rules  
4. **Deterministic fixtures** — public `fixtures/sample-project` so anyone can reproduce  
5. **Robustness (optional)** — chaos (deny/abort/delay), goldens (Activity fingerprints), quarantine for flaky/chaos fails  
6. **Repurposability** — swap adapters so the same case model can test another Electron AI app’s engine  

### How a live agent test runs (mechanically)

```text
CLI / suite YAML
    → adapter-arya connects to Guard CDP (:9222 / :9223)
    → RPC newChat + (optional) settings (folder, confirm policy)
    → mouse/keyboard types the user prompt and clicks Send
    → waits until generation finishes (or short-circuit reply stabilizes)
    → auto-clicks Allow if a confirm dialog appears (except Deny cases)
    → expands Activity, snapshots lastModel + activityItems
    → named oracles + invariants → PASS / FAIL / SKIP / QUARANTINE
    → REPORT.md + JSON + JUnit + captures
```

Oracles prefer **signals** (tool names, route band, file existence) over “does the prose sound smart?” — because LLM wording varies; **engine behavior** should not.

### In scope

- End-to-end **interactive** tests against a running Arya Guard / Guard Lab window  
- Knowledge/Project **agent and tool** behavior (search, read, list, compare, write, deny, abort)  
- **Route-confidence** gate behavior (high → agent, mid → clarify, low → plain chat)  
- Stub/CI mode that **simulates** captures so loaders, oracles, reports, and adapters can be tested without GPU/model  
- Authoring surfaces for agent scenarios: YAML, Gherkin, optional Playwright  
- Reports suitable for humans and CI gates  

### Out of scope (intentionally)

- **Model quality benchmarks** (accuracy leaderboards, TruthfulQA, MMLU, BLEU, etc.)  
- **Training / fine-tuning / LoRA** evaluation  
- **Token-level or logit** inspection of `node-llama-cpp`  
- Replacing Guard’s **in-repo unit tests** (intent classifiers, search ranking, etc. — those stay in the app repo)  
- Launching Guard, downloading GGUFs, or provisioning GPUs for you  
- Testing **private customer documents** (do not commit them; point `ARYA_FOLDER` at your own folder locally)  
- Guaranteeing identical natural-language wording across model versions  

### Relationship to the Arya product

| Layer | Where it lives | Role |
| --- | --- | --- |
| AI runtime (GGUF load, generate, tools schema) | Arya 900 Guard app | Engine under test |
| Agent skills / Knowledge routing | Guard (+ Guard Lab builds) | Behavior under test |
| **This repo** | External harness | Observes and judges the running engine/agent |

Use **Guard Lab** (`:9223`) to validate experimental gates (e.g. route-confidence) before promoting the same behavior into production Guard.

### Success criteria for “agent/engine OK”

A pack is considered healthy when:

- Required agent cases **activate tools/skills** when they should, and **do not** when policy says not to  
- Grounded cases show Project-linked content (tokens/filenames), not empty or tool-free wrong paths  
- Write deny / abort cases enforce safety UX  
- Stub CI stays green so harness regressions are caught without a live model  
- Reports make failures **traceable** (case id → capture → oracle notes)  

---

## Install

```bash
git clone https://github.com/andreibujaki/arya-guard-cdp-tests.git
cd arya-guard-cdp-tests
npm install
npm run check
```

No private documents required. Optional: `cp config.example.json config.local.json`.

## Quick start (no Guard — CI / local stub)

```bash
npm run test:stub          # smoke suite on stub adapter
npm run test:echo          # example-echo adapter
npm run test:unit          # oracle/chaos/golden unit tests
```

## Live Arya Guard

```bat
"C:\Program Files\Arya 900 Guard\Arya 900 Guard.exe" --remote-debugging-port=9222
```

```bash
npm run probe
npm run preflight -- --project arya
npm run setup:folder
# set ARYA_MODEL_PATH then:
npm run setup:model
npm run test:prod          # T1–T9
npm run test:route         # R1–R4
npm run test:lab           # both
```

Lab CDP port: `$env:ARYA_CDP_PORT=9223`.

## Architecture

| Package | Role |
| --- | --- |
| `@arya-qa/core` | Case engine, loaders, oracles, invariants, chaos, goldens, reports |
| `@arya-qa/driver-cdp` | Generic Electron CDP |
| `@arya-qa/driver-stub` | Fake captures for CI |
| `@arya-qa/adapter-arya` | Arya llmRpc + fresh-turn + write/deny/abort |
| `@arya-qa/adapter-example-echo` | Repurpose demo |
| `@arya-qa/cli` | `arya-cdp-test` CLI |

```mermaid
flowchart LR
  YAML[YAML] --> Core
  Gherkin[Gherkin] --> Core
  PW[Playwright] --> Core
  Core --> Stub
  Core --> Arya
  Arya --> CDP[driver-cdp]
  Stub --> Reports
  Arya --> Reports
```

## Authoring tests

1. **YAML** — `suites/yaml/*.yaml` + entry in `suites/catalog.yaml`
2. **Gherkin** — `features/*.feature` (see `route-gate-bdd` suite)
3. **Playwright TS** — `tests/*.spec.ts` (calls CLI or imports core)

```yaml
- id: R1-opt-out
  prompt: "do not search in documents, tell whats the Hodge Conjecture?"
  tags: [route]
  requires: [cdp, modelLoaded]
  expect:
    - oracle: noKnowledgeTools
    - oracle: replyMinLength
      min: 40
  invariants: [ifOptOutNoKnowledgeTools]
```

Oracle list: `node packages/cli/src/cli.mjs --list-oracles`  
Docs: [docs/oracle-catalog.md](docs/oracle-catalog.md), [docs/write-an-adapter.md](docs/write-an-adapter.md), [docs/chaos-and-goldens.md](docs/chaos-and-goldens.md).

## Chaos & goldens

```bash
node packages/cli/src/cli.mjs --project stub --suite smoke --chaos --chaos-profile light
node packages/cli/src/cli.mjs --project stub --suite smoke --update-goldens
node packages/cli/src/cli.mjs --project stub --suite smoke --differential --chaos
```

Live Arya: chaos stays **off** unless `--chaos` or `CHAOS=1`.

## Reports

Each run writes under `sessions/…`:

- `REPORT.md` / `REPORT.json`
- `junit.xml`
- `allure-results/`
- `job-summary.md`
- `cdp-point-captures/`

## CLI flags

`--list` `--list-oracles` `--probe` `--preflight` `--setup folder|model`  
`--project stub|arya|example-echo` `--suite <id>` `--tags a,b`  
`--chaos` `--chaos-profile` `--strict` `--strict-soft` `--update-goldens` `--differential`  
`--from T3` `--turn "…"`

Env: `ARYA_CDP_PORT` `ARYA_FOLDER` `ARYA_MODEL_PATH` `ARYA_SESSION` `ARYA_FROM` `ARYA_WAIT_MS` `CHAOS`.

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Pass (quarantine ignored unless `--strict`) |
| 1 | Setup / infra error |
| 2 | Case failures |

## Design spec

[docs/superpowers/specs/2026-10-07-arya-qa-framework-design.md](docs/superpowers/specs/2026-10-07-arya-qa-framework-design.md)

## License

Apache-2.0
