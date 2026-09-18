# Ultracode Agents: A Startup Quickstart

**Ship with Claude Code and OpenAI Codex side by side, under one agent contract.**

This is an opinionated starting point for a small team that wants agentic coding to be a
dependable part of how software gets built — not a demo that impresses once and then
quietly costs you a fortune.

It is deliberately short on hype and specific about the thing most guides skip: **you
cannot merge the two harnesses, so unify the four layers underneath them instead.**

---

## First, the naming

Three terms get used loosely. Getting them straight saves real money.

| Term | What it actually is |
|---|---|
| **`ultracode`** | A **Claude Code** feature. A keyword *and* an effort level that combines `xhigh` reasoning with automatic multi-agent **workflow** orchestration. Real, documented, specific. |
| **"GPT Ultra"** | **Not a product.** No OpenAI model ships under this name. The current frontier coding models are **GPT‑6 Astra** (`gpt-6-astra`) and the **GPT‑5.6** family (Sol / Terra / Luna). |
| **"OpenAI ultracode"** | **Does not exist.** Codex has no workflow-orchestration mode. Its nearest equivalent is a high `reasoning_effort` setting — which is *not* the same thing. |

So "integrating ultracode across both vendors" cannot mean one shared ultracode mode.
What it *can* mean — and what this repo implements — is the architecture in the next
section. See [docs/00-mental-model.md](./docs/00-mental-model.md) for the full story.

---

## The thesis

Claude Code and Codex are **different harnesses**: different loop, different tool names,
different permission model, different context strategy. Attempts to abstract over them
produce a lowest-common-denominator wrapper that is worse than either.

Don't abstract the harness. **Unify the four layers around it:**

```
            ┌───────────────────────────────────────────────┐
            │  1. INSTRUCTIONS   AGENTS.md  (one file)       │  ← both read it
            ├───────────────────────────────────────────────┤
            │  2. TOOLS          .mcp.json  (one surface)    │  ← both speak MCP
            ├───────────────────────────────────────────────┤
            │  3. VERIFICATION   preflight.sh (one gate)     │  ← neither may skip
            ├───────────────────────────────────────────────┤
            │  4. ROUTING        agent-route.mjs             │  ← picks the harness
            └───────────────────────────────────────────────┘
                        ↓                        ↓
              ┌──────────────────┐     ┌──────────────────┐
              │   Claude Code    │     │   OpenAI Codex   │
              │  workflows,      │     │  reasoning_effort│
              │  ultracode       │     │  xhigh           │
              └──────────────────┘     └──────────────────┘
```

Each layer is one file. That is the whole integration. Swap a harness out and three of the
four layers are untouched.

---

## 30-minute setup

### 1. Install both CLIs (5 min)

```bash
npm install -g @anthropic-ai/claude-code    # needs v2.1.203+ for ultracode
npm install -g @openai/codex                # needs v0.153.1+ for gpt-6-astra

claude --version && codex --version
```

### 2. Authenticate (3 min)

```bash
claude            # /login — subscription or API key
codex login       # or: export OPENAI_API_KEY=...
```

### 3. Drop in the contract (2 min)

Copy `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, and `scripts/` into your repo. Edit
`AGENTS.md` — it is the file that makes both agents behave. Everything else is plumbing.

### 4. Make the gate real (10 min)

`scripts/preflight.sh` is the highest-leverage file here. Point it at your actual lint,
typecheck, and test commands. Both agents are instructed to run it before pushing, and CI
runs the identical script — so an agent cannot be "green locally, red in CI."

```bash
./scripts/preflight.sh
```

### 5. First real task (10 min)

Give the *same* task to both and compare. This is how you calibrate routing:

```bash
claude "add input validation to the config loader, with tests"
codex  "add input validation to the config loader, with tests"
```

Then try a task that genuinely needs fan-out:

```
ultracode: audit every route handler under src/ for missing auth checks,
and adversarially verify each finding before reporting it
```

---

## When to use what

The single most expensive mistake is running everything at maximum effort. Route by task
shape, not by vibe:

| Task shape | Route to | Why |
|---|---|---|
| Rename, small fix, obvious refactor | Either, `medium` effort | Frontier reasoning is wasted here |
| Feature in a familiar codebase | Either, `high` effort | The default working mode |
| Long-horizon agentic work, computer use | **Codex** + `gpt-6-astra` | Built for it; 1.05M context |
| Fan-out across many files, audits, migrations | **Claude Code** `ultracode` | Only harness with real workflow orchestration |
| Cross-checked research / adversarial review | **Claude Code** workflows | Agents can review each other before reporting |
| You need a second opinion on a risky diff | **Both**, then diff the reviews | Different failure modes; disagreement is signal |

That last row is the quiet superpower of running both. Two independent harnesses that
agree are far stronger evidence than one harness that is confident.
See [docs/04-routing-and-cost.md](./docs/04-routing-and-cost.md).

```bash
node scripts/agent-route.mjs "migrate every component under src/ to TypeScript"
# → claude (ultracode): fan-out shape, 40+ files, workflow orchestration wins
```

---

## What `ultracode` actually does

`ultracode` moves the plan **out of the context window and into a script**.

Normally Claude decides turn by turn what to do next, and every intermediate result lands
in its context. A workflow is a JavaScript file that holds the loop, the branching, and
the intermediate results itself — so the context holds only the final answer. That is what
lets one run coordinate *hundreds* of agents instead of a handful.

```javascript
export const meta = { name: 'audit-routes', description: 'Audit routes for auth checks' }

