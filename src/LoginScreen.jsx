import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "./supabaseClient.js";

export default function LoginScreen({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) {
      setError("登入失敗：帳號或密碼錯誤，請確認後再試一次");
      return;
    }
    onLoggedIn(data.session);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(155deg,#10213D 0%,#0B1730 60%,#0A1226 100%)" }}
    >
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#2F6FED,#7C5CFC)" }}>
            <ShieldCheck size={18} color="#fff" strokeWidth={2.3} />
          </div>
          <h1 className="font-bold text-lg" style={{ color: "#10182B" }}>採購中控台登入</h1>
        </div>
        <p className="text-xs mb-6" style={{ color: "#64708A" }}>本系統含機密採購資料，僅限授權帳號登入</p>

        <div className="mb-3">
          <label className="text-xs font-semibold block mb-1.5" style={{ color: "#64708A" }}>帳號 Email</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
            style={{ borderColor: "#E7EAF3" }}
            autoComplete="username"
          />
        </div>
        <div className="mb-4">
          <label className="text-xs font-semibold block mb-1.5" style={{ color: "#64708A" }}>密碼</label>
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
            style={{ borderColor: "#E7EAF3" }}
            autoComplete="current-password"
          />
        </div>

        {error && <div className="text-xs mb-4 p-2.5 rounded-lg" style={{ color: "#E0524B", background: "#FDF0EF" }}>{error}</div>}

        <button
          type="submit" disabled={busy}
          className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
          style={{ background: "#2F6FED" }}
        >
          {busy ? "登入中…" : "登入"}
        </button>

        <p className="text-[11px] mt-5 leading-5" style={{ color: "#A0A8BC" }}>
          帳號由系統管理員於 Supabase 後台建立，本系統不開放自行註冊。如需新增帳號或忘記密碼，請聯繫管理員。
        </p>
      </form>
    </div>
  );
}
