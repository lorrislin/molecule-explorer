"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { BackSide, CanvasTexture, MOUSE, Quaternion, TOUCH, Vector3, type PerspectiveCamera } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { ELEMENTS } from "@/lib/elements";
import { moleculeExtent } from "@/lib/molecules";
import type { Atom, AtomCharge, Bond, Molecule } from "@/lib/types";
import type { Vec3 } from "@/lib/math";

type MoleculeCanvasProps = {
  molecule: Molecule;
  selectedAtomId: string | null;
  onSelectAtom: (id: string | null) => void;
  resetToken: number;
  showPolarity: boolean;
};

type PointerState = {
  x: number;
  y: number;
  moved: boolean;
  hit: boolean;
};

const Y_AXIS = new Vector3(0, 1, 0);
const scratchA = new Vector3();
const scratchB = new Vector3();
const scratchDir = new Vector3();
const scratchMid = new Vector3();
const scratchQuat = new Quaternion();
const scratchSide = new Vector3();
const scratchUp = new Vector3();
const scratchOffset = new Vector3();

function mixHex(source: string, target: string, amount: number): string {
  const parse = (hex: string) => [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  const from = parse(source);
  const to = parse(target);
  const mixed = from.map((channel, index) => Math.round(channel + (to[index] - channel) * amount));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function frameDistance(radius: number): number {
  const halfFov = (35 * Math.PI) / 360;
  return (radius / Math.sin(halfFov)) * 1.2;
}

function Controls({ radius, resetToken }: { radius: number; resetToken: number }) {
  const camera = useThree((state) => state.camera as PerspectiveCamera);
  const gl = useThree((state) => state.gl);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = !reduceMotion;
    controls.dampingFactor = 0.09;
    controls.enablePan = false;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.85;
    controls.zoomToCursor = false;
    controls.touches.ONE = TOUCH.ROTATE;
    controls.touches.TWO = TOUCH.DOLLY_PAN;
    controls.mouseButtons.LEFT = MOUSE.ROTATE;
    controls.mouseButtons.MIDDLE = MOUSE.DOLLY;
    controls.mouseButtons.RIGHT = MOUSE.ROTATE;

    const distance = frameDistance(radius);
    camera.position.set(distance * 0.55, distance * 0.4, distance * 0.82);
    camera.near = Math.max(0.04, distance / 100);
    camera.far = distance * 40;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.minDistance = Math.max(1.05, radius * 0.95);
    controls.maxDistance = distance * 3.4;
    controls.update();
    controls.saveState();
    controlsRef.current = controls;

    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("button, a, input, textarea, .picker")) {
        return;
      }
      const step = event.shiftKey ? 0.08 : 0.16;
      let dx = 0;
      let dy = 0;
      if (event.key === "ArrowLeft") dx = -step;
      else if (event.key === "ArrowRight") dx = step;
      else if (event.key === "ArrowUp") dy = step;
      else if (event.key === "ArrowDown") dy = -step;
      else return;
      event.preventDefault();
      const offset = camera.position.clone().sub(controls.target);
      const spherical = {
        radius: offset.length(),
        theta: Math.atan2(offset.x, offset.z),
        phi: Math.acos(Math.min(1, Math.max(-1, offset.y / offset.length()))),
      };
      spherical.theta -= dx;
      spherical.phi = Math.min(Math.PI - 0.12, Math.max(0.12, spherical.phi - dy));
      offset.set(
        spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta),
        spherical.radius * Math.cos(spherical.phi),
        spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta),
      );
      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);
      controls.update();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      controlsRef.current = null;
      controls.dispose();
    };
  }, [camera, gl, radius, resetToken]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return null;
}

function Stick({
  start,
  end,
  color,
  radius,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  radius: number;
}) {
  const layout = useMemo(() => {
    scratchA.set(start[0], start[1], start[2]);
    scratchB.set(end[0], end[1], end[2]);
    const length = scratchA.distanceTo(scratchB);
    scratchMid.copy(scratchA).lerp(scratchB, 0.5);
    scratchDir.copy(scratchB).sub(scratchA).normalize();
    scratchQuat.setFromUnitVectors(Y_AXIS, scratchDir);
    return {
      position: scratchMid.toArray() as [number, number, number],
      quaternion: scratchQuat.toArray() as [number, number, number, number],
      length,
    };
  }, [start, end]);

  return (
    <mesh position={layout.position} quaternion={layout.quaternion}>
      <cylinderGeometry args={[radius, radius, layout.length, 12, 1, true]} />
      <meshStandardMaterial color={color} roughness={0.42} metalness={0.04} />
    </mesh>
  );
}

