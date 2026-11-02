import React from 'react';
import { Tabs } from 'expo-router';
import { C, F } from '../../src/lib/theme';
import { HomeIcon, TrainIcon, PlanIcon, ProgressIcon, ChatIcon, TargetIcon } from '../../src/components/icons';
import { useAuth } from '../../src/lib/auth';

export default function TabsLayout() {
  const { profile } = useAuth();
  const coach = profile?.role === 'coach';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.red2,
        tabBarInactiveTintColor: C.white,
        tabBarStyle: { backgroundColor: C.tabBar, borderTopColor: C.line, height: 84, paddingTop: 8 },
        tabBarLabelStyle: { fontFamily: F.xbold, fontSize: 10 },
        sceneStyle: { backgroundColor: C.navy },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color }) => <HomeIcon color={String(color)} /> }} />
      <Tabs.Screen name="train" options={{ title: 'Train', tabBarIcon: ({ color }) => <TrainIcon color={String(color)} /> }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: ({ color }) => <PlanIcon color={String(color)} /> }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: ({ color }) => <ProgressIcon color={String(color)} /> }} />
      <Tabs.Screen name="boon" options={{ title: 'Boon', tabBarIcon: ({ color }) => <ChatIcon color={String(color)} /> }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach', href: coach ? undefined : null, tabBarIcon: ({ color }) => <TargetIcon color={String(color)} size={22} /> }} />
    </Tabs>
  );
}
