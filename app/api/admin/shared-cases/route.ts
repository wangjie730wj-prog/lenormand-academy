import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const items = await prisma.sharedCase.findMany({
    include: {
      submission: {
        select: {
          id: true,
          status: true,
          reviewNote: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, username: true, role: true } },
          personalCase: {
            select: {
              id: true,
              question: true,
              cardsAndClarifiers: true,
              background: true,
              detailedAnalysis: true,
              feedback: true,
              spreadType: true,
              readingMethod: true,
              caseType: true,
            },
          },
        },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ items });
}
