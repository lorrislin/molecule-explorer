"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

import Formula from "@/components/Formula";
import { ELEMENT_ORDER, ELEMENTS } from "@/lib/elements";
import { getMolecule, molecules } from "@/lib/molecules";
import type { ElementId } from "@/lib/types";

const MoleculeCanvas = dynamic(() => import("@/components/MoleculeCanvas"), {
  ssr: false,
  loading: () => <div className="stage-loading">分子模型載入中…</div>,
});

export default function Viewer() {
  const [moleculeId, setMoleculeId] = useState(molecules[0].id);
  const [atomId, setAtomId] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const molecule = useMemo(() => getMolecule(moleculeId), [moleculeId]);
  const selected = molecule.atoms.find((atom) => atom.id === atomId) ?? null;
  const presentElements = useMemo(() => {
    const found = new Set(molecule.atoms.map((atom) => atom.element));
    return ELEMENT_ORDER.filter((element) => found.has(element));
  }, [molecule]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const block = (event: TouchEvent) => {
      event.preventDefault();
    };
    const blockGesture = (event: Event) => {
      event.preventDefault();
    };
    stage.addEventListener("touchmove", block, { passive: false });
    document.addEventListener("gesturestart", blockGesture, { passive: false } as AddEventListenerOptions);
    document.addEventListener("gesturechange", blockGesture, { passive: false } as AddEventListenerOptions);
    return () => {
      stage.removeEventListener("touchmove", block);
      document.removeEventListener("gesturestart", blockGesture);
      document.removeEventListener("gesturechange", blockGesture);
    };
  }, []);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("m");
    if (requested && molecules.some((item) => item.id === requested)) {
      setMoleculeId(requested);
    }
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`mol-${moleculeId}`)?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [moleculeId]);

  function chooseMolecule(id: string) {
    setMoleculeId(id);
    setAtomId(null);
    setResetToken((token) => token + 1);
    const url = new URL(window.location.href);
    url.searchParams.set("m", id);
    window.history.replaceState(null, "", url);
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mark" aria-hidden="true">
            <span className="mark-o" />
            <span className="mark-h mark-h1" />
            <span className="mark-h mark-h2" />
          </span>
          <div>
            <h1>分子探險</h1>
            <p className="hint-touch">單指旋轉 · 雙指縮放 · 點原子</p>
            <p className="hint-mouse">拖曳旋轉 · 滾輪縮放 · 點原子</p>
          </div>
        </div>
        <button type="button" className="reset" onClick={() => setResetToken((token) => token + 1)}>
          <ResetIcon />
          重置視角
        </button>
      </header>

      <div className="workspace">
        <div
          className="stage"
          ref={stageRef}
          role="application"
          aria-label={`${molecule.name}的立體模型，單指旋轉，雙指縮放，點一下原子看說明`}
        >
          <MoleculeCanvas
            molecule={molecule}
            selectedAtomId={selected ? selected.id : null}
            onSelectAtom={setAtomId}
            resetToken={resetToken}
          />
        </div>

        <aside className="panel">
          <div className="title-row">
            <h2>
              {molecule.name} <Formula value={molecule.formula} />
            </h2>
          </div>
          <p className="blurb">{molecule.blurb}</p>
          <div className="fact-slot" aria-live="polite">
            {selected ? (
              <article className="atom-card">
                <span className="swatch" style={{ background: ELEMENTS[selected.element].color }} aria-hidden="true" />
                <div>
                  <h3>
                    {ELEMENTS[selected.element].name} <Formula value={ELEMENTS[selected.element].symbol} />
                  </h3>
                  {selected.role ? <p className="role">{selected.role}</p> : null}
                  <p className="fact">{selected.fact}</p>
                </div>
                <button type="button" className="close" onClick={() => setAtomId(null)} aria-label="關閉原子說明">
                  ×
                </button>
              </article>
            ) : (
              <p className="hint">點一下原子，看它的中文名字和一個小知識。</p>
            )}
          </div>
          <ul className="legend">
            {presentElements.map((element) => (
              <li key={element}>
                <ElementDot element={element} />
                {ELEMENTS[element].name}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <section className="picker" aria-label="選擇分子">
        <div className="picker-row">
          {molecules.map((item) => {
            const pressed = item.id === molecule.id;
            return (
              <button
                key={item.id}
                id={`mol-${item.id}`}
                type="button"
                className="mol-btn"
                style={{ background: item.accent }}
                aria-pressed={pressed}
                onClick={() => chooseMolecule(item.id)}
              >
                <span>{item.name}</span>
                <Formula value={item.formula} />
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function ElementDot({ element }: { element: ElementId }) {
  const info = ELEMENTS[element];
  const ring = element === "H" ? "#7d8699" : info.outline;
  return <i style={{ background: info.color, boxShadow: `inset 0 0 0 1.5px ${ring}` }} aria-hidden="true" />;
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M19.8 4.8v4.2h-4.2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
