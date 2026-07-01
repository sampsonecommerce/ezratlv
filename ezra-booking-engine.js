/* ============================================================================
   Ezra booking engine — the SINGLE shared copy.
   Used by BOTH company-events.html (public booking modal) and calc.html (private
   sales calculator). Keep the manager's numbers + contract text byte-identical to
   the customer-facing ones: change PLANS / ADDONS / SLOTS / MENUS / the portion
   engine / buildFoodText / buildBarText HERE only, never in a page copy.

   Pure data + pure functions only — no DOM, no wizard `state`. Loaded as a classic
   script BEFORE each page's inline script, so these top-level consts are visible to
   the page's code by name; they are also mirrored on window.EzraEngine for calc.html.
   ========================================================================== */

const PLANS = {
  happyhour: { label: 'Happy Hour',  hours: 3, perHead: 275, minGuests: 20, tier: 1, music: 'פלייליסט + מערכת סאונד', barTier: 'רגילה' },
  gibush:    { label: 'גיבוש מחלקה', hours: 5, perHead: 330, minGuests: 20, tier: 2, music: 'פלייליסט מותאם אישית', barTier: 'מורחבת' },
  mesiba:    { label: 'מסיבת חברה',  hours: 5, perHead: 450, minGuests: 20, tier: 3, music: "דיג'יי מהמבחר שלנו", barTier: 'פרימיום' },
};
// one per-head price per package - same for day or evening; only what's included differs
const perHeadFor = (plan) => plan.perHead;

// ── Add-ons (step 4). unit: flat = fixed, head = per guest, tray = one per ~10 guests
const ADDONS = [
  { id: 'fruit',    label: 'מגש פירות העונה',        price: 180, unit: 'tray', desc: 'מגש אחד לכל 10 סועדים, פירות טריים חתוכים לפי העונה. <span class="addon__grow">הכמות גדלה אוטומטית לפי מספר האורחים</span>', cap: '180 ₪ למגש' },
  { id: 'soft',     label: 'שתייה קלה ומוגזת',       price: 25,  unit: 'head', desc: 'מבחר משקאות קלים ומוגזים לכל האורחים (כלול בחבילת הפרימיום). <span class="addon__grow">הכמות גדלה אוטומטית לפי מספר האורחים</span>', cap: '25 ₪ לאדם', plans: ['happyhour', 'gibush'] },
  { id: 'balloons', label: 'בלונים',                 price: 200, unit: 'flat', desc: 'עיצוב וסידור בלונים למקום',                cap: '200 ₪' },
  { id: 'mic',      label: 'מיקרופון',               price: 250, unit: 'flat', desc: 'לנאומים, מצגות או ברכות',                  cap: '250 ₪' },
  { id: 'karaoke',  label: 'מערכת קריוקי',           price: 350, unit: 'flat', desc: 'כולל מסך/מקרן וחיבור למערכת השמע',         cap: '350 ₪' },
  { id: 'flowers1', label: 'סידורי פרחים · בסיסי',   price: 300, unit: 'flat', desc: 'סידור פרחים רענן לשולחנות',               cap: '300 ₪' },
  { id: 'flowers2', label: 'סידורי פרחים · משודרג',  price: 500, unit: 'flat', desc: 'סידור פרחים עשיר ומוקפד',                  cap: '500 ₪' },
];
// pure per-add-on price (state-coupled selection/apply logic stays in each page)
const addonUnitPrice = (a, guests) =>
  a.unit === 'head' ? a.price * guests :
  a.unit === 'tray' ? a.price * Math.max(1, Math.ceil(guests / 10)) :
  a.price;

const SLOTS = {
  3: ['09:00-12:00', '13:00-16:00', '17:00-20:00', '21:00-00:00'],
  5: ['09:00-14:00', '15:00-20:00', '21:00-02:00'],
};
const CURRENCY = '₪';

