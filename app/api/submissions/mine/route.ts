import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const items = await prisma.submission.findMany({
    where: { userId: auth.user.id },
    include: { personalCase: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}
