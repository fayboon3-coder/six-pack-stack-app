import React from 'react';
import { Text } from 'react-native';
import { C } from '../lib/theme';

/** "White part|Red part": everything after the | is brand red, like the App Store headlines. */
export function twoTone(text: string) {
  const i = text.indexOf('|');
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <Text style={{ color: C.red }}>{text.slice(i + 1)}</Text>
    </>
  );
}
