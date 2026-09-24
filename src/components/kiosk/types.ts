/**
 * Generic shape for a generated Gemini answer. `sections` is the part whose
 * length/height is unbounded and content-dependent — it's what each display
 * pattern in `patterns/` is responsible for laying out without overflowing
 * the kiosk frame. `promptLines`, `introLines` and `closingLines` are small,
 * fixed-size pieces every pattern can place as it sees fit.
 */

/** Bolded lead-in on a bulleted fact, e.g. "Getting there:" — shared with the
 * "go out" search results, which bullet the same way. */
export type PlaceBullet = {
  label: string;
  text: string;
};

/**
 * The venue / hotel / restaurant card that sits under a section's heading — the same
 * card language the "go out" search results use, minus the picking (nothing in a text
 * answer is tappable). Sourced from the Figma frame rather than invented: every field
 * here is a row the design actually draws, which is why `status`/`statusTail` are split
 * (the green lead-in and its dimmed tail) instead of being one string.
 */
export type PlaceCard = {
  name: string;
  rating: string;
  /** Review count and price band, dimmed after the star, e.g. "· (1.2K)" or "· (860) · $140 a night" */
  meta: string;
  address: string;
  /** Green lead-in on the status row, e.g. "Fri · load-in 5 PM", "Check-in 3 PM", "Open late" */
  status: string;
  /** Dimmed tail after the status, e.g. "· doors 7 PM" */
  statusTail: string;
  /** Last dimmed row — a travel time or walking distance, e.g. "2 h 10 from LA" */
  note: string;
  image: string;
};

export type Section = {
  id: string;
  heading: string;
  /** The card drawn directly under the heading. */
  place?: PlaceCard;
  /** Prose between the card and the bullets — one <p> per entry, wrapping naturally
   * at whatever width it's given, exactly like `introLines`. */
  body?: string[];
  /** Bulleted facts with a bold lead-in label. Wraps naturally: unlike `items` below
   * these are authored as whole sentences, not as pre-broken display lines. */
  bullets?: PlaceBullet[];
  /** Whether `items` renders with bullet markers. Only meaningful alongside `items`. */
  bulleted?: boolean;
  /** Pre-broken structured items — each entry is a list of display lines, so wrapping
   * stays exact at the width they were authored for. The older of the two list shapes;
   * `bullets` is what content coming from the current design files uses. */
  items?: string[][];
};

export type ResponseContent = {
  promptLines: string[];
  /** Optional lead card above the intro — the band tour answer opens on a map pinning
   * both venues, before any prose. */
  map?: MapCard;
  introLines: string[];
  sections: Section[];
  /** Optional wrap-up after the last section. */
  closingLines?: string[];
};

/** The Google-Maps card at the head of an answer. `pins` are placed as fractions of the
 * map's own box (0–1 from its top-left), so the card can be drawn at any width. */
export type MapCard = {
  image: string;
  /** Vector overlay drawn over the ground image — roads and labels, exported separately. */
  overlay: string;
  /** Width / height of the card as designed, so it scales without being re-measured. */
  aspectRatio: number;
  pins: MapPin[];
};

export type MapPin = {
  label: string;
  /** 0–1 across the map's width / height. */
  x: number;
  y: number;
  /** Which side of the pin the label chip hangs off, so two chips never collide. */
  side: "left" | "right";
  /** Whether the chip sits above or below its pin. */
  vAlign: "above" | "below";
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
        ["Sunday · Late breakfast before the first flight", "out at 1.15"],
      ],
    },
    {
      // the prompt ends "...and put together a packing list", so the answer has to actually
      // produce one — single-line items, straight from the design file
      id: "packing",
      heading: "Packing list",
      bulleted: true,
      items: [
        ["Swimsuits"],
        ["Trail shoes"],
        ["One smart shirt"],
        ["Sunscreen"],
        ["Refillable water bottle"],
        ["Light jacket for the evenings"],
      ],
    },
  ],
};

