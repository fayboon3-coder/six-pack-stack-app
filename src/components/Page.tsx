import React from 'react';
import { RefreshControl, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, E } from '../lib/theme';
import { MotionScroll } from './motion';

/** Canvas page: fixed white header, then a 16px-gutter scroll of cards 12px apart. */
export default function Page({ header, children, footer, onRefresh, refreshing = false, style, tabs = true, paper = false }: {
  header?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode;
  onRefresh?: () => void; refreshing?: boolean; style?: ViewStyle;
  /** Leave room for the floating tab bar. */
  tabs?: boolean;
  /** The editorial look: warm paper background, 20px gutters. */
  paper?: boolean;
}) {
  return (
    <SafeAreaView edges={footer ? ['top', 'bottom'] : ['top']} style={{ flex: 1, backgroundColor: paper ? E.paper : C.bg }}>
      {header}
      <MotionScroll style={{ flex: 1 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        contentContainerStyle={[{ paddingHorizontal: paper ? 20 : 16, paddingTop: paper ? 18 : 14, paddingBottom: footer ? 24 : tabs ? 120 : 40, gap: 12 }, style]}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.ink} /> : undefined}>
        {children}
      </MotionScroll>
      {!!footer && <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1, borderTopColor: '#e6e8ef', backgroundColor: paper ? E.paper : C.bg, flexDirection: 'row', gap: 10, alignItems: 'center' }}>{footer}</View>}
    </SafeAreaView>
  );
}
