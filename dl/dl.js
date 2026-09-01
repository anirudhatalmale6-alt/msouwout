/* dl.js — make the buttons on these delivery pages actually save a file.
 *
 * Every button on every /dl/ page was a plain <a href="something.png">. On a
 * desktop that is fine; on a phone it is not a download at all. Android Chrome
 * navigates to the file instead: the picture fills the screen, the PDF opens in
 * the viewer, the video starts playing, and nothing is ever written to the
 * phone. Jeffery works only from a phone, so from where he sits the button
 * simply does nothing — "I cant download it".
 *
 * Three routes out, in order, because he needs at least one of them to survive
 * whichever browser the link was opened in:
 *
 *   1. fetch -> Blob -> object URL -> click. This is the one Android Chrome
 *      honours reliably; it writes to the Downloads folder and shows the usual
 *      download notification.
 *   2. "Send it on WhatsApp" — navigator.share with the actual file attached.
 *      This matters more than the download does: what he actually does with
 *      these files is forward them to a print shop, and this route skips the
 *      Downloads folder entirely.
 *   3. The plain download attribute, left on the anchor. If the script never
 *      runs, or the fetch fails on a bad connection, the button still behaves
 *      the way a download link should rather than reverting to "opens it".
 *
 * The file is fetched once and kept, so tapping "Send it" afterwards does not
 * pay for the bytes a second time on a Haitian mobile connection.
 */
(function () {
  'use strict';

  var EXT = /\.(png|jpe?g|svg|pdf|mp4|mov|zip|webp|gif|eps|ai)(\?.*)?$/i;

  /* Nothing here is heavy, but a 1.9 MB PDF over mobile data is not instant.
     Every button gets a visible state so he is not left tapping a dead button. */
  var LBL = {
    working: 'Preparing the file…',
    saved: 'Saved to your phone',
    hint: 'It is in your Downloads folder — open the Files app, then Downloads.',
    share: '📤 Send it on WhatsApp',
    sharing: 'Opening…',
    failed: 'That did not save. Press and hold the picture above instead, then choose Save image.'
  };

  function css() {
    if (document.getElementById('dl-js-css')) return;
    var s = document.createElement('style');
    s.id = 'dl-js-css';
    s.textContent =
      '.dlj-note{margin-top:10px;border-radius:12px;padding:12px 14px;font-size:.88rem;' +
        'line-height:1.5;background:rgba(27,140,61,.09);color:#14532d;' +
        'border:1px solid rgba(27,140,61,.28)}' +
      '.dlj-note.dlj-wait{background:rgba(0,32,159,.07);color:#00209F;' +
        'border-color:rgba(0,32,159,.22)}' +
      '.dlj-note.dlj-bad{background:#FFF6F5;color:#9B1C22;border-color:rgba(227,27,35,.3)}' +
      '.dlj-note b{display:block;font-weight:800;margin-bottom:2px}' +
      /* the share control is a real button, not a link, so it can never be
         mistaken for another download and never navigates anywhere */
      '.dlj-share{display:block;width:100%;margin-top:10px;padding:14px 16px;border:0;' +
        'border-radius:12px;background:#1B8C3D;color:#fff;font:inherit;font-weight:800;' +
        'font-size:.95rem;cursor:pointer;-webkit-appearance:none}' +
      '.dlj-share[disabled]{opacity:.6}' +
      '.dlj-busy{opacity:.65;pointer-events:none}';
    document.head.appendChild(s);
  }

  function nameOf(href) {
    var n = href.split('?')[0].split('#')[0].split('/').pop();
    return decodeURIComponent(n || 'download');
  }

  function note(a) {
    var el = a.nextElementSibling;
    if (el && el.classList && el.classList.contains('dlj-note')) return el;
    el = document.createElement('div');
    el.className = 'dlj-note';
    a.parentNode.insertBefore(el, a.nextSibling);
    return el;
  }

  function saveBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    /* revoking immediately can cut the download off on slower devices before
       the browser has taken the bytes */
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  function addShare(box, blob, filename) {
    if (!navigator.share || !navigator.canShare) return;
    var file;
    try {
      file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
      if (!navigator.canShare({ files: [file] })) return;
    } catch (e) { return; }

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'dlj-share';
    b.textContent = LBL.share;
    b.addEventListener('click', function () {
      b.disabled = true;
      b.textContent = LBL.sharing;
      /* the file is already in memory from the save, so this runs inside the
         tap and the share sheet is not blocked as a popup */
      navigator.share({ files: [file], title: filename })
        .catch(function () {})
        .then(function () { b.disabled = false; b.textContent = LBL.share; });
    });
    box.appendChild(b);
  }

  function handle(ev) {
    var a = ev.currentTarget;
    if (a.dataset.dljBusy === '1') { ev.preventDefault(); return; }

    /* No fetch available at all - let the download attribute do its job. */
    if (!window.fetch || !window.URL || !URL.createObjectURL) return;

    ev.preventDefault();
    a.dataset.dljBusy = '1';
    a.classList.add('dlj-busy');

    var filename = a.getAttribute('download') || nameOf(a.href);
    var box = note(a);
    box.className = 'dlj-note dlj-wait';
    box.textContent = LBL.working;

    fetch(a.href, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.blob();
      })
      .then(function (blob) {
        saveBlob(blob, filename);
        box.className = 'dlj-note';
        box.innerHTML = '';
        var t = document.createElement('b');
        t.textContent = LBL.saved;
        var p = document.createElement('span');
        p.textContent = LBL.hint;
        box.appendChild(t);
        box.appendChild(p);
        addShare(box, blob, filename);
      })
      .catch(function () {
        /* Last resort: hand it back to the browser. With the download
           attribute set this still beats the old behaviour of just opening
           the file, and if even that fails the message says what to do. */
        box.className = 'dlj-note dlj-bad';
        box.textContent = LBL.failed;
        try {
          var f = document.createElement('a');
          f.href = a.href;
          f.download = filename;
          f.style.display = 'none';
          document.body.appendChild(f);
          f.click();
          f.remove();
        } catch (e) {}
      })
      .then(function () {
        a.dataset.dljBusy = '0';
        a.classList.remove('dlj-busy');
      });
  }

  function init() {
    css();
    var here = location.origin;
    var links = document.querySelectorAll('a[href]');
    Array.prototype.forEach.call(links, function (a) {
      var href = a.getAttribute('href') || '';
      if (!EXT.test(href)) return;
      /* Cross-origin files cannot be fetched or renamed, and the download
         attribute is ignored on them - leave those alone entirely rather than
         breaking a working link. */
      if (a.origin && a.origin !== here) return;
      if (!a.hasAttribute('download')) a.setAttribute('download', nameOf(href));
      a.addEventListener('click', handle);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
