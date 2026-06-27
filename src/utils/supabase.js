/**
 * supabase.js – Supabase client singleton + hybrid sync utilities
 *
 * Architecture:
 *  • All reads/writes go to localStorage first (synchronous, always available).
 *  • Background async calls push/pull data from Supabase when credentials exist.
 *  • If VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are placeholder values or
 *    missing the module degrades gracefully – localStorage-only mode.
 */
import { createClient } from '@supabase/supabase-js';

// ── Client Setup ─────────────────────────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Detect placeholder / missing credentials → disable remote sync
const SUPABASE_ENABLED =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-public-key');

if (!SUPABASE_ENABLED) {
  console.warn(
    '[CareerBridge] Supabase credentials not configured – running in localStorage-only mode.\n' +
    '       Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file to enable cloud sync.'
  );
}

export const supabase = SUPABASE_ENABLED
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

// ── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Safely executes a Supabase query, returning null on any error.
 * This prevents network issues from crashing the app.
 */
async function safeQuery(fn) {
  if (!supabase) return null;
  try {
    const { data, error } = await fn();
    if (error) {
      console.warn('[CareerBridge Sync]', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[CareerBridge Sync] Network error:', err.message);
    return null;
  }
}

// ── Users ────────────────────────────────────────────────────────────────────
/** Push all users from localStorage to Supabase (upsert). */
export async function pushUsers(usersMap) {
  if (!supabase || !usersMap) return;
  const rows = Object.values(usersMap).map(u => ({
    email: u.email,
    data: u,
    updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return;
  await safeQuery(() =>
    supabase.from('srms_users').upsert(rows, { onConflict: 'email' })
  );
}

/** Pull all users from Supabase, merge into localStorage if remote is newer. */
export async function pullUsers(getLocalUsers, setLocalUsers) {
  const rows = await safeQuery(() =>
    supabase.from('srms_users').select('email, data, updated_at')
  );
  if (!rows) return;
  const local = getLocalUsers();
  let changed = false;
  rows.forEach(row => {
    const localUser = local[row.email];
    const remoteTs = new Date(row.updated_at).getTime();
    const localTs = localUser?.updatedAt
      ? new Date(localUser.updatedAt).getTime()
      : 0;
    if (!localUser || remoteTs > localTs) {
      local[row.email] = row.data;
      changed = true;
    }
  });
  if (changed) setLocalUsers(local);
}

/** Upsert a single user record to Supabase. */
export async function upsertUser(userObj) {
  if (!userObj?.email) return;
  await safeQuery(() =>
    supabase.from('srms_users').upsert(
      { email: userObj.email, data: userObj, updated_at: new Date().toISOString() },
      { onConflict: 'email' }
    )
  );
}

/** Delete a user record from Supabase. */
export async function deleteRemoteUser(email) {
  if (!email) return;
  await safeQuery(() =>
    supabase.from('srms_users').delete().eq('email', email)
  );
}

// ── Activity Log ─────────────────────────────────────────────────────────────
/** Push a single activity entry to Supabase. */
export async function pushActivity(entry) {
  if (!entry?.id) return;
  await safeQuery(() =>
    supabase.from('srms_activity').upsert(
      { id: entry.id, data: entry, created_at: entry.timestamp || new Date().toISOString() },
      { onConflict: 'id' }
    )
  );
}

/** Pull activity log from Supabase and merge with localStorage. */
export async function pullActivity(getLocalActivity, setLocalActivity) {
  const rows = await safeQuery(() =>
    supabase
      .from('srms_activity')
      .select('id, data')
      .order('created_at', { ascending: false })
      .limit(200)
  );
  if (!rows) return;
  const local = getLocalActivity();
  const localIds = new Set(local.map(e => e.id));
  const toMerge = rows
    .map(r => r.data)
    .filter(e => e && !localIds.has(e.id));
  if (!toMerge.length) return;
  const merged = [...toMerge, ...local]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 200);
  setLocalActivity(merged);
}

// ── Training Content ──────────────────────────────────────────────────────────
/** Push training data (aptitude / coding / company) to Supabase. */
export async function pushTraining(key, data) {
  await safeQuery(() =>
    supabase.from('srms_training').upsert(
      { key, data, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
  );
}

/** Pull training data for a key from Supabase. */
export async function pullTraining(key, setLocal) {
  const rows = await safeQuery(() =>
    supabase.from('srms_training').select('data').eq('key', key).limit(1)
  );
  if (rows && rows.length > 0 && rows[0].data) {
    setLocal(rows[0].data);
  }
}

// ── College Profile ───────────────────────────────────────────────────────────
/** Push college profile to Supabase. */
export async function pushCollegeProfile(profile) {
  await safeQuery(() =>
    supabase.from('srms_college_profile').upsert(
      { key: 'profile', data: profile, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
  );
}

/** Pull college profile from Supabase. */
export async function pullCollegeProfile(setLocal) {
  const rows = await safeQuery(() =>
    supabase.from('srms_college_profile').select('data').eq('key', 'profile').limit(1)
  );
  if (rows && rows.length > 0 && rows[0].data) {
    setLocal(rows[0].data);
  }
}

// ── Full Remote Sync (called on app mount) ────────────────────────────────────
/**
 * Pull all remote data and merge into localStorage.
 * This is the primary entry point called once when the app loads.
 * Safe to call even when Supabase is not configured.
 */
export async function syncFromRemote({
  getLocalUsers,
  setLocalUsers,
  getLocalActivity,
  setLocalActivity,
  setAptitudeQuestions,
  setCodingQuestions,
  setCompanyPrep,
  setCollegeProfile,
}) {
  if (!supabase) return; // localStorage-only mode
  await Promise.allSettled([
    pullUsers(getLocalUsers, setLocalUsers),
    pullActivity(getLocalActivity, setLocalActivity),
    pullTraining('aptitude', setAptitudeQuestions),
    pullTraining('coding', setCodingQuestions),
    pullTraining('company', setCompanyPrep),
    pullCollegeProfile(setCollegeProfile),
  ]);
}

export { SUPABASE_ENABLED };