export const BAND_TOUR_RESPONSE: ResponseContent = {
  promptLines: [
    "Plan The Tuesday Club\u2019s tour.",
    "Two gigs: Friday the 26th at The Copper Owl in San Diego and Saturday the 27th at The Marlin Room.",
    "Build the three days around them: travel timings to make both gigs, a hotel near the venue, and places to eat.",
  ],
  map: {
    image: "/gemini/band-tour/map-venues.png",
    overlay: "/gemini/band-tour/map-overlay.svg",
    aspectRatio: 666.17 / 316.66,
    pins: [
      { label: "The Marlin Room", x: 0.389, y: 0.127, side: "right", vAlign: "below" },
      { label: "The Copper Owl", x: 0.722, y: 0.857, side: "left", vAlign: "above" },
    ],
  },
  introLines: [
    "Here is a three day plan for The Tuesday Club around both gigs: drive times, a hotel by the venue, where to eat after each show, and home on Sunday.",
  ],
  sections: [
    {
      id: "copper-owl",
      heading: "The Copper Owl \u00b7 Friday",
      place: {
        name: "The Copper Owl",
        rating: "4.6",
        meta: "\u00b7 (1.2K)",
        address: "Gaslamp Quarter, San Diego",
        status: "Fri \u00b7 load-in 5 PM",
        statusTail: "\u00b7 doors 7 PM",
        note: "2 h 10 from LA",
        image: "/gemini/band-tour/place-copper-owl.png",
      },
      body: [
        "The Copper Owl is a 400 capacity room off Fifth Avenue in the Gaslamp Quarter, with a house backline and an in-house engineer from five.",
        "It fits the first night: the drive down lands the van with time to spare, and the load-in is early enough to sound check without rushing the set.",
      ],
      bullets: [
        { label: "Getting there:", text: "I-405 to I-5, about 2 h 10 with the trailer, so leave LA by 2.00 to make the 5 PM load-in." },
        { label: "The room:", text: "400 capacity, house backline available, in-house engineer from 5.00 and doors at 7." },
        { label: "Good to know:", text: "Load in at the back entrance on Island Ave; the stage manager is Dana." },
      ],
    },
    {
      id: "waverly-hotel",
      heading: "The Waverly Hotel \u00b7 Friday night",
      place: {
        name: "The Waverly Hotel",
        rating: "4.5",
        meta: "\u00b7 (860) \u00b7 $140 a night",
        address: "Fifth Ave, San Diego",
        status: "Check-in 3 PM",
        statusTail: "\u00b7 van parking",
        note: "4 min from the venue",
        image: "/gemini/band-tour/place-waverly.png",
      },
      body: [
        "The Waverly is a mid-range hotel on Fifth Avenue, four minutes on foot from the Copper Owl\u2019s back door.",
        "It is the one booking on this route that takes a van: the car park is covered and gated, which matters with the gear in the back overnight.",
      ],
      bullets: [
        { label: "Rooms:", text: "Two twin rooms held for Friday, check-in from 3 PM, late arrival noted on the booking." },
        { label: "Parking:", text: "Covered van parking on site, 2.4 m clearance, no charge for guests." },
        { label: "Good to know:", text: "Breakfast runs to 10.00, ahead of the 10.30 check-out on Saturday." },
      ],
    },
    {
      id: "marlin-room",
      heading: "The Marlin Room \u00b7 Saturday",
      place: {
        name: "The Marlin Room",
        rating: "4.8",
        meta: "\u00b7 (2.4K)",
        address: "Ocean Ave, Long Beach",
        status: "Sat \u00b7 load-in 4 PM",
        statusTail: "\u00b7 doors 8 PM",
        note: "1 h 50 from San Diego",
        image: "/gemini/band-tour/place-marlin.png",
      },
      body: [
        "The Marlin Room is a 600 capacity room on Ocean Avenue in Long Beach, with a balcony and a long bar down one side.",
        "It is the bigger of the two nights and the one worth arriving early for, with the sound check at 5.30 and the merch table to set up before doors.",
      ],
      bullets: [
        { label: "Getting there:", text: "About 1 h 50 up the coast from San Diego, so on the road by 11 leaves the afternoon clear." },
        { label: "The room:", text: "600 capacity, house PA, sound check 5.30, doors 8 and a 60 minute set at 9.30." },
        { label: "Good to know:", text: "The merch table is by the bar and the venue takes no cut on merchandise." },
      ],
    },
    {
      id: "koji-ramen",
      heading: "K\u014dji Ramen \u00b7 Saturday night",
      place: {
        name: "K\u014dji Ramen",
        rating: "4.6",
        meta: "\u00b7 (1.1K) \u00b7 $$",
        address: "Pine Ave, Long Beach",
        status: "Open late",
        statusTail: "\u00b7 Closes 1 AM",
        note: "3 min from the venue",
        image: "/gemini/band-tour/place-koji.png",
      },
      body: [
        "Koji Ramen is a ten-seat counter on Pine Avenue, three minutes on foot from the Marlin Room\u2019s front door.",
        "It is the only kitchen near the venue still serving after a 9.30 set, which is what makes it the after-show stop.",
      ],
      bullets: [
        { label: "Menu highlights:", text: "Tonkotsu and a vegetarian shoyu, gyoza, and most plates under fifteen dollars." },
        { label: "Atmosphere:", text: "Ten seats at the counter, no bookings, and quietest before eleven." },
        { label: "Good to know:", text: "Open until 1 AM on Saturdays with last orders at 12.30." },
      ],
    },
  ],
  closingLines: [
    "Three days, two shows and one drive home. The timings hold as long as the van leaves LA by 2.00 on Friday and is on the road by 11 on Saturday; everything after that has an hour of slack in it. The full itinerary, with the Sunday run and the settlement emails, is in the tour plan.",
  ],
};

