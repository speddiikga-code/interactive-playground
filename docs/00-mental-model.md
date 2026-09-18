# 0. Mental model

## The ladder

Almost every costly mistake in agentic coding is using a rung higher than the task needs.
Work up this ladder, never down:

| Rung | What it is | Use when |
|---|---|---|
| **1. Autocomplete** | Inline suggestion | You know exactly what to type |
| **2. Single turn** | One prompt, one answer | The task fits in one reply |
| **3. Agent loop** | Model plans, calls tools, iterates | Multi-step, needs to read and run things |
| **4. Orchestration** | A *script* spawns many agents | The same step repeats across many items |

Rungs 1–3 are what both Claude Code and Codex do out of the box. **Rung 4 is what
`ultracode` adds, and only Claude Code has it.**

## What `ultracode` actually is

Two distinct things share the name:

**A keyword.** Put `ultracode` in a prompt you type, and Claude writes a *workflow script*
for that one task instead of working through it turn by turn. Saying "use a workflow" in
your own words does the same thing.

**An effort level.** `/effort ultracode` combines `xhigh` reasoning with automatic
orchestration: Claude decides, for every substantive task in the session, whether to write
a workflow. One request can become several workflows in a row — one to understand the
code, one to change it, one to verify.

It takes precedence over `effortLevel` and `modelSettings`.

## Why orchestration is different in kind

This is the part worth internalizing, because it explains when ultracode is worth the money.

In a normal agent loop **Claude is the orchestrator**. It decides turn by turn what to do
next, and every intermediate result lands in its context window. That caps you at a
handful of parallel sub-tasks before context fills with material you don't need.

A workflow **moves the plan into code**. A JavaScript script holds the loop, the
branching, and the intermediate results. Claude's context receives only the final answer.

```
Agent loop                      Workflow
──────────                      ────────
Claude decides next step        The script decides
Results → context window        Results → script variables
~a few parallel tasks           dozens to hundreds of agents
Interruption restarts the turn  Resumable, replays completed agents
```

That is why a workflow can coordinate 100 agents and a conversation cannot: not more
compute, but *the plan living somewhere other than the context window*.

The second, less obvious benefit: because the plan is code, it can encode a **quality
pattern**. Independent agents can adversarially review each other's findings before
anything is reported, or draft a plan from several angles and weigh them. That is a
structurally more trustworthy result than one confident pass — see
[`.claude/workflows/cross-model-review.js`](../.claude/workflows/cross-model-review.js).

## Where the four primitives differ

Claude Code has four ways to run multi-step work. They are easy to confuse:

| | Subagents | Skills | Agent teams | Workflows |
|---|---|---|---|---|
| What it is | A worker Claude spawns | Instructions Claude follows | A lead supervising peers | A script the runtime executes |
| Who decides next | Claude, turn by turn | Claude | The lead agent | **The script** |
| Results live in | Context window | Context window | A shared task list | **Script variables** |
| What's repeatable | The worker definition | The instructions | The team definition | **The orchestration itself** |
| Scale | A few per turn | A few per turn | A handful of peers | **Dozens to hundreds** |

## The naming, corrected

Worth stating plainly because the terms circulate loosely:

- **`ultracode`** — real, Claude Code–specific, documented above.
- **"GPT Ultra"** — not a product. No OpenAI model ships under that name. The current
  frontier coding models are **GPT‑6 Astra** (`gpt-6-astra`, released 3 Sep 2026) and the
  **GPT‑5.6** family — Sol (flagship), Terra (balanced), Luna (cost-efficient).
- **"OpenAI ultracode"** — does not exist. Codex has no workflow-orchestration mode. Its
  closest knob is `reasoning_effort = "xhigh"`, which raises reasoning depth **within a
  single agent loop**. That is rung 3 turned up, not rung 4.

So "run ultracode on both vendors" is not achievable as stated, and a wrapper that
pretends otherwise gives you the weaker of the two. What *is* achievable is the four-layer
architecture in the [README](../README.md#the-thesis): unify instructions, tools,
verification, and routing — and let each harness be itself.

Next: [1. Day-one setup →](./01-day-one-setup.md)
