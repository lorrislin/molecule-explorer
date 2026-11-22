import {
  buckminsterfullerene,
  diamondFragment,
  grapheneSheet,
  graphiteFragment,
  nanotubeSegment,
} from "@/lib/carbon";
import { dipoleTowardNegative } from "@/lib/polarity";
import {
  add,
  centroid,
  chairRing,
  place,
  scale,
  sub,
  tetrahedralPair,
  type Vec3,
} from "@/lib/math";
import type { Atom, AtomCharge, Bond, CategoryId, ElementId, Molecule } from "@/lib/types";

const TETRA = (Math.acos(-1 / 3) * 180) / Math.PI;

type Spec = {
  id: string;
  name: string;
  formula: string;
  blurb: string;
  polarityNote: string;
  accent: string;
  categories: CategoryId[];
  keywords: string[];
  atoms: Atom[];
  bonds: Bond[];
};

function partial(value: number, caption?: string, size: AtomCharge["size"] = "normal"): AtomCharge {
  return { value, label: value < 0 ? "δ−" : "δ+", caption, kind: "partial", size };
}

function ionic(value: number, label: string, caption: string, size: AtomCharge["size"] = "normal"): AtomCharge {
  return { value, label, caption, kind: "ionic", size };
}

function at(
  id: string,
  element: ElementId,
  position: Vec3,
  fact: string,
  role?: string,
  charge?: AtomCharge,
): Atom {
  const text = fact.length > 12 ? fact : `${fact} 點它可以看出它在這個結構裡的角色。`;
  return { id, element, position, fact: text, role, charge };
}

function bond(a: string, b: string, order: Bond["order"] = 1, kind: Bond["kind"] = "covalent"): Bond {
  return { a, b, order, kind };
}

function finalize(spec: Spec): Molecule {
  const origin = centroid(spec.atoms.map((atom) => atom.position));
  const atoms = spec.atoms.map((atom) => ({
    ...atom,
    position: sub(atom.position, origin),
    fact: atom.fact.length > 12 ? atom.fact : `${atom.fact} 點它可以看出它在這個結構裡的角色。`,
  }));
  const hasPartial = atoms.some((atom) => atom.charge?.kind === "partial");
  return { ...spec, atoms, dipole: hasPartial ? dipoleTowardNegative(atoms) : null };
}

function sphere(
  element: ElementId,
  fact: string,
  role: string,
  charge?: AtomCharge,
): { atoms: Atom[]; bonds: Bond[] } {
  return { atoms: [at("A", element, [0, 0, 0], fact, role, charge)], bonds: [] };
}

function pair(
  a: ElementId,
  b: ElementId,
  length: number,
  order: Bond["order"],
  factA: string,
  factB: string,
  chargeA?: AtomCharge,
  chargeB?: AtomCharge,
  kind: Bond["kind"] = "covalent",
): { atoms: Atom[]; bonds: Bond[] } {
  const half = length / 2;
  return {
    atoms: [
      at("A", a, [-half, 0, 0], factA, undefined, chargeA),
      at("B", b, [half, 0, 0], factB, undefined, chargeB),
    ],
    bonds: [bond("A", "B", order, kind)],
  };
}

const tetraDirs: Vec3[] = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
].map((dir) => {
  const len = Math.hypot(dir[0], dir[1], dir[2]);
  return [dir[0] / len, dir[1] / len, dir[2] / len];
});

function ax4(center: ElementId, ligand: ElementId, length: number, order: Bond["order"] = 1): { atoms: Atom[]; bonds: Bond[] } {
  const atoms = [
    at("C", center, [0, 0, 0], "中心原子用四根鍵朝向四面體的四個角。", "中心原子"),
    ...tetraDirs.map((dir, index) =>
      at(`L${index + 1}`, ligand, [dir[0] * length, dir[1] * length, dir[2] * length], "這顆原子接在四面體的一個角上。", "外圍原子"),
    ),
  ];
  return { atoms, bonds: atoms.slice(1).map((atom) => bond("C", atom.id, order)) };
}

function ax3planar(center: ElementId, ligand: ElementId, length: number): { atoms: Atom[]; bonds: Bond[] } {
  const atoms = [at("C", center, [0, 0, 0], "中心原子和三個原子排在同一個平面上，鍵角約 120°。", "中心原子")];
  const bonds: Bond[] = [];
  for (let i = 0; i < 3; i += 1) {
    const angle = (i * 120 * Math.PI) / 180;
    const id = `L${i + 1}`;
    atoms.push(at(id, ligand, [Math.cos(angle) * length, Math.sin(angle) * length, 0], "外圍原子和中心排成平面三角形。", "外圍原子"));
    bonds.push(bond("C", id));
  }
  return { atoms, bonds };
}

function bent(center: ElementId, ligand: ElementId, length: number, angleDeg: number): { atoms: Atom[]; bonds: Bond[] } {
  const half = (angleDeg * Math.PI) / 360;
  return {
    atoms: [
      at("C", center, [0, 0, 0], "中間這個原子把兩邊撐出一個角度，所以不是直線。", "中心原子"),
      at("L1", ligand, [Math.sin(half) * length, Math.cos(half) * length, 0], "外圍原子。", "外圍原子"),
      at("L2", ligand, [-Math.sin(half) * length, Math.cos(half) * length, 0], "外圍原子。", "外圍原子"),
    ],
    bonds: [bond("C", "L1"), bond("C", "L2")],
  };
}