/**
 * "Organize my semester" — the student's agentic flow. Unlike the Friday-night task (which
 * hands off to a third-party checkout) this one ends inside a Google app: Gemini reads the
 * syllabuses out of Drive and writes the whole term into Calendar, and the payoff is the
 * filled-in calendar itself.
 */

/** One row of the "Thinking it through…" rail. `thought` rows are Gemini narrating what it
 * is doing; `app` rows name the tool it reached for (and carry that app's own mark, which is
 * what makes the rail read as real work rather than as a loading message); the single `done`
 * row ends it. */
export type ThinkingStep =
  | { kind: "thought"; text: string }
  | { kind: "app"; app: "drive" | "calendar"; text: string }
  | { kind: "done"; text: string };

/**
 * What kind of thing a calendar chip is, rather than what color it should be — the palette
 * lives with the component that draws it. Eight tones, because that's what the design uses
 * to make a dense month legible at a glance: you can see the exam weeks and the study blocks
 * without reading a single label.
 */
export type CalendarTone =
  | "class" // a recurring lecture — the periwinkle that fills most of the term
  | "study" // a block Gemini added, which is the whole point of the demo
  | "due" // an assignment or quiz deadline lifted off a syllabus
  | "exam" // midterms and the final
  | "band" // the student's other life: rehearsals and gigs
  | "filming"
  | "media" // posting the footage from a filming day
  | "spark";

export type CalendarEvent = {
  day: number;
  label: string;
  tone: CalendarTone;
};

export type CalendarMonth = {
  name: string;
  /** Weekday the 1st falls on, 0 = Sunday, so the grid can lead with the right blanks. */
  startWeekday: number;
  /** How many days the grid draws. This is the semester window, not the real month —
   * November stops a week after the final rather than running to the 30th, because the
   * story is over by then and the empty rows would only push the grid off the frame. */
  days: number;
  events: CalendarEvent[];
};

export type SemesterPlanContent = {
  promptLines: string[];
  steps: ThinkingStep[];
  /** Echoed above the calendar once it opens, with the "Complete" chip beside it. */
  title: string;
  months: CalendarMonth[];
};

/** Compact authoring for the month grids below — they are long enough as it is. */
const ev = (day: number, label: string, tone: CalendarTone): CalendarEvent => ({ day, label, tone });

