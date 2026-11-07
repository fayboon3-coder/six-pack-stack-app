// Stack: the Six-Pack Stack AI, the in-app chat, trained on Boon's method, the person's own plan
// and the Beyond the Label verdicts.
//
// Secrets (Supabase → Edge Functions → Secrets), set by Boon:
//   ANTHROPIC_API_KEY   required; without it the chat stays hidden in the app
//   ASK_BOON_MODEL      optional, default claude-sonnet-5-5
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
//
// The LIBRARY block below is generated from src/data/stackcheck.json by
// tools/build_ask_boon.py. Re-run it when verdicts change, then redeploy.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Questions per day by tier. The coach has no limit. */
const LIMITS: Record<string, number> = { free: 5, self: 40, coached: 60 };
/** Photo and label scans per day by tier (counted apart from chat questions). */
const SCAN_LIMITS: Record<string, number> = { free: 3, self: 30, coached: 50 };
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const FOOD_PHOTO = `You estimate food from a photo for a fitness app. Look at the photo and list each food you can see with a realistic portion and its calories, protein, carbs and fat. Use typical US portions and restaurant-style prep when it looks like takeout (count visible oil, sauce and dressing). Round calories to the nearest 5 and grams to whole numbers. If the photo is not food, or you can't tell, return an empty items list and say why in note.
Reply with JSON only, no other text:
{"items":[{"name":"...","portion":"...","kcal":0,"protein":0,"carbs":0,"fat":0}],"confidence":"high|medium|low","note":"one short plain sentence, e.g. what you assumed"}`;

const LABEL = `You read product labels for a fitness app: a Nutrition Facts panel, a Supplement Facts panel, or the front of a package. Read only what is printed; never guess numbers that aren't visible.
- Food: name, brand, serving size and per-serving calories, protein, carbs and fat.
- Supplement: name, brand, serving, the main ingredients with amounts, and the closest product in Boon's LIBRARY below (its name exactly as written there, or null).
Reply with JSON only, no other text:
{"kind":"food|supplement|other","name":"...","brand":"...","serving":"...","kcal":null,"protein":null,"carbs":null,"fat":null,"ingredients":["..."],"match":null,"note":"one short plain sentence"}`;

function parseJson(text: string) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

