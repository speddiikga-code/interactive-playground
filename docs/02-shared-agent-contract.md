# 2. The shared agent contract

Layer 1 of the integration, and the highest-leverage file in the repo.

## Why one file

Claude Code reads `CLAUDE.md`. Codex reads `AGENTS.md`. The tempting move is to write both.
Don't — you now have two sets of rules that will drift, and drift is invisible until an
agent does something the *other* agent would not have.

Instead: put every behavioral rule in `AGENTS.md`, and make `CLAUDE.md` a pointer.

```markdown
# CLAUDE.md
Read [AGENTS.md](./AGENTS.md). It is the single source of truth, shared with Codex.
Do not duplicate rules here — a second copy is a second thing to forget to update.
```

Harness-specific mechanics (effort levels, workflow directories) belong in `CLAUDE.md`,
because they genuinely do not apply to Codex. The test: *would this rule change what good
work looks like?* If yes, it goes in `AGENTS.md`.

## What makes rules work

Agents follow rules that are **specific, checkable, and justified**. They drift from rules
that are vague, unverifiable, or arbitrary.

| Weak | Strong |
|---|---|
| "Write good tests" | "A fix needs a test that fails before it and passes after" |
| "Don't break things" | "Run `./scripts/preflight.sh`; a non-zero exit means do not push" |
| "Keep changes small" | "Changing more than ~10 files for a small-sounding request: stop and ask" |
| "Be careful with secrets" | "No keys in code, fixtures, commit messages, or logs" |

The pattern in the right column: a **concrete trigger** and an **observable outcome**.
"Good" is not observable. "Exit code 0" is.

## Make the rule executable

The strongest rule is one with a script behind it. `"Run preflight before pushing"` works
because `preflight.sh` exists, both agents can run it, and CI runs the identical file.

This is why layer 3 (verification) matters more than the prose: it converts an instruction
the agent *might* follow into a check that either passes or doesn't.

```
Rule in AGENTS.md  ──▶  scripts/preflight.sh  ──▶  .github/workflows/agent-ci.yml
   (intent)              (local enforcement)         (non-negotiable enforcement)
```

If a rule cannot be expressed as a check, ask whether it is really a rule or just a
preference.

## Structure that survives contact

The `AGENTS.md` in this repo has four sections, in this order:

1. **Non-negotiables** — the short list. If an agent reads nothing else, this.
2. **Repo shape** — a table of paths, so the agent doesn't have to guess where things go.
3. **Definition of done** — what "finished" means, stated as conditions.
4. **Escalation** — when to stop and ask rather than guess.

Section 4 is the one teams leave out, and the one that prevents the worst outcomes. An
agent with no escalation rule resolves ambiguity by guessing, confidently, in whichever
direction it happened to start. Naming the cases where guessing is not allowed —
schema changes, auth, new dependencies, surprising blast radius — costs four lines and
saves the expensive failures.

## Keep it short

A long contract is a diluted contract. Rules compete for attention, and the twentieth rule
weakens the first three. Ours is under 50 lines on purpose.

When you are tempted to add a rule, first check whether:

- An existing rule already covers it (tighten that one instead).
- It belongs in a check rather than in prose.
- It is actually a one-off correction for a single task, not a standing rule.

## Test the contract

Ask both agents to restate it, and compare:

```bash
claude "List the non-negotiables in AGENTS.md and what each one forbids."
codex  "List the non-negotiables in AGENTS.md and what each one forbids."
```

A material difference means the text is ambiguous. This is worth re-running whenever you
edit the contract — it is the cheapest eval you will ever write, and it catches the
failure mode that matters most: two agents reading the same sentence differently.

Next: [3. Workflows and ultracode →](./03-workflows.md)
