"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CARDS } from "@/lib/cards";
import { defaultProgress, loadProgress, type ProgressState } from "@/lib/client-progress";
import type { MeResponse } from "@/types";

type User = NonNullable<MeResponse["user"]>;

type PersonalCase = {
  id: string;
  title: string;
  question: string | null;
  summary: string | null;
  background: string | null;
  cardsAndClarifiers: string | null;
  detailedAnalysis: string | null;
  isSubmitted: boolean;
  createdAt: string;
  updatedAt: string;
};

type SharedCase = {
  id: string;
  title: string;
  category: string | null;
  tags: string[];
  summary: string | null;
  content: string;
  publishedAt: string;
};

function fmtDate(date?: string | Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function fmtDateTime(date?: string | Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function weekdayLabel() {
  return new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function isDraftCase(item: PersonalCase) {
  return !item.cardsAndClarifiers || !item.detailedAnalysis || !item.background;
}

function isSubmittableCase(item: PersonalCase) {
  return Boolean(
    item.title?.trim() &&
      item.question?.trim() &&
      item.background?.trim() &&
      item.cardsAndClarifiers?.trim() &&
      item.detailedAnalysis?.trim() &&
      !item.isSubmitted
  );
}

function withinLastDays(dateStr: string, days: number) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff <= days * 24 * 60 * 60 * 1000;
}

export function DashboardClient({ initialUser }: { initialUser: Omit<User, "canReadSharedCase"> & { canReadSharedCase?: boolean } }) {
  const [me, setMe] = useState<User>({ ...initialUser, canReadSharedCase: initialUser.canReadSharedCase ?? false } as User);
  const [progress, setProgress] = useState<ProgressState>(defaultProgress);
  const [cases, setCases] = useState<PersonalCase[]>([]);
  const [sharedCases, setSharedCases] = useState<SharedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharedLocked, setSharedLocked] = useState(false);

  useEffect(() => {
    setProgress(loadProgress(initialUser.username));

    async function load() {
      try {
        const [meRes, casesRes, sharedRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/personal-cases"),
          fetch("/api/shared-cases"),
        ]);

        if (meRes.ok) {
          const meData: MeResponse = await meRes.json();
          if (meData.user) setMe(meData.user);
        }

        if (casesRes.ok) {
          const casesData = await casesRes.json();
          setCases(casesData.items || []);
        }

        if (sharedRes.ok) {
          const sharedData = await sharedRes.json();
          setSharedCases(sharedData.items || []);
          setSharedLocked(false);
        } else {
          setSharedLocked(true);
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [initialUser.username]);

  const learnedCount = progress.mastered.length;
  const totalCards = CARDS.length;
  const favouriteCount = progress.favs.length;

  const todayCard = useMemo(() => {
    const nextUnmastered = CARDS.find((_, idx) => !progress.mastered.includes(idx));
    return nextUnmastered || CARDS[0];
  }, [progress.mastered]);

  const continueCard = useMemo(() => {
    if (progress.favs.length > 0) {
      return CARDS[progress.favs[0]];
    }
    if (progress.wrongIds.length > 0) {
      return CARDS[progress.wrongIds[0]];
    }
    return todayCard;
  }, [progress.favs, progress.wrongIds, todayCard]);

  const draftCases = useMemo(() => cases.filter(isDraftCase), [cases]);
  const submittableCases = useMemo(() => cases.filter(isSubmittableCase), [cases]);
  const weeklyPracticeCount = useMemo(() => cases.filter((item) => withinLastDays(item.updatedAt, 7)).length, [cases]);
  const latestCase = cases[0] || null;
  const latestDraft = draftCases[0] || null;
  const featuredSharedCase = sharedCases[0] || null;
  const latestApprovedCases = sharedCases.slice(1, 4);

  const accessText = me.sharedAccessPermanent
    ? "永久可读"
    : me.sharedAccessUntil
      ? `可读至 ${fmtDate(me.sharedAccessUntil)}`
      : "当前未开通";

  return (
    <AppShell user={me}>
      <section className="dashboard-hero dashboard-dreamscape card">
        <div className="dashboard-stars" aria-hidden="true">
          <span className="shooting-star shooting-star-1" />
          <span className="shooting-star shooting-star-2" />
          <span className="dream-orb dream-orb-1" />
          <span className="dream-orb dream-orb-2" />
        </div>
        <div>
          <div className="badge">月夜总揽</div>
          <div className="dashboard-overline">LENORMAND MOONLIT PATH · 进度、练习与案例沉淀一屏掌握</div>
          <h1 className="page-title" style={{ marginTop: 14 }}>不是机械打卡，而是在夜色里继续推进你的学习</h1>
          <p className="muted dashboard-hero-copy">
            {me.username}，今晚是 {weekdayLabel()}。你可以在这里继续学习牌义、补完个人案例、查看共享库权限与最近进度，让整条学习路径既梦幻也实用。
          </p>
          <div className="dashboard-hero-actions">
            <a className="btn btn-primary" href="#today-learning">开始今夜学习</a>
            <Link className="btn btn-secondary" href="/progress">查看学习进度</Link>
            <Link className="btn btn-secondary" href="/personal-cases">继续个人案例库</Link>
          </div>
        </div>
        <div className="dashboard-kpi-grid">
          <article className="dashboard-kpi-card">
            <div className="muted-sm">已掌握牌卡</div>
            <div className="dashboard-kpi-value">{learnedCount} / {totalCards}</div>
            <div className="muted-sm">收藏 {favouriteCount} 张，连续学习 {progress.streak} 天</div>
          </article>
          <article className="dashboard-kpi-card">
            <div className="muted-sm">本周练习</div>
            <div className="dashboard-kpi-value">{weeklyPracticeCount} 次</div>
            <div className="muted-sm">以最近 7 天更新的个人案例为准</div>
          </article>
          <article className="dashboard-kpi-card">
            <div className="muted-sm">个人案例</div>
            <div className="dashboard-kpi-value">{cases.length} 篇</div>
            <div className="muted-sm">草稿 {draftCases.length} 篇，可投稿 {submittableCases.length} 篇</div>
          </article>
          <article className="dashboard-kpi-card">
            <div className="muted-sm">共享权限</div>
            <div className="dashboard-kpi-value">{accessText}</div>
            <div className="muted-sm">{me.canReadSharedCase ? "当前可进入共享案例库阅读全文" : "未开通时仅建议先完成练习与投稿"}</div>
          </article>
        </div>
      </section>

      <div className="dashboard-grid">
        <section id="today-learning" className="dashboard-panel card">
          <div className="dashboard-panel-head">
            <div>
              <div className="badge">今日学习</div>
              <h2 className="section-title" style={{ marginTop: 14 }}>今天先学什么</h2>
            </div>
            <div className="mini-badge">学习层 A</div>
          </div>
          <p className="muted">从一张牌、一个关键词继续推进，把理解框架一点点搭稳。</p>
          <div className="dashboard-subpanel">
            <div className="dashboard-subpanel-label">今日推荐</div>
            <div className="dashboard-card-title">{todayCard.icon} {todayCard.name}</div>
            <div className="dashboard-highlight">核心：{todayCard.core}</div>
            <p className="muted">推荐理由：你还没有标记掌握这张牌，先把基础牌义、主题词和常见组合再过一遍。</p>
            <div className="tag-list">
              {todayCard.tags.slice(0, 4).map((tag) => <span key={tag} className="tag">{tag}</span>)}
            </div>
          </div>
          <div className="dashboard-subpanel">
            <div className="dashboard-subpanel-label">继续上次学习</div>
            <div className="dashboard-card-title">{continueCard.icon} {continueCard.name}</div>
            <div className="muted">{progress.favs.length > 0 ? "你收藏过这张牌，适合继续深化。" : progress.wrongIds.length > 0 ? "这张牌在错题中出现过，适合优先复习。" : "先从这张基础牌开始建立节奏。"}</div>
            <div className="dashboard-inline-note">当前状态：{learnedCount > 0 ? "已有学习积累，建议继续补强薄弱点" : "你还没有开始系统学习，现在正适合建立第一轮基础"}</div>
          </div>
          <div className="item-actions">
            <Link className="btn btn-primary" href="/library">开始学习</Link>
            <Link className="btn btn-secondary" href="/library">进入牌义库</Link>
            <Link className="btn btn-secondary" href="/flashcard">开始闪卡</Link>
          </div>
        </section>

        <section className="dashboard-panel card">
          <div className="dashboard-panel-head">
            <div>
              <div className="badge">今日练习</div>
              <h2 className="section-title" style={{ marginTop: 14 }}>今天练什么</h2>
            </div>
            <div className="mini-badge">练习层 C</div>
          </div>
          <p className="muted">完成一次抽牌与解读，把今天的学习内容转成真正能用的能力。</p>
          <div className="dashboard-subpanel">
            <div className="dashboard-subpanel-label">开始一次练习</div>
            <div className="dashboard-card-title">新建今日案例</div>
            <div className="muted">适合 5–10 分钟。围绕一个真实问题，写下牌面、背景和初步解读，保存后会自动进入个人案例库。</div>
            <div className="dashboard-inline-note">建议动作：今天至少完成 1 次简短练习，再决定是否继续扩展成完整案例。</div>
          </div>
          <div className="dashboard-subpanel">
            <div className="dashboard-subpanel-label">继续上次解读</div>
            {latestDraft ? (
              <>
                <div className="dashboard-card-title">{latestDraft.title}</div>
                <div className="muted">最近更新：{fmtDateTime(latestDraft.updatedAt)} · 当前状态：草稿未完成</div>
                <div className="dashboard-inline-note">这条案例还缺少 {latestDraft.background ? "" : "背景 / "}{latestDraft.cardsAndClarifiers ? "" : "牌面 / "}{latestDraft.detailedAnalysis ? "" : "详解"}，适合继续补齐。</div>
              </>
            ) : (
              <>
                <div className="dashboard-card-title">当前没有未完成解读</div>
                <div className="muted">你还没有草稿案例，可以直接开始今天的第一次练习。</div>
              </>
            )}
          </div>
          <div className="item-actions">
            <Link className="btn btn-primary" href="/practice">开始抽牌练习</Link>
            <Link className="btn btn-secondary" href="/personal-cases">继续解读</Link>
            <Link className="btn btn-secondary" href="/personal-cases">进入个人案例库</Link>
          </div>
        </section>

        <section className="dashboard-panel card">
          <div className="dashboard-panel-head">
            <div>
              <div className="badge">我的沉淀</div>
              <h2 className="section-title" style={{ marginTop: 14 }}>把练习变成资产</h2>
            </div>
            <div className="mini-badge">沉淀层 B+C</div>
          </div>
          <p className="muted">你的每一次练习、记录与整理，最终都会沉淀成自己的案例资产。</p>
          <div className="dashboard-mini-grid">
            <article className="dashboard-mini-card">
              <div className="muted-sm">最近新增案例</div>
              <div className="dashboard-mini-value">{cases.length}</div>
              <div className="dashboard-mini-text">{latestCase ? `${latestCase.title} · ${fmtDateTime(latestCase.updatedAt)}` : "你还没有保存任何个人案例"}</div>
            </article>
            <article className="dashboard-mini-card">
              <div className="muted-sm">待整理草稿</div>
              <div className="dashboard-mini-value">{draftCases.length}</div>
              <div className="dashboard-mini-text">{latestDraft ? `${latestDraft.title} · 建议继续补充` : "当前没有待整理草稿"}</div>
            </article>
            <article className="dashboard-mini-card">
              <div className="muted-sm">可投稿案例</div>
              <div className="dashboard-mini-value">{submittableCases.length}</div>
              <div className="dashboard-mini-text">{submittableCases[0] ? `${submittableCases[0].title} · 可进入投稿流程` : "先补齐背景、牌面与详解，再投稿到共享库"}</div>
            </article>
          </div>
          <div className="item-actions">
            <Link className="btn btn-primary" href="/personal-cases">查看我的案例库</Link>
            <Link className="btn btn-secondary" href="/personal-cases?filter=draft">整理草稿</Link>
            <Link className="btn btn-secondary" href="/personal-cases?filter=submittable">去投稿</Link>
          </div>
        </section>

        <section className="dashboard-panel card">
          <div className="dashboard-panel-head">
            <div>
              <div className="badge">社区精选</div>
              <h2 className="section-title" style={{ marginTop: 14 }}>看看别人最近沉淀了什么</h2>
            </div>
            <div className="mini-badge">共享层 B</div>
          </div>
          <p className="muted">从别人的实战案例中继续学习，也把自己的优质案例沉淀到共享案例库。</p>
          {me.canReadSharedCase && featuredSharedCase ? (
            <>
              <div className="dashboard-subpanel">
                <div className="dashboard-subpanel-label">今日精选共享案例</div>
                <div className="dashboard-card-title">{featuredSharedCase.title}</div>
                <div className="dashboard-highlight">{featuredSharedCase.category || "共享案例"} · 发布于 {fmtDate(featuredSharedCase.publishedAt)}</div>
                <p className="muted">{featuredSharedCase.summary || `${featuredSharedCase.content.slice(0, 96)}...`}</p>
                <div className="tag-list">
                  {featuredSharedCase.tags.slice(0, 4).map((tag) => <span key={tag} className="tag">{tag}</span>)}
                </div>
              </div>
              <div className="dashboard-subpanel">
                <div className="dashboard-subpanel-label">最新通过审核案例</div>
                <div className="dashboard-feed-list">
                  {latestApprovedCases.length > 0 ? latestApprovedCases.map((item) => (
                    <div key={item.id} className="dashboard-feed-item">
                      <div>
                        <div className="dashboard-feed-title">{item.title}</div>
                        <div className="muted-sm">{item.category || "共享案例"} · {fmtDate(item.publishedAt)}</div>
                      </div>
                      <div className="mini-badge approved">最新</div>
                    </div>
                  )) : <div className="muted">当前只有 1 条精选案例，更多共享内容会持续更新。</div>}
                </div>
              </div>
            </>
          ) : (
            <div className="dashboard-subpanel dashboard-locked-state">
              <div className="dashboard-subpanel-label">共享案例库暂未开放</div>
              <div className="dashboard-card-title">先完成练习与沉淀，再进入更高质量的案例学习</div>
              <p className="muted">共享案例库是学员权益内容。当前账号{sharedLocked ? "暂未开放共享阅读权限" : "还没有可展示的精选案例"}，你可以先完善个人案例、参与投稿，后续再进入共享库阅读全文。</p>
              <div className="dashboard-inline-note">建议优先动作：完成今日练习 → 整理个人案例 → 投稿审核 → 获取更多共享库价值。</div>
            </div>
          )}
          <div className="item-actions">
            <Link className="btn btn-primary" href="/shared-cases">进入共享案例库</Link>
            <Link className="btn btn-secondary" href="/personal-cases">整理后去投稿</Link>
          </div>
        </section>
      </div>

      {loading ? <div className="muted" style={{ marginTop: 16 }}>正在同步你的学习、案例与共享内容…</div> : null}
    </AppShell>
  );
}
