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
};

function fmt(dt?: string | null) {
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

  const filtered = useMemo(() => {
    if (!query) return items;
    return items.filter((item) => [item.title, item.category || "", item.summary || "", item.tags.join(" "), item.content].some((field) => field.includes(query)));
  }, [items, query]);

  if (loading || !me) return <div className="container">加载中...</div>;

  return (
    <AppShell user={me}>
      <section className="card" style={{ padding: 24, marginBottom: 18 }}>
        <div className="badge">共享案例库</div>
        <h1 className="page-title" style={{ marginTop: 14 }}>共享案例学习区</h1>
        <p className="muted">这一版不再把共享权限完全写死：管理员可以手动决定谁是付费学员、谁长期可读、谁到哪天截止；投稿审核时的奖励天数也可以自由改。</p>
        <div className="stat-grid" style={{ marginTop: 16 }}>
          <div className="stat-box"><div className="muted-sm">当前角色</div><div className="stat-value" style={{ fontSize: 24 }}>{me.role}</div></div>
          <div className="stat-box"><div className="muted-sm">是否可读</div><div className="stat-value" style={{ fontSize: 24 }}>{me.canReadSharedCase ? "可读" : "锁定"}</div></div>
          <div className="stat-box"><div className="muted-sm">权限状态</div><div className="muted" style={{ marginTop: 8 }}>{me.sharedAccessPermanent ? "永久可读" : fmt(me.sharedAccessUntil)}</div></div>
          <div className="stat-box"><div className="muted-sm">共享案例总数</div><div className="stat-value">{items.length}</div></div>
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
            {filtered.map((item) => (
              <article key={item.id} className="card-item" onClick={() => setActive(item)}>
                <div className="card-num">公开时间：{fmt(item.publishedAt)}</div>
                <div className="card-name" style={{ marginTop: 10 }}>{item.title}</div>
                <div className="card-core">{item.category || "共享案例"}</div>
                <div className="card-preview">{item.summary || item.content.slice(0, 90) + "..."}</div>
                <div className="tag-list" style={{ marginTop: 10 }}>{item.tags.slice(0, 4).map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
              </article>
            ))}
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
            {active.summary ? <section style={{ marginTop: 18 }}><div className="section-title">案例摘要</div><div className="pre muted">{active.summary}</div></section> : null}
            <section style={{ marginTop: 18 }}><div className="section-title">适用标签</div><div className="tag-list">{active.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div></section>
            <section style={{ marginTop: 18 }}><div className="section-title">案例正文</div><div className="pre">{active.content}</div></section>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
