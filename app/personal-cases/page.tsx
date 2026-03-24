"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeResponse } from "@/types";
import { AppShell } from "@/components/app-shell";

const CASE_TYPES = ["爱情", "桃花", "财富", "事业", "健康", "选择", "对比", "运势", "其他自定义"];
const SPREAD_TYPES = ["线性牌阵", "十字牌阵", "九宫格牌阵", "对比牌阵", "H牌阵", "金字塔牌阵", "大桌牌阵", "其他自定义牌阵"];
const READING_METHODS = ["组合法", "顺序法", "主题牌法", "时间法", "其他自定义方法"];

type PersonalCase = {
  id: string;
  title: string;
  category: string | null;
  tags: string[];
  summary: string | null;
  content: string;
  question: string | null;
  caseType: string | null;
  caseTypeCustom: string | null;
  background: string | null;
  cardsAndClarifiers: string | null;
  spreadType: string | null;
  spreadTypeCustom: string | null;
  readingMethod: string | null;
  readingMethodCustom: string | null;
  feedback: string | null;
  detailedAnalysis: string | null;
  isSubmitted: boolean;
  createdAt: string;
  updatedAt: string;
};

type Submission = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
  personalCase: { id: string; title: string };
};

type FormState = {
  id: string;
  question: string;
  caseType: string;
  caseTypeCustom: string;
  background: string;
  cardsAndClarifiers: string;
  spreadType: string;
  spreadTypeCustom: string;
  readingMethod: string;
  readingMethodCustom: string;
  feedback: string;
  detailedAnalysis: string;
};

const emptyForm: FormState = {
  id: "",
  question: "",
  caseType: "爱情",
  caseTypeCustom: "",
  background: "",
  cardsAndClarifiers: "",
  spreadType: "线性牌阵",
  spreadTypeCustom: "",
  readingMethod: "组合法",
  readingMethodCustom: "",
  feedback: "",
  detailedAnalysis: "",
};

function fmt(dt?: string | null) {
  return dt ? new Date(dt).toLocaleString("zh-CN") : "—";
}

function resolveOption(value: string | null | undefined, list: string[], fallback: string) {
  if (!value) return fallback;
  return list.includes(value) ? value : fallback;
}