const MENUS = {
  happyhour: {
    day: [
      { t: "פתיחה ושרינג", items: ["צלחת לחמים (חמאה ומלח ים)", "פוקאצ'ה ומתבלים", "צלחת גבינות"] },
      { t: "סלטים", items: ["סלט ירוק", "סלט קיסר", "סלט קפרזה"] },
      { t: "מגשי כריכים", items: ["סלט ביצים", "גבינה", "טונה / טבעוני"] },
      { t: "שתייה קלה", items: ["עמדת קפה / תה", "חליטות תה קר", "מיץ תפוזים / לימונדה סחוט", "סודה"] }
    ],
    evening: [
      { t: "פתיחה ושרינג", items: ["צלחת זיתים", "צלחת לחמים", "פוקאצ'ה מתבלים"] },
      { t: "סלטים", items: ["סלט ירוק", "סלט קיסר", "סלט קפרזה"] },
      { t: "מהטאבון (פיצות)", items: ["מרגריטה"] },
      { t: "בר חופשי", items: ["2 סוגי בירות (באדווייזר, סאן מיגל)", "יין איכותי (שרדונה, פינו גריג'ו, רוזה / אדום)"] }
    ]
  },
  gibush: {
    day: [
      { t: "פתיחה ושרינג", items: ["צלחת לחמים (חמאה ומלח ים)", "פוקאצ'ה ומתבלים", "צלחת גבינות עשירה", "צלחת קלויים (פלפלים, גבינת ברינזה)", "חריפים של סופי", "צלחת זיתים"] },
      { t: "סלטים", items: ["סלט ירוק", "סלט קיסר", "סלט קפרזה", "סלט שורשים"] },
      { t: "מגשי כריכים ופוקאצ'ות", items: ["סלט ביצים", "גבינה", "טונה / טבעוני", "פוקאצ'ה אנטיפסטי", "פוקאצ'ה גבינות / בלקנית"] },
      { t: "שתייה קלה", items: ["עמדת קפה / תה", "חליטות תה קר", "מיץ תפוזים / לימונדה סחוט", "סודה"] },
      { t: "אלכוהול שמתאים ליום", items: ["מימוזה", "אפרול שפריץ", "אספרסו מרטיני"] }
    ],
    evening: [
      { t: "פתיחה ושרינג", items: ["צלחת לחמים (חמאה ומלח ים)", "פוקאצ'ה ומתבלים", "צלחת גבינות עשירה", "צלחת קלויים (פלפלים, גבינת ברינזה)", "חריפים של סופי", "צלחת זיתים"] },
      { t: "סלטים", items: ["סלט ירוק", "סלט קיסר", "סלט קפרזה", "סלט שורשים"] },
      { t: "מהטאבון (פיצות)", items: ["מרגריטה", "פומדוריני", "בזיל", "פונגי", "פוקאצ'ה אנטיפסטי", "פוקאצ'ה גבינות / בלקנית"] },
      { t: "בר חופשי", items: ["2 סוגי בירות (באדווייזר, סאן מיגל)", "יין איכותי (שרדונה, פינו גריג'ו, רוזה / אדום)", "6 סוגי אלכוהול לבחירה (ג'ין, וודקה, וויסקי, רום, ערק, קמפרי)", "8 ערבובים (קולה, טוניק, לימונדה, סודה, ראשן, ספרייט, אשכוליות ותפוזים)"] }
    ]
  },
  mesiba: {
    day: [
      { t: "פתיחה ושרינג", items: ["צלחת לחמים (חמאה ומלח ים)", "צלחת זיתים", "פוקאצ'ה ומתבלים", "צלחת גבינות פרימיום", "צלחת קלויים (פלפלים, גבינת ברינזה)", "חריפים של סופי", "כרוב חמים מהטאבון", "סביצ'ה"] },
      { t: "סלטים", items: ["סלט ירוק", "סלט קיסר", "סלט קפרזה", "סלט שורשים"] },
      { t: "מגשי כריכים, פוקאצ'ות ומאפים", items: ["סלט ביצים", "גבינה", "טונה / טבעוני", "כריך סלמון", "פוקאצ'ה אנטיפסטי", "פוקאצ'ה גבינות / בלקנית", "מגש בורקסים", "מגש מאפים מתוקים"] },
      { t: "שתייה קלה", items: ["עמדת קפה / תה", "חליטות תה קר", "מיץ תפוזים / לימונדה סחוט", "סודה", "בקבוקי שתייה אישיים קרים"] },
      { t: "אלכוהול שמתאים ליום", items: ["מימוזה", "אפרול שפריץ", "אספרסו מרטיני", "סנגריה קרה"] }
    ],
    evening: [
      { t: "פתיחה ושרינג", items: ["צלחת לחמים (חמאה ומלח ים)", "צלחת זיתים", "פוקאצ'ה ומתבלים", "צלחת גבינות פרימיום", "צלחת קלויים (פלפלים, גבינת ברינזה)", "חריפים של סופי", "כרוב חמים מהטאבון", "קרודו (סביצ'ה אלגנטי)"] },
      { t: "סלטים", items: ["סלט ירוק", "סלט קיסר", "סלט קפרזה", "סלט שורשים"] },
      { t: "מהטאבון (פיצות ופוקאצ'ות)", items: ["פיצה גבינה כחולה וריבת צ'ילי", "פרסקה", "בזיל", "פונגי", "פוקאצ'ה חמאת שום", "פוקאצ'ה אנטיפסטי", "פוקאצ'ה גבינות", "חציל קלוי בטחינה שחורה"] },
      { t: "בר קוקטיילים", items: ["בר קוקטיילים חופשי עם מיקסולוג צמוד (אלכוהול פרימיום)", "2 סוגי בירות (באדווייזר, סאן מיגל)", "יין איכותי (שרדונה, פינו גריג'ו, רוזה / אדום)", "7 סוגי אלכוהול לבחירה (ג'ין, וודקה, וויסקי, רום, ערק, קמפרי, טקילה)", "8 ערבובים (קולה, טוניק, לימונדה, סודה, ראשן, ספרייט, אשכוליות ותפוזים)"] }
    ]
  }
};
const MENU_PLACEHOLDER = [{ t: "התפריט המלא בקרוב", items: ["תפריט היום והערב של החבילה הזו יפורטו יחד מולכם."] }];
const menuFor = (plan, menu) => (MENUS[plan] && MENUS[plan][menu]) || MENU_PLACEHOLDER;

