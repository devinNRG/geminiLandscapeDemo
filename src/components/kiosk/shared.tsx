"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { DocCardData, ResponseContent, Section } from "./types";
import ThinkingIndicator from "./ThinkingIndicator";

// how long the inline "thinking" beat holds before the rest of the answer grows in
export const THINKING_DURATION_MS = 2700;

// stagger timing shared between Reveal and anything computing "when will the
// last block finish revealing" (e.g. to sequence an animation after it)
export const REVEAL_STEP_MS = 110;
export const REVEAL_DURATION_MS = 700;

/** Fades + lifts its children in once `show` flips true, staggered by `index`. */
export function Reveal({
  show,
  index,
  className,
  style,
  children,
}: {
  show: boolean;
  index: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={`transition-all ease-out ${className ?? ""}`}
      style={{
        ...style,
        transitionDuration: `${REVEAL_DURATION_MS}ms`,
        opacity: show ? 1 : 0,
        transform: `${style?.transform ?? ""} ${show ? "translateY(0)" : "translateY(0.8cqw)"}`.trim(),
        transitionDelay: show ? `${index * REVEAL_STEP_MS}ms` : "0ms",
      }}
    >
      {children}
    </div>
  );
}

/** How long a stagger starting now takes to finish, given the last block's index. */
export function revealDurationMs(lastIndex: number) {
  return lastIndex * REVEAL_STEP_MS + REVEAL_DURATION_MS;
}

/** The prompt bubble appears immediately; everything else waits for the inline
 * "thinking" beat to finish before it starts staggering in. Shared by every
 * pattern that needs this same two-step timing, however it renders it. */
export function useThinkingPhase(active: boolean) {
  const [showThinking, setShowThinking] = useState(true);
  useEffect(() => {
    setShowThinking(true);
    if (!active) return;
    const t = setTimeout(() => setShowThinking(false), THINKING_DURATION_MS);
    return () => clearTimeout(t);
  }, [active]);
  return { showThinking, contentShown: active && !showThinking };
}

export function Bullet({ size = 0.55 }: { size?: number }) {
  return (
    <span
      className="shrink-0 rounded-full border-[#8c8c8c]"
      style={{
        marginTop: `${size}cqw`,
        height: `${size}cqw`,
        width: `${size}cqw`,
        borderWidth: `${size * 0.16}cqw`,
      }}
    />
  );
}

export function PromptBubble({ lines, size = 1 }: { lines: string[]; size?: number }) {
  return (
    <div className="flex justify-end">
      <div
        className="relative overflow-hidden rounded-tl-[2.7cqw] rounded-tr-[0.34cqw] rounded-bl-[2.7cqw] rounded-br-[2.7cqw] bg-[#141414] text-white"
        style={{
          width: `${24.8 * size}cqw`,
          height: `${6.7 * size}cqw`,
          padding: `${1 * size}cqw ${2.06 * size}cqw 0`,
          fontSize: `${1.18 * size}cqw`,
          lineHeight: `${1.77 * size}cqw`,
        }}
      >
        {/* joined into one flowing sentence rather than rendered as forced per-line breaks —
            `lines` is just how each prompt is authored as data, not where it should wrap */}
        <p>{lines.join(" ")}</p>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3cqw] bg-gradient-to-t from-[#141414] to-transparent" />
      </div>
    </div>
  );
}

export function DocCard({ data, size = 1 }: { data: DocCardData; size?: number }) {
  return (
    <div
      className="flex items-center rounded-[2.37cqw] bg-[#141414]"
      style={{ width: `${22.3 * size}cqw`, gap: `${1.47 * size}cqw`, padding: `${1 * size}cqw ${1.47 * size}cqw` }}
    >
      <img src="/gemini/icon-doc.svg" alt="" className="shrink-0" style={{ height: `${1.47 * size}cqw`, width: `${1.47 * size}cqw` }} />
      <div className="flex flex-1 flex-col" style={{ gap: `${0.2 * size}cqw` }}>
        <span style={{ fontSize: `${1.25 * size}cqw`, lineHeight: `${1.77 * size}cqw`, color: "#e0e0e0" }}>{data.title}</span>
        <span style={{ fontSize: `${0.96 * size}cqw`, lineHeight: `${1.33 * size}cqw`, color: "#959595" }}>{data.subtitle}</span>
      </div>
      <span
        className="whitespace-nowrap rounded-full bg-[#1c1c1c] text-[#e0e0e0]"
        style={{ padding: `${0.6 * size}cqw ${1.1 * size}cqw`, fontSize: `${0.96 * size}cqw` }}
      >
        {data.cta}
      </span>
    </div>
  );
}

function SectionHeading({ children, size = 1 }: { children: ReactNode; size?: number }) {
  return (
    <p className="font-bold text-white" style={{ fontSize: `${1.47 * size}cqw`, lineHeight: `${2.06 * size}cqw` }}>
      {children}
    </p>
  );
}

