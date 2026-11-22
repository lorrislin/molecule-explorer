import { ELEMENTS } from "@/lib/elements";
import { applyPolarity } from "@/lib/polarity";
import {
  add,
  centroid,
  chairRing,
  distance,
  place,
  scale,
  sub,
  tetrahedralPair,
  trigonalDirection,
  type Vec3,
} from "@/lib/math";
import type { Atom, Bond, ElementId, Molecule } from "@/lib/types";

const TETRAHEDRAL = Math.acos(-1 / 3) * (180 / Math.PI);
const WATER_ANGLE = 104.5;
const AMMONIA_ANGLE = 107;
const HYDROXYL_ANGLE = 108.5;

const BOND = {
  hH: 0.74,
  oO: 1.21,
  nN: 1.1,
  oH: 0.96,
  cH: 1.09,
  cO: 1.43,
  cC: 1.51,
  cODouble: 1.16,
  carbonyl: 1.22,
  aromatic: 1.38,
  nMethyl: 1.47,
  naCl: 2.82,
} as const;

type Draft = {
  atoms: Atom[];
  bonds: Bond[];
};

function atom(
  draft: Draft,
  id: string,
  element: ElementId,
  position: Vec3,
  fact: string,
  role?: string,
): void {
  draft.atoms.push({ id, element, position, fact, role });
}

function bond(draft: Draft, a: string, b: string, order: Bond["order"] = 1, kind: Bond["kind"] = "covalent"): void {
  draft.bonds.push({ a, b, order, kind });
}

function center(draft: Draft): Draft {
  const origin = centroid(draft.atoms.map((item) => item.position));
  return {
    bonds: draft.bonds,
    atoms: draft.atoms.map((item) => ({
      ...item,
      position: sub(item.position, origin),
    })),
  };
}

function molecule(
  id: string,
  name: string,
  formula: string,
  blurb: string,
  accent: string,
  draft: Draft,
): Molecule {
  const centered = center(draft);
  return applyPolarity({
    id,
    name,
    formula,
    blurb,
    polarityNote: "",
    dipole: null,
    accent,
    atoms: centered.atoms,
    bonds: centered.bonds,
  });
}

function water(): Draft {
  const draft: Draft = { atoms: [], bonds: [] };
  const half = (WATER_ANGLE * Math.PI) / 360;
  atom(
    draft,
    "O",
    "O",
    [0, 0, 0],
    "氧把共用的電子拉得比較靠近自己，所以這一端帶一點負電。",
    "分子裡的氧",
  );
  atom(
    draft,
    "H1",
    "H",
    [Math.sin(half) * BOND.oH, Math.cos(half) * BOND.oH, 0],
    "氫只有一個電子，在這裡跟氧共用，形成 O-H 共價鍵。",
    "跟氧鍵結的氫",
  );
  atom(
    draft,
    "H2",
    "H",
    [-Math.sin(half) * BOND.oH, Math.cos(half) * BOND.oH, 0],
    "這顆氫和另一顆氫對稱，兩根鍵的夾角約 104.5°。",
    "跟氧鍵結的氫",
  );
  bond(draft, "O", "H1");
  bond(draft, "O", "H2");
  return draft;
}

function carbonDioxide(): Draft {
  const draft: Draft = { atoms: [], bonds: [] };
  atom(draft, "C", "C", [0, 0, 0], "碳在正中間，左右各用雙鍵抓著一個氧，三個原子排成一直線。", "中心的碳");
  atom(
    draft,
    "O1",
    "O",
    [-BOND.cODouble, 0, 0],
    "這個氧以雙鍵連著碳。兩邊對稱，所以整顆分子的極性會互相抵消。",
    "雙鍵上的氧",
  );
  atom(
    draft,
    "O2",
    "O",
    [BOND.cODouble, 0, 0],
    "另一側的氧也是雙鍵。二氧化碳就是我們呼氣時排出的氣體。",
    "雙鍵上的氧",
  );
  bond(draft, "C", "O1", 2);
  bond(draft, "C", "O2", 2);
  return draft;
}

