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
export const ClockIcon = ({ color = '#fff', size = 16 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={9} {...base(color)} /><Path d="M12 7v5l3 2" {...base(color)} /></Svg>
);
export const DumbbellIcon = ({ color = '#fff', size = 16 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11" {...base(color)} strokeWidth={2.4} /></Svg>
);
export const LayersIcon = ({ color = '#fff', size = 16 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3l9 5-9 5-9-5z" {...base(color)} /><Path d="M3 13l9 5 9-5" {...base(color)} /></Svg>
);
export const TargetIcon = ({ color = '#fff', size = 16 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={9} {...base(color)} /><Circle cx={12} cy={12} r={5} {...base(color)} /><Circle cx={12} cy={12} r={1.5} fill={color} /></Svg>
);
export const NoteIcon = ({ color = '#fff', size = 14 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={9} {...base(color)} /><Path d="M12 11v5M12 8h.01" {...base(color)} strokeWidth={2.6} /></Svg>
);
export const ChevronIcon = ({ color = '#fff', size = 18 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M9 6l6 6-6 6" {...base(color)} strokeWidth={2.4} /></Svg>
);
export const ScaleIcon = ({ color = '#fff', size = 18 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={3} y={3} width={18} height={18} rx={4} {...base(color)} /><Path d="M8 9a5 5 0 0 1 8 0" {...base(color)} /><Path d="M12 9l1.5-2" {...base(color)} /></Svg>
);
export const RulerIcon = ({ color = '#fff', size = 18 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={2} y={8} width={20} height={8} rx={2} {...base(color)} /><Path d="M6 8v3M10 8v4M14 8v3M18 8v4" {...base(color)} /></Svg>
);
export const StepsIcon = ({ color = '#fff', size = 18 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M7 4c1.7 0 2.5 2 2.5 4.5S8.7 13 7 13s-2.5-2-2.5-4.5S5.3 4 7 4zM5 16h4M17 9c1.7 0 2.5 2 2.5 4.5S18.7 18 17 18s-2.5-2-2.5-4.5S15.3 9 17 9zM15 21h4" {...base(color)} /></Svg>
);
export const CameraIcon = ({ color = '#fff', size = 18 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...base(color)} /><Circle cx={12} cy={13} r={3.5} {...base(color)} /></Svg>
);
export const BoltIcon = ({ color = '#fff', size = 18 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M13 2L4 14h7l-1 8 9-12h-7z" {...base(color)} /></Svg>
);
export const ForkIcon = ({ color = '#fff', size = 18 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M17 3c-1.7 0-3 2.2-3 5s1.3 4 3 4v9" {...base(color)} /></Svg>
);
export const HungerIcon = ({ color = '#fff', size = 18 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={8} {...base(color)} /><Circle cx={12} cy={12} r={4} {...base(color)} /></Svg>
);
export const TrophyIcon = ({ color = '#fff', size = 18 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6" {...base(color)} /></Svg>
);
export const MountainIcon = ({ color = '#fff', size = 18 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 20l6-10 4 6 2-3 6 7z" {...base(color)} /><Path d="M9 10V4l4 2-4 2" {...base(color)} /></Svg>
);
export const QuestionIcon = ({ color = '#fff', size = 18 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={9} {...base(color)} /><Path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01" {...base(color)} strokeWidth={2.4} /></Svg>
);
export const ShieldIcon = ({ color = '#fff', size = 14 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" {...base(color)} /></Svg>
);
