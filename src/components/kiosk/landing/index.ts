import type { ComponentType } from "react";
import type { LandingLayoutId, Persona } from "../types";
import CardsLayout from "./CardsLayout";
import GlassPillsLayout from "./GlassPillsLayout";

export type LandingLayoutProps = { onSelect: (persona: Persona) => void };

export const LANDING_LAYOUTS: { id: LandingLayoutId; label: string; description: string; Component: ComponentType<LandingLayoutProps> }[] = [
  { id: "cards", label: "Photo cards", description: "Full-height persona photo cards, original layout", Component: CardsLayout },
  { id: "glassPills", label: "Glass pills", description: "Full-bleed scene with frosted-glass pill buttons", Component: GlassPillsLayout },
];
