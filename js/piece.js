/* https — product page rendered from ?handle= */
(function () {
  var shop = window.httpsShop;
  var root = document.querySelector('[data-piece]');
  if (!root) return;
  var handle = new URLSearchParams(location.search).get('handle') || '';
  var q = function (s) { return root.querySelector(s); };
  var notFound = document.querySelector('[data-piece-missing]');

  function pad(n) { return String(n).padStart(2, '0'); }

  function render(p) {
    document.title = 'https — ' + p.title;
    q('[data-handle]').textContent = 'https://' + p.handle;
    q('[data-availability]').textContent = p.available ? ((p.edition ? p.edition + ' · ' : '') + 'available') : 'currently unavailable';
    q('[data-title]').textContent = p.title + (p.subtitle ? ' — ' + p.subtitle : '');
    q('[data-sub]').textContent = [p.colour, p.size, 'unisex'].filter(Boolean).join(' · ');
    q('[data-price]').textContent = shop.money(p.price);
    q('[data-description]').textContent = p.description;
    var specs = q('[data-specs]'); specs.textContent = '';
    (p.specs || []).forEach(function (row) {
      var d = document.createElement('div'); var k = document.createElement('span'); var v = document.createElement('span');
      k.textContent = row[0]; v.textContent = row[1]; d.appendChild(k); d.appendChild(v); specs.appendChild(d);
    });

    // gallery
    var track = q('[data-track]'); track.textContent = '';
    p.images.forEach(function (im) {
      var f = document.createElement('figure'); var img = document.createElement('img'); var cap = document.createElement('figcaption');
      img.src = im.url; img.alt = im.alt || p.title; cap.textContent = im.alt || ''; f.appendChild(img); f.appendChild(cap); track.appendChild(f);
    });
    var counter = q('[data-counter]');
    function index() { var w = track.clientWidth; return w ? Math.round(track.scrollLeft / w) : 0; }
    function update() { var n = track.children.length; counter.textContent = pad(Math.max(0, Math.min(n - 1, index())) + 1) + ' / ' + pad(n); }
    function go(d) { var w = track.clientWidth, n = track.children.length; var i = Math.max(0, Math.min(n - 1, index() + d)); track.scrollTo({ left: i * w, behavior: 'smooth' }); }
    track.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update);
    q('[data-prev]').addEventListener('click', function () { go(-1); });
    q('[data-next]').addEventListener('click', function () { go(1); });
    update();

    // add to bag
    var btn = q('[data-add]'), bar = document.querySelector('[data-add-bar]'), link = q('[data-cart-link]');
    var label = p.available ? 'Add to bag — ' + shop.money(p.price) : 'Currently unavailable';
    btn.textContent = label; btn.disabled = !p.available;
    if (bar) { bar.textContent = p.available ? 'Add to bag' : 'Unavailable'; bar.disabled = !p.available; document.querySelector('[data-bar-label]').textContent = p.title + ' · ' + shop.money(p.price); }
    var t;
    async function add() {
      btn.disabled = true;
      try {
        await shop.add(p.variantId, 1);
        btn.textContent = 'Connection added'; if (bar) bar.textContent = 'Connection added';
      } catch (e) { btn.textContent = 'Something went wrong'; console.error(e); }
      clearTimeout(t);
      t = setTimeout(function () { btn.textContent = label; btn.disabled = !p.available; if (bar) bar.textContent = 'Add to bag'; }, 1800);
    }
    btn.addEventListener('click', add); if (bar) bar.addEventListener('click', add);
    async function syncLink() { try { var c = await shop.cart(); link.textContent = c.count ? 'View bag (' + c.count + ') →' : ''; } catch (e) {} }
    syncLink(); shop.onChange(syncLink);

    // other pieces
    shop.products().then(function (all) {
      var others = q('[data-others]'); others.textContent = '';
      all.filter(function (o) { return o.handle !== p.handle; }).forEach(function (o) {
        var a = document.createElement('a'); a.className = 'product-other'; a.href = shop.pieceUrl(o);
        a.textContent = o.title + (o.subtitle ? ' — ' + o.subtitle : '') + ' →'; others.appendChild(a);
      });
    });
    root.hidden = false;
  }

  shop.product(handle).then(function (p) {
    if (!p) { if (notFound) notFound.hidden = false; document.title = 'https — piece not found'; return; }
    render(p);
  }).catch(function (e) { if (notFound) notFound.hidden = false; console.error(e); });
})();