const ELEMENT_FACTS: Array<{
  element: ElementId;
  z: number;
  shells: string;
  blurb: string;
  keywords: string[];
  accent: string;
}> = [
  { element: "H", z: 1, shells: "1", blurb: "氫是最輕的元素，原子序 1。宇宙裡的恆星大多靠氫在發光，水裡也一定有它。", keywords: ["hydrogen"], accent: "#64748b" },
  { element: "He", z: 2, shells: "2", blurb: "氦是惰性氣體，原子序 2，最外層已經滿了，很不愛反應。派對氣球裡裝的就是它。", keywords: ["helium", "氣球"], accent: "#0891b2" },
  { element: "C", z: 6, shells: "2, 4", blurb: "碳的原子序是 6，最外層有 4 個電子，所以常常形成四根鍵。鑽石、鉛筆芯和我們的身體都靠碳。", keywords: ["carbon"], accent: "#334155" },
  { element: "N", z: 7, shells: "2, 5", blurb: "氮的原子序是 7，最外層 5 個電子。空氣裡大約五分之四是氮氣。", keywords: ["nitrogen"], accent: "#3730a3" },
  { element: "O", z: 8, shells: "2, 6", blurb: "氧的原子序是 8，最外層 6 個電子。呼吸、燃燒和生鏽都跟氧有關。", keywords: ["oxygen"], accent: "#dc2626" },
  { element: "Na", z: 11, shells: "2, 8, 1", blurb: "鈉的原子序是 11，最外層只有 1 個電子，很容易失去，變成 Na⁺。它軟軟的，要泡在油裡。", keywords: ["sodium"], accent: "#7c3aed" },
  { element: "Mg", z: 12, shells: "2, 8, 2", blurb: "鎂的原子序是 12，最外層 2 個電子。燃燒鎂帶會發出很亮的白光，也是葉綠素裡的金屬。", keywords: ["magnesium"], accent: "#65a30d" },
  { element: "Al", z: 13, shells: "2, 8, 3", blurb: "鋁的原子序是 13，又輕又會形成氧化膜保護自己。鋁箔、鋁罐都是它。", keywords: ["aluminum", "aluminium"], accent: "#78716c" },
  { element: "S", z: 16, shells: "2, 8, 6", blurb: "硫是黃色固體，原子序 16。溫泉、火柴和硫酸裡都有硫。", keywords: ["sulfur", "sulphur"], accent: "#ca8a04" },
  { element: "Cl", z: 17, shells: "2, 8, 7", blurb: "氯的原子序是 17，最外層 7 個電子，很想再抓 1 個變成 Cl⁻。漂白水和食鹽都跟氯有關。", keywords: ["chlorine"], accent: "#16a34a" },
  { element: "K", z: 19, shells: "2, 8, 8, 1", blurb: "鉀的原子序是 19，最外層 1 個電子，比鈉更活潑。香蕉和肥料裡都有鉀。", keywords: ["potassium"], accent: "#6d28d9" },
  { element: "Ca", z: 20, shells: "2, 8, 8, 2", blurb: "鈣的原子序是 20。骨骼、牙齒、石灰石和貝殼都含大量的鈣。", keywords: ["calcium"], accent: "#059669" },
  { element: "Fe", z: 26, shells: "2, 8, 14, 2", blurb: "鐵的原子序是 26，是最常用的金屬。生鏽就是鐵和氧、水慢慢反應。", keywords: ["iron"], accent: "#c2410c" },
  { element: "Cu", z: 29, shells: "2, 8, 18, 1", blurb: "銅的原子序是 29，紅棕色，很會導電。電線和藍色的硫酸銅都跟銅有關。", keywords: ["copper"], accent: "#b45309" },
];

function elementModels(): Molecule[] {
  return ELEMENT_FACTS.map((item) =>
    finalize({
      id: `atom-${item.element.toLowerCase()}`,
      name: `${elementName(item.element)}原子`,
      formula: item.element,
      blurb: `${item.blurb} 電子由內到外大約是 ${item.shells}。`,
      polarityNote: "這是單一原子，還沒有跟別的原子鍵結，所以沒有分子偶極。",
      accent: item.accent,
      categories: ["elements"],
      keywords: item.keywords,
      ...sphere(item.element, `原子序 ${item.z}，電子排布大約是 ${item.shells}。`, "單一原子"),
    }),
  );
}

function elementName(element: ElementId): string {
  const names: Record<ElementId, string> = {
    H: "氫",
    He: "氦",
    C: "碳",
    N: "氮",
    O: "氧",
    Na: "鈉",
    Mg: "鎂",
    Al: "鋁",
    S: "硫",
    Cl: "氯",
    K: "鉀",
    Ca: "鈣",
    Fe: "鐵",
    Cu: "銅",
  };
  return names[element];
}

function monoIon(
  id: string,
  name: string,
  formula: string,
  element: ElementId,
  charge: number,
  label: string,
  blurb: string,
  keywords: string[],
  accent: string,
): Molecule {
  const caption = charge > 0 ? "陽離子" : "陰離子";
  const gained = charge < 0;
  return finalize({
    id,
    name,
    formula,
    blurb,
    polarityNote: gained
      ? `這顆原子得到電子，變成帶負電的陰離子，標成 ${label}。`
      : `這顆原子失去電子，變成帶正電的陽離子，標成 ${label}。`,
    accent,
    categories: ["ions"],
    keywords,
    ...sphere(element, gained ? "得到電子後，電子數比質子多，所以帶負電。" : "失去電子後，質子數比電子多，所以帶正電。", caption, ionic(charge, label, caption)),
  });
}

function alkanes(): Molecule[] {
  const ref: Vec3 = [0, 1, 0];
  const c1: Vec3 = [0, 0, 0];
  const c2: Vec3 = [1.53, 0, 0];
  const methyl = (id: string, carbon: Vec3, anchor: Vec3, phase: number) =>
    [0, 1, 2].map((index) => {
      const hid = `${id}h${index + 1}`;
      return {
        atom: at(hid, "H", place(carbon, anchor, ref, 1.09, TETRA, phase + index * 120), "烷類的氫用單鍵連在碳上。", "連在碳上的氫"),
        bond: bond(id, hid),
      };
    });

  const ethaneH = [...methyl("C1", c1, c2, 0), ...methyl("C2", c2, c1, 60)];
  const ethane = finalize({
    id: "ethane",
    name: "乙烷",
    formula: "C2H6",
    blurb: "乙烷是兩個碳以單鍵相連的烷類，天然氣裡也有一點。碳和碳可以自由旋轉，圖中畫的是交錯構形。",
    polarityNote: "碳和氫的電負度差很小，分子又對稱，乙烷是非極性分子。",
    accent: "#0f766e",
    categories: ["organic"],
    keywords: ["ethane"],
    atoms: [
      at("C1", "C", c1, "這個碳連著另一個碳和三個氫。", "甲基的碳"),
      at("C2", "C", c2, "這個碳連著另一個碳和三個氫。", "甲基的碳"),
      ...ethaneH.map((item) => item.atom),
    ],
    bonds: [bond("C1", "C2"), ...ethaneH.map((item) => item.bond)],
  });

  const c3 = place(c2, c1, ref, 1.53, 112, 180);
  const propaneH = [
    ...methyl("C1", c1, c2, 0),
    ...[0, 1].map((index) => {
      const id = `C2h${index + 1}`;
      return {
        atom: at(id, "H", place(c2, c1, c3, 1.09, TETRA, 60 + index * 120), "中間這個碳只連兩個氫。", "亞甲基的氫"),
        bond: bond("C2", id),
      };
    }),
    ...methyl("C3", c3, c2, 0),
  ];
  const propane = finalize({
    id: "propane",
    name: "丙烷",
    formula: "C3H8",
    blurb: "丙烷有三個碳排成一條鋸齒，家庭瓦斯桶裡主要就是丙烷和丁烷。它很容易液化，也很容易燃燒。",
    polarityNote: "三個碳的鍵幾乎對稱，碳氫電負度差又小，丙烷算是非極性分子。",
    accent: "#047857",
    categories: ["organic", "everyday"],
    keywords: ["propane", "瓦斯", "桶裝瓦斯"],
    atoms: [
      at("C1", "C", c1, "鏈端的碳，連著三個氫。", "甲基的碳"),
      at("C2", "C", c2, "中間的碳，連著兩個碳和兩個氫。", "亞甲基的碳"),
      at("C3", "C", c3, "另一端的碳。", "甲基的碳"),
      ...propaneH.map((item) => item.atom),
    ],
    bonds: [bond("C1", "C2"), bond("C2", "C3"), ...propaneH.map((item) => item.bond)],
  });

  return [ethane, propane];
}

