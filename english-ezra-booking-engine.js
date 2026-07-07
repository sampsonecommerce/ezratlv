/* ============================================================================
   Ezra booking engine — ENGLISH copy.
   English drop-in replacement for ezra-booking-engine.js. Exposes the IDENTICAL
   EzraEngine API surface (same functions + data keys), with all copy and the
   classification regexes translated to English. The English menu / plan / addon
   data and the portion engine are taken verbatim from english-company-events.html
   so the English page's menus and portions match exactly.

   Pure data + pure functions only — no DOM, no wizard `state`. Loaded as a classic
   script BEFORE each page's inline script, so these top-level consts are visible to
   the page's code by name; they are also mirrored on window.EzraEngine.
   ========================================================================== */

const PLANS = {
  happyhour: { label: 'Happy Hour',  hours: 3, perHead: 275, minGuests: 20, tier: 1, music: 'Playlist + sound system', barTier: 'Standard' },
  gibush:    { label: 'Team Bonding', hours: 5, perHead: 330, minGuests: 20, tier: 2, music: 'Custom playlist', barTier: 'Extended' },
  mesiba:    { label: 'Company Party',  hours: 5, perHead: 450, minGuests: 20, tier: 3, music: "A DJ from our roster", barTier: 'Premium' },
};
// one per-head price per package - same for day or evening; only what's included differs
const perHeadFor = (plan) => plan.perHead;

