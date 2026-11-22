import type { Vec3 } from "@/lib/math";

export type ElementId = "H" | "C" | "N" | "O" | "Na" | "Cl";

export type AtomCharge = {
  /** Negative is δ− or an anion. Used only to point the dipole arrow. */
  value: number;
  label: string;
  caption?: string;
  kind: "partial" | "ionic";
  size: "normal" | "small";
};

export type Atom = {
  id: string;
  element: ElementId;
  position: Vec3;
  /** One short sentence shown when the atom is tapped. */
  fact: string;
  /** Extra label, e.g. 羥基上的氧. */
  role?: string;
  charge?: AtomCharge;
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
  /** One or two junior-high sentences about whether the molecule is polar. */
  polarityNote: string;
  /**
   * Unit vector pointing toward the negative end (chemistry arrow).
   * Null when bond dipoles cancel, or for an ionic crystal.
   */
  dipole: Vec3 | null;
  accent: string;
  atoms: Atom[];
  bonds: Bond[];
};
