import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

const schema = z.object({
  role: z.enum(["STUDENT", "PAID_STUDENT", "ADMIN"]).optional(),
  sharedAccessPermanent: z.boolean().optional(),
  sharedAccessUntil: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const body = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ message: "用户不存在" }, { status: 404 });

    const data: any = {};
    if (body.role) data.role = body.role;
    if (typeof body.status !== "undefined") data.status = body.status;
    if (typeof body.sharedAccessPermanent !== "undefined") data.sharedAccessPermanent = body.sharedAccessPermanent;
    if (typeof body.sharedAccessUntil !== "undefined") {
      data.sharedAccessUntil = body.sharedAccessUntil ? new Date(body.sharedAccessUntil) : null;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
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
