"use client";

import { useEffect, useState } from "react";

/**
 * Reveals text character-by-character, like the prompt being typed live into
 * the compose box, with a blinking cursor trailing the current write
 * position. `lines` is how the prompt is authored as data (natural sentence
 * chunks); they're joined into one flowing paragraph here so the browser
 * wraps it to the container's actual width rather than at the authored
 * chunk boundaries. Resets and replays every time `active` flips true, after
 * an optional hold (`startDelayMs`) — a beat where the cursor sits before any
 * characters appear, like a pause before typing begins.
 */
export default function TypingLines({
  lines,
  active,
  charsPerTick = 1,
  tickMs = 30,
  startDelayMs = 0,
  onDone,
}: {
  lines: string[];
  active: boolean;
  charsPerTick?: number;
  tickMs?: number;
  startDelayMs?: number;
  /** Fires once, the moment every character has been revealed. */
  onDone?: () => void;
}) {
  const text = lines.join(" ");
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (!active) {
      setVisible(0);
      return;
    }
    setVisible(0);
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const delayId = setTimeout(() => {
      intervalId = setInterval(() => {
        setVisible((v) => Math.min(text.length, v + charsPerTick));
      }, tickMs);
    }, startDelayMs);
    return () => {
      clearTimeout(delayId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [active, text, charsPerTick, tickMs, startDelayMs]);

  const done = visible >= text.length;

  useEffect(() => {
    if (active && done) onDone?.();
  }, [active, done, onDone]);

  return (
    <p>
      {text.slice(0, visible)}
      {!done && <span className="ml-[0.1em] inline-block h-[0.9em] w-[0.09em] translate-y-[0.12em] animate-pulse bg-current align-middle" />}
    </p>
  );
}
