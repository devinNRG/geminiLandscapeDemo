"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CalendarEvent, CalendarMonth, CalendarTone, SemesterPlanContent } from "./types";
import { RisingDotsCue, useScrollCue, useScrolledOnce } from "./shared";
import ThinkingRail, { CalendarGlyph } from "./ThinkingRail";

/** Both acts run in this one column — the same width the other task answer uses, and the
 * same card: the reasoning rail does not hand off to a wider surface, it becomes it. */
const CARD_WIDTH_CQW = 42;
/** Gap between one calendar chip appearing and the next. */
const EVENT_STAGGER_MS = 38;
const EVENT_DURATION_MS = 420;
/** Beat after the last chip lands before the exit affordances are offered. */
const CALENDAR_SETTLE_MS = 600;
// the scroll cue follows the calendar in rather than arriving with it: long enough for the
// card's fade-in and the first events to start landing, well short of the whole fill
const CALENDAR_CUE_DELAY_MS = 1000;

/** Tone → chip fill. Sampled off the design rather than picked: these eight are what make a
 * month this dense readable at a glance, so they are a fixed set, not a palette to extend. */
const TONE_FILL: Record<CalendarTone, string> = {
  class: "#7c86c6",
  study: "#397e49",
  due: "#4599df",
  exam: "#c3291c",
  band: "#832da4",
  filming: "#eec14c",
  media: "#d88277",
  spark: "#616161",
};

/** Filming's yellow is the one fill too light to carry white text. */
const TONE_INK: Partial<Record<CalendarTone, string>> = { filming: "#1f1f1f" };

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Grid track heights. A week row holds a date plus up to two chips and still leaves the
 * slack the design keeps below them, which is what stops a full month reading as a wall.
 * Tuned against the scroll viewport so October's five rows fill it exactly: the month you
 * are on should be the whole view, with November something you scroll to rather than
 * something already half in frame. Re-check it if the card's height changes. */
const HEADER_ROW_CQW = 2.2;
const ROW_CQW = 6.6;

const GRID_LINE = "#3d4043";
const SURFACE = "#1b1c1d";

/**
 * "Organize my semester" — a two-act agentic answer.
 *
 * Act one is the reasoning rail: Gemini narrating what it is doing, one row at a time, with
 * the mark of whichever Google app each step touched. It is deliberately not a spinner —
 * the demo's whole claim is that Gemini went and read the syllabuses, so the rail has to
 * show the work, and it grows as it goes rather than revealing inside a fixed box, so the
 * card visibly accumulates rather than filling a shape that was already there.
 *
 * Act two is the payoff: Google Calendar, opened on the term. It starts *empty* and the
 * events land one by one, because a calendar that is simply already full is indistinguishable
 * from a screenshot — watching it fill is what shows the work landing somewhere real.
 *
 * Both acts stay in one 42cqw column and the months stack, so the calendar is read a month
 * at a time and November is scrolled to. Nothing auto-scrolls here (the app's rule
 * throughout), so the cue at the foot of the card is the only thing saying the term carries
 * on past October — same job it does under a long text answer.
 */
export default function SemesterPlanResponse({
  content,
  active,
  onComplete,
}: {
  content: SemesterPlanContent;
  active: boolean;
  onComplete?: () => void;
}) {
  // Nothing resets this state on the way out: page.tsx remounts the whole component per
  // run, which is what starts a re-run from a blank rail and an empty calendar.
  const [phase, setPhase] = useState<"thinking" | "calendar">("thinking");

  // how many chips the calendar will fill in, which is all the parent needs of them: it is
  // what says when the last one has landed and the demo is over
  const eventCount = useMemo(
    () => content.months.reduce((n, month) => n + month.events.length, 0),
    [content.months],
  );

  // the demo is only over once the last chip has landed, not when the calendar opens
  useEffect(() => {
    if (!active || phase !== "calendar") return;
    const t = setTimeout(
      () => onComplete?.(),
      eventCount * EVENT_STAGGER_MS + EVENT_DURATION_MS + CALENDAR_SETTLE_MS,
    );
    return () => clearTimeout(t);
  }, [active, phase, eventCount, onComplete]);

  if (phase === "thinking") {
    return (
      <div className="flex h-full items-center justify-center px-[10cqw] pt-[2cqw] pb-[3cqw]">
        <div style={{ width: `${CARD_WIDTH_CQW}cqw` }}>
          <ThinkingRail
            steps={content.steps}
            active={active}
            ctaLabel="Open Google Calendar"
            onCta={() => setPhase("calendar")}
          />
        </div>
      </div>
    );
  }

  return <CalendarCard content={content} />;
}

/**
 * Act two, in its own component so it mounts the moment the calendar opens — `useScrollCue`
 * wires up its observers once, on mount, so a scroll box that only appears later would never
 * get them and the cue would sit silent over a calendar that plainly does scroll. Mounting
 * here is also what starts the chips' fill: their stagger is CSS animation delay, counted
 * from the moment they are first painted.
 */
