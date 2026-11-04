---
name: tinypowers
description: Use when building a feature or fixing a bug and you want a disciplined, minimal workflow - domain modelling (DDD), Gherkin scenarios as tests (BDD), smallest complete change, verified before claiming done. Triggers on "build", "add feature", "implement", "fix", "execute the plan", "run the plan", or /tinypowers. Also use when continuing or planning work from an existing spec or plan (docs/specs/, docs/plans/), e.g. "continue with phase 3", "next step", "implement the spec".
---

# Spec-first-dev

DDD to name things, BDD to specify them, the smallest change to satisfy them, evidence to prove it. Stack-agnostic.

## 1. Think before coding

- State assumptions. If the request is unclear or has several readings, name them and ask. Never pick silently.
- If a simpler approach exists, say so and push back.
- Read the code the task touches. List everything the change must reach (callers, tests, fixtures, config, exports) and what it could break (data destroyed or exposed, callers that stop working). That is scope; extra features are not. Name skipped extras in one line.
- Before the first write, branch from main with a name that fits the work (e.g. `feat/<feature>`, `fix/<bug>`). Read-only work needs no branch.

## 2. Model the domain (DDD)

Before code, write down in a few lines:

- **Bounded context** and its **ubiquitous language**: the terms the domain experts use. Reuse the codebase's existing terms; add new ones only when needed.
- **Aggregate** and its **invariants**: what must always be true.
- Names in code, tests and messages use these terms. Reject generic names (`handle`, `process`, `manager`, `utils`).
- Domain logic is pure over plain data. I/O (DB, network, clock, randomness) sits behind a port at the edge, injected.

Save it to `docs/specs/<feature>.md`.

Skip this for trivial changes that add no domain concept.

## 3. Specify behaviour (BDD)

Write Given/When/Then scenarios in domain language, one per behaviour, including the edge and failure cases. Each describes observable behaviour, not implementation. Get the user's nod on non-obvious scenarios; they are the contract. Save them to `docs/features/<feature>.feature`.

## 4. Plan

For multi-step work, write a short plan to `docs/plans/<feature>.md`: each step with its verify check. When continuing from an existing spec, still write the plan first. Then stop and ask the user to review it; never execute until they approve. Take the first option that fully works:

1. Does it need to exist? If not, skip it.
2. Already in this codebase? Use it as the surrounding code does.
3. Standard library or platform feature? Use it.
4. Installed dependency? Use it. Never add one for a few lines.
5. One line a reader gets at a glance? Use it.
6. Otherwise, the minimum code that works.

## 5. Execute

### Orchestration

Before the first edit, with or without a plan: if the work has 2+ plan steps, or several separable items (e.g. 3+ fixes), independent steps, or steps of clearly different difficulty, you must read `orchestration.md` (next to this file) and ask with AskUserQuestion as it says. "Execute the plan" is not a choice. Otherwise do it inline.

### Red, green, refactor, per scenario

- Turn a scenario into a failing test. Run it; see it fail for the right reason.
- Write the least code that passes. Run it.
- Refactor only what this change made messy.
- Bug fix: reproduce with a failing scenario first, grep every caller of the function, fix the root cause once in shared code.

## 6. Keep the diff surgical

- Touch only what you must. Match existing style; don't improve adjacent code. Every changed line traces to the request.
- Remove only orphans your change created; mention other dead code, don't delete it.
- No abstraction, wrapper, option, config or "for later" code nobody asked for. Deletion beats addition.
- Code you move keeps its error handling and validation.
- Comment only the why, in one line. A known limit gets `shortcut: <the limit>, <when to upgrade>`.
- Never cut: validation at trust boundaries, error handling that prevents data loss, security, accessibility, anything the user asked for.

## 7. Verify before claiming done

Run the tests and any build or type check. Read the output. Report real results; if something failed or was not run, say so. No "should work".

If the repo has evals (an `evals/` dir or similar), or the change touches prompts, skills or agent behaviour, ask the user whether to run them too. Don't run them unasked: they cost tokens and time.

## 8. Reply

End with one or two lines: what you skipped or didn't check, and any risk the user must know.
