"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeResponse } from "@/types";
import { AppShell } from "@/components/app-shell";

type UserRow = {
  id: string;
  username: string;
  role: "ADMIN" | "STUDENT" | "PAID_STUDENT";
  status: "ACTIVE" | "DISABLED";
  sharedAccessUntil: string | null;
  sharedAccessPermanent?: boolean;
  createdAt: string;
};

type Submission = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
  user: { username: string; role: string };
  personalCase: {
    id: string;
    title: string;
    category: string | null;
    summary: string | null;
    content: string;
    question?: string | null;
    caseType?: string | null;
    background?: string | null;
    cardsAndClarifiers?: string | null;
    spreadType?: string | null;
    readingMethod?: string | null;
    feedback?: string | null;
    detailedAnalysis?: string | null;
    tags: string[];
  };
};

function fmt(dt?: string | Date | null) {
  return dt ? new Date(dt).toLocaleString("zh-CN") : "—";
}
function toDateInput(dt?: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse["user"]>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [active, setActive] = useState<Submission | null>(null);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "STUDENT" });
  const [rewardDays, setRewardDays] = useState<Record<string, number>>({});
  const [editAccess, setEditAccess] = useState<Record<string, { role: UserRow["role"]; permanent: boolean; expiresAt: string }>>({});

  async function loadAll() {
    const [meRes, usersRes, submissionsRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/admin/users"),
      fetch("/api/admin/submissions"),
    ]);

    if (meRes.status === 401) {
      router.push("/login");
      return;
    }
    const meData = await meRes.json();
    if (meData.user?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }

    const usersData = await usersRes.json();
    const submissionsData = await submissionsRes.json();
    setMe(meData.user);
    setUsers(usersData.items || []);
    setSubmissions(submissionsData.items || []);
    const accessMap: Record<string, { role: UserRow["role"]; permanent: boolean; expiresAt: string }> = {};
    (usersData.items || []).forEach((u: UserRow) => {
      accessMap[u.id] = { role: u.role, permanent: !!u.sharedAccessPermanent, expiresAt: toDateInput(u.sharedAccessUntil) };
    });
    setEditAccess(accessMap);
    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const stats = useMemo(() => ({
    users: users.length,
    paid: users.filter((u) => u.role === "PAID_STUDENT").length,
    pending: submissions.filter((s) => s.status === "PENDING").length,
    approved: submissions.filter((s) => s.status === "APPROVED").length,
    rejected: submissions.filter((s) => s.status === "REJECTED").length,
  }), [users, submissions]);

  const visibleSubmissions = useMemo(() => tab === "pending" ? submissions.filter((s) => s.status === "PENDING") : submissions, [submissions, tab]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "创建失败");
      return;
    }
    setNewUser({ username: "", password: "", role: "STUDENT" });
    await loadAll();
  }

  async function approve(id: string) {
    const chosen = rewardDays[id] ?? 1;
    const res = await fetch(`/api/admin/submissions/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewardDays: chosen }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "审核失败");
      return;
    }
    await loadAll();
    setActive(null);
  }

  async function reject(id: string) {
    const reviewNote = prompt("可选：填写驳回备注") || "";
    const res = await fetch(`/api/admin/submissions/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewNote }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "驳回失败");
      return;
    }
    await loadAll();
    setActive(null);
  }

  async function adjustAccess(id: string, days: number) {
    const res = await fetch(`/api/admin/users/${id}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "调整失败");
      return;
    }
    await loadAll();
  }

  async function saveUserAccess(userId: string) {
    const draft = editAccess[userId];
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: draft.role,
        sharedAccessPermanent: draft.permanent,
        sharedAccessUntil: draft.permanent ? null : (draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "保存失败");
      return;
    }
    await loadAll();
  }

  if (loading || !me) return <div className="container">加载中...</div>;

  return (
    <AppShell user={me}>
      <section className="card" style={{ padding: 24, marginBottom: 18 }}>
        <div className="badge">管理员后台</div>
        <h1 className="page-title" style={{ marginTop: 14 }}>审核投稿 · 自由控制权限与到期日</h1>
        <p className="muted">这一版把“付费学员”和“共享库到期日”从写死规则里拿出来了：你可以手动设置角色、长期有效、到期时间，也可以在审核投稿时自定义奖励天数。</p>
        <div className="stat-grid" style={{ marginTop: 16 }}>
          <div className="stat-box"><div className="muted-sm">用户总数</div><div className="stat-value">{stats.users}</div></div>
          <div className="stat-box"><div className="muted-sm">付费学员</div><div className="stat-value">{stats.paid}</div></div>
          <div className="stat-box"><div className="muted-sm">待审核投稿</div><div className="stat-value">{stats.pending}</div></div>
          <div className="stat-box"><div className="muted-sm">已通过投稿</div><div className="stat-value">{stats.approved}</div></div>
          <div className="stat-box"><div className="muted-sm">已驳回投稿</div><div className="stat-value">{stats.rejected}</div></div>
        </div>
      </section>

      <div className="case-columns">
        <section className="card" style={{ padding: 24 }}>
          <div className="badge">学员管理</div>
          <h2 className="section-title" style={{ marginTop: 14 }}>创建账号</h2>
          <form onSubmit={createUser} style={{ display: "grid", gap: 14, marginTop: 16 }}>
            <input className="input" placeholder="用户名" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
            <input className="input" type="password" placeholder="密码" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
            <select className="select" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
              <option value="STUDENT">普通学员</option>
              <option value="PAID_STUDENT">付费学员</option>
              <option value="ADMIN">管理员</option>
            </select>
            <button className="btn btn-primary">创建账号</button>
          </form>
          <hr className="sep" />
          <div className="list">
            {users.map((u) => {
              const draft = editAccess[u.id] || { role: u.role, permanent: !!u.sharedAccessPermanent, expiresAt: toDateInput(u.sharedAccessUntil) };
              return (
                <div key={u.id} className="card" style={{ padding: 16, borderRadius: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{u.username}</div>
                      <div className="muted-sm" style={{ marginTop: 6 }}>{u.status} · 当前权限：{u.sharedAccessPermanent ? "永久可读" : fmt(u.sharedAccessUntil)}</div>
                    </div>
                    <div className={`mini-badge ${u.role === "PAID_STUDENT" ? "approved" : u.role === "ADMIN" ? "pending" : "draft"}`}>{u.role}</div>
                  </div>
                  <div className="grid" style={{ gap: 10, marginTop: 12 }}>
                    <div>
                      <label className="label">用户角色</label>
                      <select className="select" value={draft.role} onChange={(e) => setEditAccess({ ...editAccess, [u.id]: { ...draft, role: e.target.value as UserRow["role"] } })}>
                        <option value="STUDENT">普通学员</option>
                        <option value="PAID_STUDENT">付费学员</option>
                        <option value="ADMIN">管理员</option>
                      </select>
                    </div>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={draft.permanent} onChange={(e) => setEditAccess({ ...editAccess, [u.id]: { ...draft, permanent: e.target.checked } })} />
                      <span className="muted">共享案例库长期有效</span>
                    </label>
                    {!draft.permanent ? (
                      <div>
                        <label className="label">共享库到期时间</label>
                        <input className="input" type="datetime-local" value={draft.expiresAt} onChange={(e) => setEditAccess({ ...editAccess, [u.id]: { ...draft, expiresAt: e.target.value } })} />
                      </div>
                    ) : null}
                  </div>
                  <div className="item-actions">
                    <button className="btn btn-secondary" onClick={() => adjustAccess(u.id, 1)}>+1 天</button>
                    <button className="btn btn-secondary" onClick={() => adjustAccess(u.id, 7)}>+7 天</button>
                    <button className="btn btn-danger" onClick={() => adjustAccess(u.id, -1)}>-1 天</button>
                    <button className="btn btn-secondary" onClick={() => setEditAccess({ ...editAccess, [u.id]: { ...draft, permanent: false, expiresAt: "" } })}>清空到期</button>
                    <button className="btn btn-primary" onClick={() => saveUserAccess(u.id)}>保存设置</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card" style={{ padding: 24 }}>
          <div className="badge">投稿审核</div>
          <h2 className="section-title" style={{ marginTop: 14 }}>共享案例审核池</h2>
          <div className="filter-row">
            <button className={`filter-chip ${tab === "pending" ? "active" : ""}`} onClick={() => setTab("pending")}>只看待审核</button>
            <button className={`filter-chip ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>查看全部记录</button>
          </div>
          <div className="list" style={{ marginTop: 16 }}>
            {visibleSubmissions.map((s) => (
              <article key={s.id} className="card" style={{ padding: 18, borderRadius: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{s.personalCase.question || s.personalCase.title}</div>
                    <div className="muted-sm" style={{ marginTop: 6 }}>投稿人：{s.user.username} · 角色：{s.user.role} · 时间：{fmt(s.createdAt)}</div>
                  </div>
                  <div className={`mini-badge ${s.status.toLowerCase()}`}>{s.status}</div>
                </div>
                <div className="muted" style={{ marginTop: 10 }}>{s.personalCase.caseType || s.personalCase.category || "未分类"} · {s.personalCase.spreadType || "未设牌阵"} · {s.personalCase.readingMethod || "未设方法"}</div>
                {s.personalCase.background ? <p className="muted" style={{ marginTop: 10 }}>{s.personalCase.background}</p> : null}
                <div className="tag-list" style={{ marginTop: 10 }}>{s.personalCase.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
                {s.status === "PENDING" ? (
                  <div className="grid grid-2" style={{ gap: 10, marginTop: 12 }}>
                    <div>
                      <label className="label">审核通过后奖励天数</label>
                      <input className="input" type="number" min={0} max={365} value={rewardDays[s.id] ?? 1} onChange={(e) => setRewardDays({ ...rewardDays, [s.id]: Number(e.target.value || 0) })} />
                    </div>
                  </div>
                ) : null}
                <div className="item-actions">
                  <button className="btn btn-secondary" onClick={() => setActive(s)}>查看全文</button>
                  {s.status === "PENDING" ? <button className="btn btn-primary" onClick={() => approve(s.id)}>审核通过</button> : null}
                  {s.status === "PENDING" ? <button className="btn btn-danger" onClick={() => reject(s.id)}>驳回</button> : null}
                </div>
                {s.status !== "PENDING" ? <div className="muted-sm">{s.reviewNote || "已处理，无备注"}</div> : null}
              </article>
            ))}
            {!visibleSubmissions.length ? <div className="muted">当前没有待处理投稿。</div> : null}
          </div>
        </section>
      </div>

      {active ? (
        <div className="modal-backdrop" onClick={() => setActive(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="badge">投稿详情</div>
                <h2 className="page-title" style={{ marginTop: 12 }}>{active.personalCase.question || active.personalCase.title}</h2>
                <div className="muted">投稿人：{active.user.username} · {active.user.role} · {fmt(active.createdAt)}</div>
              </div>
              <button className="modal-close" onClick={() => setActive(null)}>×</button>
            </div>
            <section style={{ marginTop: 18 }}><div className="section-title">案例类型 / 牌阵 / 方法</div><div className="pre muted">{active.personalCase.caseType || active.personalCase.category || "未分类"} / {active.personalCase.spreadType || "未设牌阵"} / {active.personalCase.readingMethod || "未设方法"}</div></section>
            {active.personalCase.background ? <section style={{ marginTop: 18 }}><div className="section-title">案例背景</div><div className="pre muted">{active.personalCase.background}</div></section> : null}
            {active.personalCase.cardsAndClarifiers ? <section style={{ marginTop: 18 }}><div className="section-title">牌面＋补牌</div><div className="pre">{active.personalCase.cardsAndClarifiers}</div></section> : null}
            {active.personalCase.feedback ? <section style={{ marginTop: 18 }}><div className="section-title">答案反馈</div><div className="pre muted">{active.personalCase.feedback}</div></section> : null}
            <section style={{ marginTop: 18 }}><div className="section-title">案例详解</div><div className="pre">{active.personalCase.detailedAnalysis || active.personalCase.content}</div></section>
            {active.status === "PENDING" ? (
              <div style={{ marginTop: 18 }}>
                <label className="label">审核通过后奖励天数</label>
                <input className="input" type="number" min={0} max={365} value={rewardDays[active.id] ?? 1} onChange={(e) => setRewardDays({ ...rewardDays, [active.id]: Number(e.target.value || 0) })} />
                <div className="item-actions" style={{ marginTop: 18 }}>
                  <button className="btn btn-primary" onClick={() => approve(active.id)}>审核通过</button>
                  <button className="btn btn-danger" onClick={() => reject(active.id)}>驳回</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
