import { distance, type Vec3 } from "@/lib/math";
import type { Atom, Bond } from "@/lib/types";

const CC = 1.42;

function dedupe(points: Vec3[], tolerance = 0.35): Vec3[] {
  const kept: Vec3[] = [];
  for (const point of points) {
    if (kept.some((other) => distance(point, other) < tolerance)) continue;
    kept.push(point);
  }
  return kept;
}

function carbonAtoms(points: Vec3[], fact: string, role: string): { atoms: Atom[]; bonds: Bond[] } {
  const atoms: Atom[] = points.map((position, index) => ({
    id: `C${index + 1}`,
    element: "C",
    position,
    fact,
    role,
  }));
  const bonds: Bond[] = [];
  for (let i = 0; i < atoms.length; i += 1) {
    for (let j = i + 1; j < atoms.length; j += 1) {
      const gap = distance(atoms[i].position, atoms[j].position);
      if (gap > 1.2 && gap < 1.64) {
        bonds.push({ a: atoms[i].id, b: atoms[j].id, order: 1, kind: "covalent" });
      }
    }
  }
  return { atoms, bonds };
}

/** Small diamond network: one carbon bonded to four, each of those bonded onward. */
export function diamondFragment(): { atoms: Atom[]; bonds: Bond[] } {
  const bond = 1.54;
  const unit = 1 / Math.sqrt(3);
  const dirs: Vec3[] = [
    [unit, unit, unit],
    [unit, -unit, -unit],
    [-unit, unit, -unit],
    [-unit, -unit, unit],
  ];
  const points: Vec3[] = [[0, 0, 0]];
  const first = dirs.map((dir) => [dir[0] * bond, dir[1] * bond, dir[2] * bond] as Vec3);
  points.push(...first);
  first.forEach((origin, index) => {
    dirs.forEach((dir, dirIndex) => {
      if (dirIndex === index) return;
      points.push([
        origin[0] + dir[0] * bond,
        origin[1] + dir[1] * bond,
        origin[2] + dir[2] * bond,
      ]);
    });
  });
  return carbonAtoms(
    dedupe(points, 0.4),
    "鑽石裡的碳和另外四個碳以共價鍵相連，鍵角是四面體的約 109.5°。",
    "鑽石裡的碳",
  );
}

function honeycomb(limit: number): Vec3[] {
  const a = CC * Math.sqrt(3);
  const a1: Vec3 = [a, 0, 0];
  const a2: Vec3 = [a / 2, (a * Math.sqrt(3)) / 2, 0];
  const basis: Vec3[] = [
    [0, 0, 0],
    [0, CC, 0],
  ];
  const points: Vec3[] = [];
  for (let i = -limit; i <= limit; i += 1) {
    for (let j = -limit; j <= limit; j += 1) {
      for (const base of basis) {
        const point: Vec3 = [
          i * a1[0] + j * a2[0] + base[0],
          i * a1[1] + j * a2[1] + base[1],
          0,
        ];
        if (Math.hypot(point[0], point[1]) <= CC * (limit * 1.55 + 0.4)) points.push(point);
      }
    }
  }
  return dedupe(points, 0.3);
}

export function grapheneSheet(): { atoms: Atom[]; bonds: Bond[] } {
  return carbonAtoms(
    honeycomb(2),
    "石墨烯是只有一層的六角碳網。每個碳連三個碳，多出來的電子讓這層可以導電。",
    "石墨烯的碳",
  );
}

export function graphiteFragment(): { atoms: Atom[]; bonds: Bond[] } {
  const layer = honeycomb(2);
  const gap = 3.35;
  const shift: Vec3 = [0, CC, gap];
  const stacked = [
    ...layer,
    ...layer.map((point) => [point[0] + shift[0], point[1] + shift[1], point[2] + shift[2]] as Vec3),
  ];
  return carbonAtoms(
    stacked,
    "石墨裡同一層的碳連成六角形，層和層之間距離大約 3.35 Å，比層內的鍵長得多，所以層容易滑開。",
    "石墨的碳",
  );
}

/** Truncated icosahedron, scaled so the shortest C–C bond is 1.40 Å. */
export function buckminsterfullerene(): { atoms: Atom[]; bonds: Bond[] } {
  const phi = (1 + Math.sqrt(5)) / 2;
  const seeds: Vec3[] = [
    [0, 1, 3 * phi],
    [1, 2 + phi, 2 * phi],
    [2, 1 + 2 * phi, phi],
  ];
  const raw: Vec3[] = [];
  for (const seed of seeds) {
    const cycles: Vec3[] = [
      seed,
      [seed[1], seed[2], seed[0]],
      [seed[2], seed[0], seed[1]],
    ];
    for (const cycle of cycles) {
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          for (const sz of [-1, 1]) {
            raw.push([cycle[0] * sx, cycle[1] * sy, cycle[2] * sz]);
          }
        }
      }
    }
  }
  const unique = dedupe(raw, 0.2);
  let shortest = Infinity;
  for (let i = 0; i < unique.length; i += 1) {
    for (let j = i + 1; j < unique.length; j += 1) {
      shortest = Math.min(shortest, distance(unique[i], unique[j]));
    }
  }
  const scale = 1.4 / shortest;
  const points = unique.map((point) => [point[0] * scale, point[1] * scale, point[2] * scale] as Vec3);
  const model = carbonAtoms(
    points,
    "巴克球的每個碳也是連三個碳，12 個五邊形和 20 個六邊形包成一個球。",
    "足球烯的碳",
  );
  for (const bond of model.bonds) {
    const a = model.atoms.find((atom) => atom.id === bond.a)!;
    const b = model.atoms.find((atom) => atom.id === bond.b)!;
    bond.order = distance(a.position, b.position) < 1.43 ? 2 : 1;
  }
  return model;
}

/** Short (5,5) armchair nanotube, rolled from a graphene sheet. */
export function nanotubeSegment(): { atoms: Atom[]; bonds: Bond[] } {
  const a = CC * Math.sqrt(3);
  const a1 = [a, 0];
  const a2 = [a / 2, (a * Math.sqrt(3)) / 2];
  const chiral = [5 * a1[0] + 5 * a2[0], 5 * a1[1] + 5 * a2[1]];
  const length = Math.hypot(chiral[0], chiral[1]);
  const radius = length / (2 * Math.PI);
  const along = [chiral[0] / length, chiral[1] / length];
  const axis = [-along[1], along[0]];
  const points: Vec3[] = [];
  for (let i = -4; i <= 6; i += 1) {
    for (let j = -4; j <= 6; j += 1) {
      for (const base of [
        [0, 0],
        [0, CC],
      ]) {
        const x = i * a1[0] + j * a2[0] + base[0];
        const y = i * a1[1] + j * a2[1] + base[1];
        const around = x * along[0] + y * along[1];
        const axial = x * axis[0] + y * axis[1];
        if (axial < 0 || axial > 4.3) continue;
        const wrapped = ((around % length) + length) % length;
        const theta = (wrapped / length) * Math.PI * 2;
        points.push([radius * Math.cos(theta), axial, radius * Math.sin(theta)]);
      }
    }
  }
  return carbonAtoms(
    dedupe(points, 0.45),
    "奈米碳管可以想成捲起來的石墨烯。碳還是連三個碳，管子又輕又可以導電。",
    "奈米碳管的碳",
  );
}
