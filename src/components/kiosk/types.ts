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
  /** Bold lead-in; a bullet without one is a plain sentence. */
  label?: string;
  /** Can be empty when the bullet is only a label heading its `children`. */
  text: string;
  /** Sub-bullets, indented one level under this one (the band tour's timed schedule). */
  children?: PlaceBullet[];
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
  image: string;
  /** Every row below the name is optional — the design draws a place (a city) with its
   * name alone, a hotel with a rating and a category, a restaurant with its hours. */
  rating?: string;
  /** Review count and price band, dimmed after the star, e.g. "· (1.2K)" or "· (860) · $140 a night" */
  meta?: string;
  address?: string;
  /** Coloured lead-in on the status row, e.g. "Hotel", "Open", "Closed" */
  status?: string;
  /** Green for open/available (the default), a soft red for closed. */
  statusTone?: "open" | "closed";
  /** Dimmed tail after the status, e.g. "· Opens 11:00 AM" */
  statusTail?: string;
  /** Last dimmed row — a travel time or walking distance, e.g. "2 h 10 from LA" */
  note?: string;
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
  /** Number `bullets` 1, 2, 3… instead of marking them — a checklist rather than a list. */
  numbered?: boolean;
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
  /** Optional — the band tour answer goes straight from its map into its first section. */
  introLines?: string[];
  /** Section headings in regular weight rather than bold — the newer design files draw
   * them that way; the older weekend answer keeps its bold. */
  plainHeadings?: boolean;
  sections: Section[];
  /** Optional wrap-up after the last section. */
  closingLines?: string[];
};

/** A Google Maps still with pins (and optionally a route) drawn over it. Pins and route
 * points are fractions of the map's own box (0–1 from its top-left; a pin at its head's
 * centre), so the card can be drawn at any width. */
export type MapCard = {
  image: string;
  /** Width / height of the card, so it scales without being re-measured. */
  aspectRatio: number;
  pins: MapPin[];
  /** Pin fill — Google's amber for food, its blue for everything else (the default). */
  pinColor?: string;
  /** A drive drawn as a blue line through these points, in order. */
  route?: [number, number][];
};

