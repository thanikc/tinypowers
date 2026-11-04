const test = require('node:test')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const path = require('node:path')

// The hook that makes "off" real: silent when on or flag absent, says OFF when the flag is off.
const hooks = require('../hooks/tinypowers-hooks.json')
const cmd = hooks.hooks.UserPromptSubmit[0].hooks[0].command
const run = dir => execFileSync('sh', ['-c', cmd], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir } }).toString()

test('hook is silent without a flag and when on, speaks when off', () => {
  const fs = require('node:fs')
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'syn-'))
  fs.mkdirSync(path.join(dir, '.claude'))
  assert.equal(run(dir), '')
  fs.writeFileSync(path.join(dir, '.claude', '.tinypowers-active'), 'on')
  assert.equal(run(dir), '')
  fs.writeFileSync(path.join(dir, '.claude', '.tinypowers-active'), 'off')
  assert.match(run(dir), /TINYPOWERS OFF/)
})

test('token sums and labels', async () => {
  const m = await import('../hooks/band/metrics.ts')
  const t = m.addTokens(m.NO_TOKENS, { input_tokens: 1, output_tokens: 2, cache_read_input_tokens: 3, cache_creation_input_tokens: 4 })
  assert.equal(m.totalTokens(t), 10)
  assert.equal(m.fmtTokens(1500), '1.5k')
  assert.equal(m.fmtTokens(2_000_000), '2M')
  assert.equal(m.elapsed(65_000), '1m 5s')
})
