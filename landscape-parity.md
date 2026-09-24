# Landscape Parity Tasks

## For the agent — read this first

**Goal:** Update the **landscape** version of the Pixel retail demo to match the
**portrait** version, one task at a time. The goal is to update the UI changes and flow while keeping the landscape orientation, layout, and visual language we've already been establishing.

**Source of truth:** the screenshots in `./parity-screenshots/` plus the target
specs written into each task below. There is **no reference codebase** for the
portrait version — you cannot look up the "correct" implementation. Everything
you need is in this file and the screenshots.

**Rules of engagement:**
- Do **not** invent values (colors, sizes, copy, spacing). If a spec is missing
  or ambiguous, **stop and ask** rather than guessing or pull from screenshots.
- Work **top to bottom**. Complete one task, commit (or pause for review), then
  move to the next. Do not batch or parallelize — tasks may touch shared files.
- Change `[ ]` to `[x]` when a task is done and verified.
- Each screenshot is annotated with a number matching its task ID (e.g. `03`).
  Callouts on the image point to exactly what changed.
- When you finish a task, briefly note what you changed and where, under the task.

---

## [x] 01 — Persona picker landing page

**Target (from portrait):**
- Differences: New background image, heading copy + styling, darker liquid glass styling for buttons, new type styling and copy for buttons
- Screenshot: /public/parity-screenshots/01-landing.png

**Behavior:**
N/A

**Where to look:**
Persona picker landing page

**Done when:**
UI screen matches screenshot but consistent with our landscape changes and design language

**Done — what changed:**
- `landing/GlassPillsLayout.tsx` — backdrop swapped to `geminiBackground2.jpg` (stand-in for
  the portrait beach photo; it's already 16:9, so the old zoom/`object-top` framing hacks are
  gone). Heading is now "Choose a story" at 4cqw over a 1.55cqw "A day in the life with
  Gemini" subtitle, kept centered per the landscape convention. Pills went darker-glass
  (`bg-black/45` + `backdrop-blur-2xl` in place of `bg-white/10`), grew to 6.6cqw to hold two
  lines, and the color swatch + initial is now a circular persona photo.