export default function PersonalCasesPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse["user"]>(null);
  const [items, setItems] = useState<PersonalCase[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [active, setActive] = useState<PersonalCase | null>(null);
  const [showEditor, setShowEditor] = useState(true);
  const [showList, setShowList] = useState(true);

  async function loadAll() {
    const [meRes, itemsRes, submissionsRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/personal-cases"),
      fetch("/api/submissions/mine"),
    ]);

    if (meRes.status === 401) {
      router.push("/login");
      return;
    }

    const meData = await meRes.json();
    const itemsData = await itemsRes.json();
    const submissionsData = await submissionsRes.json();
    setMe(meData.user);
    setItems(itemsData.items || []);
    setSubmissions(submissionsData.items || []);
    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const submissionMap = useMemo(() => {
    const map = new Map<string, Submission>();
    submissions.forEach((s) => map.set(s.personalCase.id, s));
    return map;
  }, [submissions]);

  const stats = useMemo(() => {
    const pending = submissions.filter((s) => s.status === "PENDING").length;
    const approved = submissions.filter((s) => s.status === "APPROVED").length;
    const rejected = submissions.filter((s) => s.status === "REJECTED").length;
    return { total: items.length, pending, approved, rejected };
  }, [items, submissions]);

  function resetForm() {
    setForm(emptyForm);
    setMessage("");
    setShowEditor(true);
  }

  async function saveCase(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      question: form.question,
      caseType: form.caseType,
      caseTypeCustom: form.caseTypeCustom || undefined,
      background: form.background || undefined,
      cardsAndClarifiers: form.cardsAndClarifiers || undefined,
      spreadType: form.spreadType,
      spreadTypeCustom: form.spreadTypeCustom || undefined,
      readingMethod: form.readingMethod,
      readingMethodCustom: form.readingMethodCustom || undefined,
      feedback: form.feedback || undefined,
      detailedAnalysis: form.detailedAnalysis || undefined,
    };

    const res = await fetch(form.id ? `/api/personal-cases/${form.id}` : "/api/personal-cases", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMessage(data.message || "保存失败");
      return;
    }

    setMessage(form.id ? "案例已更新" : "案例已创建");
    setForm(emptyForm);
    setShowEditor(false);
    setShowList(true);
    await loadAll();
  }

  function editCase(item: PersonalCase) {
    setForm({
      id: item.id,
      question: item.question || item.title,
      caseType: resolveOption(item.caseType, CASE_TYPES, "其他自定义"),
      caseTypeCustom: CASE_TYPES.includes(item.caseType || "") ? "" : item.caseType || item.caseTypeCustom || "",
      background: item.background || "",
      cardsAndClarifiers: item.cardsAndClarifiers || "",
      spreadType: resolveOption(item.spreadType, SPREAD_TYPES, "其他自定义牌阵"),
      spreadTypeCustom: SPREAD_TYPES.includes(item.spreadType || "") ? "" : item.spreadType || item.spreadTypeCustom || "",
      readingMethod: resolveOption(item.readingMethod, READING_METHODS, "其他自定义方法"),
      readingMethodCustom: READING_METHODS.includes(item.readingMethod || "") ? "" : item.readingMethod || item.readingMethodCustom || "",
      feedback: item.feedback || "",
      detailedAnalysis: item.detailedAnalysis || "",
    });
    setShowEditor(true);
    setShowList(false);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteCase(item: PersonalCase) {
    if (!confirm(`确认删除案例《${item.title}》吗？`)) return;
    const res = await fetch(`/api/personal-cases/${item.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "删除失败");
      return;
    }
    await loadAll();
  }

  async function submitCase(item: PersonalCase) {
    if (!confirm(`确认把《${item.title}》投稿到共享案例库审核池吗？`)) return;
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalCaseId: item.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "投稿失败");
      return;
    }
    await loadAll();
  }

  if (loading || !me) return <div className="container">加载中...</div>;

  return (
    <AppShell user={me}>
      <section className="card" style={{ padding: 24, marginBottom: 18 }}>
        <div className="badge">案例库工作台</div>
        <h1 className="page-title" style={{ marginTop: 14 }}>个人案例长期沉淀 · 共享案例按规则开放</h1>
        <p className="muted">这版不再追求完全像旧版，而是优先保证好用：个人案例按 8 个字段沉淀，新增案例和案例列表支持折叠切换；共享权限和到期日改成后台自由控制。</p>
        <div className="stat-grid" style={{ marginTop: 16 }}>
          <div className="stat-box"><div className="muted-sm">我的案例</div><div className="stat-value">{stats.total}</div></div>
          <div className="stat-box"><div className="muted-sm">审核中</div><div className="stat-value">{stats.pending}</div></div>
          <div className="stat-box"><div className="muted-sm">已通过</div><div className="stat-value">{stats.approved}</div></div>
          <div className="stat-box"><div className="muted-sm">已驳回</div><div className="stat-value">{stats.rejected}</div></div>
          <div className="stat-box"><div className="muted-sm">共享权限</div><div className="muted" style={{ marginTop: 8 }}>{me.sharedAccessPermanent ? "永久可读" : fmt(me.sharedAccessUntil)}</div></div>
        </div>
      </section>

      <div className="case-columns">
        <section className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div className="badge">我的个人案例库</div>
              <h2 className="section-title" style={{ marginTop: 14 }}>新增案例 / 编辑案例</h2>
            </div>
            <button className="btn btn-secondary" onClick={() => setShowEditor((v) => !v)}>{showEditor ? "折叠编辑区" : "展开编辑区"}</button>
          </div>
          {showEditor ? (
            <>
              <div className="info-banner" style={{ marginTop: 12 }}>
                新增案例时按固定字段沉淀；保存后会一直存在数据库。选了“其他自定义”时，会自动展开补充输入框。
              </div>
              <form onSubmit={saveCase} style={{ display: "grid", gap: 14, marginTop: 18 }}>
                <div>
                  <label className="label">1️⃣ 案例问题</label>
                  <textarea className="textarea" rows={3} placeholder="自由填写" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
                </div>
                <div>
                  <label className="label">2️⃣ 案例类型</label>
                  <select className="select" value={form.caseType} onChange={(e) => setForm({ ...form, caseType: e.target.value })}>
                    {CASE_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  {form.caseType === "其他自定义" ? <input className="input" style={{ marginTop: 10 }} placeholder="填写自定义案例类型" value={form.caseTypeCustom} onChange={(e) => setForm({ ...form, caseTypeCustom: e.target.value })} /> : null}
                </div>
                <div>
                  <label className="label">3️⃣ 案例背景</label>
                  <textarea className="textarea" rows={4} placeholder="例如：长期断联，女方求问复合，两人分手原因为 xxx" value={form.background} onChange={(e) => setForm({ ...form, background: e.target.value })} />
                </div>
                <div>
                  <label className="label">4️⃣ 牌面＋补牌</label>
                  <textarea className="textarea" rows={4} placeholder="自由填写" value={form.cardsAndClarifiers} onChange={(e) => setForm({ ...form, cardsAndClarifiers: e.target.value })} />
                </div>
                <div>
                  <label className="label">5️⃣ 牌阵</label>
                  <select className="select" value={form.spreadType} onChange={(e) => setForm({ ...form, spreadType: e.target.value })}>
                    {SPREAD_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  {form.spreadType === "其他自定义牌阵" ? <input className="input" style={{ marginTop: 10 }} placeholder="填写自定义牌阵" value={form.spreadTypeCustom} onChange={(e) => setForm({ ...form, spreadTypeCustom: e.target.value })} /> : null}
                </div>
                <div>
                  <label className="label">6️⃣ 解读方法</label>
                  <select className="select" value={form.readingMethod} onChange={(e) => setForm({ ...form, readingMethod: e.target.value })}>
                    {READING_METHODS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  {form.readingMethod === "其他自定义方法" ? <input className="input" style={{ marginTop: 10 }} placeholder="填写自定义解读方法" value={form.readingMethodCustom} onChange={(e) => setForm({ ...form, readingMethodCustom: e.target.value })} /> : null}
                </div>
                <div>
                  <label className="label">7️⃣ 答案反馈</label>
                  <textarea className="textarea" rows={4} placeholder="自由填写" value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} />
                </div>
                <div>
                  <label className="label">8️⃣ 案例详解</label>
                  <textarea className="textarea" rows={10} placeholder="比如：自我详细解读、解读拆分路径、思路复盘、避雷事项、常用牌与牌组合等" value={form.detailedAnalysis} onChange={(e) => setForm({ ...form, detailedAnalysis: e.target.value })} />
                </div>
                {message ? <div className="info-banner">{message}</div> : null}
                <div className="item-actions">
                  <button className="btn btn-primary" disabled={saving}>{saving ? "保存中..." : form.id ? "保存修改" : "保存到我的案例库"}</button>
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>清空表单</button>
                </div>
              </form>
            </>
          ) : null}
        </section>

        <section className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div className="badge">我的案例列表</div>
              <h2 className="section-title" style={{ marginTop: 14 }}>共 {items.length} 条</h2>
            </div>
            <button className="btn btn-secondary" onClick={() => setShowList((v) => !v)}>{showList ? "折叠列表" : "展开列表"}</button>
          </div>
          {showList ? (
            <div className="list" style={{ marginTop: 16 }}>
              {items.map((item) => {
                const submission = submissionMap.get(item.id);
                const statusText = submission?.status === "PENDING" ? "审核中" : submission?.status === "APPROVED" ? "已通过" : submission?.status === "REJECTED" ? "已驳回" : "未投稿";
                return (
                  <article key={item.id} className="card" style={{ padding: 18, borderRadius: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{item.question || item.title}</div>
                        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{item.caseType || item.category || "未分类"} · {item.spreadType || "未设牌阵"} · {item.readingMethod || "未设方法"}</div>
                      </div>
                      <div className={`mini-badge ${submission?.status?.toLowerCase() || "draft"}`}>{statusText}</div>
                    </div>
                    {item.background ? <p className="muted" style={{ marginTop: 10 }}>{item.background}</p> : null}
                    <div className="muted-sm" style={{ marginTop: 8 }}>最后更新：{fmt(item.updatedAt)}</div>
                    {submission ? <div className="muted-sm" style={{ marginTop: 8 }}>投稿记录：{fmt(submission.createdAt)} · {submission.reviewNote || "暂无审核备注"}</div> : null}
                    <div className="item-actions">
                      <button className="btn btn-secondary" onClick={() => setActive(item)}>查看详情</button>
                      <button className="btn btn-secondary" onClick={() => editCase(item)} disabled={item.isSubmitted}>编辑</button>
                      <button className="btn btn-danger" onClick={() => deleteCase(item)} disabled={item.isSubmitted}>删除</button>
                      <button className="btn btn-primary" onClick={() => submitCase(item)} disabled={item.isSubmitted || submission?.status === "APPROVED"}>投稿共享库</button>
                    </div>
                  </article>
                );
              })}
              {!items.length ? <div className="muted">你还没有自己的案例，先在左侧创建第一条吧。</div> : null}
            </div>
          ) : null}
        </section>
      </div>

      {active ? (
        <div className="modal-backdrop" onClick={() => setActive(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="badge">案例详情</div>
                <h2 className="page-title" style={{ marginTop: 12 }}>{active.question || active.title}</h2>
                <div className="muted">{active.caseType || active.category || "未分类"} · {active.spreadType || "未设牌阵"} · {active.readingMethod || "未设方法"}</div>
              </div>
              <button className="modal-close" onClick={() => setActive(null)}>×</button>
            </div>
            {active.background ? <section style={{ marginTop: 18 }}><div className="section-title">案例背景</div><div className="pre muted">{active.background}</div></section> : null}
            {active.cardsAndClarifiers ? <section style={{ marginTop: 18 }}><div className="section-title">牌面＋补牌</div><div className="pre">{active.cardsAndClarifiers}</div></section> : null}
            {active.feedback ? <section style={{ marginTop: 18 }}><div className="section-title">答案反馈</div><div className="pre muted">{active.feedback}</div></section> : null}
            {active.detailedAnalysis ? <section style={{ marginTop: 18 }}><div className="section-title">案例详解</div><div className="pre">{active.detailedAnalysis}</div></section> : null}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
