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
  sharedCase?: { id: string; status: "PUBLISHED" | "UNPUBLISHED"; updatedAt: string } | null;
  user: { id: string; username: string; role: string };
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

type SharedCaseRow = {
  id: string;
  title: string;
  category: string | null;
  tags: string[];
  summary: string | null;
  content: string;
  status: "PUBLISHED" | "UNPUBLISHED";
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  sourceSubmissionId: string;
  sourcePersonalCaseId: string;
  sourceUserId: string;
  submission: {
    id: string;
    status: string;
    reviewNote: string | null;
    createdAt: string;
    updatedAt: string;
    user: { id: string; username: string; role: string };
    personalCase: {
      id: string;
      question: string | null;
      cardsAndClarifiers: string | null;
      background: string | null;
      detailedAnalysis: string | null;
      feedback: string | null;
      spreadType: string | null;
      readingMethod: string | null;
      caseType: string | null;
    };
  };
};

type SharedCaseEditor = {
  title: string;
  category: string;
  tags: string;
  summary: string;
  content: string;
  status: "PUBLISHED" | "UNPUBLISHED";
  question: string;
  cardsAndClarifiers: string;
  background: string;
  detailedAnalysis: string;
  feedback: string;
  spreadType: string;
  readingMethod: string;
  caseType: string;
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
function makeEditor(item: SharedCaseRow): SharedCaseEditor {
  return {
    title: item.title || "",
    category: item.category || "",
    tags: item.tags.join("，"),
    summary: item.summary || "",
    content: item.content || "",
    status: item.status,
    question: item.submission.personalCase.question || "",
    cardsAndClarifiers: item.submission.personalCase.cardsAndClarifiers || "",
    background: item.submission.personalCase.background || "",
    detailedAnalysis: item.submission.personalCase.detailedAnalysis || "",
    feedback: item.submission.personalCase.feedback || "",
    spreadType: item.submission.personalCase.spreadType || "",
    readingMethod: item.submission.personalCase.readingMethod || "",
    caseType: item.submission.personalCase.caseType || "",
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse["user"]>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [sharedCases, setSharedCases] = useState<SharedCaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<"overview" | "users" | "reviews" | "shared">("overview");
  const [reviewTab, setReviewTab] = useState<"pending" | "all">("pending");
  const [sharedFilter, setSharedFilter] = useState<"all" | "published" | "hidden">("all");
  const [sharedQuery, setSharedQuery] = useState("");
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [activeSharedCase, setActiveSharedCase] = useState<SharedCaseRow | null>(null);
  const [sharedDraft, setSharedDraft] = useState<SharedCaseEditor | null>(null);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "STUDENT" });
  const [rewardDays, setRewardDays] = useState<Record<string, number>>({});
  const [editAccess, setEditAccess] = useState<Record<string, { role: UserRow["role"]; permanent: boolean; expiresAt: string; status: UserRow["status"] }>>({});

  async function loadAll() {
    const [meRes, usersRes, submissionsRes, sharedRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/admin/users"),
      fetch("/api/admin/submissions"),
      fetch("/api/admin/shared-cases"),
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
    const sharedData = await sharedRes.json();
    setMe(meData.user);
    setUsers(usersData.items || []);
    setSubmissions(submissionsData.items || []);
    setSharedCases(sharedData.items || []);
    const accessMap: Record<string, { role: UserRow["role"]; permanent: boolean; expiresAt: string; status: UserRow["status"] }> = {};
    (usersData.items || []).forEach((u: UserRow) => {
      accessMap[u.id] = {
        role: u.role,
        permanent: !!u.sharedAccessPermanent,
        expiresAt: toDateInput(u.sharedAccessUntil),
        status: u.status,
      };
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
    publishedShared: sharedCases.filter((item) => item.status === "PUBLISHED").length,
    hiddenShared: sharedCases.filter((item) => item.status === "UNPUBLISHED").length,
  }), [users, submissions, sharedCases]);

  const visibleSubmissions = useMemo(
    () => reviewTab === "pending" ? submissions.filter((s) => s.status === "PENDING") : submissions,
    [submissions, reviewTab],
  );

  const visibleSharedCases = useMemo(() => {
    let list = sharedCases;
    if (sharedFilter === "published") list = list.filter((item) => item.status === "PUBLISHED");
    if (sharedFilter === "hidden") list = list.filter((item) => item.status === "UNPUBLISHED");
    if (!sharedQuery.trim()) return list;
    const q = sharedQuery.trim();
    return list.filter((item) => [
      item.title,
      item.category || "",
      item.summary || "",
      item.content || "",
      item.tags.join(" "),
      item.submission.user.username,
      item.submission.personalCase.question || "",
      item.submission.personalCase.cardsAndClarifiers || "",
    ].some((field) => field.includes(q)));
  }, [sharedCases, sharedFilter, sharedQuery]);

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
    setActiveSubmission(null);
    setMainTab("shared");
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
    setActiveSubmission(null);
  }

  async function republishSubmission(id: string) {
    const res = await fetch(`/api/admin/submissions/${id}/publish`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "重新发布失败");
      return;
    }
    await loadAll();
    setMainTab("shared");
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
        status: draft.status,
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

  function openSharedCaseEditor(item: SharedCaseRow) {
    setActiveSharedCase(item);
    setSharedDraft(makeEditor(item));
  }

  async function saveSharedCase() {
    if (!activeSharedCase || !sharedDraft) return;
    const res = await fetch(`/api/admin/shared-cases/${activeSharedCase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...sharedDraft,
        category: sharedDraft.category || null,
        summary: sharedDraft.summary || null,
        question: sharedDraft.question || null,
        cardsAndClarifiers: sharedDraft.cardsAndClarifiers || null,
        background: sharedDraft.background || null,
        detailedAnalysis: sharedDraft.detailedAnalysis || null,
        feedback: sharedDraft.feedback || null,
        spreadType: sharedDraft.spreadType || null,
        readingMethod: sharedDraft.readingMethod || null,
        caseType: sharedDraft.caseType || null,
        tags: sharedDraft.tags.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "保存共享案例失败");
      return;
    }
    await loadAll();
    setActiveSharedCase(null);
    setSharedDraft(null);
  }

  async function toggleSharedCaseStatus(item: SharedCaseRow) {
    const res = await fetch(`/api/admin/shared-cases/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: item.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED" }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "状态切换失败");
      return;
    }
    await loadAll();
  }

  async function deleteSharedCase(item: SharedCaseRow) {
    if (!confirm(`确认删除共享案例《${item.title}》？删除后学生端将不再可见。`)) return;
    const res = await fetch(`/api/admin/shared-cases/${item.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "删除失败");
      return;
    }
    await loadAll();
    if (activeSharedCase?.id === item.id) {
      setActiveSharedCase(null);
      setSharedDraft(null);
    }
  }

  if (loading || !me) return <div className="container">加载中...</div>;

  return (
    <AppShell user={me}>
      <section className="card" style={{ padding: 24, marginBottom: 18 }}>
        <div className="badge">管理员后台</div>
        <h1 className="page-title" style={{ marginTop: 14 }}>共享案例完整后台</h1>
        <p className="muted">这版把后台补成完整闭环：学员管理、投稿审核、共享案例编辑/下架/删除都在一个后台里。管理员现在可以直接维护学生端看到的共享案例内容。</p>
        <div className="stat-grid" style={{ marginTop: 16 }}>
          <div className="stat-box"><div className="muted-sm">用户总数</div><div className="stat-value">{stats.users}</div></div>
          <div className="stat-box"><div className="muted-sm">付费学员</div><div className="stat-value">{stats.paid}</div></div>
          <div className="stat-box"><div className="muted-sm">待审核投稿</div><div className="stat-value">{stats.pending}</div></div>
          <div className="stat-box"><div className="muted-sm">已发布共享案例</div><div className="stat-value">{stats.publishedShared}</div></div>
          <div className="stat-box"><div className="muted-sm">已下架共享案例</div><div className="stat-value">{stats.hiddenShared}</div></div>
        </div>
        <div className="filter-row" style={{ marginTop: 18 }}>
          <button className={`filter-chip ${mainTab === "overview" ? "active" : ""}`} onClick={() => setMainTab("overview")}>总览</button>
          <button className={`filter-chip ${mainTab === "users" ? "active" : ""}`} onClick={() => setMainTab("users")}>学员管理</button>
          <button className={`filter-chip ${mainTab === "reviews" ? "active" : ""}`} onClick={() => setMainTab("reviews")}>投稿审核</button>
          <button className={`filter-chip ${mainTab === "shared" ? "active" : ""}`} onClick={() => setMainTab("shared")}>共享案例管理</button>
        </div>
      </section>

      {mainTab === "overview" ? (
        <div className="cards-grid three" style={{ marginBottom: 18 }}>
          <section className="card" style={{ padding: 22 }}>
            <div className="section-title">后台现状</div>
            <div className="muted" style={{ marginTop: 10, lineHeight: 1.9 }}>
              现在管理员已经可以创建账号、调整共享案例阅读权限、审核学生投稿、重新发布已通过投稿，以及直接编辑学生端展示的共享案例内容。
            </div>
          </section>
          <section className="card" style={{ padding: 22 }}>
            <div className="section-title">本周最应该处理</div>
            <div className="muted" style={{ marginTop: 10, lineHeight: 1.9 }}>
              待审核投稿 {stats.pending} 条；已下架共享案例 {stats.hiddenShared} 条。你可以先去“投稿审核”处理新增，再到“共享案例管理”精修文案。
            </div>
          </section>
          <section className="card" style={{ padding: 22 }}>
            <div className="section-title">后台动作建议</div>
            <div className="muted" style={{ marginTop: 10, lineHeight: 1.9 }}>
              先审案例，再发布到共享库，最后在共享案例管理里统一改标题、问题、牌面、答案与标签，这样学生端会更整洁。
            </div>
          </section>
        </div>
      ) : null}

      {mainTab === "users" ? (
        <div className="case-columns" style={{ marginBottom: 18 }}>
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
          </section>

          <section className="card" style={{ padding: 24 }}>
            <div className="badge">账号列表</div>
            <div className="list" style={{ marginTop: 16 }}>
              {users.map((u) => {
                const draft = editAccess[u.id] || { role: u.role, permanent: !!u.sharedAccessPermanent, expiresAt: toDateInput(u.sharedAccessUntil), status: u.status };
                return (
                  <div key={u.id} className="card" style={{ padding: 16, borderRadius: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{u.username}</div>
                        <div className="muted-sm" style={{ marginTop: 6 }}>创建时间：{fmt(u.createdAt)} · 共享权限：{u.sharedAccessPermanent ? "永久可读" : fmt(u.sharedAccessUntil)}</div>
                      </div>
                      <div className={`mini-badge ${u.role === "PAID_STUDENT" ? "approved" : u.role === "ADMIN" ? "pending" : "draft"}`}>{u.role}</div>
                    </div>
                    <div className="grid grid-2" style={{ gap: 10, marginTop: 12 }}>
                      <div>
                        <label className="label">用户角色</label>
                        <select className="select" value={draft.role} onChange={(e) => setEditAccess({ ...editAccess, [u.id]: { ...draft, role: e.target.value as UserRow["role"] } })}>
                          <option value="STUDENT">普通学员</option>
                          <option value="PAID_STUDENT">付费学员</option>
                          <option value="ADMIN">管理员</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">账号状态</label>
                        <select className="select" value={draft.status} onChange={(e) => setEditAccess({ ...editAccess, [u.id]: { ...draft, status: e.target.value as UserRow["status"] } })}>
                          <option value="ACTIVE">启用</option>
                          <option value="DISABLED">禁用</option>
                        </select>
                      </div>
                    </div>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
                      <input type="checkbox" checked={draft.permanent} onChange={(e) => setEditAccess({ ...editAccess, [u.id]: { ...draft, permanent: e.target.checked } })} />
                      <span className="muted">共享案例库长期有效</span>
                    </label>
                    {!draft.permanent ? (
                      <div style={{ marginTop: 12 }}>
                        <label className="label">共享库到期时间</label>
                        <input className="input" type="datetime-local" value={draft.expiresAt} onChange={(e) => setEditAccess({ ...editAccess, [u.id]: { ...draft, expiresAt: e.target.value } })} />
                      </div>
                    ) : null}
                    <div className="item-actions">
                      <button className="btn btn-secondary" onClick={() => adjustAccess(u.id, 1)}>+1 天</button>
                      <button className="btn btn-secondary" onClick={() => adjustAccess(u.id, 7)}>+7 天</button>
                      <button className="btn btn-danger" onClick={() => adjustAccess(u.id, -1)}>-1 天</button>
                      <button className="btn btn-primary" onClick={() => saveUserAccess(u.id)}>保存设置</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {mainTab === "reviews" ? (
        <section className="card" style={{ padding: 24, marginBottom: 18 }}>
          <div className="badge">投稿审核</div>
          <h2 className="section-title" style={{ marginTop: 14 }}>共享案例审核池</h2>
          <div className="filter-row">
            <button className={`filter-chip ${reviewTab === "pending" ? "active" : ""}`} onClick={() => setReviewTab("pending")}>只看待审核</button>
            <button className={`filter-chip ${reviewTab === "all" ? "active" : ""}`} onClick={() => setReviewTab("all")}>查看全部记录</button>
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
                  <button className="btn btn-secondary" onClick={() => setActiveSubmission(s)}>查看全文</button>
                  {s.status === "PENDING" ? <button className="btn btn-primary" onClick={() => approve(s.id)}>审核通过</button> : null}
                  {s.status === "PENDING" ? <button className="btn btn-danger" onClick={() => reject(s.id)}>驳回</button> : null}
                  {s.status === "APPROVED" && !s.sharedCase ? <button className="btn btn-primary" onClick={() => republishSubmission(s.id)}>重新发布到共享库</button> : null}
                  {s.sharedCase ? <div className="mini-badge approved">共享库中</div> : null}
                </div>
                {s.status !== "PENDING" ? <div className="muted-sm">{s.reviewNote || "已处理，无备注"}</div> : null}
              </article>
            ))}
            {!visibleSubmissions.length ? <div className="muted">当前没有待处理投稿。</div> : null}
          </div>
        </section>
      ) : null}

      {mainTab === "shared" ? (
        <section className="card" style={{ padding: 24, marginBottom: 18 }}>
          <div className="badge">共享案例管理</div>
          <h2 className="section-title" style={{ marginTop: 14 }}>编辑 / 下架 / 删除共享案例</h2>
          <div className="filter-row" style={{ marginTop: 12 }}>
            <button className={`filter-chip ${sharedFilter === "all" ? "active" : ""}`} onClick={() => setSharedFilter("all")}>全部</button>
            <button className={`filter-chip ${sharedFilter === "published" ? "active" : ""}`} onClick={() => setSharedFilter("published")}>已发布</button>
            <button className={`filter-chip ${sharedFilter === "hidden" ? "active" : ""}`} onClick={() => setSharedFilter("hidden")}>已下架</button>
            <input className="input" style={{ minWidth: 260, flex: 1 }} placeholder="搜标题 / 提问 / 投稿人 / 标签" value={sharedQuery} onChange={(e) => setSharedQuery(e.target.value)} />
          </div>
          <div className="list" style={{ marginTop: 16 }}>
            {visibleSharedCases.map((item) => (
              <article key={item.id} className="card" style={{ padding: 18, borderRadius: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{item.title}</div>
                    <div className="muted-sm" style={{ marginTop: 6 }}>投稿人：{item.submission.user.username} · 更新时间：{fmt(item.updatedAt)} · 发布：{fmt(item.publishedAt)}</div>
                  </div>
                  <div className={`mini-badge ${item.status === "PUBLISHED" ? "approved" : "draft"}`}>{item.status === "PUBLISHED" ? "已发布" : "已下架"}</div>
                </div>
                <div className="muted" style={{ marginTop: 10 }}>{item.submission.personalCase.question || item.summary || "暂无提问摘要"}</div>
                <div className="tag-list" style={{ marginTop: 10 }}>{item.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
                <div className="item-actions">
                  <button className="btn btn-secondary" onClick={() => openSharedCaseEditor(item)}>编辑案例</button>
                  <button className="btn btn-primary" onClick={() => toggleSharedCaseStatus(item)}>{item.status === "PUBLISHED" ? "下架" : "重新上架"}</button>
                  <button className="btn btn-danger" onClick={() => deleteSharedCase(item)}>删除</button>
                </div>
              </article>
            ))}
            {!visibleSharedCases.length ? <div className="muted">当前没有匹配的共享案例。</div> : null}
          </div>
        </section>
      ) : null}

      {activeSubmission ? (
        <div className="modal-backdrop" onClick={() => setActiveSubmission(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="badge">投稿详情</div>
                <h2 className="page-title" style={{ marginTop: 12 }}>{activeSubmission.personalCase.question || activeSubmission.personalCase.title}</h2>
                <div className="muted">投稿人：{activeSubmission.user.username} · {activeSubmission.user.role} · {fmt(activeSubmission.createdAt)}</div>
              </div>
              <button className="modal-close" onClick={() => setActiveSubmission(null)}>×</button>
            </div>
            <section style={{ marginTop: 18 }}><div className="section-title">案例类型 / 牌阵 / 方法</div><div className="pre muted">{activeSubmission.personalCase.caseType || activeSubmission.personalCase.category || "未分类"} / {activeSubmission.personalCase.spreadType || "未设牌阵"} / {activeSubmission.personalCase.readingMethod || "未设方法"}</div></section>
            {activeSubmission.personalCase.background ? <section style={{ marginTop: 18 }}><div className="section-title">案例背景</div><div className="pre muted">{activeSubmission.personalCase.background}</div></section> : null}
            {activeSubmission.personalCase.cardsAndClarifiers ? <section style={{ marginTop: 18 }}><div className="section-title">牌面＋补牌</div><div className="pre">{activeSubmission.personalCase.cardsAndClarifiers}</div></section> : null}
            {activeSubmission.personalCase.feedback ? <section style={{ marginTop: 18 }}><div className="section-title">答案反馈</div><div className="pre muted">{activeSubmission.personalCase.feedback}</div></section> : null}
            <section style={{ marginTop: 18 }}><div className="section-title">案例详解</div><div className="pre">{activeSubmission.personalCase.detailedAnalysis || activeSubmission.personalCase.content}</div></section>
            {activeSubmission.status === "PENDING" ? (
              <div style={{ marginTop: 18 }}>
                <label className="label">审核通过后奖励天数</label>
                <input className="input" type="number" min={0} max={365} value={rewardDays[activeSubmission.id] ?? 1} onChange={(e) => setRewardDays({ ...rewardDays, [activeSubmission.id]: Number(e.target.value || 0) })} />
                <div className="item-actions" style={{ marginTop: 18 }}>
                  <button className="btn btn-primary" onClick={() => approve(activeSubmission.id)}>审核通过</button>
                  <button className="btn btn-danger" onClick={() => reject(activeSubmission.id)}>驳回</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeSharedCase && sharedDraft ? (
        <div className="modal-backdrop" onClick={() => { setActiveSharedCase(null); setSharedDraft(null); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="badge">共享案例编辑</div>
                <h2 className="page-title" style={{ marginTop: 12 }}>{activeSharedCase.title}</h2>
                <div className="muted">编辑后将直接影响学生端展示内容。</div>
              </div>
              <button className="modal-close" onClick={() => { setActiveSharedCase(null); setSharedDraft(null); }}>×</button>
            </div>
            <div className="grid" style={{ gap: 12, marginTop: 18 }}>
              <div><label className="label">案例标题</label><input className="input" value={sharedDraft.title} onChange={(e) => setSharedDraft({ ...sharedDraft, title: e.target.value })} /></div>
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div><label className="label">分类</label><input className="input" value={sharedDraft.category} onChange={(e) => setSharedDraft({ ...sharedDraft, category: e.target.value })} /></div>
                <div><label className="label">显示状态</label><select className="select" value={sharedDraft.status} onChange={(e) => setSharedDraft({ ...sharedDraft, status: e.target.value as SharedCaseEditor["status"] })}><option value="PUBLISHED">已发布</option><option value="UNPUBLISHED">已下架</option></select></div>
              </div>
              <div><label className="label">标签（逗号分隔）</label><input className="input" value={sharedDraft.tags} onChange={(e) => setSharedDraft({ ...sharedDraft, tags: e.target.value })} /></div>
              <div><label className="label">学生端问题</label><textarea className="textarea" value={sharedDraft.question} onChange={(e) => setSharedDraft({ ...sharedDraft, question: e.target.value })} /></div>
              <div><label className="label">牌面＋补牌</label><textarea className="textarea" value={sharedDraft.cardsAndClarifiers} onChange={(e) => setSharedDraft({ ...sharedDraft, cardsAndClarifiers: e.target.value })} /></div>
              <div><label className="label">案例背景</label><textarea className="textarea" value={sharedDraft.background} onChange={(e) => setSharedDraft({ ...sharedDraft, background: e.target.value })} /></div>
              <div className="grid grid-3" style={{ gap: 12 }}>
                <div><label className="label">案例类型</label><input className="input" value={sharedDraft.caseType} onChange={(e) => setSharedDraft({ ...sharedDraft, caseType: e.target.value })} /></div>
                <div><label className="label">牌阵</label><input className="input" value={sharedDraft.spreadType} onChange={(e) => setSharedDraft({ ...sharedDraft, spreadType: e.target.value })} /></div>
                <div><label className="label">解牌方法</label><input className="input" value={sharedDraft.readingMethod} onChange={(e) => setSharedDraft({ ...sharedDraft, readingMethod: e.target.value })} /></div>
              </div>
              <div><label className="label">案例摘要</label><textarea className="textarea" value={sharedDraft.summary} onChange={(e) => setSharedDraft({ ...sharedDraft, summary: e.target.value })} /></div>
              <div><label className="label">答案反馈</label><textarea className="textarea" value={sharedDraft.feedback} onChange={(e) => setSharedDraft({ ...sharedDraft, feedback: e.target.value })} /></div>
              <div><label className="label">学生端完整答案 / 解读</label><textarea className="textarea" style={{ minHeight: 220 }} value={sharedDraft.detailedAnalysis} onChange={(e) => setSharedDraft({ ...sharedDraft, detailedAnalysis: e.target.value })} /></div>
              <div><label className="label">备用正文内容</label><textarea className="textarea" style={{ minHeight: 180 }} value={sharedDraft.content} onChange={(e) => setSharedDraft({ ...sharedDraft, content: e.target.value })} /></div>
            </div>
            <div className="item-actions" style={{ marginTop: 18 }}>
              <button className="btn btn-primary" onClick={() => saveSharedCase()}>保存共享案例</button>
              <button className="btn btn-secondary" onClick={() => toggleSharedCaseStatus(activeSharedCase)}>{activeSharedCase.status === "PUBLISHED" ? "先下架" : "重新上架"}</button>
              <button className="btn btn-danger" onClick={() => deleteSharedCase(activeSharedCase)}>删除案例</button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
