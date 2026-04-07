/**
 * Ajax cart drawer: intercept /cart/add, refresh /cart.js, update header count.
 */
(function () {
  var root = document.getElementById('cart-drawer');
  if (!root) return;

  var moneyFormat = root.getAttribute('data-money-format') || '${{amount}}';
  var freeShippingCents = parseInt(root.getAttribute('data-free-shipping-cents'), 10) || 7500;

  var backdrop = root.querySelector('[data-cart-drawer-backdrop]');
  var panel = root.querySelector('[data-cart-drawer-panel]');
  var itemsEl = root.querySelector('[data-cart-items]');
  var emptyEl = root.querySelector('[data-cart-empty]');
  var subtotalEl = root.querySelector('[data-cart-subtotal]');
  var countEls = document.querySelectorAll('[data-header-cart-count]');
  var titleCountEls = root.querySelectorAll('[data-cart-drawer-title-count]');
  var countWrap = root.querySelector('[data-cart-drawer-count-wrap]');
  var checkoutBtn = root.querySelector('[data-cart-checkout-btn]');
  var progressWrap = root.querySelector('[data-cart-progress-wrap]');
  var progressMsg = root.querySelector('[data-cart-progress-msg]');
  var progressFill = root.querySelector('[data-cart-progress-fill]');

  function formatMoney(cents) {
    var n = Number(cents);
    if (Number.isNaN(n)) return '';
    var amount = (n / 100).toFixed(2);
    return String(moneyFormat)
      .replace(/\{\{\s*amount[^}]*\}\}/, amount)
      .replace(/\{\{\s*amount\s*\}\}/, amount);
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function setOpen(open) {
    root.classList.toggle('is-open', open);
    root.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.classList.toggle('cart-drawer-open', open);
    if (open && panel) {
      var closeBtn = root.querySelector('[data-cart-drawer-close]');
      if (closeBtn) closeBtn.focus();
    }
  }

  function updateHeaderCount(count) {
    var c = String(count);
    countEls.forEach(function (el) {
      el.textContent = count > 0 ? c : '';
      el.hidden = count === 0;
    });
    titleCountEls.forEach(function (el) {
      el.textContent = count > 0 ? c : '';
    });
    if (countWrap) countWrap.hidden = count === 0;
  }

  function renderFreeShipping(cart) {
    if (!progressWrap || !progressMsg || !progressFill) return;
    var total = cart.total_price || 0;
    var pct = Math.min(100, (total / freeShippingCents) * 100);
    progressFill.style.width = pct + '%';

    if (total >= freeShippingCents) {
      progressMsg.textContent = "You've unlocked free shipping";
    } else {
      var remaining = freeShippingCents - total;
      progressMsg.textContent = 'Add ' + formatMoney(remaining) + ' more for free shipping';
    }
    progressWrap.hidden = false;
    progressWrap.classList.remove('cart-drawer__progress--hidden');
  }

  function lineItemImageUrl(url) {
    if (!url) return '';
    var u = String(url);
    if (u.indexOf('cdn.shopify.com') !== -1 || u.indexOf('shopifycdn') !== -1) {
      var sep = u.indexOf('?') >= 0 ? '&' : '?';
      return u + sep + 'width=120';
    }
    return u;
  }

  function renderLine(item, index) {
    var line = index + 1;
    var img = item.image
      ? lineItemImageUrl(item.image)
      : 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" fill="#eee"><rect width="120" height="120"/></svg>');
    var variant = item.variant_title && item.variant_title !== 'Default Title' ? item.variant_title : '';
    var compare =
      item.original_line_price && item.original_line_price > item.final_line_price
        ? '<span class="cart-drawer__price-compare">' + formatMoney(item.original_line_price) + '</span>'
        : '';
    return (
      '<div class="cart-drawer__line" data-line-key="' +
      escapeHtml(item.key) +
      '">' +
      '<img class="cart-drawer__line-img" src="' +
      escapeHtml(img) +
      '" alt="" width="72" height="72" loading="lazy">' +
      '<div class="cart-drawer__line-main">' +
      '<div class="cart-drawer__line-top">' +
      '<div>' +
      '<p class="cart-drawer__line-title"><a href="' +
      escapeHtml(item.url) +
      '">' +
      escapeHtml(item.product_title) +
      '</a></p>' +
      (variant ? '<p class="cart-drawer__line-variant">' + escapeHtml(variant) + '</p>' : '') +
      '</div>' +
      '<button type="button" class="cart-drawer__line-remove" data-line-remove="' +
      line +
      '" aria-label="Remove">&times;</button>' +
      '</div>' +
      '<div class="cart-drawer__line-bottom">' +
      '<div class="cart-drawer__qty">' +
      '<button type="button" data-line-qty="' +
      line +
      '" data-qty-delta="-1" aria-label="Decrease quantity">−</button>' +
      '<span>' +
      item.quantity +
      '</span>' +
      '<button type="button" data-line-qty="' +
      line +
      '" data-qty-delta="1" aria-label="Increase quantity">+</button>' +
      '</div>' +
      '<div class="cart-drawer__line-prices">' +
      compare +
      '<span class="cart-drawer__price-current">' +
      formatMoney(item.final_line_price) +
      '</span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function renderCart(cart) {
    updateHeaderCount(cart.item_count);

    if (!cart.items || cart.items.length === 0) {
      itemsEl.innerHTML = '';
      emptyEl.hidden = false;
      subtotalEl.textContent = formatMoney(0);
      if (checkoutBtn) checkoutBtn.disabled = true;
      if (progressWrap) {
        progressWrap.hidden = true;
        progressWrap.classList.add('cart-drawer__progress--hidden');
      }
      return;
    }

    emptyEl.hidden = true;
    subtotalEl.textContent = formatMoney(cart.total_price);
    itemsEl.innerHTML = cart.items.map(renderLine).join('');
    if (checkoutBtn) checkoutBtn.disabled = false;
    renderFreeShipping(cart);
  }

  function fetchCart() {
    return fetch('/cart.js')
      .then(function (r) {
        return r.json();
      })
      .then(function (cart) {
        renderCart(cart);
        return cart;
      });
  }

  function openDrawer() {
    setOpen(true);
    return fetchCart();
  }

  function closeDrawer() {
    setOpen(false);
  }

  function changeLine(line, quantity) {
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line: line, quantity: quantity }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (cart) {
        renderCart(cart);
        return cart;
      });
  }

  function handleAddToCart(form) {
    var fd = new FormData(form);
    return fetch('/cart/add.js', {
      method: 'POST',
      body: fd,
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) {
          var msg = (data && (data.description || data.message)) || 'Could not add to cart';
          throw new Error(msg);
        }
        return data;
      });
    });
  }

  document.addEventListener(
    'submit',
    function (e) {
      var form = e.target;
      if (!form || form.tagName !== 'FORM') return;
      if (form.dataset.cartDrawer === 'false') return;
      var action = (form.getAttribute('action') || '').toLowerCase();
      if (action.indexOf('/cart/add') === -1) return;

      e.preventDefault();
      handleAddToCart(form)
        .then(function () {
          return openDrawer();
        })
        .catch(function (err) {
          alert(err.message || 'Could not add to cart');
        });
    },
    true
  );

  document.querySelectorAll('[data-cart-drawer-open]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      openDrawer();
    });
  });

  root.querySelectorAll('[data-cart-drawer-close]').forEach(function (el) {
    el.addEventListener('click', function () {
      closeDrawer();
    });
  });

  if (backdrop) {
    backdrop.addEventListener('click', closeDrawer);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.classList.contains('is-open')) closeDrawer();
  });

  itemsEl.addEventListener('click', function (e) {
    var removeBtn = e.target.closest('[data-line-remove]');
    if (removeBtn) {
      var line = parseInt(removeBtn.getAttribute('data-line-remove'), 10);
      changeLine(line, 0);
      return;
    }
    var qtyBtn = e.target.closest('[data-line-qty]');
    if (!qtyBtn) return;
    var line = parseInt(qtyBtn.getAttribute('data-line-qty'), 10);
    var delta = parseInt(qtyBtn.getAttribute('data-qty-delta'), 10);
    var row = qtyBtn.closest('.cart-drawer__line');
    if (!row) return;
    var qtySpan = row.querySelector('.cart-drawer__qty span');
    var current = qtySpan ? parseInt(qtySpan.textContent, 10) || 1 : 1;
    var next = Math.max(0, current + delta);
    changeLine(line, next);
  });

  window.CartDrawer = { open: openDrawer, close: closeDrawer, refresh: fetchCart };
})();
