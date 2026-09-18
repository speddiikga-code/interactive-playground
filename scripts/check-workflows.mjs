#!/usr/bin/env node
/**
 * check-workflows.mjs — syntax + contract check for .claude/workflows/*.js
 *
 * Why this exists instead of `node --check`:
 *
 * A workflow script legitimately mixes ESM (`export const meta`) with top-level
 * `await` AND top-level `return`. That combination is valid in the Claude Code
 * workflow runtime but is not valid in either of Node's module modes. Node's
 * module detection tries CJS, fails, tries ESM, fails, and then exits 0 —
 * so `node --check` silently passes a file with a real syntax error in it.
 * Verified on Node v22.22.2.
 *
 * So: strip the `meta` export, compile the remaining body as an async function
 * body (which legalises both top-level await and top-level return), and check
 * the documented contract rules separately.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const DIR = process.argv[2] || '.claude/workflows'

/** Remove the `export const meta = {...}` block by matching braces. */
function stripMeta(src) {
  const start = src.search(/export\s+const\s+meta\s*=\s*\{/)
  if (start === -1) return src
  const open = src.indexOf('{', start)
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') {
      depth--
      if (depth === 0) return src.slice(0, start) + src.slice(i + 1)
    }
  }
  return src.slice(0, start) // unbalanced; the syntax check will report it
}

/** Strip comments so the contract scan matches real code, not prose about it. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
}

/** Rules from the workflow authoring docs that a script must satisfy to load. */
function contractErrors(src) {
  const errors = []
  const code = stripComments(src)

  // `export const meta` must be the first statement, or Claude Code drops the
  // command from `/` autocomplete.
  const firstCode = src
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('//') && !l.startsWith('/*') && !l.startsWith('*'))

  if (!firstCode || !firstCode.startsWith('export const meta')) {
    errors.push('`export const meta` must be the first statement')
  }
  if (!/name\s*:/.test(src.slice(0, 400))) errors.push('meta is missing a `name`')
  if (!/description\s*:/.test(src.slice(0, 400))) errors.push('meta is missing a `description`')

  // The runtime rejects module loading outright.
  if (/\bimport\s*\(/.test(code)) errors.push('`import()` is not allowed — the run fails before it starts')
  if (/^\s*import\s+/m.test(code)) errors.push('static `import` is not allowed in a workflow body')

  // These throw at run time so a resumed run replays identically. Catching them
  // here is much cheaper than catching them forty agents into a run.
  if (/\bDate\.now\s*\(/.test(code)) errors.push('`Date.now()` throws at run time — pass a timestamp via `args`')
  if (/\bMath\.random\s*\(/.test(code)) errors.push('`Math.random()` throws at run time — pass a seed via `args`')
  if (/new Date\s*\(\s*\)/.test(code)) errors.push('`new Date()` with no argument throws at run time')

  return errors
}

function checkFile(path) {
  const src = readFileSync(path, 'utf8')
  const problems = contractErrors(src)

  // Remove the meta export so the remainder is a plain async function body.
  // Brace-matched rather than regex: `meta` is written both on one line and
  // across many, and a regex that assumed one shape silently left `export` in
  // the body, which then failed to compile for the wrong reason.
  const body = stripMeta(src)

  try {
    // Compiles without executing. `args` and the runtime globals are declared as
    // parameters so referencing them is not a ReferenceError at compile time.
    new AsyncFunction('args', 'agent', 'pipeline', 'parallel', 'phase', 'log', body)
  } catch (err) {
    problems.push(`syntax: ${err.message}`)
  }

  return problems
}

if (!existsSync(DIR)) {
  console.log(`no ${DIR} directory — nothing to check`)
  process.exit(0)
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.js'))
if (files.length === 0) {
  console.log(`no workflow scripts in ${DIR}`)
  process.exit(0)
}

let failed = 0
for (const f of files) {
  const problems = checkFile(join(DIR, f))
  if (problems.length === 0) {
    console.log(`  ok   ${f}`)
  } else {
    failed = 1
    console.log(`  FAIL ${f}`)
    for (const p of problems) console.log(`         ${p}`)
  }
}

process.exit(failed)
