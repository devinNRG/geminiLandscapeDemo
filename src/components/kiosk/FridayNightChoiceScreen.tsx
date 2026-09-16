"use client";

/**
 * Sits between picking the "Sort Friday night" pill and playing a demo — the
 * use case branches into two: "Go out" (a local-search flow — nearby sushi
 * spots, ending with Gemini drafting a plan into the group chat) and "Stay
 * in" (the FoodOrder task-automation flow).
 */
export default function FridayNightChoiceScreen({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (choice: "goOut" | "stayIn") => void;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="absolute left-[2.6cqw] top-[5.94cqw] z-10 flex h-[3.23cqw] w-[3.23cqw] items-center justify-center"
      >
        <img src="/gemini/rundown/back-button.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <span className="relative text-[1.55cqw] text-white/96">‹</span>
      </button>

      <p className="relative z-10 pointer-events-none pt-[5.63cqw] text-center text-[2.9cqw] text-white">How should Friday night go?</p>

      <div className="relative z-10 mt-auto flex w-full flex-col items-center pb-[2.71cqw]">
        <div className="flex w-[48cqw] flex-col gap-[1cqw]">
          <button
            type="button"
            onClick={() => onSelect("goOut")}
            className="flex h-[5.16cqw] items-center justify-center rounded-full border border-white/15 bg-white/10 text-[1.5cqw] font-medium text-white backdrop-blur-xl active:bg-white/20"
          >
            Go out
          </button>
          <button
            type="button"
            onClick={() => onSelect("stayIn")}
            className="flex h-[5.16cqw] items-center justify-center rounded-full border border-white/15 bg-white/10 text-[1.5cqw] font-medium text-white backdrop-blur-xl active:bg-white/20"
          >
            Stay in
          </button>
        </div>
      </div>
    </div>
  );
}
