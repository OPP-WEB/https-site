/* https — shared: tile renderer + nav bag count. */
(function () {
  var shop = window.httpsShop;

  // tile: used by the pieces page and the story page
  window.httpsTile = function (p) {
    var a = document.createElement('a');
    a.className = 'tile'; a.href = shop.pieceUrl(p);
    var img = p.images && p.images[0];
    a.innerHTML =
      '<div class="tile-image">' + (img ? '<img src="' + img.url + '" alt="">' : '') + '</div>' +
      '<div class="tile-body">' +
        '<div class="tile-row"><span class="tile-name"></span><span class="mono"></span></div>' +
        '<span class="mono tile-sub"></span>' +
      '</div>';
    if (img) a.querySelector('img').alt = p.title;
    a.querySelector('.tile-name').textContent = p.title + (p.subtitle ? ' — ' + p.subtitle : '');
    a.querySelector('.tile-row .mono').textContent = shop.money(p.price);
    a.querySelector('.tile-sub').textContent = (p.available ? (p.edition ? p.edition + ' · available' : 'available') : 'currently unavailable') + ' · view the piece →';
    return a;
  };

  // nav bag count
  var el = document.querySelector('[data-cart-label]');
  if (!shop || !el) return;
  var sync = function () {
    shop.cart().then(function (c) { el.textContent = 'https://bag' + (c.count ? ' (' + c.count + ')' : ''); }).catch(function () {});
  };
  sync(); shop.onChange(sync);
})();
