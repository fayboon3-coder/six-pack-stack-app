import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import BackOffice from '../../src/components/BackOffice';

/** Coach-only back office (Boon's account): every account, client, check-in, trial, purchase and funnel number. Anyone else goes home. */
export default function Coach() {
  const { profile } = useAuth();
  if (profile && profile.role !== 'coach') return <Redirect href="/" />;
  return <BackOffice />;
}
