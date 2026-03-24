"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeResponse } from "@/types";
import { AppShell } from "@/components/app-shell";
import { CARDS } from "@/lib/cards";
import { loadProgress, saveProgress, updateStreak, type ProgressState } from "@/lib/client-progress";

const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

export default function FlashcardPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse["user"]>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [mode, setMode] = useState<"all" | "unmastered" | "fav">("all");
  const [deck, setDeck] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

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

  function start() {
    if (!progress) return;
    let pool = CARDS.map((_, i) => i);
    if (mode === "unmastered") pool = pool.filter((i) => !progress.mastered.includes(i));
    if (mode === "fav") pool = pool.filter((i) => progress.favs.includes(i));
    setDeck(shuffle(pool));
    setIdx(0);
    setFlipped(false);
  }

  if (!me || !progress) return <div className="container">加载中...</div>;

  const currentIdx = deck[idx];
  const card = typeof currentIdx === "number" ? CARDS[currentIdx] : null;

  return (
    <AppShell user={me}>
      <section className="card" style={{ padding: 24 }}>
        <div className="badge">闪卡练习</div>
        <h1 className="page-title" style={{ marginTop: 14 }}>随机抽牌记忆训练</h1>
        <div className="filter-row">
          <button className={`filter-chip ${mode === "all" ? "active" : ""}`} onClick={() => setMode("all")}>全部牌</button>
          <button className={`filter-chip ${mode === "unmastered" ? "active" : ""}`} onClick={() => setMode("unmastered")}>未掌握</button>
          <button className={`filter-chip ${mode === "fav" ? "active" : ""}`} onClick={() => setMode("fav")}>收藏</button>
          <button className="btn btn-primary" onClick={start}>开始抽卡</button>
        </div>
      </section>

      {card ? (
        <section className="card" style={{ padding: 24, marginTop: 18 }}>
          <div className="muted-sm">第 {idx + 1} / {deck.length} 张</div>
          <div className="flash-card" style={{ marginTop: 16 }} onClick={() => setFlipped((v) => !v)}>
            {!flipped ? (
              <div>
                <div style={{ fontSize: 68 }}>{card.icon}</div>
                <h2 className="page-title" style={{ marginTop: 12 }}>{card.name}</h2>
                <div className="muted">点击翻面查看核心牌义</div>
              </div>
            ) : (
              <div>
                <div className="badge">{card.name}</div>
                <h2 className="page-title" style={{ marginTop: 12 }}>{card.core}</h2>
                <div className="pre muted" style={{ marginTop: 14 }}>{card.notes}</div>
              </div>
            )}
          </div>
          <div className="item-actions">
            <button className="btn btn-secondary" onClick={() => {
              const next = progress.mastered.includes(currentIdx) ? progress : { ...progress, mastered: [...progress.mastered, currentIdx] };
              persist(next);
            }}>标记掌握</button>
            <button className="btn btn-secondary" onClick={() => {
              const next = progress.favs.includes(currentIdx) ? progress : { ...progress, favs: [...progress.favs, currentIdx] };
              persist(next);
            }}>加入收藏</button>
            <button className="btn btn-primary" onClick={() => { setFlipped(false); setIdx((v) => Math.min(v + 1, deck.length)); }}>下一张</button>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
