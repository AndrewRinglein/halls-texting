# Project instructions

- Explain work to the user in simple language; this is one of their first projects.
- Preserve the existing hall-card appearance. Put new analysis features in separate tabs.
- Leave hall-size thresholds unassigned until the user chooses them after reviewing actual amounts.

## Unfamiliar bingo terminology

When analyzing a text or extending the parser, research unfamiliar nomenclature or colloquialisms on that particular hall's official website before asking the user for a definition. This is the user's standing instruction.

1. Identify the hall using the directory and established attribution evidence. A shared sender alone does not identify a hall. If the hall is uncertain, preserve that uncertainty.
2. Read its official website and follow relevant links to FAQs, rules, How to Play, programs, schedules, specials, and linked program PDFs or images when useful. Search within the hall's site when direct navigation does not explain the term.
3. Record the term, meaning, hall, source URL, date checked, payout conditions, and whether the interpretation is explicitly stated or inferred. Keep short research notes under `research/` and link evidence in the analysis guide where relevant.
4. Scope learned abbreviations to that hall unless broader applicability is supported. Keep entry prices, package quantities, per-game prizes, conditional jackpots, and noncash credits distinct. Never invent a nightly total from an unexplained amount.
5. If the site is unavailable or does not explain the term, mark it unresolved and report what was checked. Ask the user only after this research. Do not contact the hall, send messages, sign up, or place orders as part of this research.
6. When updating parser behavior, add a meaningful regression test using the supplied wording and preserve the original text as evidence.

This is an agent research workflow. The current app does not automatically crawl websites when its parser encounters an unknown term; do not describe it as doing so.
