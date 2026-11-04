# Orchestration

Ask before the first edit, after the plan is approved (or right away if there is no plan). Always ask; no other approval (plan, spec, "ok") counts as choosing. Ask exactly 2 options with AskUserQuestion, recommended one first, labelled "(Recommended)": **inline** (no subagents) and **subagents** (one per task; independent tasks in parallel, the rest in order; main agent checks each and integrates). Put which tasks use which model in the recommended option's description. Wait for the answer; don't spawn agents unasked.

- Main agent routes and integrates; subagents do bounded tasks with a stated verify check.
- Cheapest model that can do each task: haiku for search, lookup, mechanical edits; sonnet for implementation and tests; opus for design, ambiguous debugging, review.
- Parallelise only tasks with no shared state.
