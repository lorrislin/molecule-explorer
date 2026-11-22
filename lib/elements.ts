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
  He: { symbol: "He", name: "氦", color: "#D4FBFF", outline: "#6E9AA3", radius: 0.36 },
  C: { symbol: "C", name: "碳", color: "#3E3E3E", outline: "#1A1A1A", radius: 0.4 },
  N: { symbol: "N", name: "氮", color: "#304FFE", outline: "#0D1A8C", radius: 0.4 },
  O: { symbol: "O", name: "氧", color: "#FF2D2D", outline: "#8C1010", radius: 0.4 },
  Na: { symbol: "Na", name: "鈉", color: "#AB5CF2", outline: "#5B2496", radius: 0.58 },
  Mg: { symbol: "Mg", name: "鎂", color: "#8AFF00", outline: "#3C7A00", radius: 0.52 },
  Al: { symbol: "Al", name: "鋁", color: "#BFA6A6", outline: "#6E5858", radius: 0.5 },
  S: { symbol: "S", name: "硫", color: "#FFE14A", outline: "#8A6A00", radius: 0.5 },
  Cl: { symbol: "Cl", name: "氯", color: "#2BD12B", outline: "#0C6E0C", radius: 0.62 },
  K: { symbol: "K", name: "鉀", color: "#8F40D4", outline: "#4C1D80", radius: 0.64 },
  Ca: { symbol: "Ca", name: "鈣", color: "#3DFF8A", outline: "#0E7A45", radius: 0.56 },
  Fe: { symbol: "Fe", name: "鐵", color: "#E07033", outline: "#7A3010", radius: 0.5 },
  Cu: { symbol: "Cu", name: "銅", color: "#C88033", outline: "#6A3E10", radius: 0.5 },
};

export const ELEMENT_ORDER: ElementId[] = [
  "H",
  "He",
  "C",
  "N",
  "O",
  "Na",
  "Mg",
  "Al",
  "S",
  "Cl",
  "K",
  "Ca",
  "Fe",
  "Cu",
];