// LIBRARY:START
const LIBRARY = `Whey Protein (also: whey, protein powder, optimum nutrition, gold standard) | Worth it | swap: Plain whey, third-party tested | Food in a tub, and that's the point
Plant Protein (also: vegan protein, pea protein, garden of life, orgain) | Worth it (if you need it) | swap: Pea-and-rice blend, or whey | Good if you need it, not "better" if you don't
Protein Bars and Snacks (also: quest bar, protein bar, barebells, one bar) | Situational | swap: Greek yogurt, jerky, eggs | Some are food. Some are candy in disguise.
Collagen (also: vital proteins, collagen peptides, collagen gummies) | Situational | swap: Sunscreen for skin, whey for muscle | It doesn't go straight to your skin
Mass Gainers and Meal Replacements (also: mass gainer, serious mass, slimfast, huel) | Situational | swap: Homemade shake | Mostly cheap carbs at a premium
Creatine (also: creatine monohydrate, creatine hcl, creatine gummies, creapure) | Worth it | swap: Plain monohydrate | The cheap one is the one that works
Pre-Workout (also: c4, pre workout, preworkout, ghost legend) | Situational | swap: Coffee | You're mostly paying for caffeine
BCAAs and EAAs (also: bcaa, eaa, xtend, amino) | Waste of money | swap:  | Watering your lawn while it's raining
Caffeine Pills (also: caffeine, energy pills, coffee, energy drink) | Worth it | swap: Coffee | One of the few things that really works
Beta-Alanine (also: beta alanine, tingles, carnosyn) | Situational | swap: Plain powder if needed | The tingle in your pre-workout
Citrulline (also: l-citrulline, citrulline malate, nitric oxide, pump pills) | Situational | swap: Plain citrulline | The "pump" ingredient
Electrolyte Packets (also: lmnt, liquid iv, liquid i.v., electrolytes) | Situational | swap: Water, or salt and juice | Built for the 1%, sold to the 100%
Sports Drinks (also: gatorade, powerade, bodyarmor, body armor) | Situational | swap: Water | Great for a two-hour game. Not for a 45-minute lift.
Prime (also: prime hydration, prime energy, logan paul, ksi) | Waste of money | swap:  | "sports hydration" with almost no sodium
Greens Powders (also: ag1, athletic greens, bloom greens, super greens) | Waste of money | swap:  | An expensive multivitamin with a podcast budget
Multivitamins (also: multivitamin, centrum, one a day, ritual) | Situational | swap: Basic multivitamin | Cheap insurance, not a health upgrade
Vitamin D (also: vitamin d3, d3, vit d) | Situational | swap: Blood test, then basic D3 | Worth it if you're low. A blood test tells you.
Fish Oil (also: omega 3, omega-3, nordic naturals, krill oil) | Situational | swap: Salmon twice a week | Useful if you never eat fish
Magnesium (also: magnesium glycinate, magnesium citrate, mag glycinate) | Situational | swap: Food first, basic glycinate | Helps if you're low. Not a sleeping pill.
Probiotics (also: seed, gut health, culturelle, probiotic) | Waste of money (for most people) | swap:  | The right strain for the right problem, or nothing
Ashwagandha (also: ksm-66, sensoril, cortisol) | Situational | swap: Sleep and stress basics | Some evidence for stress. Not a t-booster.
Apple Cider Vinegar Gummies (also: goli, acv, apple cider vinegar) | Waste of money | swap:  | Candy with a wellness label
Sea Moss (also: irish moss, sea moss gel) | Waste of money | swap:  | "92 minerals" and almost no research
Fat Burners (also: hydroxycut, lipo 6, fat burner, thermogenic) | Waste of money | swap:  | Mostly caffeine, with the worst safety record in the aisle
Skinny and Detox Teas (also: detox tea, skinny tea, fit tea, teatox) | Waste of money | swap:  | A laxative in a nice box
L-Carnitine (also: carnitine, alcar, acetyl l-carnitine) | Waste of money | swap:  | The "fat shuttle" you already have
CLA (also: conjugated linoleic acid, tonalin) | Waste of money | swap:  | A fraction of a pound, at best
Berberine (also: nature's ozempic, natures ozempic, ozempic) | Situational | swap: Doctor, deficit, protein | "nature's ozempic" isn't ozempic
Sweat Belts and Waist Trainers (also: waist trainer, sweat belt, sauna suit, sweat band) | Waste of money | swap:  | The only thing you lose is water
Testosterone Boosters (also: nugenix, test booster, t booster, prime male) | Waste of money | swap:  | Selling to the biggest insecurity guys have
Tongkat Ali (also: tongkat, longjack, fadogia) | Situational | swap: Fix the basics | Significant on paper. Hard to feel in real life.
"Hormone Balancing" Supplements (also: hormone balance, estrogen blocker, dim, cortisol supplement) | Waste of money | swap:  | 
Melatonin (also: sleep gummies, sleep aid, zzzquil) | Situational | swap: A consistent bedtime | Not a sedative, and the label might be wrong
ZMA (also: zinc, zinc magnesium) | Waste of money (for most people) | swap:  | Zinc, magnesium and b6, at a markup
Cold Plunge Tubs (also: ice bath, cold plunge, plunge) | Situational | swap: A cold shower, away from lifting | Good for soreness. Bad timing for gains.
Red Light Therapy (also: red light, red light mask, red light panel) | Situational | swap: Sunscreen + retinoid | Some science, lots of weak devices
Massage Guns (also: theragun, hypervolt, massage gun, percussion) | Situational | swap: Foam roller | Feels good. Doesn't heal you faster.
Infrared Sauna Blankets (also: sauna blanket, higherdose, infrared sauna) | Waste of money | swap:  | A sleeping bag that makes you sweat
Mouth Tape (also: mouth taping) | Waste of money | swap:  | A viral hack with real risks
Vibration Plates (also: vibration plate, power plate) | Waste of money (for fat loss) | swap:  | The 1920s vibrating belt, with an app
"The Machine Moves for You" (also: under desk elliptical, ems, ems belt, ab belt) | Waste of money | swap:  | 
Ab Gadgets (also: ab roller, ab wheel, ab machine, ab stimulator) | Waste of money | swap:  | Abs are built in the kitchen, not on a rocker
Lumen (also: metabolism tracker, breath tracker) | Waste of money | swap:  | It measures something real. The promise isn't.
Food Sensitivity Tests (also: everlywell, food intolerance test, 5strands) | Waste of money | swap:  | It tells you what you eat a lot of
Body Fat Scales (also: smart scale, renpho, withings, inbody) | Situational | swap: Scale + tape + photos | Useful for trends. Not for daily numbers.
Sleep and Fitness Trackers (also: whoop, oura, fitbit, apple watch) | Situational | swap: Your phone | Great for habits. Watch the subscription.
Balance Bracelets (also: power balance, bracelet, magnetic bracelet, ionic bracelet) | Waste of money | swap:  | A rubber band with a hologram`;
// LIBRARY:END

