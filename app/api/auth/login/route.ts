import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { username: body.username } });

    if (!user) {
      return NextResponse.json({ message: "用户名或密码错误" }, { status: 401 });
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ message: "用户名或密码错误" }, { status: 401 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ message: "账号已被禁用" }, { status: 403 });
    }

    await createSession({ id: user.id, username: user.username, role: user.role });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "请求参数无效" }, { status: 400 });
  }
}