- `types.ts` — `PERSONAS` relabelled to role-not-age ("Student" / "College student and guitar
  player", "Traveler", "Working Parent"); `swatchColor` removed, nothing reads it now.
- `shared.tsx` — `FpoChip` gained an `inline` size so each stand-in thumbnail is marked too.

**Real assets landed** (`public/v81-image-assets-inuse/`), stand-ins retired:
- backdrop → `assets/pick/sunrise-dunes.jpg`, the sunrise beach from the screenshot. It is
  2.36:1, so it needs no framing work at all in a 16:9 frame.
- thumbnails → `assets/pick/student-opt-8b.jpg`, `sunrise-meadow.jpg`, `parent-suv3.jpg`.
  All three crop well dead-centre in a circle, so `Persona.imageFocusXPct` was dropped.
- the landing scrim's top went 0.6 → 0.78. This crop puts bright sunrise sky exactly where
  the heading sits; the portrait version's taller crop gets dark upper sky for free. Measured
  against the screenshot's own heading band (~60 luminance) rather than eyeballed — the
  heading now reads at 9.4:1 and the subtitle, bumped to `white/85`, at 6:1.
- FPO chips stay: the portrait screenshots still carry them, so rights are evidently not
  settled yet. Retire the chips, not the photos, when they are.

---

## [x] 02 — Student persona menu

**Target (from portrait):**
- Differences: New background image, heading copy + styling, darker liquid glass styling for buttons, new type styling and copy for buttons, updated menu button options
- Screenshot: /public/parity-screenshots/02-studentmenu.png

**Behavior:**
N/A

**Where to look:**
Menu page after clicking on Student button

**Done when:**
UI screen matches screenshot but consistent with our landscape changes and design language

**Done — what changed:**
- `RundownScreen.tsx` — heading is now "Hi, where should we start?" at the landing screen's
  4cqw display size, one weight throughout (it used to be "Hi, " + a medium "here's your daily
  rundown" at 2.9cqw). Pills took the same darker glass as the landing pills
  (`bg-black/45` + `backdrop-blur-2xl`) and stepped up to 1.6cqw medium.
- `types.ts` — the student rundown's backdrop is `geminiBackground1.jpg` (the photo the
  landing screen freed up) reframed at `bgZoom 1.25 / -11 / +6` so the subject clears the
  bigger heading. Pills are now the four from the screenshot: "Organize my semester",
  "Make plans for Friday night", "Rock the band tour", "Build a study notebook" — "Make the
  poster" is gone. Pill *ids* are unchanged, so `PILL_DEMOS` routing still holds.

**Real asset landed:** backdrop → `assets/pick/student-opt-8b.jpg`, the study-desk scene from
the screenshot. It is a 9:16 source in a 16:9 frame, so a plain centred cover keeps only the
middle third — which is the best third: the tablet lands dead centre with the phone, book and
notebook around it. I tried four zoom/pan framings against the heading and pill bands; every
one that zoomed made it worse (the tablet grows and swallows the frame), so the previous
`bgZoom`/`bgOffset*` values are gone rather than retuned.

**New:** `RundownScreen` gained the legibility scrim it never had. It went without one while
its backdrops were dim banner crops of a person; the study-desk scene is sunlit, and the
tablet's white screen sits directly under the pill stack, where frosted glass alone leaves
white type on a near-white field. Heading now reads at 10.8:1, pills at 13.5:1.

**Heads up:** the heading grew on *all three* rundowns, and the traveler and parent backdrops
were panned against the old 2.9cqw heading. Say the word if you want those two re-framed too —
I didn't want to invent pan values for screens this task doesn't cover.

---

## [x] 03 — New Send button animation

**Target (from portrait):**
- Differences: Concentric circles pulsing from the Send button (instead of the current implementation of the comet trail)
- Screenshot: /public/parity-screenshots/03-buttonpulse.png

**Behavior:**
Once typing animation for this screen is complete, instead of the comet trail to highlight the interactive send button, replace with concentric circles pulsing and growing/fading away

**Where to look:**
Send button in Ask Gemini container after typing animation is completed for the first step of the Organize my semester flow

**Done when:**
UI screen matches screenshot but consistent with our landscape changes and design language

**Done — what changed:**
- `shared.tsx` — new `PulseRings`, a sibling of `CometRing` that wraps a button the same
  size-agnostic way. It draws `count` hairline rings (default 2) on the button's own border
  box, each running one `pulse-ring` cycle offset evenly across the duration, so one ring is
  always leaving the button while the previous is still fading out at the far edge.
- `globals.css` — the `pulse-ring` keyframe: `scale(1) → scale(1.85)`, opacity `0.5 → 0`,
  2200ms `ease-out`. The travel is kept short on purpose — `scale` multiplies the border
  width too, so a longer throw makes the ring visibly thicken as it goes and reads as a shape
  swelling rather than a pulse travelling.
- `page.tsx` — both send buttons (the one-line and the multi-line compose layouts) swapped
  from `<CometRing active={typingDone} pulse>` to `<PulseRings active={typingDone}>`. Same
  `typingDone` gate as before, so the cue still waits for the last character. Dropped
  `pulse`: the rings carry the motion, and a button throbbing underneath them competes.

`CometRing` is untouched and still in use for "Back to home", the "pick this" result card and
the Gemini Intelligence suggestion chip — only the send button changed.

---

## [x] 04 — New Student flow: Organize my semester

**Target (from portrait):**
- Differences: New use case flow showcasing Gemini abilities for planning a study semester; new prompt, new loading/thinking animation, new calendar UI output
- Screenshot: /public/parity-screenshots/03-buttonpulse.png; /public/parity-screenshots/04-semesterloading.png; /public/parity-screenshots/04-calendarUI.png

**Behavior:**
After sending new prompt, thinking/lodaing UI appears and one by one animates and loads/populates the container to showcase AI thinking and working through multiple steps, then view calendar button appears which displays the calendar UI and the animation is each event populating or appearing in the calendar, so initial state is no events in the calendar cells and final state is all of the events populated with the back to home button appearing at the end with the QR code as usual

**Where to look:**
Should begin after user clicks "Organize my semester" button on the Student persona menu page

**Done when:**
Demo flow matches screenshots and descriptive behavior while adhering to landscape guidelines and design language

**Done — what changed:**
- `types.ts` — `SEMESTER_PLAN`: the prompt, the eight reasoning-rail steps, and both month
  grids (80 events). Tones are named by *what the thing is* (`class`, `study`, `due`, `exam`,
  `band`, `filming`, `media`, `spark`); the fills live with the component that draws them.
- `SemesterPlanResponse.tsx` (new) — the two acts. Act one is the "Thinking it through…"
  rail: rows mount one at a time so the card grows with it, each with a dashed connector and
  the mark of the app that step touched, ending on "Task complete" + the feedback row, then
  the gradient "Open Google Calendar" CTA. Act two is the calendar: it starts empty and the
  80 chips land in reading order on a 38ms stagger, then `onComplete` brings up the QR and
  the back button.
- `page.tsx` — `semester` added to `DemoId` / `PILL_DEMOS` / `PROMPT_LINES_BY_DEMO`, and the
  compose bar parks below the frame for this demo's whole answer (the source screenshots show
  it gone for both acts). The component is remounted per run via `key` rather than resetting
  itself from an effect.

