import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { canReadSharedCase } from "@/lib/access";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  if (!canReadSharedCase(auth.user)) {
    return NextResponse.json(
      { message: "当前没有共享案例库阅读权限", accessUntil: auth.user.sharedAccessUntil },
      { status: 403 }
    );
  }

  const items = await prisma.sharedCase.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });

  const sourceIds = items.map((item) => item.sourcePersonalCaseId);
  const personalCases = sourceIds.length
    ? await prisma.personalCase.findMany({
        where: { id: { in: sourceIds } },
        select: {
          id: true,
          question: true,
          cardsAndClarifiers: true,
          background: true,
          detailedAnalysis: true,
        },
      })
    : [];

  const detailMap = new Map(personalCases.map((item) => [item.id, item]));
  const enriched = items.map((item) => ({
    ...item,
    question: detailMap.get(item.sourcePersonalCaseId)?.question ?? null,
    cardsAndClarifiers: detailMap.get(item.sourcePersonalCaseId)?.cardsAndClarifiers ?? null,
    background: detailMap.get(item.sourcePersonalCaseId)?.background ?? null,
    detailedAnalysis: detailMap.get(item.sourcePersonalCaseId)?.detailedAnalysis ?? null,
  }));

  return NextResponse.json({ items: enriched, accessUntil: auth.user.sharedAccessUntil });
}
