import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true as const, user };
}

export async function requireAdmin() {
  const result = await requireUser();
  if (!result.ok) return result;

  if (result.user.role !== "ADMIN") {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return result;
}
