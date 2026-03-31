import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  category: z.string().max(80).nullable().optional(),
  tags: z.array(z.string().max(30)).max(20).optional(),
  summary: z.string().max(3000).nullable().optional(),
  content: z.string().max(30000).optional(),
  status: z.enum(["PUBLISHED", "UNPUBLISHED"]).optional(),
  question: z.string().max(3000).nullable().optional(),
  cardsAndClarifiers: z.string().max(5000).nullable().optional(),
  background: z.string().max(5000).nullable().optional(),
  detailedAnalysis: z.string().max(30000).nullable().optional(),
  feedback: z.string().max(5000).nullable().optional(),
  spreadType: z.string().max(120).nullable().optional(),
  readingMethod: z.string().max(120).nullable().optional(),
  caseType: z.string().max(120).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const body = patchSchema.parse(await req.json());
    const existing = await prisma.sharedCase.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ message: "共享案例不存在" }, { status: 404 });

    const sharedData: Record<string, unknown> = {};
    const personalData: Record<string, unknown> = {};

    for (const key of ["title", "category", "tags", "summary", "content", "status"] as const) {
      if (typeof body[key] !== "undefined") sharedData[key] = body[key];
    }
    for (const key of ["question", "cardsAndClarifiers", "background", "detailedAnalysis", "feedback", "spreadType", "readingMethod", "caseType"] as const) {
      if (typeof body[key] !== "undefined") personalData[key] = body[key];
    }
    if (body.status === "PUBLISHED") {
      sharedData.publishedAt = new Date();
    }

    const updated = await prisma.$transaction(async (tx) => {
      const shared = await tx.sharedCase.update({
        where: { id },
        data: sharedData,
      });
      if (Object.keys(personalData).length) {
        await tx.personalCase.update({
          where: { id: existing.sourcePersonalCaseId },
          data: personalData,
        });
      }
      return shared;
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "请求参数无效";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const existing = await prisma.sharedCase.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "共享案例不存在" }, { status: 404 });

  await prisma.sharedCase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
