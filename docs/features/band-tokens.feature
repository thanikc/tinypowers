Feature: Band token total updates while a task runs

  Scenario: tokens grow after each model step, before the turn ends
    Given the band shows 0 tok
    When a model step finishes with 30000 tokens of usage
    Then the band shows 30k tok without waiting for the turn to complete

  Scenario: a subagent's steps count too
    Given the band shows 0 tok
    When a subagent's model step finishes with 1000 tokens of usage
    Then the band shows 1k tok

  Scenario: the turn's end does not count its steps again
    Given a step with 1000 tokens of usage was counted
    When the turn completes with that same 1000 tokens as its usage
    Then the band still shows 1k tok

  Scenario: cost, turns and time move while a task runs
    Given the band shows $0.00, 1 turn and 0s
    When a model step takes 5 seconds and the session cost is now $0.50 over 2 turns
    Then the band shows $0.50, 2 turns and 5s before the turn completes

  Scenario: the clock keeps ticking while a subagent outlives the main turn
    Given the main agent's turn ran 3 minutes and a subagent is still running
    When the turn completes and the subagent keeps working for 7 more minutes
    Then the band shows 10m 0s, and stops only when the subagent's turn completes