// ── Add-ons (step 4). unit: flat = fixed, head = per guest, tray = one per ~10 guests
const ADDONS = [
  { id: 'fruit',    label: 'Seasonal fruit platter',        price: 180, unit: 'tray', desc: 'One platter per 10 guests, fresh seasonal cut fruit. <span class="addon__grow">The quantity scales automatically with the guest count</span>', cap: '180 ₪ per tray' },
  { id: 'soft',     label: 'Soft and sparkling drinks',       price: 25,  unit: 'head', desc: 'A selection of soft and sparkling drinks for all guests (included in the Premium package). <span class="addon__grow">The quantity scales automatically with the guest count</span>', cap: '25 ₪ per person', plans: ['happyhour', 'gibush'] },
  { id: 'balloons', label: 'Balloons',                 price: 200, unit: 'flat', desc: 'Balloon design and setup for the venue',                cap: '200 ₪' },
  { id: 'mic',      label: 'Microphone',               price: 250, unit: 'flat', desc: 'For speeches, presentations or toasts',                  cap: '250 ₪' },
  { id: 'karaoke',  label: 'Karaoke system',           price: 350, unit: 'flat', desc: 'Includes a screen/projector and connection to the sound system',         cap: '350 ₪' },
  { id: 'flowers1', label: 'Flower arrangements · basic',   price: 300, unit: 'flat', desc: 'A fresh flower arrangement for the tables',               cap: '300 ₪' },
  { id: 'flowers2', label: 'Flower arrangements · upgraded',  price: 500, unit: 'flat', desc: 'A rich, refined flower arrangement',                  cap: '500 ₪' },
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
      { t: "Starters & sharing", items: ["Bread plate (butter & sea salt)", "Focaccia & dips", "Cheese plate"] },
      { t: "Salads", items: ["Green salad", "Caesar salad", "Caprese salad"] },
      { t: "Sandwich trays", items: ["Egg salad", "Cheese", "Tuna / vegan"] },
      { t: "Soft drinks", items: ["Coffee / tea station", "Iced tea infusions", "Fresh orange juice / lemonade", "Soda"] }
    ],
    evening: [
      { t: "Starters & sharing", items: ["Olive plate", "Bread plate", "Focaccia & dips"] },
      { t: "Salads", items: ["Green salad", "Caesar salad", "Caprese salad"] },
      { t: "Taboon pizzas", items: ["Margherita"] },
      { t: "Open bar", items: ["2 beers (Budweiser, San Miguel)", "Quality wine (Chardonnay, Pinot Grigio, rose / red)"] }
    ]
  },
  gibush: {
    day: [
      { t: "Starters & sharing", items: ["Bread plate (butter & sea salt)", "Focaccia & dips", "Rich cheese plate", "Roasted plate (peppers, brinza cheese)", "Sophie's spicy dips", "Olive plate"] },
      { t: "Salads", items: ["Green salad", "Caesar salad", "Caprese salad", "Roots salad"] },
      { t: "Sandwiches & focaccia", items: ["Egg salad", "Cheese", "Tuna / vegan", "Antipasti focaccia", "Cheese / Balkan focaccia"] },
      { t: "Soft drinks", items: ["Coffee / tea station", "Iced tea infusions", "Fresh orange juice / lemonade", "Soda"] },
      { t: "Daytime cocktails", items: ["Mimosa", "Aperol Spritz", "Espresso Martini"] }
    ],
    evening: [
      { t: "Starters & sharing", items: ["Bread plate (butter & sea salt)", "Focaccia & dips", "Rich cheese plate", "Roasted plate (peppers, brinza cheese)", "Sophie's spicy dips", "Olive plate"] },
      { t: "Salads", items: ["Green salad", "Caesar salad", "Caprese salad", "Roots salad"] },
      { t: "Taboon pizzas", items: ["Margherita", "Pomodorino", "Basil", "Funghi", "Antipasti focaccia", "Cheese / Balkan focaccia"] },
      { t: "Open bar", items: ["2 beers (Budweiser, San Miguel)", "Quality wine (Chardonnay, Pinot Grigio, rose / red)", "6 spirits to choose (gin, vodka, whiskey, rum, arak, Campari)", "8 mixers (cola, tonic, lemonade, soda, Schweppes, Sprite, grapefruit & orange)"] }
    ]
  },
  mesiba: {
    day: [
      { t: "Starters & sharing", items: ["Bread plate (butter & sea salt)", "Olive plate", "Focaccia & dips", "Premium cheese plate", "Roasted plate (peppers, brinza cheese)", "Sophie's spicy dips", "Warm taboon cabbage", "Ceviche"] },
      { t: "Salads", items: ["Green salad", "Caesar salad", "Caprese salad", "Roots salad"] },
      { t: "Sandwiches & pastries", items: ["Egg salad", "Cheese", "Tuna / vegan", "Salmon sandwich", "Antipasti focaccia", "Cheese / Balkan focaccia", "Burekas tray", "Sweet pastries tray"] },
      { t: "Soft drinks", items: ["Coffee / tea station", "Iced tea infusions", "Fresh orange juice / lemonade", "Soda", "Chilled personal drink bottles"] },
      { t: "Daytime cocktails", items: ["Mimosa", "Aperol Spritz", "Espresso Martini", "Cold sangria"] }
    ],
    evening: [
      { t: "Starters & sharing", items: ["Bread plate (butter & sea salt)", "Olive plate", "Focaccia & dips", "Premium cheese plate", "Roasted plate (peppers, brinza cheese)", "Sophie's spicy dips", "Warm taboon cabbage", "Crudo (elegant ceviche)"] },
      { t: "Salads", items: ["Green salad", "Caesar salad", "Caprese salad", "Roots salad"] },
      { t: "Taboon pizza & focaccia", items: ["Blue cheese & chili-jam pizza", "Fresca", "Basil", "Funghi", "Garlic-butter focaccia", "Antipasti focaccia", "Cheese focaccia", "Roasted eggplant in black tahini"] },
      { t: "Cocktail bar", items: ["Open cocktail bar with a dedicated mixologist (premium spirits)", "2 beers (Budweiser, San Miguel)", "Quality wine (Chardonnay, Pinot Grigio, rose / red)", "7 spirits to choose (gin, vodka, whiskey, rum, arak, Campari, tequila)", "8 mixers (cola, tonic, lemonade, soda, Schweppes, Sprite, grapefruit & orange)"] }
    ]
  }
};
const MENU_PLACEHOLDER = [{ t: "Full menu coming soon", items: ["The day and evening menus for this package will be detailed together with you."] }];
const menuFor = (plan, menu) => (MENUS[plan] && MENUS[plan][menu]) || MENU_PLACEHOLDER;

