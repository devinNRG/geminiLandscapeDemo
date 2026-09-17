"use client";

import { useEffect, useState } from "react";
import type { FoodOrderData, TaskDemoContent, TaskStep } from "./types";
import { Reveal, useThinkingPhase } from "./shared";
import ThinkingIndicator from "./ThinkingIndicator";
import GeminiOverlay from "./GeminiOverlay";

const SINGLE_COLUMN_WIDTH = "42cqw";
// how long each auto-advancing task step stays up before the next one takes over
const STEP_HOLD_MS = 1700;

const THINKING_CAPTIONS = ["Thinking…", "Checking your order history…", "Setting up the task…"];

/**
 * A Gemini agentic-task answer: instead of a text answer, the reply is a
 * short sequence of status cards ("Working on your task" → "Task in
 * progress" → "Finish up your task") that plays out on its own timing, then
 * hands off to a third-party app card (FoodOrder) for the user to complete
 * — matching how the source design deliberately breaks from Gemini's own
 * dark chrome into a light "third-party app" card to signal the handoff.
 * `onComplete` fires once payment settles — it doesn't render its own "back"
 * affordance; page.tsx's shared corner button handles exiting the demo.
 */
export default function TaskAutomationResponse({
  content,
  active,
  onComplete,
  onLeaveChat,
}: {
  content: TaskDemoContent;
  active: boolean;
  onComplete?: () => void;
  /** Fires when the flow moves past its first card — the point where it stops being an
   * overlay on the group chat and takes over the whole screen. */
  onLeaveChat?: () => void;
}) {
  const { showThinking, contentShown } = useThinkingPhase(active);

  const [stepIndex, setStepIndex] = useState(0);
  const [showApp, setShowApp] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      setShowApp(false);
      setPaid(false);
    }
  }, [active]);

  const lastStep = stepIndex >= content.steps.length - 1;

  useEffect(() => {
    if (!contentShown || lastStep) return;
    const t = setTimeout(() => {
      setStepIndex((i) => i + 1);
      // fired from the timer rather than synchronously in the effect body, so notifying the
      // parent doesn't add a cascading-render warning. Idempotent — safe to re-fire per step.
      onLeaveChat?.();
    }, STEP_HOLD_MS);
    return () => clearTimeout(t);
    // stepIndex itself must be a dep (not just the derived lastStep) or the effect won't reschedule between steps
  }, [contentShown, lastStep, stepIndex, onLeaveChat]);

  const step = content.steps[stepIndex];

  // The first card plays as an overlay on top of the still-visible group chat — Gemini
  // answering in place. Everything after it is the task running on its own, so the chat
  // (and the overlay) drop away and the notification takes the whole screen.
  if (!showApp && stepIndex === 0) {
    return (
      <GeminiOverlay show={active}>
        {/* No prompt bubble here, matching the go out overlay: the typed prompt is already
            sitting in the compose bar right below, so repeating it inside the panel just
            says the same thing twice in the same eyeful. */}
        {showThinking ? (
          <Reveal show={active} index={0}>
            <ThinkingIndicator captions={THINKING_CAPTIONS} />
          </Reveal>
        ) : (
          <div className="flex flex-col text-[1.25cqw] leading-[1.8cqw]">
            <Reveal show={contentShown} index={0}>
              <p className="text-white">{content.introText}</p>
            </Reveal>
            <Reveal show={contentShown} index={1} style={{ marginTop: "0.9cqw" }}>
              <WorkingCard step={step} />
            </Reveal>
          </div>
        )}
      </GeminiOverlay>
    );
  }

  return (
    <div className="flex h-full items-start justify-center px-[10cqw] pt-[2.3cqw] pb-[10.6cqw]">
      <div className="flex flex-col text-[1.25cqw] leading-[1.8cqw]" style={{ width: SINGLE_COLUMN_WIDTH }}>
        {/* the task card hands off to the FoodOrder card rather than stacking under it —
            matching the source design (the checkout screen replaces the notification
            entirely) and keeping total height well inside the frame */}
        {!showApp ? (
          <div className="mt-[1.3cqw] [animation:fade-in-up_500ms_ease-out]">
            <NotificationCard step={step} showCta={lastStep} onOpenApp={() => setShowApp(true)} />
          </div>
        ) : (
          <div className="[animation:fade-in-up_500ms_ease-out]">
            <FoodOrderCard data={content.foodOrder} paid={paid} onPay={() => setPaid(true)} onComplete={onComplete} />
          </div>
        )}
      </div>
    </div>
  );
}

