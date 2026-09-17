import type { ComponentType } from "react";
import type { PatternId, PatternProps } from "../types";
import ScrollPattern from "./ScrollPattern";
import MeasuredColumnsPattern from "./MeasuredColumnsPattern";

export const PATTERNS: { id: PatternId; label: string; description: string; Component: ComponentType<PatternProps> }[] = [
  { id: "scroll", label: "Simple scroll", description: "Phone-width column, scrolls for any length", Component: ScrollPattern },
  { id: "measuredColumns", label: "Measured columns", description: "Three columns: answer, overflow, and the way out", Component: MeasuredColumnsPattern },
];
