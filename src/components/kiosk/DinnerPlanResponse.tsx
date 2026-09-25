"use client";

import { useEffect, useRef, useState } from "react";
import type { DinnerIdea, DinnerPlanContent, PickupOrder } from "./types";
import { CometRing, ContinuousFlow, RisingDotsCue, useScrollCue, useScrolledOnce } from "./shared";

/** The column every other answer is authored for. */
const COLUMN_CQW = 42;
/** Beat between the dinner being tapped and Gemini reporting what it added. */
const ADDED_MS = 700;
/** ...and between that and the chip that offers to order the difference. */
const ORDER_CHIP_MS = 900;
/** How long each step of the running task holds before the next takes over. Matches the
 * friday-night task, so the two read as the same machine working. */
const STEP_HOLD_MS = 1700;
/** "Pickup confirmed" holds before the demo counts as done. */
const CONFIRMED_MS = 1400;

/**
 * "Plan dinner for the week" — an answer that turns into a task.
 *
 * It opens as an ordinary text answer: three dinners built out of what the fridge photo
 * shows, then the shopping list. Underneath it the three dinners are offered as chips, and
 * picking one is what starts the task — Gemini says what it added, offers to order the
 * difference, and from there the flow is the friday-night one: a Gemini Intelligence
 * notification, then a third-party app card to finish in, deliberately breaking into a
 * light surface to mark the handoff.
 *
 * The reference screens for this flow are older than the rest of the demo, so the pieces
 * here are the demo's own: the chip language the messaging scenes use, the notification and
 * light app card the friday-night task uses, and this answer column's own width and rhythm.
 */
