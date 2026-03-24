import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

const schema = z.object({ personalCaseId: z.string().min(1) });

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const body = schema.parse(await req.json());
    const item = await prisma.personalCase.findFirst({
      where: { id: body.personalCaseId, userId: auth.user.id, deletedAt: null },
    });

    if (!item) return NextResponse.json({ message: "案例不存在" }, { status: 404 });
    if (item.isSubmitted) {
      return NextResponse.json({ message: "该案例已在审核流程中" }, { status: 400 });
    }

    const existingApproved = await prisma.submission.findFirst({
      where: { personalCaseId: item.id, status: "APPROVED" },
    });
    if (existingApproved) {
      return NextResponse.json({ message: "该案例已审核通过，不能重复投稿" }, { status: 400 });
    }

    const submission = await prisma.$transaction(async (tx) => {
      const created = await tx.submission.create({
        data: { personalCaseId: item.id, userId: auth.user.id, status: "PENDING" },
      });
      await tx.personalCase.update({ where: { id: item.id }, data: { isSubmitted: true } });
      return created;
    });

    return NextResponse.json({ item: submission });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "请求参数无效";
    return NextResponse.json({ message }, { status: 400 });
  }
}
