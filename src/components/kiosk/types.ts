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

export type PatternId = "scroll" | "measuredColumns";

export type PatternProps = {
  content: ResponseContent;
  /** Whether this pattern is the one currently on screen — patterns reset their internal nav state on the false→true edge. */
  active: boolean;
  /** Fires once the answer has fully revealed — drives the shared "back to landing" corner button in page.tsx. */
  onComplete?: () => void;
  /**
   * How tall the floating compose box is as actually drawn — its live height times whatever
   * scale it's being rendered at. Live rather than a constant: the box grows with its own
   * text, and the measured-columns pattern places it *inside* column one, so that column's
   * usable height moves with it. A pattern that floats content over the bar rather than
   * laying out around it (ScrollPattern) can ignore this.
   */
  composeHeightCqw?: number;
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
export type MessagesSuggestion = { title: string; subtitle: string };

/** Picks up on Marco's "let's do our usual order". */
export const STAY_IN_SUGGESTION: MessagesSuggestion = { title: "Reorder your usual", subtitle: "The group chat · Messages" };

/** Picks up on Priya's "let's go to sushi tonight" plus Marco's dietary ask. */
export const GO_OUT_SUGGESTION: MessagesSuggestion = { title: "Sushi restaurants nearby", subtitle: "The group chat · Messages" };

export const GO_OUT_MESSAGES: ChatBubble[] = [
  { kind: "outgoing", text: "Friday night, what are we doing?" },
  { kind: "incoming", name: "Priya", avatar: "/gemini/friday-night/avatar-priya.png", text: "let’s go to sushi tonight" },
  { kind: "incoming", name: "Marco", avatar: "/gemini/friday-night/avatar-marco.png", text: "only if there are vegetarian and gluten free options" },
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
  promptLines: ["Find the best sushi restaurants near me"],
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
  label: string;
  sublabel: string;
  image: string;
  /** Horizontal focal point (0-100, `object-position` X) that keeps this persona's face centered under `object-fit: cover` — each source photo needs its own crop. */
  imageFocusXPct: number;
  /** Solid color standing in for a persona photo inside the landing screen's pills, until real photography is signed off — paired with the label's initial. */
  swatchColor: string;
  /** Whether this card routes anywhere yet — disabled/greyed out on the landing screen until it does. */
  active?: boolean;
};

export const PERSONAS: Persona[] = [
  { id: "student", label: "The student, 20", sublabel: "Student and guitar player", image: "/gemini/personas/student.png", imageFocusXPct: 40, swatchColor: "#4c8df6", active: true },
  { id: "traveler", label: "The traveler, 28", sublabel: "Professional who loves to travel", image: "/gemini/personas/traveler.png", imageFocusXPct: 37, swatchColor: "#e8734a", active: true },
  { id: "parent", label: "The parent, 38", sublabel: "Parent with school and work obligations", image: "/gemini/personas/parent.png", imageFocusXPct: 44, swatchColor: "#34a853", active: true },
];

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
