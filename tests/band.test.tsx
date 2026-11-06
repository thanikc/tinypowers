import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 12, bodyColumns: 100, scroll: { offset: 0, bodyRows: 12 }, view: {} },
} as const
const use = (input: number) => ({ input_tokens: input, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, model: 'm' })
const step = (usage: ReturnType<typeof use>, agentId?: string) => ({ turnId: 't', index: 0, model: 'm', effort: 'medium', messageCount: 1, ...(agentId && { agentId }), usage })

// turn.step streams: drain it so the plugin's hook runs to its end.
const run = async ($: any, usage: ReturnType<typeof use>, agentId?: string) => { for await (const _ of $.turn.step(step(usage, agentId))) {} }

// The row's text runs together: $ + cost 0.00 + tokens + " tok".
const tok = async (ui: { find: Function }) => /\$0\.00(\d+(?:\.\d)?[kM]?) tok/.exec((await ui.find({ type: 'Box' }))?.text ?? '')?.[1]

let session = { cost: 0, turns: 1 }
let clock: ReturnType<typeof mock.clock>
let files: Record<string, string> = {}
let stepMs = 0
const mountBand = async ($: any, on: any) => {
  clock = mock.clock(on)
  session = { cost: 0, turns: 1 }
  files = {}
  stepMs = 0
  mock.store(on)
  on('env.get', () => ({ value: '/home/u' }))
  on('fs.read', (_$: any, e: any) => (e.path in files ? { value: files[e.path] } : { deny: 'missing' }))
  on('fs.write', (_$: any, e: any) => { files[e.path] = e.text; return { value: undefined } })
  on('session.turns', () => ({ value: session.turns }))
  on('session.usage', () => ({ value: { startedAt: 0, cost: { usd: session.cost } } }))
  on('turn.complete', () => ({ text: '' }))
  on('session.end', () => ({ sessionId: 's' }))
  on('prompt.submit', (_$: any, e: any) => ({ text: e.text }))
  // What Claude Code draws without the band.
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>prompt only</Text>
  })
  on('turn.step', async function* (_$: any, e: any) { if (stepMs) await clock.advance(stepMs); return { turnId: 't', index: 0, answer: '', toolUses: [], stopReason: 'tool_use', usage: e.usage } })
  return $.ui.mount({ plugin: 'tinypowers', surface: 'terminal', ...BAND })
}

test('tokens grow after each model step, before the turn ends', async ($, on) => {
  const ui = await mountBand($, on)
  expect(await tok(ui)).toBe('0')
  await run($, use(30000))
  expect(await tok(ui)).toBe('30k')
  await ui.unmount()
})

test("a subagent's steps count too", async ($, on) => {
  const ui = await mountBand($, on)
  await run($, use(1000), 'agent-1')
  expect(await tok(ui)).toBe('1k')
  await ui.unmount()
})

test("the turn's end does not count its steps again", async ($, on) => {
  const ui = await mountBand($, on)
  await run($, use(1000))
  await $.turn.complete({ answer: '', durationMs: 1000, usage: use(1000) } as never)
  expect(await tok(ui)).toBe('1k')
  await ui.unmount()
})

test('cost, turns and time move while a task runs', async ($, on) => {
  const ui = await mountBand($, on)
  session = { cost: 0.5, turns: 2 }
  stepMs = 5_000
  await run($, use(1))
  const text = (await ui.find({ type: 'Box' }))?.text ?? ''
  expect(text).toContain('$0.50')
  expect(text).toContain('2 turns')
  expect(text).toContain('5s')
  await ui.unmount()
})

test('the clock keeps ticking while a subagent outlives the main turn', async ($, on) => {
  const ui = await mountBand($, on)
  await run($, use(1))
  await run($, use(1), 'agent-1')
  await clock.advance(180_000)
  await $.turn.complete({ answer: '', durationMs: 180_000, usage: use(0) } as never)
  await clock.advance(420_000)
  await $.turn.complete({ answer: '', durationMs: 420_000, usage: use(0), agentId: 'agent-1' } as never)
  expect((await ui.find({ type: 'Box' }))?.text ?? '').toContain('10m 0s')
  await ui.unmount()
})

test('the switch turns the skill off and the band shows it', async ($, on) => {
  const ui = await mountBand($, on)
  expect((await ui.find({ key: 'on' }))?.text).toContain('on')
  await ui.press({ key: 'on' })
  expect(files['/home/u/.claude/.tinypowers-active']).toBe('off')
  expect((await ui.find({ key: 'on' }))?.text).toContain('off')
  await ui.unmount()
})

const text = async (ui: { find: Function }) => (await ui.find({ type: 'Box' }))?.text ?? ''

test('the clock ticks on screen while a step is still running', async ($, on) => {
  const ui = await mountBand($, on)
  await run($, use(1))
  await clock.advance(3_000)
  expect(await text(ui)).toContain('3s')
  await ui.unmount()
})

test('/clear starts the spend over from the current session cost', async ($, on) => {
  const ui = await mountBand($, on)
  session = { cost: 0.5, turns: 1 }
  await run($, use(1))
  await $.turn.complete({ answer: '', durationMs: 1, usage: use(0) } as never)
  expect(await text(ui)).toContain('$0.50')
  await $.session.end({ reason: 'clear', sessionId: 's' } as never)
  await run($, use(1))
  expect(await text(ui)).toContain('$0.00')
  await ui.unmount()
})

test('a new prompt stops a clock left running by an interrupted turn', async ($, on) => {
  const ui = await mountBand($, on)
  await run($, use(1))
  await clock.advance(4_000)
  await $.prompt.submit({ text: 'next' } as never)
  await clock.advance(10_000)
  expect(await text(ui)).toMatch(/turns?4sBuild/)
  await ui.unmount()
})
