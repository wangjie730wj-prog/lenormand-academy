"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeResponse } from "@/types";
import { AppShell } from "@/components/app-shell";
import { CARDS, type AcademyCard } from "@/lib/cards";
import { loadProgress, saveProgress, updateStreak, type ProgressState } from "@/lib/client-progress";

export default function LibraryPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse["user"]>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [filter, setFilter] = useState<"all" | "fav" | "mastered" | "unmastered">("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<AcademyCard | null>(null);

  useEffect(() => {
    async function init() {
      const res = await fetch("/api/auth/me");
      if (res.status === 401) return router.push("/login");
      const data = await res.json();
      setMe(data.user);
      const next = updateStreak(loadProgress(data.user.username));
      saveProgress(data.user.username, next);
      setProgress(next);
    }
    void init();
  }, [router]);

  function persist(next: ProgressState) {
    if (!me) return;
    setProgress(next);
    saveProgress(me.username, next);
  }

  const items = useMemo(() => {
    if (!progress) return CARDS;
    return CARDS.filter((card, idx) => {
      const textMatch = !query || card.name.includes(query) || card.core.includes(query) || card.tags.some((t) => t.includes(query)) || card.notes.includes(query);
      const fav = progress.favs.includes(idx);
      const mastered = progress.mastered.includes(idx);
      const filterMatch = filter === "all" || (filter === "fav" && fav) || (filter === "mastered" && mastered) || (filter === "unmastered" && !mastered);
      return textMatch && filterMatch;
    });
  }, [filter, query, progress]);

  if (!me || !progress) return <div className="container">加载中...</div>;

  const activeIdx = active ? CARDS.findIndex((c) => c.name === active.name) : -1;
  const fav = activeIdx >= 0 && progress.favs.includes(activeIdx);
  const mastered = activeIdx >= 0 && progress.mastered.includes(activeIdx);

  return (
    <AppShell user={me}>
      <section className="card" style={{ padding: 24 }}>
        <div className="badge">牌义库</div>
        <h1 className="page-title" style={{ marginTop: 14 }}>40 张雷诺曼牌义总库</h1>
        <p className="muted">保留你原先学院风的核心用法：搜索、收藏、标记掌握、点击查看详细解读与经典组合。</p>
        <div className="filter-row">
          {[
            ["all", "全部"],
            ["fav", "收藏"],
            ["mastered", "已掌握"],
            ["unmastered", "未掌握"],
          ].map(([key, label]) => (
            <button key={key} className={`filter-chip filter-chip-contrast ${filter === key ? "active" : ""}`} onClick={() => setFilter(key as never)}>
              {label}
            </button>
          ))}
          <input className="input search-input" placeholder="搜索牌名、关键词、标签" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="cards-grid" style={{ marginTop: 18 }}>
          {items.map((card) => {
            const idx = CARDS.findIndex((c) => c.name === card.name);
            const isFav = progress.favs.includes(idx);
            const isMastered = progress.mastered.includes(idx);
            return (
              <div key={card.num} className={`card-item ${isFav ? "fav" : ""} ${isMastered ? "mastered" : ""}`} onClick={() => setActive(card)}>
                <div className="card-num">No.{card.num}</div>
                <div className="card-icon">{card.icon}</div>
                <div className="card-name">{card.name}</div>
                <div className="card-core">{card.core}</div>
                <div className="card-preview">{card.tags.slice(0, 6).join(" · ")}</div>
              </div>
            );
          })}
        </div>
      </section>

      {active ? (
        <div className="modal-backdrop" onClick={() => setActive(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="badge">{active.icon} 牌义详情</div>
                <h2 className="page-title" style={{ marginTop: 12 }}>{active.name}</h2>
                <div className="muted">{active.core}</div>
              </div>
              <button className="modal-close" onClick={() => setActive(null)}>×</button>
            </div>
            <div className="item-actions" style={{ marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={() => {
                const next = { ...progress, favs: fav ? progress.favs.filter((v) => v !== activeIdx) : [...progress.favs, activeIdx] };
                persist(next);
              }}>{fav ? "取消收藏" : "收藏"}</button>
              <button className="btn btn-primary" onClick={() => {
                const next = { ...progress, mastered: mastered ? progress.mastered.filter((v) => v !== activeIdx) : [...progress.mastered, activeIdx] };
                persist(next);
              }}>{mastered ? "取消掌握" : "标记掌握"}</button>
            </div>
            <section style={{ marginTop: 18 }}>
              <div className="section-title">核心关键词</div>
              <div className="tag-list">{active.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
            </section>
            <section style={{ marginTop: 18 }}>
              <div className="section-title">解读要点</div>
              <div className="pre muted">{active.notes}</div>
            </section>
            {active.combos?.length ? (
              <section style={{ marginTop: 18 }}>
                <div className="section-title">经典组合</div>
                <div className="list">
                  {active.combos.map((combo) => (
                    <div key={combo.k} className="info-banner"><strong>{combo.k}</strong>：{combo.v}</div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
