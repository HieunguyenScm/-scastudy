"use client";

import { useMemo, useState } from "react";

type GlossaryItem = { term: string; vi: string; category: string; meaning: string; example: string };

export default function GlossaryClient({ items }: { items: GlossaryItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = useMemo(() => ["All", ...Array.from(new Set(items.map((item) => item.category)))], [items]);
  const filtered = useMemo(() => items.filter((item) => {
    const matchesCategory = category === "All" || item.category === category;
    const text = `${item.term} ${item.vi} ${item.meaning} ${item.example}`.toLowerCase();
    return matchesCategory && text.includes(query.trim().toLowerCase());
  }), [items, query, category]);

  const resetFilters = () => {
    setQuery("");
    setCategory("All");
  };

  return (
    <main className="directory-shell" id="main-content">
      <section className="directory-hero">
        <p className="kicker">ASCM-ALIGNED LANGUAGE</p>
        <h1>Supply Chain <em>Glossary.</em></h1>
        <p>{items.length} thuật ngữ English, giải nghĩa bằng tiếng Việt và ví dụ theo bối cảnh vận hành.</p>
        <label className="directory-search" htmlFor="glossary-search">
          <span aria-hidden="true">⌕</span>
          <span className="sr-only">Tìm thuật ngữ Supply Chain</span>
          <input id="glossary-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm safety stock, S&OP, WAPE..." />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label="Xóa từ khóa tìm kiếm">Xóa</button> : null}
        </label>
      </section>

      <section className="directory-content">
        <div className="category-sidebar" role="group" aria-label="Lọc theo domain">
          <span>FILTER BY DOMAIN</span>
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              className={category === item ? "active" : ""}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}<small>{item === "All" ? items.length : items.filter((term) => term.category === item).length}</small>
            </button>
          ))}
        </div>

        <div>
          <div className="directory-result-head" role="status" aria-live="polite">
            <strong>{filtered.length} thuật ngữ</strong>
            <span>{category === "All" ? "Mọi domain" : category} · English term / Vietnamese explanation</span>
          </div>
          {filtered.length ? (
            <div className="glossary-grid">
              {filtered.map((item) => (
                <article key={item.term}>
                  <span>{item.category}</span><h2>{item.term}</h2><h3>{item.vi}</h3><p>{item.meaning}</p><div><b>VÍ DỤ</b>{item.example}</div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state glossary-empty">
              <strong>Không tìm thấy thuật ngữ.</strong>
              <p>Thử từ khóa ngắn hơn hoặc mở lại mọi domain.</p>
              <button type="button" onClick={resetFilters}>Xóa bộ lọc</button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
