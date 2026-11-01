import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Plan, Profile } from './types';

type Ctx = {
  session: Session | null;
  profile: Profile | null;
  plan: Plan | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({} as Ctx);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); setPlan(null); return; }
    const uid = s.user.id;
    const [{ data: p }, { data: pl }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('plans').select('data').eq('user_id', uid).eq('active', true)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setProfile((p as Profile) ?? null);
    setPlan((pl?.data as Plan) ?? null);
  }, []);

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_DEMO === '1') {
      // Design preview only: a fake signed-in client with the sample plan.
      const demo = require('../data/samplePlan.json');
      setSession({ user: { id: 'demo', email: 'demo@example.com' } } as unknown as Session);
      setProfile({ id: 'demo', email: 'demo@example.com', first_name: 'Boon', role: 'client', tier: 'coached', start_date: null });
      setPlan({ ...demo, name: 'Boon', train: { ...demo.train, s: '2026-11-01' } });
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await load(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      await load(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(() => load(session), [load, session]);
  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);

  return (
    <AuthCtx.Provider value={{ session, profile, plan, loading, refresh, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}
