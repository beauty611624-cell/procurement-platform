import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Single shared client instance, used for both auth and data storage.
// If env vars aren't set, this is null and the app falls back to
// localStorage with NO login requirement (see main.jsx) — only useful
// for local testing, never for handling real confidential data.
export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
