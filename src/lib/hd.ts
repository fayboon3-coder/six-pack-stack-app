/**
 * High-res photos, served from Unsplash's image CDN at the exact size each screen needs
 * (free to use under the Unsplash License). Every food in the meal builder has its own.
 * The small copies bundled in the app show instantly underneath and stay as the offline fallback.
 */
import type { Muscle } from './workoutMeta';

export const FOOD_HD: Record<string, string> = {
  almond_butter: '1546549095-5d8bc3c37ffa', almond_milk: '1786246124894-b47100b52af2', almonds: '1772986796415-d38ed846bca7',
  apple: '1670808439268-79d2cb00a46e', asparagus: '1780595678336-c19ab52fbbdf', avocado: '1519162808019-7de1683fa2ad',
  bacon: '1742859052497-f8bbc8366a32', bagel: '1651248341193-a4035e081fbc', banana: '1640958900081-7b069dd23e9c',
  bbq_sauce: '1761314015577-152fd86b7e25', beef_jerky: '1668887465493-c4b0351aea89', bell_peppers: '1678942907751-352ec565a043',
  berries: '1614630536429-74e43f302c31', beyond_burger: '1576843776838-032ac46fbb93', black_beans: '1627906327792-4ede6149189f',
  blueberries: '1692384196114-746749434cd9', bread: '1792170443599-2e79dcc8ca7e', bread_white: '1598373182308-3270495d2f58',
  bread_ww: '1534620808146-d33bb39128b2', broccoli: '1564874998499-1f3c14e9e8b6', brown_rice: '1680137248876-6ad53db8caef',
  brussels: '1685504507286-dc290728c01a', burger_bun: '1588861472194-6883d8b5e552', burrito: '1722239315206-95b344366a62',
  butter: '1587185717368-4d92f8de4ad2', canned_chicken: '1782849206240-1ae590dad531', carrots: '1576181256399-834e3b3a49bf',
  cauliflower: '1599184468760-a9d16d1bdc5e', cereal: '1646839013888-ec0e2a41fe9b', cheddar: '1589881133595-a3c085cb731d',
  cheese: '1683314573422-649a3c6ad784', cherries: '1675584362304-1db534ecb5ce', chia: '1604768802835-899055f0e245',
  chicken_breast: '1598515214211-89d3c73ae83b', chicken_sausage: '1691480241974-92481cef09ff', chicken_thigh: '1652545296821-09a023a9fd08',
  chickpeas: '1767875816994-88dd9d05ce2f', coleslaw: '1573403707491-38a4ea19edc1', coleslaw_mix: '1613314343568-81cb18989692',
  corn: '1783749924111-ee2d908f1de9', corn_tortilla: '1633442496018-6872fbfbbcc7', cottage_cheese: '1573810655264-8d1e50f1592d',
  couscous: '1582576163090-09d3b6f8a969', cream_cheese: '1707079266703-b67f36a881f1', cream_of_rice: '1777613112969-d7511ddfbe15',
  cucumber: '1589621316382-008455b857cd', dark_chocolate: '1646303339019-a57056b180ae', edamame: '1649257171206-37625b1f3b2f',
  egg_whites: '1607690424395-6660d838d818', eggs: '1687630433648-294f1c78b070', english_muffin: '1767425315674-26de4751638f',
  fairlife: '1576186726115-4d51596775d1', feta: '1661349008073-136bed6e6788', flank_steak: '1628497622880-896ed64d6034',
  granola: '1641536885341-301aeb52f1c0', granola_bar: '1633360821154-1935fb5671e6', grapes: '1641210444019-f61749d2951f',
  greek_yogurt: '1633104060731-32143505bacc', greek_yogurt_2: '1571212515416-fef01fc43637', green_beans: '1574963835594-61eede2070dc',
  ground_beef_85: '1609183556292-f208be1a9644', ground_beef_93: '1688228364972-c8dd37924945', ground_turkey: '1707056924976-6b524806dbc9',
  ham: '1607756794535-ba48a526b73a', honey: '1587049352851-8d4e89133924', hot_sauce: '1615810227931-4d9f62fd02aa',
  hummus: '1753364547864-679728b22c31', ice_cream: '1562790879-dfde82829db0', kale: '1685504513848-df0dd6893cec',
  ketchup: '1582998488406-08750eeb6d7b', kiwi: '1772432347573-c19e28f5dc64', lentils: '1638378545909-d78bd9b4271c',
  light_ice_cream: '1628815870980-f416105d89b3', light_mayo: '1562114808-b4b33cf60f4f', light_ranch: '1563599175592-c58dc214deff',
  lowcarb_tortilla: '1600935926387-12d9b03066f0', mango: '1582655299221-2b6bff351df0', marinara: '1644882767097-2f1748d80ec9',
  milk: '1517448931760-9bf4414148c5', milk_2: '1588710929895-6ee7a0a4d155', milk_skim: '1634141510639-d691d86f47be',
  mixed_nuts: '1772986796515-055c11e6c39e', mozzarella: '1633253037246-12bb11ff545a', mushrooms: '1713573997375-3fb3f77797eb',
  mustard: '1532641140-28932037521b', oats: '1779805903328-d64e57f3f8b4', olive_oil: '1474979266404-7eaacbcd87c5',
  onions: '1585849834908-3481231155e8', orange: '1645378193840-f4a90003285d', pancake: '1615205129530-49b8934b2294',
  pancake_mix: '1587339144367-f1cacbecac82', parmesan: '1655662844300-e59c3d2e7587', pasta: '1621996346565-e3dbc646d9a9',
  pasta_meat: '1622973536968-3ead9e780960', peach: '1642372849486-f88b963cb734', peanut_butter: '1615110250484-e8c3b151b957',
  pear: '1570115114436-63d3405246e7', peas: '1587334207407-deb137a955ba', pineapple: '1614963366795-973eb8748ebb', pita: '1608198093029-395e34909bb5',
  plant_protein: '1693996046865-19217d179161', popcorn: '1622155037308-2fad9f04f86d', pork_chop: '1612871689527-2a6145cc9e86',
  pork_tenderloin: '1763235874619-370def174aed', potato: '1633959639799-6d3f66e05710', pretzels: '1575996533050-d9eb7e1e7c0d',
  protein_bar: '1622484212850-eb596d769edc', protein_pasta: '1597393353365-9d4366392fe9', protein_shake_rtd: '1775199603318-7f8a9a63b40d',
  quinoa: '1615865417491-9941019fbc00', ramen_noodles: '1627900440398-5db32dba8db1', ribeye: '1588168333986-5078d3ae3976',
  rice_cakes: '1604462513073-ac805f9a642f', rotisserie_chicken: '1594221708779-94832f4320d1', salad_greens: '1685079253777-61c2c0de2956',
  salmon: '1519708227418-c8fd9a32b7a2', salsa: '1722239312531-486bbfd50f18', sandwich: '1553909489-cd47e0907980', seitan: '1624174503901-11e36ada9466',
  shrimp: '1627703378753-a7a5d0a87ee6', sirloin: '1558030006-450675393462', skyr: '1550594645-25c5bd703258', sourdough: '1693480532368-de842fb9dcf4',
  soy_sauce: '1499126167718-c87f5c1387e8', spinach: '1651427660796-1bc57aafa229', stir_fry: '1621515554656-3da68ba128b1',
  stir_fry_veg: '1592578630143-fac65cda7a67', strawberries: '1728359802820-dc9286d7ac54', string_cheese: '1778449665117-2c607bbc7415',
  sweet_potato: '1596097635121-14b63b7a0c23', tacos: '1599974579688-8dbdd335c77f', tempeh: '1716801564904-5605f562b664',
  teriyaki: '1783788357923-649e29b7b006', tofu: '1762305194201-077e7e23ccf2', tomatoes: '1546094096-0df4bcaaa337',
  tortilla: '1722239312666-84328fce4c6f', tuna_can: '1622756144420-6877b1b7476e', turkey_bacon: '1709096646334-127e31ada203',
  turkey_deli: '1697862446317-9f7d37ff0d21', watermelon: '1563114773-84221bd62daa', whey: '1774793476321-70f77d85a3a7',
  white_fish: '1587913956756-4fcf4833241d', white_rice: '1705147289789-6df2593f1b1e', wrap: '1746376344743-748f24e70157',
  ww_pasta: '1673442635965-34f1b36d8944', zucchini: '1691480291894-75229c2bfd44',
};

