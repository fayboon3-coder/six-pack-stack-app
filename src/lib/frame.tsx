import React, { createContext, useContext } from 'react';
import { Image, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { F } from './theme';

/**
 * Desktop frame for the web app. On a wide browser window the app sits in a centered column
 * (like Instagram or Notion on a computer) instead of stretching edge to edge. Phones and the
 * native app never see it: below FRAME_BREAK the app fills the screen exactly as before.
 */
export const FRAME_W = 600;
export const FRAME_BREAK = 760;

const FrameWidth = createContext<number | null>(null);

/** The width the app actually has: the column's width when framed, else the window's. */
export function useAppWidth(): number {
  const { width } = useWindowDimensions();
  const framed = useContext(FrameWidth);
  return framed ?? width;
}

const ICON = require('../../assets/icon.png');

export function DesktopFrame({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const on = enabled && Platform.OS === 'web' && width >= FRAME_BREAK;
  if (!on) return <>{children}</>;
  const roomy = width >= 1180;
  return (
    <View style={st.stage}>
      {roomy && (
        <View style={st.brand} pointerEvents="none">
          <Image source={ICON} style={st.icon} accessibilityIgnoresInvertColors />
          <View>
            <Text style={st.brandName}>Six-Pack Stack</Text>
            <Text style={st.brandBy}>by Boon Fay</Text>
          </View>
        </View>
      )}
      <View style={st.column}>
        <FrameWidth.Provider value={FRAME_W}>{children}</FrameWidth.Provider>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  stage: { flex: 1, backgroundColor: '#0e1529', alignItems: 'center',
    // a soft glow behind the column so it reads as the focus of the page
    ...(Platform.OS === 'web' ? ({ backgroundImage: 'radial-gradient(ellipse 60% 70% at 50% 40%, #1d2a4d 0%, #0e1529 70%)' } as any) : null) },
  column: { flex: 1, width: '100%', maxWidth: FRAME_W, backgroundColor: '#ffffff', overflow: 'hidden',
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 80px rgba(0,0,0,0.45)' } as any) : null) },
  brand: { position: 'absolute', top: 28, left: 32, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.92 },
  icon: { width: 38, height: 38, borderRadius: 9 },
  brandName: { fontFamily: F.black, fontSize: 16, color: '#ffffff', letterSpacing: -0.2 },
  brandBy: { fontFamily: F.semi, fontSize: 12.5, color: 'rgba(214,224,242,0.7)', marginTop: 1 },
});