// per-dish ingredient detail - shown on tap in the menu step (keys match the item strings above)
const DISH_DESC = {
  // openers
  "Bread plate": "Sourdough breads, soft butter and coarse salt.",
  "Focaccia & dips": "Warm taboon focaccia with rotating dips.",
  "Olive plate": "A mix of olives seasoned with garlic, olive oil and lemon.",
  "Cheese plate": "Three hard and semi-hard cheeses, crackers, a butter cocotte, jam and nuts. The tier (basic / rich / premium) is set by the quality and type of cheeses.",
  "Rich cheese plate": "Three hard and semi-hard cheeses, crackers, a butter cocotte, jam and nuts. The tier (basic / rich / premium) is set by the quality and type of cheeses.",
  "Premium cheese plate": "Three hard and semi-hard cheeses, crackers, a butter cocotte, jam and nuts. The tier (basic / rich / premium) is set by the quality and type of cheeses.",
  "Roasted plate": "Oven-roasted peppers, brinza cheese, za'atar, olive oil and coarse salt.",
  "Sophie's spicy dips": "Green zhug, hot pepper, tomato dip and olive oil.",
  "Warm taboon cabbage": "Taboon-roasted cabbage over creme fraiche, olive oil, thyme and parmesan.",
  "Roasted eggplant in black tahini": "A whole taboon-roasted eggplant, a generous drizzle of black tahini, feta, herbs and olive oil. Available vegan too.",
  "Ceviche": "Cubes of fresh sea fish, red onion, chili, herbs, olive oil and fresh lemon juice, over creme fraiche or yogurt and seasonal fruit.",
  "Crudo": "Cubes of fresh sea fish, red onion, chili, herbs, olive oil and fresh lemon juice, over creme fraiche or yogurt and seasonal fruit.",
  // salads
  "Green salad": "Baby gem lettuce, radish, roasted almonds, citrus vinaigrette and bucha cheese.",
  "Caesar salad": "Two kinds of lettuce, croutons, Caesar dressing and parmesan. Can be adapted for pregnant guests / vegan.",
  "Roots salad": "Carrot, kohlrabi, fresh beet and radish thinly sliced, Asian seasoning, roasted sesame and nuts.",
  "Caprese salad": "Cherry tomatoes, basil leaves, fresh mozzarella and balsamic.",
  // pizzas / focaccia
  "Margherita": "Tomato sauce, mozzarella, basil, parmesan and olive oil.",
  "Pomodorino": "Tomato sauce, mozzarella, basil, sun-dried cherry tomatoes and garlic confit.",
  "Basil": "Tomato sauce, mozzarella, pesto, kalamata olives and parmesan.",
  "Funghi": "Tomato sauce, mozzarella, roasted portobello mushrooms and truffle oil.",
  "Fresca": "Fresh mozzarella, arugula, cherry tomatoes and onion dressed in lemon and balsamic.",
  "Blue cheese & chili-jam pizza": "Tomato sauce, mozzarella, rich blue cheese and a drizzle of sweet-hot chili jam.",
  "Garlic-butter focaccia": "A long taboon yeast bread, brushed with plenty of garlic butter, herbs and coarse salt.",
  "Antipasti focaccia": "Taboon flatbread with roasted vegetables (zucchini, eggplant, peppers), olive oil and rosemary.",
  "Cheese / Balkan focaccia": "Taboon flatbread with feta / brinza cheese, kalamata olives, red onion and za'atar.",
  "Cheese focaccia": "Taboon flatbread with feta / brinza cheese, kalamata olives, red onion and za'atar.",
  // sandwich trays (the "10 mini-bites per tray" note covers the serving style)
  "Egg salad": "Classic egg salad (mayo, green onion, salt and pepper) with lettuce and shallots.",
  "Cheese": "Cream cheese, gouda, fresh cucumber, tomato and arugula.",
  "Tuna / vegan": "Tuna (mayo, mustard, pickle and shallot, with tomato and lettuce) or vegan (tahini or pesto spread and roasted antipasti vegetables).",
  "Salmon sandwich": "Cream cheese, salmon, tomato and chives.",
  "Burekas tray": "A selection of burekas, cheese, spinach, egg and pizza.",
  "Sweet pastries tray": "A selection of sweet pastries, chocolate, cinnamon and cheese.",
  // cocktails get a description; soft drinks stay name-only
  "Mimosa": "Orange juice and sparkling wine.",
  "Aperol Spritz": "Aperol, sparkling wine and soda.",
  "Espresso Martini": "Vodka, coffee liqueur, espresso and cacao bitters.",
  "Cold sangria": "Red wine and seasonal fruit.",
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
  // units: pizzas / sandwiches / pastries are served on trays (trays); everything else is servings
  taboon:{mult:0.3,unit:'trays'}, salad:{mult:0.25,unit:'servings'}, sandwich:{mult:0.2,unit:'trays'},
  pastry:{mult:0.1,unit:'trays'}, bread:{mult:0.15,unit:'servings'}, cheese:{mult:0.1,unit:'servings'},
  roasted:{mult:0.1,unit:'servings'}, nibble:{mult:0.3,unit:'servings',perType:true}, premium:{mult:0.15,unit:'servings',perType:true},
};
const isBarCat = t => /bar|cocktail|drink|alcohol|coffee|tea/i.test(t);
const portionRnd = x => Math.round(x);
// classify a dish inside the opening/sharing category by keyword
const openingType = n =>
  /spicy|olive/i.test(n) ? 'nibble' :
  /cabbage|ceviche|crudo/i.test(n) ? 'premium' :
  /cheese/i.test(n) ? 'cheese' :
  /roasted/i.test(n) ? 'roasted' : 'bread';