function SectionItem({ section, lines, size = 1 }: { section: Section; lines: string[]; size?: number }) {
  return (
    <div className="flex text-white" style={{ gap: `${0.7 * size}cqw`, fontSize: `${1.25 * size}cqw`, lineHeight: `${1.97 * size}cqw` }}>
      {section.bulleted && <Bullet size={0.55 * size} />}
      <span>
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </span>
    </div>
  );
}

export type ContentBlock = { id: string; node: ReactNode; isHeading: boolean };

/**
 * The answer's body (everything after the prompt bubble) as a flat, ordered
 * list of blocks — intro paragraph, doc card, then each section's heading
 * and items as their own entries. Flat rather than nested so a pattern can
 * measure and split it at an arbitrary point (e.g. "these fit in column
 * one, the rest go in column two") without needing to know anything about
 * section boundaries itself.
 */
export function buildContentBlocks(content: ResponseContent, size = 1): ContentBlock[] {
  const blocks: ContentBlock[] = [
    // joined into one flowing paragraph rather than one <p> per authored line —
    // `introLines` is just how the intro is authored as data, not where it should wrap
    { id: "intro", isHeading: true, node: <p>{content.introLines.join(" ")}</p> },
    { id: "doccard", isHeading: true, node: <DocCard data={content.docCard} size={size} /> },
  ];
  content.sections.forEach((section) => {
    blocks.push({ id: `${section.id}-heading`, isHeading: true, node: <SectionHeading size={size}>{section.heading}</SectionHeading> });
    section.items.forEach((lines, i) => {
      blocks.push({ id: `${section.id}-item-${i}`, isHeading: false, node: <SectionItem section={section} lines={lines} size={size} /> });
    });
  });
  return blocks;
}

const block: CSSProperties = { breakInside: "avoid" };

/** A block's own gap above it — headings (and the two lead blocks) get the
 * looser "new section" spacing, list items stay tight under their heading. */
export function blockGapStyle(b: ContentBlock, size: number): CSSProperties {
  return { ...block, marginTop: `${(b.isHeading ? 1.3 : 0.6) * size}cqw` };
}

/**
 * The whole answer as ONE continuous flowing document — no notion of
 * "sections to browse," just the same paragraph/heading/list order a real
 * Gemini answer would render in, at a phone-like reading width. This is the
 * shared substrate for every pattern that reveals content by measuring or
 * moving through real rendered height rather than pre-declared structure.
 * Every direct child has `break-inside: avoid` so CSS multi-column layout
 * (or any other slicing) never cuts through the middle of a block.
 */
export function ContinuousFlow({
  content,
  size = 1,
  active = true,
  onRevealChange,
  onRevealComplete,
}: {
  content: ResponseContent;
  size?: number;
  /** When provided, each block stagger-reveals in once this flips true (the "response just generated" moment). */
  active?: boolean;
  /** Fires whenever the "rest of the answer" starts (true) or stops (false) being shown — i.e. the thinking beat just ended, or `active` just went false. Pass a stable callback (a state setter works well) since it's called from an effect. */
  onRevealChange?: (contentShown: boolean) => void;
  /** Fires once, after the very last staggered block has finished animating in. Pass a stable callback. */
  onRevealComplete?: () => void;
}) {
  const blocks = buildContentBlocks(content, size);
  const { showThinking, contentShown } = useThinkingPhase(active);

  useEffect(() => {
    onRevealChange?.(contentShown);
    // onRevealChange intentionally omitted — callers pass a stable setState reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentShown]);

  useEffect(() => {
    if (!contentShown) return;
    const t = setTimeout(() => onRevealComplete?.(), revealDurationMs(blocks.length));
    return () => clearTimeout(t);
    // onRevealComplete intentionally omitted — callers pass a stable setState reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentShown, blocks.length]);

  const thinkingCaptions = ["Thinking…", `Checking ${content.docCard.subtitle}…`, "Putting your answer together…"];

  return (
    <div className="flex flex-col text-white" style={{ fontSize: `${1.25 * size}cqw`, lineHeight: `${1.77 * size}cqw` }}>
      {/* wrapper's own height is just the bubble's — the indicator is positioned
          absolute so it never adds to (or removes from) this flow's measured
          height, which would otherwise make a paginated view's page count
          flicker once the indicator unmounts */}
      <div className="relative" style={block}>
        <Reveal show={active} index={0}>
          <PromptBubble lines={content.promptLines} size={size} />
        </Reveal>
        {showThinking && (
          <div className="absolute left-0" style={{ top: `calc(100% + ${1.3 * size}cqw)` }}>
            <Reveal show={active} index={0.5}>
              <ThinkingIndicator captions={thinkingCaptions} />
            </Reveal>
          </div>
        )}
      </div>
      {blocks.map((b, i) => (
        <Reveal key={b.id} show={contentShown} index={i + 1} style={blockGapStyle(b, size)}>
          {b.node}
        </Reveal>
      ))}
    </div>
  );
}
