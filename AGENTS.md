# Agent contract

This is the **single source of truth** for every coding agent that touches this repo —
Claude Code, OpenAI Codex, CI bots, and humans acting as reviewers.

`CLAUDE.md` is a pointer to this file. Codex reads `AGENTS.md` natively. Keep the rules
here and nowhere else, so the two harnesses cannot drift apart.

## Non-negotiables

1. **Never push red.** Run `./scripts/preflight.sh` and get a clean exit before any push.
2. **Reproduce before you fix.** A fix with no failing case that it turns green is a guess.
3. **Minimal diffs.** Fix what the task names. Do not widen scope, reformat untouched
   files, or "improve while you're in there."
4. **Never skip, disable, or `.skip()` a test to get green.** If a test is wrong, say so
   and propose the change — don't delete the evidence.
5. **Secrets never enter the repo.** No keys in code, fixtures, commit messages, or logs.
   `scripts/preflight.sh` greps for common key shapes and fails on a hit.

## Repo shape

| Path | What lives there |
|---|---|
| `scripts/agent-route.mjs` | Chooses which model/harness runs a task |
| `scripts/preflight.sh` | The gate every agent must pass before pushing |
| `scripts/check-workflows.mjs` | Validates workflow scripts (run by preflight) |
| `scripts/check-links.mjs` | Validates doc links (run by preflight) |
| `.claude/workflows/` | Saved dynamic workflows (`/name` commands) |
| `docs/` | The quickstart chapters |
| `.mcp.json` | Shared tool surface for both harnesses |

## Definition of done

A task is done when all four hold:

- The change does what was asked, and nothing more.
- `./scripts/preflight.sh` exits 0.
- A test covers the behavior that changed (or you stated why one is not possible).
- The commit message says *why*, not just *what*.

## Escalation

Stop and ask a human when:

- Two valid readings of the task lead to materially different code.
- The fix requires a schema change, a new dependency, or touching auth.
- You are about to change more than ~10 files to satisfy a request that sounded small.

Reporting a blocker beats guessing. Guessing costs more to unwind than it saves.
