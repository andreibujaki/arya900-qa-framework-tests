# Oracle & invariant catalog

Run `node packages/cli/src/cli.mjs --list-oracles` for the live list.

## Oracles

| Name | Meaning |
| --- | --- |
| `noKnowledgeSearch` | No document search tool in Activity |
| `noKnowledgeTools` | No Knowledge search/list/read/skill |
| `toolCalled` | Activity matches `tool` regex |
| `activityMatches` | Activity+model match `pattern` |
| `replyMatches` | Model text matches `pattern` |
| `replyMinLength` | Model length > `min` |
| `routeBand` | Route band equals `band` |
| `fileExists` / `fileAbsent` | Relative path under projectRoot |
| `denyClicked` / `stopClicked` | UI confirm/stop outcomes |
| `manifestIntact` | MANIFEST.json hashes match |
| `stubEchoOk` | Stub/echo marker present |

## Invariants

| Name | Meaning |
| --- | --- |
| `ifRouteLowNoSearch` | low route ⇒ no search tool |
| `ifOptOutNoKnowledgeTools` | opt-out prompt ⇒ no Knowledge tools |
| `ifMidThenClarifyNoTools` | mid ⇒ clarify text, no search |
| `writeDenyImpliesFileAbsent` | deny click ⇒ file not created |
