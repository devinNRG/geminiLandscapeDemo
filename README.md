# Gemini Verizon Kiosk Demo Guidelines

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

- **Landing** (`LandingScreen.tsx`): four persona cards (student, traveler,
parent, "Add yourself"). Only personas with a built rundown are tappable —
others are greyed out and functionally disabled (`disabled`, not just dim).
- **Rundown** (`RundownScreen.tsx`): each persona's own background photo +
greeting + a bottom-anchored stack of suggestion pills (works for 4 or 5
pills — the stack grows upward, not down). Same active/disabled pattern:
only pills wired to a built demo are tappable.
- **Idle/Typed/Response**: shared kiosk chrome in `page.tsx` — top bar,
compose bar that morphs from a pill into a typed message box, then the
answer. Which persona/pill was tapped decides which **demo** plays.
- **Home button** (top-left, outside the device frame) jumps back to Landing
from anywhere. It's demo-switcher-adjacent chrome, not part of the kiosk
screen itself, so it's fine for it to have hover states — nothing *inside*
the device frame should ever rely on hover (it's a touchscreen).

## The three built demos

Routing lives in `page.tsx` as `PILL_DEMOS` (pill id → `DemoId`) and
`RESPONSE_CONTENT_BY_DEMO` (which demos are a plain text answer vs. the
task-automation flow). Every other rundown pill across every persona is
intentionally disabled — only these three actually go anywhere:

1. **Weekend planning** — traveler persona, "Sort the friend's weekend" pill.
  A normal generated text answer: intro, a doc card, a few sections with
   bulleted items. Content lives in `types.ts` as `WEEKEND_RESPONSE`
   (`ResponseContent` shape).
2. **Friday night** — student persona, "Sort Friday night" pill. Branches in
  two: tapping the pill first goes to `FridayNightChoiceScreen.tsx`
   ("How should Friday night go?" — Go out / Stay in).
  - **Stay in** — an **agentic task automation** flow
  (`TaskAutomationResponse.tsx`): opens on a "Pixel Messaging" group chat
  backdrop (`MessagesScene.tsx`, which also swaps in for the kiosk's own
  top bar during that stretch), then Gemini's response is a sequence of
  status cards ("Working on your task" → "Task in progress" → "Finish up
  your task"), then a handoff to a light-themed third-party "FoodOrder"
  checkout card, and payment. Content lives in `types.ts` as
  `FRIDAY_NIGHT_TASK` (`TaskDemoContent` shape).
  - **Go out** — a **local-search** flow (`GoOutResponse.tsx`): opens on a
  *different* group chat (same `MessagesScene.tsx`, different messages —
  see `STAY_IN_MESSAGES`/`GO_OUT_MESSAGES` in `types.ts`), where a Gemini
  suggestion chip ("Sushi restaurants nearby") — not the usual idle "Ask
  Gemini" pill — is the tap target that starts it. The response is intro
  text + a map graphic + three restaurant results (`SushiSearchContent`
  in `types.ts`); only one result ("Kanpai Sushi") is wired up, same
  active/disabled convention as everywhere else. Tapping it hands off to
  a confirmation exchange drafted back into the group chat, reusing
  `MessagesScene`'s own bubble component (`ChatBubbleRow`). The result
  cards use a plain initial-letter badge in place of a photo — no real
  restaurant photography exists for this mockup, only the map graphic was
  supplied.
   Once either branch's content finishes playing out — a status card
   settling after payment, a text answer finishing its reveal, or Go out's
   group-chat confirmation — a shared "Back to home" button (plus a QR code
   prompting "Scan to try Gemini on
   your phone") appears in `page.tsx`, rather than each demo authoring its
   own exit chrome.
3. **Band tour planning** — student persona, "Plan the band tour" pill.
  Same `ResponseContent` shape and same display patterns as the weekend
   demo, just different content (`BAND_TOUR_RESPONSE`).

Weekend and band-tour answers can be viewed through either of two
**display patterns** (switchable via the picker top-right, itself only shown
while inside one of those two demos):

- **Simple scroll** (`patterns/ScrollPattern.tsx`) — single phone-width
column, scrolls for any content length. No pagination.
- **Measured columns** (`patterns/MeasuredColumnsPattern.tsx`) — reveals as
one column like an ordinary chat, then (if it overflows) slides left and
opens a second, browser-balanced column. Splits are block-atomic (a
heading or bullet is never sliced mid-line — real DOM measurement decides
where to break, not guesswork).
**Known open issue:** this pattern has no real answer for content that's
too long to fit even two columns — it currently falls back to a capped
height + scroll on column two, which quietly hides overflow rather than
solving it. Discussed fixing this by paginating in two-column *spreads*
(column 1 + 2 fill, then advance to a fresh pair) instead of
scrolling/shrinking text, but that's undecided — nothing's implemented.
Don't "fix" an overflowing demo by trimming its content to make it fit;
that was tried once and explicitly reverted — it's a layout problem, not a
content problem.

## Key files


| File                                                            | What it's for                                                                                                                                                     |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/page.tsx`                                              | The whole app: state machine, kiosk frame, compose bar, demo routing                                                                                              |
| `src/components/kiosk/types.ts`                                 | All content types **and** the actual authored content (`WEEKEND_RESPONSE`, `FRIDAY_NIGHT_TASK`, `BAND_TOUR_RESPONSE`, `PERSONAS`, `RUNDOWNS`)                     |
| `src/components/kiosk/shared.tsx`                               | Shared building blocks: `Reveal` (stagger animation), `PromptBubble`, `ContinuousFlow`/`buildContentBlocks` (flattens a `ResponseContent` into measurable blocks) |
| `src/components/kiosk/patterns/`                                | The two response display patterns + `index.ts`'s `PATTERNS` registry                                                                                              |
| `src/components/kiosk/LandingScreen.tsx`, `RundownScreen.tsx`   | Persona picker, rundown screen                                                                                                                                    |
| `src/components/kiosk/MessagesScene.tsx`                        | Friday-night demo's group-chat backdrop + its top-bar replacement                                                                                                 |
| `src/components/kiosk/TaskAutomationResponse.tsx`               | Friday-night demo's whole response (task cards, FoodOrder card)                                                                                                   |
| `src/components/kiosk/ThinkingIndicator.tsx`, `TypingLines.tsx` | The "thinking" dot animation, the character-by-character typing effect                                                                                            |
| `public/gemini/`                                                | All image/icon assets, organized by feature (`personas/`, `rundown/`, `friday-night/`) — mostly exported straight from Figma                                      |


## Conventions worth knowing before editing

- **Everything is sized in `cqw`** (CSS container query width units), scaled
from the Figma design's 1920px width via a **19.2 scale factor**
(`px / 19.2 = cqw`). Never hand-guess a px value — convert it. The kiosk
frame is the `@container`.
- **Prose wraps naturally; structured items don't.** `promptLines`/`introLines`
are authored as arrays of natural sentence chunks but get `.join(" ")`'d
and rendered as one flowing paragraph — the browser decides the line
breaks. This was a real bug: text used to be forced onto the author's
chosen line breaks regardless of actual container width, leaving ragged
short lines or awkward mid-word wraps. `Section.items`, by contrast, *are*
still intentionally pre-broken (`string[][]`) — those are short structured
facts, not prose, and are deliberately kept compact/scannable.
- `**Reveal` always mounts its children** and only toggles opacity/transform
(chosen after a page-count-flicker bug where hidden-but-unmounted content
changed measured height). That means hidden `Reveal` content still
contributes to layout unless something else (conditional rendering,
`display:none`) removes it — relevant any time you're measuring height for
pagination/splitting.
- **No hover-only affordances inside the kiosk frame** — it's a touchscreen.
Hover is fine on chrome that lives outside the device (pattern picker, Home
button).
- **Inactive content is visibly disabled, never silently missing.** Personas
and pills not yet wired to a demo are greyed out *and* have `disabled` set
— never just absent from the DOM.
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
- Measured Columns' overflow-past-two-columns problem (see above) is an open
design question, not resolved.

## Deploying

- GitHub: `[devinNRG/googleVerizonDemo](https://github.com/devinNRG/googleVerizonDemo)`, `main` branch.
- Vercel: linked to the GitHub repo. **Project Settings → General → Framework
Preset must be "Next.js"** — it was previously set to something else,
which built successfully but 404'd on every route (Vercel was serving from
a static-site output path that doesn't exist for this app). If a fresh
deployment 404s despite a green "Ready" build, check that setting first.

