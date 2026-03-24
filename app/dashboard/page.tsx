import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requirePageUser } from "@/lib/server-page";

export default async function DashboardPage() {
  const user = await requirePageUser();

  return (
    <AppShell user={user}>
      <div className="hero-grid">
        <section className="card">
          <div className="badge">学院总览</div>
          <h1 className="page-title" style={{ marginTop: 14 }}>欢迎回来，{user.username}</h1>
          <p className="muted">这一版开始把你原来 HTML 里的前台能力，迁回到正式数据库项目里：牌义库、测试、闪卡、进度、个人案例库、共享案例库。</p>
          <hr className="sep" />
          <div className="list">
            <div className="info-banner">角色：{user.role}</div>
            <div className="info-banner">共享案例库到期：{user.sharedAccessUntil ? new Date(user.sharedAccessUntil).toLocaleString("zh-CN") : "暂无"}</div>
          </div>
        </section>
        <section className="card">
          <div className="badge">快捷入口</div>
          <div className="list" style={{ marginTop: 16 }}>
            <Link className="btn btn-primary" href="/library">进入牌义库</Link>
            <Link className="btn btn-secondary" href="/personal-cases">进入个人案例库</Link>
            <Link className="btn btn-secondary" href="/shared-cases">进入共享案例库</Link>
            <Link className="btn btn-secondary" href="/quiz">开始测试</Link>
            <Link className="btn btn-secondary" href="/flashcard">开始闪卡</Link>
            <Link className="btn btn-secondary" href="/progress">查看进度</Link>
            {user.role === "ADMIN" ? <Link className="btn btn-secondary" href="/admin">管理后台</Link> : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