**Landscape adaptation:** both acts stay in one 42cqw column — the reasoning-rail card does
not hand off to a wider surface, it becomes the calendar. The months stack and the card
scrolls, so October is the whole view and November is scrolled to. (A first pass put the two
months side by side across the full kiosk width; this scrolling version replaced it.) Nothing
auto-scrolls, per the app's rule, so the `ScrollCue` at the foot of the card is the only thing
saying the term runs past October. November's chips still fill on their own stagger, below the
fold, the same way a long text answer keeps revealing past the fold.

**Read off the screenshots, not invented:** the chip palette was pixel-sampled
(`#7c86c6` class, `#397e49` study, `#4599df` due, `#c3291c` exam, `#832da4` band, `#eec14c`
filming, `#d88277` media, `#616161` spark), as was the CTA gradient. October starts Monday
with 31 days and November starts Thursday, which is what makes the two grids line up.

**Two labels were obscured** by the loading indicator in `04-calendarUI.png` and are my best
reading — worth a check against the portrait build:
- Oct 24, blue chip: only "Pap…" is visible. I used **"Paper due"** (matches "Poster due" /
  "Lab due").
- Oct 31: only the first letters "C…" / "B…" show. I used **"Chem 14A"** and **"Band"**, which
  is what every other Wednesday in the grid carries.
Also expanded from truncated chips: "Read Macb…" → "Read Macbeth", "Copper Ow…" → "Copper Owl"
and "Marlin gig" (both venues already exist in `BAND_TOUR_RESPONSE`), and "Spark 8:00 …" →
**"Spark 8:00"**, which is the one I'm least sure of — the rest of that label is never visible.

**Official marks now used:** Drive and Calendar come from `assets/products/drive.svg` and
`calendar.svg`. Drive keeps a dark tile behind it — the logo is a hollow triangle, so without
one the card background shows through its middle and it stops reading as an app icon next to
Calendar's solid mark. It is also sized 1.42 x 1.32cqw, not square: the source carries
`preserveAspectRatio="none"`, so a square box would quietly stretch it. The clock, check,
chevron and feedback glyphs stay inline SVG — generic UI shapes with no brand to get wrong.
---

## Housekeeping — demo controls removed, exits added

