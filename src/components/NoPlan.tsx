import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { Linking, View } from 'react-native';
import { Body, Button, Card, Eyebrow, H1 } from './ui';
import Screen from './Screen';

export const WHATSAPP = '13232290609';

export default function NoPlan({ name }: { name?: string | null }) {
  const { refresh } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    const t = setInterval(refresh, 30000); // pick up the plan as soon as it's delivered
    return () => clearInterval(t);
  }, [refresh]);
  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}>
      <View style={{ gap: 8, marginTop: 12 }}>
        <Eyebrow>Six-Pack Stack</Eyebrow>
        <H1 style={{ textTransform: 'uppercase', fontSize: 32, lineHeight: 34 }}>
          {name ? `${name}, your plan is on its way.` : 'Your plan is on its way.'}
        </H1>
      </View>
      <Card>
        <Body>Boon builds every plan by hand from your intake form, within 48 hours.</Body>
        <Body>When it's ready, it shows up right here: your stack, meals, training and goal.</Body>
      </Card>
      <Card>
        <Eyebrow color="#ffffff">Haven't done your intake yet?</Eyebrow>
        <Body>It's in your welcome email. It takes about 10 minutes.</Body>
      </Card>
      <Button title="Text Boon on WhatsApp" variant="ghost" onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}`)} />
    </Screen>
  );
}