function etheneAndEthyne(): Molecule[] {
  const c1: Vec3 = [0, 0, 0];
  const c2: Vec3 = [1.34, 0, 0];
  const theta = (121.5 * Math.PI) / 180;
  const hOn = (carbon: Vec3, direction: number, up: number, id: string, carbonId: string): { atom: Atom; bond: Bond } => {
    const x = direction * Math.cos(theta) * 1.08;
    const y = up * Math.sin(theta) * 1.08;
    return {
      atom: at(id, "H", [carbon[0] + x, carbon[1] + y, 0], "雙鍵碳上的氫和碳排在同一個平面。", "連在雙鍵碳上的氫"),
      bond: bond(carbonId, id),
    };
  };
  const etheneH = [hOn(c1, 1, 1, "H1", "C1"), hOn(c1, 1, -1, "H2", "C1"), hOn(c2, -1, 1, "H3", "C2"), hOn(c2, -1, -1, "H4", "C2")];
  const ethene = finalize({
    id: "ethene",
    name: "乙烯",
    formula: "C2H4",
    blurb: "乙烯是最簡單的烯類，兩個碳用雙鍵拉在一起，六個原子排在同一個平面。水果成熟時會放出乙烯。",
    polarityNote: "雙鍵兩邊對稱，偶極抵消，乙烯是非極性分子。",
    accent: "#0e7490",
    categories: ["organic"],
    keywords: ["ethene", "ethylene"],
    atoms: [
      at("C1", "C", c1, "這個碳用雙鍵連著另一個碳，再連兩個氫。", "雙鍵碳"),
      at("C2", "C", c2, "雙鍵不能隨便旋轉，所以乙烯是平面的。", "雙鍵碳"),
      ...etheneH.map((item) => item.atom),
    ],
    bonds: [bond("C1", "C2", 2), ...etheneH.map((item) => item.bond)],
  });

  const ethyne = finalize({
    id: "ethyne",
    name: "乙炔",
    formula: "C2H2",
    blurb: "乙炔是最簡單的炔類，兩個碳用三鍵連成一條直線。焊接金屬的氧乙炔焰就用它，火溫非常高。",
    polarityNote: "三鍵兩邊都是氫，分子對稱，乙炔是非極性分子。",
    accent: "#155e75",
    categories: ["organic"],
    keywords: ["ethyne", "acetylene", "電石氣"],
    atoms: [
      at("H1", "H", [-1.66, 0, 0], "氫和碳排在同一條直線上。", "連在三鍵碳上的氫"),
      at("C1", "C", [-0.6, 0, 0], "這個碳用三鍵抓住另一個碳。", "三鍵碳"),
      at("C2", "C", [0.6, 0, 0], "三鍵又短又強。", "三鍵碳"),
      at("H2", "H", [1.66, 0, 0], "另一端的氫。", "連在三鍵碳上的氫"),
    ],
    bonds: [bond("H1", "C1"), bond("C1", "C2", 3), bond("C2", "H2")],
  });
  return [ethene, ethyne];
}

function methanolAndAcid(): Molecule[] {
  const ref: Vec3 = [0, 1, 0];
  const carbon: Vec3 = [0, 0, 0];
  const oxygen = place(carbon, [1, 0, 0], ref, 1.43, TETRA, 0);
  const hydroxy = place(oxygen, carbon, [1, 0, 0], 0.96, 108.5, 180);
  const methylH = [0, 1, 2].map((index) =>
    at(`H${index + 1}`, "H", place(carbon, oxygen, ref, 1.09, TETRA, 60 + index * 120), "甲基上的氫。", "連在碳上的氫"),
  );
  const methanol = finalize({
    id: "methanol",
    name: "甲醇",
    formula: "CH3OH",
    blurb: "甲醇是最簡單的醇，只有一個碳接上羥基。它有毒，不能當酒喝，工業上拿來當溶劑和燃料。",
    polarityNote: "甲醇是極性分子，羥基的氧是 δ−，連在氧上的氫是 δ+。",
    accent: "#c2410c",
    categories: ["organic"],
    keywords: ["methanol", "木精"],
    atoms: [
      at("C", "C", carbon, "這個碳連著三個氫和羥基。", "甲基的碳", partial(0.12, undefined, "small")),
      at("O", "O", oxygen, "羥基上的氧把電子拉向自己。", "羥基上的氧", partial(-0.55, "部分負電")),
      at("Ho", "H", hydroxy, "這個氫連在氧上，是醇類的特徵。", "羥基上的氫", partial(0.42, "部分正電")),
      ...methylH,
    ],
    bonds: [bond("C", "O"), bond("O", "Ho"), ...methylH.map((atom) => bond("C", atom.id))],
  });

  const methyl: Vec3 = [0, 0, 0];
  const carboxyl: Vec3 = [1.5, 0, 0];
  const carbonyl = place(carboxyl, methyl, ref, 1.21, 120, 0);
  const hydroxyO = place(carboxyl, methyl, ref, 1.36, 120, 180);
  const hydroxyH = place(hydroxyO, carboxyl, methyl, 0.97, 106, 180);
  const acidH = [0, 1, 2].map((index) =>
    at(`Hm${index + 1}`, "H", place(methyl, carboxyl, ref, 1.09, TETRA, 60 + index * 120), "甲基上的氫比較不活潑。", "甲基上的氫"),
  );
  const acetic = finalize({
    id: "acetic",
    name: "乙酸",
    formula: "CH3COOH",
    blurb: "乙酸就是醋酸，食醋裡大約有 3% 到 5%。羧基（-COOH）讓它帶酸味，也能讓藍色石蕊試紙變紅。",
    polarityNote: "乙酸是極性分子。羰基和羥基的氧是 δ−，羥基上的氫是 δ+，這個氫在水裡比較容易放出來。",
    accent: "#b45309",
    categories: ["organic", "acid", "everyday"],
    keywords: ["acetic acid", "醋酸", "醋", "乙酸"],
    atoms: [
      at("Cm", "C", methyl, "甲基碳，連著羧基。", "甲基的碳"),
      at("Cc", "C", carboxyl, "羧基的碳，一邊雙鍵接氧，一邊接羥基。", "羧基的碳", partial(0.4, "部分正電", "small")),
      at("Od", "O", carbonyl, "這個氧以雙鍵連著碳。", "羰基上的氧", partial(-0.45, "部分負電", "small")),
      at("Oh", "O", hydroxyO, "羥基上的氧。", "羥基上的氧", partial(-0.5, "部分負電", "small")),
      at("Ho", "H", hydroxyH, "醋酸裡比較容易變成 H⁺ 的就是這個氫。", "羧基上的氫", partial(0.4, "部分正電", "small")),
      ...acidH,
    ],
    bonds: [bond("Cm", "Cc"), bond("Cc", "Od", 2), bond("Cc", "Oh"), bond("Oh", "Ho"), ...acidH.map((atom) => bond("Cm", atom.id))],
  });
  return [methanol, acetic];
}