// One breakdown row PER dish (a comma between dishes means they're separate items, so
// they never share a line). The category total is split across its dishes; if there are
// more dishes than units, the overflow dishes show "Included" (qty null) so no line reads 0.
function perDishRows(names, total, unit) {
  const n = names.length;
  if (!n) return [];
  const base = Math.floor(total / n), rem = total - base * n;
  return names.map((nm, i) => { const q = base + (i < rem ? 1 : 0); return { name: nm, qty: q > 0 ? q : null, unit }; });
}
// Sandwiches show as "mini-sandwich X" (mini-sandwich) for clarity. Focaccias / pastries /
// burekas in the same tray category keep their own name.
function dishDisplay(catLabel, name) {
  if (/sandwich/i.test(catLabel) && !/focaccia|pastr|bureka/i.test(name)) {
    return /\bsandwich$/i.test(name) ? name.replace(/\s*sandwich$/i, '') + ' mini-sandwich' : name + ' mini-sandwich';
  }
  return name;
}
// returns { isBar, qtyLabel (left side), breakdown:[{name, qty, unit}] }
function categoryPortions(catLabel, names, g) {
  if (isBarCat(catLabel)) return { isBar:true, qtyLabel:'Unlimited', breakdown: names.map(n => ({ name:n, qty:null, unit:'' })) };
  if (/starter|sharing/i.test(catLabel)) {
    const by = {}; names.forEach(n => { const t = openingType(n); (by[t] = by[t] || []).push(n); });
    const bd = []; let tot = 0;
    ['bread','cheese','roasted','nibble','premium'].forEach(t => {
      const ds = by[t]; if (!ds) return; const c = PORTION[t];
      if (c.perType) ds.forEach(n => { const q = Math.max(1, portionRnd(g * c.mult)); tot += q; bd.push({ name:n, qty:q, unit:c.unit }); });
      else { const q = Math.max(ds.length, portionRnd(g * c.mult)); tot += q; bd.push(...perDishRows(ds, q, c.unit)); }
    });
    return { isBar:false, qtyLabel: tot + ' servings', breakdown: bd };
  }
  if (/sandwich/i.test(catLabel)) {
    const pa = names.filter(n => /pastr|bureka/i.test(n)), sa = names.filter(n => !/pastr|bureka/i.test(n));
    const bd = []; let tot = 0;
    if (sa.length) { const q = Math.max(sa.length, portionRnd(g * PORTION.sandwich.mult)); tot += q; bd.push(...perDishRows(sa, q, 'trays')); }
    if (pa.length) { const q = Math.max(pa.length, portionRnd(g * PORTION.pastry.mult));   tot += q; bd.push(...perDishRows(pa, q, 'trays')); }
    return { isBar:false, qtyLabel: tot + ' trays', breakdown: bd };
  }
  const c = /taboon|pizza/i.test(catLabel) ? PORTION.taboon : PORTION.salad;
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
      lines.push(row.name + ' | Qty: ' + row.qty);
    }
  }
  let out = lines.join('\n');
  if (notes && notes.trim()) out += '\nAdditional kitchen notes:\n' + notes.trim();
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

// mirror on a namespace for pages that prefer explicit access,
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
