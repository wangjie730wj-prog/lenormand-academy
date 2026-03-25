"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type User = {
  username: string;
  role: "ADMIN" | "STUDENT" | "PAID_STUDENT";
  sharedAccessUntil: string | Date | null;
  sharedAccessPermanent?: boolean;
  canReadSharedCase?: boolean;
};

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = [
    { href: "/dashboard", label: "总览" },
    { href: "/library", label: "牌义库" },
    { href: "/practice", label: "练习" },
    { href: "/personal-cases", label: "个人案例库" },
    { href: "/shared-cases", label: "共享案例库" },
    { href: "/quiz", label: "测试" },
    { href: "/flashcard", label: "闪卡" },
    { href: "/progress", label: "进度" },
  ];
  if (user.role === "ADMIN") links.push({ href: "/admin", label: "管理后台" });

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <div className="topbar">
        <div className="container nav">
          <div className="brand-wrap">
            <div className="brand-icon">🔮</div>
            <div>
              <div className="brand-title">雷诺曼学院</div>
              <div className="muted" style={{ fontSize: 13 }}>
                当前用户：{user.username} · 角色：{user.role}
                {user.sharedAccessPermanent ? " · 共享库永久可读" : ""}
              </div>
            </div>
          </div>
          <div className="nav-links">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={`nav-link ${pathname === link.href ? "is-active" : ""}`}>
                {link.label}
              </Link>
            ))}
            <button className="btn btn-secondary" onClick={logout}>退出登录</button>
          </div>
        </div>
      </div>
      <div className="container">{children}</div>
    </>
  );
}
