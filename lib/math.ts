export type Vec3 = [number, number, number];

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function length(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function norm(a: Vec3): Vec3 {
  const len = length(a);
  if (len < 1e-8) {
    return [0, 0, 0];
  }
  return scale(a, 1 / len);
}

export function distance(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}

export function midpoint(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

export function bondAngleDeg(a: Vec3, vertex: Vec3, b: Vec3): number {
  const u = norm(sub(a, vertex));
  const v = norm(sub(b, vertex));
  const c = Math.min(1, Math.max(-1, dot(u, v)));
  return (Math.acos(c) * 180) / Math.PI;
}

/** Signed dihedral angle (degrees) for atoms a-b-c-d. */
export function dihedralDeg(a: Vec3, b: Vec3, c: Vec3, d: Vec3): number {
  const b1 = sub(b, a);
  const b2 = sub(c, b);
  const b3 = sub(d, c);
  const n1 = cross(b1, b2);
  const n2 = cross(b2, b3);
  const m1 = cross(n1, norm(b2));
  const x = dot(n1, n2);
  const y = dot(m1, n2);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

export function centroid(points: Vec3[]): Vec3 {
  const sum = points.reduce<Vec3>((acc, p) => add(acc, p), [0, 0, 0]);
  return scale(sum, 1 / points.length);
}

/**
 * Place P bonded to `a`, with angle P-a-b = angleDeg and
 * dihedral P-a-b-c = dihedralDeg. Dihedral 0 is eclipsed with c.
 */
export function place(
  a: Vec3,
  b: Vec3,
  c: Vec3,
  bond: number,
  angleDeg: number,
  dihedralDeg: number,
): Vec3 {
  const theta = (angleDeg * Math.PI) / 180;
  const phi = (dihedralDeg * Math.PI) / 180;
  const ab = norm(sub(b, a));
  const bc = sub(c, b);
  const bcPerp = sub(bc, scale(ab, dot(bc, ab)));
  let u = norm(bcPerp);
  if (length(bcPerp) < 1e-6) {
    const fallback: Vec3 = Math.abs(ab[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    u = norm(cross(ab, fallback));
  }
  const v = norm(cross(ab, u));
  const dir = add(
    scale(ab, Math.cos(theta)),
    add(scale(u, Math.sin(theta) * Math.cos(phi)), scale(v, Math.sin(theta) * Math.sin(phi))),
  );
  return add(a, scale(norm(dir), bond));
}

/** Two unit vectors that finish a tetrahedron around `center`. */
export function tetrahedralPair(center: Vec3, neighborA: Vec3, neighborB: Vec3): [Vec3, Vec3] {
  const b1 = norm(sub(neighborA, center));
  const b2 = norm(sub(neighborB, center));
  const nRaw = cross(b1, b2);
  const nLen = length(nRaw);
  if (nLen < 1e-6) {
    throw new Error("tetrahedralPair: neighbors are collinear");
  }
  const n = scale(nRaw, 1 / nLen);
  const bis = norm(add(b1, b2));
  const proj = dot(bis, b1);
  const y = -1 / 3 / proj;
  const x = Math.sqrt(Math.max(0, 1 - y * y));
  return [norm(add(scale(n, x), scale(bis, y))), norm(add(scale(n, -x), scale(bis, y)))];
}

/** Unit vector of the third sp2 substituent, pointing away from the two neighbors. */
export function trigonalDirection(center: Vec3, neighborA: Vec3, neighborB: Vec3): Vec3 {
  const u = norm(sub(neighborA, center));
  const v = norm(sub(neighborB, center));
  const outward = scale(add(u, v), -1);
  if (length(outward) < 1e-6) {
    throw new Error("trigonalDirection: neighbors are opposite");
  }
  return norm(outward);
}

/**
 * Chair cyclohexane positions with equal bonds and tetrahedral angles.
 * Even indices sit at +z, odd indices at -z.
 */
export function chairRing(bond: number): Vec3[] {
  const radius = (bond * 2 * Math.SQRT2) / 3;
  const height = bond / 6;
  const points: Vec3[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (i * Math.PI) / 3;
    points.push([
      radius * Math.cos(angle),
      radius * Math.sin(angle),
      i % 2 === 0 ? height : -height,
    ]);
  }
  return points;
}
