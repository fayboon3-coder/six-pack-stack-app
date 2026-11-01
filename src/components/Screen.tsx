import React from 'react';
import { RefreshControl, ScrollView, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../lib/theme';

export default function Screen({ children, onRefresh, refreshing = false, style, scroll = true, header }: {
  children: React.ReactNode; onRefresh?: () => void; refreshing?: boolean; style?: ViewStyle; scroll?: boolean;
  /** Full-width content above the padded body, e.g. a photo banner. */
  header?: React.ReactNode;
}) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.navy }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.white} /> : undefined}
        >
          {header}
          <View style={[{ padding: 20, paddingTop: header ? 12 : 20, gap: 16 }, style]}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, padding: 20, gap: 16 }, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
