import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const items = await prisma.submission.findMany({
    include: {
      user: { select: { id: true, username: true, role: true } },
      personalCase: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ items });
}
