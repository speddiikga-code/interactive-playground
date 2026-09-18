#!/usr/bin/env node
/**
 * check-links.mjs — verify relative markdown links point at files that exist.
 *
 * Docs rot quietly: a renamed chapter leaves a dead link that nobody notices
 * until a reader hits it. This is cheap to run and catches that class entirely.
 *
 * Fenced code blocks are stripped first — a sample showing what to put in a
 * file often contains paths relative to somewhere other than the doc itself,
 * and flagging those is a false positive.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'

const ROOT = process.argv[2] || '.'
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.venv'])

function markdownFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue
    const p = join(dir, entry.name)
    if (entry.isDirectory()) markdownFiles(p, out)
    else if (entry.name.endsWith('.md')) out.push(p)
  }
  return out
}

/** Remove fenced and inline code so illustrative paths aren't treated as links. */
const stripCode = (src) =>
  src.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')

let broken = 0
let checked = 0
const files = markdownFiles(ROOT)

for (const file of files) {
  const body = stripCode(readFileSync(file, 'utf8'))
  for (const match of body.matchAll(/\[([^\]]*)\]\((\.[^)\s]+)\)/g)) {
    const target = match[2].split('#')[0]
    if (!target) continue // pure anchor, nothing to resolve
    checked++
    const resolved = resolve(dirname(file), target)
    if (!existsSync(resolved)) {
      broken++
      console.log(`  BROKEN  ${relative(ROOT, file)}  ->  ${match[2]}`)
    }
  }
}

console.log(`  ${checked} relative link(s) across ${files.length} file(s), ${broken} broken`)
process.exit(broken ? 1 : 0)
