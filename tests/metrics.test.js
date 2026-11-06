const test = require('node:test')
const assert = require('node:assert/strict')

test('token sums and labels', async () => {
  const m = await import('../hooks/band/metrics.ts')
  const t = m.addTokens(m.NO_TOKENS, { input_tokens: 1, output_tokens: 2, cache_read_input_tokens: 3, cache_creation_input_tokens: 4 })
  assert.equal(m.totalTokens(t), 10)
  assert.equal(m.fmtTokens(1500), '1.5k')
  assert.equal(m.fmtTokens(999_949), '999.9k')
  assert.equal(m.fmtTokens(999_950), '1M')
  assert.equal(m.fmtTokens(2_000_000), '2M')
  assert.equal(m.elapsed(65_000), '1m 5s')
})
