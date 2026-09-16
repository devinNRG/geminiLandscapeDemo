/**
 * Generic shape for a generated Gemini answer. `sections` is the part whose
 * length/height is unbounded and content-dependent — it's what each display
 * pattern in `patterns/` is responsible for laying out without overflowing
 * the kiosk frame. `promptLines` and `introLines` are small, fixed-size
 * pieces every pattern can place as it sees fit.
 */
export type Section = {
  id: string;
  heading: string;
  bulleted: boolean;
  /** Each item is pre-broken into display lines so wrapping stays exact at any scale. */
  items: string[][];
};

export type ResponseContent = {
  promptLines: string[];
  introLines: string[];
  sections: Section[];
};

export const WEEKEND_RESPONSE: ResponseContent = {
  promptLines: [
    "Sort the friends weekend. Everyone",
    "lands at a different time: build the",
    "weekend around the arrivals, match",
  ],
  introLines: [
    "Here is the weekend built around the five arrivals,",
    "with the food and activity preferences from the",
    "sheet. Pack light: the house has towels, a washer",
    "and beach gear.",
  ],
  sections: [
    {
      id: "arrivals",
      heading: "Arrivals, Friday at LAX",
      bulleted: true,
      items: [
        ["Jonas · UA 512 from San Francisco, landed", "2.10"],
        ["Nadia · DL 1187 from Atlanta, lands 5.25 after", "a 40 minute delay"],
        ["Rafael · AA 2210 from New York, lands 9.15"],
      ],
    },
    {
      id: "preferences",
      heading: "From the preferences sheet",
      bulleted: true,
      items: [
        ["Nadia · vegetarian"],
        ["Rafael · late arrival, no early starts"],
        ["Jonas · a hike on Saturday"],
        ["Everyone · one dinner together"],
      ],
    },
    {
      id: "weekend",
      heading: "The weekend",
      bulleted: false,
      items: [
        ["Friday · Jonas lands 2.10, Nadia 5.25 after", "the delay, Rafael 9.15"],
        ["Friday · Dinner for four at 6.30, ramen with", "Rafael at 9.45"],
        ["Saturday · Morning hike at Runyon Canyon,", "afternoon free"],
        ["Saturday · Table for five at 8, everyone", "together"],
      ],
    },
  ],
};

export const BAND_TOUR_RESPONSE: ResponseContent = {
  promptLines: [
    "Plan The Tuesday Club's tour.",
    "Two gigs: Friday the 26th at The Copper Owl in San Diego and Saturday the 27th at The Marlin Room.",
    "Build the three days around them: travel timings to make both gigs, a hotel near the venue, and places to eat.",
  ],
  introLines: [
    "Here is a three day plan for The Tuesday Club around both gigs: drive times, a hotel by the venue, where to eat after each show, and home on Sunday.",
  ],
  sections: [
    {
      id: "copper-owl",
      heading: "The Copper Owl · Friday",
      bulleted: true,
      items: [
        ["Getting there · I-405 to I-5, 2h 10 with the", "trailer — leave LA by 2 for the 5 PM load-in"],
        ["The room · 400 cap, house backline, in-house", "engineer from 5, doors at 7"],
        ["Good to know · Load in at the back entrance", "on Island Ave, ask for Dana"],
      ],
    },
    {
      id: "waverly-hotel",
      heading: "The Waverly Hotel · Friday night",
      bulleted: true,
      items: [
        ["Rooms · Two twins held for Friday, check-in", "from 3 PM, late arrival noted"],
        ["Parking · Covered van parking on site, 2.4m", "clearance, no charge"],
        ["Good to know · Breakfast to 10, ahead of the", "10.30 check-out Saturday"],
      ],
    },
    {
      id: "marlin-room",
      heading: "The Marlin Room · Saturday",
      bulleted: true,
      items: [
        ["Getting there · About 1h 50 up the coast —", "on the road by 11 keeps the afternoon clear"],
        ["The room · 600 cap, house PA, sound check", "5.30, doors 8, set at 9.30"],
        ["Good to know · Merch table's by the bar,", "venue takes no cut"],
      ],
    },
    {
      id: "koji-ramen",
      heading: "Kōji Ramen · Saturday night",
      bulleted: true,
      items: [
        ["Menu · Tonkotsu and a vegetarian shoyu,", "gyoza, most plates under $15"],
        ["Atmosphere · Ten seats at the counter, no", "bookings, quietest before 11"],
        ["Good to know · Open to 1 AM Saturdays,", "last orders 12.30"],
      ],
    },
  ],
};

export type PatternId = "scroll" | "measuredColumns";

