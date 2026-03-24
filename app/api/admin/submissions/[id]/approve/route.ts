import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { addAccessDays } from "@/lib/access";

const schema = z.object({ rewardDays: z.number().int().min(0).max(365).default(1) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const body = schema.parse(await req.json().catch(() => ({ rewardDays: 1 })));
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { user: true, personalCase: true, sharedCase: true },
    });

    if (!submission) return NextResponse.json({ message: "投稿不存在" }, { status: 404 });
    if (submission.status !== "PENDING") {
      return NextResponse.json({ message: "该投稿不是待审核状态" }, { status: 400 });
    }
    if (submission.sharedCase) {
      return NextResponse.json({ message: "该投稿已发布共享案例" }, { status: 400 });
    }

    const beforeUntil = submission.user.sharedAccessUntil;
    const afterUntil = body.rewardDays > 0 ? addAccessDays(beforeUntil, body.rewardDays) : beforeUntil;

    await prisma.$transaction(async (tx) => {
      await tx.submission.update({
        where: { id: submission.id },
        data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: auth.user.id },
      });
      await tx.sharedCase.create({
        data: {
          sourceSubmissionId: submission.id,
          sourcePersonalCaseId: submission.personalCase.id,
          sourceUserId: submission.user.id,
          title: submission.personalCase.title,
          category: submission.personalCase.category,
          tags: submission.personalCase.tags,
          summary: submission.personalCase.summary,
          content: submission.personalCase.content,
          status: "PUBLISHED",
        },
      });
      if (body.rewardDays > 0) {
        await tx.user.update({ where: { id: submission.user.id }, data: { sharedAccessUntil: afterUntil, sharedAccessPermanent: false } });
      }
      await tx.accessReward.create({
        data: {
          userId: submission.user.id,
          submissionId: submission.id,
          rewardDays: body.rewardDays,
          beforeUntil,
          afterUntil: afterUntil ?? null,
        },
      });
      await tx.personalCase.update({ where: { id: submission.personalCase.id }, data: { isSubmitted: false } });
    });

    return NextResponse.json({ ok: true, afterUntil, rewardDays: body.rewardDays });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "请求参数无效";
    return NextResponse.json({ message }, { status: 400 });
  }
}
