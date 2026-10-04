# Architecture

ClauseStream is a **plug-in layer**: it takes the conversation plus a clause index and returns *verified context* for the host assistant to answer from.

## Modules

| File | Responsibility |
|---|---|
| `js/clauses.js` | Clause index. Each clause has `id`, `text`, `kw`, `deps`, `ev(facts)` |
| `js/engine.js` | `ext()` situation extraction, `retrieve()` scoring, `claims()` answer claims + clarification, `verify()` checks |
| `js/ui.js` | `send()` runs the 6 pipeline steps and renders every panel |

## Key ideas

**Applicability, not just relevance.** `ev(facts)` is deterministic code. It returns `UNKNOWN` when a needed fact is missing, so the system never silently assumes.

**Delta re-evaluation.** Each clause lists the facts it `deps` on. When a message changes a fact, only clauses depending on that fact are re-evaluated; the rest reuse their cached status. The log panel shows the saving per turn.

**Situation-driven retrieval.** The retrieval query is the whole conversation, and clauses whose dependencies are already known get a small score boost. Retrieved clauses stay in the working set.

**Targeted clarification.** Priority order: amount, then trip type, then booking lead time. A question is asked only if the missing fact decides whether a clause applies.

**Verification.** Every claim carries the clause IDs it cites and the status each must have. `verify()` checks (1) the clause exists, (2) its status matches, (3) the claimed comparison matches the clause value. Failing claims are blocked.

## Plug-in contract

The Verified Context panel is the payload an existing assistant would receive:

```json
{
  "situation": {"amount": 7000, "trip_type": "INTERNATIONAL", "lead_days": 2},
  "applies": ["C2", "C3", "C5"],
  "not_applicable": ["C1"],
  "unknown": [],
  "ask_user": null,
  "verified_claims": [{"ids": ["C2"], "deps": ["amount", "trip_type"]}]
}
```
