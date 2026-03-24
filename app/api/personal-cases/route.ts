import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

const createSchema = z.object({
  question: z.string().min(1, "案例问题必填"),
  caseType: z.string().min(1),
  caseTypeCustom: z.string().optional(),
  background: z.string().optional(),
  cardsAndClarifiers: z.string().optional(),
  spreadType: z.string().min(1),
  spreadTypeCustom: z.string().optional(),
  readingMethod: z.string().min(1),
  readingMethodCustom: z.string().optional(),
  feedback: z.string().optional(),
  detailedAnalysis: z.string().optional(),
});

function normalize(body: z.infer<typeof createSchema>) {
  const caseType = body.caseType === "其他自定义" ? body.caseTypeCustom || "其他自定义" : body.caseType;
  const spreadType = body.spreadType === "其他自定义牌阵" ? body.spreadTypeCustom || "其他自定义牌阵" : body.spreadType;
  const readingMethod = body.readingMethod === "其他自定义方法" ? body.readingMethodCustom || "其他自定义方法" : body.readingMethod;
  const tags = [caseType, spreadType, readingMethod].filter(Boolean) as string[];
  const title = body.question.slice(0, 80);
  const summary = [body.background, body.feedback].filter(Boolean).join("\n\n").slice(0, 240) || body.cardsAndClarifiers || body.question;
  const content = [
    `【案例问题】${body.question}`,
    `【案例类型】${caseType}`,
    body.background ? `【案例背景】${body.background}` : "",
    body.cardsAndClarifiers ? `【牌面＋补牌】${body.cardsAndClarifiers}` : "",
    `【牌阵】${spreadType}`,
    `【解读方法】${readingMethod}`,
    body.feedback ? `【答案反馈】${body.feedback}` : "",
    body.detailedAnalysis ? `【案例详解】${body.detailedAnalysis}` : "",
  ].filter(Boolean).join("\n\n");
  return { title, category: caseType, tags, summary, content, caseType, spreadType, readingMethod };
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const rows = await prisma.personalCase.findMany({
    where: { userId: auth.user.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const body = createSchema.parse(await req.json());
    const normalized = normalize(body);
    const row = await prisma.personalCase.create({
      data: {
        userId: auth.user.id,
        title: normalized.title,
        category: normalized.category,
        tags: normalized.tags,
        summary: normalized.summary,
        content: normalized.content,
        question: body.question,
        caseType: normalized.caseType,
        caseTypeCustom: body.caseTypeCustom,
        background: body.background,
        cardsAndClarifiers: body.cardsAndClarifiers,
        spreadType: normalized.spreadType,
        spreadTypeCustom: body.spreadTypeCustom,
        readingMethod: normalized.readingMethod,
        readingMethodCustom: body.readingMethodCustom,
        feedback: body.feedback,
        detailedAnalysis: body.detailedAnalysis,
      },
    });

    return NextResponse.json({ item: row });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "请求参数无效";
    return NextResponse.json({ message }, { status: 400 });
  }
}
