"use client";

import type { ChatBubble } from "./types";
import { Reveal } from "./shared";

const CREW_AVATARS = [
  "/gemini/friday-night/avatar-crew-1.png",
  "/gemini/friday-night/avatar-crew-2.png",
  "/gemini/friday-night/avatar-crew-3.png",
  "/gemini/friday-night/avatar-crew-4.png",
];

/** The Messages app's own top bar — replaces the kiosk's usual Gemini/Flash
 * header at the start of this demo, matching how the source design opens
 * directly on the messaging app rather than on Gemini's own chrome. */
export function MessagesTopBar() {
  return (
    <div className="flex items-center justify-center gap-[1cqw] px-[2.87cqw] py-[1.88cqw]">
      <div className="grid shrink-0 grid-cols-2 gap-[0.12cqw]" style={{ width: "1.9cqw", height: "1.9cqw" }}>
        {CREW_AVATARS.map((src) => (
          <img key={src} src={src} alt="" className="h-full w-full rounded-full object-cover" />
        ))}
      </div>
      <span className="text-[1.4cqw] text-[#e4e1e7]">The Crew</span>
    </div>
  );
}

/** One bubble in the thread — outgoing (the user's own, sent on their behalf
 * by Gemini) or incoming (a named group member). Exported so the "go out"
 * response can replay this same bubble language for its own confirmation
 * exchange without re-authoring the styling. Capped at 75% width so a long
 * message wraps across lines like a real chat bubble instead of stretching
 * edge-to-edge — a short message still just hugs its own content. */
export function ChatBubbleRow({ bubble }: { bubble: ChatBubble }) {
  if (bubble.kind === "outgoing") {
    return (
      <div className="flex max-w-[75%] items-center gap-[0.6cqw] self-end rounded-[1.7cqw] bg-[#414468] px-[1.4cqw] py-[0.95cqw] text-[1.25cqw] text-white">
        {bubble.text}
        <span className="h-[0.85cqw] w-[0.85cqw] shrink-0 rounded-full bg-white/70" />
      </div>
    );
  }
  return (
    <div className="flex max-w-[75%] flex-col items-start gap-[0.45cqw]">
      <div className="flex items-center gap-[0.6cqw]">
        <img src={bubble.avatar} alt="" className="h-[1.7cqw] w-[1.7cqw] rounded-full object-cover" />
        <span className="text-[1.05cqw] text-[#dfe4ff]">{bubble.name}</span>
      </div>
      <div className="rounded-tl-[0.4cqw] rounded-tr-[1.7cqw] rounded-b-[1.7cqw] bg-[#201f23] px-[1.4cqw] py-[0.95cqw] text-[1.25cqw] text-[#e4e1e7]">{bubble.text}</div>
    </div>
  );
}

/**
 * The "go out" branch's entry point — a Gemini suggestion surfaced inline in
 * the group chat, standing in for how a real device would proactively
 * notice "sushi" and "gluten free" in the thread. Styled and positioned as
 * part of the thread itself (right-aligned, like the user's own messages)
 * rather than a separate floating card, and replaces the usual idle "Ask
 * Gemini" pill for this one branch: tapping it is what kicks off the
 * compose bar.
 */
function MessagesSuggestionChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex max-w-[75%] items-center gap-[1cqw] self-end rounded-[1.7cqw] border border-white/10 bg-white/5 px-[1.4cqw] py-[0.95cqw] text-left backdrop-blur-xl active:bg-white/10"
    >
      <img src="/gemini/ph-spark.png" alt="" className="h-[2cqw] w-[2cqw] shrink-0 object-cover" />
      <span className="flex flex-col">
        <span className="whitespace-nowrap text-[1.05cqw] font-medium text-white">Sushi restaurants nearby</span>
        <span className="whitespace-nowrap text-[0.8cqw] text-muted">The group chat · Messages</span>
      </span>
    </button>
  );
}

/**
 * The "Pixel Messaging"-style group chat this demo opens on — scene-setting
 * for the prompt that follows, shown behind the compose bar during the idle
 * and typed stages, matching how the source design opens on the group chat
 * before Gemini's own panel takes over once a response starts. Bubbles
 * stagger in on `active` the same way a Gemini answer does elsewhere in the
 * app, rather than just appearing — this is still a conversation.
 * `messages` differs per Friday-night branch (stay in vs. go out open on
 * different conversations) rather than being hardcoded here. `suggestion`
 * (go out only) renders as one more entry in the same thread, not a
 * separate overlay, so it reads as part of the conversation.
 */
export default function MessagesScene({
  active,
  messages,
  suggestion,
}: {
  active: boolean;
  messages: ChatBubble[];
  suggestion?: { show: boolean; onClick: () => void };
}) {
  return (
    <div className="flex h-full flex-col items-center px-[10cqw] pt-[3.2cqw]">
      <div className="flex w-[46cqw] flex-col gap-[1cqw]">
        {messages.map((bubble, i) => (
          <Reveal key={i} show={active} index={i} className="flex flex-col">
            <ChatBubbleRow bubble={bubble} />
          </Reveal>
        ))}
        {suggestion && (
          <div
            className="flex flex-col transition-opacity duration-500"
            style={{ opacity: suggestion.show ? 1 : 0, pointerEvents: suggestion.show ? "auto" : "none" }}
          >
            <MessagesSuggestionChip onClick={suggestion.onClick} />
          </div>
        )}
      </div>
    </div>
  );
}