export const SEMESTER_PLAN: SemesterPlanContent = {
  promptLines: [
    "Look at my syllabuses in Google Drive and add the",
    "exam and assignment due dates to my calendar.",
  ],
  steps: [
    { kind: "thought", text: "Opening the Drive folder: the course syllabuses." },
    { kind: "app", app: "drive", text: "Google Drive" },
    {
      kind: "thought",
      text: "Extracting the dates: 23 due dates and 6 exams, Quiz 2 on October 13, the final on November 10.",
    },
    { kind: "app", app: "calendar", text: "Google Calendar" },
    {
      kind: "thought",
      text: "Putting every exam and assignment due date on the calendar, with study sessions blocked around the filming days.",
    },
    { kind: "app", app: "calendar", text: "Google Calendar" },
    { kind: "thought", text: "Finalizing the calendar." },
    { kind: "done", text: "Task complete" },
  ],
  title: "Organize my semester",
  months: [
    {
      name: "October",
      startWeekday: 1,
      days: 31,
      events: [
        ev(1, "Chem 14A", "class"), ev(1, "Stats 10", "class"),
        ev(2, "Bio 101", "class"), ev(2, "Post reel", "media"),
        ev(3, "Chem 14A", "class"), ev(3, "Band", "band"),
        ev(4, "Bio 101", "class"), ev(4, "Stats 10", "class"),
        ev(5, "Chem 14A", "class"), ev(5, "Filming", "filming"),
        ev(6, "Shakespeare", "class"), ev(6, "Post reel", "media"),
        ev(7, "Band", "band"), ev(7, "Spark 8:00", "spark"),
        ev(8, "Chem 14A", "class"), ev(8, "Read Othello", "study"),
        ev(9, "Bio 101", "class"), ev(9, "Post reel", "media"),
        ev(10, "Chem 14A", "class"), ev(10, "Band", "band"),
        ev(11, "Bio 101", "class"), ev(11, "Stats 10", "class"),
        ev(12, "Chem 14A", "class"), ev(12, "Filming", "filming"),
        ev(13, "Shakes quiz", "due"), ev(13, "Post reel", "media"),
        ev(14, "Band", "band"), ev(14, "Spark 8:00", "spark"),
        ev(15, "Chem 14A", "class"), ev(15, "Stats 10", "class"),
        ev(16, "Poster due", "due"), ev(16, "Bio 101", "class"),
        ev(17, "Othello essay", "due"), ev(17, "Chem 14A", "class"),
        ev(18, "Filming", "filming"), ev(18, "Bio 101", "class"),
        ev(19, "Study Chem", "study"), ev(19, "Chem 14A", "class"),
        ev(20, "Lab due", "due"), ev(20, "Shakespeare", "class"),
        ev(21, "Band", "band"), ev(21, "Spark 8:00", "spark"),
        ev(22, "Stats quiz", "due"), ev(22, "Stats 10", "class"),
        ev(23, "Read Macbeth", "study"), ev(23, "Post reel", "media"),
        ev(24, "Paper due", "due"), ev(24, "Band", "band"),
        ev(25, "Filming", "filming"), ev(25, "Study Chem", "study"),
        ev(26, "Midterm", "exam"), ev(26, "Copper Owl", "band"),
        ev(27, "Marlin gig", "band"), ev(27, "Post reel", "media"),
        ev(28, "Study Stats", "study"), ev(28, "Spark 8:00", "spark"),
        ev(29, "Midterm", "exam"), ev(29, "Stats 10", "class"),
        ev(30, "Bio 101", "class"), ev(30, "Post reel", "media"),
        ev(31, "Chem 14A", "class"), ev(31, "Band", "band"),
      ],
    },
    {
      name: "November",
      startWeekday: 4,
      days: 17,
      events: [
        ev(2, "Chem 14A", "class"), ev(2, "Study block", "study"),
        ev(3, "Bio 101", "class"), ev(3, "Study block", "study"),
        ev(4, "Stats 10", "class"), ev(4, "Study block", "study"),
        ev(5, "Chem 14A", "class"), ev(5, "Study block", "study"),
        ev(6, "Band", "band"), ev(6, "Study block", "study"),
        ev(7, "Study block", "study"),
        ev(8, "Study block", "study"), ev(8, "Spark 8:00", "spark"),
        ev(9, "Final review", "due"),
        ev(10, "FINAL EXAM", "exam"),
        ev(11, "Bio 101", "class"),
        ev(12, "Band", "band"),
        ev(13, "Post reel", "media"),
      ],
    },
  ],
};

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

