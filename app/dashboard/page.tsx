import { requirePageUser } from "@/lib/server-page";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const user = await requirePageUser();
  return <DashboardClient initialUser={user} />;
}
