import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

const updateSchema = z.object({
  question: z.string().min(1).optional(),
  caseType: z.string().optional(),
  caseTypeCustom: z.string().optional(),
  background: z.string().optional(),
  cardsAndClarifiers: z.string().optional(),
  spreadType: z.string().optional(),
  spreadTypeCustom: z.string().optional(),
  readingMethod: z.string().optional(),
  readingMethodCustom: z.string().optional(),
  feedback: z.string().optional(),
  detailedAnalysis: z.string().optional(),
});

function normalize(body: any, existing: any) {
  const question = body.question ?? existing.question ?? existing.title;
  const rawCaseType = body.caseType ?? existing.caseType ?? existing.category ?? "其他自定义";
  const caseTypeCustom = body.caseTypeCustom ?? existing.caseTypeCustom ?? "";
  const background = body.background ?? existing.background ?? "";
  const cardsAndClarifiers = body.cardsAndClarifiers ?? existing.cardsAndClarifiers ?? "";
  const rawSpreadType = body.spreadType ?? existing.spreadType ?? "其他自定义牌阵";
  const spreadTypeCustom = body.spreadTypeCustom ?? existing.spreadTypeCustom ?? "";
  const rawReadingMethod = body.readingMethod ?? existing.readingMethod ?? "其他自定义方法";
  const readingMethodCustom = body.readingMethodCustom ?? existing.readingMethodCustom ?? "";
  const feedback = body.feedback ?? existing.feedback ?? "";
  const detailedAnalysis = body.detailedAnalysis ?? existing.detailedAnalysis ?? "";

  const caseType = rawCaseType === "其他自定义" ? caseTypeCustom || "其他自定义" : rawCaseType;
  const spreadType = rawSpreadType === "其他自定义牌阵" ? spreadTypeCustom || "其他自定义牌阵" : rawSpreadType;
  const readingMethod = rawReadingMethod === "其他自定义方法" ? readingMethodCustom || "其他自定义方法" : rawReadingMethod;
  const tags = [caseType, spreadType, readingMethod].filter(Boolean);
  const title = String(question).slice(0, 80);
  const summary = [background, feedback].filter(Boolean).join("

").slice(0, 240) || cardsAndClarifiers || question;
  const content = [
    `【案例问题】${question}`,
    `【案例类型】${caseType}`,
    background ? `【案例背景】${background}` : "",
    cardsAndClarifiers ? `【牌面＋补牌】${cardsAndClarifiers}` : "",
    `【牌阵】${spreadType}`,
    `【解读方法】${readingMethod}`,
    feedback ? `【答案反馈】${feedback}` : "",
    detailedAnalysis ? `【案例详解】${detailedAnalysis}` : "",
  ].filter(Boolean).join("

");

  return {
    title, category: caseType, tags, summary, content, question, caseType, caseTypeCustom, background, cardsAndClarifiers, spreadType, spreadTypeCustom, readingMethod, readingMethodCustom, feedback, detailedAnalysis,
  };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const existing = await prisma.personalCase.findFirst({ where: { id, userId: auth.user.id, deletedAt: null } });
  if (!existing) return NextResponse.json({ message: "案例不存在" }, { status: 404 });
  if (existing.isSubmitted) {
    return NextResponse.json({ message: "已投稿审核中的案例暂不可编辑" }, { status: 400 });
  }

  try {
    const body = updateSchema.parse(await req.json());
    const row = await prisma.personalCase.update({ where: { id }, data: normalize(body, existing) });
    return NextResponse.json({ item: row });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "请求参数无效";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const existing = await prisma.personalCase.findFirst({ where: { id, userId: auth.user.id, deletedAt: null } });
  if (!existing) return NextResponse.json({ message: "案例不存在" }, { status: 404 });
  if (existing.isSubmitted) {
    return NextResponse.json({ message: "已投稿审核中的案例暂不可删除" }, { status: 400 });
  }

  await prisma.personalCase.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
