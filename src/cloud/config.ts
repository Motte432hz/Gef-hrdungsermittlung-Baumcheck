/**
 * Cloud project (Supabase, region Frankfurt). The publishable key is meant to be public:
 * it only identifies the project; all access is checked by the database rules (RLS).
 */
export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  'https://fjrhcvgiyivanikgazyk.supabase.co'
export const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_KEY as string | undefined) ??
  'sb_publishable_c_UNBuIHehDrD3EKeSNzLw_W6CiBF0D'
