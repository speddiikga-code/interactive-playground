# Pipeline

A CRM small enough to read in one sitting and to own outright.

```bash
node pipeline/track.mjs list                        # the pipeline
node pipeline/track.mjs add "<company>"             # add a target
node pipeline/track.mjs stage "<company>" replied   # move it
node pipeline/track.mjs due                         # what needs action today
node pipeline/track.mjs stats                       # funnel + reply rate
```

## Stages

`identified` → `researched` → `audit_sent` → `replied` → `pilot` → `paid` → `retainer`

Plus `dead`, which is not a failure — a fast no is worth more than a slow maybe,
because it stops you spending follow-ups on someone who was never going to buy.

## What goes in here, and what does not

**`targets.json` holds public company information only** — company name, published
titles, store ratings, review counts. It is committed and safe to share.

**Personal data does not belong in git.** Names, emails, phone numbers, anything
off a business card: that is personal information under Korea's
**개인정보보호법 (PIPA)**, and a repository is the wrong container for it —
repos get forked, pushed, and made public by accident. Keep it in
`pipeline/contacts.local.json`, which `.gitignore` excludes.

Two related rules worth knowing before any outreach:

- **정보통신망법** requires prior opt-in consent for commercial email, with
  `(광고)` labeling in the subject line. Cold B2B outreach to a work address you
  obtained legitimately is treated differently from bulk marketing — but the
  distinction matters, so confirm your approach before sending at volume.
- Harvesting contacts in bulk from a platform generally breaches its terms of
  service regardless of the privacy question.

None of this blocks the business. It shapes how you source contacts: one at a
time, from public professional profiles or direct introductions, rather than by
scraping.

## The number that matters

Reply rate on sent audits. Below five sent it means nothing — that's noise, not
signal. Past ten with no replies, the problem is the approach, not the volume,
and sending thirty more will only confirm it more expensively.
