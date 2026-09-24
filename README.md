# Gemini Verizon Kiosk Demo Guideline

## What this is, and why

Google is building a retail experience to showcase the Pixel 11's Gemini and
Gemini Intelligence features as a key selling point. That experience takes a
different shape per retail partner: Google's own stores get a separate,
dedicated build (not this repo). **This project is the Verizon retail store
version** — a client project for both Google and Verizon — and the 16:9
landscape format throughout this app is a direct constraint from Verizon's
kiosk hardware, not a design choice.

This repo is a **concept mockup, not a product build**: a browser-based
interactive simulation used to communicate and validate the experience design.
There's no real kiosk hardware target yet, no backend, no live Gemini API call,
and no real user data anywhere — every "AI response" is scripted, pre-authored
content in `types.ts` that plays out on a timer/tap sequence, standing in for
what a live Gemini-powered kiosk would eventually generate. It's built to be
clicked through and iterated on as a design artifact, not deployed as-is.

Built with Next.js/TypeScript/Tailwind from a Figma design file. Every screen
is a real interaction (tap, type, watch it generate) — nothing is a static
image.

Run it with `npm run dev` and open [http://localhost:3000](http://localhost:3000). The whole app is one
page: `src/app/page.tsx`.

## The flow

```
Landing (persona picker)
  → Rundown (persona's "Hi, here's your daily rundown" suggestion pills)
    → Idle ("Where should we start?" / persona's scene-setting backdrop)
      → Typed (prompt typed into the compose bar)
        → Response (the generated answer plays out)
```

- **Landing** (`landing/GlassPillsLayout.tsx`): a full-bleed photo
(`public/geminiBackground1.jpg`) under a centered heading and a stack of
frosted-glass persona pills (student, traveler, parent), each a color
swatch + initial standing in for a photo until real persona photography is
signed off. An earlier full-height photo-card layout was retired in favor
of this one. The pills stay glass rather than a solid fill on purpose —
glass only reads as glass with a photo behind it, so the legibility scrim
over the image is kept deliberately light at the bottom (where the pills
sit) instead of the usual near-black. Only personas with a built rundown
are tappable — others are greyed out and functionally disabled
(`disabled`, not just dim).
- **Rundown** (`RundownScreen.tsx`): each persona's own background photo +
greeting + a bottom-anchored stack of suggestion pills (works for 4 or 5
pills — the stack grows upward, not down). Same active/disabled pattern:
only pills wired to a built demo are tappable.
 The photos are 930x362 banner crops with a large, centred subject going
 into a 16:9 frame, so by default the face lands exactly where the centred
 heading and the centred pill stack are. `bgZoom` / `bgOffsetXCqw` /
 `bgOffsetYCqw` in `RUNDOWNS` zoom and pan the backdrop off that default to
 move a face clear of them; the pan budget is tied to the zoom (see the
 doc comment on `RundownData` — exceed it and the black frame shows through
 at an edge). It only goes so far: a face is taller than the gap between
 the heading and a five-pill stack, so the traveler clears both but the
 student is a compromise. A source crop with the subject off-centre would
 fix that properly.
- **Idle/Typed/Response**: shared kiosk chrome in `page.tsx` — top bar,
compose bar that morphs from a pill into a typed message box, then the
answer. Which persona/pill was tapped decides which **demo** plays.
- **Demo control bar** (`DemoControlBar`) — a band *above* the kiosk, not
floating over it: **Home** on the left (jumps back to Landing from
anywhere), the **layout toggle** on the right, and a "Demo controls" label
between them on the left. It's a lighter surface with a rule under it
because the thing below is a mockup of a product, and controls floating in
the corners over that stage left it ambiguous which of the two you were
looking at. Nothing in this bar is part of the kiosk, which is why it's
allowed hover states and ordinary app-sized type (px, not cqw) — whereas
nothing *inside* the device frame may rely on hover (it's a touchscreen).
The frame sizes itself against the remaining height (`100vh - 7.5rem`:
the bar plus the stage's own padding).

## The three built demos

Routing lives in `page.tsx` as `PILL_DEMOS` (pill id → `DemoId`) and
`RESPONSE_CONTENT_BY_DEMO` (which demos are a plain text answer vs. the
task-automation flow). Every other rundown pill across every persona is
intentionally disabled — only these three actually go anywhere:

1. **Weekend planning** — traveler persona, "Sort the friend's weekend" pill.
  A normal generated text answer: intro, then sections of pre-broken
   `items` (the older list shape). Content lives in `types.ts` as
   `WEEKEND_RESPONSE` (`ResponseContent` shape). Its tail — the fifth "The
   weekend" item and the whole "Packing list" section — was transcribed
   from Figma (`403:4388`); the prompt ends "...and put together a packing
   list", so the answer has to actually produce one.
2. **Friday night** — student persona, "Sort Friday night" pill. Branches in
  two: tapping the pill first goes to `FridayNightChoiceScreen.tsx`
   ("How should Friday night go?" — Go out / Stay in, over
   `public/geminiBackground2.jpg`).
   **Both branches open the same way**: on their own group chat, with that
   thread's Gemini Intelligence suggestion chip (`STAY_IN_SUGGESTION` /
   `GO_OUT_SUGGESTION` in `types.ts`) as the tap target — not the usual idle
   "Ask Gemini" pill. Tapping it hands the compose band from the messaging
   app to Gemini: the RCS field fades out while Gemini's box slides up from
   below the frame, holds its "Ask Gemini" beat, then types. The hold is
   measured from the box being *in place*, so sliding branches wait
   `COMPOSE_SLIDE_MS + TYPING_START_DELAY_MS`; demos whose box is already
   there (weekend, band tour) just fade in and wait the latter alone.
  Both branches now play Gemini's answer in a **floating overlay over the
  group chat** (`GeminiOverlay.tsx`) rather than replacing it — the thread
  stays visible above and behind the panel, which is bottom-anchored just
  clear of the compose pill and grows upward with its content. Long answers
  scroll inside it; nothing auto-scrolls, so a rising-dots cue (`RisingDotsCue`,
  shared with every scrolling surface) is what tells a visitor there's more below.
  The thread itself plays **message by message** (`AnimatedThread` in
  `MessagesScene.tsx`): the user's own message types character by character,
  while each incoming one shows a typing indicator before its bubble lands.
  Durations are derived from the content, not hand-tuned — `threadDurationMs`
  is exported so anything that has to wait for the thread asks it rather than
  keeping a constant in sync by hand.
  - **Stay in** — an **agentic task automation** flow
  (`TaskAutomationResponse.tsx`): the prompt bubble, thinking beat, "I'm on
  it." and the first "Working on your task" card all play **inside the
  overlay**, over the chat. Moving past that first card is the point the
  flow stops being an overlay and takes the whole screen (`onLeaveChat` →
  `chatVisibleInResponse` in `page.tsx`): the chat and overlay drop away,
  and the remaining status cards ("Task in progress" → "Finish up your
  task") run full-bleed, then hand off to the light-themed third-party
  "FoodOrder" checkout card and payment. Content lives in `types.ts` as
  `FRIDAY_NIGHT_TASK` (`TaskDemoContent` shape).
  - **Go out** — a **local-search** flow (`GoOutResponse.tsx`): opens on a
  *different* group chat (same `MessagesScene.tsx`, different messages —
  see `STAY_IN_MESSAGES`/`GO_OUT_MESSAGES` in `types.ts`). The whole answer
  lives in the overlay: an intro, then a full section per restaurant
  (heading, photo card, prose, three bullets), then a closing comparison —
  roughly four panels of scroll. **All three results are pickable**, and
  the tap target is the photo specifically, not the section: it carries the
  comet ring and a glow so it's obvious at a glance what's live without
  reading. The photos are intentionally blank panels until real imagery
  arrives. Each result carries its own `draftText`, so the pick changes the
  outcome; choosing one closes the overlay and appends that drafted message
  to the thread, where it types in and the group answers. Content is
  `SushiSearchContent` in `types.ts`.
  Once either branch's content finishes playing out, a shared "Back to
  home" button (plus a QR code prompting "Scan to try Gemini on your
  phone") appears in `page.tsx`, rather than each demo authoring its own
  exit chrome.
3. **Band tour planning** — student persona, "Plan the band tour" pill.
  Same `ResponseContent` shape and same display patterns as the weekend
   demo, but the content is richer, and it's the one answer transcribed
   directly from the Figma file (section `398:4387`, four scroll frames)
   rather than written here. On top of the weekend demo's headings and
   lists it carries:
   - a **map card** at the very head of the answer (`ResponseContent.map`)
   — a Google Maps still pinning both venues, above even the intro;
   - a **place card** per section (`Section.place`) — photo, rating,
   address, a green status line and a travel time, the same card language
   the "go out" results use, minus the picking;
   - **prose paragraphs** per section (`Section.body`) between the card and
   the list;
   - **labelled bullets** (`Section.bullets`, `{label, text}`) rather than
   the weekend demo's pre-broken `items`.
   Assets are in `public/gemini/band-tour/`, exported from that same frame.
   `buildContentBlocks` emits whichever of these a section declares, so the
   weekend answer's older `items` shape still renders unchanged — the two
   list shapes are alternatives, not a migration.

Weekend and band-tour answers play in one of two **display patterns**. These
are presented as two demos you run end to end, not as a rendering option you
flip mid-answer: the toggle is a standing segmented control in the demo
control bar (`PatternToggle`, top right), visible before you start and while
you're running, and picking the other one **restarts at the Landing screen**
rather than
re-laying-out the answer already on screen. It used to be a dropdown that
appeared top-right over a response, which let you watch an answer reflow
mid-sentence — that reads as a bug in the design rather than as two
alternatives being compared. Switching deliberately shares a destination
with the Home button at the other end of the same bar, so the reset reads as
"start the other demo" rather than as losing your place.

- **Simple scroll** (`patterns/ScrollPattern.tsx`) — single phone-width
column, scrolls for any content length. No pagination.
- **Measured columns** (`patterns/MeasuredColumnsPattern.tsx`) — a fixed
**three-column** frame across the whole kiosk, not a block of content
sitting inside it:
 1. **Column one** is the answer as an ordinary chat — prompt bubble,
 thinking beat, blocks staggering downward — with the **Ask Gemini compose
 bar inside this column**, beneath them, rather than floating centered on
 the frame.
 2. **Column two** takes whatever didn't fit, revealing only once column one
 has fully finished so the two never animate on top of each other, and
 **scrolls** (with the same rising-dots cue used in `ScrollPattern` and
 `GeminiOverlay`) if its share still overflows.
 3. **Column three** is the way out — the QR prompt above the "Back to your rundown"
 button, moved here from the frame's bottom corners, stacked and centered
 both horizontally and vertically against the band the other two columns
 occupy. (`QrPrompt` renders code-beside-label in the frame corner and
 code-above-label here; the corner has no width to spare, the column does.)
Splits are block-atomic (a heading or bullet is never sliced mid-line —
real DOM measurement decides where to break, not guesswork).

 Two things follow from this that are worth knowing before editing it:

 - **The column-one budget moves at runtime.** Its bottom padding is the
 compose box as currently drawn, and the compose box grows and shrinks
 (expanded while the prompt types, a collapsed pill once the answer
 starts). Column one's own `clientHeight` is pinned by `h-full`, so a
 padding change never trips the ResizeObserver — which is why
 `composeHeight` is an explicit dep of the split effect even though the
 measuring code never reads it. Without it the split stays frozen at
 whatever it was measured against, which was the box mid-typing, and
 column one silently loses a place card's worth of height for the rest of
 the answer.
- **The columns are pinned, not centered.** The earlier two-column version
 centered the pair, so column one drifted left as column two opened. It
 can't now: `page.tsx` draws the compose bar and the exit chrome against
 these same column centers, and a frame whose columns slide around
 underneath them isn't a frame. Column two arrives by revealing in place.
 The geometry is one shared source of truth in
 `patterns/columnLayout.ts` — both files place things in the same grid,
 and everything there is derived from two chosen values (the edge inset
 and the column width). All three columns, both dividers and column two's
 scroll cue stop on one shared floor, the same line the compose box and
 the exit chrome rest on.
 - **Everything inside a column renders at `COLUMN_SCALE`** (= column width
 / the 42cqw width the content was authored against — 30/42, so ~0.71).
 Widening the column is therefore also what makes the type bigger, and the
 two can't drift apart. This is not
 decoration: `Section.items` are deliberately pre-broken into display
 lines (see Conventions below), and those breaks only stay exact at the
 em-width they were written for. Scaling keeps a 28cqw column the same
 *number of ems* wide as the 42cqw one, so authored lines land exactly
 where intended instead of re-wrapping into ragged three-liners. The
 compose bar is scaled into column one the same way, and by the same
 ratio — it keeps its authored 35.43cqw width and is simply drawn
 smaller, so its text still wraps to the lines it wrapped to while being
 typed.

 **The old "no answer past two columns" problem is now handled** — the
 overflow scrolls in column two behind an explicit cue rather than being
 quietly capped and hidden. What's left is a *balance* question, not a
 clipping one: see "Where things stand" below. Don't "fix" an overflowing
 demo by trimming its content to make it fit; that was tried once and
 explicitly reverted — it's a layout problem, not a content problem.

## Key files


| File                                                            | What it's for                                                                                                                                                     |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/page.tsx`                                              | The whole app: state machine, kiosk frame, compose bar, demo routing                                                                                              |
| `src/components/kiosk/types.ts`                                 | All content types (incl. `PlaceCard`, `MapCard`, `PlaceBullet`) **and** the actual authored content (`WEEKEND_RESPONSE`, `FRIDAY_NIGHT_TASK`, `BAND_TOUR_RESPONSE`, `PERSONAS`, `RUNDOWNS`)                     |
| `src/components/kiosk/shared.tsx`                               | Shared building blocks: `Reveal` (stagger animation), `PromptBubble`, `ContinuousFlow`/`buildContentBlocks` (flattens a `ResponseContent` into measurable blocks), `CometRing`, `useScrollCue`/`ScrollCue` (the down-arrow "there's more below" cue, used by both scrolling patterns and `GeminiOverlay`) |
| `src/components/kiosk/patterns/`                                | The two response display patterns + `index.ts`'s `PATTERNS` registry                                                                                              |
| `src/components/kiosk/patterns/columnLayout.ts`                 | Measured Columns' three-column geometry — shared with `page.tsx`, which places the compose bar in column one and the exit chrome in column three                  |
| `src/components/kiosk/landing/GlassPillsLayout.tsx`, `RundownScreen.tsx`   | Persona picker, rundown screen                                                                                                                                    |
| `src/components/kiosk/MessagesScene.tsx`                        | Friday-night demo's group-chat backdrop, its top-bar replacement, and the simulated RCS compose bar                                                               |
| `src/components/kiosk/TaskAutomationResponse.tsx`               | Friday-night demo's whole response (task cards, FoodOrder card)                                                                                                   |
| `src/components/kiosk/ThinkingIndicator.tsx`, `TypingLines.tsx` | The "thinking" dot animation, the character-by-character typing effect                                                                                            |
| `public/gemini/`                                                | All image/icon assets, organized by feature (`personas/`, `rundown/`, `friday-night/`, `band-tour/`) — mostly exported straight from Figma                                      |


## Conventions worth knowing before editing

- **Everything is sized in `cqw`** (CSS container query width units), scaled
from the Figma design's 1920px width via a **19.2 scale factor**
(`px / 19.2 = cqw`). Never hand-guess a px value — convert it. The kiosk
frame is the `@container`.
- **Prose wraps naturally; structured items don't.** `promptLines`/`introLines`/
`closingLines`, `Section.body` and `Section.bullets`
are authored as arrays of natural sentence chunks but get `.join(" ")`'d
and rendered as one flowing paragraph — the browser decides the line
breaks. This was a real bug: text used to be forced onto the author's
chosen line breaks regardless of actual container width, leaving ragged
short lines or awkward mid-word wraps. `Section.items`, by contrast, *are*
still intentionally pre-broken (`string[][]`) — those are short structured
facts, not prose, and are deliberately kept compact/scannable. Only the
weekend answer still uses them; content coming from the current design
files is authored as whole sentences (`Section.bullets`) and wraps. This
is also why Measured Columns scales type with column width — pre-broken
lines only stay exact at the em-width they were written for.
- `**Reveal` always mounts its children** and only toggles opacity/transform
(chosen after a page-count-flicker bug where hidden-but-unmounted content
changed measured height). That means hidden `Reveal` content still
contributes to layout unless something else (conditional rendering,
`display:none`) removes it — relevant any time you're measuring height for
pagination/splitting.
- **The compose bar is display only.** It shows what the visitor "asked"; it
isn't how anything is asked. Demos are started by a rundown pill or by a
thread's own Gemini Intelligence suggestion chip, so the bar itself is
`pointer-events: none` and only the Send button opts back in. It used to
carry a click handler that jumped straight into the weekend demo — dead
once every demo got a real entry point, and worse than dead, since an inert
pill that still reacts to a tap reads as a broken control on a touchscreen.
Keeping it inert also stops it swallowing swipes meant for the answer
scrolling underneath it.
- **No hover-only affordances inside the kiosk frame** — it's a touchscreen.
Hover is fine on chrome that lives outside the device (pattern picker, Home
button).
- **Inactive content is visibly disabled, never silently missing.** Personas
and pills not yet wired to a demo are greyed out *and* have `disabled` set
— never just absent from the DOM.
- **Unsigned-off imagery is marked, not quietly used.** Every screen with a
full-bleed stand-in photo behind it carries an `FpoChip` (`shared.tsx`) in
the top-right — Landing, Rundown and the Friday-night choice screen — so a
screenshot can't circulate as if the photo were cleared. It's one shared
component rather than per-screen markup, so the chip lands in the same
place on all of them. Retire the chip, not the photo, once an image is
signed off. (The band-tour place photos and map still come from the Figma
file and are *not* marked — they sit inside the answer rather than behind
it, so a per-screen chip doesn't apply; worth a decision if their rights
are also unsettled.)
- **Don't hardcode per-demo pixel/cqw constants you'll have to re-tune by
hand.** The compose box's expanded height, for example, is computed at
runtime from a hidden measurement clone of each demo's actual prompt text
plus a "chrome" constant backed out of the one calibrated (weekend) value —
because a hardcoded height silently broke twice already when prompt text
changed.
- **Verifying animations:** screenshots can't reliably catch sub-second CSS
transitions (tool round-trip latency races past them). Either sample
`getComputedStyle(...)` at fixed intervals inside *one* `javascript_tool`
script execution, or do a final check with realistic, naturally-paced
clicks and generous waits.

## Where things stand / what's not built yet

- Only 3 of the 13 rundown pills across all personas actually go anywhere
(see "The three built demos" above). The rest are deliberately disabled,
not broken.
- The "Add yourself" persona has no rundown screen or demo at all yet.
- Measured Columns' overflow now scrolls in column two rather than being
quietly capped, so nothing is hidden, and column one now genuinely fills
(~88% of its budget on the band tour, the rest being a block that honestly
doesn't fit). The split is still **fill-and-spill**, not balanced, which
means a *short* answer leaves column two thin — the weekend answer spills
only three blocks. That's content length rather than a layout fault, but
evening the two out is a small change to where the split index lands if it
ever looks wrong on the floor.
- The weekend answer is still mostly hand-written content in the older
`items` shape (only its tail came from Figma), and its `promptLines` in
`types.ts` are truncated mid-sentence — they don't match what `page.tsx`
types into the compose bar. Worth a pass against the design file, since
the two gaps found there turned up two more sentences that were missing.
- The weekend answer's "The weekend" list renders without bullet markers
(`bulleted: false`) while the design file draws markers on all three of its
lists. Left as-is rather than changed unasked, but it's a fidelity gap.

## Deploying

- GitHub: `[devinNRG/googleVerizonDemo](https://github.com/devinNRG/googleVerizonDemo)`, `main` branch.
- Vercel: linked to the GitHub repo. **Project Settings → General → Framework
Preset must be "Next.js"** — it was previously set to something else,
which built successfully but 404'd on every route (Vercel was serving from
a static-site output path that doesn't exist for this app). If a fresh
deployment 404s despite a green "Ready" build, check that setting first.

