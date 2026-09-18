#!/usr/bin/env bash
#
# preflight.sh — the one gate.
#
# Both Claude Code and Codex are instructed (in AGENTS.md) to run this and get a
# clean exit before pushing. CI runs this identical script. That symmetry is the
# point: an agent cannot be "green locally, red in CI."
#
# Adapt the STEPS below to your project. Keep it fast — a gate that takes ten
# minutes is a gate agents will be tempted to skip.

set -uo pipefail

FAILED=0
STEP_NUM=0

bold()  { printf '\033[1m%s\033[0m\n' "$1"; }
pass()  { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail()  { printf '  \033[31m✗\033[0m %s\n' "$1"; FAILED=1; }
skip()  { printf '  \033[90m–\033[0m %s (not configured)\n' "$1"; }

# run <label> <command...>
# Runs a step, captures output, prints it only on failure.
run() {
  local label="$1"; shift
  STEP_NUM=$((STEP_NUM + 1))
  local out
  if out=$("$@" 2>&1); then
    pass "$label"
  else
    fail "$label"
    printf '%s\n' "$out" | sed 's/^/      /'
  fi
}

# has_script <name> — true if package.json defines that npm script
has_script() {
  [ -f package.json ] && node -e "
    const s = (require('./package.json').scripts) || {};
    process.exit(s['$1'] ? 0 : 1);
  " 2>/dev/null
}

bold "preflight"

# ---------------------------------------------------------------------------
# 1. Secrets. Runs first and always — a leaked key is the one unrecoverable
#    failure here. Everything else can be fixed after the fact.
# ---------------------------------------------------------------------------
bold "secrets"
SECRET_PATTERNS='(sk-ant-[a-zA-Z0-9_-]{16,}|sk-[a-zA-Z0-9]{32,}|ghp_[a-zA-Z0-9]{36}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'
if git rev-parse --git-dir >/dev/null 2>&1; then
  # Scan tracked files only; untracked scratch files are not our business.
  if git grep -nIE "$SECRET_PATTERNS" -- \
       ':!*.lock' ':!scripts/preflight.sh' ':!docs/*' >/tmp/preflight-secrets 2>/dev/null; then
    fail "possible secret in tracked files"
    sed 's/^/      /' /tmp/preflight-secrets
  else
    pass "no secret-shaped strings in tracked files"
  fi
  rm -f /tmp/preflight-secrets
else
  skip "secret scan (not a git repo)"
fi

# ---------------------------------------------------------------------------
# 2. Project checks. Each block is a no-op when the tooling isn't present, so
#    this script is safe to drop into a repo before the toolchain exists.
# ---------------------------------------------------------------------------
bold "checks"

if [ -f package.json ]; then
  has_script lint      && run "lint"      npm run --silent lint      || skip "lint"
  has_script typecheck && run "typecheck" npm run --silent typecheck || skip "typecheck"
  has_script test      && run "test"      npm run --silent test      || skip "test"
else
  skip "node checks"
fi

if [ -f pyproject.toml ] || [ -f requirements.txt ]; then
  command -v ruff   >/dev/null && run "ruff"   ruff check .   || skip "ruff"
  command -v pytest >/dev/null && run "pytest" pytest -q      || skip "pytest"
else
  skip "python checks"
fi

# Workflow scripts: syntax + the runtime contract. A broken workflow should fail
# here, not forty agents into a run.
#
# Note: `node --check` cannot do this job. A workflow mixes ESM `export` with
# top-level `await` and top-level `return` — valid in the workflow runtime, but
# in neither of Node's module modes, so Node exits 0 on a file with a real
# syntax error in it. scripts/check-workflows.mjs compiles the body properly.
if [ -d .claude/workflows ] && command -v node >/dev/null; then
  STEP_NUM=$((STEP_NUM + 1))
  if out=$(node scripts/check-workflows.mjs 2>&1); then
    pass "workflows"
    printf '%s\n' "$out" | sed 's/^/    /'
  else
    fail "workflows"
    printf '%s\n' "$out" | sed 's/^/    /'
  fi
fi

# Docs: relative links that point at nothing. Cheap, and catches the rot that
# follows every file rename.
if command -v node >/dev/null && [ -f scripts/check-links.mjs ]; then
  STEP_NUM=$((STEP_NUM + 1))
  if out=$(node scripts/check-links.mjs 2>&1); then
    pass "doc links"
    printf '%s\n' "$out" | sed 's/^/  /'
  else
    fail "doc links"
    printf '%s\n' "$out" | sed 's/^/  /'
  fi
fi

# ---------------------------------------------------------------------------
echo
if [ "$FAILED" -eq 0 ]; then
  bold "preflight passed — safe to push"
  exit 0
else
  bold "preflight FAILED — do not push"
  echo "Fix the above. Per AGENTS.md: never push red, and never disable a check to get green."
  exit 1
fi
