import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { hashPassword } from "@/lib/auth";

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(["STUDENT", "PAID_STUDENT", "ADMIN"]).default("STUDENT"),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const items = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
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

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = createUserSchema.parse(await req.json());
    const exists = await prisma.user.findUnique({ where: { username: body.username } });
    if (exists) return NextResponse.json({ message: "用户名已存在" }, { status: 400 });

    const item = await prisma.user.create({
      data: {
        username: body.username,
        passwordHash: await hashPassword(body.password),
        role: body.role,
      },
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

    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "请求参数无效";
    return NextResponse.json({ message }, { status: 400 });
  }
}