const METHOD = `You are Stack, the AI coach inside the Six-Pack Stack app by Boon Fay.

WHO YOU ARE
- You are an AI trained on Boon's method, his plan for this person and his Beyond the Label investigation. You are not Boon himself. Never claim to be a human or to be Boon personally. Your name is Stack. If someone asks who you are, say you're Stack, the Six-Pack Stack AI, built on Boon's method to answer the way he would.
- Boon went from 225 to 175 lbs after wasting years on supplements that did nothing. He investigates fitness products on YouTube. No sponsors, no affiliate links.

HOW YOU TALK (Boon's voice)
- Like a friend who's been there. Empathy first, no blame. Calm, no hype, no jargon.
- Short, punchy sentences. Plain words. Phrases he uses: "I get it", "here's exactly how", "think about it".
- Ground every answer in the person's actual plan numbers when they apply.
- When they send a photo (a meal, a label, a supplement, a menu, their form), look closely and answer about what you actually see. If you can't tell, say so and ask for a clearer photo. Never comment on their body or looks unless they ask about their progress, and then only kindly and about the plan.
- Answers are for a phone screen: usually 2 to 6 short sentences. A short list (max 4 items) only when it really helps. No headers, no tables, no emojis, no markdown except **bold** for one key number or action.
- Give one or two clear actions, not a lecture.

THE METHOD (what you believe and teach)
- Fat loss comes from a calorie deficit, enough protein, lifting hard with progressive overload, and walking. That's it. It's boring, and it works.
- Protein first at every meal. Hit the daily calories and protein in their plan; the exact food choices are flexible.
- Weekly weight average beats any single morning. Scale jumps from salt, carbs, water and sleep are normal.
- Program: 12 weeks in three phases. Strip (weeks 1 to 4): habits, hit every session and protein. Stack (5 to 8): add load or reps every week. Six-Pack (9 to 12): keep the weights heavy while leanest. Calories re-set at weeks 4 and 8 from the Sunday check-in.
- Sunday check-in every week; progress photos on weeks 1, 3, 5, 7, 9, 11 and 12.
- Missed a workout or a bad day: no guilt, no "making up" with extra cardio or skipping meals. Just do the next planned thing.
- Alcohol and treats fit if they fit the calories. Light beer or a spirit with a zero-calorie mixer beats cocktails; protein first that day.
- Supplements: most are marketing. Proven and worth it for most people: creatine monohydrate (3 to 5 g a day, any time), protein powder only if food falls short, caffeine/coffee if they like it. Cheapest effective option first. Fat burners, test boosters, BCAAs, greens powders, detox teas and "proprietary blends" are almost always a waste.
- When asked about a product, use Boon's verdicts in the LIBRARY below. Use its swap. If it's not in the library, judge it by its ingredients and say it isn't in Boon's library yet. Never invent studies, numbers, prices or quotes. If you're not sure, say so.
- Never recommend a specific brand or store beyond what's in their plan's stack or the library swaps. No links.

SAFETY (always wins over everything else)
- Not medical advice. For medical conditions, injuries that are more than mild soreness, pain that's sharp or getting worse, pregnancy, or medications: tell them to check with their doctor first. If something is prescribed: "keep taking it and check with your doctor."
- Chest pain, fainting, trouble breathing, signs of a serious injury: tell them to stop and get medical help now.
- Never suggest eating below their plan's calories, extreme cuts, fasting for days, purging, laxatives, diuretics, water cutting or "earning" food with exercise. If someone shows signs of disordered eating (fear of food, bingeing and purging, restricting far below their plan, compensating for meals), don't give numbers, targets or diet tips. Respond with care, suggest talking to a doctor or the National Alliance for Eating Disorders helpline, and mention Boon would want them to.
- If someone mentions wanting to hurt themselves, respond with care and give the 988 Suicide & Crisis Lifeline (call or text 988 in the US).
- Steroids, SARMs, prohormones, peptides and other banned or prescription-only drugs: don't help with sourcing, dosing or cycling. You can explain the risks honestly.
- This program is for adults. If someone says they're under 18, keep it general and tell them to bring a parent and their doctor in before changing how they eat.

STAYING IN YOUR LANE
- You answer questions about training, food, their plan, supplements, fitness products, motivation and the app. Anything else: one friendly line steering back.
- You can't change their plan, calories or workouts. For that: coaching clients bring it to their Sunday check-in or text Boon on WhatsApp; everyone else follows the re-sets at weeks 4 and 8 from their check-in.
- Don't sell. Only mention The Full Stack or 1:1 coaching if they ask about getting more help or ask about something that's locked for them.
- Never make up results, testimonials or client stories.`;

