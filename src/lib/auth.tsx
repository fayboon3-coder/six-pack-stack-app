import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Plan, Profile } from './types';
import { buildFreePlan, clearPendingQuiz, readPendingQuiz } from './quiz';
import { setPreviewing, type ViewAs } from './preview';

type Ctx = {
  session: Session | null;
  profile: Profile | null;
  plan: Plan | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Coach only: see the app as a free user, subscriber or coaching client (nothing saved). */
  viewAs: ViewAs | null;
  setViewAs: (v: ViewAs | null) => void;
  isCoachAccount: boolean;
};

const SAMPLE_QUIZ: any = { goal: 'Lose fat and see my abs', sex: 'Male', age: '29', height_ft: '5', height_in: '11', weight: '212', goal_weight: '185',
  where_train: 'Gym', days: '4 days', experience: '1–3 years', tried: ['Fat burners', 'Pre-workout'], monthly_spend: '$100–$200',
  eat_out: '1–3 times a week', struggle: 'Weekends', start_timing: 'This week', ready_to_invest: 'Yes, with a payment plan', first_name: 'Jake', email: 'preview@example.com' };

function previewProfilePlan(real: Profile, v: ViewAs): { profile: Profile; plan: Plan } {
  const fp = buildFreePlan(SAMPLE_QUIZ);
  const profile = { ...real, role: 'client', tier: v, first_name: 'Jake', quiz: SAMPLE_QUIZ } as Profile;
  if (v !== 'coached') return { profile, plan: fp }; // Free and Full Stack: the quiz-built plan
  // Coaching client: the full 1:1 sample plan (audit, Boon's notes), same start week.
  const demo = require('../data/samplePlan.json');
  return { profile, plan: { ...demo, name: 'Jake', train: { ...demo.train, s: fp.train.s } } };
}

let claiming = false; // one plan build at a time

const AuthCtx = createContext<Ctx>({} as Ctx);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewAs, setViewAsState] = useState<ViewAs | null>(null);
  const setViewAs = useCallback((v: ViewAs | null) => { setPreviewing(!!v); setViewAsState(v); }, []);

  const load = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); setPlan(null); return; }
    const uid = s.user.id;
    const [{ data: p }, { data: pl }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('plans').select('data').eq('user_id', uid).eq('active', true)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    let plan = (pl?.data as Plan) ?? null;
    let prof = (p as Profile) ?? null;
    // Just finished the quiz on this phone: build their free plan now.
    if (!plan && claiming) return; // another load is building it and will set state
    if (!plan && !claiming && prof && prof.role === 'client' && prof.tier === 'free') {
      claiming = true;
      const q = await readPendingQuiz();
      if (q && q.email.toLowerCase() === (s.user.email || '').toLowerCase()) {
        const built = buildFreePlan(q);
        const { error } = await supabase.from('plans').insert({ user_id: uid, data: built, active: true });
        if (!error) {
          plan = built;
          const upd = { first_name: q.first_name, start_date: built.train.s, quiz: q };
          await supabase.from('profiles').update(upd).eq('id', uid);
          prof = { ...prof, first_name: q.first_name, start_date: built.train.s };
          await clearPendingQuiz();
        }
      }
      claiming = false;
    }
    setProfile(prof);
    setPlan(plan);
  }, []);

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_DEMO === 'out') { setLoading(false); return; } // design preview: signed out
    if (process.env.EXPO_PUBLIC_DEMO === '1') {
      // Design preview only: a fake signed-in client with the sample plan.
      const demo = require('../data/samplePlan.json');
      setSession({ user: { id: 'demo', email: 'demo@example.com' } } as unknown as Session);
      setProfile({ id: 'demo', email: 'demo@example.com', first_name: 'Boon', role: 'client', tier: (process.env.EXPO_PUBLIC_DEMO_TIER as any) || 'coached', start_date: null });
      if (process.env.EXPO_PUBLIC_DEMO_TIER === 'free' || process.env.EXPO_PUBLIC_DEMO_TIER === 'self') {
        const q: any = { goal: 'Lose fat and see my abs', sex: 'Male', age: '29', height_ft: '5', height_in: '11', weight: '212', goal_weight: '185',
          where_train: 'Gym', days: '4 days', experience: '1–3 years', tried: ['Fat burners', 'Pre-workout'], monthly_spend: '$100–$200',
          eat_out: '1–3 times a week', struggle: 'Weekends', start_timing: 'This week', ready_to_invest: 'Yes, with a payment plan', first_name: 'Jake', email: 'demo@example.com' };
        const fp = buildFreePlan(q);
        setProfile({ id: 'demo', email: 'demo@example.com', first_name: 'Jake', role: 'client', tier: process.env.EXPO_PUBLIC_DEMO_TIER as any, start_date: null, quiz: q });
        setPlan({ ...fp, train: { ...fp.train, s: process.env.EXPO_PUBLIC_DEMO_START || fp.train.s } });
      } else
      setPlan({ ...demo, name: 'Boon', train: { ...demo.train, s: process.env.EXPO_PUBLIC_DEMO_START || '2026-11-01' } });
      if (process.env.EXPO_PUBLIC_DEMO_ROLE === 'coach') setProfile({ id: 'demo', email: 'demo@example.com', first_name: 'Boon', role: 'coach', tier: 'coached', start_date: null });
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
  const signOut = useCallback(async () => { setViewAs(null); await supabase.auth.signOut(); }, [setViewAs]);

  const isCoachAccount = profile?.role === 'coach';
  const pv = useMemo(() => (isCoachAccount && viewAs && profile ? previewProfilePlan(profile, viewAs) : null), [isCoachAccount, viewAs, profile]);

  return (
    <AuthCtx.Provider value={{ session, profile: pv ? pv.profile : profile, plan: pv ? pv.plan : plan, loading, refresh, signOut,
      viewAs: pv ? viewAs : null, setViewAs, isCoachAccount }}>
      {children}
    </AuthCtx.Provider>
  );
}