export type PatternProps = {
  content: ResponseContent;
  /** Whether this pattern is the one currently on screen — patterns reset their internal nav state on the false→true edge. */
  active: boolean;
  /** Fires once the answer has fully revealed — drives the shared "back to landing" corner button in page.tsx. */
  onComplete?: () => void;
};

/**
 * A Gemini agentic-task answer — not a text answer at all, but a sequence of
 * status updates ending in a handoff to a third-party app card. Distinct
 * from `ResponseContent` because there's nothing to paginate or column-split:
 * it's a short, fixed sequence of steps that plays out on its own timing.
 */
export type TaskStep = {
  id: string;
  heading: string;
  subtext: string;
  /** 0–1 fill for the step's progress bar; omit for a step with no bar. */
  progress?: number;
};

export type FoodOrderItem = {
  id: string;
  name: string;
  price: string;
  image: string;
};

export type FoodOrderData = {
  appName: string;
  deliveryLabel: string;
  deliveryAddress: string;
  restaurantInitial: string;
  restaurantName: string;
  itemCount: string;
  items: FoodOrderItem[];
  subtotal: string;
  deliveryFee: string;
  taxes: string;
  total: string;
};

export type TaskDemoContent = {
  promptLines: string[];
  introText: string;
  /** Auto-advances on a timer; the last step is the one that shows the CTA into the app card. */
  steps: TaskStep[];
  foodOrder: FoodOrderData;
};

export const FRIDAY_NIGHT_TASK: TaskDemoContent = {
  promptLines: ["Reorder me what we ordered", "last Friday from Lotus Thai", "using FoodOrder app"],
  introText: "I’m on it.",
  steps: [
    { id: "working", heading: "Working on your task", subtext: "Automating tasks…" },
    { id: "selecting", heading: "Task in progress", subtext: "Selecting Lotus Thai", progress: 0.25 },
    { id: "progress", heading: "Task in progress", subtext: "Automation is running", progress: 0.55 },
    { id: "cart", heading: "Task in progress", subtext: "Adding your usual order to cart", progress: 0.8 },
    { id: "finish", heading: "Finish up your task", subtext: "Your Lotus Thai order is prepared." },
  ],
  foodOrder: {
    appName: "FoodOrder",
    deliveryLabel: "Home",
    deliveryAddress: "815 Hillhurst Ave, Los Angeles",
    restaurantInitial: "L",
    restaurantName: "Lotus Thai",
    itemCount: "3 items",
    items: [
      { id: "padseeew", name: "Pad see ew + spring rolls", price: "$18.20", image: "/gemini/friday-night/food-padseeew.png" },
      { id: "dumplings", name: "Dumplings + sticky rice", price: "$16.40", image: "/gemini/friday-night/food-dumplings.png" },
      { id: "water", name: "Four waters", price: "$8.00", image: "/gemini/friday-night/food-water.png" },
    ],
    subtotal: "$42.60",
    deliveryFee: "$3.90",
    taxes: "$2.10",
    total: "$48.60",
  },
};

/** A single message bubble in the Messages-app scene — shared between the two
 * Friday-night branches (each opens on a different conversation) and the
 * "go out" branch's later confirmation exchange, so the bubble styling lives
 * in one place (`MessagesScene.tsx`) instead of being re-authored per screen. */
export type ChatBubble =
  | { kind: "outgoing"; text: string }
  | { kind: "incoming"; name: string; avatar: string; text: string };

export const STAY_IN_MESSAGES: ChatBubble[] = [
  { kind: "outgoing", text: "Friday night, what are we doing?" },
  { kind: "incoming", name: "Priya", avatar: "/gemini/friday-night/avatar-priya.png", text: "let’s just stay in" },
  { kind: "incoming", name: "Marco", avatar: "/gemini/friday-night/avatar-marco.png", text: "let’s do our usual order" },
];

export const GO_OUT_MESSAGES: ChatBubble[] = [
  { kind: "outgoing", text: "Friday night, what are we doing?" },
  { kind: "incoming", name: "Priya", avatar: "/gemini/friday-night/avatar-priya.png", text: "let’s go to sushi tonight" },
  { kind: "incoming", name: "Marco", avatar: "/gemini/friday-night/avatar-marco.png", text: "only if there are vegetarian and gluten free options" },
];

export type SushiResult = {
  id: string;
  name: string;
  rating: number;
  status: string;
  closesAt: string;
  address: string;
  distance: string;
  /** Whether tapping this card routes anywhere yet — only one result is wired to the built
   * confirmation flow, same active/disabled convention as every other pill in this app. */
  active?: boolean;
};

