# 3. Workflows and ultracode

## When a workflow pays

A workflow earns its cost when **the same step repeats across many items**, or when the
task is larger than one agent can hold in context. Shapes that qualify:

- Audit every file for the same class of issue
- Migrate many files, each in isolation
- Review every changed file, then merge findings into one ranked list
- Research a question across many sources and cross-check them
- Loop a checker-and-fix cycle until it passes or stops making progress
- Draft a plan from several independent angles and weigh them

Shapes that do **not**: a single bug fix, a feature in one module, anything where you
already know the steps. Orchestration overhead is real; a workflow for a one-file change
costs more and returns less than a normal turn.

## Three ways in

```bash
ultracode: <task>            # one task, this once
/effort ultracode            # this session, every substantive task
claude --effort ultracode    # start the session that way
```

You can also just ask — "use a workflow to…" is treated as the same opt-in.

### Where the keyword works — and doesn't

The keyword is an opt-in **only in a prompt you type yourself**: the interactive prompt, an
IDE extension panel, a Remote Control client, or an Agent SDK app that stamps input
`origin` as `{ kind: "human" }`.

It does **not** trigger from:

- a prompt passed with `-p`
- an Agent SDK prompt not stamped as human input
- a scheduled task
- a webhook payload or PR comment relayed into the conversation

This is a security property. Before v2.1.210 it fired from all of those — meaning a PR
comment containing the word could kick off a run that spawned dozens of agents on your
account. Treat it as a deliberate boundary, not a limitation.

## What the script looks like

```javascript
export const meta = {
  name: 'audit-routes',
  description: 'Audit every route handler for missing auth checks',
}

const found = await agent('List every .ts file under src/routes/.', {
  schema: { type: 'object', required: ['files'],
            properties: { files: { type: 'array', items: { type: 'string' } } } },
})

const audits = await pipeline(found.files, file =>
  agent(`Audit ${file} for missing authentication checks.`, { label: file }),
)

return audits.filter(Boolean)
```

Plain JavaScript with top-level `await`. The primitives:

| Call | What it does |
|---|---|
| `agent(prompt, opts)` | Spawns one subagent |
| `pipeline(list, fn)` | Runs one agent per item |
| `parallel(tasks)` | Runs a set of tasks at once, waits for all |
| `phase(title)` | Groups following agents under a heading in the progress view |
| `log(msg)` | Shows a message above the phases |
| `args` | Whatever the caller passed in |

`agent()` resolves to **`null`** if you stop it or it hits an unrecoverable API error, and
in auto mode the classifier can block it before it starts. `pipeline()` keeps those nulls
in the results array — which is why the example ends in `.filter(Boolean)`. Forgetting
this is the most common bug in a hand-edited workflow.

Pass a `schema` and the subagent returns validated JSON instead of prose. Claude Code
checks the schema before starting the agent and fails fast on a provable contradiction
(for example a `required` key that `additionalProperties: false` excludes). If output
still fails validation after five attempts the call fails; tune with
`MAX_STRUCTURED_OUTPUT_RETRIES`.

## The runtime's hard edges

These are not style preferences — violate them and the run fails:

| Constraint | Consequence |
|---|---|
| No `import()` | The script fails **before the run starts** |
| No filesystem or shell from the script | Agents do that work; the script only coordinates |
| `Date.now()`, `Math.random()`, `new Date()` **throw** | So a resumed run replays identically — pass time in via `args` |
| Up to 4,096 items per `parallel()` / `pipeline()` | A longer list is rejected with an error |
| 1,000 agents per run | Prevents runaway loops |
| 16 concurrent agents by default | Fewer on limited CPUs; tune with `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS` (1–256, v2.1.269+) |
| No mid-run user input | For sign-off between stages, run each stage as its own workflow |

`scripts/check-workflows.mjs` in this repo checks all of these statically.

> **`node --check` cannot do this job.** A workflow mixes ESM `export` with top-level
> `await` *and* top-level `return` — valid in the workflow runtime, but in neither of
> Node's module modes. Node's detection tries CJS, fails, tries ESM, fails, and exits 0.
> A file with a genuine syntax error passes. Verified on Node v22.22.2. Our checker strips
> the `meta` export and compiles the body as an async function body instead.

## Saving and reuse

Run `/workflows`, select the run, press `s`. Two locations, toggled with Tab:

- `.claude/workflows/` — committed, shared with everyone who clones
- `~/.claude/workflows/` — personal, every project, only you

It then runs as `/<name>`. Project beats personal on a name collision. In a monorepo,
saving writes to the closest existing `.claude/workflows/` between cwd and repo root, and
workflows load from every such directory along that path.

Ship one across teams by putting it in a plugin's `workflows/` directory — it becomes
`/<plugin>:<name>`.

### Passing input

```
Run /triage-issues on issues 1024, 1025, and 1030
```

Claude passes structured data, so `args` is a real array — no parsing needed. It is
`undefined` when omitted.

### Editing a saved script

Run `/workflow-authoring` first (v2.1.248+) to load the scripting reference, then edit the
`.js` or ask Claude to. Keep `export const meta` as the **first statement** and a plain
object literal — a variable, call, or spread in it drops the command from autocomplete.
After editing, `/reload-skills` then run it again.

## Resuming

Runs are resumable within the session. On relaunch Claude Code replays in the order agents
started:

- **Completed** → returns its saved result
- **Still running when stopped** → starts over
- **Failed** → runs again, **and so does every agent that started after it**

That last rule bites. If a script starts A, B, C, D and B fails, relaunching returns A
from cache and re-runs B, C, **and D**. Order expensive stages after cheap ones where you
can.

Backgrounding the session carries a run over. Exiting with agent view on offers
*Move to background and exit*. Choosing *Exit and stop tasks* stops the run, though saved
results persist under `~/.claude/projects/` and a `claude --resume` session can replay
them. In a cloud session results survive VM reclamation.

## Fan-out caching

Agents in one run share each other's prompt cache when model, effort, agent type, tools,
output schema, and working directory match. Claude Code holds all but the first agent
until the first response begins — capped by
`CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS` (default 5000) — so the rest read the cached
prefix instead of each processing it cold.

**Workflow agents fall outside the main conversation's cache TTL bucket**: 5 minutes by
default, even on a subscription. On a wide fan-out set `subagentPromptCacheTtl: "1h"`
(as `.claude/settings.json` here does). 1-hour writes bill higher, and above roughly a
dozen agents that is comfortably the cheaper side.

Next: [4. Routing and cost control →](./04-routing-and-cost.md)
