export const meta = {
  name: 'cross-model-review',
  description: 'Fan out a reviewer per changed file, adversarially verify each finding, then rank into one summary',
  phases: ['Discover', 'Review', 'Verify', 'Rank'],
}

// Usage:
//   /cross-model-review
//   Run /cross-model-review on src/auth and src/routes
//
// `args` is whatever the caller passed: a string, an array of paths, or undefined.
// Note the runtime makes Date.now() and Math.random() throw, so a resumed run
// replays identically. Pass anything time-dependent in through `args`.

const scope = Array.isArray(args) ? args.join(' ') : (args || 'the current diff against the default branch')

phase('Discover')

const discovered = await agent(
  `List every source file changed in ${scope}. Return paths only, no commentary.`,
  {
    schema: {
      type: 'object',
      required: ['files'],
      additionalProperties: false,
      properties: { files: { type: 'array', items: { type: 'string' } } },
    },
  },
)

// agent() resolves to null if it is stopped or hits an unrecoverable error.
if (!discovered || discovered.files.length === 0) {
  log('Nothing to review.')
  return []
}

log(`Reviewing ${discovered.files.length} file(s).`)

phase('Review')

// One reviewer per file. These share a prompt prefix, so all but the first read
// the first agent's prompt cache — which is why a wide fan-out is affordable.
const reviews = await pipeline(discovered.files, (file) =>
  agent(
    `Review ${file} for correctness bugs only: logic errors, unhandled edge cases, ` +
    `race conditions, incorrect error handling. Ignore style and formatting. ` +
    `For each finding give the line, the concrete failure scenario, and your confidence.`,
    {
      label: file,
      schema: {
        type: 'object',
        required: ['file', 'findings'],
        additionalProperties: false,
        properties: {
          file: { type: 'string' },
          findings: {
            type: 'array',
            items: {
              type: 'object',
              required: ['line', 'claim', 'failure_scenario', 'confidence'],
              additionalProperties: false,
              properties: {
                line: { type: 'number' },
                claim: { type: 'string' },
                failure_scenario: { type: 'string' },
                confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
              },
            },
          },
        },
      },
    },
  ),
)

const found = reviews.filter(Boolean).flatMap((r) => r.findings.map((f) => ({ ...f, file: r.file })))

if (found.length === 0) {
  log('No findings survived the review pass.')
  return []
}

phase('Verify')

// The step that makes this worth running. A fresh agent that did not produce the
// finding tries to refute it. Unverified claims are the single biggest failure
// mode of automated review, and this is the cheapest correction for it.
const verdicts = await pipeline(found, (f) =>
  agent(
    `A reviewer claims ${f.file}:${f.line} has this bug: "${f.claim}"\n` +
    `Their failure scenario: ${f.failure_scenario}\n\n` +
    `Read the actual code and try to REFUTE this. Confirm it only if you can trace a ` +
    `concrete input that reaches the bad state. If the code already guards against it, ` +
    `or the scenario cannot occur, refute it.`,
    {
      label: `${f.file}:${f.line}`,
      schema: {
        type: 'object',
        required: ['verdict', 'rationale'],
        additionalProperties: false,
        properties: {
          verdict: { type: 'string', enum: ['confirmed', 'refuted', 'uncertain'] },
          rationale: { type: 'string' },
        },
      },
    },
  ),
)

const survived = found
  .map((f, i) => ({ ...f, verdict: verdicts[i]?.verdict, rationale: verdicts[i]?.rationale }))
  .filter((f) => f.verdict === 'confirmed' || f.verdict === 'uncertain')

log(`${survived.length} of ${found.length} findings survived verification.`)

if (survived.length === 0) return []

phase('Rank')

const summary = await agent(
  `Rank these verified review findings by severity, most severe first. ` +
  `Merge duplicates that describe the same underlying bug. ` +
  `Mark anything with verdict "uncertain" as needing a human look.\n\n` +
  JSON.stringify(survived, null, 2),
)

return summary
