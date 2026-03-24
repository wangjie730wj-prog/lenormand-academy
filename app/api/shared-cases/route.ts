import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { canReadSharedCase } from "@/lib/access";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  if (!canReadSharedCase(auth.user)) {
    return NextResponse.json(
      { message: "当前没有共享案例库阅读权限", accessUntil: auth.user.sharedAccessUntil },
      { status: 403 }
    );
  }

  const items = await prisma.sharedCase.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });

  return NextResponse.json({ items, accessUntil: auth.user.sharedAccessUntil });
}