export default function DinnerPlanResponse({
  content,
  active,
  onComplete,
}: {
  content: DinnerPlanContent;
  active: boolean;
  onComplete?: () => void;
}) {
  // Nothing resets this: page.tsx remounts the component per run.
  const [picked, setPicked] = useState<DinnerIdea | null>(null);
  const [showAdded, setShowAdded] = useState(false);
  const [showOrderChip, setShowOrderChip] = useState(false);
  const [phase, setPhase] = useState<"answer" | "notification" | "app">("answer");

  useEffect(() => {
    if (!picked) return;
    const a = setTimeout(() => setShowAdded(true), ADDED_MS);
    const b = setTimeout(() => setShowOrderChip(true), ADDED_MS + ORDER_CHIP_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [picked]);

  if (phase !== "answer") {
    return (
      <div className="flex h-full items-center justify-center px-[10cqw] pb-[6cqw]">
        <div className="flex flex-col" style={{ width: `${COLUMN_CQW}cqw` }}>
          {phase === "notification" ? (
            <div className="[animation:fade-in-up_500ms_ease-out]">
              <TaskNotification notification={content.notification} onOpenApp={() => setPhase("app")} />
            </div>
          ) : (
            <div className="[animation:fade-in-up_500ms_ease-out]">
              <PickupCard order={content.order} onComplete={onComplete} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <AnswerColumn
      content={content}
      active={active}
      picked={picked}
      showAdded={showAdded}
      showOrderChip={showOrderChip}
      onPick={setPicked}
      onOrder={() => setPhase("notification")}
    />
  );
}

/** The answer itself, with the dinners — and then what Gemini did with the one that was
 * tapped — appended to the bottom of the same scroll. */
function AnswerColumn({
  content,
  active,
  picked,
  showAdded,
  showOrderChip,
  onPick,
  onOrder,
}: {
  content: DinnerPlanContent;
  active: boolean;
  picked: DinnerIdea | null;
  showAdded: boolean;
  showOrderChip: boolean;
  onPick: (idea: DinnerIdea) => void;
  onOrder: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const { hasMore, scrollForward } = useScrollCue(scrollRef, innerRef);
  const scrolled = useScrolledOnce(scrollRef, active);
  const [revealed, setRevealed] = useState(false);

  // the dinners are the answer's conclusion, so they wait for it to finish arriving
  const [cueReady, setCueReady] = useState(false);
  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setCueReady(true), 400);
    return () => clearTimeout(t);
  }, [revealed]);

  // each new beat is appended below the fold, so the column follows it down
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !showAdded) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [showAdded, showOrderChip]);

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto px-[10cqw] pt-[2.3cqw] pb-[4cqw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div ref={innerRef} className="mx-auto w-full" style={{ maxWidth: `${COLUMN_CQW}cqw` }}>
          <ContinuousFlow content={content.answer} active={active} onRevealComplete={() => setRevealed(true)} />

          {revealed && (
            <div className="mt-[1.6cqw] flex flex-wrap gap-[0.8cqw] [animation:fade-in-up_450ms_ease-out]">
              {content.ideas.map((idea) => {
                const chosen = picked?.id === idea.id;
                return (
                  <button
                    key={idea.id}
                    type="button"
                    onClick={() => onPick(idea)}
                    disabled={!!picked}
                    // a picked dinner stays, dimmed, the way a finished flow stays on the
                    // rundown — what was chosen is part of the answer now
                    className={`rounded-full border px-[1.6cqw] py-[0.7cqw] text-[1.2cqw] transition-transform duration-150 ${
                      picked
                        ? chosen
                          ? "border-white/25 bg-white/15 text-white"
                          : "border-white/8 bg-white/5 text-white/35"
                        : "border-white/15 bg-white/10 text-white active:scale-[0.97]"
                    }`}
                  >
                    {idea.name}
                  </button>
                );
              })}
            </div>
          )}

          {showAdded && picked && (
            <p className="mt-[1.6cqw] text-[1.3cqw] leading-[1.9cqw] text-white [animation:fade-in-up_450ms_ease-out]">
              {picked.added}
            </p>
          )}

          {showOrderChip && (
            <div className="mt-[1.4cqw] inline-flex [animation:fade-in-up_450ms_ease-out]">
              {/* the same comet-ringed chip the messaging scenes use for "Gemini can take it
                  from here", which is exactly what this offers */}
              <CometRing active trail="spectrum">
                <button
                  type="button"
                  onClick={onOrder}
                  className="flex items-center gap-[1cqw] rounded-full bg-surface-card px-[1.6cqw] py-[0.95cqw] text-[1.25cqw] font-medium text-white transition-transform duration-150 active:scale-[0.97]"
                >
                  <img src="/gemini/friday-night/suggestion-pill-sparkle.svg" alt="" className="h-[1.8cqw] w-[1.8cqw] shrink-0" />
                  {content.orderLabel}
                </button>
              </CometRing>
            </div>
          )}
        </div>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <RisingDotsCue show={cueReady && hasMore && !scrolled && !picked} onClick={scrollForward} />
      </div>
    </div>
  );
}

/**
 * The friday-night task's notification, in this flow's own words — and, like that one, it
 * shows the work: it steps through opening the app, filling the cart and holding a pickup
 * slot before it offers the way in. A button that appeared instantly would say Gemini had
 * done nothing.
 */
function TaskNotification({
  notification,
  onOpenApp,
}: {
  notification: DinnerPlanContent["notification"];
  onOpenApp: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const lastStep = stepIndex >= notification.steps.length - 1;
  const step = notification.steps[stepIndex];

  useEffect(() => {
    if (lastStep) return;
    const t = setTimeout(() => setStepIndex((i) => i + 1), STEP_HOLD_MS);
    return () => clearTimeout(t);
    // stepIndex must be a dep, or the effect never reschedules between steps
  }, [lastStep, stepIndex]);

  return (
    <div className="relative overflow-hidden rounded-[1.7cqw]">
      <img src="/gemini/friday-night/notif-gradient-bg.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="relative flex items-start gap-[1cqw] p-[1.4cqw]">
        <img src="/gemini/ph-spark.png" alt="" className="mt-[0.15cqw] h-[1.2cqw] w-[1.2cqw] shrink-0 object-cover" />
        <div className="flex flex-1 flex-col gap-[0.15cqw]">
          <span className="text-[0.85cqw] text-[#e3e3e3] opacity-85">{notification.eyebrow}</span>
          <span className="text-[1.25cqw] font-semibold text-[#e3e3e3]">{step.heading}</span>
          <span className="text-[1cqw] text-white opacity-90">{step.subtext}</span>
          {step.progress !== undefined && (
            <div className="relative mt-[0.6cqw] h-[0.28cqw] overflow-hidden rounded-full bg-[#d3e3fd]/40">
              <div className="absolute h-full w-[25%] rounded-full bg-[#4c8df6] [animation:scan-bar_1.4s_ease-in-out_infinite]" />
            </div>
          )}
          {lastStep && (
            <button
              type="button"
              onClick={onOpenApp}
              className="mt-[0.6cqw] self-start rounded-full bg-white/10 px-[1.3cqw] py-[0.6cqw] text-[0.95cqw] text-white [animation:fade-in-up_500ms_ease-out] active:bg-white/20"
            >
              {notification.cta}
            </button>
          )}
        </div>
        <div className="flex h-[2.3cqw] w-[2.3cqw] shrink-0 items-center justify-center rounded-full bg-[#24331e]">
          <img src="/gemini/friday-night/icon-bag.svg" alt="" className="h-[1.15cqw] w-[1.15cqw]" />
        </div>
      </div>
    </div>
  );
}

/** The grocer's own card. Light, like FoodOrder's, because the handoff out of Gemini's dark
 * chrome is the point; drawn at this column's proportions rather than the portrait
 * reference's, so it sits in the frame like every other card in the demo. */
function PickupCard({ order, onComplete }: { order: PickupOrder; onComplete?: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!confirmed) return;
    const t = setTimeout(() => setSettled(true), CONFIRMED_MS);
    return () => clearTimeout(t);
  }, [confirmed]);

  useEffect(() => {
    if (settled) onComplete?.();
  }, [settled, onComplete]);

  return (
    <div className="flex flex-col gap-[0.7cqw] rounded-[1.4cqw] bg-white p-[1.1cqw] text-[#1f1f1f]">
      <div className="flex items-center gap-[0.55cqw]">
        <FreshCartMark size={1.5} />
        <span className="text-[1.25cqw] font-bold">{order.appName}</span>
      </div>

      <div className="flex flex-col gap-[0.25cqw]">
        <span className="text-[0.88cqw] font-medium">Pickup</span>
        <div className="flex items-center gap-[0.55cqw]">
          <div className="flex h-[1.5cqw] w-[1.5cqw] shrink-0 items-center justify-center rounded-[0.4cqw] bg-[#f6ecd9]">
            <img src="/gemini/friday-night/icon-bag.svg" alt="" className="h-[0.85cqw] w-[0.85cqw]" />
          </div>
          <span className="flex-1 text-[0.88cqw]">
            {order.pickupLabel} <span className="text-[#9a9a9a]">· {order.pickupDetail}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-[0.25cqw]">
        <span className="text-[0.88cqw] font-medium">Order summary</span>
        <div className="flex items-center gap-[0.55cqw]">
          <FreshCartMark size={1.5} />
          <span className="flex-1 text-[0.88cqw]">
            {order.appName} <span className="text-[#9a9a9a]">· {order.itemCount}</span>
          </span>
        </div>

        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-[0.55cqw] border-t border-[#f1f1f1] pt-[0.3cqw]">
            <div className="flex h-[1.5cqw] w-[1.5cqw] shrink-0 items-center justify-center rounded-[0.4cqw] bg-[#f1f1f1]">
              <img src="/gemini/friday-night/icon-bag.svg" alt="" className="h-[0.85cqw] w-[0.85cqw] opacity-60" />
            </div>
            <span className="flex-1 text-[0.88cqw]">
              {item.name} <span className="text-[#9a9a9a]">· {item.price}</span>
            </span>
            <span className="flex h-[1.15cqw] w-[1.15cqw] shrink-0 items-center justify-center rounded-full border border-[#e0e0e0] text-[0.7cqw]">
              1
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-[0.14cqw] rounded-[0.6cqw] border border-[#eee] p-[0.5cqw] text-[0.72cqw]">
        <div className="flex justify-between text-[#b5b5b5]">
          <span>Subtotal</span>
          <span>{order.subtotal}</span>
        </div>
        <div className="flex justify-between text-[#b5b5b5]">
          <span>Pickup</span>
          <span>{order.pickupFee}</span>
        </div>
        <div className="flex justify-between text-[#b5b5b5]">
          <span>Taxes &amp; other fees</span>
          <span>{order.taxes}</span>
        </div>
        <div className="flex justify-between text-[0.88cqw] font-bold">
          <span>Total</span>
          <span>{order.total}</span>
        </div>
      </div>

      {confirmed ? (
        <div className="flex items-center justify-center gap-[0.35cqw] rounded-full bg-[#e6f4ea] py-[0.55cqw] text-[0.9cqw] font-medium text-[#1e7e34] [animation:fade-in-up_400ms_ease-out]">
          <span>✓</span>
          <span>{order.confirmedLabel}</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmed(true)}
          className="rounded-full bg-[#3b8b5f] py-[0.55cqw] text-[0.9cqw] font-medium text-white active:brightness-95"
        >
          {order.confirmLabel}
        </button>
      )}
    </div>
  );
}

/** The grocer's mark — a leaf in a circle, drawn rather than exported, since it is this
 * demo's own invented app. */
function FreshCartMark({ size }: { size: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[#e6f0e9]"
      style={{ height: `${size}cqw`, width: `${size}cqw` }}
    >
      <svg viewBox="0 0 24 24" style={{ height: `${size * 0.72}cqw`, width: `${size * 0.72}cqw` }} aria-hidden>
        <circle cx="12" cy="12" r="11" fill="#3b8b5f" />
        <path d="M15.5 6.5c-4 .6-7 3-7 6.6 0 1.4.5 2.6 1.3 3.5L15.5 6.5z" fill="#fff" />
      </svg>
    </span>
  );
}