/**
 * The Gemini Intelligence chip surfaced inline in a Friday-night group chat — each
 * branch's tap target, standing in for how a real device would proactively read the
 * thread. It replaces the usual idle "Ask Gemini" pill: tapping it is what brings
 * Gemini's own compose bar up from the bottom of the screen.
 */
export type MessagesSuggestion = { title: string };

/** Picks up on Marco's "let's do our usual order". */
export const STAY_IN_SUGGESTION: MessagesSuggestion = { title: "Reorder your usual" };

/** Picks up on Marco's dietary ask. */
export const GO_OUT_SUGGESTION: MessagesSuggestion = { title: "Find restaurants" };

export const GO_OUT_MESSAGES: ChatBubble[] = [
  { kind: "outgoing", text: "Want to go out tonight?" },
  { kind: "incoming", name: "Priya", avatar: "/gemini/friday-night/avatar-priya.png", text: "I’m in!" },
  { kind: "incoming", name: "Marco", avatar: "/gemini/friday-night/avatar-marco.png", text: "Would love to go somewhere with vegetarian options" },
];

export type SushiResult = {
  id: string;
  /** Section heading above this result, e.g. "Kanpai Sushi \u00b7 vegetarian menu \u00b7 0.4 mi" */
  heading: string;
  name: string;
  rating: string;
  /** Review count + price band, shown dimmed after the star, e.g. "\u00b7 (1.9K) \u00b7 $$" */
  meta: string;
  address: string;
  /** Dimmed text after the green "Open", e.g. "\u00b7 Closes 11 PM" */
  closesAt: string;
  distance: string;
  /** Prose under the result card \u2014 one <p> per entry. */
  body: string[];
  bullets: PlaceBullet[];
  /** The message Gemini drafts into the group chat when this result is picked. Every result
   * is tappable and carries its own draft \u2014 the choice has to actually change the outcome,
   * rather than three cards funnelling into one hardcoded message. */
  draftText: string;
};

/**
 * The "go out" branch's response \u2014 a local-search answer rather than a text answer or a
 * task-automation flow, so it gets its own shape and its own renderer
 * (`GoOutResponse.tsx`). It plays entirely inside the Gemini overlay that floats over the
 * group chat: an intro, then a full section per result (heading, tappable photo card,
 * prose, bullets), then a closing comparison. Ends by drafting the tapped result's own
 * `draftText` back into the chat, followed by `replies`.
 */
export type SushiSearchContent = {
  promptLines: string[];
  introText: string;
  results: SushiResult[];
  /** Sums up all three; sits after the last result, so reaching it means the visitor scrolled. */
  closingText: string;
  /** The group's answers, shown under whichever result's `draftText` was picked. Kept
   * choice-agnostic on purpose \u2014 they react to the plan, not to the specific restaurant. */
  replies: ChatBubble[];
};

