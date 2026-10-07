# Sample Knowledge folder

`sample-project/` ships with this repository. It is **public demo content only** — no customer or private documents.

After clone, the harness defaults `projectRoot` to this folder. Point Arya Guard’s Knowledge / Project setting at the same path before running suites.

## Layout

```
sample-project/
  MANIFEST.json              SHA-256 of fixture files (used by T9)
  demo-report.md             Main demo document (keyword DEMO-TOKEN-ALPHA)
  demo report .md            Same topic; trailing space before .md (fuzzy name)
  skill-tests/
    copy-alpha.md            Compare pair A
    copy-beta.md             Compare pair B
    copy-budget.csv          Table / numbers analyze
    copy-proforma.txt        Short text analyze
```

## Regenerating MANIFEST.json

If you edit sample files:

```bash
node scripts/hash-fixtures.mjs
```

## Using your own folder

Copy `config.example.json` → `config.local.json` and set `projectRoot` to any Knowledge folder that contains the same relative names (or change suite prompts in `suites/prod.mjs` to match your files). Do not commit private documents into this repo.
