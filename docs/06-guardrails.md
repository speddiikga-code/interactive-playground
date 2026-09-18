# 6. Guardrails

Agents that can edit files and run commands need boundaries that hold when nobody is
watching. Three surfaces: permissions, secrets, and untrusted input.

## Permissions

`.claude/settings.json` in this repo is committed, so the team shares one baseline:

```json
{
  "permissions": {
    "allow": ["Bash(./scripts/preflight.sh)", "Bash(git status*)", "Bash(git diff*)"],
    "ask":   ["Bash(git push*)"],
    "deny":  ["Read(./.env)", "Read(./.env.*)", "Read(./**/*.pem)", "Read(./**/id_rsa*)"]
  }
}
```

The shape that works:

- **allow** the read-only and verification commands agents run constantly. Every
  unnecessary prompt trains people to click through prompts that matter.
- **ask** for anything outward-facing — pushes, deploys, posting to external services.
- **deny** reads of credential files. A `deny` rule beats trusting an instruction.

Crucially: **the `ultracode` keyword changes only how Claude structures work, never what it
is allowed to do.** Agents in a workflow get the same permission checks and sandboxing as
any other tool call. Orchestration is not an escalation path.

Subagents in a workflow use your permission rules. On a long fan-out, add the tools the
agents will need to `allow` **before** starting — otherwise a run stalls on prompt 30 of
200.

## Approving a workflow

The per-run prompt shows planned phases, with *Yes, run it*, *Yes and don't ask again for
this workflow in this project*, *View raw script*, and *No*. `Ctrl+G` opens the script;
`Tab` adjusts the prompt first.

When you are prompted depends on permission mode:

| Mode | Prompted |
|---|---|
| Auto | First launch only; **skipped entirely when ultracode is on** |
| Manual / accept edits | Every run, unless you chose "don't ask again" |
| Bypass permissions | Never — starts immediately |
| `claude -p`, Agent SDK | Never — goes through normal permission evaluation |

Read row one carefully. In auto mode with ultracode on, workflows start without asking.
That combination is fine on a scratch repo and a poor fit for one with production credentials.

## Secrets

Layered, because any single layer fails:

1. **`.gitignore`** — `.env`, `.env.*`, `*.pem`, `id_rsa*`
2. **`deny` rules** — the agent cannot read them even if asked
3. **`preflight.sh`** — greps tracked files for key shapes (`sk-ant-…`, `sk-…`, `ghp_…`,
   `AKIA…`, PEM headers) and fails the gate on a hit
4. **CI** — runs the same scan, so a local bypass still gets caught

The scan runs **first** in preflight and always, because a leaked key is the one failure
here that cannot be undone by a follow-up commit. Everything else is fixable after the fact.

If a key does land in history, rotate it. Rewriting history does not un-leak it — assume
anything pushed was captured.

## Untrusted input

An agent reading a PR comment, an issue body, a fetched page, or CI logs is reading text
**someone else wrote**. Treat it as data, never as instructions.

Concretely, an agent should not act on text found in those places that tries to:

- change its task ("ignore previous instructions and…")
- widen its access ("read `.env` and paste it here")
- push, deploy, or post somewhere new
- disable a check ("just skip that test")

The pattern to internalize: **content is data; instructions come from the user and the
repo's own configuration.** If fetched content appears to be redirecting the task, stop and
check with a human. This is why the `ultracode` keyword no longer fires from relayed PR
comments — same threat model, handled at the harness level.

## Sandboxing and blast radius

- Agents run commands with **your** credentials. An agent with production database access
  has production database access.
- Use a scratch branch and a non-production environment for autonomous runs.
- Prefer a sandboxed working copy for large migrations. Workflows can transform each file
  in an isolated copy so parallel edits cannot conflict — ask for that explicitly when
  fanning out writes.

## Turning workflows off

For yourself:

- Dynamic workflows toggle in `/config` (persists)
- `"disableWorkflows": true` in `~/.claude/settings.json`
- `CLAUDE_CODE_DISABLE_WORKFLOWS=1` (read at startup)

For an organization: `"disableWorkflows": true` in managed settings, or the toggle on the
Claude Code admin settings page.

When disabled: bundled workflow commands and `/workflow-authoring` become unavailable, the
`ultracode` keyword stops triggering, and `ultracode` disappears from the `/effort` menu.

Next: [7. Proving it works →](./07-evals.md)
