"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeResponse } from "@/types";
import { AppShell } from "@/components/app-shell";
import { CARDS } from "@/lib/cards";
import { loadProgress, saveProgress, updateStreak, type ProgressState } from "@/lib/client-progress";

export default function ProgressPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse["user"]>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);

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

  if (!me || !progress) return <div className="container">加载中...</div>;

  const accuracy = progress.stats.total ? `${Math.round((progress.stats.correct / progress.stats.total) * 100)}%` : "—";
  const visited = new Set([...progress.mastered, ...progress.favs, ...progress.wrongIds]).size;

  return (
    <AppShell user={me}>
      <section className="card" style={{ padding: 24 }}>
        <div className="badge">学习进度</div>
        <h1 className="page-title" style={{ marginTop: 14 }}>你的掌握情况总览</h1>
        <div className="stat-grid" style={{ marginTop: 18 }}>
          <div className="stat-box"><div className="muted-sm">连续学习</div><div className="stat-value">{progress.streak}</div></div>
          <div className="stat-box"><div className="muted-sm">已掌握</div><div className="stat-value">{progress.mastered.length}</div></div>
          <div className="stat-box"><div className="muted-sm">已收藏</div><div className="stat-value">{progress.favs.length}</div></div>
          <div className="stat-box"><div className="muted-sm">测试次数</div><div className="stat-value">{progress.stats.quizCount}</div></div>
          <div className="stat-box"><div className="muted-sm">正确率</div><div className="stat-value">{accuracy}</div></div>
        </div>
        <div className="info-banner" style={{ marginTop: 18 }}>你已经实际触达 {visited} 张牌。这里保留你原来“进度页 + 收藏 + 错题”的逻辑，但正式版已经接进登录账号体系。</div>
      </section>

      <section className="card" style={{ padding: 24, marginTop: 18 }}>
        <div className="section-title">全牌进度矩阵</div>
        <div className="cards-grid three" style={{ marginTop: 16 }}>
          {CARDS.map((card, idx) => {
            const state = progress.mastered.includes(idx) ? "✓" : progress.favs.includes(idx) ? "★" : progress.wrongIds.includes(idx) ? "✗" : "";
            return (
              <div key={card.num} className={`card-item ${progress.mastered.includes(idx) ? "mastered" : ""} ${progress.favs.includes(idx) ? "fav" : ""}`}>
                <div className="card-icon">{card.icon}</div>
                <div className="card-name">{card.name}</div>
                <div className="muted-sm" style={{ marginTop: 6 }}>{card.core}</div>
                <div style={{ marginTop: 10, color: state === "✗" ? "#fca5a5" : "#f5d56e", fontWeight: 700 }}>{state || "—"}</div>
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