function acidsAndBases(): Molecule[] {
  const peroxide = (() => {
    const o1: Vec3 = [0, 0, 0];
    const o2: Vec3 = [1.47, 0, 0];
    const h1 = place(o1, o2, [0, 1, 0], 0.97, 100, 0);
    const h2 = place(o2, o1, [0, 1, 0], 0.97, 100, 120);
    return finalize({
      id: "peroxide",
      name: "雙氧水",
      formula: "H2O2",
      blurb: "雙氧水是過氧化氫的水溶液。傷口消毒、漂白頭髮都會用到它，放久了會慢慢分解成水和氧氣。",
      polarityNote: "兩個氧略帶 δ−，氫是 δ+。分子像一本打開的書，不是平面，所以偶極沒有抵消，是極性分子。",
      accent: "#0284c7",
      categories: ["everyday"],
      keywords: ["hydrogen peroxide", "過氧化氫", "雙氧水"],
      atoms: [
        at("O1", "O", o1, "過氧化氫的氧和另一個氧以單鍵相連。", "過氧鍵上的氧", partial(-0.35, "部分負電", "small")),
        at("O2", "O", o2, "另一個氧。", "過氧鍵上的氧", partial(-0.35, "部分負電", "small")),
        at("H1", "H", h1, "氫連在氧上。", "連在氧上的氫", partial(0.35, "部分正電", "small")),
        at("H2", "H", h2, "另一端的氫，跟第一個氫不在同一個平面。", "連在氧上的氫", partial(0.35, "部分正電", "small")),
      ],
      bonds: [bond("O1", "O2"), bond("O1", "H1"), bond("O2", "H2")],
    });
  })();

  const ozoneShape = bent("O", "O", 1.28, 117);
  const ozone = finalize({
    id: "ozone",
    name: "臭氧",
    formula: "O3",
    blurb: "臭氧是三個氧排成彎曲形狀的分子。高空的臭氧層擋住大部分紫外線，地面附近的臭氧卻會刺激呼吸道。",
    polarityNote: "臭氧是極性分子。中間的氧比較正，兩端的氧比較負，彎曲的形狀讓偶極留了下來。",
    accent: "#0369a1",
    categories: ["everyday"],
    keywords: ["ozone", "臭氧層"],
    atoms: [
      { ...ozoneShape.atoms[0], charge: partial(0.3, "部分正電", "small"), fact: "中間的氧同時拉著兩個氧。" },
      { ...ozoneShape.atoms[1], charge: partial(-0.15, "部分負電", "small") },
      { ...ozoneShape.atoms[2], charge: partial(-0.15, "部分負電", "small") },
    ],
    bonds: ozoneShape.bonds,
  });

  const sulfuricBase = ax4("S", "O", 1.5);
  const sulfuricAtoms = sulfuricBase.atoms.map((atom, index) => {
    if (atom.id === "C") return { ...atom, fact: "硫在正中間，四根鍵朝向四面體。", role: "中心的硫", charge: partial(0.4, "部分正電", "small") };
    if (index <= 2) return { ...atom, fact: "這個氧以雙鍵連著硫。", role: "雙鍵上的氧", charge: partial(-0.4, "部分負電", "small") };
    return { ...atom, fact: "這個氧屬於羥基，還連著氫。", role: "羥基上的氧", charge: partial(-0.45, "部分負電", "small") };
  });
  const sulfuricBonds = sulfuricBase.bonds.map((item, index) => ({ ...item, order: index < 2 ? 2 : 1 }) as Bond);
  const hydroxyH = sulfuricAtoms.slice(3).map((atom, index) => {
    const id = `H${index + 1}`;
    return {
      atom: at(id, "H", place(atom.position, [0, 0, 0], [0, 1, 0], 0.97, 108, 40 + index * 80), "硫酸裡這兩個氫在水中很容易放出來。", "酸性的氫", partial(0.4, "部分正電", "small")),
      bond: bond(atom.id, id),
    };
  });
  const sulfuric = finalize({
    id: "sulfuric",
    name: "硫酸",
    formula: "H2SO4",
    blurb: "硫酸是常見的強酸，乾燥劑和蓄電池裡都有它。稀釋時要把酸慢慢加進水裡，不能把水倒進濃硫酸。",
    polarityNote: "硫和氧的電負度差很大，氧是 δ−、跟氧相連的氫是 δ+。硫酸是極性很強的分子，在水裡會放出 H⁺。",
    accent: "#a16207",
    categories: ["acid"],
    keywords: ["sulfuric acid", "硫酸"],
    atoms: [...sulfuricAtoms, ...hydroxyH.map((item) => item.atom)],
    bonds: [...sulfuricBonds, ...hydroxyH.map((item) => item.bond)],
  });

  const nitricBase = ax3planar("N", "O", 1.24);
  const nitricAtoms = nitricBase.atoms.map((atom, index) => {
    if (atom.id === "C") return { ...atom, element: "N" as const, fact: "氮在中間，三個氧大約排在一個平面。", charge: partial(0.35, "部分正電", "small") };
    if (index === 1) return { ...atom, fact: "這個氧還連著氫，是硝酸的羥基。", role: "羥基上的氧", charge: partial(-0.4, "部分負電", "small") };
    return { ...atom, fact: "這個氧和氮的鍵介在單鍵和雙鍵之間。", role: "接在氮上的氧", charge: partial(-0.3, "部分負電", "small") };
  });
  const nitricH = at(
    "H",
    "H",
    place(nitricAtoms[1].position, [0, 0, 0], [0, 0, 1], 0.98, 104, 0),
    "這個氫讓硝酸在水裡很容易產生 H⁺。",
    "酸性的氫",
    partial(0.4, "部分正電", "small"),
  );
  const nitric = finalize({
    id: "nitric",
    name: "硝酸",
    formula: "HNO3",
    blurb: "硝酸是強酸，會腐蝕很多金屬，也用來做肥料和火藥。純硝酸碰到光或熱會分解，所以常裝在棕色瓶裡。",
    polarityNote: "硝酸是極性分子。氧比氮、氫更容易拉電子，所以氧是 δ−，羥基上的氫是 δ+。",
    accent: "#1d4ed8",
    categories: ["acid"],
    keywords: ["nitric acid", "硝酸"],
    atoms: [...nitricAtoms, nitricH],
    bonds: [...nitricBase.bonds.map((item, index) => ({ ...item, order: index === 0 ? 1 : 2 }) as Bond), bond("L1", "H")],
  });

  const carbonicBase = ax3planar("C", "O", 1.28);
  const carbonicAtoms = carbonicBase.atoms.map((atom, index) => {
    if (atom.id === "C") return { ...atom, fact: "碳酸的碳在中間。", charge: partial(0.4, "部分正電", "small") };
    if (index === 1) return { ...atom, fact: "這個氧以雙鍵連著碳。", role: "羰基上的氧", charge: partial(-0.4, "部分負電", "small") };
    return { ...atom, fact: "這個氧屬於羥基。", role: "羥基上的氧", charge: partial(-0.4, "部分負電", "small") };
  });
  const carbonicH = carbonicAtoms.slice(2).map((atom, index) => {
    const id = `H${index + 1}`;
    return {
      atom: at(id, "H", place(atom.position, [0, 0, 0], [0, 0, 1], 0.97, 106, index * 40), "碳酸的氫。", "羥基上的氫", partial(0.35, "部分正電", "small")),
      bond: bond(atom.id, id),
    };
  });
  const carbonic = finalize({
    id: "carbonic",
    name: "碳酸",
    formula: "H2CO3",
    blurb: "二氧化碳溶進水裡會生成一點碳酸，汽水的酸味就是這樣來的。碳酸不穩定，瓶蓋一開就分解回二氧化碳和水。",
    polarityNote: "碳酸是極性的弱酸。氧是 δ−，羥基上的氫是 δ+，但沒有硫酸那麼容易把氫送出去。",
    accent: "#0f766e",
    categories: ["acid", "everyday"],
    keywords: ["carbonic acid", "碳酸", "汽水"],
    atoms: [...carbonicAtoms, ...carbonicH.map((item) => item.atom)],
    bonds: [bond("C", "L1", 2), bond("C", "L2"), bond("C", "L3"), ...carbonicH.map((item) => item.bond)],
  });

  const oh: Vec3 = [0, 0, 0];
  const hh = place(oh, [1, 0, 0], [0, 1, 0], 0.96, 180, 0);
  const naoh = finalize({
    id: "naoh",
    name: "氫氧化鈉",
    formula: "NaOH",
    blurb: "氫氧化鈉又叫苛性鈉或燒鹼，是常見的強鹼。肥皂工廠和水管清潔劑都會用到，碰到皮膚要立刻用水沖。",
    polarityNote: "固態主要是 Na⁺ 和 OH⁻。氫氧根裡氧比氫負，整顆 OH⁻ 帶一個負電，不是只有一點點 δ。",
    accent: "#7c3aed",
    categories: ["acid"],
    keywords: ["sodium hydroxide", "naoh", "燒鹼", "苛性鈉", "氫氧", "OH"],
    atoms: [
      at("Na", "Na", [-2.1, 0, 0], "鈉把電子給了氫氧根，自己變成 Na⁺。", "鈉離子", ionic(1, "Na⁺", "陽離子", "small")),
      at("O", "O", oh, "氧和氫以共價鍵結合成氫氧根。", "氫氧根的氧", ionic(-1, "OH⁻", "陰離子", "small")),
      at("H", "H", hh, "氫氧根裡的氫。", "氫氧根的氫"),
    ],
    bonds: [bond("Na", "O", 1, "ionic"), bond("O", "H")],
  });

  const caoh = finalize({
    id: "caoh2",
    name: "氫氧化鈣",
    formula: "Ca(OH)2",
    blurb: "氫氧化鈣溶在水裡就是石灰水。把嘴巴吹出的二氧化碳通進去，澄清石灰水會變混濁，這是國中常見的實驗。",
    polarityNote: "它是 Ca²⁺ 和兩個 OH⁻ 組成的離子化合物。氫氧根帶負電，鈣離子帶兩個正電。",
    accent: "#059669",
    categories: ["acid"],
    keywords: ["calcium hydroxide", "石灰水", "熟石灰", "氫氧", "OH"],
    atoms: [
      at("Ca", "Ca", [0, 0, 0], "鈣失去兩個電子，變成 Ca²⁺。", "鈣離子", ionic(2, "Ca²⁺", "陽離子", "small")),
      at("O1", "O", [-2.2, 0, 0], "左邊的氫氧根。", "氫氧根的氧", ionic(-1, "OH⁻", "陰離子", "small")),
      at("H1", "H", [-3.16, 0, 0], "氫氧根上的氫。", "氫氧根的氫"),
      at("O2", "O", [2.2, 0, 0], "右邊的氫氧根。", "氫氧根的氧", ionic(-1, "OH⁻", "陰離子", "small")),
      at("H2", "H", [3.16, 0, 0], "氫氧根上的氫。", "氫氧根的氫"),
    ],
    bonds: [bond("Ca", "O1", 1, "ionic"), bond("O1", "H1"), bond("Ca", "O2", 1, "ionic"), bond("O2", "H2")],
  });

  return [peroxide, ozone, sulfuric, nitric, carbonic, naoh, caoh];
}

