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
  /** The glyph before `address`. Defaults to the map pin; the party answer uses the
   * category's own mark instead (a pizzeria, a museum). */
  addressIcon?: string;
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
  /** Prose *above* the heading — a line that introduces the section rather than sitting
   * under it, like the party answer's "a new list has been added to your notes". */
  lead?: string[];
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
  /** Leave off the rate/share/disclaimer row. For an answer that is a step in a task
   * rather than a finished reply — ending one mid-flow on a disclaimer reads as the end. */
  hideFooter?: boolean;
  /** Section headings in regular weight rather than bold — the newer design files draw
   * them that way; the older weekend answer keeps its bold. */
  plainHeadings?: boolean;
  sections: Section[];
  /** Optional wrap-up after the last section. */
  closingLines?: string[];
  /** The loading beat, when it should name the app Gemini is reaching into (with its logo)
   * rather than cycling the generic "Thinking…" captions. */
  loading?: { caption: string; icon: string };
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
    "Help us plan our weekend trip to NYC. Suggest some things to do based on our preferences in the attached Google Sheet. Make a packing list.",
  ],
  // the answer is built from the attached Sheet, so the loading beat names Workspace, marked
  // with the Drive icon
  loading: { caption: "Connecting to Workspace\u2026", icon: "/v81-image-assets-inuse/assets/products/drive.svg" },
  introLines: [
    "Balancing an early-rising deli lover, an indie/vegan explorer, and a night-owl luxury seeker takes thoughtful geographic clustering and flexible morning schedules.",
  ],
  plainHeadings: true,
  sections: [
    {
      id: "activity-strategy",
      heading: "Activity Strategy (Handling the 8:00 AM vs. 11:30 AM Split)",
      bullets: [
        {
          label: "Staggered Mornings:",
          text: "Alex and Maya kick off the day together. Alex grabs early morning bagels (8:00 AM), meeting Maya at 10:00 AM to walk the High Line or Brooklyn Bridge.",
        },
        {
          label: "Midday Regroup (11:30 AM \u2013 4:00 PM):",
          text: "Meet Jordan in Midtown for lunch, and an afternoon visit to a museum or a Saturday Broadway matinee.",
        },
        {
          label: "Neighborhood Clustering to Manage Walking:",
          text: "Keep Jordan\u2019s low walking tolerance happy by grouping activities geographically and taking quick 10-minute yellow cabs/subways between hubs (Midtown to Bushwick/SoHo), letting Alex and Maya rack up their 15,000+ steps exploring within each neighborhood.",
        },
        {
          label: "Bucket-List Compromise:",
          text: "Prioritize a hit Broadway evening show together, spend Sunday morning thrifting around Bushwick/Williamsburg, and catch a daytime Yankees game if travel dates coincide.",
        },
      ],
    },
    {
      id: "packing",
      heading: "Weekend Packing List",
      bullets: [
        {
          label: "Footwear:",
          text: "Broken-in walking sneakers (essential for Alex and Maya\u2019s 15k\u201320k steps) plus one upscale pair of shoes/loafers meeting evening rooftop and Broadway dress codes.",
        },
        {
          label: "Clothing & Layers:",
          text: "Smart-casual daytime outfits, a warm light layer for breezy observation decks and overly air-conditioned theaters, and one elevated dinner/nightlife outfit.",
        },
        {
          label: "Tech & Gear:",
          text: "High-capacity portable phone charger (indispensable for full days navigating transit, digital tickets, and photos), compact travel umbrella, and a crossbody daypack.",
        },
        {
          label: "Group Harmony Essentials:",
          text: "Eye mask and earplugs (crucial when roommates are waking up at 8:00 AM while others sleep until 11:30 AM), and contactless payment set up on phones for seamless subway taps.",
        },
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
  | { kind: "app"; app: "drive" | "calendar" | "gmail" | "docs"; text: string }
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
  /** `instant` posts the message whole instead of typing it out — for one Gemini has
   * already written, where watching it be retyped would undo the point of the flow. */
  | { kind: "outgoing"; text: string; instant?: boolean }
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
/** Who a thread is with — the name and avatars its header shows. */
export type MessagesThread = { name: string; avatars: string[] };

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
  /** Glyph before `category`. Defaults to the vegetarian badge the go out answer uses. */
  categoryIcon?: string;
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

/**
 * "Prep for the big meeting" — the traveler's agentic flow, and the second answer built on
 * the shared reasoning rail. Where the semester plan ends inside Google Calendar, this one
 * ends inside a Google Doc: Gemini reads the past threads, pulls the news, and writes a
 * briefing the visitor then reads. Rendered by `MeetingBriefResponse.tsx`.
 */
export type DocSection = {
  heading: string;
  bullets: string[];
};

export type MeetingBriefContent = {
  promptLines: string[];
  steps: ThinkingStep[];
  /** The chip the rail produces, between the card and the CTA. */
  file: { title: string; app: string; action: string };
  ctaLabel: string;
  doc: {
    title: string;
    /** The grey line under the title — who, when, and how often it refreshes. */
    subtitle: string;
    sections: DocSection[];
  };
};

export const MEETING_BRIEF: MeetingBriefContent = {
  promptLines: [
    "Prepare a briefing doc for my meeting with Syntherva Systems next week. Include past meeting notes, suggested discussion topics, and every day add the latest financial news at 6am.",
  ],
  steps: [
    { kind: "app", app: "gmail", text: "Gmail" },
    { kind: "thought", text: "Reading the notes and email threads from the last two meetings." },
    { kind: "app", app: "drive", text: "Google Drive" },
    { kind: "thought", text: "Pulling the latest financial news and setting the 6:00 AM daily refresh." },
    { kind: "app", app: "calendar", text: "Google Calendar" },
    { kind: "thought", text: "Writing the suggested discussion topics into the doc." },
    { kind: "app", app: "docs", text: "Google Docs" },
    { kind: "thought", text: "Building the briefing doc." },
    { kind: "done", text: "Task complete" },
  ],
  file: { title: "Briefing: Syntherva Systems", app: "Google Docs", action: "Open" },
  ctaLabel: "Review the Google Doc",
  doc: {
    title: "Briefing: Syntherva Systems",
    subtitle: "Syntherva Systems \u00b7 Meeting next week \u00b7 refreshed daily at 6:00 AM",
    sections: [
      {
        heading: "Past meeting notes",
        bullets: [
          "12 August: Syntherva asked for a pilot scoped to two of their plants; the open question was data residency.",
          "3 September: their operations lead confirmed the pilot budget and wants a decision before the quarter closes.",
          "Carried over: the integration timeline they asked for has not been sent.",
        ],
      },
      {
        heading: "Suggested discussion topics",
        bullets: [
          "Pilot scope: two plants first, or all four at once.",
          "Data residency: where their plant data is stored and who holds the keys.",
          "Commercials: the per-plant licence against a company-wide rate.",
          "Timeline: what a decision this month would let them ship by year end.",
        ],
      },
      {
        heading: "Financial news, 6:00 AM today",
        bullets: [
          "Syntherva reported second-quarter revenue up 14 percent on the year, led by the automation unit.",
          "This morning Syntherva confirmed a third plant, extending its Midwest footprint.",
          "Analysts named rising component costs as the main pressure on margins.",
        ],
      },
      {
        heading: "Kept fresh",
        bullets: ["Gemini adds the latest financial news to this doc every day at 6:00 AM until the meeting."],
      },
    ],
  },
};

/**
 * "Make a dinner reservation" — the traveler's booking flow, and the one answer in the demo
 * that transacts: a grounded search answer whose time slots are live, an in-app booking
 * sheet from whichever provider holds that restaurant, and a confirmation that hands off to
 * the Google widget setup screen. Rendered by `DinnerReservation.tsx`.
 */
export type BookingProvider = "resy" | "tock" | "opentable";

export type DinnerPlace = {
  id: string;
  name: string;
  rating: string;
  /** Review count as drawn, e.g. "(18K)". */
  reviews: string;
  /** Price band and cuisine, e.g. "$$ · Cuban". */
  meta: string;
  address: string;
  image: string;
  /** The paragraph under the card. */
  body: string;
  /** Whose slots these are — the coin on every time button, and the sheet it opens. */
  provider: BookingProvider;
  /** Bookable times, in the order the design lists them. */
  times: string[];
};

export type DinnerContent = {
  promptLines: string[];
  /** The grounded-search header above the answer: how many sites it read. */
  sourceCount: string;
  introText: string;
  /** Grey line above each restaurant's time grid. */
  availableLabel: string;
  places: DinnerPlace[];
  /** The rows of the booking sheet that are the same whichever slot is tapped. */
  booking: {
    dateLabel: string;
    partySize: string;
    guestInfo: string;
    seating: string;
    confirmLabel: string;
    confirmedLabel: string;
  };
  /** The take-it-with-you screen the flow ends on, once a booking is confirmed. */
  widget: {
    title: string;
    subtitle: string;
    steps: { label: string; title: string }[];
    /** The four cards inside step one. */
    setup: { image: string; title: string; body: string }[];
    search: { image: string; caption: string };
    scan: { caption: string };
  };
};

export const PROVIDER_LABEL: Record<BookingProvider, string> = {
  resy: "Resy",
  tock: "Tock",
  opentable: "OpenTable",
};

export const PROVIDER_COIN: Record<BookingProvider, string> = {
  resy: "/v81-image-assets-inuse/assets/aim/coin-resy.png",
  tock: "/v81-image-assets-inuse/assets/aim/coin-tock.png",
  opentable: "/v81-image-assets-inuse/assets/aim/coin-ot.png",
};

export const DINNER_RESERVATION: DinnerContent = {
  promptLines: [
    "I\u2019m looking for a reservation in Little Havana next Saturday night for 5 people. Somewhere fun with local Cuban food and live music.",
  ],
  sourceCount: "25 sites",
  introText:
    "Here are several options for a dinner reservation for 5 people in Little Havana on Saturday, May 23, 2026, with local Cuban food and live music.",
  availableLabel: "Available on Saturday, May 23",
  places: [
    {
      id: "sazon",
      name: "Saz\u00f3n Cubano 305",
      rating: "4.8",
      reviews: "(18K)",
      meta: "$$ \u00b7 Cuban",
      address: "1499 SW 7th Ct",
      image: "/v81-image-assets-inuse/assets/aim/sazon.jpg",
      body: "This vibrant Cuban eatery specializes in traditional dishes and signature rum drinks. It is a popular spot with live Cuban music, especially on weekends.",
      provider: "resy",
      times: ["6:00 PM", "6:30 PM", "7:00 PM", "7:15 PM", "7:30 PM", "8:00 PM"],
    },
    {
      id: "ocho",
      name: "Ocho Siete Bistro",
      rating: "4.7",
      reviews: "(650)",
      meta: "$$ \u00b7 Cuban",
      address: "2205 SW 9th Terrace",
      image: "/v81-image-assets-inuse/assets/aim/ocho.jpg",
      body: "An elevated dining experience blending Cuban-Caribbean flavors with a modern aesthetic. It features professional live latin jazz music in a stylish environment.",
      provider: "tock",
      times: ["5:00 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM"],
    },
    {
      id: "coco",
      name: "Coco Sabroso",
      rating: "4.9",
      reviews: "(3.8K)",
      meta: "$$ \u00b7 Cuban",
      address: "330 SW 10th Way",
      image: "/v81-image-assets-inuse/assets/aim/coco.jpg",
      body: "This casual spot serves Cuban comfort food, including tapas. The environment is meant to make you feel like you are in Havana, featuring live music on the weekends.",
      provider: "opentable",
      times: ["6:00 PM", "6:15 PM", "6:30 PM", "7:00 PM", "7:45 PM", "8:30 PM"],
    },
    {
      id: "rumba",
      name: "Rumba Tarde",
      rating: "4.8",
      reviews: "(7.5K)",
      meta: "$$ \u00b7 Cuban",
      address: "1830 SW 11th Ave",
      image: "/v81-image-assets-inuse/assets/aim/rumba.jpg",
      body: "This popular spot is known for its world-class cocktails and nightly live music, fusing authentic Cuban charm with a fun atmosphere.",
      provider: "opentable",
      times: ["5:00 PM", "5:15 PM", "6:30 PM", "7:00 PM", "8:00 PM", "9:00 PM"],
    },
  ],
  booking: {
    dateLabel: "Saturday, May 23",
    partySize: "5 Guests",
    guestInfo: "Name, email and phone on file",
    seating: "Main dining room",
    confirmLabel: "Confirm reservation",
    confirmedLabel: "Reservation confirmed",
  },
  widget: {
    title: "Get the best of Google on your homescreen",
    subtitle: "Set it up in just a few simple steps:",
    steps: [
      { label: "Step 1", title: "Add the widget to your home screen" },
      { label: "Step 2", title: "Get it working" },
      { label: "Step 3", title: "Scan to validate" },
    ],
    setup: [
      {
        image: "/v81-image-assets-inuse/assets/gwidget/step1.png",
        title: "Sign in to Google:",
        body: "Open the app and tap your account",
      },
      {
        image: "/v81-image-assets-inuse/assets/gwidget/step2.png",
        title: "Long press your home screen:",
        body: "Hold until the icons jiggle",
      },
      {
        image: "/v81-image-assets-inuse/assets/gwidget/step3.png",
        title: "Tap \u201cEdit\u201d in top left corner:",
        body: "Select \u201cAdd Widget\u201d",
      },
      {
        image: "/v81-image-assets-inuse/assets/gwidget/step4.png",
        title: "Choose Google and tap \u201cAdd\u201d:",
        body: "Pick the Google app widget",
      },
    ],
    search: { image: "/v81-image-assets-inuse/assets/gwidget/search.png", caption: "Search \u201cchocolate\u201d" },
    scan: { caption: "Scan the QR code to validate" },
  },
};

/**
 * One option on a rotating choice screen (`RotatingChoiceScreen`): its label, and the photo
 * the backdrop shows while it is up. The screen rotates through them, so it shows what it is
 * asking about rather than picking one option's photo to stand for all of them.
 */
export type RotatingChoice = { id: string; label: string; image: string };

/** "Explore a new city" — between the traveler's pill and a city's own day plan. */
export const CITY_CHOICES: RotatingChoice[] = [
  { id: "austin", label: "Austin", image: "/v81-image-assets-inuse/assets/pick/city-aus.jpg" },
  { id: "chicago", label: "Chicago", image: "/v81-image-assets-inuse/assets/pick/city-chi.jpg" },
  { id: "los-angeles", label: "Los Angeles", image: "/v81-image-assets-inuse/assets/pick/city-la.jpg" },
  { id: "new-york", label: "New York", image: "/v81-image-assets-inuse/assets/pick/city-ny.jpg" },
  { id: "seattle", label: "Seattle", image: "/v81-image-assets-inuse/assets/pick/city-sea.jpg" },
];

/**
 * "Explore a new city" — one day-plan per city, reached through `CityChoiceScreen`. Each is
 * an ordinary text answer (`ResponseContent`, rendered by ScrollPattern like the band tour):
 * a Maps still pinning the four venues, the intro, then five stops, each a heading, a place
 * card and a line about it. Only the copy, the map and the photos differ per city, so they
 * share one shape rather than one component each.
 *
 * The stop photography is stand-in, like the rest of the demo's: the asset set has rooms and
 * skylines, not these particular shops, so each stop takes the closest one and the FPO chip
 * says so.
 */
export const CITY_GUIDES: Record<string, ResponseContent> = {
  "austin": {
    promptLines: ["I\u2019ve got a full day to explore Austin. Knowing my interests, what should I check out?"],
    map: {
      image: "/v81-image-assets-inuse/assets/map-city-austin.jpg",
      aspectRatio: 2.2222,
      pinColor: "#F1BF42",
      pins: [
        { label: "East Side Books", x: 0.698, y: 0.13, side: "left" },
        { label: "Rainey Street Table", x: 0.555, y: 0.34, side: "right" },
        { label: "Lamar Records", x: 0.279, y: 0.55, side: "right" },
        { label: "Congress Coffee Co", x: 0.475, y: 0.76, side: "right" },
      ],
    },
    introLines: [
      "Here is a Saturday in Austin built from your saved interests: coffee, record shops and a good bookshop, with somewhere for a late lunch. Every stop is a short ride or walk from the last.",
    ],
    plainHeadings: true,
    sections: [
      {
        id: "stop-1",
        heading: "Stop 1 \u00b7 Congress Coffee Co",
        place: {
          name: "Congress Coffee Co",
          rating: "4.7",
          status: "Open",
          statusTail: "\u00b7 open until 6:00 PM",
          image: "/v81-image-assets-inuse/assets/wk-nashville-2-int.jpg",
        },
        body: ["Flat white to start. A porch out front and breakfast tacos from the trailer next door."],
      },
      {
        id: "stop-2",
        heading: "Stop 2 \u00b7 Lamar Records",
        place: {
          name: "Lamar Records",
          rating: "4.8",
          status: "Open",
          statusTail: "\u00b7 open until 8:00 PM",
          image: "/v81-image-assets-inuse/assets/wk-nashville-3-int.jpg",
        },
        body: ["Crate digging: country, soul and local pressings, with a listening booth at the back."],
      },
      {
        id: "stop-3",
        heading: "Stop 3 \u00b7 East Side Books",
        place: {
          name: "East Side Books",
          rating: "4.6",
          status: "Open",
          statusTail: "\u00b7 open until 7:00 PM",
          image: "/v81-image-assets-inuse/assets/wk-sf-3-int.jpg",
        },
        body: ["Independent bookshop with a shaded yard next door for reading out of the heat."],
      },
      {
        id: "stop-4",
        heading: "Stop 4 \u00b7 Rainey Street Table",
        place: {
          name: "Rainey Street Table",
          rating: "4.5",
          status: "Open",
          statusTail: "\u00b7 Lunch until 3:30 PM",
          image: "/v81-image-assets-inuse/assets/wk-nashville-1-ext.jpg",
        },
        body: ["Late lunch: smoked plates and a shaded patio a short walk from the bookshop."],
      },
      {
        id: "stop-5",
        heading: "Stop 5 \u00b7 Lady Bird Lake",
        place: {
          name: "Lady Bird Lake trail",
          rating: "4.9",
          status: "Open",
          statusTail: "\u00b7 open until sunset",
          image: "/v81-image-assets-inuse/assets/tour-austin.jpg",
        },
        body: ["The boardwalk loop by the water, back before the light goes."],
      },
    ],
  },
  "chicago": {
    promptLines: ["I\u2019ve got a full day to explore Chicago. Knowing my interests, what should I check out?"],
    map: {
      image: "/v81-image-assets-inuse/assets/map-city-chicago.jpg",
      aspectRatio: 2.2222,
      pinColor: "#F1BF42",
      pins: [
        { label: "Logan Vinyl", x: 0.372, y: 0.13, side: "right" },
        { label: "Armitage Books", x: 0.632, y: 0.34, side: "left" },
        { label: "Damen Roasters", x: 0.505, y: 0.55, side: "right" },
        { label: "Randolph Kitchen", x: 0.591, y: 0.76, side: "right" },
      ],
    },
    introLines: [
      "Here is a Saturday in Chicago built from your saved interests: coffee, record shops and a good bookshop, with somewhere for a late lunch. Every stop is a short ride or walk from the last.",
    ],
    plainHeadings: true,
    sections: [
      {
        id: "stop-1",
        heading: "Stop 1 \u00b7 Damen Roasters",
        place: {
          name: "Damen Roasters",
          rating: "4.7",
          status: "Open",
          statusTail: "\u00b7 open until 6:00 PM",
          image: "/v81-image-assets-inuse/assets/wk-chicago-1-int.jpg",
        },
        body: ["Flat white to start. Roasted on site, a long bench by the window."],
      },
      {
        id: "stop-2",
        heading: "Stop 2 \u00b7 Logan Vinyl",
        place: {
          name: "Logan Vinyl",
          rating: "4.8",
          status: "Open",
          statusTail: "\u00b7 open until 8:00 PM",
          image: "/v81-image-assets-inuse/assets/wk-chicago-2-int.jpg",
        },
        body: ["Crate digging: house and soul reissues, with a listening booth at the back."],
      },
      {
        id: "stop-3",
        heading: "Stop 3 \u00b7 Armitage Books",
        place: {
          name: "Armitage Books",
          rating: "4.6",
          status: "Open",
          statusTail: "\u00b7 open until 7:00 PM",
          image: "/v81-image-assets-inuse/assets/wk-chicago-3-int.jpg",
        },
        body: ["Independent bookshop with a reading room upstairs and a cat asleep on the counter."],
      },
      {
        id: "stop-4",
        heading: "Stop 4 \u00b7 Randolph Kitchen",
        place: {
          name: "Randolph Kitchen",
          rating: "4.5",
          status: "Open",
          statusTail: "\u00b7 Lunch until 3:30 PM",
          image: "/v81-image-assets-inuse/assets/wk-chicago-1-ext.jpg",
        },
        body: ["Late lunch: wood-fired plates on Restaurant Row, a short ride from the bookshop."],
      },
      {
        id: "stop-5",
        heading: "Stop 5 \u00b7 Lakefront Trail",
        place: {
          name: "Lakefront Trail walk",
          rating: "4.9",
          status: "Open",
          statusTail: "\u00b7 open until sunset",
          image: "/v81-image-assets-inuse/assets/wk-city-chicago.jpg",
        },
        body: ["The easy stretch south along the water with the skyline ahead, back before the light goes."],
      },
    ],
  },
  "los-angeles": {
    promptLines: ["I\u2019ve got a full day to explore Los Angeles. Knowing my interests, what should I check out?"],
    map: {
      image: "/v81-image-assets-inuse/assets/map-venue-la.jpg",
      aspectRatio: 1.5652,
      pinColor: "#F1BF42",
      pins: [
        { label: "Sideline Records", x: 0.491, y: 0.13, side: "right" },
        { label: "Casa Lumen", x: 0.893, y: 0.34, side: "left" },
        { label: "Halftone Coffee", x: 0.208, y: 0.55, side: "right" },
        { label: "Vellum Books", x: 0.656, y: 0.76, side: "left" },
      ],
    },
    introLines: [
      "Here is a Saturday in Los Angeles built from your saved interests: coffee, record shops and a good bookshop, with somewhere for a late lunch. Every stop is a short walk from the last.",
    ],
    plainHeadings: true,
    sections: [
      {
        id: "stop-1",
        heading: "Stop 1 \u00b7 Halftone Coffee",
        place: {
          name: "Halftone Coffee",
          rating: "4.7",
          status: "Open",
          statusTail: "\u00b7 open until 6:00 PM",
          image: "/v81-image-assets-inuse/assets/wk-nyc-1-int.jpg",
        },
        body: ["Flat white to start. A small counter, pastries from the bakery next door."],
      },
      {
        id: "stop-2",
        heading: "Stop 2 \u00b7 Sideline Records",
        place: {
          name: "Sideline Records",
          rating: "4.8",
          status: "Open",
          statusTail: "\u00b7 open until 8:00 PM",
          image: "/v81-image-assets-inuse/assets/wk-sf-2-int.jpg",
        },
        body: ["Crate digging: soul and jazz reissues, with a listening booth at the back."],
      },
      {
        id: "stop-3",
        heading: "Stop 3 \u00b7 Vellum Books",
        place: {
          name: "Vellum Books",
          rating: "4.6",
          status: "Open",
          statusTail: "\u00b7 open until 7:00 PM",
          image: "/v81-image-assets-inuse/assets/wk-nola-2-int.jpg",
        },
        body: ["Independent bookshop with a courtyard next door for reading in the sun."],
      },
      {
        id: "stop-4",
        heading: "Stop 4 \u00b7 Casa Lumen",
        place: {
          name: "Casa Lumen",
          rating: "4.5",
          status: "Open",
          statusTail: "\u00b7 Lunch until 3:30 PM",
          image: "/v81-image-assets-inuse/assets/wk-miami-2-int.jpg",
        },
        body: ["Late lunch: wood-fired plates and a shaded patio a short walk from the bookshop."],
      },
      {
        id: "stop-5",
        heading: "Stop 5 \u00b7 Griffith Park",
        place: {
          name: "Griffith Park walk",
          rating: "4.9",
          status: "Open",
          statusTail: "\u00b7 open until sunset",
          image: "/v81-image-assets-inuse/assets/pick/city-la.jpg",
        },
        body: ["The easy loop from the observatory, back before the light goes."],
      },
    ],
  },
  "new-york": {
    promptLines: ["I\u2019ve got a full day to explore New York. Knowing my interests, what should I check out?"],
    map: {
      image: "/v81-image-assets-inuse/assets/map-city-nyc.jpg",
      aspectRatio: 2.2222,
      pinColor: "#F1BF42",
      pins: [
        { label: "Tin Cup Coffee", x: 0.384, y: 0.13, side: "right" },
        { label: "Mercer Street Books", x: 0.307, y: 0.34, side: "right" },
        { label: "Bleecker Vinyl", x: 0.697, y: 0.55, side: "left" },
        { label: "Osteria Nolita", x: 0.542, y: 0.76, side: "right" },
      ],
    },
    introLines: [
      "Here is a Saturday in New York built from your saved interests: coffee, record shops and a good bookshop, with somewhere for a late lunch. Every stop is a short walk from the last.",
    ],
    plainHeadings: true,
    sections: [
      {
        id: "stop-1",
        heading: "Stop 1 \u00b7 Tin Cup Coffee",
        place: {
          name: "Tin Cup Coffee",
          rating: "4.7",
          status: "Open",
          statusTail: "\u00b7 open until 6:00 PM",
          image: "/v81-image-assets-inuse/assets/wk-nyc-2-int.jpg",
        },
        body: ["Flat white to start. A narrow counter, pastries from the bakery two doors down."],
      },
      {
        id: "stop-2",
        heading: "Stop 2 \u00b7 Bleecker Vinyl",
        place: {
          name: "Bleecker Vinyl",
          rating: "4.8",
          status: "Open",
          statusTail: "\u00b7 open until 8:00 PM",
          image: "/v81-image-assets-inuse/assets/wk-nashville-3-int.jpg",
        },
        body: ["Crate digging: soul and jazz reissues, with a listening booth at the back."],
      },
      {
        id: "stop-3",
        heading: "Stop 3 \u00b7 Mercer Street Books",
        place: {
          name: "Mercer Street Books",
          rating: "4.6",
          status: "Open",
          statusTail: "\u00b7 open until 7:00 PM",
          image: "/v81-image-assets-inuse/assets/wk-nyc-3-int.jpg",
        },
        body: ["Independent bookshop, new and used, with a reading bench by the window."],
      },
      {
        id: "stop-4",
        heading: "Stop 4 \u00b7 Osteria Nolita",
        place: {
          name: "Osteria Nolita",
          rating: "4.5",
          status: "Open",
          statusTail: "\u00b7 Lunch until 3:30 PM",
          image: "/v81-image-assets-inuse/assets/wk-nyc-1-ext.jpg",
        },
        body: ["Late lunch: handmade pasta and a few pavement tables a short walk from the bookshop."],
      },
      {
        id: "stop-5",
        heading: "Stop 5 \u00b7 The High Line",
        place: {
          name: "The High Line walk",
          rating: "4.8",
          status: "Open",
          statusTail: "\u00b7 open until sunset",
          image: "/v81-image-assets-inuse/assets/wk-city-nyc.jpg",
        },
        body: ["The elevated park end to end, back down at Hudson Yards before the light goes."],
      },
    ],
  },
  "seattle": {
    promptLines: ["I\u2019ve got a full day to explore Seattle. Knowing my interests, what should I check out?"],
    map: {
      image: "/v81-image-assets-inuse/assets/map-city-seattle.jpg",
      aspectRatio: 2.2222,
      pinColor: "#F1BF42",
      pins: [
        { label: "Pine Street Coffee", x: 0.582, y: 0.13, side: "right" },
        { label: "Pike Vinyl", x: 0.598, y: 0.34, side: "right" },
        { label: "Market Kitchen", x: 0.39, y: 0.55, side: "right" },
        { label: "Pioneer Books", x: 0.476, y: 0.76, side: "right" },
      ],
    },
    introLines: [
      "Here is a Saturday in Seattle built from your saved interests: coffee, record shops and a good bookshop, with somewhere for a late lunch. Every stop is a short walk from the last.",
    ],
    plainHeadings: true,
    sections: [
      {
        id: "stop-1",
        heading: "Stop 1 \u00b7 Pine Street Coffee",
        place: {
          name: "Pine Street Coffee",
          rating: "4.7",
          status: "Open",
          statusTail: "\u00b7 open until 6:00 PM",
          image: "/v81-image-assets-inuse/assets/wk-sf-1-int.jpg",
        },
        body: ["Flat white to start. A small counter, pastries from the bakery next door."],
      },
      {
        id: "stop-2",
        heading: "Stop 2 \u00b7 Pike Vinyl",
        place: {
          name: "Pike Vinyl",
          rating: "4.8",
          status: "Open",
          statusTail: "\u00b7 open until 8:00 PM",
          image: "/v81-image-assets-inuse/assets/wk-sf-2-int.jpg",
        },
        body: ["Crate digging: grunge-era pressings and jazz reissues, with a listening booth at the back."],
      },
      {
        id: "stop-3",
        heading: "Stop 3 \u00b7 Pioneer Books",
        place: {
          name: "Pioneer Books",
          rating: "4.6",
          status: "Open",
          statusTail: "\u00b7 open until 7:00 PM",
          image: "/v81-image-assets-inuse/assets/wk-sf-3-int.jpg",
        },
        body: ["Independent bookshop in a brick storefront with a reading nook at the back."],
      },
      {
        id: "stop-4",
        heading: "Stop 4 \u00b7 Market Kitchen",
        place: {
          name: "Market Kitchen",
          rating: "4.5",
          status: "Open",
          statusTail: "\u00b7 Lunch until 3:30 PM",
          image: "/v81-image-assets-inuse/assets/wk-sf-1-ext.jpg",
        },
        body: ["Late lunch: chowder and the day\u2019s catch, a short walk from the bookshop."],
      },
      {
        id: "stop-5",
        heading: "Stop 5 \u00b7 Olympic Sculpture Park",
        place: {
          name: "Olympic Sculpture Park walk",
          rating: "4.8",
          status: "Open",
          statusTail: "\u00b7 open until sunset",
          image: "/v81-image-assets-inuse/assets/wk-city-sf.jpg",
        },
        body: ["Down to the water along the sculptures, back before the light goes."],
      },
    ],
  },
};

/**
 * "Plan a kid's birthday party" — the parent's answer, reached through the theme menu. The
 * theme picks the menu's backdrop, not the answer: all three play this one plan, which is
 * how the design has it. Two halves in one scroll — three venues, then the shopping list
 * Gemini says it has written to the parent's notes, ending on a numbered checklist.
 */
export const PARTY_PLAN: ResponseContent = {
  promptLines: [
    "Help me plan my 7-year-old\u2019s birthday party. Recommend fun venues with good food for 15 people, then create a shopping list for decorations and party supplies.",
  ],
  introLines: [
    "Here are three fun venues with good food for a party of 15, then the shopping list for decorations and party supplies:",
  ],
  plainHeadings: true,
  sections: [
    {
      id: "bounce",
      heading: "Bounce Republic \u00b7 party rooms \u00b7 8 min",
      place: {
        name: "Bounce Republic",
        rating: "4.7",
        address: "Trampoline park",
        status: "Open",
        statusTail: "\u00b7 Closes 8:00 PM",
        image: "/v81-image-assets-inuse/assets/wk-sf-2-int.jpg",
      },
      body: [
        "Bounce Republic is a trampoline park on Mill Road with private party rooms for up to 20 and a parents\u2019 coffee bar upstairs.",
        "The 15-guest package covers the jump session, the room and the food, so one booking does the whole afternoon.",
      ],
      bullets: [
        { label: "Food:", text: "Pizza, fruit platters and juice boxes for the party; the coffee bar upstairs for the parents." },
        { label: "Party package:", text: "Ninety minutes of jump time, then a private room for an hour; socks and wristbands included." },
        { label: "Good to know:", text: "Weekend slots book out three to four weeks ahead." },
      ],
    },
    {
      id: "brick-basil",
      heading: "Brick & Basil Pizza Kitchen \u00b7 make your own \u00b7 6 min",
      place: {
        name: "Brick & Basil Pizza Kitchen",
        rating: "4.6",
        address: "Pizzeria",
        addressIcon: "\ud83c\udf7d\ufe0f",
        status: "Open",
        statusTail: "\u00b7 Closes 9:00 PM",
        image: "/v81-image-assets-inuse/assets/wk-nola-2-int.jpg",
      },
      body: [
        "Brick & Basil Pizza Kitchen is a family pizzeria on Orchard Road where the kids top their own pizzas at the counter; the back room seats 20.",
        "Making the pizzas is the activity, so the food and the entertainment are the same booking.",
      ],
      bullets: [
        { label: "Food:", text: "Make-your-own pizzas, garlic bread and gelato; a nut free kitchen." },
        { label: "Party package:", text: "The back room for two hours, with aprons and chef hats for every child." },
        { label: "Good to know:", text: "A cake from outside is welcome, no fee." },
      ],
    },
    {
      id: "little-explorers",
      heading: "Little Explorers Discovery Hall \u00b7 museum party \u00b7 12 min",
      place: {
        name: "Little Explorers Discovery Hall",
        rating: "4.8",
        address: "Children\u2019s museum",
        addressIcon: "\ud83c\udfdb\ufe0f",
        status: "Open",
        statusTail: "\u00b7 Closes 5:00 PM",
        image: "/v81-image-assets-inuse/assets/wk-nashville-2-int.jpg",
      },
      body: [
        "Little Explorers Discovery Hall is a hands-on children\u2019s museum on Riverside Avenue with a party cafe and a room for cake.",
        "The exhibits keep fifteen seven-year-olds busy for the whole afternoon, and the cafe does the lunch.",
      ],
      bullets: [
        { label: "Food:", text: "A party lunch in the cafe: sandwiches, fruit and a cupcake tower; allergy menus on request." },
        { label: "Party package:", text: "A guided exhibit hour, then the party room for lunch and cake." },
        { label: "Good to know:", text: "Admission for four adults is included." },
      ],
    },
    {
      id: "decorations",
      lead: [
        "A new list titled \u201c7th Birthday Party Supplies & Decorations\u201d has been added to your notes:",
      ],
      heading: "Decorations & Setup",
      bullets: [
        { text: "1 \u00d7 Giant Number \u201c7\u201d foil balloon" },
        { text: "1 \u00d7 Themed balloon garland/arch kit (with handheld pump)" },
        { text: "1 \u00d7 \u201cHappy Birthday\u201d banner / photo backdrop" },
        { text: "2\u20133 \u00d7 Heavy-duty disposable tablecloths" },
      ],
    },
    {
      id: "tableware",
      heading: "Tableware (for 15+ Guests)",
      bullets: [
        { text: "15\u201320 \u00d7 9-inch lunch/dinner plates" },
        { text: "15\u201320 \u00d7 7-inch dessert/cake plates" },
        { text: "50 \u00d7 Beverage napkins & matching cups" },
        { text: "1 \u00d7 Compostable cutlery pack (forks & spoons)" },
      ],
    },
    {
      id: "cake",
      heading: "Cake & Dessert Service",
      bullets: [
        { text: "Birthday candles & matches/lighter" },
        { text: "Cake stand & cake serving knife/spatula" },
        { text: "Cake/cupcake order (15\u201320 servings)" },
      ],
    },
    {
      id: "favors",
      heading: "Party Favors & Utilities",
      bullets: [
        { text: "15 \u00d7 Party favor bags (filled with age-appropriate stickers, mini puzzles, or treats)" },
        { text: "1 \u00d7 Permanent marker / Sharpie (to label drink cups)" },
        { text: "1 \u00d7 Roll of heavy-duty cleanup trash bags" },
      ],
    },
    {
      id: "checklist",
      heading: "Action Checklist",
      numbered: true,
      bullets: [
        {
          label: "Confirm Venue Headcount:",
          text: "Select and lock in the 15-guest package with your chosen venue 3\u20134 weeks in advance to secure preferred weekend time slots.",
        },
        {
          label: "Order Cake & Supplies:",
          text: "Place bakery orders 2 weeks prior and verify dietary restrictions for all 15 attending children.",
        },
        {
          label: "Pre-pack Favor Bags:",
          text: "Assemble favor bags and test the balloon pump 48 hours before the event.",
        },
      ],
    },
  ],
};

/** "Plan the party end to end" — between the parent's pill and a theme's own flow. */
export const PARTY_THEMES: RotatingChoice[] = [
  { id: "dinosaurs", label: "Dinosaurs", image: "/v81-image-assets-inuse/assets/pick/party-dino.jpg" },
  { id: "space", label: "Space", image: "/v81-image-assets-inuse/assets/pick/party-space.jpg" },
  { id: "ocean", label: "Ocean", image: "/v81-image-assets-inuse/assets/pick/party-ocean.jpg" },
];

/**
 * "Schedule a play date" — the parent's RCS flow, and the longest conversation in the demo:
 * Gemini reads the thread, checks the calendar, finds lunch and writes the event back, with
 * the parent only ever tapping what Gemini offers.
 *
 * The thread grows a beat at a time (`PLAY_DATE_THREAD_*`), and each beat ends with its own
 * Gemini Intelligence chip. `PlayDateOverlay` draws the two calendar cards.
 */
export const PLAY_DATE_CONTACT: MessagesThread = {
  name: "Camille Walsh",
  avatars: ["/v81-image-assets-inuse/assets/msg/av-camille.png"],
};

const CAMILLE = { kind: "incoming" as const, name: "Camille Walsh", avatar: "/v81-image-assets-inuse/assets/msg/av-camille.png" };

/** Opening: Camille asks, and the chip offers to check the calendar. */
export const PLAY_DATE_THREAD_ASK: ChatBubble[] = [
  { ...CAMILLE, text: "Are you free Saturday morning at 10am for a playdate?" },
];

/** After "Yes, I'm free" is sent: Camille asks about lunch. */
export const PLAY_DATE_THREAD_FREE: ChatBubble[] = [
  ...PLAY_DATE_THREAD_ASK,
  { kind: "outgoing", text: "Yes, I\u2019m free" },
  { ...CAMILLE, text: "Maybe afterwards we can grab lunch at a kid friendly restaurant nearby. Any suggestions?" },
];

/** Camille's answer once a restaurant has been picked; the pick's own draft goes between. */
export const PLAY_DATE_CONFIRM: ChatBubble[] = [{ ...CAMILLE, text: "Perfect! See you Saturday at 10am" }];

export const PLAY_DATE_SUGGESTIONS = {
  ask: "Check Schedule",
  free: "Find restaurants",
  picked: "Add Playdate to calendar",
};

/** The card Gemini opens over the thread. `actions` is empty on the closing one — by then
 * there is nothing left to answer. */
export type PlayDateCard = {
  title: string;
  weekday: string;
  month: string;
  day: string;
  lines: string[];
  action?: string;
};

export const PLAY_DATE_SCHEDULE_CARD: PlayDateCard = {
  title: "You don\u2019t have anything scheduled on Saturday",
  weekday: "Sat",
  month: "Sep",
  day: "12",
  lines: ["No events scheduled"],
  action: "Yes, I\u2019m free",
};

export const PLAY_DATE_CALENDAR_CARD: PlayDateCard = {
  title: "Playdate added to your calendar",
  weekday: "Sat",
  month: "Sep",
  day: "12",
  lines: ["Playdate \u00b7 10:00 AM", "Lunch after at PLACE"],
};

/** The answer behind "Find restaurants" — the same shape the go out search uses, so it
 * plays through `GoOutResponse`: a map, an intro, then three tappable results. */
export const KID_RESTAURANTS: RestaurantSearchContent = {
  promptLines: ["Find me kid friendly restaurants nearby for lunch"],
  loadingCaption: "Connecting to Google Maps\u2026",
  map: {
    image: "/v81-image-assets-inuse/assets/map-venue-la.jpg",
    aspectRatio: 2,
    pinColor: "#F1BF42",
    pins: [
      { label: "Sunny Bowl", x: 0.52, y: 0.2, side: "right" },
      { label: "The Grove Cafe", x: 0.245, y: 0.45, side: "right" },
      { label: "Petit Marche", x: 0.66, y: 0.7, side: "right" },
    ],
  },
  introText: "Here are several kid-friendly restaurants located nearby for lunch:",
  results: [
    {
      id: "grove",
      heading: "The Grove Cafe \u00b7 nut free kitchen \u00b7 2 min",
      name: "The Grove Cafe",
      rating: "4.6",
      category: "Cafe",
      categoryIcon: "\u2615",
      closesAt: "\u00b7 Closes 4:00 PM",
      image: "/v81-image-assets-inuse/assets/wk-nola-2-int.jpg",
      body: [
        "The Grove Cafe is a bright neighbourhood cafe on Park Lane with a nut free kitchen and a small play corner by the window.",
        "It is the closest of the three, and the kitchen is fully nut free rather than nut aware, which is what the thread asked for.",
      ],
      bullets: [
        { label: "Kids\u2019 menu:", text: "Mini pancakes, grilled cheese and fruit cups; high chairs and crayons at every table." },
        { label: "Atmosphere:", text: "Family tables and a play corner with books and blocks, busiest from noon." },
        { label: "Good to know:", text: "No booking for lunch; two minutes on foot from the park, stroller parking inside the door." },
      ],
      draftText: "Lunch at The Grove Cafe? Fully nut free kitchen, two minutes from the park.",
    },
    {
      id: "sunny",
      heading: "Sunny Bowl \u00b7 nut free options \u00b7 5 min",
      name: "Sunny Bowl",
      rating: "4.5",
      category: "Bowls",
      categoryIcon: "\ud83e\udd57",
      closesAt: "\u00b7 Closes 5:00 PM",
      image: "/v81-image-assets-inuse/assets/wk-miami-2-int.jpg",
      body: [
        "Sunny Bowl is a build-your-own bowl spot on Grove Street with allergens labelled on every bowl and a covered patio.",
        "The nut free options are marked on the board rather than asked for, and the patio has room for two families.",
      ],
      bullets: [
        { label: "Kids\u2019 menu:", text: "Half-size bowls with rice, chicken or tofu and a fruit side; the nut free dressings are marked." },
        { label: "Atmosphere:", text: "Casual counter service, a covered patio with picnic tables, lively at lunch." },
        { label: "Good to know:", text: "Order at the counter and pay by phone; a changing table in the family restroom." },
      ],
      draftText: "Lunch at Sunny Bowl? Allergens marked on every bowl, and a patio for the kids.",
    },
    {
      id: "petit",
      heading: "Petit Marche \u00b7 kids menu \u00b7 6 min",
      name: "Petit Marche",
      rating: "4.7",
      category: "Bakery cafe",
      categoryIcon: "\u2615",
      closesAt: "\u00b7 Closes 3:00 PM",
      image: "/v81-image-assets-inuse/assets/wk-sf-2-int.jpg",
      body: [
        "Petit Marche is a small bakery cafe on Orchard Road with a proper kids\u2019 menu and a garden at the back.",
        "The garden gives the kids room to run after the play date, and the lunch kitchen is nut free; only the pastry counter is not.",
      ],
      bullets: [
        { label: "Kids\u2019 menu:", text: "Ham and cheese croissants, mini quiches and a pasta of the day; babycinos on request." },
        { label: "Atmosphere:", text: "Quiet indoors, a small garden with a sandpit out the back." },
        { label: "Good to know:", text: "Closes at 3:00 PM on Saturdays, so lunch before one; the pastry counter shares a kitchen with nuts, the lunch menu does not." },
      ],
      draftText: "Lunch at Petit Marche? Kids menu, nut aware.",
    },
  ],
  replies: PLAY_DATE_CONFIRM,
};

/**
 * "Plan dinner for the week" — the parent's second task flow. It opens like an answer
 * (three dinners built out of what the fridge photo shows, plus the shopping list) and ends
 * like the friday-night task: a Gemini Intelligence notification, then a third-party app
 * card to finish in. Rendered by `DinnerPlanResponse.tsx`.
 */
export type DinnerIdea = {
  id: string;
  name: string;
  /** What tapping this dinner adds, as Gemini reports it back. */
  added: string;
};

export type PickupItem = { id: string; name: string; price: string };

export type PickupOrder = {
  appName: string;
  pickupLabel: string;
  pickupDetail: string;
  itemCount: string;
  items: PickupItem[];
  subtotal: string;
  pickupFee: string;
  taxes: string;
  total: string;
  confirmLabel: string;
  confirmedLabel: string;
};

export type DinnerPlanContent = {
  answer: ResponseContent;
  /** The dinners offered as chips under the answer; tapping one adds its ingredients. */
  ideas: DinnerIdea[];
  orderLabel: string;
  /** The task's own beats, auto-advancing; the last one carries the button into the app. */
  notification: { eyebrow: string; steps: TaskStep[]; cta: string };
  order: PickupOrder;
};

export const DINNER_PLAN: DinnerPlanContent = {
  answer: {
    promptLines: [
      "I need to use up what\u2019s in the fridge. Suggest 3 dinners based on what I have and add any additional ingredients to a shopping list.",
    ],
    introLines: [
      "I spotted chicken, eggs, bell peppers, onions, shredded cheese, carrots, and leftover rice in your fridge! Here are 3 easy dinners to make the most of what you have, plus a quick shopping list to round them out:",
    ],
    plainHeadings: true,
    // the answer carries on into the task below it, so it does not close with a disclaimer
    hideFooter: true,
    sections: [
      {
        id: "pasta-bake",
        heading: "Veggie Pasta Bake",
        bullets: [
          { label: "Uses:", text: "Peppers, onions, cheese" },
          {
            label: "Quick prep:",
            text: "Saut\u00e9 the veggies, toss with pasta and marinara, top with melted cheese, and bake until bubbly.",
          },
        ],
      },
      {
        id: "fajita",
        heading: "Chicken Fajita Night",
        bullets: [
          { label: "Uses:", text: "Chicken breast, peppers, onions, cheese" },
          {
            label: "Quick prep:",
            text: "Season chicken and veggie strips, roast on a sheet pan, and serve in warm tortillas with melted cheese.",
          },
        ],
      },
      {
        id: "fried-rice",
        heading: "Fried Rice with Peas",
        bullets: [
          { label: "Uses:", text: "Leftover rice, eggs, peas, carrots, onion" },
          {
            label: "Quick prep:",
            text: "Scramble the eggs, stir-fry the veggies and rice with a splash of soy sauce, and fold everything together.",
          },
        ],
      },
      {
        id: "shopping",
        heading: "\ud83d\uded2 Quick Shopping List",
        bullets: [
          { text: "Pasta & marinara sauce" },
          { text: "Tortillas & fajita seasoning" },
          { text: "Soy sauce" },
        ],
      },
    ],
  },
  ideas: [
    { id: "pasta-bake", name: "Veggie Pasta Bake", added: "Pasta and marinara sauce added to your shopping list." },
    { id: "fajita", name: "Chicken Fajita Night", added: "Tortillas and fajita seasoning added to your shopping list." },
    { id: "fried-rice", name: "Fried Rice with Peas", added: "Soy sauce added to your shopping list." },
  ],
  orderLabel: "Order missing ingredients",
  notification: {
    eyebrow: "Gemini Intelligence",
    steps: [
      { id: "opening", heading: "Working on your task", subtext: "Opening FreshCart\u2026", progress: 0.2 },
      { id: "cart", heading: "Task in progress", subtext: "Adding pasta and marinara sauce to your cart", progress: 0.55 },
      { id: "slot", heading: "Task in progress", subtext: "Reserving a pickup slot at the Hillhurst Ave store", progress: 0.85 },
      { id: "finish", heading: "Finish up your task", subtext: "Your pickup order is ready. Please confirm in the FreshCart app." },
    ],
    cta: "Open FreshCart",
  },
  order: {
    appName: "FreshCart",
    pickupLabel: "FreshCart",
    pickupDetail: "Hillhurst Ave store \u00b7 ready from 5:30 PM",
    itemCount: "2 items",
    items: [
      { id: "pasta", name: "Pasta, 500g", price: "$1.90" },
      { id: "marinara", name: "Marinara sauce, 700g jar", price: "$2.60" },
    ],
    subtotal: "$4.50",
    pickupFee: "Free",
    taxes: "$0.60",
    total: "$5.10",
    confirmLabel: "Confirm pickup",
    confirmedLabel: "Pickup confirmed",
  },
};

/**
 * "Update the team" — the parent's voice flow, and the only one whose input is spoken.
 *
 * `transcript` is the raw dictation, split so the animation can tell the two kinds of word
 * apart: `keep: false` is the hesitation Gemini drops — the ums, the restarts, the numbers
 * said twice — and what is left is the update. `message` is what is actually sent: the kept
 * words, tidied into sentences the way a transcription would be, which is why it is authored
 * rather than derived.
 */
export type VoiceSegment = { text: string; keep?: boolean };

export type VoiceUpdateContent = {
  thread: MessagesThread;
  opening: ChatBubble[];
  transcript: VoiceSegment[];
  message: string;
};

export const VOICE_UPDATE: VoiceUpdateContent = {
  thread: {
    name: "The team",
    avatars: [
      "/v81-image-assets-inuse/assets/msg/av-a0.png",
      "/v81-image-assets-inuse/assets/msg/av-a1.png",
      "/v81-image-assets-inuse/assets/msg/av-a2.png",
      "/v81-image-assets-inuse/assets/msg/av-a3.png",
    ],
  },
  opening: [
    {
      kind: "incoming",
      name: "Priya",
      avatar: "/v81-image-assets-inuse/assets/msg/av-a1.png",
      text: "How did the meeting go today?",
    },
  ],
  transcript: [
    { text: "Okay so, um," },
    { text: "hey team,", keep: true },
    { text: "quick update," },
    { text: "quick update on", keep: true },
    { text: "the, on" },
    { text: "the negotiation. It ran over, we closed at,", keep: true },
    { text: "uh, ten past three, no, sorry, quarter past," },
    { text: "quarter past three.", keep: true },
    { text: "Um, clause four, no wait," },
    { text: "clauses four and seven, both agreed.", keep: true },
    { text: "Uh, signature copies," },
    { text: "the signature copies go out tomorrow morning.", keep: true },
    { text: "And, um," },
    { text: "I\u2019ll do", keep: true },
    { text: "the," },
    { text: "the full summary tonight,", keep: true },
    { text: "after," },
    { text: "after pickup.", keep: true },
    { text: "Okay, yeah, that\u2019s it." },
  ],
  message:
    "Hey team, quick update on the negotiation. It ran over, we closed at quarter past three. Clauses 4 and 7 both agreed. The signature copies go out tomorrow morning. I\u2019ll do the full summary tonight, after pickup.",
};

/**
 * The screen a persona's story ends on, once every one of their rundown pills has been
 * played: their day, read back as four things that got done. Reached from the last flow's
 * "Back to your rundown" — there is no rundown left to go back to, only this.
 */
export type PersonaCompletion = { title: string; items: string[] };

export const COMPLETIONS: Record<string, PersonaCompletion> = {
  student: {
    title: "That\u2019s the student\u2019s day, completed",
    items: [
      "The semester: Every date on the calendar, one overview",
      "Friday night: Decision made and dinner planned.",
      "The tour: Timings, hotels and food, planned",
      "A study notebook: Guide, quiz and flash cards",
    ],
  },
  traveler: {
    title: "That\u2019s the traveler\u2019s day, completed",
    items: [
      "The briefing: Syntherva Systems on one page",
      "The weekend: Built around everyone\u2019s preferences.",
      "Saturday dinner: Found and booked",
      "A new city: Explored, stop by stop",
    ],
  },
  parent: {
    title: "That\u2019s the parent\u2019s day, completed",
    items: [
      "The party: Planned, invite made",
      "Dinner: From this morning\u2019s fridge photo",
      "The play date: Lunch found, confidently yes",
      "The client update: Sent clean by voice",
    ],
  },
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
      { id: "friends-weekend", label: "Plan a weekend getaway", active: true },
      { id: "partnerships-vp", label: "Prep for the big meeting", active: true },
      { id: "saturday-dinner", label: "Make a dinner reservation", active: true },
      { id: "new-city", label: "Explore a new city", active: true },
    ],
  },
  parent: {
    // 9:16 into 16:9, so a centred cover keeps the middle third — which frames the open boot
    // and the kit in it, with the empty dark interior landing right where the pills go.
    bgImage: "/v81-image-assets-inuse/assets/pick/parent-suv3.jpg",
    pills: [
      { id: "party", label: "Plan a kid\u2019s birthday party", active: true },
      { id: "play-date", label: "Schedule a play date", active: true },
      { id: "tonight-dinner", label: "Plan dinner for the week", active: true },
      { id: "voice-update", label: "Update the team", active: true },
    ],
  },
};