/** A real gym photo per main muscle of the day, plus home and bodyweight versions. */
export const WORKOUT_HD: Partial<Record<Muscle, string>> & Record<'home' | 'chest_bw' | 'back_bw', string> = {
  Chest: '1690731033723-ad718c6e585a', Back: '1790094180990-02826069d59b', Shoulders: '1704223523449-ca3925f89dcc',
  Quads: '1741478551868-a17b1644228d', Hamstrings: '1517836357463-d25dfeac3438', Glutes: '1647828150413-1717ace5bac2',
  Biceps: '1641337221253-fdc7237f6b61', Triceps: '1604480133080-602261a680df', Calves: '1704223523328-a822b65c6e1b', Abs: '1598971457999-ca4ef48a9a71',
  home: '1648659487787-79db84e9b2e2', chest_bw: '1598971639058-fab3c3109a00', back_bw: '1677165733273-dcc3724c00e8',
};

/** CDN address for a photo id at a given pixel width (3x the on-screen size is plenty). */
export const hdUrl = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export const foodHD = (id?: string | null) => (id && FOOD_HD[id]) || null;

export function workoutHD(m: Muscle | undefined, equip?: string): string {
  if (equip === 'bw') return m === 'Back' || m === 'Biceps' ? WORKOUT_HD.back_bw : WORKOUT_HD.chest_bw;
  if (equip === 'db' && (m === 'Chest' || m === 'Shoulders' || m === 'Triceps' || m === 'Biceps')) return WORKOUT_HD.home;
  return (m && WORKOUT_HD[m]) || WORKOUT_HD.Chest!;
}
