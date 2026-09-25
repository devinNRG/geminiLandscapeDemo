"use client";

import { useEffect, useRef, useState } from "react";
import type { MeetingBriefContent } from "./types";
import { Bullet, Reveal, RisingDotsCue, revealDurationMs, useScrollCue, useScrolledOnce } from "./shared";
import ThinkingRail from "./ThinkingRail";

/** Both acts run in this one column — the width every other answer is authored for. */
const COLUMN_CQW = 42;
/** Beat after the doc has finished writing itself before the exit affordances are offered,
 * so the last block has landed rather than the ending arriving on top of it. */
const DOC_SETTLE_MS = 500;
/** The cue follows the doc in rather than arriving with it. */
const DOC_CUE_DELAY_MS = 1100;

/**
 * "Prep for the big meeting" — a two-act agentic answer, the same shape as the semester
 * plan: the shared reasoning rail (Gmail, Drive, Calendar, Docs) writes a file, and the
 * payoff is opening it.
 *
 * Act two is that file: a Google Doc, laid out as a document rather than as a chat answer —
 * a title, the line saying who it is for and that it refreshes itself, then headed sections
 * of bullets. It reveals block by block instead of being simply present, for the same
 * reason the calendar fills in one event at a time: a document that is already written is
 * indistinguishable from a screenshot. Long, so it scrolls, with the app's usual cue.
 */
export default function MeetingBriefResponse({
  content,
  active,
  onComplete,
}: {
  content: MeetingBriefContent;
  active: boolean;
  onComplete?: () => void;
}) {
  // Nothing resets this: page.tsx remounts the component per run, which is what starts a
  // re-run from an empty rail and a closed doc.
  const [phase, setPhase] = useState<"thinking" | "doc">("thinking");

  if (phase === "thinking") {
    return (
      <div className="flex h-full items-center justify-center px-[10cqw] pt-[2cqw] pb-[3cqw]">
        <div style={{ width: `${COLUMN_CQW}cqw` }}>
          <ThinkingRail
            steps={content.steps}
            active={active}
            ctaLabel={content.ctaLabel}
            onCta={() => setPhase("doc")}
            file={<FileChip file={content.file} />}
          />
        </div>
      </div>
    );
  }

  return <BriefDoc content={content} onComplete={onComplete} />;
}

/** The file the rail produced. Inert: the CTA below it is the thing to tap, and two live
 * ways into the same doc would just split the visitor's attention. */
function FileChip({ file }: { file: MeetingBriefContent["file"] }) {
  return (
    <div className="flex w-full items-center gap-[1.1cqw] rounded-[1.4cqw] bg-surface-card px-[1.3cqw] py-[1.1cqw]">
      <img src="/v81-image-assets-inuse/assets/products/docs.svg" alt="" className="h-[2.2cqw] w-[1.7cqw] shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[1.3cqw] leading-[1.75cqw] text-white">{file.title}</span>
        <span className="text-[1.05cqw] text-[#9a9b9c]">{file.app}</span>
      </div>
      <span className="shrink-0 rounded-full bg-[#2b2c2e] px-[1.6cqw] py-[0.55cqw] text-[1.15cqw] font-medium text-white">
        {file.action}
      </span>
    </div>
  );
}

/**
 * Act two: the briefing doc. Headings are regular weight and the bullets carry no bold
 * lead-in — this is a document someone will read in a meeting, not an answer arguing a
 * point, and the design sets it that way.
 */
function BriefDoc({ content, onComplete }: { content: MeetingBriefContent; onComplete?: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const { hasMore, scrollForward } = useScrollCue(scrollRef, innerRef);
  const scrolled = useScrolledOnce(scrollRef, true);

  // Reveal only animates when `show` flips, so the doc mounts hidden and is switched on a
  // frame later — otherwise every block is simply present and the stagger never plays.
  const [writing, setWriting] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWriting(true), 60);
    return () => clearTimeout(t);
  }, []);

  const [cueReady, setCueReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCueReady(true), DOC_CUE_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // every block the doc reveals: the title, the subtitle, and each heading and bullet
  const blockCount =
    2 + content.doc.sections.reduce((n, section) => n + 1 + section.bullets.length, 0);
  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), revealDurationMs(blockCount) + DOC_SETTLE_MS);
    return () => clearTimeout(t);
  }, [onComplete, blockCount]);

  // one reveal index per block, so the doc writes itself top to bottom rather than
  // appearing whole: the title, the subtitle, then each heading and each bullet in turn
  let index = 0;

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto px-[10cqw] pt-[2.3cqw] pb-[6cqw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div ref={innerRef} className="mx-auto w-full" style={{ maxWidth: `${COLUMN_CQW}cqw` }}>
          <Reveal show={writing} index={index++}>
            <h2 className="text-[2.2cqw] leading-[2.8cqw] text-white">{content.doc.title}</h2>
          </Reveal>
          <Reveal show={writing} index={index++} style={{ marginTop: "0.5cqw" }}>
            <p className="text-[1.35cqw] leading-[1.9cqw] text-[#8e8e8e]">{content.doc.subtitle}</p>
          </Reveal>

          {content.doc.sections.map((section) => (
            <div key={section.heading}>
              <Reveal show={writing} index={index++} style={{ marginTop: "2.2cqw" }}>
                <h3 className="text-[1.6cqw] leading-[2.1cqw] text-[#e3e3e3]">{section.heading}</h3>
              </Reveal>
              {section.bullets.map((bullet) => (
                <Reveal key={bullet} show={writing} index={index++} style={{ marginTop: "1cqw" }}>
                  <div className="flex gap-[1cqw] text-[1.25cqw] leading-[1.8cqw] text-white">
                    <Bullet size={0.55} />
                    <span>{bullet}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <RisingDotsCue show={cueReady && hasMore && !scrolled} onClick={scrollForward} />
      </div>
    </div>
  );
}
