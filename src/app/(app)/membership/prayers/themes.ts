/**
 * What a prayer request is about, guessed from its words in English, Swahili
 * or French, so the pastors can pray through one theme at a time. A guess:
 * a request can have several themes, or none, and nothing is stored.
 */
export const THEMES = [
  [
    'healing',
    'Healing',
    /\b(heal|sick|ill|hospital|pain|cancer|surgery|health|uponyaji|ugonjwa|mgonjwa|afya|guéri|malad|santé)/i,
  ],
  [
    'family',
    'Family',
    /\b(family|parent|mother|father|mum|mom|dad|child|children|son|daughter|brother|sister|familia|mama|baba|mtoto|watoto|famille|enfant)/i,
  ],
  [
    'marriage',
    'Marriage',
    /\b(marri|husband|wife|spouse|wedding|ndoa|mume|mke|mariage|époux|épouse)/i,
  ],
  ['work', 'Work', /\b(work|job|business|employ|career|kazi|ajira|biashara|travail|emploi)/i],
  [
    'studies',
    'Studies',
    /\b(stud|exam|school|college|university|masomo|mtihani|shule|chuo|études|examen|école)/i,
  ],
  [
    'provision',
    'Provision',
    /\b(financ|money|debt|rent|provision|fees|fedha|pesa|deni|kodi|argent|dette)/i,
  ],
  [
    'faith',
    'Faith',
    /\b(faith|salvation|saved|spirit|grow|closer to god|walk with|imani|wokovu|roho|foi|salut)/i,
  ],
  ['travel', 'Travel', /\b(travel|journey|visa|safari|voyage)/i],
] as const;

export type Theme = (typeof THEMES)[number][0];

export const themesOf = (prayer: string): Theme[] =>
  THEMES.filter(([, , words]) => words.test(prayer)).map(([key]) => key);

export const themeLabel = (key: Theme) => THEMES.find(([k]) => k === key)![1];
