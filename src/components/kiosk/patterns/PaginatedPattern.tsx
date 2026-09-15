"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PatternProps } from "../types";
import { ContinuousFlow } from "../shared";

/**
 * Renders the answer exactly once, as a single continuous phone-width
 * document, then pages through it by measured pixel height — no section
 * boundaries required, so it works for any shape of generated content.
 * Closest of any pattern to "reading a Gemini answer," just turning
 * scroll into a tap.
 */
export default function PaginatedPattern({ content, active }: PatternProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [page, setPage] = useState(0);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const contentEl = contentRef.current;
    if (!viewport || !contentEl) return;
    const ro = new ResizeObserver(() => {
      setViewportH(viewport.clientHeight);
      setContentH(contentEl.scrollHeight);
    });
    ro.observe(viewport);
    ro.observe(contentEl);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (active) setPage(0);
  }, [active]);

  const pageCount = viewportH > 0 ? Math.max(1, Math.ceil(contentH / viewportH)) : 1;
  const go = (next: number) => setPage(Math.max(0, Math.min(pageCount - 1, next)));

  // if a late reflow (e.g. web font swap) changes the page count, keep the current page in range
  useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1));
  }, [pageCount]);

  return (
    <div className="relative flex h-full flex-col px-[10cqw] pb-[10.6cqw]">
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page === 0}
        aria-label="Previous"
        className="absolute left-[2cqw] top-1/2 z-10 flex h-[4.8cqw] w-[4.8cqw] -translate-y-1/2 items-center justify-center rounded-full bg-white/5 text-white transition-opacity disabled:opacity-0"
      >
        <svg viewBox="0 0 24 24" className="h-[1.8cqw] w-[1.8cqw]" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= pageCount - 1}
        aria-label="Next"
        className="absolute right-[2cqw] top-1/2 z-10 flex h-[4.8cqw] w-[4.8cqw] -translate-y-1/2 items-center justify-center rounded-full bg-white/5 text-white transition-opacity disabled:opacity-0"
      >
        <svg viewBox="0 0 24 24" className="h-[1.8cqw] w-[1.8cqw]" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {/* centers the viewport within whatever height remains above the dots row,
          so the dots themselves stay a fixed last flex item — never pulled down
          into the padding reserved for the compose bar below */}
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div ref={viewportRef} className="w-full max-w-[42cqw] overflow-hidden" style={{ maxHeight: "100%" }}>
          <div
            ref={contentRef}
            style={{
              transform: `translateY(-${page * viewportH}px)`,
              transition: "transform 450ms ease-in-out",
            }}
          >
            <ContinuousFlow content={content} active={active} />
          </div>
        </div>
      </div>

      {pageCount > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-[0.9cqw] pt-[1.4cqw]">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to page ${i + 1}`}
              className="rounded-full transition-all"
              style={{
                height: "0.7cqw",
                width: i === page ? "2.4cqw" : "0.7cqw",
                backgroundColor: i === page ? "#ffffff" : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