/** The first step's card — plain dark panel, matching the card inside Gemini's
 * sliding response panel (no "Gemini Intelligence" eyebrow, a spinning ring
 * around the badge icon rather than a progress bar). */
function WorkingCard({ step }: { step: TaskStep }) {
  return (
    <div className="flex items-center gap-[1.3cqw] rounded-[1.7cqw] bg-surface-card p-[1.4cqw]">
      <div className="relative flex h-[2.6cqw] w-[2.6cqw] shrink-0 items-center justify-center">
        <img
          src="/gemini/friday-night/ring-spin.png"
          alt=""
          className="absolute h-[160%] w-[160%] [animation:spin_1.3s_linear_infinite]"
        />
        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-[#24331e]">
          <img src="/gemini/friday-night/icon-bag.svg" alt="" className="h-[1.3cqw] w-[1.3cqw]" />
        </div>
      </div>
      <div className="flex flex-col gap-[0.15cqw]">
        <span className="text-[1.3cqw] font-bold text-[#e3e3e3]">{step.heading}</span>
        <span className="text-[1.05cqw] font-medium text-[#e3e3e3]">{step.subtext}</span>
      </div>
    </div>
  );
}

/** Steps after the first — the blue "Gemini Intelligence" gradient notification
 * banner (matching the phone's lock-screen-style live update), used once the
 * chat scene has faded out. */
function NotificationCard({ step, showCta, onOpenApp }: { step: TaskStep; showCta: boolean; onOpenApp: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-[1.7cqw]">
      <img src="/gemini/friday-night/notif-gradient-bg.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="relative flex items-start gap-[1cqw] p-[1.4cqw]">
        <img src="/gemini/ph-spark.png" alt="" className="mt-[0.15cqw] h-[1.2cqw] w-[1.2cqw] shrink-0 object-cover" />
        <div className="flex flex-1 flex-col gap-[0.15cqw]">
          <span className="text-[0.85cqw] text-[#e3e3e3] opacity-85">Gemini Intelligence</span>
          <span className="text-[1.25cqw] font-semibold text-[#e3e3e3]">{step.heading}</span>
          <span className="text-[1cqw] text-white opacity-90">{step.subtext}</span>
          {step.progress !== undefined && (
            <div className="relative mt-[0.6cqw] h-[0.28cqw] overflow-hidden rounded-full bg-[#d3e3fd]/40">
              <div className="absolute h-full w-[25%] rounded-full bg-[#4c8df6] [animation:scan-bar_1.4s_ease-in-out_infinite]" />
            </div>
          )}
          {showCta && (
            <button
              type="button"
              onClick={onOpenApp}
              className="mt-[0.6cqw] self-start rounded-full bg-white/10 px-[1.3cqw] py-[0.6cqw] text-[0.95cqw] text-white [animation:fade-in-up_500ms_ease-out] active:bg-white/20"
            >
              Open FoodOrder
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

function FoodOrderCard({
  data,
  paid,
  onPay,
  onComplete,
}: {
  data: FoodOrderData;
  paid: boolean;
  onPay: () => void;
  onComplete?: () => void;
}) {
  // "Payment successful" holds briefly before the demo is considered done —
  // page.tsx's shared corner button is what actually lets the user exit
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!paid) {
      setSettled(false);
      return;
    }
    const t = setTimeout(() => setSettled(true), 1400);
    return () => clearTimeout(t);
  }, [paid]);

  useEffect(() => {
    if (settled) onComplete?.();
  }, [settled, onComplete]);

  return (
    <div className="flex flex-col gap-[0.45cqw] rounded-[1.4cqw] bg-white p-[0.9cqw] text-[#1f1f1f]">
      <div className="flex items-center gap-[0.45cqw]">
        <div className="flex h-[1.3cqw] w-[1.3cqw] items-center justify-center rounded-full bg-[#24331e]">
          <img src="/gemini/friday-night/icon-bag.svg" alt="" className="h-[0.78cqw] w-[0.78cqw]" />
        </div>
        <span className="text-[1.15cqw] font-bold">{data.appName}</span>
      </div>

      <div className="flex flex-col gap-[0.2cqw]">
        <span className="text-[0.82cqw] font-medium">Delivery</span>
        <div className="flex items-center gap-[0.45cqw]">
          <div className="flex h-[1.3cqw] w-[1.3cqw] shrink-0 items-center justify-center rounded-full bg-[#f6ecd9]">
            <img src="/gemini/friday-night/icon-home.svg" alt="" className="h-[0.75cqw] w-[0.75cqw]" />
          </div>
          <span className="flex-1 text-[0.82cqw]">
            {data.deliveryLabel} <span className="text-[#9a9a9a]">· {data.deliveryAddress}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-[0.2cqw]">
        <span className="text-[0.82cqw] font-medium">Order summary</span>
        <div className="flex items-center gap-[0.45cqw]">
          <div className="flex h-[1.3cqw] w-[1.3cqw] shrink-0 items-center justify-center rounded-full bg-[#f2c4cf] text-[0.66cqw] text-[#8d2f47]">
            {data.restaurantInitial}
          </div>
          <span className="flex-1 text-[0.82cqw]">
            {data.restaurantName} <span className="text-[#9a9a9a]">· {data.itemCount}</span>
          </span>
        </div>

        {data.items.map((item) => (
          <div key={item.id} className="flex items-center gap-[0.45cqw] border-t border-[#f1f1f1] pt-[0.2cqw]">
            <img src={item.image} alt="" className="h-[1.3cqw] w-[1.3cqw] shrink-0 rounded-[0.35cqw] object-cover" />
            <span className="flex-1 text-[0.82cqw]">
              {item.name} <span className="text-[#9a9a9a]">· {item.price}</span>
            </span>
            <span className="flex h-[1.05cqw] w-[1.05cqw] shrink-0 items-center justify-center rounded-full border border-[#e0e0e0] text-[0.66cqw]">1</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-[0.12cqw] rounded-[0.6cqw] border border-[#eee] p-[0.4cqw] text-[0.66cqw]">
        <div className="flex justify-between text-[#b5b5b5]">
          <span>Subtotal</span>
          <span>{data.subtotal}</span>
        </div>
        <div className="flex justify-between text-[#b5b5b5]">
          <span>Delivery fee</span>
          <span>{data.deliveryFee}</span>
        </div>
        <div className="flex justify-between text-[#b5b5b5]">
          <span>Taxes &amp; other fees</span>
          <span>{data.taxes}</span>
        </div>
        <div className="flex justify-between text-[0.82cqw] font-bold">
          <span>Total</span>
          <span>{data.total}</span>
        </div>
      </div>

      {paid ? (
        <div className="flex items-center justify-center gap-[0.3cqw] rounded-full bg-[#e6f4ea] py-[0.4cqw] text-[0.82cqw] font-medium text-[#1e7e34] [animation:fade-in-up_400ms_ease-out]">
          <span>✓</span>
          <span>Payment successful</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPay}
          className="flex items-center justify-center gap-[0.25cqw] rounded-full bg-[#0d0d0d] py-[0.4cqw] text-[0.82cqw] text-white active:bg-black"
        >
          <span>Pay with</span>
          <img src="/gemini/friday-night/icon-gpay.svg" alt="" className="h-[0.75cqw]" />
          <span>Pay</span>
        </button>
      )}
    </div>
  );
}