function dioxygen(): Draft {
  const draft: Draft = { atoms: [], bonds: [] };
  const half = BOND.oO / 2;
  const fact = "兩個氧各拿出電子組成雙鍵，雙鍵比單鍵更短、也更不容易被拉開。";
  atom(draft, "O1", "O", [-half, 0, 0], fact, "雙鍵上的氧");
  atom(draft, "O2", "O", [half, 0, 0], fact, "雙鍵上的氧");
  bond(draft, "O1", "O2", 2);
  return draft;
}

function dihydrogen(): Draft {
  const draft: Draft = { atoms: [], bonds: [] };
  const half = BOND.hH / 2;
  const fact = "每個氫只有一個電子，兩個氫把電子配成一對，就形成共價鍵。";
  atom(draft, "H1", "H", [-half, 0, 0], fact, "氫分子裡的氫");
  atom(draft, "H2", "H", [half, 0, 0], fact, "氫分子裡的氫");
  bond(draft, "H1", "H2");
  return draft;
}

function dinitrogen(): Draft {
  const draft: Draft = { atoms: [], bonds: [] };
  const half = BOND.nN / 2;
  const fact = "氮用三個電子跟另一個氮組成三鍵，另外還留著一對孤對電子。";
  atom(draft, "N1", "N", [-half, 0, 0], fact, "三鍵上的氮");
  atom(draft, "N2", "N", [half, 0, 0], fact, "三鍵上的氮");
  bond(draft, "N1", "N2", 3);
  return draft;
}

function methane(): Draft {
  const draft: Draft = { atoms: [], bonds: [] };
  const t = BOND.cH / Math.sqrt(3);
  const hydrogens: Vec3[] = [
    [t, t, t],
    [t, -t, -t],
    [-t, t, -t],
    [-t, -t, t],
  ];
  atom(
    draft,
    "C",
    "C",
    [0, 0, 0],
    "四根鍵朝向四面體的四個角，鍵角約 109.5°，形狀完全對稱，所以甲烷幾乎沒有極性。",
    "中心的碳",
  );
  hydrogens.forEach((position, index) => {
    const id = `H${index + 1}`;
    atom(draft, id, "H", position, "這些氫把碳包在正中間，每一根都是 C-H 單鍵。", "連在碳上的氫");
    bond(draft, "C", id);
  });
  return draft;
}

function ammoniaHydrogens(bondLength: number, angleDeg: number): Vec3[] {
  const cosBond = Math.cos((angleDeg * Math.PI) / 180);
  const cosAxisSq = (cosBond + 0.5) / 1.5;
  const cosAxis = Math.sqrt(cosAxisSq);
  const sinAxis = Math.sqrt(1 - cosAxisSq);
  return [0, 120, 240].map((deg) => {
    const phi = (deg * Math.PI) / 180;
    return [bondLength * sinAxis * Math.cos(phi), bondLength * cosAxis, bondLength * sinAxis * Math.sin(phi)];
  });
}

function ammonia(): Draft {
  const draft: Draft = { atoms: [], bonds: [] };
  atom(
    draft,
    "N",
    "N",
    [0, 0, 0],
    "氮的孤對電子佔住一個位置，把三根鍵往旁邊推，所以不是平面，氮這一端電子比較多。",
    "錐頂的氮",
  );
  ammoniaHydrogens(BOND.oH, AMMONIA_ANGLE).forEach((position, index) => {
    const id = `H${index + 1}`;
    atom(draft, id, "H", position, "三個氫圍成金字塔的底部，跟氮以共價鍵相連。", "連在氮上的氫");
    bond(draft, "N", id);
  });
  return draft;
}

