import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabase';
import { VERDICTS, type Verdict } from './stackcheck';

/**
 * Food and label scanning:
 * - Barcode → Open Food Facts (free, public food database).
 * - Meal photo or label photo → Stack (the ask-boon server function) reads it.
 * - Supplements → matched to Boon's Stack Check verdicts.
 */
export type Nutrition = { name: string; brand?: string; serving?: string; kcal: number; protein: number; carbs?: number | null; fat?: number | null; per?: 'serving' | '100g' };
export type MealGuess = { items: (Nutrition & { portion?: string })[]; total: Nutrition; note?: string; confidence?: 'high' | 'medium' | 'low' };
export type LabelRead = {
  kind: 'food' | 'supplement' | 'other';
  name: string; brand?: string; serving?: string;
  kcal?: number; protein?: number; carbs?: number; fat?: number;
  ingredients?: string[]; note?: string;
  match?: Verdict | null;
};
export type ScanFail = { ok: false; reason: 'not_ready' | 'limit' | 'offline' | 'unclear' | 'signed_out'; msg: string };

const FN = `${SUPABASE_URL}/functions/v1/ask-boon`;
const r0 = (n: unknown) => (n == null || n === '' || isNaN(Number(n)) ? null : Math.round(Number(n)));

/** Shrink a photo to 1024px and turn it into base64 JPEG for the AI (about 150 KB). */
export async function prepImage(uri: string): Promise<{ data: string; media: 'image/jpeg' } | null> {
  try {
    const ctx = ImageManipulator.manipulate(uri).resize({ width: 1024 });
    const img = await ctx.renderAsync();
    const out = await img.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
    return out.base64 ? { data: out.base64, media: 'image/jpeg' } : null;
  } catch { return null; }
}

