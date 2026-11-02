/**
 * Talks to Boon's Kit account the same way his website forms do: the PUBLIC
 * API key (safe to ship, it can only add subscribers, tags and form entries).
 */
const KIT_API_KEY = 'rWMhWOuYNu8lJKKWoWIfsg';
export const KIT_FORMS = { application: '10079550', guide: '10034224' };
export const KIT_TAGS: Record<string, string> = {
  'app-quiz-done': '25301547',
  'app-free': '25301548',
  'src-app': '25301550',
  'app-lead': '25303714',
  'app-want-plan': '25303711',
  'app-want-btl': '25303712',
  'app-want-coaching': '25303713',
  'app-want-sub': '25303949',
  // Payment stages (phase 3: RevenueCat events apply these; each starts its own Kit sequence)
  'trial-started': '25304554',
  'trial-lapsed': '25304555',
  'sub-active': '25304556',
  'sub-cancelled': '25304557',
};

type Fields = Record<string, string>;

async function post(path: string, body: object) {
  try {
    const r = await fetch(`https://api.convertkit.com/v3/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: KIT_API_KEY, ...body }),
    });
    return r.ok;
  } catch { return false; }
}

/** Add tags to someone (creates them in Kit if new) and fill their fields. */
export async function kitTag(email: string, firstName: string, tags: string[], fields: Fields = {}) {
  const ids = tags.map((t) => KIT_TAGS[t]).filter(Boolean);
  const results = await Promise.all(ids.map((id) => post(`tags/${id}/subscribe`, { email, first_name: firstName, fields })));
  return results.every(Boolean);
}

/** Submit a Kit form exactly like the website does (same form id, same fields). */
export async function kitForm(formId: string, email: string, firstName: string, fields: Fields) {
  return post(`forms/${formId}/subscribe`, { email, first_name: firstName, fields });
}
