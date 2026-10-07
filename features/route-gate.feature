Feature: Route-confidence gate
  Sample Gherkin authoring (also available as suites/yaml/route-gate.yaml).

  Scenario: R1 opt-out Hodge
    When user asks "do not search in documents, tell whats the Hodge Conjecture?"
    Then oracle noKnowledgeTools
    Then oracle replyMinLength min=40
    Then invariant ifOptOutNoKnowledgeTools
    And tags route,gherkin

  Scenario: R4 mid clarify
    When user asks "please analyze and summarize this situation"
    Then oracle noKnowledgeSearch
    Then oracle activityMatches /Project documents|generally|route mid/
    Then invariant ifMidThenClarifyNoTools
    And tags route,gherkin
