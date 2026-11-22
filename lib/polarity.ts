import { add, length, norm, scale, type Vec3 } from "@/lib/math";
import type { Atom, AtomCharge, Molecule } from "@/lib/types";

const partial = (
  value: number,
  caption?: string,
  size: AtomCharge["size"] = "normal",
): AtomCharge => ({
  value,
  label: value < 0 ? "δ−" : "δ+",
  caption,
  kind: "partial",
  size,
});

const ionic = (value: number, label: string, caption: string): AtomCharge => ({
  value,
  label,
  caption,
  kind: "ionic",
  size: "small",
});

function chargeFor(moleculeId: string, atom: Atom): AtomCharge | undefined {
  switch (moleculeId) {
    case "water":
      if (atom.element === "O") return partial(-0.66, "部分負電");
      if (atom.element === "H") return partial(0.33, "部分正電");
      return undefined;
    case "co2":
      if (atom.element === "O") return partial(-0.2, undefined, "small");
      if (atom.element === "C") return partial(0.4, undefined, "small");
      return undefined;
    case "methane":
      if (atom.element === "C") return partial(-0.2, undefined, "small");
      if (atom.element === "H") return partial(0.05, undefined, "small");
      return undefined;
    case "ammonia":
      if (atom.element === "N") return partial(-0.6, "部分負電");
      if (atom.element === "H") return partial(0.2, "部分正電");
      return undefined;
    case "ethanol":
      if (atom.id === "O") return partial(-0.55, "部分負電");
      if (atom.id === "Ho") return partial(0.4, "部分正電");
      if (atom.id === "Ca") return partial(0.15, undefined, "small");
      return undefined;
    case "glucose":
      if (atom.id === "O5") return partial(-0.25, undefined, "small");
      if (atom.element === "O") return partial(-0.45, undefined, "small");
      if (atom.id.startsWith("HO")) return partial(0.35, undefined, "small");
      return undefined;
    case "caffeine":
      if (atom.id === "O2" || atom.id === "O6") return partial(-0.5, undefined, "small");
      if (atom.id === "C2" || atom.id === "C6") return partial(0.35, undefined, "small");
      if (atom.element === "N") return partial(-0.15, undefined, "small");
      return undefined;
    case "salt":
      if (atom.element === "Na") return ionic(1, "Na⁺", "陽離子");
      if (atom.element === "Cl") return ionic(-1, "Cl⁻", "陰離子");
      return undefined;
    default:
      return undefined;
  }
}

/** Chemistry arrow points toward δ−, opposite the Σ q·r vector. */
export function dipoleTowardNegative(atoms: Atom[]): Vec3 | null {
  let sum: Vec3 = [0, 0, 0];
  let counted = false;
  for (const atom of atoms) {
    if (!atom.charge || atom.charge.kind === "ionic") continue;
    counted = true;
    sum = add(sum, scale(atom.position, atom.charge.value));
  }
  if (!counted || length(sum) < 0.08) return null;
  return scale(norm(sum), -1);
}

const NOTES: Record<string, string> = {
  water: "水是極性分子。氧的電負度比氫大，氧是 δ−（部分負電），兩個氫是 δ+（部分正電），偶極指向氧。",
  co2: "每根碳氧鍵都有極性，氧是 δ−、碳是 δ+。分子排成直線，兩邊的偶極互相抵消，所以二氧化碳是非極性分子。",
  oxygen: "兩個氧原子相同，電子沒有偏哪一邊，沒有部分電荷。氧氣是非極性分子。",
  hydrogen: "兩個氫原子電負度一樣，電子共用在正中間。氫氣沒有偶極，是非極性分子。",
  nitrogen: "兩個氮原子相同，三鍵的電子不偏任何一端。氮氣是非極性分子。",
  methane: "碳比氫稍微容易拉電子，碳是 δ−、氫是 δ+，但差距很小。四根鍵對稱抵消，甲烷是非極性分子。",
  ammonia: "氨是極性分子。氮的電負度比氫大，氮是 δ−、氫是 δ+，偶極從氫指向氮。",
  ethanol: "乙醇是極性分子，極性主要在羥基：氧是 δ−，連在氧上的氫是 δ+。所以酒精可以跟水互溶。",
  glucose: "葡萄糖有很多羥基，氧是 δ−、羥基上的氫是 δ+。它是極性分子，也因此容易溶在水裡。",
  salt: "氯化鈉不是極性分子，而是離子晶體。鈉變成 Na⁺、氯變成 Cl⁻，電荷是完整的一正一負，不是 δ。",
  caffeine: "咖啡因的碳氧雙鍵裡，氧是 δ−、碳是 δ+，環上的氮也偏負。電荷不完全對稱，所以它是極性分子。",
};

export function applyPolarity(molecule: Molecule): Molecule {
  const atoms = molecule.atoms.map((atom) => ({
    ...atom,
    charge: chargeFor(molecule.id, atom),
  }));
  return {
    ...molecule,
    atoms,
    polarityNote: NOTES[molecule.id] ?? "",
    dipole: molecule.id === "salt" ? null : dipoleTowardNegative(atoms),
  };
}