function polyatomicIons(): Molecule[] {
  const hydroxide = pair(
    "O",
    "H",
    0.96,
    1,
    "氧得到電子的那一端，整個氫氧根帶一個負電。",
    "氫氧根裡的氫。",
    ionic(-1, "OH⁻", "陰離子"),
  );
  const oh = finalize({
    id: "hydroxide",
    name: "氫氧根",
    formula: "OH",
    blurb: "氫氧根是 OH⁻，鹼的水溶液裡都有它。肥皂滑滑的感覺，和能使紅色石蕊試紙變藍，都跟氫氧根有關。",
    polarityNote: "氧比氫更容易拉電子，而且整個離子多了一個電子，所以標成 OH⁻，不是中性的 OH。",
    accent: "#7c3aed",
    categories: ["ions"],
    keywords: ["hydroxide", "氫氧", "OH-"],
    ...hydroxide,
  });

  const ammoniumBase = ax4("N", "H", 1.03);
  const ammonium = finalize({
    id: "ammonium",
    name: "銨根",
    formula: "NH4",
    blurb: "銨根是 NH₄⁺，可以想成氨抓了一個 H⁺。肥料裡的硫酸銨、氯化銨都有它。",
    polarityNote: "氮和四個氫排成四面體。整體少一個電子，所以是帶一個正電的陽離子，不是中性分子。",
    accent: "#6d28d9",
    categories: ["ions"],
    keywords: ["ammonium", "銨", "NH4"],
    atoms: ammoniumBase.atoms.map((atom) =>
      atom.id === "C"
        ? { ...atom, element: "N", fact: "氮在中間，整體因為多了一個質子而帶正電。", charge: ionic(1, "NH₄⁺", "陽離子", "small") }
        : { ...atom, fact: "銨根的四個氫地位相同。" },
    ),
    bonds: ammoniumBase.bonds,
  });

  const sulfateBase = ax4("S", "O", 1.49);
  const sulfate = finalize({
    id: "sulfate",
    name: "硫酸根",
    formula: "SO4",
    blurb: "硫酸根是 SO₄²⁻，硫酸和很多硫酸鹽裡都有它。四個氧圍著硫，形狀是四面體。",
    polarityNote: "硫比氧正一點，但整個離子多了兩個電子，所以標成 SO₄²⁻，不是中性的 SO₄。",
    accent: "#a16207",
    categories: ["ions"],
    keywords: ["sulfate", "硫酸根", "SO4"],
    atoms: sulfateBase.atoms.map((atom) =>
      atom.id === "C"
        ? { ...atom, fact: "硫在四面體中心。", charge: ionic(-2, "SO₄²⁻", "陰離子", "small") }
        : { ...atom, fact: "四個氧一起分掉多出來的負電。", charge: partial(-0.5, undefined, "small") },
    ),
    bonds: sulfateBase.bonds,
  });

  const nitrateBase = ax3planar("N", "O", 1.24);
  const nitrate = finalize({
    id: "nitrate",
    name: "硝酸根",
    formula: "NO3",
    blurb: "硝酸根是 NO₃⁻，三個氧和氮排在同一個平面上。硝酸鉀、硝酸銨這些肥料裡都有它。",
    polarityNote: "三根鍵一樣長，負電平均分在三個氧上。整個離子是 NO₃⁻。",
    accent: "#1d4ed8",
    categories: ["ions"],
    keywords: ["nitrate", "硝酸根", "NO3"],
    atoms: nitrateBase.atoms.map((atom) =>
      atom.id === "C"
        ? { ...atom, element: "N", fact: "氮在平面三角形的中心。", charge: ionic(-1, "NO₃⁻", "陰離子", "small") }
        : { ...atom, fact: "氧上分到一部分負電。", charge: partial(-0.4, undefined, "small") },
    ),
    bonds: nitrateBase.bonds,
  });

  const carbonateBase = ax3planar("C", "O", 1.28);
  const carbonate = finalize({
    id: "carbonate",
    name: "碳酸根",
    formula: "CO3",
    blurb: "碳酸根是 CO₃²⁻。大理石、貝殼和石灰石的主成分碳酸鈣，就是鈣離子加上碳酸根。",
    polarityNote: "三個氧和碳在同一個平面，負電分在氧上。整個離子帶兩個負電，寫成 CO₃²⁻。",
    accent: "#0f766e",
    categories: ["ions"],
    keywords: ["carbonate", "碳酸根", "CO3"],
    atoms: carbonateBase.atoms.map((atom) =>
      atom.id === "C"
        ? { ...atom, fact: "碳在中間。", charge: ionic(-2, "CO₃²⁻", "陰離子", "small") }
        : { ...atom, fact: "氧分到碳酸根的負電。", charge: partial(-0.6, undefined, "small") },
    ),
    bonds: carbonateBase.bonds,
  });

  const bicarbAtoms = carbonateBase.atoms.map((atom) => ({ ...atom }));
  const bicarbH = at(
    "H",
    "H",
    place(bicarbAtoms[1].position, [0, 0, 0], [0, 0, 1], 0.97, 106, 0),
    "這個氫連在其中一個氧上，所以它是碳酸氫根，不是碳酸根。",
    "連在氧上的氫",
  );
  const bicarbonate = finalize({
    id: "bicarbonate",
    name: "碳酸氫根",
    formula: "HCO3",
    blurb: "碳酸氫根是 HCO₃⁻。小蘇打就是碳酸氫鈉，烘焙和胃藥都用得上，受熱會放出二氧化碳。",
    polarityNote: "它比碳酸根多了一個氫，整體只帶一個負電，所以是 HCO₃⁻。氧仍然比氫負。",
    accent: "#0f766e",
    categories: ["ions"],
    keywords: ["bicarbonate", "碳酸氫根", "HCO3"],
    atoms: [
      ...bicarbAtoms.map((atom) =>
        atom.id === "C"
          ? { ...atom, fact: "碳在中間。", charge: ionic(-1, "HCO₃⁻", "陰離子", "small") }
          : { ...atom, charge: partial(-0.4, undefined, "small"), fact: "氧上的電子比較多。" },
      ),
      bicarbH,
    ],
    bonds: [...carbonateBase.bonds, bond("L1", "H")],
  });

  const hydronium = (() => {
    const angle = 113;
    const cosBond = Math.cos((angle * Math.PI) / 180);
    const cosAxisSq = (cosBond + 0.5) / 1.5;
    const cosAxis = Math.sqrt(cosAxisSq);
    const sinAxis = Math.sqrt(1 - cosAxisSq);
    const bondLength = 0.98;
    const atoms = [
      at("O", "O", [0, 0, 0], "氧在錐頂。水合的氫離子其實常以這個樣子存在。", "錐頂的氧", ionic(1, "H₃O⁺", "陽離子", "small")),
    ];
    const bonds: Bond[] = [];
    [0, 120, 240].forEach((deg, index) => {
      const phi = (deg * Math.PI) / 180;
      const id = `H${index + 1}`;
      atoms.push(
        at(
          id,
          "H",
          [bondLength * sinAxis * Math.cos(phi), bondLength * cosAxis, bondLength * sinAxis * Math.sin(phi)],
          "三個氫圍在氧的下方。",
          "連在氧上的氫",
        ),
      );
      bonds.push(bond("O", id));
    });
    return finalize({
      id: "hydronium",
      name: "水合氫離子",
      formula: "H3O",
      blurb: "課本常把酸寫成會放出 H⁺。在水裡，這個質子多半抓著一顆水，變成三角錐形的 H₃O⁺。",
      polarityNote: "整個離子少一個電子，所以帶正電。氧比氫負，但總電荷是 +1，標成 H₃O⁺。",
      accent: "#e11d48",
      categories: ["ions"],
      keywords: ["hydronium", "氫離子", "H+", "H3O"],
      atoms,
      bonds,
    });
  })();

  const proton = finalize({
    id: "proton",
    name: "質子",
    formula: "H",
    blurb: "氫原子失去唯一的電子，就剩下一顆質子，寫成 H⁺。它非常小，在水裡幾乎不會單獨遊走。",
    polarityNote: "H⁺ 沒有電子，電荷是完整的 +1，不是 δ+。酸的定義之一，就是在水裡產生氫離子。",
    accent: "#be123c",
    categories: ["ions"],
    keywords: ["proton", "氫離子", "H+"],
    ...sphere("H", "這是氫的原子核，一顆質子。", "質子", ionic(1, "H⁺", "陽離子")),
  });

  return [proton, hydronium, oh, ammonium, sulfate, nitrate, carbonate, bicarbonate];
}

