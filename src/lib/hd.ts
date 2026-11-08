/**
 * High-res photos, served from Unsplash's image CDN at the exact size each screen needs
 * (free to use under the Unsplash License). Every food in the meal builder has its own.
 * The small copies bundled in the app show instantly underneath and stay as the offline fallback.
 */
import type { Muscle } from './workoutMeta';

export const FOOD_HD: Record<string, string> = {
  almond_butter: '1546549095-5d8bc3c37ffa', almond_milk: '1786246124894-b47100b52af2', almonds: '1600188999986-331bec5f9a8d',
  apple: '1669864573166-f99a20334f46', asparagus: '1652803072914-9f6119191238', avocado: '1601039641847-7857b994d704',
  bacon: '1742859052497-f8bbc8366a32', bagel: '1651248341193-a4035e081fbc', banana: '1676495706236-f28daeef95d3',
  bbq_sauce: '1761315412952-a3a9e3ed06ff', beef_jerky: '1652209695374-7a91c243f12f', bell_peppers: '1592548868664-f8b4e4b1cfb7',
  berries: '1613082410785-22292e8426e7', beyond_burger: '1585238341710-4d3ff484184d', black_beans: '1627906327792-4ede6149189f',
  blueberries: '1714424195536-69b71929ab13', bread: '1628809643534-b3d1faffe8d2', bread_white: '1598373182308-3270495d2f58',
  bread_ww: '1509440159596-0249088772ff', broccoli: '1553175005-a1129d5c188c', brown_rice: '1680137248876-6ad53db8caef',
  brussels: '1628519842646-971123de6ffa', burger_bun: '1588861472194-6883d8b5e552', burrito: '1670213545277-b10f14e24dd9',
  butter: '1587185717368-4d92f8de4ad2', canned_chicken: '1782849206240-1ae590dad531', carrots: '1639427444459-85a1b6ac2d68',
  cauliflower: '1579705743135-bc6ef4f6a8d7', cereal: '1622711321771-4a00d2bc0350', cheddar: '1589881133595-a3c085cb731d',
  cheese: '1683314573422-649a3c6ad784', cherries: '1439127989242-c3749a012eac', chia: '1552528459-d631f10d025a',
  chicken_breast: '1641898378548-ac93da99786a', chicken_sausage: '1695089028198-80245e2f5d06', chicken_thigh: '1610057099431-d73a1c9d2f2f',
  chickpeas: '1515543904379-3d757afe72e4', coleslaw: '1654458804670-2f4f26ab3154', coleslaw_mix: '1693500387488-e2ca0aa70019',
  corn: '1683543124257-1d214be3a366', corn_tortilla: '1693193433392-da83457dff20', cottage_cheese: '1573810655264-8d1e50f1592d',
  couscous: '1708949125682-c0cb09727101', cream_cheese: '1707079266703-b67f36a881f1', cream_of_rice: '1573500020648-b3ec03fc6e42',
  cucumber: '1568584711271-6c929fb49b60', dark_chocolate: '1623000850264-08be785877bd', edamame: '1649257171206-37625b1f3b2f',
  egg_whites: '1607690424395-6660d838d818', eggs: '1628484641099-0e7ae67fbdc1', english_muffin: '1606851682541-2c947e1ddc9b',
  fairlife: '1576186726115-4d51596775d1', feta: '1736788262556-f4167319b8da', flank_steak: '1542365887-1149961dccc7',
  granola: '1742642415922-0039b8433318', granola_bar: '1633360821154-1935fb5671e6', grapes: '1631299106224-aae61c217164',
  greek_yogurt: '1530259152377-3a014e1092e0', greek_yogurt_2: '1571212515416-fef01fc43637', green_beans: '1574963835594-61eede2070dc',
  ground_beef_85: '1609183556292-f208be1a9644', ground_beef_93: '1688228364972-c8dd37924945', ground_turkey: '1738549067841-d43d349d573a',
  ham: '1609604820237-4cd9638aa43e', honey: '1665473052284-164335672208', hot_sauce: '1615810227931-4d9f62fd02aa',
  hummus: '1637949385162-e416fb15b2ce', ice_cream: '1580915411954-282cb1b0d780', kale: '1600398811198-f11d97598a46',
  ketchup: '1582998488406-08750eeb6d7b', kiwi: '1552801386-22419317d4d3', lentils: '1638378545909-d78bd9b4271c',
  light_ice_cream: '1689076758310-92b693fe6b8b', light_mayo: '1649509857226-b6f8ab4e6384', light_ranch: '1563599175592-c58dc214deff',
  lowcarb_tortilla: '1591266123515-46149ea0b0a9', mango: '1744035355878-222dc04f79f5', marinara: '1472476443507-c7a5948772fc',
  milk: '1602153508753-4ace888c10a0', milk_2: '1644346402970-d8d7304ff82f', milk_skim: '1639151082238-85f66f112b6f',
  mixed_nuts: '1671981200629-014c03829abb', mozzarella: '1676300185089-8781af127fee', mushrooms: '1512595765784-5ebad80772a3',
  mustard: '1532641140-28932037521b', oats: '1779805903328-d64e57f3f8b4', olive_oil: '1474979266404-7eaacbcd87c5',
  onions: '1664975367131-4c7ac2efa704', orange: '1612823426673-68ec0a97a2bc', pancake: '1555813456-94a3dd418cd3',
  pancake_mix: '1554520735-0a6b8b6ce8b7', parmesan: '1729671971046-428d29acfa1f', pasta: '1669717735312-2d085c36a09e',
  pasta_meat: '1600803907087-f56d462fd26b', peach: '1632751163367-01ff55bbc6b2', peanut_butter: '1615110250484-e8c3b151b957',
  pear: '1601876813368-7962dc48cfab', peas: '1632640107771-80c37386cfcd', pineapple: '1715896809746-8644dbf797f9', pita: '1608198093029-395e34909bb5',
  plant_protein: '1770123366817-743776f66d6a', popcorn: '1512149177596-f817c7ef5d4c', pork_chop: '1625604087024-7fb428fc4626',
  pork_tenderloin: '1625631980644-062c9a959279', potato: '1552845683-cfefc701e423', pretzels: '1644938051297-db4f9230f2c8',
  protein_bar: '1606312619070-d48b4c652a52', protein_pasta: '1597393353365-9d4366392fe9', protein_shake_rtd: '1627998792088-f8016b438988',
  quinoa: '1623428188495-89c064ee061a', ramen_noodles: '1612927601601-6638404737ce', ribeye: '1588168333986-5078d3ae3976',
  rice_cakes: '1604462513073-ac805f9a642f', rotisserie_chicken: '1630564510761-a560db92a09b', salad_greens: '1608032076946-23d89c6d6d0b',
  salmon: '1519708227418-c8fd9a32b7a2', salsa: '1722239312531-486bbfd50f18', sandwich: '1553909489-cd47e0907980', seitan: '1624174503901-11e36ada9466',
  shrimp: '1627703378753-a7a5d0a87ee6', sirloin: '1558030006-450675393462', skyr: '1550594645-25c5bd703258', sourdough: '1620921586333-b7566c34550a',
  soy_sauce: '1499126167718-c87f5c1387e8', spinach: '1617884638394-d9eef1b0f40e', stir_fry: '1618498731557-83a1df0e293c',
  stir_fry_veg: '1652282565076-d0c3eec834e7', strawberries: '1518635017498-87f514b751ba', string_cheese: '1778449665117-2c607bbc7415',
  sweet_potato: '1529589510304-b7e994a92f60', tacos: '1599974579688-8dbdd335c77f', tempeh: '1716801564904-5605f562b664',
  teriyaki: '1587759742417-7b1b79e457ed', tofu: '1583679863834-36f9db76eea4', tomatoes: '1592924357228-91a4daadcfea',
  tortilla: '1722239312666-84328fce4c6f', tuna_can: '1761315600943-d8a5bb0c499f', turkey_bacon: '1709096646334-127e31ada203',
  turkey_deli: '1605454264082-f8edb5f851c5', watermelon: '1787836865955-009bbab5aee2', whey: '1774793476321-70f77d85a3a7',
  white_fish: '1561651823-34feb02250e4', white_rice: '1516684732162-798a0062be99', wrap: '1626700051175-6818013e1d4f',
  ww_pasta: '1556761223-4c4282c73f77', zucchini: '1657045992734-b1dbaf4372ba',
};

