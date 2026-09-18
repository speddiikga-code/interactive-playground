# 4. Routing and cost control

The single most expensive habit in agentic coding is running everything at maximum effort.
This chapter is about spending deliberately.

## The models

**Anthropic** (first-party API rates, per 1M tokens):

| Model | ID | Context | Input | Output |
|---|---|---|---|---|
| Claude Fable 5.1 | `claude-fable-5-1` | 1M | $10.00 | $50.00 |
| Claude Opus 5 | `claude-opus-5` | 1M | $5.00 | $25.00 |
| Claude Sonnet 5 | `claude-sonnet-5` | 1M | $2.00 | $10.00 |
| Claude Haiku 4.5 | `claude-haiku-4-5` | 200K | $1.00 | $5.00 |

**OpenAI** — `gpt-6-astra` (released 3 Sep 2026): 1,050,000-token context (922K max input,
128K max output), reportedly $10 input / $50 output per 1M, cached input $1/M, cache
writes $12.50/M. The GPT‑5.6 family — Sol (flagship), Terra (balanced), Luna
(cost-efficient) — sits below it.

> Confirm OpenAI numbers against their own pricing page before you budget on them; the
> figures above come from a third-party reference, not OpenAI's site.

Model IDs are complete as written. Do not append date suffixes.

## The long-context premium

The trap that surprises people: **a large context window is not free just because your
input fits in it.**

On `gpt-6-astra`, past **272K tokens** you pay **2× input and 1.5× output**. A 500K-token
context is not "within limits, therefore fine" — it is roughly double rate on the largest
part of your bill. Fast mode doubles all applicable rates again; batch and flex halve them.

The practical consequence: **context hygiene is a cost lever, not just a quality one.**
Trimming a 300K context to 250K can cut the input bill by more than half.

## Effort

Both vendors expose reasoning effort, and it is the first quality-trading lever after the
free wins.

| Claude Code | Codex |
|---|---|
| `low`, `medium`, `high`, `xhigh`, `max` | `low`, `medium`, `high`, `xhigh` (+ `max` on Responses API) |
| `/effort <level>` | `reasoning_effort` in `~/.codex/config.toml` |

`xhigh` is the sweet spot for most coding and agentic work on current frontier models.
`high` balances quality against token efficiency. Reserve `max` for cases where
correctness matters more than cost — and only after measuring that there is headroom at
the level below.

Two things that are *not* valid: `reasoning_effort = "none"` on `gpt-6-astra` (rejected at
the API layer), and `temperature` / `top_p` on current frontier reasoning models from
either vendor (rejected — remove them from old scripts).

## Route by task shape

```bash
node scripts/agent-route.mjs "migrate every component under src/ to TypeScript"
```

The table it encodes:

| Task shape | Route | Effort |
|---|---|---|
| Typo, rename, bump, formatting | Either | `medium` |
| Ordinary feature work | Either | `high` |
| Long-horizon, computer use, E2E | **Codex** + `gpt-6-astra` | `high` |
| Fan-out: audits, migrations, sweeps | **Claude Code** `ultracode` | `xhigh` |
| Cross-checked review or research | **Claude Code** workflows | `xhigh` |
| High blast radius: auth, payments, schema | **Both**, then diff | `high` |

Two notes on the extremes. Trivial tasks routed to frontier reasoning are pure waste —
quality does not improve, cost does. And the last row is the quiet advantage of paying for
both: two independent harnesses with different failure modes agreeing is much stronger
evidence than one harness being confident. **Where they disagree is exactly where to look.**

## Free wins first

Take these before touching effort or model — they cost nothing in quality:

**1. Prompt caching.** Cache hits are roughly an order of magnitude cheaper than fresh
input. Caching is a *prefix* match, so any byte change invalidates everything after it.
Keep stable content first (system prompt, tool list), volatile content (timestamps,
per-request IDs) last. Verify with `usage.cache_read_input_tokens` — if it is zero across
repeated requests, something is silently invalidating: a `datetime.now()` in the system
prompt, unsorted JSON, a varying tool set.

**2. Workflow cache TTL.** Workflow agents get **5 minutes** by default, separate from the
main session. On a wide fan-out you re-pay for the same prefix over and over. Set
`subagentPromptCacheTtl: "1h"`.

**3. Context hygiene.** See the long-context premium above.

**4. Batch where latency doesn't matter.** Roughly 50% off on both sides.

## Keeping workflow spend bounded

A workflow spawns many agents; one run can cost meaningfully more than doing the same task
in conversation. Controls, in order of usefulness:

- **Run a slice first.** One directory, not the whole repo. This is the best predictor of
  full-run cost you will get.
- **Size guideline.** `/config workflowSizeGuideline=small` or the settings key:

  | Value | Agents Claude aims for |
  |---|---|
  | `small` | fewer than 5 |
  | `medium` | fewer than 10 (this repo's default) |
  | `large` | fewer than 50 |
  | `unrestricted` | sized to the task |

  Advice to Claude, not a cap — a prompt calling for a different scale overrides it.
- **Watch `/workflows`.** Per-agent token usage, live. Stop the run there; completed work
  is usually kept.
- **The `Large workflow` warning.** Fires above 25 scheduled agents or 1.5M projected
  tokens. It is advisory and does not pause anything. **Sessions with ultracode on don't
  show it at all** — turning ultracode on opts you into large runs.
- **Model per stage.** Ask for a smaller model on stages that don't need the strongest
  one. Workflow agents otherwise inherit the session model.

## A budgeting heuristic

Judge **cost per completed task**, not per request. A cheaper request that needs three
more rounds to get it right is not cheaper.

Before building a multi-model cost cascade, measure the simpler thing first: the strongest
model at *lower effort*. On current models that often matches a previous generation at
high effort — and one model means one cache namespace. A cascade forfeits cache reuse
across its models, which frequently erases the saving it was built for.

Next: [5. Agents in CI →](./05-ci-and-review.md)
