export type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  role: 'client' | 'coach';
  tier: 'free' | 'self' | 'coached';
  start_date: string | null;
};

export type TrainDay = { t: string; x: [string, string, string?][] };

export type Plan = {
  name: string;
  goal_short: string;
  goal_long?: string;
  kcal: string;
  protein: string;
  fat?: string;
  carbs?: string;
  steps: string;
  days?: string;
  before?: number;
  after?: number;
  audit?: { product: string; cost: number; verdict: string; why: string; instead?: string }[];
  stack?: { product: string; why: string; dose: string; when: string; cost: string; buy?: string; buy_text?: string }[];
  meals?: { slot: string; target: string; options: { name: string; detail: string; kcal: string; protein: string }[] }[];
  meal_note?: string;
  rules?: string[];
  eat_out?: { where: string; order: string; kcal: string; protein: string }[];
  grocery?: { aisle: string; items: string }[];
  week1?: string[];
  phase1?: string;
  phase2?: string;
  phase3?: string;
  injury_note?: string;
  train: { n: string; s: string; e: number; note?: string; d: TrainDay[] };
};

export type Checkin = {
  id: string;
  week: number;
  checkin_date: string;
  weight: number | null;
  workouts: number | null;
  nutrition_days: number | null;
  energy: number | null;
  win: string | null;
};
