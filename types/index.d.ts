export type Tokens = { input: number; output: number; cacheRead: number; cacheWrite: number }

export type Band = { cost: number; base: number; spent: number; turns: number; last?: number; tokens: Tokens; busyMs: number; open: string[]; since?: number; on: boolean; cwd?: string }

declare module 'claude-code' {
  interface PluginState {
    tinypowers: { band: Band }
  }
}