/** A real gym photo per main muscle of the day, plus home and bodyweight versions. */
export const WORKOUT_HD: Partial<Record<Muscle, string>> & Record<'home' | 'chest_bw' | 'back_bw', string> = {
  Chest: '1690731033723-ad718c6e585a', Back: '1790094180990-02826069d59b', Shoulders: '1704223523449-ca3925f89dcc',
  Quads: '1741478551868-a17b1644228d', Hamstrings: '1605296867304-46d5465a13f1', Glutes: '1647828150413-1717ace5bac2',
  Biceps: '1641337221253-fdc7237f6b61', Triceps: '1604480133080-602261a680df', Calves: '1704223523328-a822b65c6e1b', Abs: '1598971457999-ca4ef48a9a71',
  home: '1648659487787-79db84e9b2e2', chest_bw: '1598971639058-fab3c3109a00', back_bw: '1677165733273-dcc3724c00e8',
};

/** Restaurant orders and everyday meals: iconic, ad-style dishes (no logos, nothing from the chains themselves). */
export const MEAL_HD: Record<string, string> = {
  starbucks: '1461023058943-07fcbe16d735', egg_bites: '1518310532637-f5225f94f3c3', latte: '1760163178873-7644a924519e',
  chipotle: '1668665771757-4d42737d295a', subway: '1554433607-66b5efe9d304', chickfila: '1700768400970-428c50bffc11',
  mcdonalds: '1594212699903-ec8a3eca50f5', panda: '1705596704813-b39b95549cd2', pizza: '1777891257674-36c5532e6654',
  burger: '1586190848861-99aa4a171e90', beer: '1618183479302-1e0aa382c36b', shake: '1553787499-6f9133860278',
  smoothie: '1615478503562-ec2d8aa0e24e', jerky: '1652209695374-7a91c243f12f', sandwich: '1705537459006-f4acbd93c5a3',
  salmon: '1519708227418-c8fd9a32b7a2', steak: '1588168333986-5078d3ae3976', teriyaki: '1771384552858-feb0574f958d',
  eggs: '1582169505937-b9992bd01ed9', oats: '1610406765661-57646c40da59', yogurt_bowl: '1550594645-25c5bd703258',
  yogurt: '1769434128978-05cff39dd5c1', salad: '1604909052743-94e838986d24', chicken_rice: '1579619002916-88cd4c81a70c',
};