function ethanol(): Draft {
  const draft: Draft = { atoms: [], bonds: [] };
  const carbonA: Vec3 = [0, 0, 0];
  const carbonB: Vec3 = [BOND.cC, 0, 0];
  const ref: Vec3 = [0, 1, 0];
  const oxygen = place(carbonA, carbonB, ref, BOND.cO, TETRAHEDRAL, 0);
  const methyleneH1 = place(carbonA, carbonB, ref, BOND.cH, TETRAHEDRAL, 120);
  const methyleneH2 = place(carbonA, carbonB, ref, BOND.cH, TETRAHEDRAL, 240);
  const methyl = [60, 180, 300].map((phi, index) => ({
    id: `Hb${index + 1}`,
    position: place(carbonB, carbonA, ref, BOND.cH, TETRAHEDRAL, phi),
  }));
  const hydroxylH = place(oxygen, carbonA, carbonB, BOND.oH, HYDROXYL_ANGLE, 180);

  atom(draft, "Ca", "C", carbonA, "這個碳連著甲基、兩個氫，以及羥基上的氧。", "亞甲基的碳");
  atom(draft, "Cb", "C", carbonB, "這個碳是甲基，連著三個氫和旁邊的碳。", "甲基的碳");
  atom(draft, "O", "O", oxygen, "羥基裡的氧吸引電子的能力比較強，是乙醇能跟水互溶的原因。", "羥基上的氧");
  atom(draft, "Ho", "H", hydroxylH, "這個氫直接連在氧上，容易跟別的分子形成氫鍵。", "羥基上的氫");
  atom(draft, "Ha1", "H", methyleneH1, "這些氫連在碳上，組成穩定的 C-H 單鍵。", "連在碳上的氫");
  atom(draft, "Ha2", "H", methyleneH2, "這些氫連在碳上，組成穩定的 C-H 單鍵。", "連在碳上的氫");
  methyl.forEach((item) => {
    atom(draft, item.id, "H", item.position, "甲基上的三個氫，跟碳以單鍵相連。", "甲基上的氫");
  });

  bond(draft, "Ca", "Cb");
  bond(draft, "Ca", "O");
  bond(draft, "O", "Ho");
  bond(draft, "Ca", "Ha1");
  bond(draft, "Ca", "Ha2");
  methyl.forEach((item) => bond(draft, "Cb", item.id));
  return draft;
}

function splitDirections(center: Vec3, neighborA: Vec3, neighborB: Vec3): { axial: Vec3; equatorial: Vec3 } {
  const [first, second] = tetrahedralPair(center, neighborA, neighborB);
  if (Math.abs(first[2]) >= Math.abs(second[2])) {
    return { axial: first, equatorial: second };
  }
  return { axial: second, equatorial: first };
}