export const GO_OUT_SEARCH: SushiSearchContent = {
  // What the thread actually asked for, rather than naming a cuisine nobody mentioned.
  // Narrowing to sushi is Gemini's recommendation, so it belongs in the answer below, not
  // in the prompt: `introText` is where the three spots are proposed.
  promptLines: ["Find me restaurants with vegetarian options nearby"],
  introText: "Three sushi spots near you fit the thread, all open tonight. Vegetarian rolls and gluten free soy at every one.",
  results: [
    {
      id: "kanpai",
      heading: "Kanpai Sushi \u00b7 vegetarian menu \u00b7 0.4 mi",
      name: "Kanpai Sushi",
      rating: "4.7",
      meta: "\u00b7 (1.9K) \u00b7 $$",
      address: "214 Sawtelle Blvd",
      closesAt: "\u00b7 Closes 11 PM",
      distance: "0.4 mi",
      body: [
        "Kanpai is a twenty-seat counter on Sawtelle with a short specials board that changes nightly.",
        "It is the closest of the three and the only one with a full vegetarian menu rather than a few substitutions, which is what the thread asked for.",
      ],
      bullets: [
        { label: "Menu highlights:", text: "Vegetarian rolls cut to order, gluten free soy on every table, and a five-piece nigiri set." },
        { label: "Atmosphere:", text: "Counter seating and two small tables, quiet early and busier after eight." },
        { label: "Good to know:", text: "Walk-ins only before seven, then a short wait; four minutes on foot from the flat." },
      ],
      draftText: "Kanpai Sushi tonight? Veggie rolls and gluten free soy, five minutes away",
    },
    {
      id: "umi",
      heading: "Umi Table \u00b7 gluten free soy \u00b7 0.7 mi",
      name: "Umi Table",
      rating: "4.5",
      meta: "\u00b7 (860) \u00b7 $$",
      address: "88 Gayley Ave",
      closesAt: "\u00b7 Closes 10.30 PM",
      distance: "0.7 mi",
      body: [
        "Umi Table is a larger room off Gayley with booths at the back and a sushi bar along the front.",
        "It is the easiest of the three to seat four without booking, and the kitchen is used to keeping gluten free orders separate.",
      ],
      bullets: [
        { label: "Menu highlights:", text: "Gluten free soy as standard, vegetarian maki, and a hot menu beyond the sushi." },
        { label: "Atmosphere:", text: "Booths at the back, table service, and enough room to talk." },
        { label: "Good to know:", text: "Last orders at 10.00 for a 10.30 close, so it suits an earlier start." },
      ],
      draftText: "Umi Table tonight? Veggie rolls and gluten free soy, and we can get four in without booking",
    },
    {
      id: "aoki",
      heading: "Aoki Street Sushi \u00b7 both \u00b7 1.1 mi",
      name: "Aoki Street Sushi",
      rating: "4.8",
      meta: "\u00b7 (2.3K) \u00b7 $$$",
      address: "406 Broxton Ave",
      closesAt: "\u00b7 Closes 12 AM",
      distance: "1.1 mi",
      body: [
        "Aoki Street is the busiest of the three, a Broxton Avenue room that runs late and fills from nine.",
        "It covers both requests at once, vegetarian rolls and gluten free soy, and it is the only one still serving at midnight if the evening runs long.",
      ],
      bullets: [
        { label: "Menu highlights:", text: "A vegetarian omakase at a set price alongside the standard rolls, with gluten free soy throughout." },
        { label: "Atmosphere:", text: "Loud and full after nine; the bar seats turn over faster than the tables." },
        { label: "Good to know:", text: "Open until midnight and the only one of the three taking bookings tonight." },
      ],
      draftText: "Aoki Street Sushi tonight? Veggie rolls and gluten free soy, and they take a booking",
    },
  ],
  closingText:
    "All three are open tonight and all three cover the vegetarian and gluten free requests in the thread. Kanpai is the shortest walk, Umi Table the easiest to seat four without booking, and Aoki Street the one still serving at midnight.",
  replies: [
    { kind: "incoming", name: "Priya", avatar: "/gemini/friday-night/avatar-priya.png", text: "perfect. 7.30?" },
    { kind: "incoming", name: "Marco", avatar: "/gemini/friday-night/avatar-marco.png", text: "in." },
  ],
};

export type Persona = {
  id: string;
  /** Who they are, as the landing pill's first line — a role, not an age ("Student", not "The student, 20"). */
  label: string;
  /** The second line under it, describing the life the story is a day in. */
  sublabel: string;
  /**
   * A scene from this persona's life rather than a portrait of them — the landing pill shows
   * the desk, the trail, the loaded car, not a face. Drawn as a circle there, so what matters
   * is the middle of the frame: all three of these crop well dead-centre, which is why there
   * is no focal-point knob here any more. A photo whose subject sits off-centre would need
   * one back (`object-position`), so check a replacement before dropping it in.
   */
  image: string;
  /** Whether this card routes anywhere yet — disabled/greyed out on the landing screen until it does. */
  active?: boolean;
};

export const PERSONAS: Persona[] = [
  { id: "student", label: "Student", sublabel: "College student and guitar player", image: "/v81-image-assets-inuse/assets/pick/student-opt-8b.jpg", active: true },
  { id: "traveler", label: "Traveler", sublabel: "Professional who loves to travel", image: "/v81-image-assets-inuse/assets/pick/sunrise-meadow.jpg", active: true },
  { id: "parent", label: "Working Parent", sublabel: "Parent with school and work obligations", image: "/v81-image-assets-inuse/assets/pick/parent-suv3.jpg", active: true },
];

