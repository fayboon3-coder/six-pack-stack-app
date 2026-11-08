import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, F } from '../lib/theme';
import { CheckIcon } from './icons';
import { CAT_LABEL, CAT_ORDER, FOOD_DB, foodById, makeCustomFood, QUICK_START, type Food, type FoodCat } from '../data/foods';
import { whatsMissing } from '../lib/mealplan';
import { track } from '../lib/track';
import { foodPhoto } from '../lib/foodPhotos';
import { FOOD_HD } from '../lib/hd';
import Pic from './Pic';
import { Pop, Press } from './motion';

/** Popular picks shown first in each category. */
const POPULAR = ['chicken_breast', 'ground_beef_93', 'eggs', 'salmon', 'sirloin', 'turkey_deli', 'whey', 'greek_yogurt',
  'white_rice', 'potato', 'oats', 'pasta', 'bread_ww', 'tortilla', 'sweet_potato', 'broccoli', 'salad_greens', 'bell_peppers',
  'green_beans', 'banana', 'berries', 'apple', 'milk_2', 'cottage_cheese', 'peanut_butter', 'avocado', 'cheddar', 'salsa'];

/**
 * Pick every food you'd happily eat. Search, browse by category, or add your own.
 * The meal plan is built only from what's selected here.
 */
export default function FoodPicker({ ids, custom, onChange }: {
  ids: string[]; custom: Food[]; onChange: (ids: string[], custom: Food[]) => void;
}) {
  const [cat, setCat] = useState<FoodCat>('protein');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const sel = new Set(ids);
  const toggle = (id: string) => onChange(sel.has(id) ? ids.filter((x) => x !== id) : [...ids, id], custom);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const pool = [...FOOD_DB, ...custom];
    if (s) return pool.filter((f) => (f.name + ' ' + (f.aka || '') + ' ' + CAT_LABEL[f.cat]).toLowerCase().includes(s)).slice(0, 30);
    const inCat = pool.filter((f) => f.cat === cat);
    return [...inCat].sort((a, b) => rank(a) - rank(b));
  }, [q, cat, custom]);

  const chosen = ids.map((id) => custom.find((f) => f.id === id) || foodById(id)).filter(Boolean) as Food[];
  const missing = whatsMissing(chosen);
  const count = (c: FoodCat) => chosen.filter((f) => f.cat === c).length;

  return (
    <View style={{ gap: 14 }}>
      {ids.length < 5 && (
        <Pressable accessibilityRole="button" onPress={() => { track('foods_quick_start'); onChange([...new Set([...ids, ...QUICK_START])], custom); }} style={st.quick}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={st.quickK}>In a hurry?</Text>
            <Text style={st.quickT}>Quick start: add 20 common foods</Text>
            <Text style={st.note}>Chicken, eggs, rice, potatoes, oats, fruit, veggies and more. Remove anything you don't eat.</Text>
          </View>
          <Text style={st.quickPlus}>+</Text>
        </Pressable>
      )}
      <TextInput value={q} onChangeText={setQ} placeholder="Search any food (e.g. salmon, bagels, tofu)" placeholderTextColor="rgba(27,36,64,0.45)"
        style={st.search} accessibilityLabel="Search foods" autoCorrect={false} />

      {!q && (
        <View style={st.tabs}>
          {CAT_ORDER.map((c) => (
            <Pressable key={c} accessibilityRole="tab" accessibilityState={{ selected: cat === c }} onPress={() => setCat(c)} style={[st.tab, cat === c && st.tabOn]}>
              <Text style={[st.tabText, cat === c && { color: C.bg }]}>{CAT_LABEL[c]}{count(c) ? ` · ${count(c)}` : ''}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={st.grid}>
        {list.map((f) => {
          const on = sel.has(f.id);
          const src = foodPhoto(f.id);
          return (
            <Press key={f.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={f.name} onPress={() => toggle(f.id)} scale={0.95} style={st.cell}>
              <View style={[st.pic, on && st.picOn]}>
                {src || FOOD_HD[f.id] ? <Pic source={src} hd={FOOD_HD[f.id]} w={360} style={st.fill} />
                  : <View style={[st.fill, st.own0]}><Text style={st.own0T}>{f.name.slice(0, 1).toUpperCase()}</Text></View>}
                {on && <View style={st.veil} />}
                <Pop show={on} style={st.tick}><CheckIcon size={12} color="#fff" /></Pop>
              </View>
              <Text style={[st.cellT, on && { fontFamily: F.bold }]} numberOfLines={2}>{f.name}</Text>
            </Press>
          );
        })}
        {!list.length && <Text style={st.note}>No match. Add it as your own food below.</Text>}
      </View>

      {adding ? <AddOwn onAdd={(f) => { setAdding(false); setQ(''); onChange([...ids.filter((x) => x !== f.id), f.id], [...custom.filter((x) => x.id !== f.id), f]); }} onCancel={() => setAdding(false)} defaultCat={cat} />
        : (
          <Pressable accessibilityRole="button" onPress={() => setAdding(true)} style={st.addBtn}>
            <Text style={st.addText}>+ Add a food that isn't here</Text>
          </Pressable>
        )}

      <View style={st.summary}>
        <Text style={st.sumTitle}>{chosen.length} food{chosen.length === 1 ? '' : 's'} picked</Text>
        <Text style={st.note}>{missing.length ? `For a full plan, add ${missing.join(', ')}.` : 'Great. That’s enough to build a full plan. Add more for more variety.'}</Text>
      </View>
    </View>
  );
}

const rank = (f: Food) => { const i = POPULAR.indexOf(f.id); return f.custom ? -1 : i === -1 ? 100 : i; };

function AddOwn({ onAdd, onCancel, defaultCat }: { onAdd: (f: Food) => void; onCancel: () => void; defaultCat: FoodCat }) {
  const [name, setName] = useState('');
  const [serving, setServing] = useState('');
  const [kcal, setKcal] = useState('');
  const [p, setP] = useState('');
  const [cat, setCat] = useState<FoodCat>(defaultCat === 'sauce' || defaultCat === 'snack' ? defaultCat : defaultCat);
  const [err, setErr] = useState('');
  const save = () => {
    const k = Number(kcal), pr = Number(p || 0);
    if (!name.trim()) return setErr('Name it first.');
    if (!k || k < 5 || k > 2000) return setErr('Enter the calories for one serving (check the label).');
    if (pr < 0 || pr * 4 > k * 1.05) return setErr('That protein is more than the calories allow. Check the label.');
    onAdd(makeCustomFood(name.trim(), serving.trim() || 'serving', k, pr, cat));
  };
  return (
    <View style={st.own}>
      <Text style={st.sumTitle}>Add your own food</Text>
      <Text style={st.note}>Use the nutrition label for one serving.</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Name (e.g. Mom's chili)" placeholderTextColor="rgba(27,36,64,0.45)" style={st.search} />
      <TextInput value={serving} onChangeText={setServing} placeholder="One serving (e.g. 1 bowl, 1 bar, 2 slices)" placeholderTextColor="rgba(27,36,64,0.45)" style={st.search} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextInput value={kcal} onChangeText={(t) => setKcal(t.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="Calories" placeholderTextColor="rgba(27,36,64,0.45)" style={[st.search, { flex: 1 }]} />
        <TextInput value={p} onChangeText={(t) => setP(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="Protein (g)" placeholderTextColor="rgba(27,36,64,0.45)" style={[st.search, { flex: 1 }]} />
      </View>
      <View style={[st.tabs, { flexWrap: 'wrap' }]}>
        {(['protein', 'carb', 'veg', 'fruit', 'dairy', 'snack', 'fat'] as FoodCat[]).map((c) => (
          <Pressable key={c} onPress={() => setCat(c)} style={[st.tab, cat === c && st.tabOn]}><Text style={[st.tabText, cat === c && { color: C.bg }]}>{CAT_LABEL[c]}</Text></Pressable>
        ))}
      </View>
      {!!err && <Text style={[st.note, { color: C.red }]}>{err}</Text>}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={[st.addBtn, { flex: 1 }]}><Text style={st.addText}>Cancel</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={save} style={[st.addBtn, { flex: 1, backgroundColor: C.red, borderColor: C.red }]}><Text style={st.addText}>Add food</Text></Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  search: { height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card, color: C.ink, paddingHorizontal: 16, fontFamily: F.semi, fontSize: 15 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card },
  tabOn: { backgroundColor: C.ink, borderColor: C.ink },
  tabText: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  cell: { width: '31.5%', gap: 6 },
  pic: { width: '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#eeece6', borderWidth: 2.5, borderColor: 'transparent' },
  picOn: { borderColor: C.red },
  fill: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  veil: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(16,23,42,0.18)' },
  tick: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  cellT: { fontFamily: F.semi, fontSize: 13, lineHeight: 17, color: C.ink },
  own0: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#e6e3dc' },
  own0T: { fontFamily: F.black, fontSize: 28, color: C.ink },
  addBtn: { height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: F.black, fontSize: 14, color: C.ink, letterSpacing: 0.4, textTransform: 'uppercase' },
  summary: { borderRadius: 16, borderWidth: 1.5, borderColor: C.line, backgroundColor: 'rgba(20,38,69,0.6)', padding: 14, gap: 4 },
  sumTitle: { fontFamily: F.black, fontSize: 16, color: C.ink },
  note: { fontFamily: F.semi, fontSize: 13, lineHeight: 19, color: 'rgba(27,36,64,0.75)' },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 2, borderColor: C.red, backgroundColor: 'rgba(226,67,59,0.12)', padding: 16 },
  quickK: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red },
  quickT: { fontFamily: F.black, fontSize: 16, color: C.ink },
  quickPlus: { fontFamily: F.black, fontSize: 32, color: C.ink, marginTop: -4 },
  own: { gap: 10, borderRadius: 16, borderWidth: 1.5, borderColor: C.red, padding: 14, backgroundColor: C.card },
});
