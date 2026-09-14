/* https — bag page. */
(function () {
  var shop = window.httpsShop;
  var root = document.querySelector('[data-cart-page]');
  if (!root) return;
  var emptyEl = root.querySelector('[data-empty]'), itemsEl = root.querySelector('[data-items]');
  var countEl = root.querySelector('[data-count]'), totalEl = root.querySelector('[data-total]');
  var checkout = root.querySelector('[data-checkout]'), note = root.querySelector('[data-checkout-note]');
  var checkoutUrl = null;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

  async function render() {
    var c;
    try { c = await shop.cart(); } catch (e) { console.error(e); return; }
    itemsEl.textContent = '';
    c.lines.forEach(function (line) {
      var p = line.product;
      var row = el('div', 'cart-item');
      var thumb = el('a', 'cart-thumb'); thumb.href = 'piece.html?handle=' + encodeURIComponent(p.handle);
      if (p.image) { var img = el('img'); img.src = p.image; img.alt = p.title; thumb.appendChild(img); }
      var body = el('div', 'cart-item-body');
      var name = el('a', 'cart-item-name', p.title + (p.subtitle ? ' — ' + p.subtitle : '')); name.href = thumb.href;
      var unit = el('span', 'mono', shop.money(line.price) + ' · one size');
      var qty = el('div', 'qty');
      var dec = el('button', null, '−'); dec.type = 'button'; dec.setAttribute('aria-label', 'Remove one');
      var val = el('span', null, String(line.quantity));
      var inc = el('button', null, '+'); inc.type = 'button'; inc.setAttribute('aria-label', 'Add one');
      dec.addEventListener('click', function () { shop.setQuantity(line.id, line.quantity - 1).then(render); });
      inc.addEventListener('click', function () { shop.setQuantity(line.id, line.quantity + 1).then(render); });
      qty.appendChild(dec); qty.appendChild(val); qty.appendChild(inc);
      body.appendChild(name); body.appendChild(unit); body.appendChild(qty);
      var total = el('span', 'cart-line', shop.money({ amount: line.price.amount * line.quantity, currency: line.price.currency }));
      row.appendChild(thumb); row.appendChild(body); row.appendChild(total);
      itemsEl.appendChild(row);
    });
    var empty = c.lines.length === 0;
    emptyEl.hidden = !empty;
    countEl.textContent = String(c.count);
    totalEl.textContent = shop.money(c.subtotal);
    checkoutUrl = c.checkoutUrl;
    checkout.disabled = empty;
    if (note) note.textContent = shop.mode === 'shopify' ? '' : 'Checkout opens once the shop is connected to Shopify.';
  }

  checkout.addEventListener('click', function () {
    if (checkoutUrl) { location.href = checkoutUrl; return; }
    if (note) note.textContent = 'Checkout is not connected yet.';
  });

  render();
  shop.onChange(render);
})();