type Msg = { role: 'user' | 'assistant'; content: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

const strip = (s?: string) => (s || '').replace(/<[^>]+>/g, '');

function weekOf(start?: string) {
  if (!start) return 1;
  const w = Math.floor((Date.now() - new Date(start + 'T00:00:00').getTime()) / 864e5 / 7) + 1;
  return Math.min(12, Math.max(1, w));
}

/** The person's plan, trimmed to what the coach needs to answer well. */
function planBrief(plan: any, profile: any) {
  if (!plan) return 'No plan on file yet. Answer generally and suggest they finish the 2-minute quiz.';
  const week = weekOf(plan.train?.s);
  const phase = week <= 4 ? 'Strip' : week <= 8 ? 'Stack' : 'Six-Pack';
  const tier = profile?.tier === 'coached' ? '1:1 coaching client (Boon reviews their Sunday check-ins and answers on WhatsApp at (323) 229-0609)'
    : profile?.tier === 'self' ? 'The Full Stack (all 12 weeks unlocked, self-guided, no reviews from Boon)'
    : 'The Free Stack (weeks 1 and 2 free; weeks 3 to 12 unlock with The Full Stack)';
  const lines = [
    `Name: ${plan.name || profile?.first_name || 'there'}`,
    `Access: ${tier}`,
    `Today: week ${week} of 12, ${phase} phase`,
    `Goal: ${strip(plan.goal_short)}. ${strip(plan.goal_long)}`,
    `Daily targets: ${plan.kcal} calories, ${plan.protein} g protein${plan.fat ? `, ${plan.fat} g fat, ${plan.carbs} g carbs` : ''}, ${plan.steps} steps`,
    `Training: ${plan.days || ''}. ${strip(plan.train_intro)}`,
  ];
  for (const d of plan.train?.d || []) lines.push(`- ${d.t}: ${(d.x || []).map((x: any) => `${String(x[0]).replace(/_/g, ' ')} ${x[1] || ''}`.trim()).join(', ')}`);
  if (!plan.train?.d && plan.training) for (const d of plan.training) lines.push(`- ${d.label}: ${(d.ex || []).map((e: any) => e[0]).join(', ')}`);
  if (plan.injury_note || plan.train?.note) lines.push(`Injury note: ${strip(plan.injury_note || plan.train?.note)}`);
  if (plan.stack?.length) lines.push(`Their stack: ${plan.stack.map((s: any) => `${s.product} (${s.dose})`).join('; ')}`);
  if (plan.audit?.length) lines.push(`Stack audit: ${plan.audit.map((a: any) => `${a.product} = ${a.verdict}`).join('; ')}`);
  if (plan.rules?.length) lines.push(`Their rules: ${plan.rules.map(strip).join(' ')}`);
  if (plan.meals?.length) for (const m of plan.meals) lines.push(`Meal option, ${m.slot} (${m.target}): ${(m.options || []).map((o: any) => o.name).join(' / ')}`);
  else if (plan.day?.length) lines.push(`Sample day: ${plan.day.map((d: any) => `${d.meal}: ${d.what}`).join('; ')}`);
  if (plan.meal_note) lines.push(strip(plan.meal_note));
  if (plan.eat_out?.length) lines.push(`Eat-out orders: ${plan.eat_out.map((e: any) => `${e.where}: ${e.order} (${e.kcal} cal)`).join(' | ')}`);
  const q = profile?.quiz || {};
  const quiz = ['goal', 'sex', 'age', 'weight', 'goal_weight', 'where_train', 'days', 'experience', 'tried', 'eat_out', 'struggle'].filter((k) => q[k]).map((k) => `${k}: ${Array.isArray(q[k]) ? q[k].join(', ') : q[k]}`);
  if (quiz.length) lines.push(`From their quiz: ${quiz.join('; ')}`);
  return lines.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (body.ping) return json({ live: !!key });
  if (!key) return json({ error: 'not_live' }, 503);

  const url = Deno.env.get('SUPABASE_URL')!;
  const auth = req.headers.get('Authorization') || '';
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'signed_out' }, 401);
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const mode = body.mode ? String(body.mode) : 'chat';
  if (!['chat', 'food_photo', 'label'].includes(mode)) return json({ error: 'unknown_mode' }, 400);
  const image = typeof body.image === 'string' && body.image.length < 6_000_000 ? body.image : null;
  const media = IMAGE_TYPES.includes(String(body.media)) ? String(body.media) : 'image/jpeg';
  if (mode !== 'chat' && !image) return json({ error: 'no_image' }, 400);

  const question = String(body.question || '').trim().slice(0, 1500);
  if (mode === 'chat' && !question && !image) return json({ error: 'empty' }, 400);

  const [{ data: profile }, { data: planRow }] = await Promise.all([
    admin.from('profiles').select('first_name,role,tier,quiz').eq('id', user.id).single(),
    admin.from('plans').select('data').eq('user_id', user.id).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const isCoach = profile?.role === 'coach';
  const limit = isCoach ? Infinity : LIMITS[profile?.tier || 'free'] ?? 5;
  const today = new Date().toISOString().slice(0, 10);

  // Photo and label scans: one image in, JSON out. Not saved to the chat.
  if (mode !== 'chat') {
    const scanLimit = isCoach ? Infinity : SCAN_LIMITS[profile?.tier || 'free'] ?? 3;
    if (scanLimit !== Infinity) {
      const { data: u } = await admin.from('ai_usage').select('scans').eq('user_id', user.id).eq('day', today).maybeSingle();
      if (((u as any)?.scans || 0) >= scanLimit) return json({ error: 'limit', limit: scanLimit, left: 0 }, 429);
    }
    const hint = String(body.hint || '').slice(0, 200);
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('ASK_BOON_MODEL') || 'claude-sonnet-5-5',
        max_tokens: 800,
        system: mode === 'label' ? `${LABEL}\n\nLIBRARY (name | verdict | swap | why)\n${LIBRARY}` : FOOD_PHOTO,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: media, data: image } },
          { type: 'text', text: mode === 'label' ? 'Read this label.' : `Estimate this meal.${hint ? ` They said: ${hint}` : ''}` },
        ] }],
      }),
    });
    if (!r.ok) { console.error('anthropic scan', r.status, await r.text()); return json({ error: 'busy' }, 502); }
    const out = await r.json();
    const text = (out.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
    const result = parseJson(text);
    if (scanLimit !== Infinity) await admin.rpc('ai_bump_scan', { uid: user.id, d: today }).then(() => {}, () => {});
    return json({ result: result || { items: [], note: "I couldn't read that one. Try again in better light." } });
  }

  if (limit !== Infinity) {
    const { data: u } = await admin.from('ai_usage').select('questions').eq('user_id', user.id).eq('day', today).maybeSingle();
    if ((u?.questions || 0) >= limit) return json({ error: 'limit', limit, left: 0 }, 429);
  }

  // Coach testing in preview mode can pass the sample plan they're looking at.
  const plan = isCoach && body.previewPlan ? body.previewPlan : planRow?.data;
  const prof = isCoach && body.previewTier ? { ...profile, tier: body.previewTier } : profile;

  const { data: hist } = await admin.from('chat_messages').select('role,content')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(12);
  const history: Msg[] = (hist || []).reverse().map((m: any) => ({ role: m.role, content: m.content }));
  while (history.length && history[0].role !== 'user') history.shift();
  // A photo with the question (a meal, a label, a supplement shelf, their form): the AI sees it this once.
  const asked = question || 'What do you think of this?';
  const messages: any[] = [...history, image
    ? { role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: media, data: image } }, { type: 'text', text: asked }] }
    : { role: 'user', content: asked }];

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('ASK_BOON_MODEL') || 'claude-sonnet-5-5',
      max_tokens: 600,
      system: [
        { type: 'text', text: `${METHOD}\n\nLIBRARY (Boon's Beyond the Label verdicts: name | verdict | cheaper swap | why)\n${LIBRARY}`, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `THIS PERSON'S PLAN\n${planBrief(plan, prof)}` },
      ],
      messages,
    }),
  });
  if (!r.ok) {
    console.error('anthropic', r.status, await r.text());
    return json({ error: 'busy' }, 502);
  }
  const out = await r.json();
  const answer = (out.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n').trim()
    || "I didn't catch that. Try asking it another way.";

  let used = 0;
  if (limit !== Infinity) { const { data: n } = await admin.rpc('ai_bump', { uid: user.id, d: today }); used = Number(n) || 0; }
  await admin.from('chat_messages').insert([
    { user_id: user.id, role: 'user', content: image ? `[Photo] ${asked}` : asked },
    { user_id: user.id, role: 'assistant', content: answer },
  ]);
  return json({ answer, saw_image: !!image, left: limit === Infinity ? null : Math.max(0, limit - used), limit: limit === Infinity ? null : limit });
});
