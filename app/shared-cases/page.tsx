"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeResponse } from "@/types";
import { AppShell } from "@/components/app-shell";

type SharedCase = {
  id: string;
  title: string;
  category: string | null;
  tags: string[];
  summary: string | null;
  content: string;
  publishedAt: string;
  question?: string | null;
  cardsAndClarifiers?: string | null;
  background?: string | null;
  detailedAnalysis?: string | null;
};

function fmt(dt?: string | Date | null) {
  return dt ? new Date(dt).toLocaleString("zh-CN") : "暂无";
}

export default function SharedCasesPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse["user"]>(null);
  const [items, setItems] = useState<SharedCase[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<SharedCase | null>(null);
  const [query, setQuery] = useState("");
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [practicedIds, setPracticedIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (meRes.status === 401) {
        router.push("/login");
        return;
      }
      const meData = await meRes.json();
      setMe(meData.user);

      const sharedRes = await fetch("/api/shared-cases");
      const sharedData = await sharedRes.json();
      if (!sharedRes.ok) {
        setError(sharedData.message || "暂时无法访问共享案例库");
      } else {
        setItems(sharedData.items || []);
      }
      setLoading(false);
    }
    void load();
  }, []);

  useEffect(() => {
    if (!me || typeof window === "undefined") return;
    const savedNotes = window.localStorage.getItem(`lenormand-shared-notes:${me.username}`);
    const savedPracticed = window.localStorage.getItem(`lenormand-shared-practiced:${me.username}`);
    if (savedNotes) setNotes(JSON.parse(savedNotes));
    if (savedPracticed) setPracticedIds(JSON.parse(savedPracticed));
  }, [me]);

  useEffect(() => {
    if (!me || typeof window === "undefined") return;
    window.localStorage.setItem(`lenormand-shared-notes:${me.username}`, JSON.stringify(notes));
  }, [notes, me]);

  useEffect(() => {
    if (!me || typeof window === "undefined") return;
    window.localStorage.setItem(`lenormand-shared-practiced:${me.username}`, JSON.stringify(practicedIds));
  }, [practicedIds, me]);

  const filtered = useMemo(() => {
    if (!query) return items;
    return items.filter((item) => [item.title, item.question || "", item.cardsAndClarifiers || "", item.category || "", item.summary || "", item.tags.join(" "), item.content].some((field) => field.includes(query)));
  }, [items, query]);

  const practicedCount = practicedIds.length;

  function toggleReveal(id: string) {
    setRevealedIds((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);
  }

  function markPracticed(id: string) {
    setPracticedIds((prev) => prev.includes(id) ? prev : [...prev, id]);
  }

  if (loading || !me) return <div className="container">加载中...</div>;

  return (
    <AppShell user={me}>
      <section className="card" style={{ padding: 24, marginBottom: 18 }}>
        <div className="badge">共享案例库</div>
        <h1 className="page-title" style={{ marginTop: 14 }}>共享案例学习区</h1>
        <p className="muted">这一版升级成了练习模式：先看问题与牌面，自己写判断，再点答案核对。你的练习记录只保存在你自己的设备里，不会公开给别人。</p>
        <div className="stat-grid" style={{ marginTop: 16 }}>
          <div className="stat-box"><div className="muted-sm">当前角色</div><div className="stat-value" style={{ fontSize: 24 }}>{me.role}</div></div>
          <div className="stat-box"><div className="muted-sm">是否可读</div><div className="stat-value" style={{ fontSize: 24 }}>{me.canReadSharedCase ? "可读" : "锁定"}</div></div>
          <div className="stat-box"><div className="muted-sm">权限状态</div><div className="muted" style={{ marginTop: 8 }}>{me.sharedAccessPermanent ? "永久可读" : fmt(me.sharedAccessUntil)}</div></div>
          <div className="stat-box"><div className="muted-sm">共享案例总数</div><div className="stat-value">{items.length}</div></div>
          <div className="stat-box"><div className="muted-sm">已练习</div><div className="stat-value">{practicedCount}</div></div>
          <div className="stat-box"><div className="muted-sm">搜索</div><input className="input" placeholder="搜标题 / 标签 / 内容" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        </div>
      </section>

      {error ? (
        <section className="card" style={{ padding: 24 }}>
          <div className="info-banner" style={{ color: "#fecaca" }}>{error}</div>
          <div className="muted" style={{ marginTop: 12 }}>当前账号：{me.username} · 角色：{me.role} · 共享权限：{me.sharedAccessPermanent ? "永久可读" : fmt(me.sharedAccessUntil)}</div>
        </section>
      ) : (
        <section className="card" style={{ padding: 24 }}>
          <div className="cards-grid three">
            {filtered.map((item) => {
              const revealed = revealedIds.includes(item.id);
              const note = notes[item.id] || "";
              const practiced = practicedIds.includes(item.id);
              return (
                <article key={item.id} className="card-item shared-case-card">
                  <div className="card-num">公开时间：{fmt(item.publishedAt)}</div>
                  <div className="card-name" style={{ marginTop: 10 }}>{item.title}</div>
                  <div className="card-core">{item.category || "共享案例"}</div>
                  <div className="shared-case-section-label">问题</div>
                  <div className="card-preview">{item.question || item.summary || "暂未填写问题。"}</div>
                  <div className="shared-case-section-label" style={{ marginTop: 12 }}>牌面</div>
                  <div className="card-preview">{item.cardsAndClarifiers || "暂未公开牌面信息。"}</div>
                  <div className="shared-case-section-label" style={{ marginTop: 12 }}>我的判断</div>
                  <textarea
                    className="learning-note"
                    placeholder="先自己写判断，再点答案核对。这里适合记录：主线判断、关键组合、你最犹豫的地方。"
                    value={note}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  />
                  {revealed ? (
                    <div className="shared-answer-box" style={{ marginTop: 14 }}>
                      <div className="shared-case-section-label">答案 / 解读</div>
                      <div className="pre">{item.detailedAnalysis || item.content || "暂无答案。"}</div>
                    </div>
                  ) : (
                    <div className="shared-answer-placeholder" style={{ marginTop: 14 }}>先自己判断，再点按钮查看老师解读。这样共享案例库更像练习，不只是看答案。</div>
                  )}
                  <div className="tag-list" style={{ marginTop: 12 }}>{item.tags.slice(0, 4).map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
                  <div className="learning-toolbar">
                    <button className="btn btn-primary" onClick={() => toggleReveal(item.id)}>{revealed ? "收起答案" : "点答案"}</button>
                    <button className="btn btn-secondary" onClick={() => markPracticed(item.id)}>{practiced ? "已标记练习" : "标记我已练习"}</button>
                    <button className="btn btn-secondary" onClick={() => setActive(item)}>查看完整案例</button>
                    <div className="learning-status">{practiced ? "已加入你的练习记录" : "尚未标记练习"}</div>
                  </div>
                </article>
              );
            })}
          </div>
          {!filtered.length ? <div className="muted" style={{ marginTop: 18 }}>当前没有可显示的共享案例。</div> : null}
        </section>
      )}

      {active ? (
        <div className="modal-backdrop" onClick={() => setActive(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="badge">共享案例</div>
                <h2 className="page-title" style={{ marginTop: 12 }}>{active.title}</h2>
                <div className="muted">{active.category || "未分类"} · 发布时间：{fmt(active.publishedAt)}</div>
              </div>
              <button className="modal-close" onClick={() => setActive(null)}>×</button>
            </div>
            {active.question ? <section style={{ marginTop: 18 }}><div className="section-title">问题</div><div className="pre muted">{active.question}</div></section> : null}
            {active.cardsAndClarifiers ? <section style={{ marginTop: 18 }}><div className="section-title">牌面</div><div className="pre">{active.cardsAndClarifiers}</div></section> : null}
            {active.summary ? <section style={{ marginTop: 18 }}><div className="section-title">案例摘要</div><div className="pre muted">{active.summary}</div></section> : null}
            <section style={{ marginTop: 18 }}><div className="section-title">适用标签</div><div className="tag-list">{active.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div></section>
            <section style={{ marginTop: 18 }}><div className="section-title">答案 / 完整解读</div><div className="pre">{active.detailedAnalysis || active.content}</div></section>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
