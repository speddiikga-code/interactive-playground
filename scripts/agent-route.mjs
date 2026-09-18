#!/usr/bin/env node
/**
 * agent-route.mjs — task shape → harness + effort.
 *
 * The most expensive habit in agentic coding is running everything at maximum
 * effort. This encodes the routing table from docs/04-routing-and-cost.md so the
 * decision is explicit and reviewable instead of a gut call made forty times a day.
 *
 *   node scripts/agent-route.mjs "migrate every component under src/ to TypeScript"
 *   node scripts/agent-route.mjs --json "fix the typo in the README"
 *
 * It is a recommendation, not a gate. Override it when you know better — but
 * override it deliberately.
 */

/** Signals that a task fans out across many items — the shape workflows win at. */
const FANOUT = [
  /\bevery\b/i, /\ball\b\s+\w+\s+(files?|components?|routes?|handlers?|endpoints?|tests?)/i,
  /\beach\b/i, /\bacross the (codebase|repo|project)\b/i, /\brepo-wide\b/i,
  /\bmigrat(e|ing|ion)\b/i, /\baudit\b/i, /\bsweep\b/i, /\bin parallel\b/i,
];

/** Signals that the work is verification-shaped and benefits from cross-checking. */
const VERIFY = [
  /\bcross-check\b/i, /\badversarial(ly)?\b/i, /\bverify\b/i, /\breview\b/i,
  /\bsecond opinion\b/i, /\bresearch\b/i,
];

/** Signals of a long-horizon / computer-use task Codex is built for. */
const LONGHORIZON = [
  /\bcomputer use\b/i, /\bbrowser\b/i, /\bend-to-end\b/i, /\be2e\b/i,
  /\blong-running\b/i, /\bscrape\b/i, /\bui automation\b/i,
];

/** Signals of genuinely trivial work, where frontier reasoning is wasted money. */
const TRIVIAL = [
  /\btypo\b/i, /\brename\b/i, /\bbump\b/i, /\bformat(ting)?\b/i,
  /\bcomment\b/i, /\bone-?liner\b/i, /\bchangelog\b/i,
];

/** Signals that the blast radius is large enough to want two independent opinions. */
const RISKY = [
  /\bauth(entication|orization)?\b/i, /\bsecurity\b/i, /\bpayment/i, /\bbilling\b/i,
  /\bmigration\b/i, /\bschema\b/i, /\bcrypto/i, /\bsecret/i, /\bpermission/i,
];

const count = (task, patterns) => patterns.filter((re) => re.test(task)).length;

/** Rough file-count estimate from an explicit number in the task, if present. */
function statedScale(task) {
  const m = task.match(/\b(\d{2,5})\s*(\+)?\s*(files?|components?|tests?|routes?)\b/i);
  return m ? parseInt(m[1], 10) : null;
}

export function route(task) {
  const fanout = count(task, FANOUT);
  const verify = count(task, VERIFY);
  const longHorizon = count(task, LONGHORIZON);
  const trivial = count(task, TRIVIAL);
  const risky = count(task, RISKY);
  const scale = statedScale(task);

  const reasons = [];

  // Trivial wins outright — cheap work should stay cheap, even if it mentions
  // a scary word. "rename the auth helper" is not a security review.
  if (trivial > 0 && fanout === 0 && scale === null) {
    reasons.push('trivial shape: frontier reasoning adds cost, not quality');
    return {
      harness: 'either', mode: 'normal', effort: 'medium',
      command: 'claude "<task>"   # or: codex "<task>"',
      reasons, signals: { fanout, verify, longHorizon, trivial, risky, scale },
    };
  }

  // Fan-out is the one shape where only one harness has a real answer.
  if (fanout >= 2 || (scale !== null && scale >= 20) || (fanout >= 1 && verify >= 1)) {
    reasons.push('fan-out shape: many items treated the same way');
    if (verify > 0) reasons.push('verification requested: agents can adversarially check each other');
    if (scale !== null) reasons.push(`stated scale ~${scale} items`);
    reasons.push('only Claude Code orchestrates this as a script (workflows)');
    return {
      harness: 'claude', mode: 'ultracode', effort: 'xhigh',
      command: `ultracode: ${task}`,
      caution: scale !== null && scale >= 100
        ? 'Large run. Try one directory first and set workflowSizeGuideline=small.'
        : 'Watch /workflows for token spend; stop the run if it grows past expectations.',
      reasons, signals: { fanout, verify, longHorizon, trivial, risky, scale },
    };
  }

  // Long-horizon / computer-use work plays to Codex + gpt-6-astra's strengths.
  if (longHorizon > 0) {
    reasons.push('long-horizon or computer-use shape');
    reasons.push('gpt-6-astra is tuned for this, with 1.05M context for the trail');
    return {
      harness: 'codex', mode: 'normal', effort: 'high',
      command: `codex --model gpt-6-astra "${task}"`,
      caution: 'Past 272K tokens you pay 2× input / 1.5× output. Keep the context tight.',
      reasons, signals: { fanout, verify, longHorizon, trivial, risky, scale },
    };
  }

  // High blast radius: run both and diff the reviews. Disagreement is signal.
  if (risky > 0) {
    reasons.push('high blast radius: an error here is expensive to unwind');
    reasons.push('two independent harnesses agreeing is much stronger evidence than one');
    return {
      harness: 'both', mode: 'normal', effort: 'high',
      command: `claude "${task}"\ncodex "${task}"\n# then diff the two diffs`,
      reasons, signals: { fanout, verify, longHorizon, trivial, risky, scale },
    };
  }

  reasons.push('ordinary feature work: the default working mode');
  return {
    harness: 'either', mode: 'normal', effort: 'high',
    command: 'claude "<task>"   # or: codex "<task>"',
    reasons, signals: { fanout, verify, longHorizon, trivial, risky, scale },
  };
}

function main(argv) {
  const json = argv.includes('--json');
  const task = argv.filter((a) => a !== '--json').join(' ').trim();

  if (!task) {
    console.error('usage: node scripts/agent-route.mjs [--json] "<task description>"');
    process.exit(2);
  }

  const r = route(task);
  if (json) {
    console.log(JSON.stringify({ task, ...r }, null, 2));
    return;
  }

  const label = r.mode === 'ultracode' ? `${r.harness} (ultracode)` : r.harness;
  console.log(`\n  task     ${task}`);
  console.log(`  route    ${label}`);
  console.log(`  effort   ${r.effort}`);
  console.log(`\n  why`);
  for (const reason of r.reasons) console.log(`    · ${reason}`);
  console.log(`\n  run`);
  for (const line of r.command.split('\n')) console.log(`    ${line}`);
  if (r.caution) console.log(`\n  ⚠ ${r.caution}`);
  console.log();
}

// Only run the CLI when invoked directly, so the module stays importable in tests.
if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2));
