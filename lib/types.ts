import type { Vec3 } from "@/lib/math";

export type ElementId = "H" | "C" | "N" | "O" | "Na" | "Cl";

export type Atom = {
  id: string;
  element: ElementId;
  position: Vec3;
  /** One short sentence shown when the atom is tapped. */
  fact: string;
  /** Extra label, e.g. 羥基上的氧. */
  role?: string;
};

export type BondOrder = 1 | 2 | 3;

export type Bond = {
  a: string;
  b: string;
  order: BondOrder;
  /** Ionic sticks are only visual guides for the crystal lattice. */
  kind?: "covalent" | "ionic";
};

export type Molecule = {
  id: string;
  name: string;
  formula: string;
  blurb: string;
  accent: string;
  atoms: Atom[];
  bonds: Bond[];
};
