import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

type P = { color?: string; size?: number };
const base = (color: string) => ({ stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const HomeIcon = ({ color = '#fff', size = 22 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" {...base(color)} /></Svg>
);
export const TrainIcon = ({ color = '#fff', size = 22 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" {...base(color)} /></Svg>
);
export const PlanIcon = ({ color = '#fff', size = 22 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 3h9l4 4v14H6z" {...base(color)} /><Path d="M9 12h7M9 16h7" {...base(color)} /></Svg>
);
export const ProgressIcon = ({ color = '#fff', size = 22 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 19l5-6 4 3 7-9" {...base(color)} /></Svg>
);
export const ChatIcon = ({ color = '#fff', size = 22 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 5h16v11H9l-5 4z" {...base(color)} /></Svg>
);
export const CheckIcon = ({ color = '#0d1b33', size = 14 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5 12l5 5L20 7" stroke={color} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
);
export const PlayIcon = ({ color = '#fff', size = 18 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M7 4v16l13-8z" fill={color} /></Svg>
);
export const BackIcon = ({ color = '#fff', size = 22 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M15 18l-6-6 6-6" {...base(color)} strokeWidth={2.2} /></Svg>
);
export const PlusIcon = ({ color = '#fff', size = 22 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" {...base(color)} /></Svg>
);
export const FlameIcon = ({ color = '#ff5a50', size = 16 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-4-1-6 1-9.5z" fill={color} /></Svg>
);
export const LockIcon = ({ color = '#fff', size = 18 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={4} y={11} width={16} height={10} rx={2} {...base(color)} /><Path d="M8 11V7a4 4 0 0 1 8 0v4" {...base(color)} /></Svg>
);
export const DotIcon = ({ color = '#e2433b', size = 8 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 8 8"><Circle cx={4} cy={4} r={4} fill={color} /></Svg>
);
