import type { ElementId } from "@/lib/types";

export type ElementInfo = {
  symbol: string;
  name: string;
  color: string;
  outline: string;
  /** Visual ball radius in angstroms. Not a van der Waals radius. */
  radius: number;
};

/** CPK-style colors: O red, H white, C dark gray, N blue, Na purple, Cl green. */
export const ELEMENTS: Record<ElementId, ElementInfo> = {
  H: { symbol: "H", name: "氫", color: "#F7F8FB", outline: "#C5CAD6", radius: 0.22 },
  C: { symbol: "C", name: "碳", color: "#3E3E3E", outline: "#1A1A1A", radius: 0.4 },
  N: { symbol: "N", name: "氮", color: "#304FFE", outline: "#0D1A8C", radius: 0.4 },
  O: { symbol: "O", name: "氧", color: "#FF2D2D", outline: "#8C1010", radius: 0.4 },
  Na: { symbol: "Na", name: "鈉", color: "#AB5CF2", outline: "#5B2496", radius: 0.62 },
  Cl: { symbol: "Cl", name: "氯", color: "#2BD12B", outline: "#0C6E0C", radius: 0.72 },
};

export const ELEMENT_ORDER: ElementId[] = ["C", "H", "O", "N", "Na", "Cl"];