function farthestHydroxyl(oxygen: Vec3, carbon: Vec3, reference: Vec3, existing: Vec3[]): Vec3 {
  let best = place(oxygen, carbon, reference, BOND.oH, HYDROXYL_ANGLE, 60);
  let bestScore = -Infinity;
  for (const phi of [40, 80, 120, 160, 200, 240, 280, 320]) {
    const candidate = place(oxygen, carbon, reference, BOND.oH, HYDROXYL_ANGLE, phi);
    let nearest = Infinity;
    for (const point of existing) {
      if (distance(point, oxygen) < 0.05) continue;
      nearest = Math.min(nearest, distance(candidate, point));
    }
    const score = nearest + lengthFromOrigin(candidate) * 0.02;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

function lengthFromOrigin(point: Vec3): number {
  return Math.hypot(point[0], point[1], point[2]);
}

function glucose(): Draft {
  const draft: Draft = { atoms: [], bonds: [] };
  const ring = chairRing(1.5);
  const labels = ["C1", "C2", "C3", "C4", "C5", "O5"] as const;
  const positions = new Map<string, Vec3>(labels.map((label, index) => [label, ring[index]]));

  const ringCarbons = ["C1", "C2", "C3", "C4", "C5"] as const;
  ringCarbons.forEach((id, index) => {
    const previous = labels[(index + 5) % 6];
    const next = labels[(index + 1) % 6];
    const here = positions.get(id)!;
    const { axial, equatorial } = splitDirections(here, positions.get(previous)!, positions.get(next)!);
    const hydrogen = add(here, scale(axial, BOND.cH));
    const isTail = id === "C5";
    const substituentLength = isTail ? BOND.cC : BOND.cO;
    const substituent = add(here, scale(equatorial, substituentLength));
    const substituentId = isTail ? "C6" : `O${index + 1}`;

    atom(
      draft,
      id,
      "C",
      here,
      id === "C1"
        ? "這個碳連著環上的氧，也連著一個羥基，是環狀葡萄糖的開頭。"
        : "環上的碳以共價鍵彼此相連，再各自連著氫或羥基。",
      "環上的碳",
    );
    atom(draft, `H${id}`, "H", hydrogen, "這個氫大約垂直於環，佔的是椅子形裡的直立位置。", "連在碳上的氫");
    bond(draft, id, `H${id}`);

    if (isTail) {
      atom(draft, "C6", "C", substituent, "這個碳在環外，帶著一個羥基，是葡萄糖伸出去的小尾巴。", "環外的碳");
      bond(draft, "C5", "C6");
      positions.set("C6", substituent);
    } else {
      atom(draft, substituentId, "O", substituent, "羥基上的氧讓葡萄糖很容易溶在水裡。", "羥基上的氧");
      bond(draft, id, substituentId);
      positions.set(substituentId, substituent);
    }
  });

  atom(
    draft,
    "O5",
    "O",
    positions.get("O5")!,
    "這個氧在環裡面，把碳鏈的兩端接成六角環。",
    "環上的氧",
  );

  const carbon6 = positions.get("C6")!;
  const carbon5 = positions.get("C5")!;
  const carbon4 = positions.get("C4")!;
  const oxygen6 = place(carbon6, carbon5, carbon4, BOND.cO, TETRAHEDRAL, 180);
  const h6a = place(carbon6, carbon5, carbon4, BOND.cH, TETRAHEDRAL, 60);
  const h6b = place(carbon6, carbon5, carbon4, BOND.cH, TETRAHEDRAL, 300);
  atom(draft, "O6", "O", oxygen6, "尾巴上的這個氧也屬於羥基，可以跟水形成氫鍵。", "羥基上的氧");
  atom(draft, "H6a", "H", h6a, "這兩個氫和羥基一起接在環外的碳上。", "連在碳上的氫");
  atom(draft, "H6b", "H", h6b, "這兩個氫和羥基一起接在環外的碳上。", "連在碳上的氫");
  bond(draft, "C6", "O6");
  bond(draft, "C6", "H6a");
  bond(draft, "C6", "H6b");
  positions.set("O6", oxygen6);

  const hydroxyls = [
    ["O1", "C1", "C2"],
    ["O2", "C2", "C3"],
    ["O3", "C3", "C4"],
    ["O4", "C4", "C5"],
    ["O6", "C6", "C5"],
  ] as const;
  hydroxyls.forEach(([oxygenId, carbonId, referenceId]) => {
    const existing = draft.atoms.map((item) => item.position);
    const hydrogen = farthestHydroxyl(
      positions.get(oxygenId)!,
      positions.get(carbonId)!,
      positions.get(referenceId)!,
      existing,
    );
    const hydrogenId = `H${oxygenId}`;
    atom(draft, hydrogenId, "H", hydrogen, "羥基上的氫連在氧上，可以跟別的分子形成氫鍵。", "羥基上的氫");
    bond(draft, oxygenId, hydrogenId);
  });

  bond(draft, "C1", "C2");
  bond(draft, "C2", "C3");
  bond(draft, "C3", "C4");
  bond(draft, "C4", "C5");
  bond(draft, "C5", "O5");
  bond(draft, "O5", "C1");
  return draft;
}

function pointOnCircle(center: Vec3, radius: number, angle: number): Vec3 {
  return [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle), 0];
}

function caffeine(): Draft {
  const draft: Draft = { atoms: [], bonds: [] };
  const ringRadius = BOND.aromatic;
  const hexagon = Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 6 + index * (Math.PI / 3);
    return pointOnCircle([0, 0, 0], ringRadius, angle);
  });
  const c4 = hexagon[0];
  const n3 = hexagon[1];
  const c2 = hexagon[2];
  const n1 = hexagon[3];
  const c6 = hexagon[4];
  const c5 = hexagon[5];

  const pentagonRadius = ringRadius / (2 * Math.sin(Math.PI / 5));
  const mid = scale(add(c4, c5), 0.5);
  const midLength = Math.hypot(mid[0], mid[1], mid[2]);
  const outward: Vec3 = [mid[0] / midLength, mid[1] / midLength, 0];
  const drop = Math.sqrt(pentagonRadius * pentagonRadius - (ringRadius / 2) * (ringRadius / 2));
  const pentagonCenter = add(mid, scale(outward, drop));
  const angleOf = (point: Vec3) => Math.atan2(point[1] - pentagonCenter[1], point[0] - pentagonCenter[0]);
  const angle4 = angleOf(c4);
  let step = angleOf(c5) - angle4;
  if (step > Math.PI) step -= Math.PI * 2;
  if (step < -Math.PI) step += Math.PI * 2;
  const n9 = pointOnCircle(pentagonCenter, pentagonRadius, angle4 - step);
  const c8 = pointOnCircle(pentagonCenter, pentagonRadius, angle4 - 2 * step);
  const n7 = pointOnCircle(pentagonCenter, pentagonRadius, angle4 - 3 * step);

  const o2 = add(c2, scale(trigonalDirection(c2, n1, n3), BOND.carbonyl));
  const o6 = add(c6, scale(trigonalDirection(c6, n1, c5), BOND.carbonyl));
  const methyl1 = add(n1, scale(trigonalDirection(n1, c2, c6), BOND.nMethyl));
  const methyl3 = add(n3, scale(trigonalDirection(n3, c2, c4), BOND.nMethyl));
  const methyl7 = add(n7, scale(trigonalDirection(n7, c5, c8), BOND.nMethyl));
  const h8 = add(c8, scale(trigonalDirection(c8, n7, n9), BOND.cH));

  const ringCarbonFact = "這些碳組成咖啡因扁平的雙環骨架。";
  atom(draft, "C2", "C", c2, "這個碳連著雙鍵的氧，是環上的一個羰基碳。", "環上的碳");
  atom(draft, "C4", "C", c4, ringCarbonFact, "兩個環共用的碳");
  atom(draft, "C5", "C", c5, ringCarbonFact, "兩個環共用的碳");
  atom(draft, "C6", "C", c6, "這個碳也連著碳氧雙鍵，跟 C2 一起是咖啡因的兩個羰基。", "環上的碳");
  atom(draft, "C8", "C", c8, "五角環上的這個碳還連著一顆氫，是雙環上唯一直接連氫的碳。", "環上的碳");

  const nitrogenFact = "咖啡因的環上有四個氮，有的還接著甲基。";
  atom(draft, "N1", "N", n1, nitrogenFact, "接著甲基的氮");
  atom(draft, "N3", "N", n3, nitrogenFact, "接著甲基的氮");
  atom(draft, "N7", "N", n7, nitrogenFact, "接著甲基的氮");
  atom(draft, "N9", "N", n9, "這個氮在五角環上，圖中用雙鍵連著旁邊的碳。", "環上的氮");

  const carbonylFact = "這個氧以雙鍵連著碳，這種 C=O 叫做羰基。";
  atom(draft, "O2", "O", o2, carbonylFact, "羰基上的氧");
  atom(draft, "O6", "O", o6, carbonylFact, "羰基上的氧");

  const methylCarbons = [
    ["Cm1", methyl1, "N1"],
    ["Cm3", methyl3, "N3"],
    ["Cm7", methyl7, "N7"],
  ] as const;
  methylCarbons.forEach(([id, position]) => {
    atom(draft, id, "C", position, "這是接在氮上的甲基碳，連著三個氫。", "甲基的碳");
  });
  atom(draft, "H8", "H", h8, "雙環上只有這顆氫直接連著碳，其餘的位置都被別的原子佔滿了。", "連在碳上的氫");

  methylCarbons.forEach(([carbonId, position, nitrogenId]) => {
    const nitrogen = { N1: n1, N3: n3, N7: n7 }[nitrogenId];
    [180, 60, 300].forEach((phi, index) => {
      const id = `H${carbonId}${index + 1}`;
      atom(
        draft,
        id,
        "H",
        place(position, nitrogen, c2, BOND.cH, TETRAHEDRAL, phi),
        "這些氫三個一組，屬於接在氮上的甲基。",
        "甲基上的氫",
      );
      bond(draft, carbonId, id);
    });
    bond(draft, nitrogenId, carbonId);
  });

  bond(draft, "C8", "H8");
  bond(draft, "C2", "O2", 2);
  bond(draft, "C6", "O6", 2);
  bond(draft, "N1", "C2");
  bond(draft, "C2", "N3");
  bond(draft, "N3", "C4");
  bond(draft, "C4", "C5", 2);
  bond(draft, "C5", "C6");
  bond(draft, "C6", "N1");
  bond(draft, "C5", "N7");
  bond(draft, "N7", "C8");
  bond(draft, "C8", "N9", 2);
  bond(draft, "N9", "C4");
  return draft;
}