function salts(): Molecule[] {
  const carbonate = ax3planar("C", "O", 1.28);
  const caco3 = finalize({
    id: "caco3",
    name: "碳酸鈣",
    formula: "CaCO3",
    blurb: "碳酸鈣是大理石、石灰石、粉筆和貝殼的主成分。加鹽酸會冒出二氧化碳氣泡，這是檢驗碳酸鹽的方法。",
    polarityNote: "它是離子化合物，由 Ca²⁺ 和 CO₃²⁻ 組成，不是一個共價的極性分子。",
    accent: "#059669",
    categories: ["acid", "crystal"],
    keywords: ["calcium carbonate", "大理石", "石灰石", "貝殼"],
    atoms: [
      ...carbonate.atoms.map((atom) =>
        atom.id === "C"
          ? { ...atom, fact: "碳酸根的碳。" }
          : { ...atom, fact: "碳酸根的氧。" },
      ),
      at("Ca", "Ca", [0, 0, 2.4], "鈣離子靠靜電吸在碳酸根旁邊。", "鈣離子", ionic(2, "Ca²⁺", "陽離子", "small")),
    ],
    bonds: [...carbonate.bonds, bond("Ca", "C", 1, "ionic")],
  });

  const bicarb = ax3planar("C", "O", 1.28);
  const hPos = place(bicarb.atoms[1].position, [0, 0, 0], [0, 0, 1], 0.97, 106, 0);
  const nahco3 = finalize({
    id: "nahco3",
    name: "碳酸氫鈉",
    formula: "NaHCO3",
    blurb: "碳酸氫鈉就是小蘇打。烘焙時受熱或遇到酸會放出二氧化碳，讓麵團變鬆；也是常見的胃藥成分。",
    polarityNote: "小蘇打是 Na⁺ 和 HCO₃⁻ 排成的離子晶體。圖把一組離子畫在一起，方便看出碳酸氫根的形狀。",
    accent: "#0f766e",
    categories: ["acid", "everyday"],
    keywords: ["sodium bicarbonate", "baking soda", "小蘇打", "NaHCO3"],
    atoms: [
      ...bicarb.atoms,
      at("H", "H", hPos, "這個氫讓它變成碳酸氫根。", "連在氧上的氫"),
      at("Na", "Na", [2.6, 0.4, 0.6], "鈉離子。", "鈉離子", ionic(1, "Na⁺", "陽離子", "small")),
    ],
    bonds: [...bicarb.bonds, bond("L1", "H"), bond("Na", "L2", 1, "ionic")],
  });

  const sulfate = ax4("S", "O", 1.49);
  const cuso4 = finalize({
    id: "cuso4",
    name: "硫酸銅",
    formula: "CuSO4",
    blurb: "無水硫酸銅是白色的，吸了水就變成熟悉的藍色晶體，所以能用來檢驗水。圖是簡化的 Cu²⁺ 和 SO₄²⁻。",
    polarityNote: "硫酸銅是離子化合物。銅失去兩個電子變成 Cu²⁺，硫酸根是 SO₄²⁻，一正一負互相吸引。",
    accent: "#0369a1",
    categories: ["acid"],
    keywords: ["copper sulfate", "硫酸銅", "膽礬", "CuSO4"],
    atoms: [
      ...sulfate.atoms.map((atom) => (atom.id === "C" ? { ...atom, fact: "硫酸根的硫。" } : { ...atom, fact: "硫酸根的氧。" })),
      at("Cu", "Cu", [2.5, 0.8, 0.4], "銅離子。含水的硫酸銅晶體是藍色的。", "銅離子", ionic(2, "Cu²⁺", "陽離子", "small")),
    ],
    bonds: [...sulfate.bonds, bond("Cu", "L1", 1, "ionic")],
  });

  const diatomics = [
    finalize({
      id: "chlorine",
      name: "氯氣",
      formula: "Cl2",
      blurb: "氯氣是兩個氯原子以單鍵組成的黃綠色氣體，有刺激味。自來水消毒和漂白水都跟氯有關。",
      polarityNote: "兩個氯原子相同，電子沒有偏一邊，氯氣是非極性分子。",
      accent: "#16a34a",
      categories: ["diatomic"],
      keywords: ["chlorine gas", "氯氣"],
      ...pair("Cl", "Cl", 1.99, 1, "氯用單鍵和另一個氯共用一對電子。", "另一個氯原子。"),
    }),
    finalize({
      id: "hcl",
      name: "氯化氫",
      formula: "HCl",
      blurb: "氯化氫溶在水裡就是鹽酸，國中常用它和金屬、碳酸鈣做實驗。它會讓藍色石蕊試紙變紅。",
      polarityNote: "氯的電負度比氫大很多，所以氯是 δ−、氫是 δ+。氯化氫是極性分子，在水裡會變成 H⁺ 和 Cl⁻。",
      accent: "#15803d",
      categories: ["diatomic", "acid"],
      keywords: ["hydrogen chloride", "鹽酸", "HCl"],
      ...pair(
        "H",
        "Cl",
        1.27,
        1,
        "氫這一端電子比較少，是 δ+。",
        "氯把共用電子拉向自己，是 δ−。",
        partial(0.45, "部分正電"),
        partial(-0.45, "部分負電"),
      ),
    }),
    finalize({
      id: "co",
      name: "一氧化碳",
      formula: "CO",
      blurb: "一氧化碳是瓦斯或炭燃燒不完全時產生的氣體，沒有顏色也沒有味道，卻會佔住血紅素，所以很危險。",
      polarityNote: "氧比碳容易拉電子，鍵有極性。分子只有兩個原子，偶極不會被另一邊抵消。",
      accent: "#44403c",
      categories: ["diatomic", "everyday"],
      keywords: ["carbon monoxide", "一氧化碳"],
      ...pair(
        "C",
        "O",
        1.13,
        3,
        "碳和氧用三鍵綁在一起。",
        "氧這一端電子比較多。",
        partial(0.2, "部分正電", "small"),
        partial(-0.2, "部分負電", "small"),
      ),
    }),
  ];

  return [...diatomics, caco3, nahco3, cuso4];
}

