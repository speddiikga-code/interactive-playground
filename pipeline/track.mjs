#!/usr/bin/env node
/**
 * track.mjs — the business pipeline.
 *
 * A CRM small enough to read in one sitting and to own outright. No SaaS, no
 * subscription, no vendor holding your funnel hostage.
 *
 *   node pipeline/track.mjs list
 *   node pipeline/track.mjs add "Studio Korea" --hq CN --markets KR,EN
 *   node pipeline/track.mjs stage "Studio Korea" audit_sent
 *   node pipeline/track.mjs due
 *   node pipeline/track.mjs stats
 *
 * Deliberately company-level only. Personal contact data — names, emails,
 * phone numbers, anything off a business card — belongs in contacts.local.json,
 * which is gitignored. Korea's 개인정보보호법 (PIPA) governs personal data, and
 * a git repo is the wrong container for it: repos get pushed, forked, and made
 * public by accident.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const DB = join(HERE, 'targets.json')

const load = () => JSON.parse(readFileSync(DB, 'utf8'))
const save = (d) => writeFileSync(DB, JSON.stringify(d, null, 2) + '\n')

const today = () => new Date().toISOString().slice(0, 10)

/** Stages in funnel order, excluding terminal "dead". */
const funnel = (db) => db.stages.filter((s) => s !== 'dead')

function cmdList(db) {
  const rows = db.targets.filter((t) => t.stage !== 'dead')
  if (rows.length === 0) return console.log('  pipeline empty')

  const order = db.stages
  rows.sort((a, b) => order.indexOf(b.stage) - order.indexOf(a.stage))

  console.log()
  for (const t of rows) {
    const flag = t.next_action_date && t.next_action_date <= today() ? ' ← due' : ''
    console.log(`  ${t.stage.padEnd(11)} ${t.company}${flag}`)
    if (t.next_action) console.log(`  ${''.padEnd(11)} ${t.next_action} (${t.next_action_date || 'no date'})`)
  }
  console.log()
}

function cmdAdd(db, args) {
  const company = args[0]
  if (!company) return fail('usage: add "<company>" [--hq CN] [--markets KR,EN]')
  if (db.targets.some((t) => t.company === company)) return fail(`already tracked: ${company}`)

  const flag = (name, dflt) => {
    const i = args.indexOf(`--${name}`)
    return i !== -1 && args[i + 1] ? args[i + 1] : dflt
  }

  db.targets.push({
    company,
    hq: flag('hq', 'CN'),
    korean_entity: true,
    titles: [],
    stage: 'identified',
    markets: flag('markets', 'KR,EN').split(','),
    next_action: 'Research: store listing, ratings, review complaints',
    next_action_date: today(),
    notes: '',
  })
  save(db)
  console.log(`  added: ${company}`)
}

function cmdStage(db, args) {
  const [company, stage] = args
  if (!company || !stage) return fail('usage: stage "<company>" <stage>')
  if (!db.stages.includes(stage)) return fail(`unknown stage. one of: ${db.stages.join(', ')}`)

  const t = db.targets.find((x) => x.company === company)
  if (!t) return fail(`not tracked: ${company}`)

  const from = t.stage
  t.stage = stage
  t.stage_changed = today()
  save(db)
  console.log(`  ${company}: ${from} → ${stage}`)
}

function cmdDue(db) {
  const due = db.targets.filter(
    (t) => t.stage !== 'dead' && t.next_action_date && t.next_action_date <= today(),
  )
  if (due.length === 0) return console.log('  nothing due')
  console.log()
  for (const t of due) console.log(`  ${t.company}\n    ${t.next_action} (${t.next_action_date})`)
  console.log()
}

function cmdStats(db) {
  const live = db.targets.filter((t) => t.stage !== 'dead')
  const counts = Object.fromEntries(db.stages.map((s) => [s, 0]))
  for (const t of db.targets) counts[t.stage] = (counts[t.stage] || 0) + 1

  console.log()
  const width = Math.max(...funnel(db).map((s) => s.length))
  for (const s of funnel(db)) {
    console.log(`  ${s.padEnd(width)}  ${'█'.repeat(counts[s])} ${counts[s] || ''}`)
  }
  console.log(`  ${'dead'.padEnd(width)}  ${counts.dead || 0}`)

  // Conversion is the number that tells you whether the approach works at all.
  const sent = db.targets.filter((t) =>
    ['audit_sent', 'replied', 'pilot', 'paid', 'retainer'].includes(t.stage)).length
  const replied = db.targets.filter((t) =>
    ['replied', 'pilot', 'paid', 'retainer'].includes(t.stage)).length

  console.log(`\n  live: ${live.length}   audits sent: ${sent}   replies: ${replied}`)
  if (sent >= 5) {
    const rate = ((replied / sent) * 100).toFixed(0)
    console.log(`  reply rate: ${rate}%  ${replied === 0 ? '← nothing landing; change the approach, not the volume' : ''}`)
  } else {
    console.log(`  reply rate: need ${5 - sent} more sent before the number means anything`)
  }
  console.log()
}

function fail(msg) {
  console.error(`  ${msg}`)
  process.exitCode = 1
}

const [cmd, ...args] = process.argv.slice(2)
const db = load()

switch (cmd) {
  case 'list':  cmdList(db); break
  case 'add':   cmdAdd(db, args); break
  case 'stage': cmdStage(db, args); break
  case 'due':   cmdDue(db); break
  case 'stats': cmdStats(db); break
  default:
    console.log(`
  node pipeline/track.mjs list                        show the pipeline
  node pipeline/track.mjs add "<company>"             add a target
  node pipeline/track.mjs stage "<company>" <stage>   move it
  node pipeline/track.mjs due                         what needs action today
  node pipeline/track.mjs stats                       funnel + reply rate
`)
}

if (existsSync(join(HERE, 'contacts.local.json'))) {
  // Cheap insurance against the one mistake that actually matters here.
  console.log('  note: contacts.local.json present — confirm it is gitignored before pushing')
}