function salt(): Draft {
  const draft: Draft = { atoms: [], bonds: [] };
  const coords: Array<{ i: number; j: number; k: number }> = [];
  for (let i = -1; i <= 1; i += 1) {
    for (let j = -1; j <= 1; j += 1) {
      for (let k = -1; k <= 1; k += 1) {
        coords.push({ i, j, k });
      }
    }
  }
  coords.forEach(({ i, j, k }) => {
    const even = ((i + j + k) % 2 + 2) % 2 === 0;
    const element: ElementId = even ? "Na" : "Cl";
    const id = `${element}_${i}_${j}_${k}`;
    atom(
      draft,
      id,
      element,
      [i * BOND.naCl, j * BOND.naCl, k * BOND.naCl],
      even
        ? "鈉離子少了一個電子，帶正電，在晶格裡被氯離子包圍。"
        : "氯離子多了一個電子，帶負電，跟旁邊的鈉離子互相吸引。",
      even ? "鈉離子 Na⁺" : "氯離子 Cl⁻",
    );
  });
  for (let index = 0; index < coords.length; index += 1) {
    for (let other = index + 1; other < coords.length; other += 1) {
      const a = coords[index];
      const b = coords[other];
      const delta = Math.abs(a.i - b.i) + Math.abs(a.j - b.j) + Math.abs(a.k - b.k);
      if (delta !== 1) continue;
      const aEven = ((a.i + a.j + a.k) % 2 + 2) % 2 === 0;
      const bEven = ((b.i + b.j + b.k) % 2 + 2) % 2 === 0;
      const aId = `${aEven ? "Na" : "Cl"}_${a.i}_${a.j}_${a.k}`;
      const bId = `${bEven ? "Na" : "Cl"}_${b.i}_${b.j}_${b.k}`;
      bond(draft, aId, bId, 1, "ionic");
    }
  }
  return draft;
}

