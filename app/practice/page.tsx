"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeResponse } from "@/types";
import { AppShell } from "@/components/app-shell";

const CASE_TYPES = ["爱情", "桃花", "财富", "事业", "健康", "选择", "对比", "运势", "其他自定义"];
const SPREAD_TYPES = ["线性牌阵", "十字牌阵", "九宫格牌阵", "对比牌阵", "H牌阵", "金字塔牌阵", "大桌牌阵", "其他自定义牌阵"];
const READING_METHODS = ["组合法", "顺序法", "主题牌法", "时间法", "其他自定义方法"];

type FormState = {
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

const STORAGE_KEY = "lenormand-practice-draft";

const emptyForm: FormState = {
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

export default function PracticePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse["user"]>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loadedDraft, setLoadedDraft] = useState(false);

  useEffect(() => {
    async function init() {
      const res = await fetch("/api/auth/me");
      if (res.status === 401) return router.push("/login");
      const data = await res.json();
      setMe(data.user);

      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Partial<FormState>;
          setForm((prev) => ({ ...prev, ...parsed }));
          setLoadedDraft(true);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    }
    void init();
  }, [router]);

  useEffect(() => {
    if (!me) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form, me]);

  const completeness = useMemo(() => {
    const checks = [
      !!form.question.trim(),
      !!form.background.trim(),
      !!form.cardsAndClarifiers.trim(),
      !!form.detailedAnalysis.trim(),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form]);

  function resetAll() {
    setForm(emptyForm);
    setMessage("");
    window.localStorage.removeItem(STORAGE_KEY);
    setLoadedDraft(false);
  }

  async function saveToCases(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/personal-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMessage(data.message || "保存失败，请检查必填项");
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
    setMessage("练习已保存到个人案例库");
    router.push("/personal-cases?highlight=" + data.item.id);
  }

  if (!me) return <div className="container">加载中...</div>;

  return (
    <AppShell user={me}>
      <section className="card" style={{ padding: 24, marginBottom: 18 }}>
        <div className="badge">今日练习</div>
        <h1 className="page-title" style={{ marginTop: 14 }}>一次完整抽牌练习</h1>
        <p className="muted">这里不强调复杂功能，而是帮你用最顺手的方式完成一次真实问题的抽牌、记录与解读，再沉淀到个人案例库。</p>
        <div className="stat-grid" style={{ marginTop: 16 }}>
          <div className="stat-box"><div className="muted-sm">练习完成度</div><div className="stat-value">{completeness}%</div></div>
          <div className="stat-box"><div className="muted-sm">推荐耗时</div><div className="stat-value" style={{ fontSize: 24 }}>5–10 分钟</div></div>
          <div className="stat-box"><div className="muted-sm">保存后去向</div><div className="muted" style={{ marginTop: 8 }}>自动进入个人案例库，可继续整理或投稿</div></div>
          <div className="stat-box"><div className="muted-sm">草稿恢复</div><div className="muted" style={{ marginTop: 8 }}>{loadedDraft ? "已为你恢复上次未保存内容" : "当前没有本地草稿"}</div></div>
        </div>
      </section>

      <section className="card" style={{ padding: 24, marginBottom: 18 }}>
        <div className="badge">练习建议</div>
        <div className="list" style={{ marginTop: 16 }}>
          <div className="info-banner">1. 先写真实问题，不要只写关键词，这样后面复盘才有价值。</div>
          <div className="info-banner">2. 牌面＋补牌建议按抽牌顺序记录，后面更容易回看你的思路路径。</div>
          <div className="info-banner">3. 案例详解可以先写初判，再补充推演逻辑、转折点与验证思路。</div>
        </div>
      </section>

      <section className="card" style={{ padding: 24 }}>
        <div className="badge">练习记录表</div>
        <h2 className="section-title" style={{ marginTop: 14 }}>完成后直接保存到个人案例库</h2>
        <form onSubmit={saveToCases} style={{ display: "grid", gap: 14, marginTop: 18 }}>
          <div>
            <label className="label">1️⃣ 这次你想问什么？</label>
            <textarea className="textarea" rows={3} placeholder="例如：未来三个月这段关系会不会重新联系？" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
          </div>
          <div>
            <label className="label">2️⃣ 问题属于哪一类？</label>
            <select className="select" value={form.caseType} onChange={(e) => setForm({ ...form, caseType: e.target.value })}>
              {CASE_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {form.caseType === "其他自定义" ? <input className="input" style={{ marginTop: 10 }} placeholder="填写自定义案例类型" value={form.caseTypeCustom} onChange={(e) => setForm({ ...form, caseTypeCustom: e.target.value })} /> : null}
          </div>
          <div>
            <label className="label">3️⃣ 背景信息</label>
            <textarea className="textarea" rows={4} placeholder="补充关系阶段、事件起因、时间背景、双方状态等。" value={form.background} onChange={(e) => setForm({ ...form, background: e.target.value })} />
          </div>
          <div>
            <label className="label">4️⃣ 牌面＋补牌</label>
            <textarea className="textarea" rows={4} placeholder="按顺序记录，例如：骑士-云-花束，补牌：蛇。" value={form.cardsAndClarifiers} onChange={(e) => setForm({ ...form, cardsAndClarifiers: e.target.value })} />
          </div>
          <div className="case-columns" style={{ alignItems: "start" }}>
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
          </div>
          <div>
            <label className="label">7️⃣ 答案反馈 / 后续验证</label>
            <textarea className="textarea" rows={4} placeholder="如果暂时还没有反馈，可以先留空，后面回来补。" value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} />
          </div>
          <div>
            <label className="label">8️⃣ 你的详细解读</label>
            <textarea className="textarea" rows={10} placeholder="建议写出：核心判断、链路拆解、组合关系、可能误区、后续观察点。" value={form.detailedAnalysis} onChange={(e) => setForm({ ...form, detailedAnalysis: e.target.value })} />
          </div>

          {message ? <div className="info-banner">{message}</div> : null}

          <div className="item-actions">
            <button className="btn btn-primary" disabled={saving}>{saving ? "保存中..." : "保存到个人案例库"}</button>
            <button type="button" className="btn btn-secondary" onClick={resetAll}>清空练习</button>
            <button type="button" className="btn btn-secondary" onClick={() => router.push("/personal-cases?filter=draft")}>查看我的草稿</button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
