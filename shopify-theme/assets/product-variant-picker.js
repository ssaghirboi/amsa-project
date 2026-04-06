/**
 * Pills + image swatches variant picker. Initializes each [data-ph-picker] root.
 */
(function () {
  function formatMoney(cents, format) {
    var n = Number(cents);
    if (Number.isNaN(n)) return '';
    var amount = (n / 100).toFixed(2);
    if (!format) return '$' + amount;
    return String(format).replace(/\{\{\s*amount[^}]*\}\}/, amount).replace(/\{\{\s*amount\s*\}\}/, amount);
  }

  function getInitialSelections(variant) {
    return {
      option1: variant.option1 != null ? variant.option1 : null,
      option2: variant.option2 != null ? variant.option2 : null,
      option3: variant.option3 != null ? variant.option3 : null,
    };
  }

  function findVariant(product, sel) {
    return product.variants.find(function (v) {
      return v.option1 === sel.option1 && v.option2 === sel.option2 && v.option3 === sel.option3;
    });
  }

  function selectionValue(selections, pos) {
    if (pos === 1) return selections.option1;
    if (pos === 2) return selections.option2;
    return selections.option3;
  }

  function variantImageSrc(variant) {
    var img = variant.featured_image || variant.image;
    if (!img) return null;
    if (typeof img === 'string') return img;
    return img.src || null;
  }

  function updatePickerUI(root, product, selections) {
    var variant = findVariant(product, selections);
    if (!variant) return;

    root.querySelectorAll('.ph-picker__pill, .ph-picker__swatch').forEach(function (el) {
      var pos = parseInt(el.getAttribute('data-option-position'), 10);
      var val = el.getAttribute('data-value');
      var match = selectionValue(selections, pos) === val;
      el.classList.toggle('is-active', match);
      if (el.classList.contains('ph-picker__swatch')) {
        el.setAttribute('aria-pressed', match ? 'true' : 'false');
      }
    });

    var hidden = root.querySelector('[data-variant-id-input]');
    if (hidden) hidden.value = String(variant.id);

    var section = root.closest('.product-highlight');
    if (!section) return;

    var priceEl = section.querySelector('[data-ph-price]');
    var compareEl = section.querySelector('[data-ph-compare-price]');
    var fmt = root.getAttribute('data-money-format') || '${{amount}}';
    if (priceEl) priceEl.textContent = formatMoney(variant.price, fmt);
    if (compareEl) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        compareEl.textContent = formatMoney(variant.compare_at_price, fmt);
        compareEl.hidden = false;
      } else {
        compareEl.textContent = '';
        compareEl.hidden = true;
      }
    }

    var mainImg = section.querySelector('[data-ph-main]');
    var src = variantImageSrc(variant);
    if (mainImg && src) {
      var u = src.split('?')[0];
      mainImg.src = u + (u.indexOf('cdn.shopify') !== -1 ? '?width=1200' : '');
      mainImg.removeAttribute('srcset');
    }

    var addBtn = section.querySelector('.product-highlight__button[type="submit"]');
    if (addBtn) {
      addBtn.disabled = !variant.available;
      var sold = addBtn.getAttribute('data-sold-label') || 'Sold out';
      if (!addBtn.dataset.addLabel) {
        addBtn.dataset.addLabel = addBtn.getAttribute('data-add-label') || addBtn.textContent.trim();
      }
      addBtn.textContent = variant.available ? addBtn.dataset.addLabel : sold;
    }
  }

  function initPicker(root) {
    if (root.dataset.phInitialized === 'true') return;
    root.dataset.phInitialized = 'true';

    var jsonEl = root.querySelector('[data-product-json]');
    if (!jsonEl) return;
    var product;
    try {
      product = JSON.parse(jsonEl.textContent);
    } catch (e) {
      return;
    }

    var hidden = root.querySelector('[data-variant-id-input]');
    if (!hidden) return;
    var currentId = parseInt(hidden.value, 10);
    var current = product.variants.find(function (v) {
      return v.id === currentId;
    });
    if (!current) current = product.selected_or_first_available_variant || product.variants[0];
    if (!current) return;

    var selections = getInitialSelections(current);

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('.ph-picker__pill, .ph-picker__swatch');
      if (!btn || !root.contains(btn)) return;
      var pos = parseInt(btn.getAttribute('data-option-position'), 10);
      var val = btn.getAttribute('data-value');
      if (pos === 1) selections.option1 = val;
      if (pos === 2) selections.option2 = val;
      if (pos === 3) selections.option3 = val;

      if (!findVariant(product, selections)) return;
      updatePickerUI(root, product, selections);
    });
  }

  function run() {
    document.querySelectorAll('[data-ph-picker]').forEach(initPicker);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
