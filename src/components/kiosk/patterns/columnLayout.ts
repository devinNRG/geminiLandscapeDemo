/**
 * The measured-columns pattern's frame geometry: three equal columns across the kiosk.
 *
 * This lives in its own module rather than inside MeasuredColumnsPattern because the
 * pattern doesn't own everything that sits in its columns — page.tsx floats the compose
 * bar and the exit chrome above the whole frame, and those have to land inside column one
 * and column three respectively. Two files placing things in the same grid means the grid
 * has to be one set of numbers, not two that drift.
 *
 * Everything below is derived from two chosen values (the edge inset and the column
 * width); nothing here is a hand-tuned position.
 */

/** The frame is pinned to 16:9 and is 100cqw wide by definition, so its height is a constant too. */
export const FRAME_HEIGHT_CQW = 56.25;

/**
 * Inset from the frame's left and right edges. Deliberately tighter than the frame's own
 * chrome inset (2.87cqw): with three columns to fit, every cqw given back to the edges is
 * a cqw off the columns, and the columns are what has to stay readable.
 */
export const EDGE_PADDING_CQW = 2;

/**
 * The floor all three columns sit on, as a gap up from the frame's bottom edge. It's the
 * compose bar's own resting clearance (page.tsx pins the bar's bottom edge at
 * COMPOSE_BOTTOM_CQW = 53.27, and 56.25 - 53.27 is this), so the columns, the compose box
 * inside column one and the exit chrome inside column three all share one baseline instead
 * of each ending wherever its own content happens to stop.
 */
export const COLUMN_BASELINE_CQW = FRAME_HEIGHT_CQW - 53.27;

export const COLUMN_COUNT = 3;

/**
 * As wide as three columns can be and still leave a readable gutter either side of the two
 * dividers. Everything inside a column is drawn at COLUMN_SCALE below, which is derived
 * from this — so widening the column is also what makes the type bigger, and the two can
 * never drift apart.
 */
export const COLUMN_WIDTH_CQW = 30;

/** Derived, not chosen: whatever's left after three columns and the edge insets, split
 *  evenly across the four gaps (one either side of each of the two dividers). */
export const COLUMN_GAP_CQW =
  (100 - EDGE_PADDING_CQW * 2 - COLUMN_WIDTH_CQW * COLUMN_COUNT) / ((COLUMN_COUNT - 1) * 2);

/** The chat flow's own top bar — an empty px-[2.87cqw] py-[1.88cqw] spacer in page.tsx,
 *  so 1.88 * 2 tall — and the columns' padding below it. Their sum is where column content
 *  starts, measured down from the frame's top edge; page.tsx needs it to center column
 *  three's chrome against the same band the other two columns occupy. */
export const TOP_BAR_CQW = 1.88 * 2;
export const COLUMN_PT_CQW = 2.3;
export const COLUMN_TOP_CQW = TOP_BAR_CQW + COLUMN_PT_CQW;

/** Center of column `i` (0-based) in cqw from the frame's left edge — what page.tsx
 *  positions the compose bar and the exit chrome against. */
export function columnCenterCqw(i: number) {
  return EDGE_PADDING_CQW + COLUMN_WIDTH_CQW / 2 + i * (COLUMN_WIDTH_CQW + COLUMN_GAP_CQW * 2);
}

/**
 * The single-column width every answer's content was authored against, and that
 * ScrollPattern still renders at. It matters because `Section.items` are deliberately
 * pre-broken into display lines (see the README) — those breaks only stay exact at the
 * width they were written for.
 */
export const AUTHORED_COLUMN_WIDTH_CQW = 42;

/**
 * Three columns can't be 42cqw wide, so rather than let the narrower column re-wrap those
 * authored lines into ragged two-liners, everything rendered inside a column — the type,
 * and the compose bar page.tsx scales into column one — is drawn at this ratio. Same
 * layout, smaller: the line breaks land exactly where they were authored to.
 */
export const COLUMN_SCALE = COLUMN_WIDTH_CQW / AUTHORED_COLUMN_WIDTH_CQW;
