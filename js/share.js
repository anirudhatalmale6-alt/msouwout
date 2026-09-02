/* ============================================================
   MsouWout - share this page
   ------------------------------------------------------------
   Why this file exists: the site is an installed PWA
   (manifest.json says display:standalone). Once it is on the
   home screen there is NO ADDRESS BAR, so there was literally
   no way to copy the link and send it to anybody. The pages
   had no share control of their own either. "I am trying to
   share MsouWout Logistics but I can't" was exactly right.

   What it does:
     - drops a share control into .topbar-right when the page
       has one, otherwise a floating button that parks itself
       above .bottom-nav
     - uses the phone's own share sheet (navigator.share) when
       it exists
     - when it does not, opens a small panel with WhatsApp /
       Facebook / copy, AND PRINTS THE URL AS SELECTABLE TEXT,
       because in the installed app that is the only place the
       address is visible at all
     - takes its title/text/url from the page's own og: tags,
       so every page shares itself correctly with no per-page
       wiring

   Include with:  <script src="js/share.js" defer></script>
   ============================================================ */
(function () {
  'use strict';

  var T = {
    ht: { btn: 'Pataje', head: 'Pataje paj sa a', wa: 'Voye sou WhatsApp', fb: 'Pataje sou Facebook',
          copy: 'Kopye lyen an', copied: 'Lyen an kopye!', link: 'Lyen an:', close: 'Fèmen' },
    fr: { btn: 'Partager', head: 'Partager cette page', wa: 'Envoyer sur WhatsApp', fb: 'Partager sur Facebook',
          copy: 'Copier le lien', copied: 'Lien copié !', link: 'Le lien :', close: 'Fermer' },
    en: { btn: 'Share', head: 'Share this page', wa: 'Send on WhatsApp', fb: 'Share on Facebook',
          copy: 'Copy the link', copied: 'Link copied!', link: 'The link:', close: 'Close' },
    es: { btn: 'Compartir', head: 'Compartir esta página', wa: 'Enviar por WhatsApp', fb: 'Compartir en Facebook',
          copy: 'Copiar el enlace', copied: '¡Enlace copiado!', link: 'El enlace:', close: 'Cerrar' }
  };

  function lang() {
    /* the pages keep the choice in localStorage under a couple of
       different keys depending on when they were written */
    var l = null;
    try { l = localStorage.getItem('mw_lang') || localStorage.getItem('lang') || localStorage.getItem('hb_lang'); } catch (e) {}
    if (!l) { var a = document.querySelector('.lang-switch a.active'); if (a) l = (a.id || '').replace('lang-', ''); }
    return T[l] ? l : 'ht';
  }
  function t(k) { return T[lang()][k] || T.en[k]; }

  function meta(prop) {
    var m = document.querySelector('meta[property="' + prop + '"]') ||
            document.querySelector('meta[name="' + prop + '"]');
    return m ? (m.getAttribute('content') || '').trim() : '';
  }

  function shareUrl() {
    /* prefer the canonical/og url - inside the app location.href can
       carry ?utm / #anchor junk that makes an ugly link to paste */
    var c = document.querySelector('link[rel="canonical"]');
    return meta('og:url') || (c && c.href) || location.href.split('#')[0];
  }
  function shareTitle() { return meta('og:title') || document.title || 'MsouWout'; }
  function shareText() { return meta('og:description') || meta('description') || ''; }

  /* ---------- styles ----------
     These have to go in at mount time, not when the panel is first built:
     the button itself is styled from here, and a button with no CSS collapses
     to 0px wide inside the flex topbar - present in the DOM, invisible and
     untappable on the phone. */
  var cssDone = false;

  function ensureCss() {
    if (cssDone) return;
    cssDone = true;
    var css = document.createElement('style');
    css.textContent =
      '#mwShareSheet{position:fixed;inset:0;z-index:99999;display:none;font-family:inherit}' +
      '#mwShareSheet.open{display:block}' +
      '#mwShareSheet .mwsh-back{position:absolute;inset:0;background:rgba(3,10,32,.66)}' +
      '#mwShareSheet .mwsh-card{position:absolute;left:50%;bottom:0;transform:translateX(-50%);' +
        'width:100%;max-width:480px;background:#fff;color:#0b1533;border-radius:18px 18px 0 0;' +
        'padding:18px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -8px 40px rgba(0,0,0,.4);' +
        'animation:mwshUp .18s ease-out}' +
      '@keyframes mwshUp{from{transform:translate(-50%,100%)}to{transform:translate(-50%,0)}}' +
      '#mwShareSheet .mwsh-h{font-weight:800;font-size:1.05rem;margin:0 0 12px;text-align:center}' +
      '#mwShareSheet .mwsh-b{display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;' +
        'padding:14px 16px;margin-bottom:9px;border-radius:12px;border:1.5px solid #dfe4f0;background:#f6f8fd;' +
        'font:inherit;font-size:1rem;font-weight:600;color:#0b1533;text-decoration:none;cursor:pointer;text-align:left}' +
      '#mwShareSheet .mwsh-b:active{background:#e8edf9}' +
      '#mwShareSheet .mwsh-wa{border-color:#25D366;background:#eafaf0}' +
      '#mwShareSheet .mwsh-l{font-size:.78rem;font-weight:700;color:#5a6684;margin:14px 0 5px}' +
      '#mwShareSheet .mwsh-u{font-size:.85rem;line-height:1.45;word-break:break-all;background:#f0f3fa;' +
        'border:1px dashed #b9c3da;border-radius:10px;padding:10px 12px;user-select:all;-webkit-user-select:all}' +
      '#mwShareSheet .mwsh-x{width:100%;margin-top:14px;padding:12px;border:0;border-radius:12px;' +
        'background:#0b1533;color:#fff;font:inherit;font-weight:700;font-size:.95rem;cursor:pointer}' +
      '.mw-share-fab{position:fixed;right:14px;z-index:9998;display:flex;align-items:center;gap:7px;' +
        'padding:12px 16px;border:0;border-radius:999px;background:#D21034;color:#fff;font:inherit;' +
        'font-weight:700;font-size:.9rem;cursor:pointer;box-shadow:0 6px 20px rgba(210,16,52,.45)}' +
      '.mw-share-fab:active{transform:scale(.96)}' +
      /* flex:0 0 auto - the topbar is a tight flex row on a 390px phone and
         will otherwise shrink this button to nothing */
      '.mw-share-top{flex:0 0 auto;display:flex;align-items:center;justify-content:center;' +
        'width:38px;height:38px;min-width:38px;box-sizing:border-box;border:0;border-radius:10px;' +
        'background:rgba(255,255,255,.15);color:#fff;cursor:pointer;padding:0}' +
      '.mw-share-top:active{background:rgba(255,255,255,.28)}' +
      '.mw-share-top svg,.mw-share-fab svg{width:19px;height:19px;stroke:currentColor;stroke-width:2;' +
        'fill:none;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}';
    document.head.appendChild(css);
  }

  /* ---------- the fallback panel ---------- */
  var sheet = null;

  function buildSheet() {
    if (sheet) return sheet;
    ensureCss();
    var url = shareUrl();
    var msg = shareTitle() + '\n' + url;

    var wrap = document.createElement('div');
    wrap.id = 'mwShareSheet';
    wrap.innerHTML =
      '<div class="mwsh-back"></div>' +
      '<div class="mwsh-card" role="dialog" aria-modal="true">' +
        '<div class="mwsh-h">' + t('head') + '</div>' +
        '<a class="mwsh-b mwsh-wa" target="_blank" rel="noopener">' +
          '<span>&#128172;</span> ' + t('wa') + '</a>' +
        '<a class="mwsh-b mwsh-fb" target="_blank" rel="noopener">' +
          '<span>&#127760;</span> ' + t('fb') + '</a>' +
        '<button class="mwsh-b mwsh-cp" type="button">' +
          '<span>&#128203;</span> ' + t('copy') + '</button>' +
        '<div class="mwsh-l">' + t('link') + '</div>' +
        /* selectable, wrapping, tap-to-select: in the installed app this
           is the ONLY place the address can be read at all */
        '<div class="mwsh-u" tabindex="0"></div>' +
        '<button class="mwsh-x" type="button">' + t('close') + '</button>' +
      '</div>';

    wrap.querySelector('.mwsh-u').textContent = url;
    wrap.querySelector('.mwsh-wa').href = 'https://wa.me/?text=' + encodeURIComponent(msg);
    wrap.querySelector('.mwsh-fb').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);

    document.body.appendChild(wrap);

    function close() { wrap.classList.remove('open'); }
    wrap.querySelector('.mwsh-back').addEventListener('click', close);
    wrap.querySelector('.mwsh-x').addEventListener('click', close);
    wrap.querySelector('.mwsh-wa').addEventListener('click', close);
    wrap.querySelector('.mwsh-fb').addEventListener('click', close);

    wrap.querySelector('.mwsh-cp').addEventListener('click', function () {
      var btn = this, done = function () {
        btn.innerHTML = '<span>&#9989;</span> ' + t('copied');
        setTimeout(close, 900);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, legacy);
      } else { legacy(); }
      function legacy() {
        /* older Android webviews have no clipboard API - select the
           printed URL so a long-press copy still works */
        try {
          var el = wrap.querySelector('.mwsh-u'), r = document.createRange();
          r.selectNodeContents(el);
          var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
          document.execCommand('copy'); done();
        } catch (e) { /* the URL is on screen either way */ }
      }
    });

    sheet = wrap;
    return wrap;
  }

  var ICON = '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/>' +
             '<circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/>' +
             '<line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/></svg>';

  function doShare() {
    var data = { title: shareTitle(), text: shareText(), url: shareUrl() };
    if (navigator.share) {
      navigator.share(data).catch(function (err) {
        /* AbortError just means he changed his mind - do not punish
           that with a second panel opening on top */
        if (err && err.name === 'AbortError') return;
        buildSheet().classList.add('open');
      });
      return;
    }
    buildSheet().classList.add('open');
  }

  /* Park the floating button clear of everything else already living in that
     corner - the bottom tab bar, and any chat/assistant bubble the page puts
     there. Measured at runtime, not guessed: the tab bar is a different
     height on different pages, and dropping the share button on top of the
     assistant would just trade one broken control for another. */
  function placeFab(f) {
    var vh = window.innerHeight, vw = window.innerWidth;
    var floor = 14;

    var nav = document.querySelector('.bottom-nav, .botnav, .tabbar');
    if (nav) {
      var nb = nav.getBoundingClientRect();
      if (nb.height) floor = Math.max(floor, Math.round(vh - nb.top) + 14);
    }

    Array.prototype.forEach.call(document.body.querySelectorAll('*'), function (el) {
      if (el === f || f.contains(el) || el.contains(f)) return;
      var st = getComputedStyle(el);
      if (st.position !== 'fixed' || st.display === 'none' || st.visibility === 'hidden') return;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (r.width > vw * 0.7 && r.height > vh * 0.7) return;   /* an overlay, not a bubble */
      /* only things sharing this corner matter */
      if (r.right < vw - 130 || r.bottom < vh - 190) return;
      floor = Math.max(floor, Math.round(vh - r.top) + 12);
    });

    f.style.bottom = Math.min(floor, Math.round(vh * 0.55)) + 'px';
  }

  function mount() {
    if (document.querySelector('.mw-share-top,.mw-share-fab')) return;
    ensureCss();

    var bar = document.querySelector('.topbar-right');
    if (bar) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mw-share-top';
      b.setAttribute('aria-label', t('btn'));
      b.title = t('btn');
      b.innerHTML = ICON;
      b.addEventListener('click', doShare);
      var burger = bar.querySelector('.hamburger');
      if (burger) bar.insertBefore(b, burger); else bar.appendChild(b);
      return;
    }

    var f = document.createElement('button');
    f.type = 'button';
    f.className = 'mw-share-fab';
    f.innerHTML = ICON + '<span>' + t('btn') + '</span>';
    f.addEventListener('click', doShare);
    document.body.appendChild(f);
    placeFab(f);

    /* On a phone the on-screen keyboard cuts innerHeight roughly in half, and a
       button parked a fixed number of pixels off the bottom of the OLD viewport
       lands in the middle of the NEW one - on top of whatever the person is
       trying to press. Jeffery's screenshot caught it sitting across "Mande Kous
       Kounye A" while he typed an address. Nobody needs a share button while
       they are typing, so get out of the way, and re-measure afterwards. */
    var typing = function () {
      var a = document.activeElement;
      return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable));
    };
    /* And whatever it is parked above, the page still scrolls underneath it. A
       share button is never worth covering a control the person came here to
       press, so ask what is actually under it and step aside when the answer is
       a button. Cheaper than measuring every rect on every scroll frame. */
    var coversAControl = function () {
      var r = f.getBoundingClientRect();
      if (!r.width) return false;
      f.style.pointerEvents = 'none';
      var under = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      f.style.pointerEvents = '';
      while (under && under !== document.body) {
        if (under === f) return false;
        var tag = under.tagName;
        if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SELECT' ||
            under.getAttribute('role') === 'button' || under.hasAttribute('onclick')) return true;
        under = under.parentElement;
      }
      return false;
    };

    var settle = null, framed = false;
    var restack = function () {
      if (settle) clearTimeout(settle);
      settle = setTimeout(function () {
        if (typing()) { f.style.display = 'none'; return; }
        f.style.display = '';
        placeFab(f);
        f.style.visibility = coversAControl(f) ? 'hidden' : '';
      }, 120);
    };
    var onScroll = function () {
      if (framed) return;
      framed = true;
      requestAnimationFrame(function () {
        framed = false;
        if (f.style.display === 'none') return;
        f.style.visibility = coversAControl(f) ? 'hidden' : '';
      });
    };
    document.addEventListener('focusin', restack, true);
    document.addEventListener('focusout', restack, true);
    window.addEventListener('resize', restack);
    window.addEventListener('orientationchange', restack);
    window.addEventListener('scroll', onScroll, { passive: true });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', restack);
    setTimeout(onScroll, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else { mount(); }

  window.mwShare = doShare;   /* so a page can put "Pataje" on its own button too */
})();
