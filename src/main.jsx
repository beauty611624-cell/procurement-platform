import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import LoginScreen from "./LoginScreen.jsx";
import { supabase } from "./supabaseClient.js";

/**
 * Storage backend for the `window.storage` API that App.jsx expects
 * (the same interface used by Claude-artifact `window.storage`).
 *
 * - If Supabase is configured, data is stored in a shared table so
 *   multiple people/devices see the same data, with realtime updates
 *   pushed to other open tabs/devices, and access is gated by login
 *   (see AuthGate below + README for the Supabase RLS setup).
 * - Otherwise, falls back to browser localStorage with NO login
 *   requirement — only useful for local development, never for
 *   handling real confidential data.
 */

const TABLE = "app_storage";

function setupSupabaseStorage() {
  window.storage = {
    async get(key) {
      const { data, error } = await supabase.from(TABLE).select("value").eq("key", key).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("not found");
      return { key, value: data.value, shared: false };
    },
    async set(key, value) {
      const { error } = await supabase
        .from(TABLE)
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
      return { key, value, shared: false };
    },
    async delete(key) {
      const { error } = await supabase.from(TABLE).delete().eq("key", key);
      if (error) throw error;
      return { key, deleted: true, shared: false };
    },
    async list(prefix = "") {
      const { data, error } = await supabase.from(TABLE).select("key").ilike("key", `${prefix}%`);
      if (error) throw error;
      return { keys: (data || []).map((d) => d.key), prefix, shared: false };
    },
  };

  // Best-effort realtime: if the table has replication enabled in Supabase,
  // other open browsers get notified instantly. If not enabled, this simply
  // never fires and the manual "同步最新資料" button in the app still works.
  try {
    supabase
      .channel("app_storage_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, (payload) => {
        const row = payload.new;
        if (row && row.key && row.value) {
          window.dispatchEvent(new CustomEvent("storage-remote-update", { detail: { key: row.key, value: row.value } }));
        }
      })
      .subscribe();
  } catch (e) {
    console.warn("即時同步未啟用（不影響手動「同步最新資料」按鈕）：", e);
  }
}

function setupLocalStorageFallback() {
  const prefix = "procure-app::";
  window.storage = {
    async get(key) {
      const raw = localStorage.getItem(prefix + key);
      if (raw === null) throw new Error("not found");
      return { key, value: raw, shared: false };
    },
    async set(key, value) {
      localStorage.setItem(prefix + key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      const existed = localStorage.getItem(prefix + key) !== null;
      localStorage.removeItem(prefix + key);
      return { key, deleted: existed, shared: false };
    },
    async list(keyPrefix = "") {
      const keys = Object.keys(localStorage)
        .filter((k) => k.startsWith(prefix + keyPrefix))
        .map((k) => k.slice(prefix.length));
      return { keys, prefix: keyPrefix, shared: false };
    },
  };
}

function NoAuthWarningBanner() {
  return (
    <div style={{ background: "#E0524B", color: "#fff" }} className="text-xs font-medium text-center py-2 px-4">
      ⚠️ 尚未設定 Supabase，目前沒有帳號驗證、任何知道此網址的人都能存取資料 —— 請參考 README 完成 Supabase + 登入設定
    </div>
  );
}

function Root() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out

  useEffect(() => {
    if (!supabase) {
      setupLocalStorageFallback();
      setSession(null); // no auth possible without Supabase; render app directly (dev-only fallback)
      return;
    }

    setupSupabaseStorage();

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F6F7FB" }}>
        <span className="text-sm" style={{ color: "#8891A6" }}>載入中…</span>
      </div>
    );
  }

  // Supabase not configured at all: no auth is possible, warn clearly and let through.
  if (!supabase) {
    return (
      <>
        <NoAuthWarningBanner />
        <App user={null} onSignOut={null} />
      </>
    );
  }

  if (!session) {
    return <LoginScreen onLoggedIn={setSession} />;
  }

  return <App user={session.user} onSignOut={() => supabase.auth.signOut()} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