/** Header photos: the plan, the stack, the scale, the gym. */
export const HEADER_HD = {
  plan: '1667499745120-f9bcef8f584e', stack: '1763747958224-7726941b0b15', scale: '1646829873498-e874cfa27933',
  dumbbells: '1672344048213-76b6e77304bd', gym: '1648235692910-947cb90ddd97',
};

/** Shown on the You tab and under eating-out orders. */
export const CREDITS = 'Photos by Unsplash photographers, used under the Unsplash License. Restaurant and brand names are trademarks of their owners, used only to describe menu items and products. Six-Pack Stack isn\u2019t affiliated with or endorsed by any restaurant or brand named in the app.';

/** CDN address for a photo id at a given pixel width (3x the on-screen size is plenty). */
export const hdUrl = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export const foodHD = (id?: string | null) => (id && FOOD_HD[id]) || null;

export function workoutHD(m: Muscle | undefined, equip?: string): string {
  if (equip === 'bw') return m === 'Back' || m === 'Biceps' ? WORKOUT_HD.back_bw : WORKOUT_HD.chest_bw;
  if (equip === 'db' && (m === 'Chest' || m === 'Shoulders' || m === 'Triceps' || m === 'Biceps')) return WORKOUT_HD.home;
  return (m && WORKOUT_HD[m]) || WORKOUT_HD.Chest!;
}
