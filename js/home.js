/* https — home: discovery reveal, symbol focus, join form. */
(function () {
  var shop = window.httpsShop;

  // featured pieces: rendered from the catalog so new products appear without editing this page
  var feat = document.querySelector('[data-featured]');
  if (feat && shop) {
    shop.featured(2).then(function (list) {
      feat.textContent = '';
      var words = ['first', 'second', 'third', 'fourth'];
      list.forEach(function (p, i) {
        var sec = document.createElement('section');
        sec.className = 'object' + (i % 2 ? ' object--reverse' : '');
        var img = p.images[0];
        sec.innerHTML =
          '<div class="object-grid">' +
            '<div class="object-image">' + (img ? '<img src="' + img.url + '" alt="">' : '') + '</div>' +
            '<div class="object-copy">' +
              '<div class="object-head"><span class="o-handle"></span><span class="o-avail"></span></div>' +
              '<div class="object-stack"><h2 class="o-title"></h2><p class="object-meta"></p><span class="object-price"></span><a class="cta">View the piece →</a></div>' +
              '<span class="object-line"></span>' +
            '</div>' +
          '</div>';
        sec.querySelector('img') && (sec.querySelector('img').alt = p.title + ', front');
        sec.querySelector('.o-handle').textContent = 'https://' + p.handle;
        sec.querySelector('.o-avail').textContent = p.available ? ((p.edition ? p.edition + ' · ' : '') + 'available') : 'currently unavailable';
        sec.querySelector('.o-title').textContent = p.title;
        sec.querySelector('.object-meta').innerHTML = '';
        sec.querySelector('.object-meta').append(p.subtitle || '', document.createElement('br'), [p.colour, p.size].filter(Boolean).join(' · '));
        sec.querySelector('.object-price').textContent = shop.money(p.price);
        sec.querySelector('.cta').href = shop.pieceUrl(p);
        sec.querySelector('.object-line').textContent = p.line || ('The ' + (words[i] || '') + ' connection.');
        feat.appendChild(sec);
      });
    }).catch(function (e) { console.error(e); });
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // discovery: fragments fade, mark appears once the beat is in view
  var disc = document.querySelector('[data-discovery]');
  if (disc) {
    if (reduce || !('IntersectionObserver' in window)) {
      disc.classList.add('is-revealed');
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            setTimeout(function () { disc.classList.add('is-revealed'); }, 600);
            io.disconnect();
          }
        });
      }, { threshold: 0.45 });
      io.observe(disc);
    }
  }

  // symbol: hover / tap a note to isolate that part of the mark
  var sym = document.querySelector('[data-symbol]');
  if (sym) {
    var mark = sym.querySelector('.mark');
    var notes = sym.querySelectorAll('.symbol-notes > div');
    function focus(key) {
      mark.setAttribute('data-focus', key || '');
      notes.forEach(function (n) { n.classList.toggle('is-active', !!key && n.getAttribute('data-focus') === key); });
    }
    notes.forEach(function (n) {
      n.addEventListener('mouseenter', function () { focus(n.getAttribute('data-focus')); });
      n.addEventListener('mouseleave', function () { focus(''); });
      n.addEventListener('click', function () {
        var k = n.getAttribute('data-focus');
        focus(mark.getAttribute('data-focus') === k ? '' : k);
      });
    });
  }

  // join: no provider wired yet — remember locally and confirm quietly
  var join = document.querySelector('[data-join]');
  if (join) {
    var form = join.querySelector('form');
    var note = join.querySelector('[data-join-note]');
    var input = form.querySelector('input');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = (input.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { note.textContent = 'That address doesn\'t look right.'; input.focus(); return; }
      try { localStorage.setItem('https_join', v); } catch (err) {}
      form.hidden = true;
      note.textContent = 'Connected. We\'ll be quiet until there is something to say.';
    });
  }
})();
