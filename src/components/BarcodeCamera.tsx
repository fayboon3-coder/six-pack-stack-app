import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { C, F } from '../lib/theme';

/** Live camera that reads food barcodes (iPhone/Android). The web version lives in BarcodeCamera.web.tsx. */
export default function BarcodeCamera({ onCode, paused }: { onCode: (code: string) => void; paused?: boolean }) {
  const [perm, ask] = useCameraPermissions();
  const last = useRef('');
  useEffect(() => { if (perm && !perm.granted && perm.canAskAgain) ask(); }, [perm?.granted]);
  if (!perm) return <View style={st.box} />;
  if (!perm.granted) return (
    <View style={[st.box, { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }]}>
      <Text style={st.t}>Camera is off for this app</Text>
      <Text style={st.s}>Turn it on to scan barcodes, or type the number below.</Text>
      {perm.canAskAgain && <Pressable accessibilityRole="button" onPress={ask} style={st.btn}><Text style={st.btnT}>Allow camera</Text></Pressable>}
    </View>
  );
  return (
    <View style={st.box}>
      <CameraView style={StyleSheet.absoluteFill} facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={paused ? undefined : ({ data }) => { if (data && data !== last.current) { last.current = data; onCode(data); } }} />
      <View pointerEvents="none" style={st.frame}><View style={st.laser} /></View>
    </View>
  );
}

const st = StyleSheet.create({
  box: { width: '100%', aspectRatio: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: '#0d1426' },
  frame: { position: 'absolute', left: '12%', right: '12%', top: '30%', bottom: '30%', borderWidth: 3, borderColor: '#ffffff', borderRadius: 18, justifyContent: 'center' },
  laser: { height: 2, marginHorizontal: 10, backgroundColor: '#e2433b' },
  t: { fontFamily: F.xbold, fontSize: 17, color: '#fff', textAlign: 'center' },
  s: { fontFamily: F.medium, fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  btn: { height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  btnT: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
});
