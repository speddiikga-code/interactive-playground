# 1. Day-one setup

Target: both agents running against the same contract in about 30 minutes.

## Install

```bash
npm install -g @anthropic-ai/claude-code    # v2.1.203+ for ultracode
npm install -g @openai/codex                # v0.153.1+ for gpt-6-astra

claude --version && codex --version
```

Version floors matter here:

| Need | Minimum |
|---|---|
| `ultracode` effort level | Claude Code v2.1.203 |
| `workflowSizeGuideline` setting | v2.1.219 |
| Keyword restricted to human input | v2.1.210 |
| `/workflow-authoring` skill | v2.1.248 |
| `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS` | v2.1.269 |
| `gpt-6-astra` via API | Codex CLI v0.153.1 |

## Authenticate

```bash
claude          # then /login — subscription or API key
codex login     # or: export OPENAI_API_KEY=...
```

Dynamic workflows are available on all paid Claude plans, via the Anthropic API, and on
Bedrock, Google Cloud's Agent Platform, and Microsoft Foundry. **On Pro you must turn them
on** in the Dynamic workflows row of `/config`.

For `gpt-6-astra`, enterprise accounts must enable the model in the OpenAI admin console
first; it also rolled out to a limited set of organizations initially.

## Configure

Three files, copied from this repo:

```bash
cp AGENTS.md CLAUDE.md .mcp.json /path/to/your/repo/
cp -r scripts .claude /path/to/your/repo/
cp codex-config.example.toml ~/.codex/config.toml
```

`AGENTS.md` is the one you actually edit. The rest is plumbing.

### Claude Code side

`.claude/settings.json` in this repo sets:

```json
{
  "workflowSizeGuideline": "medium",
  "subagentPromptCacheTtl": "1h"
}
```

Note what it deliberately **omits**: `"ultracode": true`. That setting makes every session
start in ultracode, which means every substantive task becomes a multi-agent workflow.
Opt in per task instead.

### Codex side

```toml
model = "gpt-6-astra"
model_provider = "openai"
reasoning_effort = "high"     # low | medium | high | xhigh  ("max" on Responses API)
```

Two traps:

- `reasoning_effort = "none"` is **rejected at the API layer**. It is not a valid value.
- Remove `temperature` and `top_p` from any existing scripts. Current frontier reasoning
  models on **both** vendors reject them.

`gpt-6-astra` is also unavailable on Realtime, Assistants, fine-tuning, and embeddings
endpoints — if you have code on those paths it needs a different model.

## Verify

Four checks. All four should pass before you trust the setup.

```bash
# 1. The gate runs and passes
./scripts/preflight.sh

# 2. Workflow scripts parse and satisfy the runtime contract
node scripts/check-workflows.mjs

# 3. The router responds sensibly
node scripts/agent-route.mjs "audit every endpoint for missing auth"

# 4. Both agents can see the contract
claude "Summarize the non-negotiables in AGENTS.md in one line each."
codex  "Summarize the non-negotiables in AGENTS.md in one line each."
```

Check 4 is the real test of the integration. If the two summaries differ materially, your
`AGENTS.md` is ambiguous — fix it now, while the cost of ambiguity is one confused answer
rather than a bad PR.

## First workflow

```
ultracode: audit every file under scripts/ for error handling that swallows failures
```

Claude Code highlights the keyword and shows a plan to approve. `Ctrl+G` opens the script
in your editor; `Tab` lets you adjust the prompt first. Watch it with `/workflows`.

Pressed the keyword by accident? `Option+W` (macOS) or `Alt+W` (Windows/Linux) dismisses
the highlight, as does backspace with the cursor right after it.

Next: [2. The shared agent contract →](./02-shared-agent-contract.md)
