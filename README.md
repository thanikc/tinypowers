# tinypowers

A development workflow skill: DDD modelling, BDD scenarios as tests, smallest complete change, verified before done.

## Install

With [`npx skills`](https://github.com/vercel-labs/skills):

```sh
npx skills add thanikc/tinypowers
```

The CLI prompts for the agents to install to.

### Via Claude Code's plugin manager (skill + hooks)

Inside Claude Code, add this repo as a marketplace and install the plugin:

```
/plugin marketplace add thanikc/tinypowers
/plugin install tinypowers@tinypowers-marketplace
```

Or run `/plugin`, open **Marketplaces** to add `thanikc/tinypowers`, then pick **tinypowers** under **Discover** and install it. Manage, disable or uninstall it later from the same `/plugin` menu.

### From a local clone

`npx skills` installs only the skill in `skills/tinypowers/`; the plugin routes above also give you the hooks (the on/off switch and the optional band UI). To load a clone directly:

```sh
git clone https://github.com/thanikc/tinypowers
claude --plugin-dir ./tinypowers
```

## Update

```sh
npx skills update          # installed with npx skills
git -C ./tinypowers pull    # local clone
```

For the plugin, run `/plugin marketplace update tinypowers-marketplace`, then reinstall or update **tinypowers** from `/plugin`.

## Uninstall

```sh
npx skills remove tinypowers       # project install
npx skills remove -g tinypowers    # global install (chosen at install time)
```

For the plugin: `/plugin uninstall tinypowers@tinypowers-marketplace`, and optionally `/plugin marketplace remove tinypowers-marketplace`. For a local clone, stop passing `--plugin-dir` and delete the folder.

## Use

Invoke with `/tinypowers`, or let it trigger on "build", "add feature", "implement", "fix".

## How it works

The skill makes the agent agree on *what* to build before it writes any code. For each task it goes through these steps:

1. **Think**: state assumptions, ask if the request is unclear, list what the change touches.
2. **Model** (DDD): name the domain terms and the rules that must always hold. Saved to `docs/specs/<feature>.md`.
3. **Specify** (BDD): write Given/When/Then scenarios, including edge and failure cases. You approve them. Saved to `docs/features/<feature>.feature`.
4. **Plan**: for multi-step work, a short list of steps, each with a check. Saved to `docs/plans/<feature>.md`.
5. **Red, green, refactor**: turn each scenario into a failing test, write the least code that passes it, then tidy up.
6. **Verify**: run the tests, read the output, report what passed and what didn't.

The result is a small diff in which every change traces back to a scenario you agreed to.

### Example: add a feature

> You: `/tinypowers` add a discount code at checkout

The agent first writes the model in `docs/specs/discount-code.md`:

```
Context: Checkout
Terms: Cart, DiscountCode, Total
Invariant: a Total is never negative
```

Then it asks you to approve `docs/features/discount-code.feature`:

```gherkin
Scenario: Valid code reduces the total
  Given a Cart totalling 100
  When the customer applies a 10% DiscountCode
  Then the Total is 90

Scenario: Expired code is rejected
  Given a Cart totalling 100
  When the customer applies an expired DiscountCode
  Then the Total is 100
  And the customer sees "code expired"
```

After you say yes, it writes one failing test per scenario, makes them pass, and runs the suite.

### Example: fix a bug

> You: `/tinypowers` fix: a 100% code gives a negative total

The agent writes a scenario that reproduces the bug, watches it fail, finds every caller of the total calculation, and fixes it once in the shared code.

## Switch off

To turn it off, write `off` to `~/.claude/.tinypowers-active`; remove the file or write anything else to turn it back on.
