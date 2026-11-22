import assert from "node:assert/strict";

import { bondAngleDeg, dihedralDeg, distance, place } from "@/lib/math";
import { molecules } from "@/lib/molecules";
import type { ElementId, Molecule } from "@/lib/types";

function byId(id: string): Molecule {
  const found = molecules.find((item) => item.id === id);
  assert.ok(found, `missing molecule ${id}`);
  return found;
}

function pos(molecule: Molecule, id: string) {
  const found = molecule.atoms.find((item) => item.id === id);
  assert.ok(found, `${molecule.id} missing atom ${id}`);
  return found.position;
}

function count(molecule: Molecule, element: ElementId): number {
  return molecule.atoms.filter((item) => item.element === element).length;
}

function assertAngle(actual: number, expected: number, label: string, tolerance = 0.15) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}°, got ${actual.toFixed(3)}°`,
  );
}

const tetrahedral = (Math.acos(-1 / 3) * 180) / Math.PI;

const c1: [number, number, number] = [0, 0, 0];
const c2: [number, number, number] = [1.54, 0, 0];
const ref: [number, number, number] = [0, 1, 0];
const placed = place(c1, c2, ref, 1.09, tetrahedral, 0);
assertAngle(bondAngleDeg(placed, c1, c2), tetrahedral, "place() bond angle");

const substituents = [0, 120, 240].map((phi) => place(c1, c2, ref, 1.09, tetrahedral, phi));
for (let i = 0; i < substituents.length; i += 1) {
  for (let j = i + 1; j < substituents.length; j += 1) {
    assertAngle(bondAngleDeg(substituents[i], c1, substituents[j]), tetrahedral, "tetrahedral substituents");
  }
}

for (const molecule of molecules) {
  assert.ok(molecule.blurb.length > 20, `${molecule.id} blurb is too short`);
  assert.ok(molecule.atoms.length > 1, `${molecule.id} needs atoms`);
  const ids = new Set<string>();
  for (const atom of molecule.atoms) {
    assert.ok(!ids.has(atom.id), `${molecule.id} duplicate atom ${atom.id}`);
    ids.add(atom.id);
    for (const value of atom.position) {
      assert.ok(Number.isFinite(value), `${molecule.id} ${atom.id} has a non-finite coordinate`);
    }
    assert.ok(atom.fact.length > 8, `${molecule.id} ${atom.id} fact is too short`);
  }
  for (const bond of molecule.bonds) {
    assert.ok(ids.has(bond.a) && ids.has(bond.b), `${molecule.id} bond ${bond.a}-${bond.b} is dangling`);
    assert.notEqual(bond.a, bond.b);
  }

  let closest = Infinity;
  let closestPair = "";
  for (let i = 0; i < molecule.atoms.length; i += 1) {
    for (let j = i + 1; j < molecule.atoms.length; j += 1) {
      const bonded = molecule.bonds.some(
        (bond) =>
          (bond.a === molecule.atoms[i].id && bond.b === molecule.atoms[j].id) ||
          (bond.b === molecule.atoms[i].id && bond.a === molecule.atoms[j].id),
      );
      if (bonded) continue;
      const gap = distance(molecule.atoms[i].position, molecule.atoms[j].position);
      if (gap < closest) {
        closest = gap;
        closestPair = `${molecule.atoms[i].id}-${molecule.atoms[j].id}`;
      }
    }
  }
  assert.ok(closest > 0.95, `${molecule.id} atoms ${closestPair} overlap (${closest.toFixed(3)} Å)`);
}

const water = byId("water");
assert.equal(count(water, "O"), 1);
assert.equal(count(water, "H"), 2);
assertAngle(bondAngleDeg(pos(water, "H1"), pos(water, "O"), pos(water, "H2")), 104.5, "water angle", 0.05);
assert.ok(Math.abs(distance(pos(water, "O"), pos(water, "H1")) - 0.96) < 0.001);

const co2 = byId("co2");
assertAngle(bondAngleDeg(pos(co2, "O1"), pos(co2, "C"), pos(co2, "O2")), 180, "CO2 angle", 0.05);
assert.equal(co2.bonds.filter((bond) => bond.order === 2).length, 2);

const oxygen = byId("oxygen");
assert.equal(oxygen.bonds[0]?.order, 2);
assert.ok(Math.abs(distance(pos(oxygen, "O1"), pos(oxygen, "O2")) - 1.21) < 0.001);

const hydrogen = byId("hydrogen");
assert.equal(hydrogen.bonds[0]?.order, 1);
assert.ok(Math.abs(distance(pos(hydrogen, "H1"), pos(hydrogen, "H2")) - 0.74) < 0.001);

const nitrogen = byId("nitrogen");
assert.equal(nitrogen.bonds[0]?.order, 3);
assert.ok(Math.abs(distance(pos(nitrogen, "N1"), pos(nitrogen, "N2")) - 1.1) < 0.001);

const methane = byId("methane");
assert.equal(count(methane, "H"), 4);
const methaneH = methane.atoms.filter((atom) => atom.element === "H");
for (let i = 0; i < methaneH.length; i += 1) {
  for (let j = i + 1; j < methaneH.length; j += 1) {
    assertAngle(
      bondAngleDeg(methaneH[i].position, pos(methane, "C"), methaneH[j].position),
      tetrahedral,
      "methane angle",
      0.05,
    );
  }
}

const ammonia = byId("ammonia");
const ammoniaH = ammonia.atoms.filter((atom) => atom.element === "H");
assert.equal(ammoniaH.length, 3);
for (let i = 0; i < ammoniaH.length; i += 1) {
  for (let j = i + 1; j < ammoniaH.length; j += 1) {
    assertAngle(bondAngleDeg(ammoniaH[i].position, pos(ammonia, "N"), ammoniaH[j].position), 107, "ammonia angle", 0.05);
  }
}

const ethanol = byId("ethanol");
assert.equal(count(ethanol, "C"), 2);
assert.equal(count(ethanol, "H"), 6);
assert.equal(count(ethanol, "O"), 1);
assertAngle(bondAngleDeg(pos(ethanol, "Cb"), pos(ethanol, "Ca"), pos(ethanol, "O")), tetrahedral, "ethanol C-C-O");
assertAngle(bondAngleDeg(pos(ethanol, "Ca"), pos(ethanol, "O"), pos(ethanol, "Ho")), 108.5, "ethanol C-O-H", 0.1);
const ethanolDihedrals = ["Hb1", "Hb2", "Hb3"].map((id) =>
  Math.abs(dihedralDeg(pos(ethanol, "O"), pos(ethanol, "Ca"), pos(ethanol, "Cb"), pos(ethanol, id))),
);
const nearestStagger = Math.min(...ethanolDihedrals.map((angle) => Math.min(angle, 360 - angle)));
assert.ok(nearestStagger > 50 && nearestStagger < 70, `ethanol should be staggered, nearest dihedral ${nearestStagger}`);

const glucose = byId("glucose");
assert.equal(count(glucose, "C"), 6);
assert.equal(count(glucose, "H"), 12);
assert.equal(count(glucose, "O"), 6);
const ringOrder = ["C1", "C2", "C3", "C4", "C5", "O5"];
for (let i = 0; i < ringOrder.length; i += 1) {
  const a = ringOrder[i];
  const b = ringOrder[(i + 1) % ringOrder.length];
  const c = ringOrder[(i + 2) % ringOrder.length];
  assertAngle(bondAngleDeg(pos(glucose, a), pos(glucose, b), pos(glucose, c)), tetrahedral, `glucose ring ${b}`, 0.2);
}
for (let i = 0; i < ringOrder.length; i += 1) {
  const ids = [0, 1, 2, 3].map((offset) => ringOrder[(i + offset) % ringOrder.length]);
  const torsion = dihedralDeg(pos(glucose, ids[0]), pos(glucose, ids[1]), pos(glucose, ids[2]), pos(glucose, ids[3]));
  assert.ok(Math.abs(Math.abs(torsion) - 60) < 1.5, `glucose chair dihedral ${torsion.toFixed(2)}`);
}
const substituentLift = (carbonId: string, substituentId: string, hydrogenId: string) => {
  const carbon = pos(glucose, carbonId);
  const substituent = Math.abs(pos(glucose, substituentId)[2] - carbon[2]);
  const hydrogen = Math.abs(pos(glucose, hydrogenId)[2] - carbon[2]);
  assert.ok(hydrogen > substituent, `${carbonId} hydrogen should be the more axial substituent`);
};
substituentLift("C1", "O1", "HC1");
substituentLift("C2", "O2", "HC2");
substituentLift("C3", "O3", "HC3");
substituentLift("C4", "O4", "HC4");
substituentLift("C5", "C6", "HC5");

const salt = byId("salt");
assert.equal(count(salt, "Na"), 13);
assert.equal(count(salt, "Cl"), 14);
assert.ok(salt.bonds.every((bond) => bond.kind === "ionic"));
const center = salt.atoms.find((atom) => atom.id === "Na_0_0_0");
assert.ok(center);
const neighbors = salt.bonds.filter((bond) => bond.a === center.id || bond.b === center.id);
assert.equal(neighbors.length, 6);

const caffeine = byId("caffeine");
assert.equal(count(caffeine, "C"), 8);
assert.equal(count(caffeine, "H"), 10);
assert.equal(count(caffeine, "N"), 4);
assert.equal(count(caffeine, "O"), 2);
assert.equal(caffeine.bonds.filter((bond) => bond.order === 2).length, 4);
for (const atom of caffeine.atoms) {
  if (atom.element === "H") continue;
  assert.ok(Math.abs(atom.position[2]) < 0.08, `${atom.id} should sit in the ring plane`);
}
assert.ok(Math.abs(distance(pos(caffeine, "C2"), pos(caffeine, "O2")) - 1.22) < 0.02);
assert.ok(distance(pos(caffeine, "C4"), pos(caffeine, "C5")) > 1.2);
assert.ok(distance(pos(caffeine, "N9"), pos(caffeine, "C8")) > 1.2);

assert.ok(water.dipole, "water should have a dipole");
assert.ok(water.atoms.find((atom) => atom.id === "O")?.charge?.value! < 0);
assert.ok(water.atoms.filter((atom) => atom.element === "H").every((atom) => (atom.charge?.value ?? 0) > 0));
const waterO = pos(water, "O");
const towardOxygen =
  water.dipole[0] * waterO[0] + water.dipole[1] * waterO[1] + water.dipole[2] * waterO[2];
assert.ok(towardOxygen > 0, "water dipole should point toward oxygen");

assert.equal(byId("co2").dipole, null);
assert.equal(byId("methane").dipole, null);
assert.equal(byId("oxygen").dipole, null);
assert.ok(byId("oxygen").atoms.every((atom) => !atom.charge));
assert.ok(byId("ammonia").dipole, "ammonia should have a dipole");
assert.equal(byId("salt").dipole, null);
assert.equal(byId("salt").atoms.find((atom) => atom.element === "Na")?.charge?.label, "Na⁺");
assert.equal(byId("salt").atoms.find((atom) => atom.element === "Cl")?.charge?.label, "Cl⁻");
assert.ok(molecules.every((item) => item.polarityNote.length > 12));

console.log(`geometry ok (${molecules.length} molecules)`);
