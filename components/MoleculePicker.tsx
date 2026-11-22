"use client";

import { useMemo, useState } from "react";

import Formula from "@/components/Formula";
import { CATEGORIES, filterMolecules } from "@/lib/species";
import type { CategoryId, Molecule } from "@/lib/types";

type MoleculePickerProps = {
  molecules: Molecule[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export default function MoleculePicker({ molecules, selectedId, onSelect }: MoleculePickerProps) {
  const [category, setCategory] = useState<"all" | CategoryId>("all");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => filterMolecules(molecules, category, query), [molecules, category, query]);

  function surprise() {
    const pool = visible.length > 0 ? visible : molecules;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) onSelect(pick.id);
  }

  return (
    <section className="picker" aria-label="選擇分子">
      <div className="picker-tools">
        <input
          className="picker-search"
          type="search"
          enterKeyHint="search"
          placeholder="搜尋名稱或化學式"
          aria-label="搜尋名稱或化學式"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="button" className="random-btn" onClick={surprise}>
          隨機
        </button>
      </div>
      <div className="cat-row">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            className="cat-chip"
            aria-pressed={category === item.id}
            onClick={() => setCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="picker-row">
        {visible.length === 0 ? (
          <p className="picker-empty">找不到，換個關鍵字看看。</p>
        ) : (
          visible.map((item) => (
            <button
              key={item.id}
              id={`mol-${item.id}`}
              type="button"
              className="mol-btn"
              style={{ background: item.accent }}
              aria-pressed={item.id === selectedId}
              onClick={() => onSelect(item.id)}
            >
              <span>{item.name}</span>
              <Formula value={item.formula} />
            </button>
          ))
        )}
      </div>
    </section>
  );
}