function offsetsFor(order: Bond["order"], start: Vector3, end: Vector3, gap: number): Vector3[] {
  if (order === 1) return [new Vector3()];
  scratchDir.copy(end).sub(start).normalize();
  const reference = Math.abs(scratchDir.z) > 0.9 ? scratchUp.set(0, 1, 0) : scratchUp.set(0, 0, 1);
  scratchSide.crossVectors(scratchDir, reference).normalize();
  scratchOffset.crossVectors(scratchDir, scratchSide).normalize();
  if (order === 2) {
    return [scratchSide.clone().multiplyScalar(gap), scratchSide.clone().multiplyScalar(-gap)];
  }
  return [0, 1, 2].map((index) => {
    const angle = (index * 2 * Math.PI) / 3;
    return scratchSide
      .clone()
      .multiplyScalar(Math.cos(angle) * gap)
      .add(scratchOffset.clone().multiplyScalar(Math.sin(angle) * gap));
  });
}

function BondMesh({ bond, atomById, gap }: { bond: Bond; atomById: Map<string, Atom>; gap: number }) {
  const first = atomById.get(bond.a);
  const second = atomById.get(bond.b);
  const geometry = useMemo(() => {
    if (!first || !second) return [];
    const start = new Vector3(...first.position);
    const end = new Vector3(...second.position);
    const middle = start.clone().lerp(end, 0.5);
    const ionic = bond.kind === "ionic";
    const radius = ionic ? 0.045 : bond.order === 1 ? 0.07 : 0.055;
    const colorA = ionic ? "#E7C15A" : mixHex(ELEMENTS[first.element].color, "#F4F6FB", 0.42);
    const colorB = ionic ? "#E7C15A" : mixHex(ELEMENTS[second.element].color, "#F4F6FB", 0.42);
    return offsetsFor(bond.order, start, end, gap).flatMap((offset, index) => {
      const a = start.clone().add(offset);
      const b = end.clone().add(offset);
      const mid = middle.clone().add(offset);
      return [
        {
          key: `${bond.a}-${bond.b}-${index}-a`,
          start: a.toArray() as [number, number, number],
          end: mid.toArray() as [number, number, number],
          color: colorA,
          radius,
        },
        {
          key: `${bond.a}-${bond.b}-${index}-b`,
          start: mid.toArray() as [number, number, number],
          end: b.toArray() as [number, number, number],
          color: colorB,
          radius,
        },
      ];
    });
  }, [bond, first, second, gap]);

  return (
    <group>
      {geometry.map((stick) => (
        <Stick key={stick.key} start={stick.start} end={stick.end} color={stick.color} radius={stick.radius} />
      ))}
    </group>
  );
}

const labelTextures = new Map<string, CanvasTexture>();

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function chargeTexture(charge: AtomCharge): CanvasTexture {
  const key = `${charge.label}|${charge.caption ?? ""}|${charge.value < 0 ? "n" : "p"}`;
  const cached = labelTextures.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = charge.caption ? 280 : 200;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立極性標籤");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(16, 10, 32, 0.78)";
  roundedRect(ctx, 16, 16, canvas.width - 32, canvas.height - 32, 48);
  ctx.fill();
  ctx.fillStyle = charge.value < 0 ? "#ffb4bc" : "#c5dcff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 128px sans-serif";
  ctx.fillText(charge.label, canvas.width / 2, charge.caption ? 108 : canvas.height / 2);
  if (charge.caption) {
    ctx.font = "700 64px sans-serif";
    ctx.fillText(charge.caption, canvas.width / 2, 200);
  }
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  labelTextures.set(key, texture);
  return texture;
}

function ChargeLabel({ atom }: { atom: Atom }) {
  const charge = atom.charge;
  const texture = useMemo(() => (charge ? chargeTexture(charge) : null), [charge]);
  if (!charge || !texture) return null;
  const info = ELEMENTS[atom.element];
  const reach = Math.hypot(atom.position[0], atom.position[1], atom.position[2]);
  const outward: Vec3 = reach < 0.15 ? [0, 1, 0] : [atom.position[0] / reach, atom.position[1] / reach, atom.position[2] / reach];
  const gap = info.radius + (charge.size === "small" ? 0.48 : 0.7);
  const width = charge.size === "small" ? 0.78 : 1.15;
  const height = width * ((charge.caption ? 280 : 200) / 512);
  return (
    <sprite position={[atom.position[0] + outward[0] * gap, atom.position[1] + outward[1] * gap, atom.position[2] + outward[2] * gap]} scale={[width, height, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}

function sideOffset(direction: Vec3, distance: number): Vec3 {
  const view: Vec3 = [0.55, 0.4, 0.82];
  const cross: Vec3 = [
    direction[1] * view[2] - direction[2] * view[1],
    direction[2] * view[0] - direction[0] * view[2],
    direction[0] * view[1] - direction[1] * view[0],
  ];
  const len = Math.hypot(cross[0], cross[1], cross[2]) || 1;
  return [(cross[0] / len) * distance, (cross[1] / len) * distance, (cross[2] / len) * distance];
}

function DipoleArrow({ direction, radius }: { direction: Vec3; radius: number }) {
  const quaternion = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(direction[0], direction[1], direction[2]).normalize()),
    [direction],
  );
  const length = Math.max(1.35, radius * 1.35);
  const head = length * 0.34;
  const shaft = length - head;
  const offset = sideOffset(direction, Math.max(0.45, radius * 0.42));
  return (
    <group position={offset} quaternion={quaternion}>
      <mesh position={[0, -head / 2, 0]}>
        <cylinderGeometry args={[Math.max(0.03, radius * 0.02), Math.max(0.03, radius * 0.02), shaft, 12]} />
        <meshStandardMaterial color="#ffe14a" emissive="#ffc107" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0, shaft / 2, 0]}>
        <coneGeometry args={[Math.max(0.12, radius * 0.1), head, 18]} />
        <meshStandardMaterial color="#ffe14a" emissive="#ffc107" emissiveIntensity={0.75} />
      </mesh>
    </group>
  );
}

