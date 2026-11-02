import DATA from '../data/stackcheck.json';
import { IMG } from './images';

export type Verdict = {
  id: string; name: string; category: string; kind: 'worth' | 'situational' | 'skip'; verdict: string; evidence: string;
  cost: string; headline: string; intro: string; claim: string; research: string; swap: string; swap_short: string;
  mvr: [string, string][]; aliases: string[]; img: string;
};
export const VERDICTS = DATA as Verdict[];
export const KIND = {
  worth: { label: 'Worth it', color: '#3fbf7f', mark: '✓' },
  situational: { label: 'Depends', color: '#f2b234', mark: '–' },
  skip: { label: 'Skip it', color: '#e2433b', mark: '✕' },
} as const;
export const imageFor = (v: Verdict) => (v.img ? (IMG as any)[v.img] : null);
export const byId = (id: string) => VERDICTS.find((v) => v.id === id);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Search names, brands and nicknames ("ag1", "hydroxycut", "c4"). Best matches first. */
export function search(q: string): Verdict[] {
  const n = norm(q);
  if (!n) return VERDICTS;
  const scored = VERDICTS.map((v) => {
    const name = norm(v.name), al = v.aliases.map(norm);
    let s = 0;
    if (name === n || al.includes(n)) s = 100;
    else if (name.startsWith(n) || al.some((a) => a.startsWith(n))) s = 60;
    else if (name.includes(n) || al.some((a) => a.includes(n) || (n.length > 3 && n.includes(a)))) s = 40;
    else if (norm(v.category).includes(n) || norm(v.headline + ' ' + v.claim).includes(n)) s = 10;
    return { v, s };
  }).filter((x) => x.s > 0);
  return scored.sort((a, b) => b.s - a.s).map((x) => x.v);
}
