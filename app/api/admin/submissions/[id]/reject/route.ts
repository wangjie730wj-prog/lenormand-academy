import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

const schema = z.object({ reviewNote: z.string().optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const body = schema.parse(await req.json());
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { personalCase: true },
    });

    if (!submission) return NextResponse.json({ message: "投稿不存在" }, { status: 404 });
    if (submission.status !== "PENDING") {
      return NextResponse.json({ message: "该投稿不是待审核状态" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.submission.update({
        where: { id: submission.id },
        data: {
          status: "REJECTED",
          reviewNote: body.reviewNote,
          reviewedAt: new Date(),
          reviewedById: auth.user.id,
        },
      });
      await tx.personalCase.update({ where: { id: submission.personalCase.id }, data: { isSubmitted: false } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "请求参数无效";
    return NextResponse.json({ message }, { status: 400 });
  }
}
