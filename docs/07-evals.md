# 7. Proving it works

Adopting agents without measuring them means you cannot tell a real improvement from a
good week. This chapter is deliberately modest: the goal is a signal you trust, not a
research program.

## Measure outcomes, not activity

Tempting metrics that mislead:

| Misleading | Why |
|---|---|
| Lines of code written | Agents write a lot of it. Volume is not value. |
| Tasks completed | Says nothing about whether they were completed *correctly*. |
| Tokens consumed | A cost input, not an outcome. |
| Time to first diff | Rewards speed into the wrong approach. |

What actually tells you something:

| Useful | What it catches |
|---|---|
| **Preflight pass rate on first attempt** | Whether agents produce working code unaided |
| **Review rounds before merge** | Whether output is close to mergeable |
| **Reverts / follow-up fix rate** | Whether "done" work stayed done |
| **Cost per merged PR** | The number that matters for the bill |
| **Escalation rate** | Whether the contract's ambiguity rules fire when they should |

The last one is underrated: an agent that *never* escalates on a codebase with real
ambiguity is guessing and hiding it.

## The cheapest useful eval

Before anything formal, run the contract test from
[chapter 2](./02-shared-agent-contract.md#test-the-contract):

```bash
claude "List the non-negotiables in AGENTS.md and what each one forbids."
codex  "List the non-negotiables in AGENTS.md and what each one forbids."
```

A material difference means your contract is ambiguous. Costs two prompts, catches the
failure mode with the widest blast radius.

## A real eval set

Ten to twenty tasks from your **actual backlog** — not synthetic puzzles. For each, record:

```
task:      what was asked
context:   which files it touches
success:   an objectively checkable condition
```

Success must be checkable without judgment. "Handles the empty-input case correctly" is
checkable. "Code is clean" is not.

Then run the set and record, per task: preflight pass/fail on first attempt, rounds to
green, tokens, and whether a human had to intervene.

## Change one thing at a time

When you tune, change a single variable and re-run the same set:

- effort level (`high` → `xhigh`)
- harness (Claude Code → Codex)
- ultracode on or off for fan-out tasks
- `AGENTS.md` wording

Change two and you learn nothing about either. Keep a small log:

```
| date | change | pass@1 | rounds | tokens | note |
|------|--------|--------|--------|--------|------|
```

## Two traps

**Judging cost per request instead of per completed task.** A cheaper request that needs
three more rounds is not cheaper. Always divide by *completed*, not *attempted*.

**Testing on tasks you have already tuned against.** Hold a few tasks back and never tune
on them. Those are the ones that tell you whether you improved the system or just fitted
it to your examples.

## When to reach for ultracode — measured

Run the same fan-out task both ways and compare on your own repo:

```bash
# conversational
claude "review every file changed on this branch for correctness bugs"

# orchestrated
# → ultracode: review every file changed on this branch for correctness bugs,
#   and adversarially verify each finding before reporting it
```

Compare real findings (not raw count), false-positive rate, wall-clock time, and tokens.

Expect the workflow to cost more and find more — the question is whether the extra findings
are worth the multiple **on your codebase**. That answer varies enough by repo that a
general recommendation is worthless. Measure it once; you will reuse the answer for months.

---

Back to the [README](../README.md).