// per-dish ingredient detail - shown on tap in the menu step (keys match the item strings above)
const DISH_DESC = {
  // openers
  "צלחת לחמים": "לחמי מחמצת, חמאה רכה ומלח גס.",
  "פוקאצ'ה ומתבלים": "פוקאצ'ה חמה מהטאבון עם מטבלים משתנים.",
  "פוקאצ'ה מתבלים": "פוקאצ'ה חמה מהטאבון עם מטבלים משתנים.",
  "צלחת זיתים": "תערובת זיתים בתיבול שום, שמן זית ולימון.",
  "צלחת גבינות": "שלושה סוגי גבינות קשות וחצי-קשות, קרקרים, קוקוט חמאה, ריבה ואגוזים. הדרגה (בסיסית / עשירה / פרימיום) נקבעת לפי איכות וסוג הגבינות.",
  "צלחת גבינות עשירה": "שלושה סוגי גבינות קשות וחצי-קשות, קרקרים, קוקוט חמאה, ריבה ואגוזים. הדרגה (בסיסית / עשירה / פרימיום) נקבעת לפי איכות וסוג הגבינות.",
  "צלחת גבינות פרימיום": "שלושה סוגי גבינות קשות וחצי-קשות, קרקרים, קוקוט חמאה, ריבה ואגוזים. הדרגה (בסיסית / עשירה / פרימיום) נקבעת לפי איכות וסוג הגבינות.",
  "צלחת קלויים": "פלפלים קלויים בתנור, גבינת ברינזה, עלי זעתר, שמן זית ומלח גס.",
  "חריפים של סופי": "סחוג ירוק, פלפל חריף, מטבל עגבניות ושמן זית.",
  "כרוב חמים מהטאבון": "כרוב צלוי בטאבון על קרם פרש, שמן זית, טימין ופרמזן.",
  "חציל קלוי בטחינה שחורה": "חציל שלם קלוי בטאבון, זילוף עשיר של טחינה שחורה, גבינת פטה, עשבי תיבול ושמן זית. אפשר גם בגרסה טבעונית.",
  "סביצ'ה": "קוביות דג ים טרי, בצל סגול, צ'ילי, עשבי תיבול, שמן זית ומיץ לימון סחוט, על מצע קרם פרש או יוגורט ופרי העונה.",
  "קרודו": "קוביות דג ים טרי, בצל סגול, צ'ילי, עשבי תיבול, שמן זית ומיץ לימון סחוט, על מצע קרם פרש או יוגורט ופרי העונה.",
  // salads
  "סלט ירוק": "חסה לבבות, צנונית, שקדים קלויים, ויניגרט הדרים וגבינת בושה.",
  "קיסר": "2 סוגי חסה, קרוטונים, רוטב קיסר ופרמזן. אפשר להתאים להריוניות / טבעוני.",
  "סלט קיסר": "2 סוגי חסה, קרוטונים, רוטב קיסר ופרמזן. אפשר להתאים להריוניות / טבעוני.",
  "סלט שורשים": "גזר, קולורבי, סלק טרי וצנון חתוכים דק, תיבול אסייתי, שומשום קלוי ואגוזים.",
  "סלט קפרזה": "עגבניות שרי, עלי בזיליקום, מוצרלה פרסקה ובלסמי.",
  // pizzas / focaccia
  "מרגריטה": "רוטב עגבניות, מוצרלה, בזיליקום, פרמזן ושמן זית.",
  "פומדוריני": "רוטב עגבניות, מוצרלה, בזיליקום, שרי מיובשות וקונפי שום.",
  "בזיל": "רוטב עגבניות, מוצרלה, נגיעות פסטו, זיתי קלמטה ופרמזן.",
  "פונגי": "רוטב עגבניות, מוצרלה, פטריות פורטובלו צלויות ושמן כמהין.",
  "פרסקה": "מוצרלה טרייה, עלי רוקט, שרי ובצל מתובל בלימון ובלסמי.",
  "פיצה גבינה כחולה וריבת צ'ילי": "רוטב עגבניות, מוצרלה, נגיעות גבינה כחולה עשירה וזילוף של ריבת צ'ילי מתוקה-חריפה.",
  "פוקאצ'ה חמאת שום": "מאפה שמרים ארוך מהטאבון, משוח בשפע חמאת שום, עשבי תיבול ומלח גס.",
  "פוקאצ'ה אנטיפסטי": "מאפה טאבון עם ירקות קלויים (קישואים, חצילים, פלפלים), שמן זית ורוזמרין.",
  "פוקאצ'ה גבינות / בלקנית": "מאפה טאבון עם גבינת פטה / ברינזה, זיתי קלמטה, בצל סגול וזעתר.",
  "פוקאצ'ה גבינות": "מאפה טאבון עם גבינת פטה / ברינזה, זיתי קלמטה, בצל סגול וזעתר.",
  // sandwich trays (the "10 mini-bites per tray" note covers the serving style)
  "סלט ביצים": "סלט ביצים קלאסי (מיונז, בצל ירוק, מלח ופלפל) עם עלי חסה ובצל שאלוט.",
  "גבינה": "גבינת שמנת, גבינת גאודה, מלפפון טרי, עגבנייה ורוקט.",
  "טונה / טבעוני": "טונה (מיונז, חרדל, מלפפון חמוץ ושאלוט, עם עגבנייה וחסה) או טבעוני (ממרח טחינה או פסטו וירקות אנטיפסטי קלויים).",
  "כריך סלמון": "גבינת שמנת, דג סלמון, עגבנייה ועירית.",
  "מגש בורקסים": "מבחר בורקסים - גבינה, תרד, ביצים ופיצה.",
  "מגש מאפים מתוקים": "מבחר מאפים מתוקים - שוקולד, קינמון וגבינה.",
  // cocktails get a description; soft drinks stay name-only
  "מימוזה": "מיץ תפוזים ויין מבעבע.",
  "אפרול שפריץ": "אפרול, יין מבעבע וסודה.",
  "אספרסו מרטיני": "וודקה, ליקר קפה, אספרסו וביטרס קקאו.",
  "סנגריה קרה": "יין אדום ופירות עונתיים.",
};
// split a "name (explanation)" item; description = mapped desc → the parenthesis → none
const splitDish = item => {
  const m = item.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  const name = m ? m[1].trim() : item;
  const paren = m ? m[2].trim() : '';
  return { name: name, desc: DISH_DESC[name] || DISH_DESC[item] || paren };
};

