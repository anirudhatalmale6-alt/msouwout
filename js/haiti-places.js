/* ═══════════════════════════════════════════════════════════════════════════
   HAITI PLACES — the local landmark index

   Jeffery, 3 Oct 2026: "Haitians often navigate by businesses, supermarkets,
   hotels, churches, schools, hospitals and landmarks, not just formal street
   addresses... 'Osis', 'Oasis' and 'Otel Oasis' should all return the same
   location... Keep it simple and isolated so it doesn't risk the core ride
   system. Our own Haiti database should be searched first, then OpenStreetMap
   can remain the fallback."

   ⛔ THIS FILE TOUCHES NOTHING. It exports one function, MW_PLACES.search(),
   and holds no state belonging to a ride, a fare or a payment. If it throws,
   if the data never loads, if the phone is offline — the caller falls through
   to the OpenStreetMap lookups that were always there. That is deliberate: a
   search aid must never be able to stop somebody ordering a car.

   ⚠️ Every row in the data file is a real OpenStreetMap object with real
   coordinates. Nothing here invents a place or a position. What this file adds
   is the part OSM cannot do for Haiti: spelling tolerance, Kreyòl/French
   equivalence, and the dropped article ("Lopital" = "l'hôpital").
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* TWO FILES, ON PURPOSE. Every ride MsouWout runs today starts and ends in
     metropolitan Port-au-Prince, and a passenger on Haitian 4G should be able
     to search a second after opening the form - so the metro file is small
     enough to arrive quickly and answers on its own. The rest of the country
     is fetched behind it and merged in when it lands. Until either arrives,
     the OpenStreetMap lookups the page always had are still doing the work. */
  var DATA_URL = 'data/haiti-places.json';
  var REST_URL = 'data/haiti-places-rest.json';
  var CACHE_KEY = 'mw_places_v1';
  var CACHE_KEY_REST = 'mw_places_rest_v1';

  /* ─── 1. FOLDING ─────────────────────────────────────────────────────────
     Two spellings of the same Haitian place have to collapse to the same
     string. The hard case Jeffery named is "Osis" vs "Oasis": the vowel run
     is the whole difference, so adjacent vowels fold to one. "Otel" vs
     "Hôtel" is the dropped h. "Famasi" vs "pharmacie" is ph→f plus the
     Kreyòl ending.

     ⚠️ Order matters. ph must become f BEFORE h is dropped, or "pharmacie"
     turns into "parmasi" and stops matching. */
  function stripAccents(s) {
    try { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    catch (e) { return s; }
  }

  function fold(s) {
    if (!s) return '';
    s = stripAccents(String(s)).toLowerCase();
    /* 🚨 LIGATURES DO NOT DECOMPOSE. "Cœur" was being cut into "c" and "ur",
       which put a one-letter token in the index - and "qqq" folds to "k",
       so typing nonsense matched "Sœurs du Sacré Cœur". Expand them first. */
    s = s.replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/ß/g, 'ss');
    s = s.replace(/[^a-z0-9\s]/g, ' ');
    s = s.replace(/ph/g, 'f');
    s = s.replace(/ch|sh/g, '5');     /* one sentinel for the "sh" sound */
    s = s.replace(/c([eiy])/g, 's$1');
    s = s.replace(/qu|q|ck|c/g, 'k');
    s = s.replace(/h/g, '');
    s = s.replace(/x/g, 'ks');
    s = s.replace(/y/g, 'i');
    s = s.replace(/z/g, 's');
    s = s.replace(/w/g, 'u');
    /* 🚨🚨 LETTERS ONLY. This was `([a-z0-9])\1+` and it folded "33" to "3",
       so "Delmas 33" and "Delmas 3" became the same string - two different
       streets a few kilometres apart. In Haiti the number IS the address;
       a digit is never a spelling variant of anything. */
    s = s.replace(/([a-z])\1+/g, '$1');             /* bb -> b */
    s = s.replace(/[aeiou]{2,}/g, function (m) { return m[0]; }); /* oasis -> osis */
    return s.replace(/\s+/g, ' ').trim();
  }

  /* ─── 2. THE WORDS THAT ARE NOT THE NAME ─────────────────────────────────
     "Otel Oasis", "Hotel Oasis" and "Complexe Oasis" are one place. The word
     in front is a CATEGORY, not part of what makes it findable — so it is
     pulled out, used to rank, and removed before the names are compared.
     Every spelling below is folded at load time, so only one spelling of each
     needs to be listed here. */
  var GENERIC = {
    hotel:       ['hotel', 'otel', 'motel', 'auberge', 'guest house', 'pension', 'complexe', 'resort', 'lodge'],
    supermarket: ['supermarket', 'supermarche', 'sipemaket', 'maket', 'market', 'marche', 'mache',
                  'epicerie', 'boutik', 'magasin', 'store', 'depo'],
    health:      ['hopital', 'lopital', 'hospital', 'clinique', 'klinik', 'clinic', 'centre de sante',
                  'sant sante', 'dispensaire', 'pharmacie', 'famasi', 'pharmacy', 'cabinet'],
    school:      ['ecole', 'lekol', 'school', 'college', 'kolej', 'lycee', 'lise', 'universite',
                  'inivesite', 'university', 'institution', 'institut', 'faculte'],
    church:      ['eglise', 'legliz', 'church', 'chapelle', 'chapel', 'temple', 'cathedrale',
                  'katedral', 'paroisse', 'mission', 'saint', 'sainte', 'st'],
    fuel:        ['station', 'estasyon', 'pompe', 'gas', 'essence', 'petrol', 'texaco', 'total'],
    restaurant:  ['restaurant', 'restoran', 'resto', 'cafe', 'kafe', 'bar', 'snack', 'lounge',
                  'pizzeria', 'grill'],
    mall:        ['mall', 'centre commercial', 'sant komesyal', 'plaza', 'galerie'],
    public:      ['mairie', 'meri', 'police', 'polis', 'commissariat', 'bureau', 'biwo', 'poste',
                  'banque', 'bank', 'ambassade', 'anbasad', 'ministere', 'direction', 'tribunal'],
    landmark:    ['place', 'plas', 'stade', 'estad', 'parc', 'park', 'musee', 'size', 'aeroport',
                  'ayewopo', 'airport', 'monument', 'fort'],
  };

  /* folded generic word -> category */
  var GEN_LOOKUP = (function () {
    var m = {};
    for (var cat in GENERIC) {
      if (!GENERIC.hasOwnProperty(cat)) continue;
      for (var i = 0; i < GENERIC[cat].length; i++) {
        fold(GENERIC[cat][i]).split(' ').forEach(function (w) {
          if (w && !m[w]) m[w] = cat;
        });
      }
    }
    return m;
  })();

  /* Words that carry no meaning for a search at all. */
  var STOP = {};
  ['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'and', 'the', 'a', 'au', 'aux',
   'yon', 'nan', 'ak', 'sou', 'pou'].forEach(function (w) { STOP[fold(w)] = 1; });

  /* Which category word is this, allowing for how it was spelled?
     "supermache" is how it is said; "supermarche" is how the table spells it.
     An exact table lookup misses that by one letter, so near misses count. */
  var GEN_KEYS = Object.keys(GEN_LOOKUP);
  function genericCat(w) {
    if (GEN_LOOKUP[w]) return GEN_LOOKUP[w];
    if (w.length < 5) return null;        /* short words must be exact */
    for (var i = 0; i < GEN_KEYS.length; i++) {
      var k = GEN_KEYS[i];
      if (Math.abs(k.length - w.length) > 1) continue;
      if (editWithin(w, k, 1) <= 1) return GEN_LOOKUP[k];
    }
    return null;
  }

  function splitTokens(text) {
    var raw = fold(text).split(' ').filter(Boolean);
    var name = [], cats = {};
    for (var i = 0; i < raw.length; i++) {
      var w = raw[i];
      if (STOP[w]) continue;
      var cat = genericCat(w);
      if (cat) { cats[cat] = 1;
        /* ⚠️ a generic word is kept as a WEAK name token too. "Kay Mache" is a
           real place name; dropping "mache" outright would lose it. */
        name.push({ w: w, weak: true });
        continue; }
      name.push({ w: w, weak: false });
    }
    return { tokens: name, cats: cats };
  }

  /* ─── 3. HOW CLOSE IS CLOSE ENOUGH ───────────────────────────────────────
     Bounded Levenshtein: give up as soon as the row minimum exceeds what we
     would accept, so a 5000-row index stays instant on a cheap phone. */
  function editWithin(a, b, max) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    var prev = new Array(lb + 1), cur = new Array(lb + 1), i, j;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur[0] = i;
      var best = cur[0];
      for (j = 1; j <= lb; j++) {
        var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      var t = prev; prev = cur; cur = t;
    }
    return prev[lb];
  }

  /* How much slack a word of this length gets. Short words must be strict —
     at 2 edits on a 4-letter word every name matches every other. */
  function slack(len) { return len <= 4 ? 1 : (len <= 7 ? 2 : 3); }

  function tokenScore(q, cand) {
    if (q === cand) return 1;
    /* ⛔ A NUMBER IS NEVER APPROXIMATELY RIGHT. "Delmas 31" is not a typo of
       "Delmas 33" - it is a different street, and sending a driver to it is
       a wrong pickup and a wrong fare. Digits match exactly or not at all. */
    if (/[0-9]/.test(q) || /[0-9]/.test(cand)) return 0;
    /* 🚨 A FOLDED WORD CAN COLLAPSE TO ALMOST NOTHING. "zzzzqqqq" folds to
       "sk", which is a perfectly good prefix of "Skal" - so nonsense typed
       into the box was coming back as a real restaurant. Anything shorter
       than three folded letters has to match exactly or not at all. */
    if (q.length < 3) return 0;
    /* ...and a prefix only means something if the two words are roughly the
       same size. "kay" is not a useful prefix of "kayimitassaintlouis". */
    if (cand.indexOf(q) === 0 && cand.length <= q.length * 2.2) return 0.92;
    if (q.length >= 4 && cand.indexOf(q) >= 0) return 0.8;
    var d = editWithin(q, cand, slack(Math.max(q.length, cand.length)));
    if (d > slack(Math.max(q.length, cand.length))) return 0;
    return Math.max(0, 0.86 - d * 0.18);
  }

  /* ─── 4. THE INDEX ───────────────────────────────────────────────────────── */
  var PLACES = null, LOADING = null;

  function prepare(rows) {
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var names = [r.n].concat(r.alt || []);
      r._t = [];        /* every folded token of every spelling of the name */
      r._f = [];        /* the whole folded name, per spelling */
      for (var k = 0; k < names.length; k++) {
        var f = fold(names[k]);
        if (!f) continue;
        r._f.push(f);
        f.split(' ').forEach(function (w) {
          /* A one-LETTER token matches far too much to be worth indexing.
             A one-digit token is "Delmas 3" and must be kept. */
          var keep = w.length >= 2 || /^[0-9]$/.test(w);
          if (keep && !STOP[w] && r._t.indexOf(w) < 0) r._t.push(w);
        });
      }
    }
    return rows;
  }

  /* Fetch one file, preferring a copy this phone already paid for. */
  function fetchSet(url, key) {
    try {
      var hit = localStorage.getItem(key);
      if (hit) return Promise.resolve(JSON.parse(hit));
    } catch (e) {}
    return fetch(url, { cache: 'force-cache' })
      .then(function (r) { if (!r.ok) throw new Error('places ' + r.status); return r.json(); })
      .then(function (rows) {
        try { localStorage.setItem(key, JSON.stringify(rows)); } catch (e) {}
        return rows;
      })
      .catch(function () { return null; });
  }

  var REST_STARTED = false;
  function loadRest() {
    if (REST_STARTED) return;
    REST_STARTED = true;
    fetchSet(REST_URL, CACHE_KEY_REST).then(function (rows) {
      if (!rows || !rows.length || !PLACES) return;
      PLACES = PLACES.concat(prepare(rows));
    });
  }

  function load() {
    if (PLACES) return Promise.resolve(PLACES);
    if (LOADING) return LOADING;
    LOADING = new Promise(function (resolve) {
      var done = false;
      var give = function (rows) {
        if (done) return; done = true;
        PLACES = rows ? prepare(rows) : [];
        resolve(PLACES);
      };
      /* ⛔ NEVER BLOCK THE FORM. If the file is slow or absent, searching
         simply returns nothing and the caller falls through to OSM. */
      setTimeout(function () { give(null); }, 8000);
      fetchSet(DATA_URL, CACHE_KEY).then(function (rows) {
        give(rows);
        loadRest();          /* the rest of Haiti, quietly, behind her */
      });
    });
    return LOADING;
  }

  /* ─── 5. SEARCH ──────────────────────────────────────────────────────────
     Returns results in the SAME SHAPE the page already gets from Nominatim,
     so the caller needs no new branch: {display_name, lat, lon, address, name}.
     lat/lon are strings there, so they are strings here. */
  function toResult(r, score) {
    var where = [r.street, r.city].filter(Boolean).join(', ');
    return {
      display_name: r.n + (where ? ', ' + where : ''),
      name: r.n,
      lat: String(r.lat),
      lon: String(r.lng),
      address: { road: r.street || undefined, city: r.city || undefined,
                 country: 'Ayiti' },
      _mw_local: true,          /* so the caller can label it "near you" */
      _mw_cat: r.c,
      _mw_score: score
    };
  }

  function haversine(aLat, aLng, bLat, bLng) {
    var R = 6371, p = Math.PI / 180;
    var dLat = (bLat - aLat) * p, dLng = (bLng - aLng) * p;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(aLat * p) * Math.cos(bLat * p) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.asin(Math.sqrt(s));
  }

  function search(text, opts) {
    opts = opts || {};
    var limit = opts.limit || 6;
    return load().then(function (rows) {
      if (!rows || !rows.length) return [];
      var q = splitTokens(text);
      if (!q.tokens.length) return [];
      var qFull = fold(text);
      var out = [];

      /* SHE TYPED ONLY A CATEGORY. "supermache", "lopital", "estasyon gaz" -
         there is no name to match, she is asking what is near her. Answer
         with the nearest ones instead of nothing. Needs to know where she is;
         without that this is unanswerable and OSM can have it. */
      var anyStrong = q.tokens.some(function (t) { return !t.weak; });
      var catList = Object.keys(q.cats);
      if (!anyStrong && catList.length && opts.lat && opts.lng) {
        var near = [];
        for (var a = 0; a < rows.length; a++) {
          if (catList.indexOf(rows[a].c) < 0) continue;
          var d2 = haversine(opts.lat, opts.lng, rows[a].lat, rows[a].lng);
          if (d2 > 25) continue;
          rows[a]._km = d2;
          near.push({ r: rows[a], s: 1 - Math.min(d2, 25) / 50 });
        }
        near.sort(function (x, y) { return x.r._km - y.r._km; });
        return near.slice(0, limit).map(function (e) { return toResult(e.r, e.s); });
      }

      for (var i = 0; i < rows.length; i++) {
        var r = rows[i], total = 0, matched = 0, strong = 0;

        for (var j = 0; j < q.tokens.length; j++) {
          var tok = q.tokens[j], best = 0;
          for (var k = 0; k < r._t.length; k++) {
            var s = tokenScore(tok.w, r._t[k]);
            if (s > best) best = s;
            if (best === 1) break;
          }
          if (best > 0) {
            matched++;
            if (!tok.weak && best >= 0.8) strong++;
            total += best * (tok.weak ? 0.35 : 1);
          }
        }
        /* Every distinctive word she typed has to land somewhere. "Oasis
           Delmas" must not match an Oasis in Cap-Haitien just because one
           word fits.

           🚨 But the threshold counts ONLY the distinctive words. "Otel
           Oasis" is two tokens, and "otel" was never going to appear in
           "Complexe Oasis" - demanding 60% of ALL tokens threw away the
           exact search Jeffery asked for by name. */
        var strongTokens = q.tokens.filter(function (t) { return !t.weak; });
        var needed = strongTokens.length;
        if (needed && strong === 0) continue;
        if (needed && matched < Math.ceil(needed * 0.6)) continue;
        if (!needed && !matched) continue;

        var score = total / q.tokens.length;

        /* the whole string, in one go - "oasis" typed against "Complexe Oasis" */
        for (var m = 0; m < r._f.length; m++) {
          if (r._f[m] === qFull) { score = Math.max(score, 1.15); break; }
          if (r._f[m].indexOf(qFull) === 0) score = Math.max(score, 1.0);
        }

        if (q.cats[r.c]) score += 0.22;        /* she said "otel", this is a hotel */

        if (opts.lat && opts.lng) {
          var km = haversine(opts.lat, opts.lng, r.lat, r.lng);
          /* Near is better, but never decisive: a passenger in Delmas can
             genuinely be going to Cap-Haitien. */
          score += km < 2 ? 0.3 : (km < 10 ? 0.18 : (km < 40 ? 0.06 : 0));
          r._km = km;
        }

        if (score >= 0.62) out.push({ r: r, s: score });
      }

      out.sort(function (a, b) {
        if (b.s !== a.s) return b.s - a.s;
        return (a.r._km || 9e9) - (b.r._km || 9e9);
      });

      /* One Eagle Supermarket per answer, not the same brand six times. */
      var seen = {}, res = [];
      for (var z = 0; z < out.length && res.length < limit; z++) {
        var key = fold(out[z].r.n) + '|' + Math.round(out[z].r.lat * 200) +
                  '|' + Math.round(out[z].r.lng * 200);
        if (seen[key]) continue;
        seen[key] = 1;
        res.push(toResult(out[z].r, out[z].s));
      }
      return res;
    }).catch(function () { return []; });
  }

  global.MW_PLACES = {
    search: search,
    load: load,
    fold: fold,                 /* exported for the tests */
    ready: function () { return !!PLACES; },
    count: function () { return PLACES ? PLACES.length : 0; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
