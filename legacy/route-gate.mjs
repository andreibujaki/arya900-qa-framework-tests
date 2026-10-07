/** Route-confidence gate cases (Guard Lab). */
export const suite = {
  id: "route-gate",
  title: "Route-confidence gate R1–R4",
  cases: [
    {
      id: "R1-opt-out",
      capture: "R1_opt_out_hodge",
      prompt: "do not search in documents, tell whats the Hodge Conjecture?",
      rules: [
        {
          name: "no search/list agent tools",
          check: ({act}) =>
            !/Caută în conținut|search_knowledge|Listează documente|Skill knowledge/i.test(
              act
            ) || /route low|opt_out/i.test(act)
        },
        {
          name: "non-empty answer",
          check: ({model}) => model.length > 40
        }
      ]
    },
    {
      id: "R2-general",
      capture: "R2_general_fact",
      prompt: "what issue is with Hodge Conjecture ?",
      rules: [
        {
          name: "no document search tool",
          check: ({act}) => !/Caută în conținut|search_knowledge/i.test(act)
        },
        {
          name: "answer length",
          check: ({model}) => model.length > 40
        }
      ]
    },
    {
      id: "R3-inventory",
      capture: "R3_inventory",
      prompt: "listează documentele",
      rules: [
        {
          name: "inventory or list signal",
          check: ({act, model}) =>
            /inventory|listeaz|Skill knowledge-list|document/i.test(act + model)
        }
      ]
    },
    {
      id: "R4-mid",
      capture: "R4_mid_clarify",
      prompt: "please analyze and summarize this situation",
      rules: [
        {
          name: "clarify or route mid",
          check: ({act, model}) =>
            /Project documents|generally|route mid|from Project/i.test(act + model)
        },
        {
          name: "no search tool",
          check: ({act}) => !/Caută în conținut|search_knowledge/i.test(act)
        }
      ]
    }
  ]
};