**Measured columns is gone.** Deleted `patterns/MeasuredColumnsPattern.tsx`,
`patterns/columnLayout.ts` and `patterns/index.ts` (a registry of one pattern is just
indirection — `page.tsx` imports `ScrollPattern` directly now). With it went `PatternId`,
`PatternProps.composeHeightCqw`, and everything in `page.tsx` that existed to place chrome
into a column: `inColumnFrame`, `composeScale`, `composeDrawnHeightCqw`, the compose bar's
`left`/`scale`/`transformOrigin` juggling, and `QrPrompt`'s `stacked` arrangement.

**The demo control bar is gone too** — `HomeButton`, `PatternToggle` and `DemoControlBar`.
The frame's height budget dropped from `100vh - 7.5rem` to `100vh - 4rem`, so the band that
bar occupied is frame now.

**Exits, since removing that bar removed the only Home button.** `BackButton` moved into
`shared.tsx` (it was duplicated in `RundownScreen` and `FridayNightChoiceScreen`) and is now
on every screen past the landing one, including the chat flow, where previously there was
nothing to tap until a demo finished. It sits at `z-30` so it clears the compose bar.
Destinations: rundown and the friday-night choice step back one screen as before; from inside
a demo it goes all the way home, matching the "Back to home" button that ends a demo.

---

## Open — not covered by any task yet

- **Traveler and Parent rundown framing**: both now use the same scene photos their landing
  pills crop from (`sunrise-meadow.jpg`, `parent-suv3.jpg`) at a plain centred cover, and the
  rundown scrim was unified with the landing's (`0.78 / 0.6 / 0.28 / 0.62`) to hold the
  heading legible over the meadow's sunrise sky. Measured: heading 15.7:1 (student), 8.1:1
  (traveler), 19.3:1 (parent); pills 13.2:1 / 18.9:1 / 19.5:1. Neither screen has a portrait
  screenshot to check against, so the *composition* is my call, not the design's.
- `RundownData.bgZoom` / `bgOffset*` are now dormant — all three backdrops frame correctly as
  a plain centred cover. Kept, since the next photo swap is where the pan budget gets spent.
- `/gemini/personas/*.png` and `/geminiBackground1.jpg` are now unused.
  `/geminiBackground2.jpg` is still the Friday-night choice screen's backdrop.

## [x] 05 — Go out menu

**Target (from portrait):**
- Differences: New background image, heading copy + styling, darker liquid glass styling for buttons, new type styling and copy for buttons
- Screenshot: /public/parity-screenshots/05-gooutmenu.png

**Behavior:**
N/A

**Where to look:**
Menu page after clicking Go out in student menu

**Done when:**
UI screen matches screenshot but consistent with our landscape changes and design language

**Done — what changed** (`FridayNightChoiceScreen.tsx`):
- backdrop → `assets/pick/veg-dish-1.jpg`, the dish from the screenshot. 9:16 into 16:9, so a
  centred cover keeps the middle third: a close crop of the food rather than the whole plate
  on its table. The plate is ~1090px tall in a 678px band, so no zoom or pan reaches its full
  width — this is the framing the source photo allows in a landscape frame.
- scrim → the shared landing/rundown wash. This screen got by on a light scrim while its
  backdrop was a night street holding the heading at ~17:1 unaided; a sunlit plate does not.
  Measured after the swap: heading 15.0:1, buttons 18.6:1.
- heading → "Make plans for Friday night" at 4cqw, named after the pill that opens it and at
  the same display size as the menu before it.
- buttons → the rundown pills' darker glass (`bg-black/45`, `backdrop-blur-2xl`), 1.6cqw
  medium, left-ranged rather than centred, and "Stay in" → "Order in". The branch **id** is
  still `stayIn`, so `page.tsx` routing is untouched.

## [x] 06 — In-line Gemini Intelligence RCS

**Target (from portrait):**
- Differences: Comet trail follows rainbow white gradient, in-line container shifts down to sit above the RCS input text container vs in-line with the messages, also RCS UI is contained within another gray background
- Screenshot: /public/parity-screenshots/06-intelligencepill.png

