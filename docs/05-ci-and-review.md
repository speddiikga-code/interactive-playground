# 5. Agents in CI

## One definition of green

The rule that makes everything else work: **CI runs the same script the agents run.**

```
AGENTS.md: "run ./scripts/preflight.sh before pushing"
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
  agent, locally            .github/workflows/agent-ci.yml
```

One file, two callers. An agent cannot be "green locally, red in CI" because there is only
one definition of green. If you take one idea from this repo, take this one.

Keep it fast. A five-minute gate is a gate agents and humans both start skipping.

## Review with a workflow

Per-file review with adversarial verification is the highest-value workflow shape, because
it fixes automated review's worst failure: **confident, unverified findings**.

[`.claude/workflows/cross-model-review.js`](../.claude/workflows/cross-model-review.js)
runs four phases:

1. **Discover** — list changed files (schema-validated output)
2. **Review** — one agent per file, correctness bugs only
3. **Verify** — a *different* agent tries to **refute** each finding
4. **Rank** — merge duplicates, order by severity

Phase 3 is the one that matters. A fresh agent that did not produce the finding has no
commitment to it, and is asked to refute rather than confirm — so it must trace a concrete
input that reaches the bad state. Findings that survive are worth a human's time; the rest
never reach the PR.

```
Run /cross-model-review on src/auth and src/routes
```

## Cross-vendor review

For a risky diff, review it with both harnesses and compare:

```bash
claude "Review the diff on this branch for correctness bugs only. Cite file:line."  > /tmp/claude-review.md
codex  "Review the diff on this branch for correctness bugs only. Cite file:line."  > /tmp/codex-review.md
diff -u /tmp/claude-review.md /tmp/codex-review.md
```

Read the **disagreements** first. Findings both raise are usually real. Findings only one
raises are either a genuine blind spot in the other, or a false positive — and either way
that is where your attention is best spent. Agreement is cheap; disagreement is
information.

Worth doing on auth, payments, migrations, and anything touching user data. Not worth the
tokens on a typo fix.

## Rules for an agent that fixes CI

An agent with push access and a red build needs boundaries, or it will thrash:

1. **Reproduce first.** A fix with no failing case that it turns green is a guess.
2. **"Flake" is not a root cause.** Re-run only to confirm a specific suspicion — a check
   also red on the base branch, or a job that died before any test body ran (checkout,
   install, runner loss). At most once. A second failure is real.
3. **Never skip, disable, or quarantine a test to get green.** This is the rule agents
   break most under pressure, and it converts a visible failure into an invisible one.
4. **Never push an empty commit** or close/reopen a PR to kick CI.
5. **One validated push beats three speculative ones.** Reproduce the failure, show the
   same check passing, re-read the diff adversarially, *then* push.
6. **Keep the fix minimal.** Fix the failure; don't widen the PR while you're in there.
7. **Stand down out loud.** If the failure genuinely isn't this change's — red on the base
   branch too — say so in one comment naming the check and why. Silence looks identical to
   not having looked.

## Don't let CI trigger orchestration

`ultracode` deliberately does not fire from `-p`, scheduled tasks, webhooks, or PR
comments. Leave it that way. A keyword that triggered from a PR comment would let anyone
who can comment on your repo spawn dozens of agents on your account.

If you *do* want a workflow in a non-interactive run, approve it explicitly rather than
loosening the boundary:

- **Permission rule**: `Workflow` allows any workflow; `Workflow(<name>)` allows one by name
- **Auto mode**: the classifier reviews the call and may approve it
- **A `PreToolUse` hook** returning `allow`
- **Bypass permissions mode** — narrow scopes only

Scope it to the named workflow you actually want. `Workflow` unqualified in CI is a large
blank cheque.

Next: [6. Guardrails →](./06-guardrails.md)
