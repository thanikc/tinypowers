# Orchestration

Applies when the request has several separable items (e.g. 3+ fixes), independent steps, or steps of clearly different difficulty. Otherwise do it inline; a router costs more than it saves on small work.

- When it applies, ask during plan review, before the first edit, and wait for their answer. Never silently do it all inline. Don't spawn agents unasked.
- Present exactly 2 options with AskUserQuestion, recommended one first, labelled "(Recommended)": **inline** (no subagents) and **subagents** (one per task; independent tasks run in parallel, the rest in order; main agent checks each and integrates). Put which tasks use which model in the recommended option's description.
- Main agent routes and integrates; subagents do bounded tasks with a stated verify check.
- Pick the cheapest model that can do each task: small/fast (haiku) for search, lookup, mechanical edits; mid (sonnet) for implementation and tests; strongest (opus) for design, ambiguous debugging, review.
- Parallelise only tasks with no shared state.
