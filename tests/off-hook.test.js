const test = require('node:test')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

// The hook that makes "off" real: silent when on or flag absent, says OFF when the flag is off.
const hooks = require('../hooks/tinypowers-hooks.json')
const cmd = hooks.hooks.UserPromptSubmit[0].hooks[0].command
const run = dir => execFileSync('sh', ['-c', cmd], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir } }).toString()

test('hook is silent without a flag and when on, speaks when off', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tinypowers-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  fs.mkdirSync(path.join(dir, '.claude'))
  assert.equal(run(dir), '')
  fs.writeFileSync(path.join(dir, '.claude', '.tinypowers-active'), 'on')
  assert.equal(run(dir), '')
  fs.writeFileSync(path.join(dir, '.claude', '.tinypowers-active'), 'off')
  assert.match(run(dir), /TINYPOWERS OFF/)
})