// ── Portion math (spec doc): total per category = round(guests * multiplier); no decimals shown
const PORTION = {
  // units: pizzas / sandwiches / pastries are served on trays (מגשים); everything else is מנות
  taboon:{mult:0.3,unit:'מגשים'}, salad:{mult:0.25,unit:'מנות'}, sandwich:{mult:0.2,unit:'מגשים'},
  pastry:{mult:0.1,unit:'מגשים'}, bread:{mult:0.20,unit:'מנות'}, cheese:{mult:0.1,unit:'מנות'},
  roasted:{mult:0.1,unit:'מנות'}, nibble:{mult:0.1,unit:'מנות',perType:true}, premium:{mult:0.15,unit:'מנות',perType:true},
};
const isBarCat = t => /בר|אלכוהול|קוקטייל|שתייה|קפה|תה/.test(t);
const portionRnd = x => Math.round(x);
// classify a dish inside the opening/sharing category by keyword
const openingType = n =>
  /חריפ|חריף|זית/.test(n) ? 'nibble' :
  /כרוב|סביצ|קרודו/.test(n) ? 'premium' :
  /גבינ/.test(n) ? 'cheese' :
  /קלוי/.test(n) ? 'roasted' : 'bread';
// One breakdown row PER dish (a comma between dishes means they're separate items, so
// they never share a line). The category total is split across its dishes; if there are
// more dishes than units, the overflow dishes show "כלול" (qty null) so no line reads 0.
function perDishRows(names, total, unit) {
  const n = names.length;
  if (!n) return [];
  const base = Math.floor(total / n), rem = total - base * n;
  return names.map((nm, i) => { const q = base + (i < rem ? 1 : 0); return { name: nm, qty: q > 0 ? q : null, unit }; });
}
// Sandwiches show as "כריכון X" (mini-sandwich) for clarity. Focaccias / pastries /
// burekas in the same tray category keep their own name.
function dishDisplay(catLabel, name) {
  if (/כריכ/.test(catLabel) && !/פוקאצ|מאפ|בורק/.test(name)) {
    return /^כריך\s+/.test(name) ? name.replace(/^כריך\s+/, 'כריכון ') : 'כריכון ' + name;
  }
  return name;
}
// returns { isBar, qtyLabel (left side), breakdown:[{name, qty, unit}] }
function categoryPortions(catLabel, names, g) {
  if (isBarCat(catLabel)) return { isBar:true, qtyLabel:'ללא הגבלה', breakdown: names.map(n => ({ name:n, qty:null, unit:'' })) };
  if (/פתיחה|שרינג/.test(catLabel)) {
    const by = {}; names.forEach(n => { const t = openingType(n); (by[t] = by[t] || []).push(n); });
    const bd = []; let tot = 0;
    ['bread','cheese','roasted','nibble','premium'].forEach(t => {
      const ds = by[t]; if (!ds) return; const c = PORTION[t];
      if (c.perType) ds.forEach(n => { const q = Math.max(1, portionRnd(g * c.mult)); tot += q; bd.push({ name:n, qty:q, unit:c.unit }); });
      else { const q = Math.max(ds.length, portionRnd(g * c.mult)); tot += q; bd.push(...perDishRows(ds, q, c.unit)); }
    });
    return { isBar:false, qtyLabel: tot + ' מנות', breakdown: bd };
  }
  if (/כריכ/.test(catLabel)) {
    const pa = names.filter(n => /מאפ|בורק/.test(n)), sa = names.filter(n => !/מאפ|בורק/.test(n));
    const bd = []; let tot = 0;
    if (sa.length) { const q = Math.max(sa.length, portionRnd(g * PORTION.sandwich.mult)); tot += q; bd.push(...perDishRows(sa, q, 'מגשים')); }
    if (pa.length) { const q = Math.max(pa.length, portionRnd(g * PORTION.pastry.mult));   tot += q; bd.push(...perDishRows(pa, q, 'מגשים')); }
    return { isBar:false, qtyLabel: tot + ' מגשים', breakdown: bd };
  }
  const c = /טאבון|פיצ/.test(catLabel) ? PORTION.taboon : PORTION.salad;
  const q = Math.max(names.length, portionRnd(g * c.mult));
  return { isBar:false, qtyLabel: q + ' ' + c.unit, breakdown: perDishRows(names, q, c.unit) };
}
// Contract food-text for package leads: one line per dish + its computed quantity, in the
// manager's byte-exact format. Reuses MENUS / splitDish / isBarCat / categoryPortions above.
// Bar/drink sections are excluded.
function buildFoodText(plan, menu, guests, notes) {
  const secs = (MENUS[plan] && MENUS[plan][menu]) || [];
  const lines = [];
  for (const sec of secs) {
    if (isBarCat(sec.t)) continue;
    const { breakdown } = categoryPortions(sec.t, sec.items.map(it => splitDish(it).name), guests);
    for (const row of breakdown) {
      if (row.qty == null) continue;
      lines.push(row.name + ' | כמות: ' + row.qty);
    }
  }
  let out = lines.join('\n');
  if (notes && notes.trim()) out += '\nהערות נוספות למטבח:\n' + notes.trim();
  return out;
}
// Full drinks description for the contract (NOT portioned). Day/evening aware.
// Pulls every bar + soft-drink section from MENUS[plan][menu] and joins the raw items.
function buildBarText(plan, menu) {
  const secs = (MENUS[plan] && MENUS[plan][menu]) || [];
  const lines = [];
  for (const sec of secs) {
    if (!isBarCat(sec.t)) continue;                 // only bar/alcohol/soft-drink sections
    sec.items.forEach((raw, i) => {
      const m = raw.match(/^(.*?)\s*\(([^)]*)\)\s*$/);  // split "name (detail)"
      const name = m ? m[1].trim() : raw.trim();
      const detail = m ? m[2].trim() : '';
      const head = (i === 0) ? sec.t + ' | ' : '';      // section title on first item only
      lines.push(head + name + (detail ? ' | ' + detail : ''));
    });
  }
  return lines.join('\n');
}

// mirror on a namespace for pages that prefer explicit access (calc.html),
// and expose as global-object properties so any script referencing the bare names resolves them.
(function () {
  var api = {
    PLANS: PLANS, perHeadFor: perHeadFor, ADDONS: ADDONS, addonUnitPrice: addonUnitPrice, SLOTS: SLOTS, CURRENCY: CURRENCY,
    MENUS: MENUS, MENU_PLACEHOLDER: MENU_PLACEHOLDER, menuFor: menuFor, DISH_DESC: DISH_DESC, splitDish: splitDish,
    PORTION: PORTION, isBarCat: isBarCat, portionRnd: portionRnd, openingType: openingType, perDishRows: perDishRows,
    dishDisplay: dishDisplay, categoryPortions: categoryPortions, buildFoodText: buildFoodText, buildBarText: buildBarText,
  };
  var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : this);
  g.EzraEngine = api;
  for (var k in api) { if (!(k in g)) { try { g[k] = api[k]; } catch (e) {} } }
})();
