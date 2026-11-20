/**
 * Advanced customization, training side: people describe what they do in their own words
 * and this turns it into the plan's real settings (split, days, equipment, favorite moves,
 * current lifts, moves to keep out). Nothing is required; anything not mentioned keeps the
 * plan's current setting. Every guess is shown back to them so they can remove it.
 */
import { exercises } from './program';
import {
  DEFAULT_DAYS, SPLITS, SPLITS_FOR, type Equip, type Lift, type SplitId, type TrainCfg,
} from './training';

const norm = (s: string) => ` ${s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;

/* ------------------------------------------------------------------ the week */

const DAY_WORDS: [RegExp, number][] = [
  [/\bsun(day)?s?\b/, 0], [/\bmon(day)?s?\b/, 1], [/\btue(s|sday)?s?\b/, 2], [/\bwed(nesday)?s?\b/, 3],
  [/\bthu(r|rs|rsday|rsdays)?\b/, 4], [/\bfri(day)?s?\b/, 5], [/\bsat(urday)?s?\b/, 6],
];
const NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, every: 7, daily: 7 };
const SPORTS: [RegExp, string][] = [
  [/jiu ?jitsu|bjj|grappling|wrestl/, 'Jiu-jitsu'], [/\brun(s|ning)?\b|\bjog/, 'Running'], [/basketball|hoops/, 'Basketball'],
  [/soccer|football/, 'Soccer'], [/boxing|muay thai|kickbox|\bmma\b/, 'Combat sports'], [/\bcycl|\bbik(e|ing)\b|spin class|peloton/, 'Cycling'],
  [/swim/, 'Swimming'], [/yoga|pilates/, 'Yoga / pilates'], [/hik(e|ing)/, 'Hiking'], [/crossfit/, 'CrossFit'], [/tennis|pickleball|golf/, 'Sport'],
];

export type WeekRead = {
  count?: number; days?: number[]; split?: SplitId; equip?: Equip; sports: string[];
  /** Plain notes on what we changed from what they said ("2 days → plans start at 3"). */
  notes: string[];
};

/** "I lift 4 days, Mon Tue Thu Fri, push pull legs at Planet Fitness, plus jiu-jitsu Wednesday nights". */
export function readWeek(text: string): WeekRead {
  const t = norm(text);
  const out: WeekRead = { sports: [], notes: [] };
  if (!t.trim()) return out;
  // Sports first, and the days next to them don't count as lifting days ("bjj wednesday").
  let lift = t;
  for (const [re, name] of SPORTS) {
    if (re.test(t)) {
      out.sports.push(name);
      lift = lift.replace(new RegExp(`(${re.source})((\\s+\\w+){0,3})`, 'g'), ' ');
    }
  }
  // Weekdays
  const days = new Set<number>();
  if (/\b(weekdays|mon(day)? (thru|through|to) fri(day)?|m f)\b/.test(lift)) [1, 2, 3, 4, 5].forEach((d) => days.add(d));
  if (/\bweekends?\b/.test(lift)) [0, 6].forEach((d) => days.add(d));
  const range = lift.match(/\b(mon|tue|wed|thu|fri|sat|sun)\w* (to|thru|through) (mon|tue|wed|thu|fri|sat|sun)\w*/);
  if (range) {
    const idx = (s: string) => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(s);
    for (let d = idx(range[1]); d !== (idx(range[3]) + 1) % 7; d = (d + 1) % 7) days.add(d);
  }
  for (const [re, d] of DAY_WORDS) if (re.test(lift)) days.add(d);
  // Count
  const m = lift.match(/\b(\d|one|two|three|four|five|six|seven)\s*(x|times|days?|d)\b/) || lift.match(/\b(every|daily)\b/);
  let count = m ? (Number(m[1]) || NUM[m[1]]) : undefined;
  if (!count && days.size) count = days.size;
  if (count) {
    if (count < 3) out.notes.push(`You said ${count} day${count > 1 ? 's' : ''}. Plans start at 3, so I set 3. Short sessions count.`);
    if (count > 6) out.notes.push('Every day is a lot to recover from, so I set 6 with one rest day.');
    count = Math.min(6, Math.max(3, count));
    out.count = count;
  }
  if (days.size && count) {
    const list = [...days].sort((a, b) => a - b);
    out.days = list.length === count ? list : list.length > count ? list.slice(0, count) : undefined;
  }
  // Split
  const n = out.count;
  if (/push pull legs|\bppl\b|push pull leg/.test(lift)) {
    out.split = n === 6 ? 'ppl6' : n === 4 ? 'pplu4' : n === 5 ? 'pplul5' : 'ppl3';
    if (!n) out.count = 3;
  } else if (/upper lower|upper body lower body|\bul\b/.test(lift)) {
    out.split = 'ul4'; if (!n) out.count = 4;
    if (n && n !== 4) out.split = SPLITS_FOR[n][0];
  } else if (/full body|total body|whole body/.test(lift)) {
    out.split = n === 3 || !n ? 'fb3' : SPLITS_FOR[n][0]; if (!n) out.count = 3;
  } else if (/bro split|one muscle|body part|chest day|arm day|back day/.test(lift)) {
    out.notes.push('Bro splits hit each muscle once a week. Twice grows faster, so your days are set up to hit every muscle twice.');
  }
  // Equipment
  if (/no equipment|bodyweight|calisthenics|no weights|no gym/.test(t)) out.equip = 'bw';
  else if (/home gym|garage|at home|dumbbells only|only dumbbells|just dumbbells|apartment gym/.test(t)) out.equip = /barbell|rack|cable/.test(t) ? 'gym' : 'db';
  else if (/\bgym\b|planet fitness|la fitness|equinox|24 hour|gold s|lifetime|crunch|anytime fitness|ymca|machines|cables/.test(t)) out.equip = 'gym';
  return out;
}

/* ------------------------------------------------------------------ exercises */

/** Extra names people use. The exercise's own name and its words already match. */
const ALIASES: Record<string, string[]> = {
  barbell_bench: ['bench', 'bench press', 'flat bench', 'bb bench'],
  db_bench: ['db bench', 'dumbbell bench', 'dumbbell press', 'db press', 'flat db press'],
  incline_db_press: ['incline', 'incline press', 'incline db', 'incline bench', 'incline dumbbell'],
  machine_chest_press: ['chest press', 'chest press machine', 'hammer strength press'],
  cable_fly: ['cable fly', 'cable flies', 'cable flyes', 'pec fly', 'pec deck', 'flies', 'flys', 'crossover', 'crossovers'],
  db_fly: ['db fly', 'dumbbell flies', 'dumbbell flyes'],
  machine_shoulder_press: ['shoulder press machine', 'machine press'],
  db_shoulder_press: ['shoulder press', 'db shoulder press', 'overhead press', 'ohp', 'military press', 'seated press'],
  cable_lateral_raise: ['cable lateral', 'cable laterals'],
  db_lateral_raise: ['lateral raise', 'lateral raises', 'laterals', 'side raise', 'side raises', 'side laterals', 'lat raise', 'lat raises'],
  rear_delt_fly: ['rear delt', 'rear delts', 'reverse fly', 'reverse pec deck'],
  face_pull: ['face pull', 'face pulls'],
  rope_pushdown: ['pushdown', 'pushdowns', 'tricep pushdown', 'triceps pushdown', 'rope pushdown', 'tricep extension', 'triceps extension'],
  oh_cable_ext: ['overhead extension', 'overhead tricep', 'overhead cable extension'],
  skull_crusher: ['skull crusher', 'skull crushers', 'skullcrusher', 'skullcrushers', 'lying tricep extension'],
  dip: ['dips', 'dip', 'chest dips', 'tricep dips'],
  lat_pulldown: ['pulldown', 'pulldowns', 'lat pull down', 'lat pulldowns', 'pull down', 'pull downs'],
  pull_up: ['pull up', 'pull ups', 'pullups', 'pullup'],
  chin_up: ['chin up', 'chin ups', 'chinups'],
  assisted_pull_up: ['assisted pull up', 'assisted pullups'],
  seated_cable_row: ['cable row', 'cable rows', 'seated row', 'seated rows', 'low row'],
  chest_supported_row: ['chest supported row', 't bar row', 'tbar row', 'machine row', 'hammer strength row'],
  barbell_row: ['bb row', 'bent over row', 'bent over rows', 'barbell rows', 'pendlay row'],
  one_arm_db_row: ['db row', 'dumbbell row', 'dumbbell rows', 'db rows', 'single arm row', 'one arm row', 'kroc row'],
  db_curl: ['curls', 'curl', 'bicep curl', 'bicep curls', 'biceps curls', 'db curl', 'db curls', 'dumbbell curls'],
  hammer_curl: ['hammer curls', 'hammers'],
  incline_curl: ['incline curl', 'incline curls'],
  preacher_curl: ['preacher', 'preacher curls', 'ez bar curl', 'ez curl'],
  cable_curl: ['cable curls'],
  back_squat: ['squat', 'squats', 'back squat', 'back squats', 'barbell squat', 'bb squat'],
  hack_squat: ['hack squat', 'hack squats', 'hack'],
  leg_press: ['leg press', 'legpress'],
  goblet_squat: ['goblet squat', 'goblet squats'],
  bulgarian_split_squat: ['bulgarian', 'bulgarians', 'split squat', 'split squats', 'bss'],
  walking_lunge: ['lunge', 'lunges', 'walking lunges'],
  db_reverse_lunge: ['reverse lunge', 'reverse lunges'],
  db_step_up: ['step up', 'step ups'],
  rdl: ['rdl', 'rdls', 'romanian', 'romanian deadlifts', 'stiff leg deadlift', 'sldl'],
  db_rdl: ['db rdl', 'dumbbell rdl', 'dumbbell rdls'],
  trap_bar_deadlift: ['deadlift', 'deadlifts', 'trap bar', 'hex bar', 'conventional deadlift', 'sumo deadlift'],
  hip_thrust: ['hip thrust', 'hip thrusts', 'glute bridge machine'],
  glute_bridge: ['glute bridge', 'glute bridges', 'bridges'],
  hip_abduction: ['abductor', 'abductors', 'abduction', 'hip abductor'],
  cable_kickback: ['kickback', 'kickbacks', 'glute kickback'],
  leg_extension: ['leg extension', 'leg extensions', 'quad extension', 'extensions'],
  seated_leg_curl: ['leg curl', 'leg curls', 'hamstring curl', 'hamstring curls', 'seated leg curl'],
  lying_leg_curl: ['lying leg curl', 'lying leg curls'],
  standing_calf_raise: ['calf raise', 'calf raises', 'calves', 'calf'],
  seated_calf_raise: ['seated calf', 'seated calf raises'],
  back_extension: ['back extension', 'back extensions', 'hyperextension', 'hyperextensions', 'hypers'],
  cable_crunch: ['cable crunch', 'cable crunches', 'rope crunch'],
  hanging_knee_raise: ['hanging knee raise', 'knee raises', 'hanging leg raise', 'hanging leg raises', 'leg raises'],
  ab_wheel: ['ab wheel', 'ab roller', 'rollouts'],
  plank: ['plank', 'planks'],
  push_up: ['push up', 'push ups', 'pushups', 'pushup'],
  landmine_press: ['landmine'],
  arnold_press: ['arnold', 'arnolds'],
};

type Term = { id: string; t: string };
let TERMS: Term[] | null = null;
function terms() {
  if (TERMS) return TERMS;
  const out: Term[] = [];
  for (const [id, ex] of Object.entries(exercises)) {
    out.push({ id, t: norm(ex.name) });
    (ALIASES[id] || []).forEach((a) => out.push({ id, t: norm(a) }));
  }
  TERMS = out.sort((a, b) => b.t.length - a.t.length); // longest first: "incline dumbbell curl" before "curl"
  return TERMS;
}

/** Every exercise named in a piece of text, in the order written, longest name wins. */
export function findMoves(text: string): { id: string; at: number; end: number }[] {
  let t = norm(text);
  const hits: { id: string; at: number; end: number }[] = [];
  for (const { id, t: term } of terms()) {
    let i = t.indexOf(term);
    while (i >= 0) {
      hits.push({ id, at: i, end: i + term.length });
      t = t.slice(0, i) + ' ' + '#'.repeat(term.length - 2) + ' ' + t.slice(i + term.length); // mask so shorter names can't match inside
      i = t.indexOf(term);
    }
  }
  const seen = new Set<string>();
  return hits.sort((a, b) => a.at - b.at).filter((h) => (seen.has(h.id) ? false : (seen.add(h.id), true)));
}

/** Pieces of their answer that named no exercise we know (offered as their own moves). */
export function unknownMoves(text: string) {
  return text.split(/,|;|\n|\band\b|\balso\b|\bplus\b/i).map((c) => c.replace(/\d+\s*(x|lbs?|reps?|for|kg)?/gi, ' ').replace(/\s+/g, ' ').trim())
    .filter((c) => c.length >= 3 && c.split(' ').length <= 4 && /[a-z]/i.test(c) && !findMoves(c).length
      && !/^(i|i like|i love|i do|my|mostly|usually|and|the|a lot|lots|some|stuff|cardio|everything|anything|nothing|none|no|idk|not sure)$/i.test(c));
}

/* ------------------------------------------------------------------ lifts */

/**
 * "bench 185x5, squat 225 for 8, 30s for 12 on curls, pulldown 140 lbs 10 reps" → lifts.
 * A weight with no reps comes back with r = 0 so we can ask for the reps.
 */
export function readLifts(text: string): { id: string; w: number; r: number }[] {
  const out: { id: string; w: number; r: number }[] = [];
  const chunks = text.split(/,|;|\n|\.(?!\d)|\band\b/i).map((c) => c.trim()).filter(Boolean);
  let lastId: string | null = null;
  for (const c of chunks) {
    const moves = findMoves(c);
    const id = moves[0]?.id || null;
    const s = c.toLowerCase();
    let w = 0, r = 0;
    const repsAt = s.match(/(\d{1,2})\s*reps?\s*(?:at|with|@|of)\s*(\d{1,4}(?:\.\d)?)/);
    const wxr = s.match(/(\d{1,4}(?:\.\d)?)\s*(?:lbs?|pounds|kgs?|s)?\s*(?:x|×|\*|for|by)\s*(\d{1,2})\b/);
    if (repsAt) { r = +repsAt[1]; w = +repsAt[2]; }
    else if (wxr) { w = +wxr[1]; r = +wxr[2]; }
    else {
      const wOnly = s.match(/(\d{1,4}(?:\.\d)?)\s*(lbs?|pounds|kgs?|s\b)/) || s.match(/\b(\d{2,4})\b/);
      if (wOnly) w = +wOnly[1];
      const rOnly = s.match(/(\d{1,2})\s*reps?/); if (rOnly) r = +rOnly[1];
    }
    if (/\d\s*kgs?\b/.test(s)) w = Math.round(w * 2.2046 / 5) * 5;
    const target = id || (w ? lastId : null);
    if (id) lastId = id;
    if (!target || !w || w > 1500 || r > 50) continue;
    if (out.some((o) => o.id === target)) continue;
    out.push({ id: target, w, r });
  }
  return out;
}

/* ------------------------------------------------------------------ pain */

/** Moves that usually bother each area. Kept out when they mention it; they can put any back. */
const AREA: [RegExp, string, string[]][] = [
  [/shoulder|rotator|labrum/, 'shoulder', ['barbell_bench', 'dip', 'arnold_press', 'db_shoulder_press', 'pike_push_up', 'skull_crusher']],
  [/lower back|low back|back pain|disc|sciatica/, 'lower back', ['back_squat', 'barbell_row', 'trap_bar_deadlift', 'rdl', 'back_extension']],
  [/knee|patella|acl|meniscus/, 'knee', ['walking_lunge', 'bulgarian_split_squat', 'back_squat', 'leg_extension', 'ffe_split_squat', 'db_step_up']],
  [/elbow|tennis elbow|golfers elbow/, 'elbow', ['skull_crusher', 'oh_db_ext', 'oh_cable_ext', 'dip', 'preacher_curl']],
  [/wrist/, 'wrist', ['barbell_bench', 'push_up', 'preacher_curl']],
  [/neck/, 'neck', ['back_squat']],
  [/hip\b|hips\b|groin/, 'hip', ['bulgarian_split_squat', 'walking_lunge', 'back_squat']],
];

export function readPain(text: string): { avoid: string[]; areas: string[] } {
  const t = norm(text);
  if (!t.trim() || /^\s*(no|none|nope|nothing|all good|im good|n a)\s*$/.test(t)) return { avoid: [], areas: [] };
  const avoid = new Set(findMoves(text).map((m) => m.id));
  const areas: string[] = [];
  for (const [re, name, ids] of AREA) if (re.test(t)) { areas.push(name); ids.forEach((i) => avoid.add(i)); }
  return { avoid: [...avoid], areas };
}

/* ------------------------------------------------------------------ all together */

export type TrainAnswers = { week?: string; moves?: string; lifts?: string; pain?: string };
/** What they took back out ("not that one"), and answers to the quick follow-ups. */
export type TrainEdits = { drop?: string[]; days?: number[]; reps?: Record<string, number>; extras?: string[] };

export type TrainRead = {
  cfg: TrainCfg; week: WeekRead; prefer: string[]; lifts: { id: string; w: number; r: number }[];
  avoid: string[]; areas: string[]; unknown: string[];
  /** Follow-ups worth asking (never required). */
  ask: { days?: number; reps?: string[] };
};

/** Their words + edits on top of the plan's current settings → the new settings. */
export function readTraining(base: TrainCfg, a: TrainAnswers, e: TrainEdits = {}): TrainRead {
  const drop = new Set(e.drop || []);
  const week = readWeek(a.week || '');
  let cfg: TrainCfg = { ...base, extras: [...base.extras] };
  if (week.equip && !drop.has('equip')) cfg.equip = week.equip;
  const n = !drop.has('days') && week.count ? week.count : SPLITS[cfg.split].days;
  const split = !drop.has('split') && week.split && SPLITS[week.split].days === n ? week.split
    : SPLITS[cfg.split].days === n ? cfg.split : SPLITS_FOR[n][0];
  const days = e.days?.length === n ? [...e.days].sort((x, y) => x - y)
    : !drop.has('days') && week.days?.length === n ? week.days
      : base.days.length === n ? base.days : DEFAULT_DAYS[n];
  cfg = { ...cfg, split, days, extras: cfg.extras.filter((x) => x.day < n) };

  const pain = readPain(a.pain || '');
  const avoid = pain.avoid.filter((id) => !drop.has('avoid:' + id));
  const liftsRead = readLifts(a.lifts || '').concat(readLifts(a.moves || '')).filter((l, i, arr) => arr.findIndex((x) => x.id === l.id) === i);
  const prefer = [...findMoves(a.moves || '').map((m) => m.id), ...liftsRead.map((l) => l.id)]
    .filter((id, i, arr) => arr.indexOf(id) === i && !drop.has('move:' + id) && !avoid.includes(id));
  // Customization owns favorites and lifts: they come from their words every time.
  const lifts: Record<string, Lift> = {};
  for (const l of liftsRead) {
    if (drop.has('lift:' + l.id)) continue;
    const r = l.r || e.reps?.[l.id] || 0;
    lifts[l.id] = { w: l.w, r };
  }
  // Their own moves (named, but not ones we know), offered and added only when they tap them.
  const unknown = unknownMoves(a.moves || '');
  let next: TrainCfg = { ...cfg, prefer, lifts, avoid: [...new Set([...(base.avoid || []), ...avoid])] };
  for (const name of e.extras || []) {
    if (!unknown.includes(name)) continue;
    const counts = Array.from({ length: n }, (_, d) => next.extras.filter((x) => x.day === d).length);
    const day = counts.indexOf(Math.min(...counts));
    if (counts[day] < 2 && !next.extras.some((x) => x.name.toLowerCase() === name.toLowerCase())) {
      next = { ...next, extras: [...next.extras, { id: `my_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30)}`, name, day, target: '3 × 10–15' }] };
    }
  }
  return {
    cfg: next, week, prefer, lifts: liftsRead.filter((l) => !drop.has('lift:' + l.id)), avoid, areas: pain.areas, unknown,
    ask: {
      days: week.count && !week.days && !(e.days?.length === n) ? n : undefined,
      reps: liftsRead.filter((l) => !l.r && !e.reps?.[l.id] && !drop.has('lift:' + l.id)).map((l) => l.id),
    },
  };
}