/** Barcode → Open Food Facts. Per serving when the label has it, otherwise per 100 g. */
export async function lookupBarcode(code: string): Promise<Nutrition & { image?: string; categories?: string } | null> {
  const c = code.replace(/\D/g, '');
  if (c.length < 6) return null;
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${c}.json?fields=product_name,brands,serving_size,nutriments,image_front_small_url,categories`);
    if (!r.ok) return null;
    const j = await r.json();
    const p = j?.product; if (!p || j.status === 0) return null;
    const n = p.nutriments || {};
    const hasServing = n['energy-kcal_serving'] != null || n['proteins_serving'] != null;
    const pick = (k: string) => (hasServing ? n[`${k}_serving`] : n[`${k}_100g`]);
    return {
      name: String(p.product_name || 'Unnamed product').trim(), brand: p.brands ? String(p.brands).split(',')[0].trim() : undefined,
      serving: hasServing ? p.serving_size : '100 g', per: hasServing ? 'serving' : '100g',
      kcal: r0(pick('energy-kcal')) ?? 0, protein: r0(pick('proteins')) ?? 0, carbs: r0(pick('carbohydrates')), fat: r0(pick('fat')),
      image: p.image_front_small_url, categories: p.categories,
    };
  } catch { return null; }
}

const norm = (x: string) => ` ${x.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
/**
 * Is this a product Boon has a verdict on? Match the product name, longest name or nickname wins
 * (so "Micronized Creatine Powder" is creatine, not whey because of the brand).
 */
export function supplementMatch(...texts: (string | null | undefined)[]): Verdict | null {
  for (const text of texts) {
    if (!text) continue;
    const t = norm(text);
    let best: Verdict | null = null, len = 0;
    for (const v of VERDICTS) for (const a of [v.name, ...v.aliases]) {
      const n = norm(a);
      if (n.trim().length > 2 && t.includes(n) && n.length > len) { best = v; len = n.length; }
    }
    if (best) return best;
  }
  return null;
}

/** Design previews only (never in real builds): a sample read so the screens can be checked. */
const DEMO_RESULT: Record<string, any> = {
  food_photo: { items: [{ name: 'Grilled chicken breast', portion: 'about 6 oz', kcal: 280, protein: 52, carbs: 0, fat: 6 }, { name: 'White rice', portion: '1 cup', kcal: 205, protein: 4, carbs: 45, fat: 0 }, { name: 'Broccoli', portion: '1 cup', kcal: 30, protein: 3, carbs: 6, fat: 0 }], confidence: 'medium', note: 'Looks like a chicken and rice bowl. If there was oil or sauce, add about 100 calories.' },
  label: { kind: 'supplement', name: 'Micronized Creatine Powder', brand: 'Optimum Nutrition', serving: '5 g', ingredients: ['Creatine monohydrate'], match: 'creatine', note: 'Plain creatine monohydrate.' },
};

async function call(body: Record<string, unknown>): Promise<{ ok: true; j: any } | ScanFail> {
  const demo = process.env.EXPO_PUBLIC_DEMO === '1';
  if (demo) { await new Promise((r) => setTimeout(r, 900)); return { ok: true, j: { result: DEMO_RESULT[String(body.mode)] } }; }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session && !demo) return { ok: false, reason: 'signed_out', msg: 'Sign in again, then snap it one more time.' };
  try {
    const r = await fetch(FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${session ? session.access_token : SUPABASE_KEY}` },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 429) return { ok: false, reason: 'limit', msg: "That's today's photo scans. They come back tomorrow. You can still type it in below." };
    if (['not_live', 'unknown_mode', 'empty'].includes(j.error) || (r.ok && !j.result && !j.answer)) return { ok: false, reason: 'not_ready', msg: 'Photo scanning switches on with the next server update. Type it in below for now.' };
    if (!r.ok) return { ok: false, reason: 'offline', msg: "I couldn't read that one. Check your signal and try again." };
    return { ok: true, j };
  } catch { return { ok: false, reason: 'offline', msg: "I couldn't reach the server. Check your signal and try again." } as ScanFail; }
}

/** Meal photo → foods with calories and protein. */
export async function scanMeal(uri: string, hint?: string): Promise<{ ok: true; meal: MealGuess } | ScanFail> {
  const img = await prepImage(uri);
  if (!img) return { ok: false, reason: 'unclear', msg: "That photo didn't load. Try another one." };
  const r = await call({ mode: 'food_photo', image: img.data, media: img.media, hint: hint || '' });
  if (!r.ok) return r;
  const m = r.j.result;
  if (!m?.items?.length) return { ok: false, reason: 'unclear', msg: m?.note || "I couldn't tell what's in that one. Try a photo from above, or type it in." };
  const items = m.items.map((x: any) => ({ name: String(x.name), portion: x.portion, kcal: r0(x.kcal) ?? 0, protein: r0(x.protein) ?? 0, carbs: r0(x.carbs), fat: r0(x.fat) }));
  const sum = (k: 'kcal' | 'protein' | 'carbs' | 'fat') => items.reduce((n: number, x: any) => n + (x[k] || 0), 0);
  return { ok: true, meal: { items, total: { name: items.map((x: any) => x.name).slice(0, 3).join(', '), kcal: sum('kcal'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat') }, note: m.note, confidence: m.confidence } };
}

/** Label photo → nutrition facts (food) or ingredients and Boon's verdict (supplement). */
export async function scanLabel(uri: string): Promise<{ ok: true; label: LabelRead } | ScanFail> {
  const img = await prepImage(uri);
  if (!img) return { ok: false, reason: 'unclear', msg: "That photo didn't load. Try another one." };
  const r = await call({ mode: 'label', image: img.data, media: img.media });
  if (!r.ok) return r;
  const l = r.j.result;
  if (!l?.name) return { ok: false, reason: 'unclear', msg: l?.note || "I couldn't read that label. Get closer, in good light, flat on." };
  const label: LabelRead = {
    kind: l.kind === 'supplement' ? 'supplement' : l.kind === 'food' ? 'food' : 'other', name: String(l.name), brand: l.brand, serving: l.serving,
    kcal: r0(l.kcal) ?? undefined, protein: r0(l.protein) ?? undefined, carbs: r0(l.carbs) ?? undefined, fat: r0(l.fat) ?? undefined,
    ingredients: Array.isArray(l.ingredients) ? l.ingredients.slice(0, 20).map(String) : undefined, note: l.note,
  };
  label.match = label.kind === 'supplement' ? supplementMatch(l.match, label.name, `${label.name} ${label.brand || ''}`) : null;
  return { ok: true, label };
}
