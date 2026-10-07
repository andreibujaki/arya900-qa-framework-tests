/**
 * Production agent pack T1–T9 against the shipped sample-project fixtures.
 * T6–T9 use special runners in lib/specials.mjs.
 */
export const suite = {
  id: "prod",
  title: "Production agent tests",
  cases: [
    {
      id: "T1-fuzzy-filename",
      capture: "t1_fuzzy_filename",
      prompt: "what does demo report contain",
      rules: [
        {
          name: "skill/agent or read tool",
          check: ({act}) => /Skill|Agent|knowledge-read|Citește|read_text|INSTRUMENT/i.test(act)
        },
        {
          name: "mentions demo content",
          check: ({model, act}) =>
            /DEMO-TOKEN-ALPHA|alpha report|sample office|demo report/i.test(model + act)
        },
        {
          name: "no invented fire-safety story",
          check: ({model}) => !/gas mask|fire equipment|măști de gaz/i.test(model)
        }
      ]
    },
    {
      id: "T2-agent-compare",
      capture: "t2_agent_compare",
      prompt:
        "compare skill-tests/copy-alpha.md with skill-tests/copy-beta.md using tools; read both",
      rules: [
        {
          name: "compare/skill or agent",
          check: ({act}) => /compare|Skill|Agent|Citește|read_text|Extragere/i.test(act)
        },
        {
          name: "two reads or both filenames",
          check: ({act}) => {
            const reads = (act.match(/Citește document|read_text_file|Extragere/gi) || [])
              .length;
            return (
              reads >= 2 || (/copy-alpha/i.test(act) && /copy-beta/i.test(act))
            );
          }
        },
        {
          name: "structured answer",
          check: ({model}) => model.length > 80
        }
      ]
    },
    {
      id: "T3-search",
      capture: "t3_search",
      prompt: "search DEMO-TOKEN-ALPHA in Project",
      rules: [
        {
          name: "search or list/read tools",
          check: ({act, capture}) =>
            /search_knowledge|Caută|Listează|Citește|Skill knowledge/i.test(act) ||
            /DEMO-TOKEN-ALPHA/i.test(capture?.lastModel || "")
        },
        {
          name: "mentions demo token",
          check: ({model}) => /DEMO-TOKEN-ALPHA/i.test(model)
        }
      ]
    },
    {
      id: "T4-csv",
      capture: "t4_csv_analyze",
      prompt: "analyze skill-tests/copy-budget.csv show tables and numbers",
      rules: [
        {
          name: "read or analyze tool signal",
          check: ({act, model}) =>
            /csv|Citește|read_text|Skill|Laptop|1200|Mouse/i.test(act + model)
        },
        {
          name: "non-empty answer",
          check: ({model}) => model.length > 40
        }
      ]
    },
    {
      id: "T5-text-doc",
      capture: "t5_text_analyze",
      prompt: "analyze skill-tests/copy-proforma.txt summarize contents",
      rules: [
        {
          name: "read tool or skill",
          check: ({act}) => /Citește|read_text|Skill|INSTRUMENT/i.test(act)
        },
        {
          name: "grounded length",
          check: ({model}) => model.length > 40
        }
      ]
    },
    {
      id: "T6-write-allow",
      kind: "write-allow"
    },
    {
      id: "T7-write-deny",
      kind: "write-deny"
    },
    {
      id: "T8-abort",
      kind: "abort"
    },
    {
      id: "T9-fixture-integrity",
      kind: "hash-originals"
    }
  ]
};
