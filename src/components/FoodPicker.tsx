import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, F } from '../lib/theme';
import { CheckIcon } from './icons';
import { CAT_LABEL, CAT_ORDER, FOOD_DB, foodById, makeCustomFood, QUICK_START, type Food, type FoodCat } from '../data/foods';
import { whatsMissing } from '../lib/mealplan';
import { track } from '../lib/track';

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
      <TextInput value={q} onChangeText={setQ} placeholder="Search any food (e.g. salmon, bagels, tofu)" placeholderTextColor="rgba(255,255,255,0.45)"
        style={st.search} accessibilityLabel="Search foods" autoCorrect={false} />

      {!q && (
        <View style={st.tabs}>
          {CAT_ORDER.map((c) => (
            <Pressable key={c} accessibilityRole="tab" accessibilityState={{ selected: cat === c }} onPress={() => setCat(c)} style={[st.tab, cat === c && st.tabOn]}>
              <Text style={[st.tabText, cat === c && { color: C.navy }]}>{CAT_LABEL[c]}{count(c) ? ` · ${count(c)}` : ''}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={st.grid}>
        {list.map((f) => {
          const on = sel.has(f.id);
          return (
            <Pressable key={f.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(f.id)} style={[st.chip, on && st.chipOn]}>
              {on && <View style={st.tick}><CheckIcon size={10} /></View>}
              <Text style={st.chipText}>{f.name}</Text>
            </Pressable>
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
      <TextInput value={name} onChangeText={setName} placeholder="Name (e.g. Mom's chili)" placeholderTextColor="rgba(255,255,255,0.45)" style={st.search} />
      <TextInput value={serving} onChangeText={setServing} placeholder="One serving (e.g. 1 bowl, 1 bar, 2 slices)" placeholderTextColor="rgba(255,255,255,0.45)" style={st.search} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextInput value={kcal} onChangeText={(t) => setKcal(t.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="Calories" placeholderTextColor="rgba(255,255,255,0.45)" style={[st.search, { flex: 1 }]} />
        <TextInput value={p} onChangeText={(t) => setP(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="Protein (g)" placeholderTextColor="rgba(255,255,255,0.45)" style={[st.search, { flex: 1 }]} />
      </View>
      <View style={[st.tabs, { flexWrap: 'wrap' }]}>
        {(['protein', 'carb', 'veg', 'fruit', 'dairy', 'snack', 'fat'] as FoodCat[]).map((c) => (
          <Pressable key={c} onPress={() => setCat(c)} style={[st.tab, cat === c && st.tabOn]}><Text style={[st.tabText, cat === c && { color: C.navy }]}>{CAT_LABEL[c]}</Text></Pressable>
        ))}
      </View>
      {!!err && <Text style={[st.note, { color: C.red2 }]}>{err}</Text>}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={[st.addBtn, { flex: 1 }]}><Text style={st.addText}>Cancel</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={save} style={[st.addBtn, { flex: 1, backgroundColor: C.red, borderColor: C.red }]}><Text style={st.addText}>Add food</Text></Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  search: { height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.navy2, color: C.white, paddingHorizontal: 16, fontFamily: F.semi, fontSize: 15 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.navy2 },
  tabOn: { backgroundColor: C.white, borderColor: C.white },
  tabText: { fontFamily: F.bold, fontSize: 13, color: C.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.navy2 },
  chipOn: { borderColor: C.red, backgroundColor: 'rgba(226,67,59,0.16)' },
  chipText: { fontFamily: F.semi, fontSize: 14, color: C.white },
  tick: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  addBtn: { height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: C.white, alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: F.black, fontSize: 14, color: C.white, letterSpacing: 0.4, textTransform: 'uppercase' },
  summary: { borderRadius: 16, borderWidth: 1.5, borderColor: C.line, backgroundColor: 'rgba(20,38,69,0.6)', padding: 14, gap: 4 },
  sumTitle: { fontFamily: F.black, fontSize: 16, color: C.white },
  note: { fontFamily: F.semi, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.75)' },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 2, borderColor: C.red, backgroundColor: 'rgba(226,67,59,0.12)', padding: 16 },
  quickK: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red2 },
  quickT: { fontFamily: F.black, fontSize: 16, color: C.white },
  quickPlus: { fontFamily: F.black, fontSize: 32, color: C.white, marginTop: -4 },
  own: { gap: 10, borderRadius: 16, borderWidth: 1.5, borderColor: C.red, padding: 14, backgroundColor: C.navy2 },
});
