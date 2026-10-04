# ClauseStream

> **Relevant ≠ Applicable.** A plug-in reasoning layer that helps existing AI assistants decide whether the rules they retrieve actually apply to the user's current situation.

Built for **Samsung PRISM Generative AI Hackathon, 3rd Edition (2026-27)**.
Theme: *Applicability-Aware AI Assistance*

| | |
|---|---|
| Theme ID | _fill in_ |
| Team | _fill in_ |
| College | _fill in_ |
| Demo video | _add link_ |

---

## The problem

AI assistants are good at **finding** information, but not at deciding **when it applies**.
Ask "Can I claim ₹7,000 for my hotel?" and a standard RAG assistant retrieves both the ₹5,000 domestic limit and the ₹8,000 international limit. Which one applies? It depends on a fact the user hasn't given yet, and a plain RAG pipeline can't tell.

| Approach | Gap |
|---|---|
| Standard RAG | Retrieves relevant chunks but can't tell if a rule applies |
| LLM reasoning | May guess missing facts or miss exceptions |
| Conversation memory | Doesn't link rules to the facts they depend on |
| Rule engines | Reliable, but cut off from chat and retrieval |

## What ClauseStream does

It sits **between retrieval and response generation** of an existing assistant. It does not replace the assistant, the LLM or the user experience.

1. **Understand**: tracks the user's situation across the conversation (amount, trip type, booking lead time).
2. **Evaluate**: checks each retrieved clause and labels it `APPLIES`, `NOT APPLICABLE` or `UNKNOWN`.
3. **Adapt**: asks only for the missing fact that can change the answer, and re-checks only the clauses that depend on a new fact.

> LLM for language understanding. Deterministic code for condition evaluation.

## Run the prototype

No install, no server, no API keys.

```
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

or just double-click `index.html`. Optional local server: `python3 -m http.server 8000` then visit http://localhost:8000.

### Demo walkthrough (about 30 seconds)

Click **▶ Play demo**, or type the messages yourself:

1. `Can I claim ₹7,000 for my hotel?` → trip type unknown, so it asks *"Is this hotel for an international trip?"* instead of guessing
2. `Yes, it is for Singapore` → international clause applies (re-evaluates 2 of 4 clauses)
3. `I booked it 2 days before the trip` → late-booking rule applies (re-evaluates only 1 clause)

Final answer: ₹7,000 is within the international limit, but director approval is required because the booking was made less than 3 days before travel.

### Second domain: Samsung Care warranty (English + Hinglish)

Pick **Samsung Care warranty** in the dropdown. Same engine, different clauses:

1. `My phone screen cracked, is it covered?` → accidental damage; Care+ status unknown, so it asks *"Do you have an active Samsung Care+ plan?"*
2. `No, I don't have Care+` → not covered, repair is chargeable
3. `Sorry, I just activated Care+ yesterday` → the answer is **revised**: now covered under Care+ with a service fee (only the affected clauses are re-checked)

Try the Hinglish chip too: `mera phone ka screen toot gaya, kya covered hai?` The assistant answers in Hinglish. Everything runs locally in the browser, so the user's situation never leaves the device.

Also try **Test verifier**: it injects an unsupported claim citing a clause that doesn't exist, and the verifier blocks it.

## Features (Phase 1)

| Feature | Where to see it |
|---|---|
| Clause-level indexing | "Clause index" panel with dependencies and retrieval scores |
| Situation tracking | "Situation tracker" panel |
| Applicability resolver | APPLIES / NOT APPLICABLE / UNKNOWN chips on each clause |
| Targeted clarification | Assistant asks only when a missing fact can change the answer |
| Clause-level verification | "Claim ledger": clause-ID check + entailment check on every claim |
| Streaming updates | Streamed replies and the 6-step pipeline strip |
| Delta re-evaluation | "Delta re-evaluation log" (e.g. `re-evaluated 1/4, reused 3`) |
| Plug-in view | "Verified context" panel and Standard RAG vs ClauseStream comparison |

## Pipeline

```
User message
  → 1 Track situation      (extract facts: amount, trip_type, lead_days)
  → 2 Retrieve clauses     (keyword scoring + situation boost)
  → 3 Resolve applicability (APPLIES / NOT / UNKNOWN, delta re-evaluation)
  → 4 Conflict check       (two limit clauses applying → precedence)
  → 5 Clarify              (ask only for facts that can change the answer)
  → 6 Verify               (clause-ID + entailment check on every claim)
  → Verified context → host assistant writes the final answer
```

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Project structure

```
clausestream-prototype/
├── index.html            # open this file to run everything
├── css/style.css         # styling (light + dark theme)
├── js/
│   ├── utils.js          # small helpers
│   ├── clauses.js        # clause indexes + extraction/claims per domain
│   ├── engine.js         # extraction, retrieval, claims, verification (no DOM)
│   └── ui.js             # panels + 6-step pipeline orchestration
├── tests/engine.test.js  # engine tests (node tests/engine.test.js)
└── docs/ARCHITECTURE.md
```

## Adapt it to another policy

Edit `js/clauses.js`. Each clause declares its text, retrieval keywords, the situation facts it `deps` on, and an `ev(facts)` function that returns `APPLIES`, `NOT` or `UNKNOWN`. Add matching fact extraction in `ext()` in `js/engine.js`.

## Tests

```
node tests/engine.test.js
```

Covers fact extraction, retrieval filtering, clarification instead of guessing, the full hotel scenario, and the verifier blocking unsupported claims.

## Honest scope of this prototype

- Runs fully in the browser with two example domains (company travel policy and Samsung Care warranty), 5 hand-written clauses each.
- Fact extraction uses simple patterns, not an LLM.
- Retrieval is a lightweight keyword scorer, not a vector index.
- The "host assistant" is simulated; the plug-in boundary is shown by the Verified Context payload.

## Roadmap

- **Phase 2**: nested exceptions, effective-date / precedence conflict resolution, a learned retrieve / wait / ask / suppress controller
- **Phase 3**: ClauseStream as an API service for existing assistants (FastAPI + WebSocket), LLM clause extraction, FAISS + SQLite FTS5 hybrid retrieval, broader domains (HR, finance, compliance, product support)

## Submission checklist

- [ ] Public GitHub repo with this prototype
- [ ] README with setup (this file)
- [ ] Demo video (max 5 minutes)
- [ ] Presentation file (PPT or PDF)
