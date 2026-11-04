import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { NO_TOKENS, addTokens, elapsed, fmtTokens, totalTokens } from './metrics'
import type { Tokens } from './metrics'

type Band = { cost: number; spent: number; turns: number; turnCosts: number[]; tokens: Tokens; busyMs: number; open: string[]; since?: number; on: boolean; cwd?: string }
const EMPTY: Band = { cost: 0, spent: 0, turns: 0, turnCosts: [], tokens: NO_TOKENS, busyMs: 0, open: [], on: true }
const TASK = { spent: 0, turns: 0, turnCosts: [], tokens: NO_TOKENS, busyMs: 0, open: [], since: undefined }
const band = atom({ plugin: 'tinypowers', key: 'band' } as const, EMPTY)
const load = async ($: EngineInterface): Promise<Band> => ({ ...EMPTY, ...(await read($, band)) })

// Windows sets USERPROFILE, not HOME.
const home = async ($: EngineInterface) => (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE'))
// The flag hooks/tinypowers-hooks.json reads, one per project. Absent = on.
// shortcut: before session.start has run there is no project yet, so it falls back to the home folder.
const flagFile = async ($: EngineInterface) => `${(await load($)).cwd ?? (await home($))}/.claude/.tinypowers-active`
const isOn = async ($: EngineInterface) => (await $.fs.read(await flagFile($)).catch(() => 'on')).trim() !== 'off'

// Same command a person types, so the skill stays the only logic.
const run = ($: EngineInterface, args: string) => $.command.run({ command: 'tinypowers:tinypowers', args })

// The common tasks: label and the request each one sends to the skill.
const TASKS = [
  ['Build', 'build a feature: ask me what to build, then follow the workflow'],
  ['Fix', 'fix a bug: ask me for the symptom, reproduce it with a failing scenario first'],
  ['Review', 'review the uncommitted changes against the workflow, change nothing'],
  ['Audit', 'audit the whole codebase against the workflow (domain model, scenarios, needless code), report findings ranked, change nothing'],
  ['Verify', 'run the tests and any build or type check, report real results. If the repo has evals or the change touches prompts or skills, use AskUserQuestion to ask whether to run them too'],
] as const

export const register: Register = (on, _options) => {
  on('session.start', async ($, e, next) => {
    await update($, band, b => ({ ...EMPTY, ...b, cwd: e.cwd }))
    return next(e)
  }).catch(($, e, next) => next(e))

  // /clear starts a new task: counters start over, the cost baseline stays.
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') await update($, band, b => ({ ...EMPTY, ...b, ...TASK }))
    return next(e)
  }).catch(($, e, next) => next(e))

  // Each model step, subagents' too, adds its tokens as it ends; turn.complete would count them again.
  // It also refreshes spend, turns and time so they move mid-task; turn.complete makes them exact.
  on('turn.step', async function* ($, e, next) {
    // The clock runs from the first step until every agent, subagents too, has completed its turn.
    const who = e.agentId ?? 'main'
    const now = await $.clock.now()
    await update($, band, b => ({ ...EMPTY, ...b, open: b.open.includes(who) ? b.open : [...b.open, who], since: b.since ?? now }))
    const step = yield* next(e)
    const cost = (await $.session.usage()).cost?.usd
    const turns = await $.session.turns()
    await update($, band, b => ({
      ...EMPTY,
      ...b,
      tokens: step.usage ? addTokens(b.tokens, step.usage) : b.tokens,
      spent: cost ?? b.spent,
      turns,
    }))
    return step
  }).catch(async function* ($, e, next) { return yield* next(e) })

  on('turn.complete', async ($, e, next) => {
    const who = e.agentId ?? 'main'
    // The last agent to finish stops the clock.
    const now = await $.clock.now()
    const stop = (b: Band) => {
      const open = b.open.filter(a => a !== who)
      return open.length || b.since === undefined ? { open } : { open, busyMs: b.busyMs + now - b.since, since: undefined }
    }
    // A subagent's cost is already in the session cost the main turn reads; its tokens came in with its steps.
    if (e.agentId !== undefined) {
      await update($, band, b => ({ ...EMPTY, ...b, ...stop({ ...EMPTY, ...b }) }))
      return next(e)
    }
    const usage = await $.session.usage()
    const turns = await $.session.turns()
    await update($, band, x => {
      const b = { ...EMPTY, ...x }
      const cost = usage.cost?.usd ?? b.cost
      // A cost below the baseline means the engine started its ledger over.
      const turn = cost >= b.cost ? cost - b.cost : cost
      return {
        ...b,
        cost,
        spent: cost,
        turns,
        turnCosts: [...b.turnCosts, turn].slice(-20),
        ...stop(b),
      }
    })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    // Other mods share this slot: draw theirs below ours.
    const below = await next(e).catch(() => undefined)
    const b = await load($)
    const enabled = await isOn($)
    const now = await $.clock.now()
    const last = b.turnCosts[b.turnCosts.length - 1]
    const toggle = async () => {
      await $.fs.write(await flagFile($), enabled ? 'off' : 'on')
      await update($, band, x => ({ ...EMPTY, ...x, on: !enabled }))
    }

    const { Box, Text, Button } = $.ui.resolve(e)
    const width = e.surface === 'terminal' ? e.props.bodyColumns : undefined
    const mine = (
      <Box flexDirection="row" alignItems="center" gap={2} width={width}>
        <Button key="on" plain onPress={toggle}>
          <Text color={enabled ? 'suggestion' : 'inactive'}>●</Text> {enabled ? 'on' : 'off'}
        </Button>
        <Text>${b.spent.toFixed(2)}</Text>
        {last !== undefined && <Text dimColor>last ${last.toFixed(2)}</Text>}
        <Text>{fmtTokens(totalTokens(b.tokens))} tok</Text>
        <Text dimColor>{b.turns} {b.turns === 1 ? 'turn' : 'turns'}</Text>
        <Text dimColor>{elapsed(b.busyMs + (b.since === undefined ? 0 : now - b.since))}</Text>
        <Box flexGrow={1} />
        {enabled && TASKS.map(([label, args]) => (
          <Button key={label} plain label={label} onPress={() => run($, args)} />
        ))}
      </Box>
    )
    return below ? <Box flexDirection="column">{mine}{below}</Box> : mine
  }).catch(($, e, next) => next(e))
}