export type MapPin = {
  label: string;
  x: number;
  y: number;
  /** Which side of the pin the label chip hangs off, so two chips never collide. */
  side: "left" | "right";
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
    "The band is playing a show Friday night in Austin and Saturday night in Dallas. Help plan the trip, including hotel suggestions, places to eat, and travel timing with the van.",
  ],
  // pins and route traced off the design: a pin sits at its head's centre, and the route
  // runs I-35 from Austin up through Waco into Dallas
  map: {
    image: "/v81-image-assets-inuse/assets/map-texas-tour-wide.jpg",
    aspectRatio: 2,
    pins: [
      { label: "The Elm Street Hotel", x: 0.54, y: 0.202, side: "right" },
      { label: "South Congress Motor Inn", x: 0.463, y: 0.674, side: "right" },
    ],
    route: [
      [0.462, 0.735],
      [0.463, 0.683],
      [0.48, 0.61],
      [0.495, 0.574],
      [0.505, 0.538],
      [0.512, 0.502],
      [0.514, 0.465],
      [0.514, 0.429],
      [0.522, 0.393],
      [0.534, 0.356],
      [0.537, 0.32],
      [0.538, 0.248],
      [0.536, 0.225],
    ],
  },
  plainHeadings: true,
  sections: [
    {
      id: "van-travel",
      heading: "Van Travel Timing & Route Logistics",
      place: { name: "Austin", image: "/v81-image-assets-inuse/assets/tour-austin.jpg" },
      bullets: [
        { label: "Route:", text: "Austin to Dallas via I-35 North." },
        { label: "Standard Drive Time:", text: "3 hours, 15 minutes (195 miles)." },
        {
          label: "Touring Buffer Schedule:",
          text: "",
          children: [
            { label: "11:00 AM:", text: "Load out / depart Austin to clear central Austin traffic." },
            { label: "12:45 PM \u2013 1:30 PM:", text: "Midpoint fuel, gear check, and lunch stop in West, TX." },
            {
              label: "3:15 PM:",
              text: "Arrival in Dallas (accounts for I-35 construction around Waco/Temple and entry traffic into Dallas ahead of late-afternoon soundcheck/load-in).",
            },
          ],
        },
      ],
    },
    {
      id: "lodging",
      heading: "Lodging (Van & Trailer-Friendly)",
      place: {
        name: "South Congress Motor Inn",
        rating: "4.5",
        status: "Hotel",
        image: "/v81-image-assets-inuse/assets/tour-austin-motel.jpg",
      },
      body: [
        "South Congress Motor Inn provides an iconic South Congress location with dedicated outdoor surface parking, making it far simpler to navigate and park an oversized touring van or gear vehicle compared to downtown parking garages.",
      ],
      bullets: [
        { text: "Open surface lot with ground-level access." },
        { text: "Located minutes from major South Austin music venues and downtown." },
        { text: "Retro, vibrant aesthetic with 24-hour front desk support." },
      ],
    },
    {
      id: "food-austin",
      heading: "Food Stops \u00b7 Austin",
      place: {
        name: "Casa Verde on South First",
        rating: "4.4",
        status: "Closed",
        statusTone: "closed",
        statusTail: "\u00b7 Opens 11:00 AM",
        image: "/v81-image-assets-inuse/assets/tour-fresas.jpg",
      },
      body: [
        "Casa Verde on South First serves wood-grilled achiote and citrus chicken, scratch salsas, and fresh sides under an expansive patio canopy with dedicated surface parking.",
      ],
      bullets: [
        { text: "Signature charcoal-grilled achiote chicken platters and crunchy cabbage slaws." },
        { text: "Fast walk-up or dine-in ordering suited for tight band schedules." },
      ],
    },
    {
      id: "checklist",
      heading: "Band Tour Execution Checklist",
      numbered: true,
      bullets: [
        {
          label: "Advance Parking:",
          text: "Call South Congress Motor Inn and The Elm Street Hotel 24 hours prior to confirm trailer length and reserve dedicated end-stalls or loading dock access.",
        },
        {
          label: "Gear Security:",
          text: "Ensure trailer hitch locks and secondary puck locks are installed prior to Friday night check-in; never leave exposed gear bags in passenger windows at hotel surface lots.",
        },
        {
          label: "Toll Tag Check:",
          text: "Equip the van with a TxTag/NTTA-compatible pass for the I-35 express lanes to bypass recurrent Waco and Dallas rush-hour bottlenecks.",
        },
      ],
    },
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

export type RestaurantResult = {
  id: string;
  /** Section heading above this result, e.g. "Verdant Table \u00b7 fully vegetarian \u00b7 0.4 mi" */
  heading: string;
  name: string;
  rating: string;
  /** Category line under the rating, shown beside the vegetarian badge. */
  category: string;
  /** Dimmed text after the green "Open", e.g. "\u00b7 Closes 11:00 PM" */
  closesAt: string;
  image: string;
  /** Prose under the result card \u2014 one <p> per entry. A paragraph that opens with `name`
   * gets the name underlined, the way the design links the place back to its card. */
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
 * group chat: a map of all three, an intro, then a full section per result (heading,
 * tappable photo card, prose, bullets). Ends by drafting the tapped result's own
 * `draftText` back into the chat, followed by `replies`.
 */
export type RestaurantSearchContent = {
  promptLines: string[];
  /** Named in the loading beat \u2014 the app Gemini is reaching into, not a list of steps. */
  loadingCaption: string;
  /** The plain Maps still that heads the answer, with a food pin per restaurant. */
  map: MapCard;
  introText: string;
  results: RestaurantResult[];
  /** The group's answers, shown under whichever result's `draftText` was picked. Kept
   * choice-agnostic on purpose \u2014 they react to the plan, not to the specific restaurant. */
  replies: ChatBubble[];
};

export const GO_OUT_SEARCH: RestaurantSearchContent = {
  promptLines: ["Find me restaurants with vegetarian options nearby"],
  loadingCaption: "Connecting to Google Maps\u2026",
  map: {
    image: "/v81-image-assets-inuse/assets/map-venue-la.jpg",
    // the still is taller than 2:1; the three restaurants sit in its upper part
    aspectRatio: 2,
    pinColor: "#F1BF42",
    pins: [
      { label: "Verdant Table", x: 0.3, y: 0.453, side: "right" },
      { label: "Sprout Kitchen", x: 0.804, y: 0.292, side: "left" },
      { label: "The Green Fig", x: 0.606, y: 0.689, side: "right" },
    ],
  },
  introText: "Here are several nearby vegetarian and vegetarian-friendly restaurants to consider:",
  results: [
    {
      id: "verdant",
      heading: "Verdant Table \u00b7 fully vegetarian \u00b7 0.4 mi",
      name: "Verdant Table",
      rating: "4.7",
      category: "Vegetarian restaurant",
      closesAt: "\u00b7 Closes 11:00 PM",
      image: "/v81-image-assets-inuse/assets/pick/veg-dish-1.jpg",
      body: [
        "Verdant Table is a twenty-seat room on Sawtelle with a short seasonal menu that changes nightly.",
        "It is the closest of the three and the whole menu is vegetarian rather than a few substitutions, which is what the thread asked for.",
      ],
      bullets: [
        { label: "Menu highlights:", text: "Roast squash with salsa verde, halloumi and grains, and a gluten free flatbread." },
        { label: "Atmosphere:", text: "Counter seating and two small tables, quiet early and busier after eight." },
        { label: "Good to know:", text: "Walk-ins only before seven, then a short wait; four minutes on foot from the flat." },
      ],
      draftText: "Verdant Table tonight? Fully vegetarian with gluten free options, five minutes away",
    },
    {
      id: "green-fig",
      heading: "The Green Fig \u00b7 gluten free menu \u00b7 0.7 mi",
      name: "The Green Fig",
      rating: "4.5",
      category: "Vegetarian-friendly restaurant",
      closesAt: "\u00b7 Closes 10:30 PM",
      image: "/v81-image-assets-inuse/assets/wk-nyc-2-int.jpg",
      body: [
        "The Green Fig is a larger room off Gayley with booths at the back and an open kitchen along the front.",
        "It is the easiest of the three to seat four without booking, and the kitchen keeps a separate gluten free menu rather than adapting dishes on the night.",
      ],
      bullets: [
        { label: "Menu highlights:", text: "Wood-fired vegetable plates, a lentil and aubergine stew, and a gluten free menu on its own page." },
        { label: "Atmosphere:", text: "Booths at the back and a bar along the front, lively from eight." },
        { label: "Good to know:", text: "Bookings taken but walk-ins seated most nights; ten minutes on foot." },
      ],
      draftText: "The Green Fig tonight? Vegetarian with a gluten free menu, ten minutes away",
    },
    {
      id: "sprout",
      heading: "Sprout Kitchen \u00b7 open until midnight \u00b7 1.1 mi",
      name: "Sprout Kitchen",
      rating: "4.8",
      category: "Vegetarian restaurant",
      closesAt: "\u00b7 Closes 12:00 AM",
      image: "/v81-image-assets-inuse/assets/wk-sf-2-int.jpg",
      body: [
        "Sprout Kitchen is the busiest of the three, a Broxton Avenue room that runs late and fills from nine.",
        "It covers both requests at once, fully vegetarian with gluten free dishes marked, and it is the only one still serving at midnight.",
      ],
      bullets: [
        { label: "Menu highlights:", text: "Sharing plates, a mushroom and truffle risotto, and gluten free dishes marked on the menu." },
        { label: "Atmosphere:", text: "A long bar and close tables, loud and late." },
        { label: "Good to know:", text: "No bookings after nine; the walk is fifteen minutes or a short ride." },
      ],
      draftText: "Sprout Kitchen tonight? Vegetarian and gluten free, just up the street",
    },
  ],
  replies: [
    { kind: "incoming", name: "Marco", avatar: "/gemini/friday-night/avatar-marco.png", text: "Sounds perfect. 7:30?" },
    { kind: "incoming", name: "Priya", avatar: "/gemini/friday-night/avatar-priya.png", text: "Let\u2019s do it!" },
  ],
};

/**
 * "Build a study notebook" — the student's NotebookLM-style flow, rebuilt as "Gemini
 * Notebook". It runs in its own three-tab app (Sources / Chat / Studio) rather than in the
 * kiosk's Ask Gemini bar: sources load into the notebook, a prompt in the notebook's own
 * input turns them into a study guide, and Studio holds a flip-card quiz and an audio
 * overview. Rendered by `StudyNotebook.tsx`.
 */
export type NotebookSource = {
  /** e.g. "Class notes · weeks 1–4" */
  title: string;
  /** A photo thumbnail for notes, or the doc glyph for a document. */
  thumb?: string;
};

export type StudyGuideItem = {
  heading: string;
  body: string;
  /** Source numbers (1-based) cited against this point, drawn as the small navy chips. */
  cites: number[];
};

export type QuizCard = { question: string; answer: string };

export type StudyNotebookContent = {
  notebookTitle: string;
  /** Typed into the notebook's input on the empty Sources tab. */
  setupPrompt: string;
  sources: NotebookSource[];
  /** Typed into the input once the sources are in and the notebook moves to Chat. */
  chatPrompt: string;
  guideTitle: string;
  guide: StudyGuideItem[];
  quizTitle: string;
  quiz: QuizCard[];
  audio: { title: string; meta: string; transcript: { speaker: string; line: string }[] };
  disclaimer: string;
};

export const STUDY_NOTEBOOK: StudyNotebookContent = {
  notebookTitle: "Biology 101",
  setupPrompt: "Create a study notebook to help me get organized for class",
  sources: [
    { title: "Class notes \u00b7 weeks 1\u20134", thumb: "/v81-image-assets-inuse/assets/wb-bio2.jpg" },
    { title: "Class notes \u00b7 cells and structures", thumb: "/v81-image-assets-inuse/assets/wb-bio.jpg" },
    { title: "Course syllabus \u00b7 Biology 101" },
    { title: "Lecture slides \u00b7 Plant and animal cells" },
  ],
  chatPrompt:
    "I\u2019m preparing for my first biology exam. Based on my uploaded class notes and syllabus, help me learn the difference between plant and animal cells.",
  guideTitle: "Study guide \u00b7 Plant vs animal cells",
  guide: [
    {
      heading: "Cell wall and chloroplasts",
      body: "Plant cells add a rigid cell wall and chloroplasts for photosynthesis. Animal cells have neither.",
      cites: [3, 4],
    },
    {
      heading: "The central vacuole",
      body: "One large central vacuole in plant cells; animal cells use several small vacuoles instead.",
      cites: [2, 4],
    },
    {
      heading: "Centrioles",
      body: "Appear only in animal cells, organizing the spindle fibres when the cell divides.",
      cites: [4],
    },
    {
      heading: "Mitochondria",
      body: "Both cell types carry them - the classic exam trick question is that they are not plant-only.",
      cites: [3, 4],
    },
  ],
  quizTitle: "Biology 101 Quiz",
  // Q1, A1, Q2 and A6 are the design's copy. Everything marked PLACEHOLDER is stand-in text
  // written from the study guide until the real quiz copy arrives.
  quiz: [
    { question: "Which cells have a cell wall?", answer: "Plant cells. Animal cells only have a membrane." },
    {
      question: "Where does photosynthesis happen?",
      answer: "In the chloroplasts, which only plant cells have.", // PLACEHOLDER answer
    },
    {
      question: "How many vacuoles does a plant cell usually have?", // PLACEHOLDER
      answer: "One large central vacuole. Animal cells have several small ones.", // PLACEHOLDER
    },
    {
      question: "Which cell type has centrioles?", // PLACEHOLDER
      answer: "Animal cells. They organize the spindle fibres when the cell divides.", // PLACEHOLDER
    },
    {
      question: "What is a plant cell wall mostly made of?", // PLACEHOLDER
      answer: "Cellulose, and it sits outside the membrane.", // PLACEHOLDER
    },
    {
      question: "Which cells have mitochondria?", // PLACEHOLDER question
      answer: "Both. Plant and animal cells both make energy there.",
    },
  ],
  audio: {
    title: "Audio Overview",
    meta: "Brief \u00b7 7 min",
    transcript: [
      { speaker: "Host", line: "Okay, plant versus animal cells. The wall is the giveaway?" },
      { speaker: "Co-host", line: "The wall and the chloroplasts. Your notes flag both." },
      { speaker: "Host", line: "And the one big vacuole. That is the exam question." },
    ],
  },
  disclaimer: "Gemini Notebook can be inaccurate; please double check its responses.",
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
      { id: "study-notebook", label: "Build a study notebook", active: true },
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