function AtomMesh({
  atom,
  selected,
  showPolarity,
  onSelect,
  pointer,
}: {
  atom: Atom;
  selected: boolean;
  showPolarity: boolean;
  onSelect: (id: string) => void;
  pointer: RefObject<PointerState>;
}) {
  const info = ELEMENTS[atom.element];
  const tint = showPolarity && atom.charge ? (atom.charge.value < 0 ? "#ff5b6a" : "#5b93ff") : null;

  return (
    <group position={atom.position}>
      <mesh scale={1.055}>
        <sphereGeometry args={[info.radius, 28, 28]} />
        <meshBasicMaterial color={info.outline} side={BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[info.radius, 32, 32]} />
        <meshStandardMaterial
          color={info.color}
          emissive={tint ?? (selected ? info.color : "#000000")}
          emissiveIntensity={tint ? 0.62 : selected ? 0.42 : 0}
          roughness={atom.element === "H" ? 0.38 : 0.34}
          metalness={0.06}
        />
      </mesh>
      {tint ? (
        <mesh>
          <sphereGeometry args={[info.radius * 1.22, 24, 24]} />
          <meshBasicMaterial color={tint} transparent opacity={0.32} depthWrite={false} />
        </mesh>
      ) : null}
      {selected ? (
        <mesh>
          <sphereGeometry args={[info.radius * 1.34, 24, 24]} />
          <meshBasicMaterial color="#FFE14A" transparent opacity={0.38} depthWrite={false} />
        </mesh>
      ) : null}
      <mesh
        onPointerUp={(event) => {
          event.stopPropagation();
          if (!pointer.current?.moved) {
            if (pointer.current) pointer.current.hit = true;
            onSelect(atom.id);
          }
        }}
      >
        <sphereGeometry args={[Math.max(info.radius * 1.55, 0.42), 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Scene({
  molecule,
  selectedAtomId,
  onSelectAtom,
  resetToken,
  showPolarity,
  pointer,
}: MoleculeCanvasProps & { pointer: RefObject<PointerState> }) {
  const atomById = useMemo(() => new Map(molecule.atoms.map((atom) => [atom.id, atom])), [molecule]);
  const radius = moleculeExtent(molecule);
  const bondGap = Math.max(0.16, radius * 0.09);
  const frameRadius = radius + (showPolarity ? 0.55 : 0.2);

  return (
    <>
      <hemisphereLight args={["#f4f7ff", "#24143f", 0.92]} />
      <directionalLight position={[5, 7, 6]} intensity={1.2} />
      <directionalLight position={[-5, -2, -4]} intensity={0.38} />
      <Controls radius={frameRadius} resetToken={resetToken} />
      {showPolarity && molecule.dipole ? <DipoleArrow direction={molecule.dipole} radius={radius} /> : null}
      {molecule.bonds.map((bond) => (
        <BondMesh key={`${bond.a}-${bond.b}-${bond.order}`} bond={bond} atomById={atomById} gap={bondGap} />
      ))}
      {molecule.atoms.map((atom) => (
        <AtomMesh
          key={atom.id}
          atom={atom}
          selected={atom.id === selectedAtomId}
          showPolarity={showPolarity}
          onSelect={(id) => onSelectAtom(selectedAtomId === id ? null : id)}
          pointer={pointer}
        />
      ))}
      {showPolarity
        ? molecule.atoms.map((atom) => (atom.charge ? <ChargeLabel key={`charge-${atom.id}`} atom={atom} /> : null))
        : null}
    </>
  );
}

export default function MoleculeCanvas(props: MoleculeCanvasProps) {
  const pointer = useRef<PointerState>({ x: 0, y: 0, moved: false, hit: false });

  return (
    <Canvas
      className="webgl"
      camera={{ position: [0, 0, 8], fov: 35, near: 0.05, far: 200 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.domElement.style.touchAction = "none";
      }}
      onPointerDown={(event) => {
        pointer.current.x = event.clientX;
        pointer.current.y = event.clientY;
        pointer.current.moved = false;
        pointer.current.hit = false;
      }}
      onPointerMove={(event) => {
        const dx = event.clientX - pointer.current.x;
        const dy = event.clientY - pointer.current.y;
        if (dx * dx + dy * dy > 144) pointer.current.moved = true;
      }}
      onPointerMissed={() => {
        if (!pointer.current.moved && !pointer.current.hit) props.onSelectAtom(null);
      }}
    >
      <Scene {...props} pointer={pointer} />
    </Canvas>
  );
}
