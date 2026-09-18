# CLAUDE.md

Read **[AGENTS.md](./AGENTS.md)**. It is the single source of truth for agent behavior in
this repo, shared with OpenAI Codex. Do not duplicate rules here — a second copy is a
second thing to forget to update.

## Claude Code specifics

These apply on top of the shared contract.

- **Effort.** Routine work runs at `/effort high`. Reach for `/effort ultracode` only for
  the task shapes in [docs/03-workflows.md](./docs/03-workflows.md#when-a-workflow-pays);
  it runs every substantive task as a multi-agent workflow and costs accordingly.
- **Workflows.** Saved workflows live in `.claude/workflows/`. Before editing one, run
  `/workflow-authoring` to load the scripting reference.
- **Size guideline.** This repo targets `medium` (fewer than 10 agents). Override per-task
  in the prompt when a job genuinely needs a wider fan-out.
- **Before pushing**, run `./scripts/preflight.sh`. It is the same gate CI runs.