const found = await agent('List every .ts file under src/routes/.', {
  schema: { type: 'object', required: ['files'],
            properties: { files: { type: 'array', items: { type: 'string' } } } },
})

const audits = await pipeline(found.files, file =>
  agent(`Audit ${file} for missing authentication checks.`, { label: file }),
)

return audits.filter(Boolean)
```

Three ways in, in increasing order of commitment:

```bash
ultracode: <task>              # one task, as a workflow
/effort ultracode              # this session — every substantive task
claude --effort ultracode      # start the session that way
```

**Cost warning, stated plainly:** an ultracode session plans a workflow for *every*
substantive task. A single run can spawn dozens of agents. Runs are capped (1,000 agents
per run, 16 concurrent by default), but within those caps you can spend a lot, fast. Start
with `workflowSizeGuideline=small` and one directory, not the whole repo.

Full detail: [docs/03-workflows.md](./docs/03-workflows.md).

---

## Repo contents

| File | Why it exists |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | The contract both agents obey. Start here. |
| [`CLAUDE.md`](./CLAUDE.md) | Pointer to `AGENTS.md` + Claude-specific notes |
| [`scripts/preflight.sh`](./scripts/preflight.sh) | The one gate. Agents and CI run the same script. |
| [`scripts/agent-route.mjs`](./scripts/agent-route.mjs) | Task shape → harness + effort recommendation |
| [`scripts/check-workflows.mjs`](./scripts/check-workflows.mjs) | Syntax + runtime-contract check for workflow scripts |
| [`scripts/check-links.mjs`](./scripts/check-links.mjs) | Catches dead relative links in the docs |
| [`.claude/workflows/cross-model-review.js`](./.claude/workflows/cross-model-review.js) | Working workflow: fan-out review with adversarial verification |
| [`.mcp.json`](./.mcp.json) | One tool surface for both harnesses |
| [`.github/workflows/agent-ci.yml`](./.github/workflows/agent-ci.yml) | CI running the identical gate |

## The chapters

0. [Mental model](./docs/00-mental-model.md) — the four-tier ladder, and what ultracode really is
1. [Day-one setup](./docs/01-day-one-setup.md) — both CLIs, auth, config, verification
2. [The shared agent contract](./docs/02-shared-agent-contract.md) — writing an `AGENTS.md` that works
3. [Workflows and ultracode](./docs/03-workflows.md) — orchestration, saving, reuse, limits
4. [Routing and cost control](./docs/04-routing-and-cost.md) — models, pricing, caching, the cost traps
5. [Agents in CI](./docs/05-ci-and-review.md) — review, autofix, and the rules that keep it sane
6. [Guardrails](./docs/06-guardrails.md) — permissions, sandboxing, secrets, prompt injection
7. [Proving it works](./docs/07-evals.md) — measuring whether agents actually help

---

## Five things that will bite you

1. **The `ultracode` keyword only fires from human-typed input.** Not `claude -p`, not a
   scheduled task, not a webhook or PR comment (since v2.1.210). This is a security
   property, not a bug — otherwise a PR comment could make your CI spend $400.
2. **Workflow scripts are sandboxed JavaScript.** No `import()`, no filesystem, no shell,
   and `Date.now()` / `Math.random()` **throw** — so a resumed run replays identically.
   Pass timestamps in through `args`.
3. **Long context costs a premium.** On `gpt-6-astra`, past 272K tokens you pay 2× input
   and 1.5× output. A 500K-token context is not "free because it fits."
4. **Workflow agents get a 5-minute cache TTL**, separate from your main session. On a big
   fan-out set `subagentPromptCacheTtl: "1h"` or you will pay to re-process the same
   prefix over and over.
5. **`temperature` and `top_p` are rejected** by current frontier reasoning models on both
   sides. Old scripts carrying them will 400.

---

## License

MIT — see [LICENSE](./LICENSE). Take it, strip what you don't need, ship.
