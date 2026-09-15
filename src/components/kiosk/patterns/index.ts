import type { ComponentType } from "react";
import type { PatternId, PatternProps } from "../types";
import PaginatedPattern from "./PaginatedPattern";
import MeasuredColumnsPattern from "./MeasuredColumnsPattern";

export const PATTERNS: { id: PatternId; label: string; description: string; Component: ComponentType<PatternProps> }[] = [
  { id: "paginated", label: "Paginated column", description: "Phone-width column, auto-paged by measured height", Component: PaginatedPattern },
  { id: "measuredColumns", label: "Measured columns", description: "Same flow, browser-balanced into two columns", Component: MeasuredColumnsPattern },
];
