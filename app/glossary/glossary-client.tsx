"use client";

import { useMemo, useState } from "react";

type GlossaryItem = { term: string; vi: string; category: string; meaning: string; example: string };

export default function GlossaryClient({ items }: { items: GlossaryItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = ["All", ...Array.from(new Set(items.map((item) => item.category)))];
  const filtered = useMemo(() => items.filter((item) => {
    const matchesCategory = category === "All" || item.category === category;
    const text = `${item.term} ${item.vi} ${item.meaning} ${item.example}`.toLowerCase();
    return matchesCategory && text.includes(query.toLowerCase());
  }), [items, query, category]);

  return <main className="directory-shell"><section className="directory-hero"><p className="kicker">ASCM-ALIGNED LANGUAGE</p><h1>Supply Chain <em>Glossary.</em></h1><p>{items.length} thuật ngữ English, giải nghĩa bằng tiếng Việt và ví dụ theo bối cảnh vận hành.</p><div className="directory-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm safety stock, S&OP, WAPE..." /></div></section><section className="directory-content"><div className="category-sidebar"><span>FILTER BY DOMAIN</span>{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}<small>{item === "All" ? items.length : items.filter((term) => term.category === item).length}</small></button>)}</div><div><div className="directory-result-head"><strong>{filtered.length} thuật ngữ</strong><span>English term · Vietnamese explanation</span></div><div className="glossary-grid">{filtered.map((item) => <article key={item.term}><span>{item.category}</span><h2>{item.term}</h2><h3>{item.vi}</h3><p>{item.meaning}</p><div><b>VÍ DỤ</b>{item.example}</div></article>)}</div></div></section></main>;
}
