import React from 'react';
import { RefreshControl, ScrollView, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../lib/theme';
import Backdrop from './Backdrop';

export default function Screen({ children, onRefresh, refreshing = false, style, scroll = true, header, edgeToEdge }: {
  children: React.ReactNode; onRefresh?: () => void; refreshing?: boolean; style?: ViewStyle; scroll?: boolean;
  /** Full-width content above the padded body, e.g. a photo banner. */
  header?: React.ReactNode;
  /** Let the header photo run under the status bar. */
  edgeToEdge?: boolean;
}) {
  return (
    <SafeAreaView edges={edgeToEdge ? [] : ['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.ink} /> : undefined}
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
