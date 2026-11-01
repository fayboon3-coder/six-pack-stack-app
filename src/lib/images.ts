import type { ImageSourcePropType } from 'react-native';

export const IMG = {
  dumbbells: require('../../assets/img/dumbbells.jpg'),
  creatine: require('../../assets/img/creatine.png'),
  whey: require('../../assets/img/whey.png'),
  c4: require('../../assets/img/c4.png'),
  xtend: require('../../assets/img/xtend.png'),
  hydroxycut: require('../../assets/img/hydroxycut.png'),
  prime: require('../../assets/img/prime.png'),
  quest: require('../../assets/img/quest.png'),
  centrum: require('../../assets/img/centrum.png'),
  goli: require('../../assets/img/goli.png'),
  mass: require('../../assets/img/mass.png'),
  melatonin: require('../../assets/img/melatonin.png'),
  betaalanine: require('../../assets/img/betaalanine.png'),
  nugenix: require('../../assets/img/nugenix.png'),
  collagen: require('../../assets/img/collagen.png'),
  ozempic: require('../../assets/img/ozempic.png'),
  shaker: require('../../assets/img/shaker.png'),
  roller: require('../../assets/img/roller.png'),
  watch: require('../../assets/img/watch.png'),
  scale: require('../../assets/img/scale.png'),
} as const;

const RULES: [RegExp, keyof typeof IMG][] = [
  [/creatine/i, 'creatine'],
  [/whey|gold standard|protein powder/i, 'whey'],
  [/serious mass|gainer/i, 'mass'],
  [/\bc4\b|pre-?workout/i, 'c4'],
  [/xtend|bcaa/i, 'xtend'],
  [/hydroxycut|fat burner/i, 'hydroxycut'],
  [/prime/i, 'prime'],
  [/quest|protein bar/i, 'quest'],
  [/centrum|multivitamin/i, 'centrum'],
  [/goli|apple cider/i, 'goli'],
  [/melatonin|natrol/i, 'melatonin'],
  [/beta-?alanine/i, 'betaalanine'],
  [/nugenix|test(osterone)? booster/i, 'nugenix'],
  [/collagen|vital proteins/i, 'collagen'],
  [/ozempic|semaglutide|glp/i, 'ozempic'],
];

/** Product photo for a supplement name, if we have one. */
export function productImage(name: string): ImageSourcePropType | null {
  const hit = RULES.find(([re]) => re.test(name));
  return hit ? IMG[hit[1]] : null;
}