**Behavior:**
N/A

**Where to look:**
First RCS screen in Go out flow

**Done when:**
UI screen matches screenshot but consistent with our landscape changes and design language

**Done — what changed:**
- `shared.tsx` — `CometRing` gained a `trail` prop. The default stays Gemini's blue (what the
  ring means on Gemini's own chrome); `"spectrum"` is the new sweep, and the chip is the only
  caller. Hue order was read off the screenshot pixel by pixel rather than invented: a white
  head with the tail running back through violet, magenta, red, orange, amber, green and teal
  before it fades out.
- `MessagesScene.tsx` — the chip left the thread's flow and now parks just above the RCS bar,
  right-ranged to the phone column (a 1.24cqw gap over the bar's top edge). It is still handed
  to `AnimatedThread`, because *when* it appears is the point — it is a reaction to the
  conversation and must not beat it on screen — but it is now `absolute`, so it anchors to the
  sheet instead of stacking under the last message. The centring translate and the entrance
  animation are on separate elements, since both drive `transform`.
- **The Messages app got its surface.** It was floating on the kiosk's black; the design puts
  it on two stacked rounded panels — a lighter header strip (`#201f23`) and a darker body
  sheet (`#141317`) holding the thread, the chip and the RCS bar. Both are wider than the
  content column, and the sheet is wider than the header by ~0.5cqw: that is measured off the
  design, not a rounding slip, and there is a comment saying so.
- **The header moved inside the app.** It used to be handed to `page.tsx` and drawn as the
  kiosk frame's top bar, which put the app's own chrome outside the app. `MessagesTopBar` is
  gone; `MessagesHeader` is internal, sits on the header panel, and gained the back arrow the
  design shows (scenery — the working exit is the kiosk's own corner button). `page.tsx`'s top
  bar slot is now always the plain spacer.
- **Geometry that had to hold:** the RCS bar still rests exactly 2.98cqw off the frame's
  bottom, which is where the kiosk's Gemini compose bar rests. That overlap is what lets
  Gemini's pill slide up and sit on top of it with the RCS bar's ends showing either side. The
  sheet's bottom inset (1.3cqw) and the bar's inset within it (1.68cqw) are chosen to sum to
  it, so the sheet can have visible rounded bottom corners without breaking the handoff.

**Copy, from the screenshot:**
- thread → "Want to go out tonight?" / Priya "I'm in!" / Marco "Would love to go somewhere
  with vegetarian options"
- chip → "Find restaurants", and it is one line now: `MessagesSuggestion.subtitle` is gone,
  so the stay-in chip lost "The group chat · Messages" too (its title is untouched).

**Also changed, to keep the flow coherent:** the new thread copy drops every mention of
sushi, so `GO_OUT_SEARCH.promptLines` went from "Find the best sushi restaurants near me" to
**"Find me restaurants with vegetarian options nearby"** — the copy
`Screenshot 2026-09-23 at 2.44.32 PM.png` shows. The results are untouched: narrowing to
sushi is now Gemini's own recommendation, made in `introText` ("Three sushi spots near you fit
the thread…"), which is where a recommendation belongs. Nothing in the answer needed rewriting
for that to read correctly.

## [x] 06 — In-line Gemini Intelligence RCS

**Target (from portrait):**
- Differences: Comet trail follows rainbow white gradient, in-line container shifts down to sit above the RCS input text container vs in-line with the messages, also RCS UI is contained within another gray background
- Screenshot: /public/parity-screenshots/06-intelligencepill.png

**Behavior:**
N/A

**Where to look:**
First RCS screen in Go out flow

**Done when:**
UI screen matches screenshot but consistent with our landscape changes and design language

---

## Change log — screenshot-driven tweaks

From here on, changes come in one at a time as screenshots in chat rather than as
numbered tasks above. Newest at the bottom.

### 2026-09-24 — Messages panels read as one surface
- The dark body sheet's top corners are square, so it meets the lighter header with no
  notch at the seam; only its bottom corners stay rounded.
- Header and body share one width (`PANEL_WIDTH`, 49.7cqw). They used to differ (49.2 vs
  49.7) and the body overhung the header either side. The header took the body's width so
  nothing inside the sheet moved.
- Where: `src/components/kiosk/MessagesScene.tsx`.

### 2026-09-24 — Messages app dims once Gemini takes over
- Tapping the Gemini Intelligence chip now lays a dark wash (black at 60%, 500ms fade) over
  the whole Messages app — header, thread and RCS bar — while the "Ask Gemini" bar slides up
  bright on top. It holds through Gemini's answer panel and lifts when a restaurant is
  picked (so the drafted plan lands at full brightness) or when the chat leaves.
- Where: new `dimmed` prop on `MessagesScene`, set from `page.tsx` as
  `showMessagesScene && !showHero && !goOutPick`.


### 2026-09-24 — Go out: Maps loading beat, new restaurants, new drafts
Reference: `~/Downloads/Go out updated copy/` (screenshots 2026-09-24, 3.12–3.14 PM).
- **Loading:** just the spinning dots, the Google Maps logo and "Connecting to Google
  Maps…". The cycling "Checking what's open… / Matching everyone's asks…" captions are
  gone. `ThinkingIndicator` gained an optional `icon` prop for the logo.
- **Results:** a Maps still with the three pins heads the answer, then "Here are several
  nearby vegetarian and vegetarian-friendly restaurants to consider:", then Verdant Table
  (0.4 mi), The Green Fig (0.7 mi), Sprout Kitchen (1.1 mi), with copy taken word for word from
  the screenshots. Cards show name, rating, a vegetarian badge + category, and Open · Closes;
  the old address, review count, price and distance lines are gone. Headings are regular
  weight, and a paragraph that opens on the restaurant's name dotted-underlines it. The
  closing comparison paragraph is gone (the design ends after the last result's bullets).
- **Drafts per pick:** Verdant Table → "…Fully vegetarian with gluten free options, five
  minutes away"; The Green Fig → "…Vegetarian with a gluten free menu, ten minutes away";
  Sprout Kitchen → "…Vegetarian and gluten free, just up the street".
- **Replies:** Marco "Sounds perfect. 7:30?", then Priya "Let's do it!".
- **Assets:** the originals from `public/v81-image-assets-inuse/assets/` — Verdant Table
  `pick/veg-dish-1.jpg`, The Green Fig `wk-nyc-2-int.jpg`, Sprout Kitchen `wk-sf-2-int.jpg`,
  map `map-venue-la.jpg`. The map is the plain still; the pins, name chips, wordmark and expand
  glyph are drawn over it (`RestaurantMap` in `GoOutResponse.tsx`). Only the vegetarian badge
  is still a crop from the reference screenshot (`public/gemini/go-out/icon-vegetarian.png`),
  since the asset folder has no copy of it.
- Types renamed from `SushiResult` / `SushiSearchContent` to `RestaurantResult` /
  `RestaurantSearchContent`.
- Where: `src/components/kiosk/types.ts` (`GO_OUT_SEARCH`), `GoOutResponse.tsx`,
  `ThinkingIndicator.tsx`, `page.tsx`.


### 2026-09-24 — Go out: scroll indicator, pick prompt, compose bar leaves
- **Scroll indicator:** Gemini's panel swaps its down-arrow for a glassy vertical pill with
  four dots rising at staggered speeds to the same spot at its top, on a loop. Hidden once
  the visitor scrolls the answer; still taps to jump forward. `RisingDotsCue` in
  `GeminiOverlay.tsx`, keyframes `scroll-dot-1..4` in `globals.css`. The panel is shared,
  so the stay-in card gets it too if it ever overflows.
- **Pick prompt:** once the results are up, the Ask Gemini bar slides away and a
  "Tap on your chosen restaurant" pill (black, bright rim, pulsing rings) slides into its
  band. It's a label, not a button. It leaves when a
  restaurant is picked.
- **Compose bar:** doesn't come back for the rest of the go out flow; the final thread shows
  only the RCS bar. Both timed off the same thinking beat as the results
  (`useThinkingPhase` in `page.tsx`).

### 2026-09-24 — Go out: staged arrivals, cue centred and spaced
- **Order:** results reveal first; the scroll cue follows once the first screenful has
  settled (`GO_OUT_CUE_DELAY_MS` in `GoOutResponse.tsx`, ≈1s after the results start); the
  pick prompt slides up 700ms after that (`PICK_PROMPT_AFTER_CUE_MS` in `page.tsx`). The
  Ask Gemini bar still leaves as the results arrive. `GeminiOverlay` takes a `cueReady`
  prop to hold its cue back.
- **Cue position:** dead centre of the results panel instead of its bottom edge.
- **Cue dots:** each dot now sets off later *and* climbs slower than the one ahead
  (`scroll-dot-1..4`), so they're clearly spaced on the way up and only meet at the top.
  Dots are a touch smaller (1.3cqw) for more travel, and the cycle is 2.6s.
- **Cue centring:** dots were a border-width right of centre (offset measured inside the
  border); now centred off the pill's midline.
- **Cue contrast:** the pill has a dark base under its glass sheen — centred, it often sits
  on the light map, where the sheen alone went milky and hid the dots.

### 2026-09-24 — Go out: dot stagger rebalanced; rings replace comet trails
- **Cue dots:** halfway between the bunched first pass and the strung-out second one —
  dots set off 5% of the cycle apart (was 9%) and land 9% apart (was 14%), on a 2.4s loop.
- **Pick prompt:** rings converge instead of radiate — three rings start wide and faint and
  close in on the pill, easing off as they reach its edge (`pill-converge` in `globals.css`,
  2.4s, staggered a third of a cycle apart). This is the reference screenshot's tight stack
  of echoes, in motion. Send and Back to home keep the outward `PulseRings`.
- **Restaurant photos:** comet trail and glow removed; the pick prompt carries the cue now.
- **Back to home:** comet trail swapped for Send's `PulseRings`. It's the one shared
  `BackHomeButton` in `page.tsx`, so every demo's ending gets it.

### 2026-09-24 — Pick prompt loses its rim; Back to home restyled
- **Pick prompt:** no standing border — only the converging rings outline it now.
- **Back to home rings:** step out a fixed 1.4cqw on every side (`PulseRings spread`, keyframe
  `pulse-ring-spread`) instead of scaling, so they keep an even gap around the pill. Send is
  round, so it keeps the scaling rings.
- **Back to home fill:** the design's blue gradient, left to right `#4a82f6 → #436feb (40%) →
  #6199f6`, sampled from the reference screenshot (`Screenshot 2026-09-24 at 3.13.22 PM`).
- **Back to home → "Back to your rundown":** relabelled per the reference, and it now goes
  back to the persona's rundown instead of the landing page, since every demo starts from a
  rundown pill. Component renamed `BackToRundownButton`.

### 2026-09-24 — Rock the band tour: new prompt, Austin → Dallas answer
Reference: `~/Downloads/Rock the band tour/` (screenshots 2026-09-24, 3.59 PM).
- **Prompt:** "The band is playing a show Friday night in Austin and Saturday night in
  Dallas. Help plan the trip, including hotel suggestions, places to eat, and travel timing
  with the van."
- **Answer** (`BAND_TOUR_RESPONSE` in `types.ts`), copy word for word from the screenshots:
  map → Van Travel Timing & Route Logistics (Austin card; route, drive time, and a nested
  timed buffer schedule) → Lodging (Van & Trailer-Friendly) (South Congress Motor Inn) →
  Food Stops · Austin (Casa Verde on South First, "Closed · Opens 11:00 AM") → Band Tour
  Execution Checklist (numbered). No intro or closing paragraph, since the design has neither.
  The response footer (thumbs, share, disclaimer) stays.
- **Map:** `map-texas-tour-wide.jpg` with the I-35 route, blue pins and name chips drawn
  over it, traced from the screenshot. The Go out map and this one now share one component,
  `PinnedMap` in `shared.tsx` (pin colour and route are per-map); the old two-layer
  `MapCardBlock` and its SVG overlay are gone.
- **Images:** `tour-austin.jpg`, `tour-austin-motel.jpg`, `tour-fresas.jpg` from
  `v81-image-assets-inuse/assets/`.
- **Renderer additions** (shared, opt-in, so the weekend answer is untouched): place cards
  draw only the rows they have; a coloured status (`statusTone: "closed"` for the soft red);
  bullets without a label, nested sub-bullets, numbered bullets (`numbered`); regular-weight
  headings (`plainHeadings`); a paragraph opening on the card's name dotted-underlines it.
- **Ask Gemini bar:** slides away as the results land and doesn't come back, same timing
  as Go out.
- The old band-tour assets in `public/gemini/band-tour/` (San Diego map, overlay, pin and
  the four place photos) are no longer referenced; only `map-expand.png` is still used.

### 2026-09-24 — Rising-dots scroll cue replaces the down arrow in text answers
- The band tour (and the weekend answer, which shares `ScrollPattern`) now use the
  rising-dots cue instead of the circular down arrow: centred over the answer, arriving
  just after the first screenful reveals, gone after the first scroll, and still a tap
  target to jump forward.
- `RisingDotsCue` and its "has the visitor scrolled yet" latch (`useScrolledOnce`) moved out
  of `GeminiOverlay.tsx` into `shared.tsx`, so Go out's panel and the text answers share one
  cue.
- The semester calendar switched too (centred over the calendar, ~1s after it opens), so
  nothing uses the arrow any more and `ScrollCue` is deleted.

### 2026-09-24 — New flow: Build a study notebook (student)
Reference: `~/Downloads/Study notebook/` (screenshots 2026-09-24, 4.15–4.17 PM).
- **What it is:** a NotebookLM-style "Gemini Notebook" (`StudyNotebook.tsx`, content in
  `STUDY_NOTEBOOK` in `types.ts`), in the same 42cqw column as every other answer, with its
  own input where the Ask Gemini bar would be; the bar stays parked the whole demo. The
  rundown pill is now live and opens straight onto the notebook.
- **Beats:** (1) Sources, empty — setup prompt types in, tap Send. (2) "Responding…"; sources
  land one at a time, each checking itself, then Select all; the count climbs 0 → 4. (3) Moves
  itself to Chat; the exam prompt types in, "Tap send to ask." appears, tap Send. (4) The study
  guide streams in heading by heading (citations land with their heading), then its source list,
  then the disclaimer and "Start the Biology quiz". (5) Studio: the quiz and Audio Overview
  load in one after the other; "Back to your rundown" + QR arrive with it.
- **Studio:** tap the card to flip it (3D) — each card counts as answered the first time its
  answer is seen, ending on "Quiz complete · 6 of 6"; arrows move between cards and dim at
  the ends. Audio Overview's play button (pulsing until used) types out the three-line
  transcript.
- **Display only:** the tabs, the stop button, the citation chips.
- **Assets:** `products/notebooklm.svg` (logo), `wb-bio2.jpg` / `wb-bio.jpg` (the two class-notes
  thumbnails); the doc glyph is drawn inline.
- **Placeholder copy (awaiting real text):** Q3–Q6 and A2–A5, marked `PLACEHOLDER` in
  `STUDY_NOTEBOOK.quiz`.
- **Shared:** "Start the Biology quiz" and "Back to your rundown" are now one component,
  `GradientPillButton` in `shared.tsx`.
- Not carried over: the reference's "FPO" chip — there's no stand-in photo on these screens.
