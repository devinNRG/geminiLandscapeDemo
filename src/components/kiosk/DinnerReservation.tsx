"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PROVIDER_COIN, PROVIDER_LABEL, type DinnerContent, type DinnerPlace } from "./types";
import { PromptBubble, Reveal, RisingDotsCue, revealDurationMs, useScrollCue, useScrolledOnce, useThinkingPhase } from "./shared";
import ThinkingIndicator from "./ThinkingIndicator";

/** The column every other answer is authored for. */
const COLUMN_CQW = 42;
/** The cue follows the answer in rather than arriving with it — same beat as go out's. */
const CUE_DELAY_MS = revealDurationMs(2) + 300;
/** Held on "Reservation confirmed" before the sheet and the answer give way to the widget
 * screen, so the confirmation is read as the outcome rather than flashing past. */
const CONFIRMED_HOLD_MS = 1800;
/** The crossfade between the two. */
const HANDOFF_MS = 600;

type Booking = { place: DinnerPlace; time: string };

/**
 * "Make a dinner reservation" — the one answer in the demo that transacts.
 *
 * A grounded search answer (the "25 sites" header is the design's own) listing four Little
 * Havana restaurants, each with the times its booking provider actually holds. Every time
 * is live: tapping one opens that provider's sheet — Resy, Tock or OpenTable — carrying
 * that restaurant and that time, because a booking flow where the choice doesn't reach the
 * confirmation is a slideshow. Confirming holds a beat, then everything fades and hands off
 * to the widget setup screen, which is where this persona's story ends.
 */