export type RundownPill = {
  id: string;
  label: string;
  /** Whether this pill routes into a built demo — every other pill renders disabled/greyed out until its use case is built. */
  active?: boolean;
};

export type RundownData = {
  bgImage: string;
  /**
   * How the backdrop is framed, on top of a plain `object-cover` fit.
   *
   * These photos are wide banner crops (930x362) with a large, centred subject going into a
   * 16:9 frame, so by default the face lands exactly where the centred heading and the
   * centred pill stack are. Zoom and pan are what move it out from behind them.
   *
   * Panning has to be paid for with zoom, in both axes. `object-cover` crops the photo to
   * this element's own box, so the extra image width a 2.569 photo has over a 1.778 frame is
   * already thrown away and is *not* available to pan into — what moves is the box. At
   * `bgZoom` Z the box overhangs the frame by 50 * (Z - 1) cqw each side and
   * 28.125 * (Z - 1) cqw top and bottom, and that overhang is the entire pan budget:
   *
   *     |bgOffsetXCqw| <= 50 * (bgZoom - 1)
   *     |bgOffsetYCqw| <= 28.125 * (bgZoom - 1)
   *
   * Go past either and the black frame shows through at that edge. Negative Y moves the
   * subject up, negative X moves it left.
   *
   * Replaced an earlier width%/left% pair that could only pan horizontally — and that, at
   * the values it was carrying, worked out to exactly a plain centred cover anyway.
   *
   * Dormant at the moment: all three backdrops happen to frame correctly as a plain centred
   * cover, so none of them spends any of this budget. Kept because the next photo swap is
   * where it gets spent, and the arithmetic above is the part that is easy to get wrong.
   */
  bgZoom?: number;
  bgOffsetXCqw?: number;
  bgOffsetYCqw?: number;
  pills: RundownPill[];
};

/** Keyed by Persona.id — only personas with a built rundown screen appear here. */
export const RUNDOWNS: Record<string, RundownData> = {
  student: {
    // The real study-desk scene. It is a 9:16 source in a 16:9 frame, so a plain centred
    // cover keeps only the middle third of it — which happens to be the best third: the
    // tablet lands dead centre with the phone, book and notebook around it. Every framing
    // that zooms or pans off that made it worse (the tablet grows and swallows the frame),
    // so this one is deliberately left alone. What the crop costs is contrast under the
    // pills, where the tablet's white screen sits — the scrim in RundownScreen pays for it.
    bgImage: "/v81-image-assets-inuse/assets/pick/student-opt-8b.jpg",
    pills: [
      { id: "study-semester", label: "Organize my semester", active: true },
      { id: "friday-night", label: "Make plans for Friday night", active: true },
      { id: "band-tour", label: "Rock the band tour", active: true },
      { id: "study-notebook", label: "Build a study notebook" },
    ],
  },
  traveler: {
    // Same photo the landing pill crops its thumbnail from, which is the rule now: the pill
    // is a window onto the screen it opens. Wider than the frame (2.36:1 into 16:9) and
    // composed with the meadow low and the ridge high, so a plain centred cover already puts
    // the dark meadow under the pill stack — nothing to pan for.
    bgImage: "/v81-image-assets-inuse/assets/pick/sunrise-meadow.jpg",
    pills: [
      { id: "friends-weekend", label: "Sort the friend’s weekend", active: true },
      { id: "partnerships-vp", label: "Brief me on the partnerships VP" },
      { id: "saturday-dinner", label: "Book Saturday dinner" },
      { id: "new-city", label: "Explore a new city" },
    ],
  },
  parent: {
    // 9:16 into 16:9, so a centred cover keeps the middle third — which frames the open boot
    // and the kit in it, with the empty dark interior landing right where the pills go.
    bgImage: "/v81-image-assets-inuse/assets/pick/parent-suv3.jpg",
    pills: [
      { id: "party", label: "Plan the party end to end" },
      { id: "play-date", label: "Answer the play date" },
      { id: "tonight-dinner", label: "What can we make tonight?" },
      { id: "voice-update", label: "Send the update by voice" },
    ],
  },
};