export const molecules: Molecule[] = [
  molecule(
    "water",
    "水",
    "H2O",
    "水的分子式是 H₂O，一個氧用共價鍵連著兩個氫。氧上還有兩對沒共用的電子（孤對電子），把鍵角撐成約 104.5°，分子是彎的；電子又比較靠近氧，所以水有極性。",
    "#1f6feb",
    water(),
  ),
  molecule(
    "co2",
    "二氧化碳",
    "CO2",
    "二氧化碳的分子式是 CO₂，碳在中間，以雙鍵連著兩個氧，排成直線，鍵角 180°。兩根鍵各自有極性，但左右對稱、互相抵消，所以整顆分子沒有極性。",
    "#0f766e",
    carbonDioxide(),
  ),
  molecule(
    "oxygen",
    "氧氣",
    "O2",
    "氧氣是兩個氧原子以雙鍵結合的分子，分子式 O₂。這就是呼吸時吸進去、由血液運送的氧氣。",
    "#d62828",
    dioxygen(),
  ),
  molecule(
    "hydrogen",
    "氫氣",
    "H2",
    "氫氣的分子式是 H₂，兩個氫原子用一根共價鍵拉在一起，是最輕的氣體。它很易燃，所以派對氣球多半改裝氦氣，而不是氫氣。",
    "#4c5d86",
    dihydrogen(),
  ),
  molecule(
    "nitrogen",
    "氮氣",
    "N2",
    "氮氣的分子式是 N₂，兩個氮原子以三鍵結合。三鍵非常牢固，所以空氣裡雖然大約有五分之四是氮，它卻不太容易跟別的物質反應。",
    "#3730a3",
    dinitrogen(),
  ),
  molecule(
    "methane",
    "甲烷",
    "CH4",
    "甲烷的分子式是 CH₄，一個碳用四根共價鍵連著四個氫，朝向四面體的四個角，鍵角約 109.5°。天然氣的主要成分就是它。",
    "#047857",
    methane(),
  ),
  molecule(
    "ammonia",
    "氨",
    "NH3",
    "氨的分子式是 NH₃。氮連著三個氫，另外一對電子沒有用來鍵結（孤對電子），所以分子是三角錐，鍵角約 107°，而且有極性。",
    "#7c3aed",
    ammonia(),
  ),
  molecule(
    "ethanol",
    "乙醇",
    "C2H5OH",
    "乙醇就是一般說的酒精，分子式 C₂H₅OH。兩個碳以單鍵相連，一端再接上羥基（-OH），所以酒精可以跟水互相溶解。",
    "#c2410c",
    ethanol(),
  ),
  molecule(
    "glucose",
    "葡萄糖",
    "C6H12O6",
    "葡萄糖的分子式是 C₆H₁₂O₆，是細胞常用的能量。圖中是常見的環狀結構：五個碳和一個氧圍成椅子形，羥基大多往環外平伸。",
    "#b45309",
    glucose(),
  ),
  molecule(
    "salt",
    "食鹽",
    "NaCl",
    "食鹽的主成分是氯化鈉。鈉把一個電子給氯，形成 Na⁺ 和 Cl⁻，正負離子以離子鍵排成方格。短棒只是用來標出相鄰的離子，不是共價鍵。",
    "#0e7490",
    salt(),
  ),
  molecule(
    "caffeine",
    "咖啡因",
    "C8H10N4O2",
    "咖啡因的分子式是 C₈H₁₀N₄O₂，茶和咖啡裡都有。它有兩個併在一起的環，環上有氮，還有兩個碳氧雙鍵；適量會讓人比較清醒。",
    "#7c2d12",
    caffeine(),
  ),
];

const byId = new Map(molecules.map((item) => [item.id, item]));

export function getMolecule(id: string): Molecule {
  return byId.get(id) ?? molecules[0];
}

export function moleculeExtent(item: Molecule): number {
  let max = 0.8;
  for (const atomItem of item.atoms) {
    const reach =
      Math.hypot(atomItem.position[0], atomItem.position[1], atomItem.position[2]) +
      ELEMENTS[atomItem.element].radius;
    if (reach > max) max = reach;
  }
  return max;
}
