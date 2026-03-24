"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.message || "登录失败");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <form onSubmit={onSubmit} className="card" style={{ width: "100%", maxWidth: 460, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 54, marginBottom: 8 }}>🔮</div>
          <h1 className="page-title" style={{ color: "#f5d56e" }}>雷诺曼学院</h1>
          <p className="muted">第一阶段 MVP · 正式产品工程版</p>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label className="label">用户名</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="label">密码</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error ? <div style={{ color: "#fca5a5", fontSize: 14 }}>{error}</div> : null}
          <button disabled={loading} className="btn btn-primary">
            {loading ? "登录中..." : "进入系统"}
          </button>
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.8 }}>
            默认账号将在 seed 中创建：admin / student01 / paid01
          </div>
        </div>
      </form>
    </main>
  );
}