function sucrose(): Molecule {
  const ring = chairRing(1.52);
  const labels = ["C1", "C2", "C3", "C4", "C5", "O5"] as const;
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const pos = new Map<string, Vec3>();
  labels.forEach((label, index) => pos.set(label, ring[index]));
  labels.forEach((label) => {
    atoms.push(at(label, label === "O5" ? "O" : "C", pos.get(label)!, label === "O5" ? "這個氧在葡萄糖環裡。" : "葡萄糖環上的碳。", "葡萄糖環"));
  });
  ["C1", "C2", "C3", "C4", "C5", "O5", "C1"].forEach((label, index, list) => {
    if (index === 0) return;
    bonds.push(bond(list[index - 1], label));
  });
  const bridge = (() => {
    const [first, second] = tetrahedralPair(pos.get("C1")!, pos.get("O5")!, pos.get("C2")!);
    const equatorial = Math.abs(first[2]) < Math.abs(second[2]) ? first : second;
    return add(pos.get("C1")!, scale(equatorial, 1.42));
  })();
  atoms.push(at("Ob", "O", bridge, "這個氧把葡萄糖和果糖接在一起，叫做糖苷鍵。", "連接兩個環的氧"));
  bonds.push(bond("C1", "Ob"));
  const ringCenter = centroid(ring);
  const away = scale(sub(bridge, ringCenter), 1 / (Math.hypot(...sub(bridge, ringCenter)) || 1));
  const up: Vec3 = Math.abs(away[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  const side = (() => {
    const cross: Vec3 = [
      away[1] * up[2] - away[2] * up[1],
      away[2] * up[0] - away[0] * up[2],
      away[0] * up[1] - away[1] * up[0],
    ];
    const len = Math.hypot(...cross) || 1;
    return scale(cross, 1 / len);
  })();
  const fructoseCenter = add(bridge, scale(away, 2.75));
  const fructoseIds = ["F2", "F3", "F4", "F5", "Of"];
  fructoseIds.forEach((id, index) => {
    const angle = (index * 72 * Math.PI) / 180;
    const point = add(
      fructoseCenter,
      add(scale(away, -Math.cos(angle) * 1.35), scale(side, Math.sin(angle) * 1.35)),
    );
    atoms.push(at(id, id === "Of" ? "O" : "C", point, id === "Of" ? "果糖這顆是環上的氧。" : "果糖環上的碳，和葡萄糖連成蔗糖。", "果糖環"));
  });
  bonds.push(bond("Ob", "F2"));
  ["F2", "F3", "F4", "F5", "Of", "F2"].forEach((id, index, list) => {
    if (index === 0) return;
    bonds.push(bond(list[index - 1], id));
  });
  return finalize({
    id: "sucrose",
    name: "蔗糖",
    formula: "C12H22O11",
    blurb: "蔗糖就是砂糖，由一個葡萄糖環和一個果糖環靠氧接起來。圖把氫省略了，比較看得出兩個環和中間的氧。",
    polarityNote: "蔗糖有很多羥基，是極性分子，所以砂糖會溶在水裡。這張圖只畫出骨架。",
    accent: "#db2777",
    categories: ["everyday"],
    keywords: ["sucrose", "砂糖", "蔗糖"],
    atoms,
    bonds,
  });
}

function carbonModels(): Molecule[] {
  const shared = "同一種元素碳，因為原子連法不同，硬度、顏色和能不能導電都不一樣。";
  const pieces: Array<Spec & { model: { atoms: Atom[]; bonds: Bond[] } }> = [
    {
      id: "diamond",
      name: "鑽石",
      formula: "C",
      blurb: `鑽石裡每個碳和另外四個碳以共價鍵相連，構成立體網狀。${shared} 所以鑽石很硬，而且不導電。`,
      polarityNote: "整塊都是碳，鍵結對稱，沒有偶極。圖是一小塊，中間的碳可以清楚看到四根鍵。",
      accent: "#334155",
      categories: ["carbon", "crystal"],
      keywords: ["diamond", "鑽石"],
      atoms: [],
      bonds: [],
      model: diamondFragment(),
    },
    {
      id: "graphite",
      name: "石墨",
      formula: "C",
      blurb: `石墨每一層是六角碳網，層和層距離約 3.35 Å，比層裡的鍵長很多。${shared} 層容易滑動，所以鉛筆可以寫字，層內的電子也讓石墨能導電。`,
      polarityNote: "層內每個碳連三個碳，層與層之間沒有那種強的共價鍵。沒有正負兩端，不是極性分子。",
      accent: "#3f3f46",
      categories: ["carbon", "crystal"],
      keywords: ["graphite", "石墨", "鉛筆"],
      atoms: [],
      bonds: [],
      model: graphiteFragment(),
    },
    {
      id: "graphene",
      name: "石墨烯",
      formula: "C",
      blurb: "石墨烯就是單獨一層的石墨。每個碳連三個碳，剩下的電子可以在平面上移動，所以它又薄又會導電。",
      polarityNote: "整片都是碳，六角網對稱，沒有分子偶極。和鑽石相比，這裡的碳只連三個鄰居，不是四個。",
      accent: "#52525b",
      categories: ["carbon"],
      keywords: ["graphene", "石墨烯"],
      atoms: [],
      bonds: [],
      model: grapheneSheet(),
    },
    {
      id: "c60",
      name: "足球烯",
      formula: "C60",
      blurb: "足球烯又叫巴克球，60 個碳包成球：12 個五邊形和 20 個六邊形。每個碳還是只連三個碳。",
      polarityNote: "球很對稱，沒有特別正或特別負的一端，所以 C60 是非極性的。",
      accent: "#44403c",
      categories: ["carbon"],
      keywords: ["fullerene", "buckminsterfullerene", "buckyball", "C60", "巴克球"],
      atoms: [],
      bonds: [],
      model: buckminsterfullerene(),
    },
    {
      id: "nanotube",
      name: "奈米碳管",
      formula: "C",
      blurb: "奈米碳管可以想成捲成管子的石墨烯。碳仍然連三個碳，管子很輕、很強，也可以導電。圖是短短的一段。",
      polarityNote: "這一段管子由相同的碳組成，沒有明顯的正負兩端。",
      accent: "#57534e",
      categories: ["carbon"],
      keywords: ["nanotube", "carbon nanotube", "奈米碳管"],
      atoms: [],
      bonds: [],
      model: nanotubeSegment(),
    },
  ];
  return pieces.map((piece) =>
    finalize({
      ...piece,
      atoms: piece.model.atoms,
      bonds: piece.model.bonds,
    }),
  );
}

function cations(): Molecule[] {
  return [
    monoIon("ion-na", "鈉離子", "Na", "Na", 1, "Na⁺", "鈉原子失去最外層 1 個電子就變成 Na⁺。食鹽、小蘇打裡的鈉都是這個離子。", ["sodium ion", "鈉離子"], "#7c3aed"),
    monoIon("ion-k", "鉀離子", "K", "K", 1, "K⁺", "鉀失去 1 個電子變成 K⁺。植物肥料和我們的神經傳導都需要鉀離子。", ["potassium ion", "鉀離子"], "#6d28d9"),
    monoIon("ion-ca", "鈣離子", "Ca", "Ca", 2, "Ca²⁺", "鈣失去 2 個電子變成 Ca²⁺。硬水和石灰水裡都有鈣離子。", ["calcium ion", "鈣離子"], "#059669"),
    monoIon("ion-mg", "鎂離子", "Mg", "Mg", 2, "Mg²⁺", "鎂失去 2 個電子變成 Mg²⁺。葉綠素和一些胃藥裡有鎂。", ["magnesium ion", "鎂離子"], "#65a30d"),
    monoIon("ion-cu", "銅離子", "Cu", "Cu", 2, "Cu²⁺", "銅失去 2 個電子常變成 Cu²⁺。硫酸銅溶液的藍色就是水合銅離子的顏色。", ["copper ion", "銅離子"], "#b45309"),
    monoIon("ion-fe", "鐵離子", "Fe", "Fe", 3, "Fe³⁺", "鐵可以失去 3 個電子變成 Fe³⁺。鐵鏽裡就有這種鐵，碰到硫氰化鉀會變血紅，是常見的鑑定。", ["iron ion", "鐵離子", "Fe3+"], "#c2410c"),
    monoIon("ion-cl", "氯離子", "Cl", "Cl", -1, "Cl⁻", "氯原子再得到 1 個電子，外層就滿了，變成 Cl⁻。食鹽和鹽酸在水裡都會放出氯離子。", ["chloride", "氯離子"], "#16a34a"),
  ];
}

export const extraMolecules: Molecule[] = [
  ...elementModels(),
  ...alkanes(),
  ...etheneAndEthyne(),
  ...methanolAndAcid(),
  ...acidsAndBases(),
  ...polyatomicIons(),
  ...salts(),
  ...cations(),
  sucrose(),
  ...carbonModels(),
];

export const CATEGORIES: Array<{ id: "all" | CategoryId; label: string }> = [
  { id: "all", label: "全部" },
  { id: "elements", label: "元素原子" },
  { id: "diatomic", label: "雙原子" },
  { id: "everyday", label: "生活常見" },
  { id: "acid", label: "酸鹼鹽" },
  { id: "ions", label: "離子" },
  { id: "organic", label: "有機物" },
  { id: "crystal", label: "晶體" },
  { id: "carbon", label: "碳的同素異形體" },
];

export function filterMolecules(list: Molecule[], category: "all" | CategoryId, query: string): Molecule[] {
  const needle = query.trim().toLowerCase().replace(/\s+/g, "");
  return list.filter((item) => {
    if (category !== "all" && !item.categories.includes(category)) return false;
    if (!needle) return true;
    const haystack = [item.name, item.formula, item.id, ...item.keywords].join(" ").toLowerCase().replace(/\s+/g, "");
    return haystack.includes(needle);
  });
}
