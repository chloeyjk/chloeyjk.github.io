# Weekly scan: instructions for the scheduled agent

You maintain the Eval Brief at https://chloeyjk.github.io/research/, a catalog of work on
**evaluating AI agents and LLMs where the statistical method is a real contribution**. Once a
week you find new work, verify it, and open a pull request. The owner, Chloe Yang (biostatistics
PhD student), reviews and merges it. You never push to `main`.

## Scope

Include work where statistics is central to evaluation:

| topic id      | covers |
|---------------|--------|
| `uncertainty` | standard errors, confidence intervals, clustering, power, variance of benchmark scores |
| `paired`      | comparing agents/models: paired tests, Bradley–Terry / preference models, cost–accuracy trade-offs |
| `judges`      | LLM-as-judge reliability, agreement, bias correction, prediction-powered inference |
| `validity`    | construct validity, item response theory, contamination, benchmark design (incl. new agent benchmarks with a statistical angle) |
| `multi-trial` | pass@k, pass^k, repeated trials, reliability and consistency of stochastic agents |
| `practice`    | how labs, leaderboards, and eval frameworks report uncertainty (blogs, docs, releases) |

Exclude: new models, product launches, benchmarks with no statistical content, opinion pieces
without a method, and anything behind a paywall with no public abstract.

## Procedure

1. **Window.** Cover the 7 days before today. Branch: `weekly/YYYY-MM-DD` (today's date).
2. **Read the catalog first.** `research/catalog.json`. Never add something already present
   (compare arXiv IDs, DOIs, and titles).
3. **Search.** At minimum: arXiv listings/search for cs.LG, cs.CL, cs.AI, stat.ME, stat.ML
   with queries such as "LLM evaluation confidence interval", "agent benchmark statistical",
   "LLM-as-a-judge bias", "pass@k", "item response theory benchmark", "prediction-powered
   inference evaluation"; plus the Anthropic, OpenAI, METR, LMSYS, and UK AISI blogs.
4. **Verify every candidate by opening its source page.** For arXiv, open
   `https://arxiv.org/abs/<id>` and copy title, first author, and date exactly from the page
   (`citation_title`, `citation_date` meta tags). The arXiv API rate-limits (HTTP 429); use the
   abs pages. **If you did not open the source page, do not add the entry.** Never cite from memory.
5. **Select at most 8 new entries**, strongest first. Quality over volume; an empty week is fine.
6. **Progress updates.** For existing entries, add a `progress` note only for concrete,
   verifiable events: new arXiv version with changed results, code/data release, venue
   acceptance, a published erratum.
7. **Edit files** (see formats below):
   - append new items to `research/catalog.json`, set its `"updated"` to today;
   - add `progress` notes to existing items;
   - create `research/briefs/YYYY-MM-DD.html` from `.agent/brief-template.html`
     (fill every `{{...}}`; delete empty sections and all template comments);
   - add the brief to `research/briefs/entries.json` and set its `"updated"` to today.
8. **Check.** Run `node tools/validate-catalog.js` and `node --test tests/*.test.js`. Both must
   pass. Fix problems; do not edit or delete tests to make them pass.
9. **Open the pull request** against `main` (title: `Weekly brief YYYY-MM-DD: N new, M updates`).
   Body: a table of each new entry (title, topic, source URL, one line on the method), the
   progress notes, and the "considered, not added" list with reasons.
10. **Quiet week.** If there are no new entries and no progress notes, do not open a PR. Stop and
    report what you searched.

## Writing rules

- Summaries are 1–2 sentences, plain language, stating **what the work does and which
  statistical method it uses**. No hype words ("groundbreaking", "novel").
- Titles are copied exactly from the source.
- Never delete or rewrite existing entries or summaries. Corrections go in `progress`.
- Only `https://` links, and link the canonical page (arXiv abs, ACL Anthology, DOI, official blog).

## Formats

Catalog item (`research/catalog.json` → `items[]`):

```json
{
  "id": "short-lowercase-slug",
  "tag": "Uncertainty | Comparing Agents | LLM Judges | Validity | Reliability | Agent Benchmarks | In Practice",
  "topics": ["uncertainty"],
  "title": "Exact title from the source",
  "summary": "What it does and which statistical method it uses.",
  "venue": "First author et al. · arXiv 2026",
  "links": [{ "label": "arXiv", "url": "https://arxiv.org/abs/XXXX.XXXXX" }],
  "added": "YYYY-MM-DD"
}
```

Progress note (appended to an existing item's `progress` array, created if missing):

```json
{ "at": "YYYY-MM-DD", "note": "v2 adds clustered SEs; headline gap no longer significant.", "links": [{ "label": "arXiv v2", "url": "https://arxiv.org/abs/XXXX.XXXXXv2" }] }
```

Brief listing (`research/briefs/entries.json` → `items[]`):

```json
{
  "id": "brief-YYYY-MM-DD",
  "tag": "Weekly",
  "title": "Week of YYYY-MM-DD: <headline>",
  "summary": "N new entries, M updates. <one sentence on the most important item>",
  "links": [{ "label": "Read brief", "url": "/research/briefs/YYYY-MM-DD.html" }],
  "added": "YYYY-MM-DD"
}
```
