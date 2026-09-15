# Using the new analysis tabs

The original Hall cards, Daily messages, and Signup directory remain available.

## Prize analysis

1. Open **Prize analysis** and click **Load history**. This reads all available promotional message pages for halls with collected texts. The progress message states coverage and reports failures.
2. Review the raw dollar amounts, minimum, median, and maximum. No hall-size cutoffs are preselected.
3. Choose **Advertised prizes** or **Conditional jackpots**. HB/Hotball jackpots are kept separate because winning conditions may apply. The app does not add these to advertised prizes without evidence that they are additional.
   **Largest prize clue (review)** lets you sort the largest mentioned prize-like amount even when payout rules are unclear. It excludes entry prices and utility credits. It is not a nightly total. The table lists individual conditional and unclear amounts separately.
4. Filter by dollar range, hall/city, event date, Hotball mention, or advance notice. Put the same number in Minimum and Maximum for an exact amount.
5. Enter a ZIP code and choose 50 or 100 miles, then click **Apply distance**. This uses approximate straight-line distances between ZIP centers, not driving distance or exact hall coordinates. Missing locations are excluded and counted. Reapply after loading additional history.
6. Open **Text & findings** to review the original message, each detected amount, and uncertainty. Published schedules are shown as a separate reference rather than assumed to be the event in the text.
7. After reviewing the distribution, open **Set hall-size cutoffs** and enter the three amounts where Medium, Large, and Very large begin. Small is below the first cutoff. Size refers to the selected amount for that event, not permanent hall capacity. Settings and loaded history survive tab changes, but reset on a page reload.

### How to interpret the numbers

- HB, H.B., Hotball, hot ball, and hot-ball are recognized. Examples of supported shorthand include `$25k`, `5 grand`, `tonite`, `2nite`, and `tmrw`.
- Ticket prices and entry costs are excluded. A clearly stated `20 games paying $250` becomes $5,000. An explicitly stated total takes precedence over its components.
- Several unclear amounts are not automatically summed. An isolated prize amount can be only part of the night's prizes; open its evidence before treating it as a complete nightly budget.
- Same-day timing is never assumed simply because most halls text that day. The parser uses Pacific time. Conflicting dates, recurring schedules, and ambiguous “next Friday” wording need review.
- One row represents one identified hall/event date. A later reminder replaces the earlier amount, while the earliest loaded announcement determines advance notice. Cancellation/postponement messages exclude the event. Unknown dates stay separate, so they may still include duplicate campaigns.
- Shared-list promotions appear for each associated hall. There is no combined statewide prize total, because that would double-count shared offers.
- Statistics use only the currently visible known amounts. Unknown amounts are counted separately. These are advertised claims, not verified money paid out.
- This is an explainable rule-based first pass, not a complete understanding of every colloquial message. Image-only promotions and unusual wording require review. No manual corrections are stored by this version.

### Checking a pasted message

Open **Check the wording of a text** inside Prize Analysis. You can paste a real message without a database connection. It is parsed in the browser, and is neither sent nor added to the shared history. A received timestamp with a time-zone offset is optional; without it, date and advance notice stay unknown.

The supplied Salinas and HouseBingoLAX examples are regression tests. Missing dollar signs in `50 Buyin`, `2000 Strips`, and `HB 1@5500` are supported. Numbered Hotballs stay separate; utility/credit promotions stay separate from cash prizes. Package counts such as `4 Strips`, `4 DA`, and `Level 2` do not become game counts. Pink is a conditional color bonus. FB/FBs means Fireball and is treated as Hotball when used as a game/amount label. For Salinas, TTT is matched to the Tik-Tak-Tow progressive described on the hall’s How to Play page; this abbreviation expansion is inferred from the matching game name. The $2,000 Strips amount is a strip-game payout, not a full-night total. The $50 and $90 buy-ins purchase two and four strips per game respectively, not two and four games.

## Vendor research

### Researching unfamiliar game terms

When assisting with an unclear text, check that specific hall's official website first, including linked FAQs, game rules, How to Play, programs, and specials. Record the source and distinguish an explicit definition from an inferred abbreviation match. Apply hall-specific meanings only to the appropriate hall. If no explanation is found, retain the term and amount as unresolved and ask for clarification. This is the assistant's research workflow; the app's text parser does not yet trigger website research automatically.

Search for a hall, city, or recorded ordering vendor. **Check vendor evidence** reads up to five public pages, following relevant purchase/reservation links and permitted redirects. It does not place orders, enter customer details, or submit payments. Results remain in the current page session; successful server checks are cached for one hour.

Each result states its source and strength:

- **Observed link**: a purchase or reservation destination on a known vendor domain.
- **Page signal**: an embedded payment script or explicit public statement. It needs review and is not proof of an active contract.
- Existing directory records retain their source and research date.

Online ordering, payment service, merchant processor, and in-hall POS are distinct. A Stripe script or AirMenu link does not prove who owns the merchant processing contract or supplies the hall's POS. Those fields remain unknown unless a public page explicitly names them. Sites that render everything in JavaScript, block automated requests, require login, or use unsupported destinations can require manual research.

## Running this supplied copy

The supplied archive had all source files in one folder. The original app structure has been restored under `app`, `components`, `lib`, `db`, `scripts`, and related directories. Existing source and research records were retained; unrelated example notes files are under `examples/d1`.

Use Node 22.13 or later and npm:

```sh
npm run install:ci
npm test
npx tsc --noEmit
npm run build
npm run dev
```

Configure the existing database and message-service credentials using `.env.example`; do not put credentials in source files. The local copy currently has directory records but no configured live-message credentials. A database error does not mean the halls have no texts. No invented messages are included in the product.

Publication could not be completed from this account: the existing Sites project returned **project not found**. Its original project ID was preserved; no replacement Site was created.

Location service: [Zippopotam.us documentation](https://docs.zippopotam.us/docs/getting-started/). Only the ZIP code is sent to that service; message bodies are parsed locally in the browser.

### Salinas terminology evidence

User clarification supplies the Pink, FB, strip-payout, and package meanings. The [official How to Play page](https://www.salinasparknplaybingo.com/how-to-play/) describes Fireball and Tik-Tak-Tow: the latter needs three Xs across the middle for its progressive jackpot, otherwise a consolation prize applies. TTT is a strong inferred abbreviation match, not an explicit abbreviation definition on that page. The FAQ and rules pages were also checked. The TTT and strip-game shorthand rules are scoped to Salinas by hall ID or name; they do not establish meanings for other halls.
