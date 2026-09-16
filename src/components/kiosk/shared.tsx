"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { ResponseContent, Section } from "./types";
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
      className="shrink-0 rounded-full border-muted"
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
        className="relative overflow-hidden rounded-tl-[2.7cqw] rounded-tr-[0.34cqw] rounded-bl-[2.7cqw] rounded-br-[2.7cqw] bg-surface-card text-white"
        style={{
          width: `${24.8 * size}cqw`,
          height: `${6.7 * size}cqw`,
          padding: `${1 * size}cqw ${2.06 * size}cqw 0`,
          fontSize: `${1.2 * size}cqw`,
          lineHeight: `${1.8 * size}cqw`,
        }}
      >
        {/* joined into one flowing sentence rather than rendered as forced per-line breaks —
            `lines` is just how each prompt is authored as data, not where it should wrap */}
        <p>{lines.join(" ")}</p>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3cqw] bg-gradient-to-t from-surface-card to-transparent" />
      </div>
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
    <div className="flex text-white" style={{ gap: `${0.7 * size}cqw`, fontSize: `${1.25 * size}cqw`, lineHeight: `${1.8 * size}cqw` }}>
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

// generic line-icon props shared by every glyph in the footer row, matching the app's existing
// stroke-icon convention (HomeButton, persona glyphs, etc.) rather than a new asset per icon
const FOOTER_ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/**
 * The reference-frame the client shared: Gemini's own post-answer action row
 * (rate, regenerate, share, copy, more, read-aloud) and disclaimer — inert
 * decoration here (no handlers), matching how the rest of this demo renders
 * chrome it can't make functional as plain visuals rather than dead buttons.
 * Appended as the last block of every text answer (not the Friday-night
 * task-automation flow, which doesn't use `buildContentBlocks` at all).
 */
function ResponseFooter({ size = 1 }: { size?: number }) {
  const iconStyle = { height: `${1.5 * size}cqw`, width: `${1.5 * size}cqw` };
  return (
    <div className="flex flex-col" style={{ gap: `${0.9 * size}cqw` }}>
      <div className="flex items-center justify-between text-white">
        <div className="flex items-center" style={{ gap: `${1.1 * size}cqw` }}>
          <svg {...FOOTER_ICON_PROPS} style={iconStyle} className="shrink-0">
            <path d="M7 10v12" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
          </svg>
          <svg {...FOOTER_ICON_PROPS} style={iconStyle} className="shrink-0">
            <path d="M17 14V2" />
            <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
          </svg>
          <svg {...FOOTER_ICON_PROPS} style={iconStyle} className="shrink-0">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          <svg {...FOOTER_ICON_PROPS} style={iconStyle} className="shrink-0">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" x2="12" y1="2" y2="15" />
          </svg>
          <svg {...FOOTER_ICON_PROPS} style={iconStyle} className="shrink-0">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          <svg viewBox="0 0 24 24" fill="currentColor" style={iconStyle} className="shrink-0">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
        </div>
        <svg {...FOOTER_ICON_PROPS} style={iconStyle} className="shrink-0">
          <path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6a1.4 1.4 0 0 1-1 .4H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5Z" />
          <path d="M16 9a5 5 0 0 1 0 6" />
          <path d="M19.4 18.4a9 9 0 0 0 0-12.7" />
        </svg>
      </div>
      <p className="text-muted" style={{ fontSize: `${0.85 * size}cqw`, lineHeight: `${1.2 * size}cqw` }}>
        Gemini can make mistakes, so double-check it. Your privacy &amp; Gemini
      </p>
    </div>
  );
}

export type ContentBlock = { id: string; node: ReactNode; isHeading: boolean };

/**
 * The answer's body (everything after the prompt bubble) as a flat, ordered
 * list of blocks — intro paragraph, then each section's heading and items as
 * their own entries. Flat rather than nested so a pattern can measure and
 * split it at an arbitrary point (e.g. "these fit in column one, the rest go
 * in column two") without needing to know anything about section boundaries
 * itself.
 */
export function buildContentBlocks(content: ResponseContent, size = 1): ContentBlock[] {
  const blocks: ContentBlock[] = [
    // joined into one flowing paragraph rather than one <p> per authored line —
    // `introLines` is just how the intro is authored as data, not where it should wrap
    { id: "intro", isHeading: true, node: <p>{content.introLines.join(" ")}</p> },
  ];
  content.sections.forEach((section) => {
    blocks.push({ id: `${section.id}-heading`, isHeading: true, node: <SectionHeading size={size}>{section.heading}</SectionHeading> });
    section.items.forEach((lines, i) => {
      blocks.push({ id: `${section.id}-item-${i}`, isHeading: false, node: <SectionItem section={section} lines={lines} size={size} /> });
    });
  });
  blocks.push({ id: "footer", isHeading: true, node: <ResponseFooter size={size} /> });
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

  const thinkingCaptions = ["Thinking…", "Putting your answer together…"];

  return (
    <div className="flex flex-col text-white" style={{ fontSize: `${1.25 * size}cqw`, lineHeight: `${1.8 * size}cqw` }}>
      {/* wrapper's own height is just the bubble's — the indicator is positioned
          absolute so it never adds to (or removes from) this flow's measured
          height, which would otherwise make a height-measuring pattern (e.g.
          Measured Columns) flicker once the indicator unmounts */}
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
