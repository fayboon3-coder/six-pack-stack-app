import React from 'react';
import { RefreshControl, ScrollView, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../lib/theme';

export default function Screen({ children, onRefresh, refreshing = false, style, scroll = true }: {
  children: React.ReactNode; onRefresh?: () => void; refreshing?: boolean; style?: ViewStyle; scroll?: boolean;
}) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.navy }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ padding: 20, paddingBottom: 40, gap: 16 }, style]}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.white} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, padding: 20, gap: 16 }, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
