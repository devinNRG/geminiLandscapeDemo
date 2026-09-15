"use client";

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
    <div className="flex items-center gap-[1cqw] px-[2.87cqw] py-[1.88cqw]">
      <svg viewBox="0 0 24 24" className="h-[1.6cqw] w-[1.6cqw] shrink-0 text-[#dfe4ff]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
      <div className="grid shrink-0 grid-cols-2 gap-[0.12cqw]" style={{ width: "1.9cqw", height: "1.9cqw" }}>
        {CREW_AVATARS.map((src) => (
          <img key={src} src={src} alt="" className="h-full w-full rounded-full object-cover" />
        ))}
      </div>
      <span className="flex-1 text-[1.4cqw] text-[#e4e1e7]">The Crew</span>
      <div className="flex items-center gap-[1.3cqw] text-[#dfe4ff]">
        <svg viewBox="0 0 24 24" className="h-[1.3cqw] w-[1.3cqw]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        <svg viewBox="0 0 24 24" className="h-[1.3cqw] w-[1.3cqw]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 7l-7 5 7 5V7z" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
        <svg viewBox="0 0 24 24" className="h-[1.3cqw] w-[1.3cqw]" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </div>
    </div>
  );
}

/**
 * The "Pixel Messaging"-style group chat this demo opens on — scene-setting
 * for the prompt that follows, shown behind the compose bar during the idle
 * and typed stages, matching how the source design opens on the group chat
 * before Gemini's own panel takes over once a response starts. Bubbles
 * stagger in on `active` the same way a Gemini answer does elsewhere in the
 * app, rather than just appearing — this is still a conversation.
 */
export default function MessagesScene({ active }: { active: boolean }) {
  return (
    <div className="flex h-full flex-col items-center px-[10cqw] pt-[3.2cqw]">
      <div className="flex w-[46cqw] flex-col gap-[1cqw]">
        <Reveal show={active} index={0} className="flex justify-end">
          <div className="flex items-center gap-[0.6cqw] rounded-[1.7cqw] bg-[#414468] px-[1.4cqw] py-[0.95cqw] text-[1.25cqw] text-white">
            Friday night, what are we doing?
            <span className="h-[0.85cqw] w-[0.85cqw] shrink-0 rounded-full bg-white/70" />
          </div>
        </Reveal>

        <Reveal show={active} index={1}>
          <ChatMessage avatar="/gemini/friday-night/avatar-priya.png" name="Priya" text="let’s just stay in" />
        </Reveal>

        <Reveal show={active} index={2}>
          <ChatMessage avatar="/gemini/friday-night/avatar-marco.png" name="Marco" text="let’s do our usual order" />
        </Reveal>
      </div>
    </div>
  );
}

function ChatMessage({ avatar, name, text }: { avatar: string; name: string; text: string }) {
  return (
    <div className="flex flex-col items-start gap-[0.45cqw]">
      <div className="flex items-center gap-[0.6cqw]">
        <img src={avatar} alt="" className="h-[1.7cqw] w-[1.7cqw] rounded-full object-cover" />
        <span className="text-[1.05cqw] text-[#dfe4ff]">{name}</span>
      </div>
      <div className="rounded-tl-[0.4cqw] rounded-tr-[1.7cqw] rounded-b-[1.7cqw] bg-[#201f23] px-[1.4cqw] py-[0.95cqw] text-[1.25cqw] text-[#e4e1e7]">{text}</div>
    </div>
  );
}
