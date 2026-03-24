import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canReadSharedCase } from "@/lib/access";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  return NextResponse.json({
    user: {
      ...user,
      canReadSharedCase: canReadSharedCase(user),
    },
  });
}
