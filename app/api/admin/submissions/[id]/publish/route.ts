import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { user: true, personalCase: true, sharedCase: true },
  });

  if (!submission) return NextResponse.json({ message: "投稿不存在" }, { status: 404 });
  if (submission.sharedCase) return NextResponse.json({ message: "该投稿已存在共享案例" }, { status: 400 });
  if (submission.status !== "APPROVED") {
    return NextResponse.json({ message: "只有已通过投稿才能重新发布" }, { status: 400 });
  }

  const item = await prisma.sharedCase.create({
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

  return NextResponse.json({ item });
}
