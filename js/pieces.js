/* https — pieces listing (any number of products). */
(function () {
  var shop = window.httpsShop;
  var grid = document.querySelector('[data-pieces-grid]');
  if (!grid) return;
  var countEl = document.querySelector('[data-pieces-count]');
  shop.products().then(function (products) {
    grid.textContent = '';
    products.forEach(function (p) { grid.appendChild(window.httpsTile(p)); });
    if (countEl) countEl.textContent = products.length === 1 ? 'one piece.' : products.length + ' pieces. one quiet signal.';
    if (!products.length) grid.innerHTML = '<div class="tile" style="padding:32px"><span class="body soft">nothing here yet.</span></div>';
  }).catch(function (e) {
    grid.innerHTML = '<div class="tile" style="padding:32px"><span class="body soft">the pieces could not be loaded.</span></div>';
    console.error(e);
  });
})();
