/**
 * Professional photos from Unsplash (free to use under the Unsplash License).
 * Swap any of these for Boon's own photos later: same keys, local files.
 */
const u = (id: string, w = 1080) => `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

export const PHOTO = {
  signIn: u('photo-1611672585731-fa10603fb9e0'),      // man in headphones, dark gym
  upper: u('photo-1671316149446-4da1e921c007'),       // dumbbell work, red shirt
  lower: u('photo-1770664612843-b44e26070024'),       // barbell squat
  lowerAbs: u('photo-1709315957145-a4bad1feef28'),    // barbell, dark gym
  fullBody: u('photo-1517836357463-d25dfeac3438'),    // about to lift the barbell
  gym: u('photo-1770513649465-2c60c8039806'),         // dark gym interior
  plan: u('photo-1762631383628-77f92d18b184'),        // chicken and rice bowl
  breakfast: u('photo-1559332167-dd24746aa6f5'),      // eggs and toast
  lunch: u('photo-1762631383815-784c04533802'),       // chicken, rice, beans bowl
  afternoon: u('photo-1558017487-06bf9f82613a'),      // shake over dumbbells
  dinner: u('photo-1713742000867-404a4a32dd72'),      // steak dinner
  eatOut: u('photo-1561758033-d89a9ad46330'),         // burger and fries
  grocery: u('photo-1636057915164-0cc9d6a54975'),     // fresh produce
  stack: u('photo-1774793476321-70f77d85a3a7'),       // scoop of protein powder
  progress: u('photo-1758506971986-b0d0edebd8d5'),    // running, city
  checkin: u('photo-1734191321941-08c5ff82c3ef'),     // physique, gym
  coach: u('photo-1745329532588-1394a50671f0'),       // working out
};

/** Hero photo for a training day label like "Monday · Upper". */
export function dayPhoto(label: string) {
  const t = label.toLowerCase();
  if (t.includes('abs')) return PHOTO.lowerAbs;
  if (t.includes('lower') || t.includes('leg')) return PHOTO.lower;
  if (t.includes('upper') || t.includes('push') || t.includes('pull')) return PHOTO.upper;
  return PHOTO.fullBody;
}

/** Photo for a meal slot. */
export function mealPhoto(slot: string) {
  const t = slot.toLowerCase();
  if (t.includes('breakfast')) return PHOTO.breakfast;
  if (t.includes('lunch')) return PHOTO.lunch;
  if (t.includes('dinner')) return PHOTO.dinner;
  return PHOTO.afternoon;
}
