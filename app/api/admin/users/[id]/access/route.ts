import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { addAccessDays } from "@/lib/access";

const schema = z.object({
  days: z.number().int().min(-365).max(365),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const body = schema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, sharedAccessUntil: true, sharedAccessPermanent: true },
    });

    if (!user) return NextResponse.json({ message: "用户不存在" }, { status: 404 });

    let nextUntil: Date | null;
    if (body.days >= 0) {
      nextUntil = addAccessDays(user.sharedAccessUntil, body.days);
    } else {
      const base = user.sharedAccessUntil ? new Date(user.sharedAccessUntil) : new Date();
      base.setDate(base.getDate() + body.days);
      nextUntil = base;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { sharedAccessUntil: nextUntil, sharedAccessPermanent: false },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        sharedAccessUntil: true,
        sharedAccessPermanent: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "请求参数无效";
    return NextResponse.json({ message }, { status: 400 });
  }
}