/**
 * The "go out" branch's response — a local-search answer (map + result list)
 * rather than a text answer or a task-automation flow, so it gets its own
 * shape and its own renderer (`GoOutResponse.tsx`). Ends by drafting
 * `confirmation` into the group chat once the one active result is tapped.
 */
export type SushiSearchContent = {
  promptLines: string[];
  introText: string;
  mapImage: string;
  results: SushiResult[];
  confirmation: ChatBubble[];
};

export const GO_OUT_SEARCH: SushiSearchContent = {
  promptLines: ["Find the best sushi restaurants near me"],
  introText: "Three sushi spots near you fit the thread, all open tonight. Vegetarian rolls and gluten free soy at every one.",
  mapImage: "/gemini/friday-night/map-sushi.png",
  results: [
    { id: "kanpai", name: "Kanpai Sushi", rating: 4.7, status: "Open", closesAt: "Closes 11 PM", address: "214 Sawtelle Blvd", distance: "0.4 mi", active: true },
    { id: "umi", name: "Umi Table", rating: 4.5, status: "Open", closesAt: "Closes 10.30 PM", address: "88 Gayley Ave", distance: "0.7 mi" },
    { id: "aoki", name: "Aoki Street Sushi", rating: 4.8, status: "Open", closesAt: "Closes 12 AM", address: "406 Broxton Ave", distance: "1.1 mi" },
  ],
  confirmation: [
    { kind: "outgoing", text: "Kanpai Sushi tonight? Veggie rolls and gluten free soy, five minutes away" },
    { kind: "incoming", name: "Priya", avatar: "/gemini/friday-night/avatar-priya.png", text: "perfect. 7.30?" },
    { kind: "incoming", name: "Marco", avatar: "/gemini/friday-night/avatar-marco.png", text: "in." },
  ],
};

export type Persona = {
  id: string;
  label: string;
  sublabel: string;
  image: string;
  /** Horizontal focal point (0-100, `object-position` X) that keeps this persona's face centered under `object-fit: cover` — each source photo needs its own crop. */
  imageFocusXPct: number;
  /** Whether this card routes anywhere yet — disabled/greyed out on the landing screen until it does. */
  active?: boolean;
};

export const PERSONAS: Persona[] = [
  { id: "student", label: "The student, 20", sublabel: "Student and guitar player", image: "/gemini/personas/student.png", imageFocusXPct: 40, active: true },
  { id: "traveler", label: "The traveler, 28", sublabel: "Professional who loves to travel", image: "/gemini/personas/traveler.png", imageFocusXPct: 37, active: true },
  { id: "parent", label: "The parent, 38", sublabel: "Parent with school and work obligations", image: "/gemini/personas/parent.png", imageFocusXPct: 44, active: true },
];

/** Landing-screen layout options — both are live explorations pending client sign-off, switchable at runtime via the picker in `page.tsx`. */
export type LandingLayoutId = "cards" | "glassPills";

export type RundownPill = {
  id: string;
  label: string;
  /** Whether this pill routes into a built demo — every other pill renders disabled/greyed out until its use case is built. */
  active?: boolean;
};

export type RundownData = {
  bgImage: string;
  /** Oversized-crop technique (matches the landing cards): omit to fall back to plain object-cover. */
  bgImageWidthPct?: number;
  bgImageLeftPct?: number;
  pills: RundownPill[];
};

/** Keyed by Persona.id — only personas with a built rundown screen appear here. */
export const RUNDOWNS: Record<string, RundownData> = {
  student: {
    bgImage: "/gemini/personas/student.png",
    bgImageWidthPct: 144.51,
    bgImageLeftPct: -22.25,
    pills: [
      { id: "study-semester", label: "Plan my study semester" },
      { id: "friday-night", label: "Sort Friday night", active: true },
      { id: "band-tour", label: "Plan the band tour", active: true },
      { id: "poster", label: "Make the poster" },
      { id: "study-notebook", label: "Make a study notebook" },
    ],
  },
  traveler: {
    bgImage: "/gemini/personas/traveler.png",
    pills: [
      { id: "friends-weekend", label: "Sort the friend’s weekend", active: true },
      { id: "partnerships-vp", label: "Brief me on the partnerships VP" },
      { id: "saturday-dinner", label: "Book Saturday dinner" },
      { id: "new-city", label: "Explore a new city" },
    ],
  },
  parent: {
    bgImage: "/gemini/personas/parent.png",
    pills: [
      { id: "party", label: "Plan the party end to end" },
      { id: "play-date", label: "Answer the play date" },
      { id: "tonight-dinner", label: "What can we make tonight?" },
      { id: "voice-update", label: "Send the update by voice" },
    ],
  },
};
