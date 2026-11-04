import React from 'react';
import { Tabs } from 'expo-router';
import { C } from '../../src/lib/theme';
import TabBar from '../../src/components/TabBar';

/** Programs · Progress · Stack · You, on a floating pill tab bar. Other routes stay reachable but hidden. */
export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Programs' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="stack" options={{ title: 'Stack' }} />
      <Tabs.Screen name="you" options={{ title: 'You' }} />
      <Tabs.Screen name="train" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="boon" />
      <Tabs.Screen name="coach" />
    </Tabs>
  );
}