function CalendarCard({ content }: { content: SemesterPlanContent }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const { hasMore, scrollForward } = useScrollCue(scrollRef, innerRef);
  // this component mounts once per calendar, so the latch is armed for its whole life
  const scrolled = useScrolledOnce(scrollRef, true);
  const [cueReady, setCueReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCueReady(true), CALENDAR_CUE_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Every chip's place in the fill order — by month, then by day, which is the order someone
  // reads a calendar in and so the order it should appear to be written in. A map rather than
  // a list to search: it is looked up once per chip while rendering, and there are eighty.
  const fillIndex = useMemo(() => {
    const index = new Map<string, number>();
    content.months.forEach((month, monthIndex) => {
      for (const event of [...month.events].sort((a, b) => a.day - b.day)) {
        index.set(`${monthIndex}:${event.day}:${event.label}`, index.size);
      }
    });
    return index;
  }, [content.months]);

  return (
    <div className="flex h-full flex-col items-center pt-[1.2cqw] pb-[2.5cqw] [animation:fade-in-up_450ms_ease-out]">
      <div className="flex min-h-0 flex-1 flex-col" style={{ width: `${CARD_WIDTH_CQW}cqw` }}>
        {/* ranged against the card's left edge rather than centred over it, so the title
            reads as a label on the card below it and not as a heading for the screen */}
        <div className="mb-[1.2cqw] flex shrink-0 items-center gap-[1.1cqw]">
          <h2 className="text-[1.9cqw] leading-[2.4cqw] font-medium text-white">{content.title}</h2>
          <span className="rounded-full border border-white/30 px-[1.1cqw] py-[0.3cqw] text-[1.05cqw] text-white/75">
            Complete
          </span>
        </div>

        <div
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.4cqw]"
          style={{ backgroundColor: SURFACE }}
        >
          {/* outside the scroll box: the app's own chrome stays put while the term scrolls
              underneath it, the way the real Calendar header does */}
          <div
            className="flex shrink-0 items-center gap-[1cqw] px-[1.4cqw] py-[1.1cqw]"
            style={{ borderBottom: `0.07cqw solid ${GRID_LINE}` }}
          >
            <CalendarGlyph />
            <span className="text-[1.3cqw] text-[#c4c7c5]">Google Calendar</span>
          </div>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-[1.4cqw] pt-[1.2cqw] pb-[2.6cqw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div ref={innerRef} className="flex flex-col gap-[1.6cqw]">
              {content.months.map((month, monthIndex) => (
                <MonthGrid key={month.name} month={month} monthIndex={monthIndex} fillIndex={fillIndex} />
              ))}
            </div>
          </div>

          {/* the only thing saying the term runs past October — nothing here auto-scrolls. Centred
              over the calendar, where the swipe would start; gone after the first scroll, and
              a tap target for anyone who would rather not swipe */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <RisingDotsCue show={cueReady && hasMore && !scrolled} onClick={scrollForward} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthGrid({
  month,
  monthIndex,
  fillIndex,
}: {
  month: CalendarMonth;
  monthIndex: number;
  fillIndex: Map<string, number>;
}) {
  // leading blanks are real cells (the design draws them); the trailing ones after the last
  // day are not, which is what makes the final row stop where the month does
  const cellCount = month.startWeekday + month.days;
  const rows = Math.ceil(cellCount / 7);
  const byDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const event of month.events) {
      const list = map.get(event.day);
      if (list) list.push(event);
      else map.set(event.day, [event]);
    }
    return map;
  }, [month.events]);

  return (
    <div className="flex min-w-0 flex-col">
      <p className="mb-[0.8cqw] shrink-0 text-[1.25cqw] leading-[1.6cqw] text-[#c4c7c5]">{month.name}</p>
      {/* Explicit track heights, and the grid box wraps exactly the rows this month has —
          November is three rows and simply ends there, rather than being stretched to
          October's five and trailing its outer border through empty space. */}
      <div
        className="grid w-full grid-cols-7"
        style={{
          gridTemplateRows: `${HEADER_ROW_CQW}cqw repeat(${rows}, ${ROW_CQW}cqw)`,
          borderTop: `0.07cqw solid ${GRID_LINE}`,
          borderLeft: `0.07cqw solid ${GRID_LINE}`,
        }}
      >
        {WEEKDAYS.map((label, i) => (
          <div
            key={`wd-${i}`}
            className="flex items-center justify-center text-[0.95cqw] text-[#9aa0a6]"
            style={{ borderRight: `0.07cqw solid ${GRID_LINE}`, borderBottom: `0.07cqw solid ${GRID_LINE}` }}
          >
            {label}
          </div>
        ))}

        {Array.from({ length: cellCount }, (_, i) => {
          const day = i - month.startWeekday + 1;
          const events = day > 0 ? (byDay.get(day) ?? []) : [];
          return (
            <div
              key={`d-${i}`}
              className="flex min-w-0 flex-col items-stretch gap-[0.2cqw] overflow-hidden px-[0.3cqw] pt-[0.15cqw] pb-[0.25cqw]"
              style={{ borderRight: `0.07cqw solid ${GRID_LINE}`, borderBottom: `0.07cqw solid ${GRID_LINE}` }}
            >
              {day > 0 && (
                <span className="text-center text-[1cqw] leading-[1.35cqw] text-white">{day}</span>
              )}
              {events.map((event) => (
                <span
                  key={event.label}
                  className="truncate rounded-full px-[0.5cqw] py-[0.12cqw] text-[0.8cqw] leading-[1.15cqw]"
                  style={{
                    backgroundColor: TONE_FILL[event.tone],
                    color: TONE_INK[event.tone] ?? "#ffffff",
                    // `both` fill is what holds the chip invisible through its delay — without
                    // it every chip is painted at full opacity until its turn comes round and
                    // the calendar starts full rather than filling
                    animation: `fade-in-up ${EVENT_DURATION_MS}ms ease-out both`,
                    animationDelay: `${(fillIndex.get(`${monthIndex}:${event.day}:${event.label}`) ?? 0) * EVENT_STAGGER_MS}ms`,
                  }}
                >
                  {event.label}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