export default function DinnerReservation({
  content,
  active,
  onComplete,
}: {
  content: DinnerContent;
  active: boolean;
  onComplete?: () => void;
}) {
  const { showThinking, contentShown } = useThinkingPhase(active);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [handedOff, setHandedOff] = useState(false);
  // the crossfade is over and the answer is gone for good, so it can stop being rendered
  const [answerGone, setAnswerGone] = useState(false);

  // Nothing in the answer may stay tappable once it is on its way out — or once the demo
  // itself is over. page.tsx keeps a finished response mounted (faded, pointer-events none),
  // and `pointer-events: auto` on a descendant re-enables hit-testing through that, so live
  // buttons here would go on swallowing taps meant for whatever screen came next.
  const interactive = active && !handedOff;

  // the confirmation is the end of the booking, not the end of the demo: it holds, then the
  // answer and the sheet both go and the widget screen takes the frame
  useEffect(() => {
    if (!confirmed) return;
    const t = setTimeout(() => setHandedOff(true), CONFIRMED_HOLD_MS);
    return () => clearTimeout(t);
  }, [confirmed]);

  // the demo is over once the visitor is on the widget screen — that screen carries its own
  // QR, so page.tsx drops the corner one for this demo rather than showing two
  useEffect(() => {
    if (!handedOff) return;
    const t = setTimeout(() => {
      setAnswerGone(true);
      onComplete?.();
    }, HANDOFF_MS);
    return () => clearTimeout(t);
  }, [handedOff, onComplete]);

  return (
    <div className="relative h-full">
      {/* faded rather than cut for the handoff, then dropped once the crossfade is done */}
      {!answerGone && (
        <div
          className="absolute inset-0 transition-opacity"
          style={{
            transitionDuration: `${HANDOFF_MS}ms`,
            opacity: handedOff ? 0 : 1,
            // never "auto": that would override the `none` page.tsx puts on a finished
            // response and leave this column swallowing taps on the next screen. Interactive
            // means "inherit", which is the ancestor's own answer.
            pointerEvents: interactive ? undefined : "none",
          }}
        >
          <Results
            content={content}
            active={active}
            showThinking={showThinking}
            shown={contentShown}
            interactive={interactive}
            onPick={(place, time) => setBooking({ place, time })}
          />

          {booking && (
            <BookingSheet
              content={content}
              booking={booking}
              confirmed={confirmed}
              interactive={interactive}
              onConfirm={() => setConfirmed(true)}
              onClose={() => setBooking(null)}
            />
          )}
        </div>
      )}

      {handedOff && (
        <div className="absolute inset-0" style={{ animation: `fade-in-up ${HANDOFF_MS}ms ease-out both` }}>
          <WidgetSetup widget={content.widget} />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- the answer */

function Results({
  content,
  active,
  showThinking,
  shown,
  interactive,
  onPick,
}: {
  content: DinnerContent;
  active: boolean;
  showThinking: boolean;
  shown: boolean;
  interactive: boolean;
  onPick: (place: DinnerPlace, time: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const { hasMore, scrollForward } = useScrollCue(scrollRef, innerRef);
  const scrolled = useScrolledOnce(scrollRef, shown);

  const [cueReady, setCueReady] = useState(false);
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setCueReady(true), CUE_DELAY_MS);
    return () => {
      clearTimeout(t);
      setCueReady(false);
    };
  }, [shown]);

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto px-[10cqw] pt-[2.3cqw] pb-[4cqw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div ref={innerRef} className="mx-auto w-full" style={{ maxWidth: `${COLUMN_CQW}cqw` }}>
          {/* the prompt carries over from the compose bar into its own bubble, so sending it
              hands off to the answer rather than leaving the screen empty while Gemini thinks */}
          <Reveal show={active} index={0}>
            <PromptBubble lines={content.promptLines} />
          </Reveal>

          {showThinking && (
            <div className="mt-[1.3cqw]">
              <Reveal show={active} index={0.5}>
                <ThinkingIndicator captions={["Thinking…", "Checking who has a table…"]} />
              </Reveal>
            </div>
          )}

          <Reveal show={shown} index={0} style={{ marginTop: "1.6cqw" }}>
            <SourcesHeader content={content} />
          </Reveal>

          <Reveal show={shown} index={1} style={{ marginTop: "1.4cqw" }}>
            <p className="text-[1.3cqw] leading-[1.9cqw] text-white">{content.introText}</p>
          </Reveal>

          {content.places.map((place, i) => (
            <Reveal key={place.id} show={shown} index={2 + i} style={{ marginTop: "2.4cqw" }}>
              <PlaceBlock
                place={place}
                availableLabel={content.availableLabel}
                divider={i > 0}
                interactive={interactive}
                onPick={(time) => onPick(place, time)}
              />
            </Reveal>
          ))}
        </div>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <RisingDotsCue show={cueReady && hasMore && !scrolled} onClick={scrollForward} />
      </div>
    </div>
  );
}

/** The grounded-search header: how many sites were read, marked with the providers whose
 * slots this answer ends up offering. */
function SourcesHeader({ content }: { content: DinnerContent }) {
  const providers = [...new Set(content.places.map((p) => p.provider))];
  return (
    <div className="flex items-center gap-[0.9cqw]">
      <span className="flex items-center">
        {providers.map((provider, i) => (
          <img
            key={provider}
            src={PROVIDER_COIN[provider]}
            alt=""
            // overlapped, the way a stacked source list is drawn; the ring is the page's own
            // black showing between them
            className="h-[1.7cqw] w-[1.7cqw] rounded-full ring-[0.2cqw] ring-black"
            style={{ marginLeft: i === 0 ? 0 : "-0.5cqw" }}
          />
        ))}
      </span>
      <span className="flex-1 text-[1.25cqw] text-white">{content.sourceCount}</span>
      <svg viewBox="0 0 24 24" className="h-[1.5cqw] w-[1.5cqw] text-[#9a9b9c]" fill="currentColor" aria-hidden>
        <circle cx="12" cy="5" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="12" cy="19" r="1.7" />
      </svg>
    </div>
  );
}

/** One restaurant: the card, the paragraph, then its bookable times. */
function PlaceBlock({
  place,
  availableLabel,
  divider,
  interactive,
  onPick,
}: {
  place: DinnerPlace;
  availableLabel: string;
  divider: boolean;
  interactive: boolean;
  onPick: (time: string) => void;
}) {
  return (
    <div className={divider ? "border-t-[0.07cqw] border-[#2f2f2f] pt-[2.4cqw]" : ""}>
      <PlaceCard place={place} />

      <p className="mt-[1.4cqw] text-[1.3cqw] leading-[1.9cqw] text-white">{place.body}</p>

      <p className="mt-[1.8cqw] text-[1.2cqw] text-[#9a9b9c]">{availableLabel}</p>

      {/* the only live thing in the answer: three across, as drawn */}
      <div className="mt-[0.9cqw] grid grid-cols-3 gap-[0.8cqw]">
        {place.times.map((time) => (
          <button
            key={time}
            type="button"
            onClick={() => onPick(time)}
            aria-label={`Book ${place.name} at ${time}`}
            tabIndex={interactive ? 0 : -1}
            style={{ pointerEvents: interactive ? "auto" : "none" }}
            className="flex items-center gap-[0.7cqw] rounded-full bg-[#2b2c2f] px-[1.1cqw] py-[0.7cqw] text-left transition-transform duration-150 active:scale-[0.97]"
          >
            <img src={PROVIDER_COIN[place.provider]} alt="" className="h-[1.6cqw] w-[1.6cqw] shrink-0 rounded-full" />
            <span className="text-[1.2cqw] text-white">{time}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Stars() {
  return (
    <span className="flex items-center gap-[0.1cqw]">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="h-[1.15cqw] w-[1.15cqw]" fill="#f5b400" aria-hidden>
          <path d="M12 2.6l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6 6.1 20.8l1.2-6.6L2.5 9.6l6.6-.9z" />
        </svg>
      ))}
    </span>
  );
}

/** The Maps-style card. Its own shape rather than the shared `PlaceCardRow`: this one is a
 * search result with stars and a review count, where that one is a card inside an answer. */
function PlaceCard({ place, compact = false }: { place: DinnerPlace; compact?: boolean }) {
  const size = compact ? 8.6 : 9.6;
  return (
    <div className="flex items-start gap-[1.4cqw]">
      <img
        src={place.image}
        alt=""
        className="shrink-0 rounded-[1.1cqw] object-cover"
        style={{ height: `${size}cqw`, width: `${size}cqw` }}
      />
      <div className="flex min-w-0 flex-col gap-[0.2cqw] pt-[0.2cqw]">
        <span className="text-[1.55cqw] leading-[2.1cqw] font-medium text-white underline decoration-white/50 decoration-dotted underline-offset-[0.4cqw]">
          {place.name}
        </span>
        <span className="flex items-center gap-[0.5cqw] text-[1.2cqw] text-white">
          {place.rating}
          <Stars />
          <span className="text-[#c4c7c5]">{place.reviews}</span>
        </span>
        <span className="text-[1.2cqw] text-[#c4c7c5]">{place.meta}</span>
        <span className="text-[1.2cqw]">
          <span className="text-[#56b969]">Open</span> <span className="text-[#c4c7c5]">&middot; {place.address}</span>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- the booking sheet */

/**
 * The provider's own booking sheet, over the answer. Everything in it comes from the slot
 * that was tapped — the provider's name and mark, the restaurant, the time — so the three
 * providers and twenty-four slots all reach the confirmation they should.
 *
 * The rows are display: on a kiosk there is nothing behind a date picker to pick from, and
 * the one thing worth doing here is confirming.
 */
function BookingSheet({
  content,
  booking,
  confirmed,
  interactive,
  onConfirm,
  onClose,
}: {
  content: DinnerContent;
  booking: Booking;
  confirmed: boolean;
  interactive: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { place, time } = booking;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      {/* the answer is still there behind it, a step back rather than gone */}
      <div className="absolute inset-0 bg-black/55 [animation:fade-in-up_250ms_ease-out]" />

      <div className="relative flex w-[36cqw] flex-col rounded-[2cqw] border border-white/10 bg-[#1b1c1d] px-[1.9cqw] pb-[1.9cqw] shadow-[0_0.6cqw_2.4cqw_rgba(0,0,0,0.6)] [animation:fade-in-up_350ms_ease-out]">
        <div className="flex items-center gap-[1cqw] py-[1.5cqw]">
          <img src={PROVIDER_COIN[place.provider]} alt="" className="h-[2.4cqw] w-[2.4cqw] shrink-0 rounded-full" />
          <span className="flex-1 text-[1.75cqw] font-medium text-white">{PROVIDER_LABEL[place.provider]}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            tabIndex={interactive ? 0 : -1}
            style={{ pointerEvents: interactive ? "auto" : "none" }}
            className="flex h-[2.4cqw] w-[2.4cqw] items-center justify-center rounded-full text-[#c4c7c5] active:brightness-75"
          >
            <svg viewBox="0 0 24 24" className="h-[1.5cqw] w-[1.5cqw]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="border-t-[0.07cqw] border-[#3a3d40] pt-[1.5cqw]">
          <PlaceCard place={place} compact />
        </div>

        <SheetRow icon={<CalendarIcon />} label="Date & Time" value={`${content.booking.dateLabel} · ${time}`} />
        <SheetRow icon={<GuestsIcon />} label="Party Size" value={content.booking.partySize} />
        <SheetRow icon={<PersonIcon />} label="Guest information" value={content.booking.guestInfo} />
        <SheetRow icon={<CutleryIcon />} label="Seating preference" value={content.booking.seating} />

        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmed || !interactive}
          className="mt-[1.9cqw] flex h-[4.2cqw] items-center justify-center gap-[0.8cqw] rounded-full text-[1.5cqw] font-medium transition-colors duration-300 active:brightness-95"
          style={{
            pointerEvents: interactive ? "auto" : "none",
            ...(confirmed
              ? { backgroundColor: "#25392b", color: "#8bc79a" }
              : { backgroundColor: "#d6e2fb", color: "#1b3d86" }),
          }}
        >
          {confirmed && (
            <svg viewBox="0 0 24 24" className="h-[1.6cqw] w-[1.6cqw]" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          )}
          {confirmed ? content.booking.confirmedLabel : content.booking.confirmLabel}
        </button>
      </div>
    </div>
  );
}

function SheetRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="mt-[1.5cqw] flex items-start gap-[1.2cqw] border-t-[0.07cqw] border-[#3a3d40] pt-[1.5cqw]">
      <span className="flex h-[1.9cqw] w-[1.9cqw] shrink-0 items-center justify-center text-[#c4c7c5]">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[1.45cqw] leading-[1.95cqw] text-white">{label}</span>
        <span className="text-[1.2cqw] text-[#9a9b9c]">{value}</span>
      </span>
      <svg viewBox="0 0 24 24" className="mt-[0.4cqw] h-[1.4cqw] w-[1.4cqw] shrink-0 text-[#9a9b9c]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}

const ICON = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-full w-full",
};

function CalendarIcon() {
  return (
    <svg {...ICON} aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function GuestsIcon() {
  return (
    <svg {...ICON} aria-hidden>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.5 20c0-3.3 2.9-5.6 6.5-5.6s6.5 2.3 6.5 5.6" />
      <path d="M16.5 5.2a3.4 3.4 0 0 1 0 6.6M18 14.8c2.1.7 3.5 2.5 3.5 5.2" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg {...ICON} aria-hidden>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20.5c0-3.5 3.1-6 7-6s7 2.5 7 6" />
    </svg>
  );
}

function CutleryIcon() {
  return (
    <svg {...ICON} aria-hidden>
      <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10" />
      <path d="M17 21V3c-2 1-3 3.2-3 6s1 4 3 4" />
    </svg>
  );
}

/* --------------------------------------------------------------- the widget screen */

/**
 * Where this persona's story ends: the take-it-with-you screen, which is why it replaces
 * the corner QR prompt rather than sitting beside it. Landscape puts step one's four cards
 * in a single row and stands steps two and three side by side underneath — the same
 * arrangement the portrait design uses, with the width it was always waiting for.
 */
function WidgetSetup({ widget }: { widget: DinnerContent["widget"] }) {
  return (
    <div className="flex h-full items-center justify-center px-[5cqw] py-[2.6cqw]">
      {/* the design's rainbow rim, drawn as a gradient border around the panel. Capped
          rather than full-bleed: at the frame's full width the setup shots read as the
          screen itself rather than as a card about it. */}
      <div
        className="h-full w-full max-w-[74cqw] rounded-[2.4cqw] p-[0.18cqw]"
        style={{ background: "linear-gradient(120deg, #4285f4, #9b72cb, #d96570, #f2a60c, #1ea446, #4285f4)" }}
      >
        {/* every band is shrink-0 except the last, which takes what is left and sizes its
            own images to it — so the screen fits the frame whatever the frame's height */}
        <div className="flex h-full w-full flex-col items-center rounded-[2.25cqw] bg-[#0c0c0e] px-[2.6cqw] py-[1.5cqw]">
          <h2 className="shrink-0 text-center text-[2cqw] leading-[2.5cqw] font-medium text-white">{widget.title}</h2>
          <p className="mt-[0.4cqw] shrink-0 text-center text-[1.15cqw] text-[#c4c7c5]">{widget.subtitle}</p>

          <div className="mt-[1cqw] w-full shrink-0 rounded-[1.6cqw] bg-[#161618] px-[1.5cqw] py-[1.1cqw]">
            <StepHeading step={widget.steps[0]} />
            <div className="mt-[0.9cqw] grid grid-cols-4 gap-[1.1cqw]">
              {widget.setup.map((card) => (
                <div key={card.title} className="flex flex-col">
                  {/* the four shots are all but identical in shape, so giving them their own
                      aspect and the column's full width makes them one size and squares every
                      image's left edge with the caption under it — `contain` letterboxed each
                      one differently and left the row ragged */}
                  <img src={card.image} alt="" className="aspect-[26/25] w-full rounded-[0.9cqw] object-cover" />
                  <p className="mt-[0.7cqw] text-[0.95cqw] leading-[1.35cqw] font-medium text-white">{card.title}</p>
                  <p className="text-[0.95cqw] leading-[1.35cqw] text-[#c4c7c5]">{card.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-[1cqw] grid min-h-0 w-full flex-1 grid-cols-2 gap-[1.2cqw]">
            <WidgetPanel step={widget.steps[1]} image={widget.search.image} caption={widget.search.caption} contain />
            <WidgetPanel step={widget.steps[2]} image="/gemini/qr-code.jpg" caption={widget.scan.caption} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** One of the two bottom panels. Its image takes whatever height the row has left, so the
 * pair shrink together rather than pushing their captions off the frame. */
function WidgetPanel({
  step,
  image,
  caption,
  contain = false,
}: {
  step: { label: string; title: string };
  image: string;
  caption: string;
  contain?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-col items-center rounded-[1.6cqw] bg-[#161618] px-[1.5cqw] py-[1.1cqw]">
      <StepHeading step={step} />
      {/* both panels size their image off the row's leftover height, so the two land the
          same size and their captions sit on one line */}
      <img
        src={image}
        alt=""
        className={`mt-[0.8cqw] min-h-0 w-auto flex-1 rounded-[0.8cqw] ${contain ? "object-contain" : "aspect-square object-cover"}`}
      />
      <p className="mt-[0.6cqw] shrink-0 text-[0.95cqw] text-[#c4c7c5]">{caption}</p>
    </div>
  );
}

function StepHeading({ step }: { step: { label: string; title: string } }) {
  return (
    <div className="flex items-center justify-center gap-[0.7cqw]">
      <svg viewBox="0 0 24 24" className="h-[1.4cqw] w-[1.4cqw] text-white" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9.5" />
        <path d="M7.8 12.3l3 3 5.4-6.2" />
      </svg>
      <span className="text-[1.25cqw] text-[#c4c7c5]">
        {step.label}: <span className="font-medium text-white">{step.title}</span>
      </span>
    </div>
  );
}
