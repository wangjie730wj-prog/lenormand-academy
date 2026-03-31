"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeResponse } from "@/types";
import { AppShell } from "@/components/app-shell";
import { CardVisual } from "@/components/card-visual";
import { CARDS, COMBO_QS } from "@/lib/cards";
import { loadProgress, saveProgress, updateStreak, type ProgressState } from "@/lib/client-progress";

type Question = { cardIdx: number; question: string; answer: string; options: string[]; type: string; helper?: string };
const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

export default function QuizPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse["user"]>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [mode, setMode] = useState<"name2key" | "key2name" | "combo" | "wrong">("name2key");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });

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

  function build(modeValue: typeof mode) {
    if (!progress) return;
    let next: Question[] = [];
    if (modeValue === "combo") {
      next = shuffle(COMBO_QS).slice(0, 10).map((q) => ({
        type: "combo",
        cardIdx: q.cardIdx,
        question: q.q,
        answer: q.a,
        helper: `${q.cardIcon} ${q.cardName}`,
        options: shuffle([q.a, ...shuffle(COMBO_QS.filter((x) => x.a !== q.a)).slice(0, 3).map((x) => x.a)]),
      }));
    } else {
      const pool = modeValue === "wrong" ? (progress.wrongIds.length ? progress.wrongIds : CARDS.map((_, i) => i)) : shuffle(CARDS.map((_, i) => i)).slice(0, 10);
      next = shuffle(pool).slice(0, 10).map((cardIdx) => {
        const card = CARDS[cardIdx];
        const wrongs = shuffle(CARDS.filter((_, i) => i !== cardIdx)).slice(0, 3);
        if (modeValue === "key2name") {
          return { type: modeValue, cardIdx, question: card.tags.slice(0, 4).join("、"), answer: card.name, options: shuffle([card.name, ...wrongs.map((w) => w.name)]) };
        }
        return { type: modeValue, cardIdx, question: card.name, answer: card.core, options: shuffle([card.core, ...wrongs.map((w) => w.core)]) };
      });
    }
    setQuestions(next);
    setIdx(0);
    setChosen(null);
    setScore({ correct: 0, wrong: 0 });
  }

  const current = questions[idx];
  const done = idx >= questions.length && questions.length > 0;
  const pct = useMemo(() => questions.length ? Math.round((score.correct / questions.length) * 100) : 0, [score, questions]);

  if (!me || !progress) return <div className="container">加载中...</div>;

  return (
    <AppShell user={me}>
      <section className="card" style={{ padding: 24 }}>
        <div className="badge">测试中心</div>
        <h1 className="page-title" style={{ marginTop: 14 }}>牌义测试 / 组合测试 / 错题回顾</h1>
        <div className="filter-row">
          <button className={`filter-chip ${mode === "name2key" ? "active" : ""}`} onClick={() => setMode("name2key")}>看牌猜核心</button>
          <button className={`filter-chip ${mode === "key2name" ? "active" : ""}`} onClick={() => setMode("key2name")}>看关键词猜牌</button>
          <button className={`filter-chip ${mode === "combo" ? "active" : ""}`} onClick={() => setMode("combo")}>经典组合</button>
          <button className={`filter-chip ${mode === "wrong" ? "active" : ""}`} onClick={() => setMode("wrong")}>错题回顾</button>
          <button className="btn btn-primary" onClick={() => build(mode)}>开始测试</button>
        </div>
      </section>

      {current && !done ? (
        <section className="card" style={{ padding: 24, marginTop: 18 }}>
          <div className="muted-sm">第 {idx + 1} / {questions.length} 题 · 正确 {score.correct} · 错误 {score.wrong}</div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            {current.type !== "combo" && current.type !== "key2name" ? (
              <CardVisual src={CARDS[current.cardIdx]?.image} alt={CARDS[current.cardIdx]?.name ?? current.question} emoji={CARDS[current.cardIdx]?.icon} size={140} />
            ) : null}
            <h2 className="page-title">{current.question}</h2>
          </div>
          {current.helper ? <div className="muted">{current.helper}</div> : null}
          <div className="list" style={{ marginTop: 18 }}>
            {current.options.map((opt) => {
              const isCorrect = chosen && opt === current.answer;
              const isWrong = chosen === opt && opt !== current.answer;
              return (
                <button
                  key={opt}
                  className={`quiz-option ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
                  disabled={!!chosen}
                  onClick={() => {
                    setChosen(opt);
                    const right = opt === current.answer;
                    const next = { ...progress, stats: { ...progress.stats, total: progress.stats.total + 1, correct: progress.stats.correct + (right ? 1 : 0), quizCount: progress.stats.quizCount + 1 }, wrongIds: right ? progress.wrongIds.filter((v) => v !== current.cardIdx) : Array.from(new Set([...progress.wrongIds, current.cardIdx])) };
                    persist(next);
                    setScore((s) => ({ correct: s.correct + (right ? 1 : 0), wrong: s.wrong + (right ? 0 : 1) }));
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {chosen ? (
            <div className="item-actions">
              <div className="info-banner">正确答案：{current.answer}</div>
              <button className="btn btn-secondary" onClick={() => { setChosen(null); setIdx((v) => v + 1); }}>下一题</button>
            </div>
          ) : null}
        </section>
      ) : null}

      {done ? (
        <section className="card" style={{ padding: 24, marginTop: 18 }}>
          <div className="badge">测试完成</div>
          <h2 className="page-title" style={{ marginTop: 12 }}>{pct >= 80 ? "表现很好" : pct >= 60 ? "继续巩固" : "建议再练一轮"}</h2>
          <div className="stat-grid" style={{ marginTop: 16 }}>
            <div className="stat-box"><div className="muted-sm">正确率</div><div className="stat-value">{pct}%</div></div>
            <div className="stat-box"><div className="muted-sm">答对</div><div className="stat-value">{score.correct}</div></div>
            <div className="stat-box"><div className="muted-sm">答错</div><div className="stat-value">{score.wrong}</div></div>
          </div>
          <div className="item-actions"><button className="btn btn-primary" onClick={() => build(mode)}>再来一次</button></div>
        </section>
      ) : null}
    </AppShell>
  );
}
