const db = window.supabaseClient;

let products = [];
let parties = [];
let purchases = [];
let sales = [];
let movements = [];
let purchaseItemHistory = [];
let saleItemHistory = [];

let purchaseItems = [];
let saleItems = [];

let editingPurchaseId = null;
let editingSaleId = null;

let productSort = {
  key: 'name',
  direction: 'asc'
};

const invoiceFilters = {
  purchase: {
    query: '',
    dateFrom: '',
    dateTo: '',
    currency: 'all',
    sortKey: 'invoice_date',
    sortDirection: 'desc'
  },
  sale: {
    query: '',
    dateFrom: '',
    dateTo: '',
    currency: 'all',
    sortKey: 'invoice_date',
    sortDirection: 'desc'
  }
};

const $ = id => document.getElementById(id);

const num = v => {
  if (typeof v === 'number') return v;

  let s = String(v ?? '')
    .trim();

  if (s.includes(',') && s.includes('.')) {
    s = s
      .replace(/\./g, '')
      .replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }

  return Number(s || 0);
};

const today = () =>
  new Date().toISOString().slice(0, 10);

const searchable = value =>
  String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');

const esc = v =>
  String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const currencySymbols = {
  TRY: '₺',
  USD: '$',
  EUR: '€'
};

const currencyNames = {
  TRY: 'TL',
  USD: 'USD',
  EUR: 'EUR'
};

function money(v, currency = 'TRY') {
  const symbol =
    currencySymbols[currency] || currency;

  return num(v).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' ' + symbol;
}

function moneyCode(v, currency = 'TRY') {
  return num(v).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' ' +
    (currencyNames[currency] || currency);
}

function setText(id, v) {
  if ($(id)) {
    $(id).textContent = v;
  }
}

function toast(msg) {
  const t = $('toast');

  if (!t) return;

  t.textContent = msg;

  t.classList.add('show');

  setTimeout(() => {
    t.classList.remove('show');
  }, 3000);
}


/* =========================================================
   MENÜ
========================================================= */

function setupNavigation() {

  document.querySelectorAll('.menu').forEach(btn => {

    btn.addEventListener('click', () => {

      const page = btn.dataset.page;

      document
        .querySelectorAll('.menu')
        .forEach(x => x.classList.remove('active'));

      btn.classList.add('active');

      document
        .querySelectorAll('.page')
        .forEach(x => x.classList.add('hidden'));

      $(page)?.classList.remove('hidden');

      const titles = {
        dashboard: 'Ana Sayfa',
        products: 'Ürünler',
        purchase: 'Satın Alma',
        sales: 'Satış',
        parties: 'Cari / Müşteriler',
        documents: 'Faturalar',
        reports: 'Raporlar'
      };

      setText(
        'pageTitle',
        titles[page] || 'Stok Takip'
      );

      if (page === 'dashboard') {
        renderDashboard();
      }

      if (page === 'products') {
        renderProducts();
      }

      if (page === 'purchase') {

        preparePurchasePage();

        closePurchaseInvoiceModal();

        renderPurchaseInvoices();

      }

      if (page === 'sales') {
        prepareSalePage();
        closeSaleInvoiceModal();
        renderSaleInvoices();
      }

      if (page === 'parties') {
        renderParties();
      }

      if (page === 'documents') {
        renderDocuments();
      }

      if (page === 'reports') {
        renderReports();
      }

    });

  });

}


function setDefaultDates() {

  if ($('purchaseDate')) {
    $('purchaseDate').value = today();
  }

  if ($('saleDate')) {
    $('saleDate').value = today();
  }

}


/* =========================================================
   VERİ
========================================================= */

async function loadAll() {

  try {

    const [
      pr,
      pa,
      pu,
      sa,
      mo,
      pi,
      si
    ] = await Promise.all([

      db
        .from('products')
        .select('*')
        .order('name'),

      db
        .from('parties')
        .select('*')
        .order('name'),

      db
        .from('purchases')
        .select('*')
        .order('invoice_date', {
          ascending: false
        }),

      db
        .from('sales')
        .select('*')
        .order('invoice_date', {
          ascending: false
        }),

      db
        .from('stock_movements')
        .select('*')
        .order('created_at', {
          ascending: false
        }),

      db
        .from('purchase_items')
        .select('*'),

      db
        .from('sale_items')
        .select('*')

    ]);

    if (pr.error) throw pr.error;
    if (pa.error) throw pa.error;
    if (pu.error) throw pu.error;
    if (sa.error) throw sa.error;
    if (mo.error) throw mo.error;
    if (pi.error) throw pi.error;
    if (si.error) throw si.error;

    products = pr.data || [];
    parties = pa.data || [];
    purchases = pu.data || [];
    sales = sa.data || [];
    movements = mo.data || [];
    purchaseItemHistory = pi.data || [];
    saleItemHistory = si.data || [];

    renderDashboard();
    renderProducts();
    renderParties();
    renderMovements();
    renderDocuments();
    renderReports();
    renderPurchaseInvoices();
    renderSaleInvoices();

    preparePurchasePage();
    prepareSalePage();

  } catch (e) {

    console.error(e);

    toast(
      'Veriler yüklenemedi: ' +
      e.message
    );

  }

}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

  const totalSales =
    sales.reduce(
      (s, x) =>
        s + num(
          x.total_try ?? x.total
        ),
      0
    );

  const totalPurchases =
    purchases.reduce(
      (s, x) =>
        s + num(
          x.total_try ?? x.total
        ),
      0
    );

  setText(
    'totalProducts',
    products.length
  );

  setText(
    'totalStock',
    products.reduce(
      (s, p) =>
        s + num(p.stock_quantity),
      0
    )
  );

  setText(
    'criticalProducts',
    products.filter(
      p =>
        num(p.stock_quantity) <=
        num(p.critical_stock)
    ).length
  );

  setText(
    'totalParties',
    parties.length
  );

  setText(
    'totalSales',
    money(totalSales, 'TRY')
  );

  setText(
    'totalPurchases',
    money(totalPurchases, 'TRY')
  );

  setText(
    'grossProfit',
    money(
      totalSales - totalPurchases,
      'TRY'
    )
  );

  setText(
    'todaySales',
    money(
      sales
        .filter(
          x => x.invoice_date === today()
        )
        .reduce(
          (s, x) =>
            s + num(
              x.total_try ?? x.total
            ),
          0
        ),
      'TRY'
    )
  );

  const c =
    $('criticalProductsTable');

  if (!c) return;

  const critical =
    products.filter(
      p =>
        num(p.stock_quantity) <=
        num(p.critical_stock)
    );

  c.innerHTML =
    !critical.length

      ? '<div class="empty">Kritik stok bulunmuyor.</div>'

      : `
        <table>

          <thead>
            <tr>
              <th>Kod</th>
              <th>Ürün</th>
              <th>Mevcut</th>
              <th>Kritik Seviye</th>
            </tr>
          </thead>

          <tbody>

            ${critical.map(p => `

              <tr>

                <td>
                  ${esc(p.code)}
                </td>

                <td>
                  ${esc(p.name)}
                </td>

                <td class="text-danger">
                  ${num(p.stock_quantity)}
                </td>

                <td>
                  ${num(p.critical_stock)}
                </td>

              </tr>

            `).join('')}

          </tbody>

        </table>
      `;

}


/* =========================================================
   ÜRÜNLER
========================================================= */

function buildAveragePriceMap(
  items,
  invoices,
  foreignKey
) {

  const totals = new Map();

  items.forEach(item => {

    const invoice = invoices.find(
      x => String(x.id) ===
        String(item[foreignKey])
    );

    if (!invoice) return;

    const quantity =
      num(item.quantity);

    const rate =
      invoiceDisplay(invoice).rate;

    const current = totals.get(
      String(item.product_id)
    ) || {
      quantity: 0,
      valueTry: 0
    };

    current.quantity += quantity;
    current.valueTry +=
      quantity *
      num(item.unit_price) *
      rate;

    totals.set(
      String(item.product_id),
      current
    );

  });

  const averages = new Map();

  totals.forEach((value, key) => {
    averages.set(
      key,
      value.quantity > 0
        ? value.valueTry /
          value.quantity
        : 0
    );
  });

  return averages;

}


function productSortArrow(key) {

  if (productSort.key !== key) {
    return '↕';
  }

  return productSort.direction === 'asc'
    ? '↑'
    : '↓';

}


function setProductSort(key) {

  if (productSort.key === key) {
    productSort.direction =
      productSort.direction === 'asc'
        ? 'desc'
        : 'asc';
  } else {
    productSort.key = key;
    productSort.direction = 'asc';
  }

  renderProducts();

}


function clearProductFilters() {

  if ($('productSearch')) {
    $('productSearch').value = '';
  }

  if ($('productStatusFilter')) {
    $('productStatusFilter').value = 'all';
  }

  if ($('productMinStock')) {
    $('productMinStock').value = '';
  }

  if ($('productMaxStock')) {
    $('productMaxStock').value = '';
  }

  productSort = {
    key: 'name',
    direction: 'asc'
  };

  renderProducts();

}

function renderProducts() {

  const c =
    $('productsTable');

  if (!c) return;

  const q =
    searchable(
      $('productSearch')?.value || ''
    );

  const status =
    $('productStatusFilter')?.value ||
    'all';

  const minStockText =
    $('productMinStock')?.value ?? '';

  const maxStockText =
    $('productMaxStock')?.value ?? '';

  const minStock =
    minStockText === ''
      ? null
      : num(minStockText);

  const maxStock =
    maxStockText === ''
      ? null
      : num(maxStockText);

  const purchaseAverages =
    buildAveragePriceMap(
      purchaseItemHistory,
      purchases,
      'purchase_id'
    );

  const saleAverages =
    buildAveragePriceMap(
      saleItemHistory,
      sales,
      'sale_id'
    );

  const list =
    products.filter(
      p => {

        const matchesSearch =
          searchable(p.code).includes(q) ||
          searchable(p.name).includes(q);

        const critical =
          num(p.stock_quantity) <=
          num(p.critical_stock);

        const matchesStatus =
          status === 'all' ||
          (status === 'critical' && critical) ||
          (status === 'normal' && !critical);

        const stock =
          num(p.stock_quantity);

        const matchesMin =
          minStock === null ||
          stock >= minStock;

        const matchesMax =
          maxStock === null ||
          stock <= maxStock;

        return matchesSearch &&
          matchesStatus &&
          matchesMin &&
          matchesMax;

      }
    )
    .sort((a, b) => {

      const values = product => ({
        code: searchable(product.code),
        name: searchable(product.name),
        stock: num(product.stock_quantity),
        critical: num(product.critical_stock),
        purchase: purchaseAverages.get(String(product.id)) || 0,
        sale: saleAverages.get(String(product.id)) || 0,
        status:
          num(product.stock_quantity) <=
          num(product.critical_stock)
            ? 0
            : 1
      });

      const av = values(a)[productSort.key];
      const bv = values(b)[productSort.key];

      const result =
        typeof av === 'string'
          ? av.localeCompare(
              bv,
              'tr-TR',
              { numeric: true }
            )
          : av - bv;

      return productSort.direction === 'asc'
        ? result
        : -result;

    });

  if (!list.length) {

    c.innerHTML =
      '<div class="empty">Ürün bulunamadı.</div>';

    return;
  }

  c.innerHTML = `

    <table>

      <thead>

        <tr>
          <th><button class="sort-button" onclick="setProductSort('code')">Kod ${productSortArrow('code')}</button></th>
          <th><button class="sort-button" onclick="setProductSort('name')">Ürün ${productSortArrow('name')}</button></th>
          <th><button class="sort-button" onclick="setProductSort('stock')">Stok ${productSortArrow('stock')}</button></th>
          <th><button class="sort-button" onclick="setProductSort('critical')">Kritik ${productSortArrow('critical')}</button></th>
          <th><button class="sort-button" onclick="setProductSort('purchase')">Ort. Alış ${productSortArrow('purchase')}</button></th>
          <th><button class="sort-button" onclick="setProductSort('sale')">Ort. Satış ${productSortArrow('sale')}</button></th>
          <th><button class="sort-button" onclick="setProductSort('status')">Durum ${productSortArrow('status')}</button></th>
          <th>İşlem</th>
        </tr>

      </thead>

      <tbody>

        ${list.map(p => {

          const critical =
            num(p.stock_quantity) <=
            num(p.critical_stock);

          return `

            <tr>

              <td>
                ${esc(p.code)}
              </td>

              <td>
                ${esc(p.name)}
              </td>

              <td>
                ${num(p.stock_quantity)}
              </td>

              <td>
                ${num(p.critical_stock)}
              </td>

              <td>
                ${money(
                  purchaseAverages.get(
                    String(p.id)
                  ) || 0
                )}
              </td>

              <td>
                ${money(
                  saleAverages.get(
                    String(p.id)
                  ) || 0
                )}
              </td>

              <td>

                <span
                  class="badge ${
                    critical
                      ? 'badge-critical'
                      : 'badge-normal'
                  }"
                >
                  ${
                    critical
                      ? 'Kritik'
                      : 'Normal'
                  }
                </span>

              </td>

              <td>

                <button
                  class="secondary"
                  onclick="editProduct('${p.id}')"
                >
                  Düzenle
                </button>

                <button
                  class="danger"
                  onclick="deleteProduct('${p.id}')"
                >
                  Sil
                </button>

                <button
                  class="movement-button"
                  onclick="openProductMovements('${p.id}')"
                >
                  Hareketler
                </button>

              </td>

            </tr>

          `;

        }).join('')}

      </tbody>

    </table>

  `;

}


function openProductForm(id = null) {

  const p =
    products.find(
      x => String(x.id) ===
        String(id)
    );

  if (id && !p) {
    toast(
      'Düzenlenecek ürün bulunamadı. Sayfayı yenileyip tekrar deneyin.'
    );
    return;
  }

  openModal(

    id
      ? 'Ürün Düzenle'
      : 'Yeni Ürün',

    `

      <div class="form-grid">

        <div class="form-group">

          <label>
            Ürün Kodu
          </label>

          <input
            id="formProductCode"
            value="${esc(p?.code || '')}"
          >

        </div>

        <div class="form-group">

          <label>
            Ürün Adı
          </label>

          <input
            id="formProductName"
            value="${esc(p?.name || '')}"
          >

        </div>

        <div class="form-group">

          <label>
            Mevcut Stok
          </label>

          <input
            id="formProductStock"
            type="number"
            step="0.01"
            min="0"
            ${id ? 'readonly' : ''}
            value="${num(p?.stock_quantity)}"
          >

          ${id ? `
            <small class="field-help">
              Stok miktarı satın alma ve satış faturalarından güncellenir.
            </small>
          ` : ''}

        </div>

        <div class="form-group">

          <label>
            Kritik Stok
          </label>

          <input
            id="formProductCritical"
            type="number"
            step="0.01"
            value="${num(p?.critical_stock ?? 5)}"
          >

        </div>

        <div class="form-group">

          <label>
            Alış Fiyatı
          </label>

          <div class="price-currency-field">
            <input
              id="formProductPurchase"
              type="number"
              step="0.01"
              value="${num(p?.purchase_price)}"
            >

            <select id="formProductPurchaseCurrency">
              <option value="TRY" ${(p?.purchase_currency || 'TRY') === 'TRY' ? 'selected' : ''}>TL</option>
              <option value="USD" ${p?.purchase_currency === 'USD' ? 'selected' : ''}>USD</option>
              <option value="EUR" ${p?.purchase_currency === 'EUR' ? 'selected' : ''}>EUR</option>
            </select>
          </div>

        </div>

        <div class="form-group">

          <label>
            Satış Fiyatı
          </label>

          <div class="price-currency-field">
            <input
              id="formProductSale"
              type="number"
              step="0.01"
              value="${num(p?.sale_price)}"
            >

            <select id="formProductSaleCurrency">
              <option value="TRY" ${(p?.sale_currency || 'TRY') === 'TRY' ? 'selected' : ''}>TL</option>
              <option value="USD" ${p?.sale_currency === 'USD' ? 'selected' : ''}>USD</option>
              <option value="EUR" ${p?.sale_currency === 'EUR' ? 'selected' : ''}>EUR</option>
            </select>
          </div>

        </div>

      </div>

      <div class="form-buttons">

        <button
          class="secondary"
          onclick="closeModal()"
        >
          Vazgeç
        </button>

        <button
          class="success"
          onclick="saveProduct('${id || ''}')"
        >
          Kaydet
        </button>

      </div>

    `
  );

}


function editProduct(id) {

  openProductForm(id);

}


async function openProductMovements(id) {

  const product =
    products.find(
      p => String(p.id) === String(id)
    );

  if (!product) {
    toast('Ürün bulunamadı.');
    return;
  }

  let list = [];

  try {

    const result = await db
      .from('stock_movements')
      .select('*')
      .eq('product_id', id)
      .order('created_at', {
        ascending: false
      });

    if (result.error) {
      throw result.error;
    }

    list = result.data || [];

  } catch (error) {
    console.error(error);
    toast(
      'Stok hareketleri alınamadı: ' +
      error.message
    );
    return;
  }

  const rows = list.map(m => {

    const document =
      m.source_type === 'purchase'
        ? purchases.find(
            x => String(x.id) ===
              String(m.source_id)
          )
        : m.source_type === 'sale'
          ? sales.find(
              x => String(x.id) ===
                String(m.source_id)
            )
          : null;

    const party = parties.find(
      x => String(x.id) ===
        String(
          m.party_id ||
          document?.party_id
        )
    );

    const documentType =
      m.source_type === 'purchase'
        ? 'Satın Alma'
        : m.source_type === 'sale'
          ? 'Satış'
          : 'Başlangıç';

    const date = document?.invoice_date || m.created_at;

    const description =
      m.source_type === 'purchase'
        ? `${party?.name || 'Tedarikçi belirtilmedi'} firmasından satın alma`
        : m.source_type === 'sale'
          ? `${party?.name || 'Müşteri belirtilmedi'} firmasına satış`
          : (m.note || 'Başlangıç stoğu');

    return `
      <tr>
        <td>${date ? new Date(date).toLocaleDateString('tr-TR') : '-'}</td>
        <td>
          <span class="badge ${m.type === 'in' ? 'badge-in' : 'badge-out'}">
            ${m.type === 'in' ? 'Giriş' : 'Çıkış'}
          </span>
        </td>
        <td>${num(m.quantity)}</td>
        <td>${esc(documentType)}</td>
        <td>${esc(document?.invoice_no || '-')}</td>
        <td>${esc(party?.name || '-')}</td>
        <td>${esc(description)}</td>
      </tr>
    `;

  }).join('');

  openModal(
    `${product.code} - ${product.name} Hareketleri`,
    `
      <div class="movement-summary">
        <span>Mevcut Stok</span>
        <strong>${num(product.stock_quantity)}</strong>
      </div>

      <div class="table-scroll">
        ${list.length ? `
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Hareket</th>
                <th>Miktar</th>
                <th>Kaynak</th>
                <th>Fatura No</th>
                <th>Cari</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        ` : '<div class="empty">Bu ürüne ait stok hareketi bulunamadı.</div>'}
      </div>

      <div class="form-buttons">
        <button class="secondary" onclick="closeModal()">Kapat</button>
      </div>
    `
  );

}


async function saveProduct(id) {

  const data = {

    code:
      $('formProductCode')
        .value
        .trim(),

    name:
      $('formProductName')
        .value
        .trim(),

    critical_stock:
      num(
        $('formProductCritical').value
      ),

    purchase_price:
      num(
        $('formProductPurchase').value
      ),

    purchase_currency:
      $('formProductPurchaseCurrency')
        .value,

    sale_price:
      num(
        $('formProductSale').value
      ),

    sale_currency:
      $('formProductSaleCurrency')
        .value

  };

  if (!id) {
    data.stock_quantity = num(
      $('formProductStock').value
    );
  }

  if (!data.code || !data.name) {

    toast(
      'Ürün kodu ve adı zorunludur.'
    );

    return;
  }

  try {

    const r = id

      ? await db
          .from('products')
          .update(data)
          .eq('id', id)

      : await db
          .from('products')
          .insert(data);

    if (r.error) throw r.error;

    closeModal();

    toast(
      'Ürün kaydedildi.'
    );

    await loadAll();

  } catch (e) {

    console.error(e);

    toast(
      'Ürün kaydedilemedi: ' +
      e.message
    );

  }

}


async function deleteProduct(id) {

  if (
    !confirm(
      'Bu ürünü silmek istediğinize emin misiniz?'
    )
  ) return;

  try {

    const r =
      await db
        .from('products')
        .delete()
        .eq('id', id);

    if (r.error) throw r.error;

    toast(
      'Ürün silindi.'
    );

    await loadAll();

  } catch (e) {

    toast(
      'Ürün silinemedi. Hareket kaydı varsa silinemez.'
    );

  }

}


/* =========================================================
   CARİ
========================================================= */

function partyType(t) {

  return t === 'supplier'
    ? 'Tedarikçi'
    : t === 'both'
      ? 'Müşteri + Tedarikçi'
      : 'Müşteri';

}


function renderParties() {

  const c =
    $('partiesTable');

  if (!c) return;

  if (!parties.length) {

    c.innerHTML =
      '<div class="empty">Henüz cari kaydı yok.</div>';

    return;
  }

  c.innerHTML = `

    <table>

      <thead>

        <tr>
          <th>Unvan</th>
          <th>Tür</th>
          <th>Telefon</th>
          <th>E-posta</th>
          <th>Vergi No</th>
          <th>İşlem</th>
        </tr>

      </thead>

      <tbody>

        ${parties.map(p => `

          <tr>

            <td>
              ${esc(p.name)}
            </td>

            <td>
              ${partyType(p.type)}
            </td>

            <td>
              ${esc(p.phone || '-')}
            </td>

            <td>
              ${esc(p.email || '-')}
            </td>

            <td>
              ${esc(p.tax_number || '-')}
            </td>

            <td>

              <button
                class="secondary"
                onclick="editParty('${p.id}')"
              >
                Düzenle
              </button>

              <button
                class="danger"
                onclick="deleteParty('${p.id}')"
              >
                Sil
              </button>

            </td>

          </tr>

        `).join('')}

      </tbody>

    </table>

  `;

}


function openPartyForm(id = null) {

  const p =
    parties.find(
      x => x.id === id
    );

  openModal(

    id
      ? 'Cari Düzenle'
      : 'Yeni Cari',

    `

      <div class="form-group">

        <label>
          Unvan / Ad Soyad
        </label>

        <input
          id="formPartyName"
          value="${esc(p?.name || '')}"
        >

      </div>

      <div class="form-grid">

        <div class="form-group">

          <label>
            Cari Tipi
          </label>

          <select id="formPartyType">

            <option
              value="customer"
              ${
                p?.type === 'customer'
                  ? 'selected'
                  : ''
              }
            >
              Müşteri
            </option>

            <option
              value="supplier"
              ${
                p?.type === 'supplier'
                  ? 'selected'
                  : ''
              }
            >
              Tedarikçi
            </option>

            <option
              value="both"
              ${
                p?.type === 'both'
                  ? 'selected'
                  : ''
              }
            >
              Müşteri + Tedarikçi
            </option>

          </select>

        </div>

        <div class="form-group">

          <label>
            Telefon
          </label>

          <input
            id="formPartyPhone"
            value="${esc(p?.phone || '')}"
          >

        </div>

        <div class="form-group">

          <label>
            E-posta
          </label>

          <input
            id="formPartyEmail"
            value="${esc(p?.email || '')}"
          >

        </div>

        <div class="form-group">

          <label>
            Vergi No
          </label>

          <input
            id="formPartyTax"
            value="${esc(p?.tax_number || '')}"
          >

        </div>

        <div class="form-group full">

          <label>
            Adres
          </label>

          <textarea id="formPartyAddress">${esc(
            p?.address || ''
          )}</textarea>

        </div>

      </div>

      <div class="form-buttons">

        <button
          class="secondary"
          onclick="closeModal()"
        >
          Vazgeç
        </button>

        <button
          class="success"
          onclick="saveParty('${id || ''}')"
        >
          Kaydet
        </button>

      </div>

    `
  );

}


function editParty(id) {

  openPartyForm(id);

}


async function saveParty(id) {

  const data = {

    name:
      $('formPartyName')
        .value
        .trim(),

    type:
      $('formPartyType')
        .value,

    phone:
      $('formPartyPhone')
        .value
        .trim(),

    email:
      $('formPartyEmail')
        .value
        .trim(),

    tax_number:
      $('formPartyTax')
        .value
        .trim(),

    address:
      $('formPartyAddress')
        .value
        .trim()

  };

  if (!data.name) {

    toast(
      'Unvan / Ad Soyad zorunludur.'
    );

    return;
  }

  try {

    const r = id

      ? await db
          .from('parties')
          .update(data)
          .eq('id', id)

      : await db
          .from('parties')
          .insert(data);

    if (r.error) throw r.error;

    closeModal();

    toast(
      'Cari kaydedildi.'
    );

    await loadAll();

  } catch (e) {

    toast(
      'Cari kaydedilemedi: ' +
      e.message
    );

  }

}


async function deleteParty(id) {

  if (
    !confirm(
      'Bu cariyi silmek istediğinize emin misiniz?'
    )
  ) return;

  try {

    const r =
      await db
        .from('parties')
        .delete()
        .eq('id', id);

    if (r.error) throw r.error;

    toast(
      'Cari silindi.'
    );

    await loadAll();

  } catch (e) {

    toast(
      'Bu cari kullanıldığı için silinemiyor.'
    );

  }

}


/* =========================================================
   MODAL
========================================================= */

function openModal(title, content) {

  if (
    !$('modal') ||
    !$('modalTitle') ||
    !$('modalForm')
  ) return;

  $('modalTitle').textContent =
    title;

  $('modalForm').innerHTML =
    content;

  $('modal').classList.remove(
    'invoice-modal-open'
  );

  $('modal').classList.remove(
    'hidden'
  );

}


function closeModal() {

  if (
    $('purchaseFormArea')?.closest(
      '#modalForm'
    )
  ) {
    closePurchaseInvoiceModal();
    return;
  }

  if (
    $('saleFormArea')?.closest(
      '#modalForm'
    )
  ) {
    closeSaleInvoiceModal();
    return;
  }

  $('modal')?.classList.add(
    'hidden'
  );

  $('modal')?.classList.remove(
    'invoice-modal-open'
  );

}


/* =========================================================
   SEÇİMLER / DÖVİZ
========================================================= */

function fillProductSelect(id) {

  const s = $(id);

  if (!s) return;

  s.innerHTML =
    '<option value="">Ürün seçin...</option>' +

    products.map(p => `

      <option value="${p.id}">
        ${esc(p.code)} - ${esc(p.name)}
      </option>

    `).join('');

}


function fillPartySelect(id, types) {

  const s = $(id);

  if (!s) return;

  s.innerHTML =
    '<option value="">Cari seçin...</option>' +

    parties
      .filter(
        p => types.includes(p.type)
      )
      .map(
        p => `

          <option value="${p.id}">
            ${esc(p.name)}
          </option>

        `
      )
      .join('');

}


function getCurrency(type) {

  return (
    $(
      type === 'purchase'
        ? 'purchaseCurrency'
        : 'saleCurrency'
    )?.value ||
    'TRY'
  ).toUpperCase();

}


function getExchangeRate(type) {

  return Math.max(

    num(

      $(
        type === 'purchase'
          ? 'purchaseExchangeRate'
          : 'saleExchangeRate'
      )?.value

    ),

    0

  );

}


function ensureCurrencyUI(type) {

  const prefix =
    type === 'purchase'
      ? 'purchase'
      : 'sale';

  const productId =
    prefix + 'Product';

  if ($(prefix + 'Currency')) {
    return;
  }

  const product =
    $(productId);

  if (!product) return;

  const box =
    document.createElement('div');

  box.className =
    'invoice-currency-box';

  box.id =
    prefix + 'CurrencyBox';

  box.style.cssText =
    'display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:15px;background:#f9fafb;border-radius:8px;margin:0 0 15px;';

  box.innerHTML = `

    <div
      class="form-group"
      style="margin:0"
    >

      <label>
        Para Birimi
      </label>

      <select
        id="${prefix}Currency"
        onchange="currencyChanged('${type}')"
      >

        <option value="TRY">
          TL
        </option>

        <option value="USD">
          USD
        </option>

        <option value="EUR">
          EUR
        </option>

      </select>

    </div>

    <div
      class="form-group"
      id="${prefix}ExchangeRateWrap"
      style="margin:0;display:none"
    >

      <label>
        Fatura Kuru (1 USD = ? TL)
      </label>

      <input
        id="${prefix}ExchangeRate"
        type="number"
        min="0.000001"
        step="0.000001"
        placeholder="Örn. 47,72"
        oninput="${type}Totals()"
      >

    </div>

  `;

  const addBox =
    product.closest('.invoice-add');

  if (addBox) {

    addBox.parentNode.insertBefore(
      box,
      addBox
    );

  } else {

    product.parentNode.parentNode.insertBefore(
      box,
      product.parentNode
    );

  }

  currencyChanged(type);

}


function ensureCurrencySummary(type) {

  const prefix =
    type === 'purchase'
      ? 'purchase'
      : 'sale';

  if ($(prefix + 'TlSummary')) {
    return;
  }

  const anchor =
    $(prefix + 'GrandTotal');

  if (!anchor) return;

  const parent =
    anchor.closest('div');

  if (!parent) return;

  const wrap =
    document.createElement('div');

  wrap.id =
    prefix + 'TlSummary';

  wrap.style.cssText =
    'display:none;margin-top:12px;text-align:right;padding-top:12px;border-top:1px dashed #d1d5db;';

  wrap.innerHTML = `

    <span
      style="
        display:block;
        color:#6b7280;
        font-size:13px;
        margin-bottom:4px;
      "
    >
      TL Karşılığı
    </span>

    <strong
      id="${prefix}GrandTotalTry"
      style="font-size:18px;"
    ></strong>

  `;

  parent.parentNode.appendChild(
    wrap
  );

}


function currencyChanged(type) {

  const prefix =
    type === 'purchase'
      ? 'purchase'
      : 'sale';

  const currency =
    getCurrency(type);

  const wrap =
    $(prefix + 'ExchangeRateWrap');

  const rate =
    $(prefix + 'ExchangeRate');

  const rateLabel =
    $(prefix + 'ExchangeRateLabel');

  const priceInput =
    $(prefix + 'Price');

  const info =
    $(prefix + 'CurrencyInfo');

  if (currency === 'TRY') {

    if (wrap) {
      wrap.style.display = 'none';
    }

    if (rate) {
      rate.value = '';
    }

    if (priceInput) {
      priceInput.placeholder =
        'Birim fiyat (TL)';
    }

    if (info) {
      info.style.display = 'none';
    }

  } else {

    if (wrap) {
      wrap.style.display = 'block';
    }

    if (rateLabel) {
      rateLabel.textContent =
        `1 ${currency} Kaç TL?`;
    }

    if (priceInput) {
      priceInput.placeholder =
        `Birim fiyat (${currency})`;
    }

    if (info) {
      info.style.display = 'block';
      info.textContent =
        `Birim fiyatları ${currency} olarak girin. TL karşılığı yazdığınız kur üzerinden otomatik hesaplanır.`;
    }

  }

  ensureCurrencySummary(type);

  if (type === 'purchase') {
    renderPurchaseItems();
  } else {
    renderSaleItems();
  }

}


function preparePurchasePage() {

  ensureCurrencyUI(
    'purchase'
  );

  ensureCurrencySummary(
    'purchase'
  );

  fillPartySelect(
    'purchaseParty',
    [
      'supplier',
      'both'
    ]
  );

  fillProductSelect(
    'purchaseProduct'
  );

  currencyChanged(
    'purchase'
  );

}


function prepareSalePage() {

  ensureCurrencyUI(
    'sale'
  );

  ensureCurrencySummary(
    'sale'
  );

  fillPartySelect(
    'saleParty',
    [
      'customer',
      'both'
    ]
  );

  fillProductSelect(
    'saleProduct'
  );

  currencyChanged(
    'sale'
  );

}


/* =========================================================
   ALIŞ
========================================================= */

function addPurchaseItem() {

  const pid =
    $('purchaseProduct')?.value;

  const q =
    num(
      $('purchaseQty')?.value
    );

  const price =
    num(
      $('purchasePrice')?.value
    );

  const vat =
    num(
      $('purchaseVat')?.value
    );

  if (!pid || q <= 0) {

    toast(
      'Ürün ve miktar seçmelisiniz.'
    );

    return;
  }

  if (price < 0 || isNaN(price)) {

    toast(
      'Birim fiyatı kontrol edin.'
    );

    return;
  }

  const p =
    products.find(
      x =>
        String(x.id) ===
        String(pid)
    );

  if (!p) {

    toast(
      'Seçilen ürün bulunamadı.'
    );

    return;
  }

  purchaseItems.push({

    product_id:
      p.id,

    product_name:
      p.name,

    code:
      p.code,

    quantity:
      q,

    unit_price:
      price,

    vat_rate:
      vat

  });

  $('purchaseQty').value = '';

  $('purchasePrice').value = '';

  renderPurchaseItems();

  toast(
    'Ürün faturaya eklendi.'
  );

}


function calculatePurchaseTotals() {

  let subtotal = 0;
  let vatTotal = 0;

  purchaseItems.forEach(i => {

    const l =
      i.quantity *
      i.unit_price;

    subtotal += l;

    vatTotal +=
      l *
      i.vat_rate /
      100;

  });

  const total =
    subtotal +
    vatTotal;

  const currency =
    getCurrency('purchase');

  const rate =
    currency === 'TRY'
      ? 1
      : getExchangeRate('purchase');

  setText(
    'purchaseSubtotal',
    money(
      subtotal,
      currency
    )
  );

  setText(
    'purchaseVatTotal',
    money(
      vatTotal,
      currency
    )
  );

  setText(
    'purchaseGrandTotal',
    money(
      total,
      currency
    )
  );

  ensureCurrencySummary(
    'purchase'
  );

  const summary =
    $('purchaseTlSummary');

  if (summary) {

    summary.style.display =
      currency === 'TRY'
        ? 'none'
        : 'block';

    setText(
      'purchaseSubtotalTry',
      money(
        subtotal * rate,
        'TRY'
      )
    );

    setText(
      'purchaseVatTotalTry',
      money(
        vatTotal * rate,
        'TRY'
      )
    );

    setText(
      'purchaseGrandTotalTry',
      money(
        total * rate,
        'TRY'
      )
    );

  }

  return {

    subtotal,
    vatTotal,
    total,

    currency,

    exchangeRate:
      rate,

    subtotalTry:
      subtotal * rate,

    vatAmountTry:
      vatTotal * rate,

    totalTry:
      total * rate

  };

}


function renderPurchaseItems() {

  const c =
    $('purchaseItems');

  if (!c) return;

  const currency =
    getCurrency('purchase');

  if (!purchaseItems.length) {

    c.innerHTML =
      '<div class="empty">Faturaya henüz ürün eklenmedi.</div>';

    calculatePurchaseTotals();

    return;
  }

  c.innerHTML = `

    <table class="invoice-items-table">

      <thead>

        <tr>
          <th>#</th>
          <th>Ürün</th>
          <th>Miktar</th>
          <th>Birim Fiyat</th>
          <th>KDV</th>
          <th>Matrah</th>
          <th>KDV Tutarı</th>
          <th>Toplam</th>
          <th></th>
        </tr>

      </thead>

      <tbody>

        ${purchaseItems.map((i, n) => {

          const sub =
            i.quantity *
            i.unit_price;

          const vat =
            sub *
            i.vat_rate /
            100;

          return `

            <tr>

              <td>
                ${n + 1}
              </td>

              <td>
                ${esc(i.code)}
                -
                ${esc(i.product_name)}
              </td>

              <td>
                ${i.quantity}
              </td>

              <td>
                ${money(
                  i.unit_price,
                  currency
                )}
              </td>

              <td>
                %${i.vat_rate}
              </td>

              <td>
                ${money(
                  sub,
                  currency
                )}
              </td>

              <td>
                ${money(
                  vat,
                  currency
                )}
              </td>

              <td>
                ${money(
                  sub + vat,
                  currency
                )}
              </td>

              <td>

                <button
                  class="item-remove"
                  onclick="removePurchaseItem(${n})"
                >
                  ✕
                </button>

              </td>

            </tr>

          `;

        }).join('')}

      </tbody>

    </table>

  `;

  calculatePurchaseTotals();

}


function removePurchaseItem(i) {

  purchaseItems.splice(
    i,
    1
  );

  renderPurchaseItems();

}


async function savePurchase() {

  if (!purchaseItems.length) {

    toast(
      'Faturaya en az bir ürün ekleyin.'
    );

    return;
  }

  const partyId =
    $('purchaseParty')
      .value || null;

  const invoiceNo =
    $('purchaseInvoiceNo')
      .value
      .trim();

  const invoiceDate =
    $('purchaseDate')
      .value ||
    today();

  const note =
    $('purchaseNote')
      .value
      .trim();

  const totals =
    calculatePurchaseTotals();

  if (
    totals.currency !== 'TRY' &&
    totals.exchangeRate <= 0
  ) {

    toast(
      'USD/EUR faturası için fatura kurunu girin.'
    );

    return;
  }

  if (editingPurchaseId) {

    await updatePurchaseInvoice(
      editingPurchaseId,
      {
        partyId,
        invoiceNo,
        invoiceDate,
        note,
        totals
      }
    );

    return;
  }

  try {

    const r =
      await db
        .from('purchases')
        .insert({

          invoice_no:
            invoiceNo,

          party_id:
            partyId,

          invoice_date:
            invoiceDate,

          subtotal:
            totals.subtotal,

          vat_rate:
            0,

          vat_amount:
            totals.vatTotal,

          total:
            totals.total,

          note,

          currency:
            totals.currency,

          exchange_rate:
            totals.exchangeRate,

          subtotal_try:
            totals.subtotalTry,

          vat_amount_try:
            totals.vatAmountTry,

          total_try:
            totals.totalTry

        })
        .select()
        .single();

    if (r.error) {
      throw r.error;
    }

    const id =
      r.data.id;

    const items =
      purchaseItems.map(i => {

        const sub =
          i.quantity *
          i.unit_price;

        const vat =
          sub *
          i.vat_rate /
          100;

        return {

          purchase_id:
            id,

          product_id:
            i.product_id,

          quantity:
            i.quantity,

          unit_price:
            i.unit_price,

          vat_rate:
            i.vat_rate,

          line_subtotal:
            sub,

          vat_amount:
            vat,

          line_total:
            sub + vat

        };

      });

    const ir =
      await db
        .from('purchase_items')
        .insert(items);

    if (ir.error) {
      throw ir.error;
    }

    for (const i of purchaseItems) {

      const p =
        products.find(
          x =>
            x.id ===
            i.product_id
        );

      if (!p) continue;

      const ur =
        await db
          .from('products')
          .update({

            stock_quantity:
              num(
                p.stock_quantity
              ) +
              i.quantity

          })
          .eq(
            'id',
            i.product_id
          );

      if (ur.error) {
        throw ur.error;
      }

      const mr =
        await db
          .from('stock_movements')
          .insert({

            product_id:
              i.product_id,

            party_id:
              partyId,

            type:
              'in',

            quantity:
              i.quantity,

            source_type:
              'purchase',

            source_id:
              id,

            note:
              `${parties.find(x => x.id === partyId)?.name || 'Tedarikçi belirtilmedi'} firmasından satın alma${invoiceNo ? ` - Fatura: ${invoiceNo}` : ''}`

          });

      if (mr.error) {
        throw mr.error;
      }

    }

    toast(
      'Alış faturası başarıyla kaydedildi.'
    );

    clearPurchase();

    await loadAll();

  } catch (e) {

    console.error(e);

    toast(
      'Alış faturası kaydedilemedi: ' +
      e.message
    );

  }

}


function clearPurchaseFields() {

  if ($('purchaseInvoiceNo')) {
    $('purchaseInvoiceNo').value = '';
  }

  if ($('purchaseDate')) {
    $('purchaseDate').value = today();
  }

  if ($('purchaseParty')) {
    $('purchaseParty').value = '';
  }

  if ($('purchaseNote')) {
    $('purchaseNote').value = '';
  }

  if ($('purchaseCurrency')) {
    $('purchaseCurrency').value = 'TRY';
  }

  if ($('purchaseExchangeRate')) {
    $('purchaseExchangeRate').value = '';
  }

}


function clearPurchase() {

  purchaseItems = [];

  clearPurchaseFields();

  renderPurchaseItems();

  closePurchaseInvoiceModal();

}


/* =========================================================
   SATIŞ
========================================================= */

function addSaleItem() {

  const pid =
    $('saleProduct')?.value;

  const q =
    num(
      $('saleQty')?.value
    );

  const price =
    num(
      $('salePrice')?.value
    );

  const vat =
    num(
      $('saleVat')?.value
    );

  if (!pid || q <= 0) {

    toast(
      'Ürün ve miktar seçmelisiniz.'
    );

    return;
  }

  const p =
    products.find(
      x =>
        String(x.id) ===
        String(pid)
    );

  if (!p) {

    toast(
      'Seçilen ürün bulunamadı.'
    );

    return;
  }

  const already =
    saleItems
      .filter(
        x =>
          String(x.product_id) ===
          String(pid)
      )
      .reduce(
        (s, x) =>
          s + x.quantity,
        0
      );

  if (
    already + q >
    num(p.stock_quantity)
  ) {

    toast(
      `Yetersiz stok! Mevcut stok: ${p.stock_quantity}`
    );

    return;
  }

  saleItems.push({

    product_id:
      p.id,

    product_name:
      p.name,

    code:
      p.code,

    quantity:
      q,

    unit_price:
      price,

    vat_rate:
      vat

  });

  $('saleQty').value = '';

  $('salePrice').value = '';

  renderSaleItems();

}


function calculateSaleTotals() {

  let subtotal = 0;
  let vatTotal = 0;

  saleItems.forEach(i => {

    const l =
      i.quantity *
      i.unit_price;

    subtotal += l;

    vatTotal +=
      l *
      i.vat_rate /
      100;

  });

  const total =
    subtotal +
    vatTotal;

  const currency =
    getCurrency('sale');

  const rate =
    currency === 'TRY'
      ? 1
      : getExchangeRate('sale');

  setText(
    'saleSubtotal',
    money(
      subtotal,
      currency
    )
  );

  setText(
    'saleVatTotal',
    money(
      vatTotal,
      currency
    )
  );

  setText(
    'saleGrandTotal',
    money(
      total,
      currency
    )
  );

  ensureCurrencySummary(
    'sale'
  );

  const summary =
    $('saleTlSummary');

  if (summary) {

    summary.style.display =
      currency === 'TRY'
        ? 'none'
        : 'block';

    setText(
      'saleSubtotalTry',
      money(
        subtotal * rate,
        'TRY'
      )
    );

    setText(
      'saleVatTotalTry',
      money(
        vatTotal * rate,
        'TRY'
      )
    );

    setText(
      'saleGrandTotalTry',
      money(
        total * rate,
        'TRY'
      )
    );

  }

  return {

    subtotal,
    vatTotal,
    total,

    currency,

    exchangeRate:
      rate,

    subtotalTry:
      subtotal * rate,

    vatAmountTry:
      vatTotal * rate,

    totalTry:
      total * rate

  };

}


function renderSaleItems() {

  const c =
    $('saleItems');

  if (!c) return;

  const currency =
    getCurrency('sale');

  if (!saleItems.length) {

    c.innerHTML =
      '<div class="empty">Faturaya henüz ürün eklenmedi.</div>';

    calculateSaleTotals();

    return;
  }

  c.innerHTML = `

    <table class="invoice-items-table">

      <thead>

        <tr>
          <th>#</th>
          <th>Ürün</th>
          <th>Miktar</th>
          <th>Birim Fiyat</th>
          <th>KDV</th>
          <th>Matrah</th>
          <th>KDV Tutarı</th>
          <th>Toplam</th>
          <th></th>
        </tr>

      </thead>

      <tbody>

        ${saleItems.map((i, n) => {

          const sub =
            i.quantity *
            i.unit_price;

          const vat =
            sub *
            i.vat_rate /
            100;

          return `

            <tr>

              <td>
                ${n + 1}
              </td>

              <td>
                ${esc(i.code)}
                -
                ${esc(i.product_name)}
              </td>

              <td>
                ${i.quantity}
              </td>

              <td>
                ${money(
                  i.unit_price,
                  currency
                )}
              </td>

              <td>
                %${i.vat_rate}
              </td>

              <td>
                ${money(
                  sub,
                  currency
                )}
              </td>

              <td>
                ${money(
                  vat,
                  currency
                )}
              </td>

              <td>
                ${money(
                  sub + vat,
                  currency
                )}
              </td>

              <td>

                <button
                  class="item-remove"
                  onclick="removeSaleItem(${n})"
                >
                  ✕
                </button>

              </td>

            </tr>

          `;

        }).join('')}

      </tbody>

    </table>

  `;

  calculateSaleTotals();

}


function removeSaleItem(i) {

  saleItems.splice(
    i,
    1
  );

  renderSaleItems();

}


async function saveSale() {

  if (!saleItems.length) {

    toast(
      'Faturaya en az bir ürün ekleyin.'
    );

    return;
  }

  if (!editingSaleId) {

    for (const i of saleItems) {

      const p =
        products.find(
          x =>
            x.id ===
            i.product_id
        );

      if (!p) {

        toast(
          'Ürün bulunamadı.'
        );

        return;
      }

      if (
        i.quantity >
        num(p.stock_quantity)
      ) {

        toast(
          `${p.name} için yeterli stok yok.`
        );

        return;
      }

    }
  }

  const partyId =
    $('saleParty')
      .value || null;

  const invoiceNo =
    $('saleInvoiceNo')
      .value
      .trim();

  const invoiceDate =
    $('saleDate')
      .value ||
    today();

  const note =
    $('saleNote')
      .value
      .trim();

  const totals =
    calculateSaleTotals();

  if (
    totals.currency !== 'TRY' &&
    totals.exchangeRate <= 0
  ) {

    toast(
      'USD/EUR faturası için fatura kurunu girin.'
    );

    return;
  }

  if (editingSaleId) {

    await updateSaleInvoice(
      editingSaleId,
      {
        partyId,
        invoiceNo,
        invoiceDate,
        note,
        totals
      }
    );

    return;
  }

  try {

    const r =
      await db
        .from('sales')
        .insert({

          invoice_no:
            invoiceNo,

          party_id:
            partyId,

          invoice_date:
            invoiceDate,

          subtotal:
            totals.subtotal,

          vat_rate:
            0,

          vat_amount:
            totals.vatTotal,

          total:
            totals.total,

          note,

          currency:
            totals.currency,

          exchange_rate:
            totals.exchangeRate,

          subtotal_try:
            totals.subtotalTry,

          vat_amount_try:
            totals.vatAmountTry,

          total_try:
            totals.totalTry

        })
        .select()
        .single();

    if (r.error) {
      throw r.error;
    }

    const id =
      r.data.id;

    const items =
      saleItems.map(i => {

        const sub =
          i.quantity *
          i.unit_price;

        const vat =
          sub *
          i.vat_rate /
          100;

        return {

          sale_id:
            id,

          product_id:
            i.product_id,

          quantity:
            i.quantity,

          unit_price:
            i.unit_price,

          vat_rate:
            i.vat_rate,

          line_subtotal:
            sub,

          vat_amount:
            vat,

          line_total:
            sub + vat

        };

      });

    const ir =
      await db
        .from('sale_items')
        .insert(items);

    if (ir.error) {
      throw ir.error;
    }

    for (const i of saleItems) {

      const p =
        products.find(
          x =>
            x.id ===
            i.product_id
        );

      if (!p) continue;

      const stock =
        num(p.stock_quantity) -
        i.quantity;

      if (stock < 0) {

        throw new Error(
          `${p.name} için stok yetersiz.`
        );

      }

      const ur =
        await db
          .from('products')
          .update({

            stock_quantity:
              stock

          })
          .eq(
            'id',
            i.product_id
          );

      if (ur.error) {
        throw ur.error;
      }

      const mr =
        await db
          .from('stock_movements')
          .insert({

            product_id:
              i.product_id,

            party_id:
              partyId,

            type:
              'out',

            quantity:
              i.quantity,

            source_type:
              'sale',

            source_id:
              id,

            note:
              `${parties.find(x => x.id === partyId)?.name || 'Müşteri belirtilmedi'} firmasına satış${invoiceNo ? ` - Fatura: ${invoiceNo}` : ''}`

          });

      if (mr.error) {
        throw mr.error;
      }

    }

    toast(
      'Satış faturası başarıyla kaydedildi.'
    );

    clearSale();

    await loadAll();

  } catch (e) {

    console.error(e);

    toast(
      'Satış faturası kaydedilemedi: ' +
      e.message
    );

  }

}


function clearSale() {

  saleItems = [];

  if ($('saleInvoiceNo')) {
    $('saleInvoiceNo').value = '';
  }

  if ($('saleDate')) {
    $('saleDate').value = today();
  }

  if ($('saleParty')) {
    $('saleParty').value = '';
  }

  if ($('saleNote')) {
    $('saleNote').value = '';
  }

  if ($('saleCurrency')) {
    $('saleCurrency').value = 'TRY';
  }

  if ($('saleExchangeRate')) {
    $('saleExchangeRate').value = '';
  }

  renderSaleItems();

  closeSaleInvoiceModal();

}


/* =========================================================
   STOK HAREKETLERİ
========================================================= */

function renderMovements() {

  const c =
    $('movementsTable');

  if (!c) return;

  if (!movements.length) {

    c.innerHTML =
      '<div class="empty">Henüz stok hareketi yok.</div>';

    return;
  }

  c.innerHTML = `

    <table>

      <thead>

        <tr>
          <th>Tarih</th>
          <th>Ürün</th>
          <th>Hareket</th>
          <th>Miktar</th>
          <th>Açıklama</th>
        </tr>

      </thead>

      <tbody>

        ${movements.map(m => {

          const p =
            products.find(
              x =>
                x.id ===
                m.product_id
            );

          return `

            <tr>

              <td>
                ${
                  m.created_at
                    ? new Date(
                        m.created_at
                      ).toLocaleString(
                        'tr-TR'
                      )
                    : '-'
                }
              </td>

              <td>
                ${esc(
                  p?.name || '-'
                )}
              </td>

              <td>

                <span
                  class="badge ${
                    m.type === 'in'
                      ? 'badge-in'
                      : 'badge-out'
                  }"
                >

                  ${
                    m.type === 'in'
                      ? 'Giriş'
                      : 'Çıkış'
                  }

                </span>

              </td>

              <td>
                ${num(m.quantity)}
              </td>

              <td>
                ${esc(
                  m.note || '-'
                )}
              </td>

            </tr>

          `;

        }).join('')}

      </tbody>

    </table>

  `;

}


function openMovementForm() {

  openModal(

    'Manuel Stok Hareketi',

    `

      <div class="form-group">

        <label>
          Ürün
        </label>

        <select id="movementProduct">

          <option value="">
            Ürün seçin...
          </option>

          ${products.map(p => `

            <option value="${p.id}">
              ${esc(p.code)} - ${esc(p.name)}
            </option>

          `).join('')}

        </select>

      </div>

      <div class="form-grid">

        <div class="form-group">

          <label>
            Hareket
          </label>

          <select id="movementType">

            <option value="in">
              Stok Girişi
            </option>

            <option value="out">
              Stok Çıkışı
            </option>

          </select>

        </div>

        <div class="form-group">

          <label>
            Miktar
          </label>

          <input
            id="movementQty"
            type="number"
            min="0.01"
            step="0.01"
          >

        </div>

      </div>

      <div class="form-group">

        <label>
          Açıklama
        </label>

        <textarea
          id="movementNote"
        ></textarea>

      </div>

      <div class="form-buttons">

        <button
          class="secondary"
          onclick="closeModal()"
        >
          Vazgeç
        </button>

        <button
          class="success"
          onclick="saveMovement()"
        >
          Kaydet
        </button>

      </div>

    `
  );

}


async function saveMovement() {

  const pid =
    $('movementProduct')
      .value;

  const type =
    $('movementType')
      .value;

  const q =
    num(
      $('movementQty')
        .value
    );

  const note =
    $('movementNote')
      .value
      .trim();

  if (!pid || q <= 0) {

    toast(
      'Ürün ve miktar zorunludur.'
    );

    return;
  }

  const p =
    products.find(
      x =>
        x.id === pid
    );

  if (!p) return;

  const stock =
    type === 'in'
      ? num(p.stock_quantity) + q
      : num(p.stock_quantity) - q;

  if (stock < 0) {

    toast(
      'Yetersiz stok.'
    );

    return;
  }

  try {

    const ur =
      await db
        .from('products')
        .update({
          stock_quantity: stock
        })
        .eq(
          'id',
          pid
        );

    if (ur.error) {
      throw ur.error;
    }

    const mr =
      await db
        .from('stock_movements')
        .insert({

          product_id:
            pid,

          type:
            type,

          quantity:
            q,

          source_type:
            'manual',

          note

        });

    if (mr.error) {
      throw mr.error;
    }

    closeModal();

    toast(
      'Stok hareketi kaydedildi.'
    );

    await loadAll();

  } catch (e) {

    toast(
      'Hareket kaydedilemedi: ' +
      e.message
    );

  }

}


/* =========================================================
   FATURALAR / DETAY
========================================================= */

function invoiceDisplay(x) {

  const c =
    (
      x.currency ||
      'TRY'
    ).toUpperCase();

  const rate =
    num(x.exchange_rate) ||
    1;

  return {

    currency:
      c,

    rate,

    subtotalTry:
      num(x.subtotal_try) ||
      num(x.subtotal) * rate,

    vatTry:
      num(x.vat_amount_try) ||
      num(x.vat_amount) * rate,

    totalTry:
      num(x.total_try) ||
      num(x.total) * rate

  };

}


function renderDocuments() {

  const c =
    $('documentsTable');

  if (!c) return;

  const rows = [

    ...purchases.map(
      p => ({
        x: p,
        t: 'Alış'
      })
    ),

    ...sales.map(
      s => ({
        x: s,
        t: 'Satış'
      })
    )

  ];

  if (!rows.length) {

    c.innerHTML =
      '<div class="empty">Henüz fatura kaydı yok.</div>';

    return;
  }

  c.innerHTML = `

    <div
      style="
        margin-bottom:10px;
        color:#6b7280;
        font-size:13px;
      "
    >
      💡 Fatura detayını görmek için satıra tıklayın.
    </div>

    <table>

      <thead>

        <tr>
          <th>Fatura No</th>
          <th>Tarih</th>
          <th>Tür</th>
          <th>Cari</th>
          <th>Para Birimi</th>
          <th>Genel Toplam</th>
        </tr>

      </thead>

      <tbody>

        ${rows.map(r => {

          const p =
            parties.find(
              x =>
                x.id ===
                r.x.party_id
            );

          const d =
            invoiceDisplay(
              r.x
            );

          return `

            <tr
              class="invoice-clickable"
              style="cursor:pointer"
              onclick="showInvoiceDetail('${r.t}','${r.x.id}')"
            >

              <td>
                ${esc(
                  r.x.invoice_no || '-'
                )}
              </td>

              <td>
                ${r.x.invoice_date || '-'}
              </td>

              <td>
                ${r.t}
              </td>

              <td>
                ${esc(
                  p?.name || '-'
                )}
              </td>

              <td>
                ${
                  d.currency === 'TRY'
                    ? 'TL'
                    : d.currency
                }
              </td>

              <td>

                <strong>
                  ${money(
                    r.x.total,
                    d.currency
                  )}
                </strong>

                ${
                  d.currency !== 'TRY'
                    ? `

                      <br>

                      <small
                        style="color:#6b7280"
                      >
                        ${money(
                          d.totalTry,
                          'TRY'
                        )}
                      </small>

                    `
                    : ''
                }

              </td>

            </tr>

          `;

        }).join('')}

      </tbody>

    </table>

  `;

}


async function showInvoiceDetail(
  type,
  id
) {

  const isPurchase =
    type === 'Alış';

  const table =
    isPurchase
      ? 'purchases'
      : 'sales';

  const itemsTable =
    isPurchase
      ? 'purchase_items'
      : 'sale_items';

  const fk =
    isPurchase
      ? 'purchase_id'
      : 'sale_id';

  try {

    const ir =
      await db
        .from(table)
        .select('*')
        .eq(
          'id',
          id
        )
        .single();

    if (ir.error) {
      throw ir.error;
    }

    const invoice =
      ir.data;

    const xr =
      await db
        .from(itemsTable)
        .select('*')
        .eq(
          fk,
          id
        );

    if (xr.error) {
      throw xr.error;
    }

    const items =
      xr.data || [];

    const party =
      parties.find(
        x =>
          x.id ===
          invoice.party_id
      );

    const d =
      invoiceDisplay(
        invoice
      );

    const itemRows =
      items.map(
        (i, n) => {

          const p =
            products.find(
              x =>
                String(x.id) ===
                String(i.product_id)
            );

          return `

            <tr>

              <td>
                ${n + 1}
              </td>

              <td>
                ${esc(
                  p?.code || '-'
                )}
                -
                ${esc(
                  p?.name || 'Ürün'
                )}
              </td>

              <td>
                ${num(
                  i.quantity
                )}
              </td>

              <td>
                ${money(
                  i.unit_price,
                  d.currency
                )}
              </td>

              <td>
                %${num(
                  i.vat_rate
                )}
              </td>

              <td>
                ${money(
                  i.line_subtotal,
                  d.currency
                )}
              </td>

              <td>
                ${money(
                  i.vat_amount,
                  d.currency
                )}
              </td>

              <td>

                <strong>
                  ${money(
                    i.line_total,
                    d.currency
                  )}
                </strong>

              </td>

            </tr>

          `;

        }
      ).join('');

    openModal(

      `${
        isPurchase
          ? 'Alış'
          : 'Satış'
      } Faturası Detayı`,

      `

        <div
          style="
            display:grid;
            grid-template-columns:repeat(3,1fr);
            gap:15px;
            margin-bottom:20px
          "
        >

          <div>

            <label>
              Fatura No
            </label>

            <strong>
              ${esc(
                invoice.invoice_no || '-'
              )}
            </strong>

          </div>

          <div>

            <label>
              Tarih
            </label>

            <strong>
              ${invoice.invoice_date || '-'}
            </strong>

          </div>

          <div>

            <label>
              Cari
            </label>

            <strong>
              ${esc(
                party?.name || '-'
              )}
            </strong>

          </div>

        </div>

        <div
          style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:15px;
            margin-bottom:20px
          "
        >

          <div>

            <label>
              Para Birimi
            </label>

            <strong>
              ${
                d.currency === 'TRY'
                  ? 'TL'
                  : d.currency
              }
            </strong>

          </div>

          ${
            d.currency !== 'TRY'
              ? `

                <div>

                  <label>
                    Fatura Kuru
                  </label>

                  <strong>
                    1 ${d.currency}
                    =
                    ${money(
                      d.rate,
                      'TRY'
                    )}
                  </strong>

                </div>

              `
              : ''
          }

        </div>

        <div
          style="overflow-x:auto"
        >

          <table
            class="invoice-items-table"
          >

            <thead>

              <tr>
                <th>#</th>
                <th>Ürün</th>
                <th>Miktar</th>
                <th>Birim Fiyat</th>
                <th>KDV</th>
                <th>Matrah</th>
                <th>KDV</th>
                <th>Toplam</th>
              </tr>

            </thead>

            <tbody>

              ${
                itemRows ||

                `
                  <tr>

                    <td
                      colspan="8"
                      style="text-align:center"
                    >
                      Kalem bulunamadı.
                    </td>

                  </tr>
                `
              }

            </tbody>

          </table>

        </div>

        <div
          style="
            margin-top:20px;
            text-align:right;
            border-top:1px solid #e5e7eb;
            padding-top:15px
          "
        >

          <div>

            Matrah:

            <strong>
              ${money(
                invoice.subtotal,
                d.currency
              )}
            </strong>

          </div>

          <div>

            KDV:

            <strong>
              ${money(
                invoice.vat_amount,
                d.currency
              )}
            </strong>

          </div>

          <div
            style="
              font-size:22px;
              margin-top:5px
            "
          >

            Genel Toplam:

            <strong>
              ${money(
                invoice.total,
                d.currency
              )}
            </strong>

          </div>

          ${
            d.currency !== 'TRY'
              ? `

                <div
                  style="
                    margin-top:8px;
                    color:#6b7280
                  "
                >

                  TL Karşılığı:

                  <strong>
                    ${money(
                      d.totalTry,
                      'TRY'
                    )}
                  </strong>

                </div>

              `
              : ''
          }

        </div>

        ${
          invoice.note
            ? `

              <div
                style="
                  margin-top:15px;
                  padding:12px;
                  background:#f9fafb;
                  border-radius:8px
                "
              >

                <strong>
                  Açıklama
                </strong>

                <div
                  style="
                    margin-top:5px;
                    white-space:pre-wrap
                  "
                >
                  ${esc(
                    invoice.note
                  )}
                </div>

              </div>

            `
            : ''
        }

        <div class="form-buttons">

          <button
            class="secondary"
            onclick="closeModal()"
          >
            Kapat
          </button>

        </div>

      `
    );

  } catch (e) {

    console.error(e);

    toast(
      'Fatura detayı açılamadı: ' +
      e.message
    );

  }

}


/* =========================================================
   RAPORLAR
========================================================= */

function renderReports() {

  const pu =
    purchases.reduce(
      (s, x) =>
        s +
        num(
          x.total_try ??
          x.total
        ),
      0
    );

  const sa =
    sales.reduce(
      (s, x) =>
        s +
        num(
          x.total_try ??
          x.total
        ),
      0
    );

  setText(
    'purchaseCount',
    purchases.length
  );

  setText(
    'saleCount',
    sales.length
  );

  setText(
    'reportPurchaseTotal',
    money(pu)
  );

  setText(
    'reportSaleTotal',
    money(sa)
  );

  const c =
    $('reportSummary');

  if (!c) return;

  const pv =
    purchases.reduce(
      (s, x) =>
        s +
        num(
          x.vat_amount_try ??
          x.vat_amount
        ),
      0
    );

  const sv =
    sales.reduce(
      (s, x) =>
        s +
        num(
          x.vat_amount_try ??
          x.vat_amount
        ),
      0
    );

  const d =
    sa - pu;

  c.innerHTML = `

    <div class="report-row">

      <span>
        Toplam alış faturası
      </span>

      <strong>
        ${purchases.length}
      </strong>

    </div>

    <div class="report-row">

      <span>
        Toplam satış faturası
      </span>

      <strong>
        ${sales.length}
      </strong>

    </div>

    <div class="report-row">

      <span>
        Toplam alış (TL)
      </span>

      <strong>
        ${money(pu)}
      </strong>

    </div>

    <div class="report-row">

      <span>
        Toplam satış (TL)
      </span>

      <strong>
        ${money(sa)}
      </strong>

    </div>

    <div class="report-row">

      <span>
        Alış KDV (TL)
      </span>

      <strong>
        ${money(pv)}
      </strong>

    </div>

    <div class="report-row">

      <span>
        Satış KDV (TL)
      </span>

      <strong>
        ${money(sv)}
      </strong>

    </div>

    <div class="report-row">

      <span>
        Satış - Alış (TL)
      </span>

      <strong
        class="${
          d >= 0
            ? 'text-success'
            : 'text-danger'
        }"
      >
        ${money(d)}
      </strong>

    </div>

  `;

}


/* =========================================================
   CSV
========================================================= */

function downloadCSV(
  filename,
  rows
) {

  const csv =
    rows
      .map(
        r =>
          r
            .map(
              v =>
                `"${String(
                  v ?? ''
                ).replaceAll(
                  '"',
                  '""'
                )}"`
            )
            .join(';')
      )
      .join('\n');

  const blob =
    new Blob(
      [
        '\uFEFF' +
        csv
      ],
      {
        type:
          'text/csv;charset=utf-8;'
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const a =
    document.createElement(
      'a'
    );

  a.href =
    url;

  a.download =
    filename;

  document.body.appendChild(
    a
  );

  a.click();

  a.remove();

  URL.revokeObjectURL(
    url
  );

}


function exportPurchasesCSV() {

  const rows = [

    [
      'Fatura No',
      'Tarih',
      'Tedarikçi',
      'Para Birimi',
      'Kur',
      'Matrah',
      'KDV',
      'Genel Toplam',
      'TL Toplam'
    ]

  ];

  purchases.forEach(p => {

    const c =
      parties.find(
        x =>
          x.id ===
          p.party_id
      );

    const d =
      invoiceDisplay(p);

    rows.push([

      p.invoice_no || '',
      p.invoice_date || '',
      c?.name || '',
      d.currency,
      d.rate,
      p.subtotal || 0,
      p.vat_amount || 0,
      p.total || 0,
      d.totalTry

    ]);

  });

  downloadCSV(
    'alis_faturalari.csv',
    rows
  );

}


function exportSalesCSV() {

  const rows = [

    [
      'Fatura No',
      'Tarih',
      'Müşteri',
      'Para Birimi',
      'Kur',
      'Matrah',
      'KDV',
      'Genel Toplam',
      'TL Toplam'
    ]

  ];

  sales.forEach(s => {

    const c =
      parties.find(
        x =>
          x.id ===
          s.party_id
      );

    const d =
      invoiceDisplay(s);

    rows.push([

      s.invoice_no || '',
      s.invoice_date || '',
      c?.name || '',
      d.currency,
      d.rate,
      s.subtotal || 0,
      s.vat_amount || 0,
      s.total || 0,
      d.totalTry

    ]);

  });

  downloadCSV(
    'satis_faturalari.csv',
    rows
  );

}


/* =========================================================
   SATIN ALMA SAYFASI
   ÖNEMLİ:
   FORM SAYFADA GİZLİDİR.
   SADECE + FATURA EKLE TIKLANINCA AÇILIR.
========================================================= */

(function () {

  function hidePurchaseForm() {

    const form =
      $('purchaseForm');

    if (!form) return;

    /*
      Form modal içinde DEĞİLSE
      mutlaka gizle.
    */

    if (
      !form.closest('#modalForm')
    ) {

      form.classList.add(
        'hidden'
      );

      form.style.display =
        'none';

    }

  }


  function showPurchaseForm() {

    const form =
      $('purchaseForm');

    if (!form) return;

    form.classList.remove(
      'hidden'
    );

    form.style.display =
      '';

  }


  function ensurePurchaseLayout() {

    const page =
      $('purchase');

    const form =
      $('purchaseForm');

    if (!page || !form) {
      return;
    }

    let placeholder =
      $('purchaseFormPlaceholder');

    if (!placeholder) {

      placeholder =
        document.createElement(
          'div'
        );

      placeholder.id =
        'purchaseFormPlaceholder';

      placeholder.style.display =
        'none';

      form.parentNode.insertBefore(
        placeholder,
        form
      );

    }


    let header =
      $('purchasePageHeader');

    if (!header) {

      header =
        document.createElement(
          'div'
        );

      header.id =
        'purchasePageHeader';

      header.className =
        'box';

      header.style.marginBottom =
        '15px';

      header.innerHTML = `

        <div
          class="head"
          style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:15px;
          "
        >

          <div>

            <h2
              style="margin:0"
            >
              📥 Satın Alma
            </h2>

            <p
              style="
                margin:5px 0 0;
                color:#6b7280;
              "
            >
              Kayıtlı alış faturalarınızı görüntüleyin
              ve yeni fatura ekleyin.
            </p>

          </div>

          <button
            class="primary"
            type="button"
            onclick="openNewPurchase()"
          >
            + Fatura Ekle
          </button>

        </div>

      `;

      page.insertBefore(
        header,
        page.firstElementChild
      );

    }


    let history =
      $('purchaseHistory');

    if (!history) {

      history =
        document.createElement(
          'div'
        );

      history.id =
        'purchaseHistory';

      history.className =
        'box';

      page.appendChild(
        history
      );

    }


    /*
      Form modal dışında kaldığında
      sayfada görünmesini kesin olarak engelle.
    */

    if (
      !form.closest('#modalForm')
    ) {

      form.classList.add(
        'hidden'
      );

      form.style.display =
        'none';

      if (
        placeholder.parentNode
      ) {

        placeholder.parentNode.insertBefore(
          form,
          placeholder.nextSibling
        );

      }

    }

    renderPurchaseHistory();

  }


  function renderPurchaseHistory() {

    const c =
      $('purchaseHistory');

    if (!c) return;

    if (!purchases.length) {

      c.innerHTML = `

        <div
          class="head"
          style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
          "
        >

          <h2 style="margin:0">
            📋 Alış Faturaları
          </h2>

          <button
            class="secondary"
            type="button"
            onclick="exportPurchasesCSV()"
          >
            CSV Dışa Aktar
          </button>

        </div>

        <div
          class="empty"
          style="
            padding:35px 10px;
            text-align:center;
          "
        >
          Henüz alış faturası kaydı yok.
        </div>

      `;

      return;
    }


    c.innerHTML = `

      <div
        class="head"
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        "
      >

        <h2 style="margin:0">
          📋 Alış Faturaları
        </h2>

        <button
          class="secondary"
          type="button"
          onclick="exportPurchasesCSV()"
        >
          CSV Dışa Aktar
        </button>

      </div>

      <div
        style="overflow-x:auto"
      >

        <table>

          <thead>

            <tr>
              <th>Fatura No</th>
              <th>Tarih</th>
              <th>Tedarikçi</th>
              <th>Para Birimi</th>
              <th>Matrah</th>
              <th>KDV</th>
              <th>Genel Toplam</th>
            </tr>

          </thead>

          <tbody>

            ${purchases.map(p => {

              const party =
                parties.find(
                  x =>
                    String(x.id) ===
                    String(p.party_id)
                );

              const currency =
                (
                  p.currency ||
                  'TRY'
                ).toUpperCase();

              return `

                <tr
                  style="cursor:pointer"
                  onclick="showPurchaseDetail('${p.id}')"
                >

                  <td>

                    <strong>
                      ${esc(
                        p.invoice_no || '-'
                      )}
                    </strong>

                  </td>

                  <td>
                    ${esc(
                      p.invoice_date || '-'
                    )}
                  </td>

                  <td>
                    ${esc(
                      party?.name || '-'
                    )}
                  </td>

                  <td>

                    ${
                      currency === 'TRY'
                        ? 'TL'
                        : currency
                    }

                  </td>

                  <td>

                    ${money(
                      p.subtotal,
                      currency
                    )}

                  </td>

                  <td>

                    ${money(
                      p.vat_amount,
                      currency
                    )}

                  </td>

                  <td>

                    <strong>

                      ${money(
                        p.total,
                        currency
                      )}

                    </strong>

                  </td>

                </tr>

              `;

            }).join('')}

          </tbody>

        </table>

      </div>

    `;

  }


  function openNewPurchase() {

    const form =
      $('purchaseForm');

    const modal =
      $('modal');

    const modalForm =
      $('modalForm');

    const modalTitle =
      $('modalTitle');

    if (
      !form ||
      !modal ||
      !modalForm
    ) {

      toast(
        'Yeni fatura formu bulunamadı.'
      );

      return;
    }


    editingPurchaseId =
      null;

    purchaseItems =
      [];


    /*
      Önce formu modal içine taşıyoruz.
    */

    modalForm.innerHTML =
      '';

    modalForm.appendChild(
      form
    );


    /*
      Formun görünmesini burada
      özellikle açıyoruz.
    */

    showPurchaseForm();


    modalTitle.textContent =
      'Yeni Alış Faturası';

    modal.classList.remove(
      'hidden'
    );


    preparePurchasePage();

    clearPurchaseFields();


    setText(
      'purchaseFormTitle',
      'Yeni Alış Faturası'
    );


    const saveBtn =
      $('savePurchaseBtn');

    if (saveBtn) {

      saveBtn.textContent =
        '💾 Alış Faturasını Kaydet';

    }


    renderPurchaseItems();

  }


  function closePurchaseForm() {

    const form =
      $('purchaseForm');

    const modal =
      $('modal');

    const placeholder =
      $('purchaseFormPlaceholder');

    if (!form) return;


    editingPurchaseId =
      null;

    purchaseItems =
      [];


    /*
      Modalı kapat.
    */

    if (modal) {

      modal.classList.add(
        'hidden'
      );

    }


    /*
      Formu modal dışına geri taşı.
    */

    if (
      placeholder &&
      placeholder.parentNode
    ) {

      placeholder.parentNode.insertBefore(
        form,
        placeholder.nextSibling
      );

    }


    /*
      Formu hem CSS class ile
      hem inline style ile gizle.
    */

    form.classList.add(
      'hidden'
    );

    form.style.display =
      'none';


    renderPurchaseItems();

    renderPurchaseHistory();

  }


  async function showPurchaseDetail(id) {

    try {

      const purchase =
        purchases.find(
          x =>
            String(x.id) ===
            String(id)
        );

      if (!purchase) {
        return;
      }

      const r =
        await db
          .from('purchase_items')
          .select('*')
          .eq(
            'purchase_id',
            id
          );

      if (r.error) {
        throw r.error;
      }

      const party =
        parties.find(
          x =>
            String(x.id) ===
            String(purchase.party_id)
        );

      const currency =
        (
          purchase.currency ||
          'TRY'
        ).toUpperCase();

      const rows =
        (r.data || [])
          .map(
            (item, n) => {

              const product =
                products.find(
                  x =>
                    String(x.id) ===
                    String(item.product_id)
                );

              return `

                <tr>

                  <td>
                    ${n + 1}
                  </td>

                  <td>

                    ${esc(
                      product?.code || '-'
                    )}

                    -

                    ${esc(
                      product?.name || 'Ürün'
                    )}

                  </td>

                  <td>
                    ${num(
                      item.quantity
                    )}
                  </td>

                  <td>

                    ${money(
                      item.unit_price,
                      currency
                    )}

                  </td>

                  <td>
                    %${num(
                      item.vat_rate
                    )}
                  </td>

                  <td>

                    ${money(
                      item.line_subtotal,
                      currency
                    )}

                  </td>

                  <td>

                    ${money(
                      item.vat_amount,
                      currency
                    )}

                  </td>

                  <td>

                    ${money(
                      item.line_total,
                      currency
                    )}

                  </td>

                </tr>

              `;

            }
          )
          .join('');


      openModal(

        'Alış Faturası Detayı',

        `

          <div
            style="
              display:grid;
              grid-template-columns:repeat(3,1fr);
              gap:15px;
              margin-bottom:20px
            "
          >

            <div>

              <label>
                Fatura No
              </label>

              <strong>
                ${esc(
                  purchase.invoice_no ||
                  '-'
                )}
              </strong>

            </div>

            <div>

              <label>
                Tarih
              </label>

              <strong>
                ${esc(
                  purchase.invoice_date ||
                  '-'
                )}
              </strong>

            </div>

            <div>

              <label>
                Tedarikçi
              </label>

              <strong>
                ${esc(
                  party?.name ||
                  '-'
                )}
              </strong>

            </div>

          </div>

          <div
            style="overflow:auto"
          >

            <table
              class="invoice-items-table"
            >

              <thead>

                <tr>

                  <th>#</th>
                  <th>Ürün</th>
                  <th>Miktar</th>
                  <th>Birim Fiyat</th>
                  <th>KDV</th>
                  <th>Matrah</th>
                  <th>KDV Tutarı</th>
                  <th>Toplam</th>

                </tr>

              </thead>

              <tbody>

                ${
                  rows ||

                  `

                    <tr>

                      <td
                        colspan="8"
                        style="text-align:center"
                      >
                        Kalem bulunamadı.
                      </td>

                    </tr>

                  `
                }

              </tbody>

            </table>

          </div>

          <div
            style="
              margin-top:20px;
              text-align:right;
              border-top:1px solid #e5e7eb;
              padding-top:15px
            "
          >

            <div>

              Matrah:

              <strong>
                ${money(
                  purchase.subtotal,
                  currency
                )}
              </strong>

            </div>

            <div>

              KDV:

              <strong>
                ${money(
                  purchase.vat_amount,
                  currency
                )}
              </strong>

            </div>

            <div
              style="
                font-size:22px;
                margin-top:5px
              "
            >

              Genel Toplam:

              <strong>
                ${money(
                  purchase.total,
                  currency
                )}
              </strong>

            </div>

          </div>

          ${
            purchase.note
              ? `

                <div
                  style="
                    margin-top:15px;
                    padding:12px;
                    background:#f9fafb;
                    border-radius:8px
                  "
                >

                  <strong>
                    Açıklama
                  </strong>

                  <div
                    style="
                      margin-top:5px;
                      white-space:pre-wrap
                    "
                  >

                    ${esc(
                      purchase.note
                    )}

                  </div>

                </div>

              `
              : ''
          }

          <div
            class="form-buttons"
          >

            <button
              class="secondary"
              type="button"
              onclick="closeModal()"
            >
              Kapat
            </button>

          </div>

        `
      );

    } catch (e) {

      console.error(e);

      toast(
        'Fatura detayı açılamadı: ' +
        e.message
      );

    }

  }


  window.openNewPurchase =
    openNewPurchase;

  window.closePurchaseForm =
    closePurchaseForm;

  window.showPurchaseDetail =
    showPurchaseDetail;

  window.renderPurchaseHistory =
    renderPurchaseHistory;

  window.ensurePurchaseLayout =
    ensurePurchaseLayout;

  window.hidePurchaseForm =
    hidePurchaseForm;


  /*
    Sayfa ilk açıldığında formu
    kesinlikle gizle.
  */

  document.addEventListener(
    'DOMContentLoaded',
    () => {

      setTimeout(() => {

        ensurePurchaseLayout();

        hidePurchaseForm();

      }, 300);

    }
  );


  /*
    Satın Alma menüsüne her girişte
    formu tekrar gizle.
  */

  document.addEventListener(
    'click',
    e => {

      const btn =
        e.target.closest(
          '.menu'
        );

      if (
        btn &&
        btn.dataset.page ===
        'purchase'
      ) {

        setTimeout(() => {

          ensurePurchaseLayout();

          hidePurchaseForm();

        }, 100);

      }

    }
  );

})();


/* =========================================================
   ALIŞ / SATIŞ FATURA LİSTELERİ
========================================================= */

function formatInvoiceDate(value) {

  if (!value) return '-';

  const parts =
    String(value)
      .slice(0, 10)
      .split('-');

  if (parts.length !== 3) {
    return esc(value);
  }

  return `${parts[2]}.${parts[1]}.${parts[0]}`;

}


function invoiceSortArrow(
  filterType,
  key
) {

  const filter =
    invoiceFilters[filterType];

  if (filter.sortKey !== key) {
    return '↕';
  }

  return filter.sortDirection === 'asc'
    ? '↑'
    : '↓';

}


function setInvoiceSort(
  filterType,
  key
) {

  const filter =
    invoiceFilters[filterType];

  if (filter.sortKey === key) {
    filter.sortDirection =
      filter.sortDirection === 'asc'
        ? 'desc'
        : 'asc';
  } else {
    filter.sortKey = key;
    filter.sortDirection = 'asc';
  }

  filterType === 'purchase'
    ? renderPurchaseInvoices()
    : renderSaleInvoices();

}


function updateInvoiceFilter(
  filterType,
  key,
  value
) {

  invoiceFilters[filterType][key] =
    value;

  filterType === 'purchase'
    ? renderPurchaseInvoices()
    : renderSaleInvoices();

}


function clearInvoiceFilters(filterType) {

  Object.assign(
    invoiceFilters[filterType],
    {
      query: '',
      dateFrom: '',
      dateTo: '',
      currency: 'all',
      sortKey: 'invoice_date',
      sortDirection: 'desc'
    }
  );

  const prefix =
    filterType === 'purchase'
      ? 'purchase'
      : 'sale';

  [
    'Query',
    'DateFrom',
    'DateTo'
  ].forEach(suffix => {
    if ($(prefix + 'Filter' + suffix)) {
      $(prefix + 'Filter' + suffix).value = '';
    }
  });

  if ($(prefix + 'FilterCurrency')) {
    $(prefix + 'FilterCurrency').value = 'all';
  }

  filterType === 'purchase'
    ? renderPurchaseInvoices()
    : renderSaleInvoices();

}


function renderInvoiceList(
  containerId,
  invoices,
  type
) {

  const c = $(containerId);

  if (!c) return;

  const isPurchase =
    type === 'Alış';

  const filterType =
    isPurchase
      ? 'purchase'
      : 'sale';

  const prefix = filterType;
  const filter =
    invoiceFilters[filterType];

  if (!$(prefix + 'InvoiceFilterBar')) {
    c.innerHTML = `
      <div class="invoice-list-help">
        Faturayı görüntüleyebilir, değiştirebilir veya silebilirsiniz.
      </div>

      <div
        id="${prefix}InvoiceFilterBar"
        class="table-filter-bar invoice-filter-bar"
      >
        <input
          id="${prefix}FilterQuery"
          placeholder="Fatura no veya ünvan ara..."
          oninput="updateInvoiceFilter('${filterType}','query',this.value)"
        >

        <div class="filter-date">
          <label>Başlangıç</label>
          <input
            id="${prefix}FilterDateFrom"
            type="date"
            onchange="updateInvoiceFilter('${filterType}','dateFrom',this.value)"
          >
        </div>

        <div class="filter-date">
          <label>Bitiş</label>
          <input
            id="${prefix}FilterDateTo"
            type="date"
            onchange="updateInvoiceFilter('${filterType}','dateTo',this.value)"
          >
        </div>

        <select
          id="${prefix}FilterCurrency"
          onchange="updateInvoiceFilter('${filterType}','currency',this.value)"
        >
          <option value="all">Tüm fatura türleri</option>
          <option value="TRY">TL faturalar</option>
          <option value="USD">USD faturalar</option>
          <option value="EUR">EUR faturalar</option>
        </select>

        <button
          class="secondary"
          type="button"
          onclick="clearInvoiceFilters('${filterType}')"
        >
          Filtreleri Temizle
        </button>
      </div>

      <div id="${prefix}InvoiceTable"></div>
    `;
  }

  const tableContainer =
    $(prefix + 'InvoiceTable');

  if (!tableContainer) return;

  const q = searchable(filter.query);

  const list = invoices
    .filter(invoice => {

      const party = parties.find(
        x => String(x.id) ===
          String(invoice.party_id)
      );

      const currency =
        invoiceDisplay(invoice).currency;

      const matchesQuery =
        searchable(invoice.invoice_no)
          .includes(q) ||
        searchable(party?.name)
          .includes(q);

      const matchesFrom =
        !filter.dateFrom ||
        String(invoice.invoice_date) >=
          filter.dateFrom;

      const matchesTo =
        !filter.dateTo ||
        String(invoice.invoice_date) <=
          filter.dateTo;

      const matchesCurrency =
        filter.currency === 'all' ||
        currency === filter.currency;

      return matchesQuery &&
        matchesFrom &&
        matchesTo &&
        matchesCurrency;

    })
    .sort((a, b) => {

      const getValue = invoice => {
        const party = parties.find(
          x => String(x.id) ===
            String(invoice.party_id)
        );
        const display = invoiceDisplay(invoice);

        const values = {
          invoice_date: String(invoice.invoice_date || ''),
          invoice_no: searchable(invoice.invoice_no),
          party: searchable(party?.name),
          currency: display.currency,
          rate: display.rate,
          subtotal: display.subtotalTry,
          vat: display.vatTry,
          total: display.totalTry
        };

        return values[filter.sortKey];
      };

      const av = getValue(a);
      const bv = getValue(b);

      const result =
        typeof av === 'string'
          ? av.localeCompare(
              bv,
              'tr-TR',
              { numeric: true }
            )
          : av - bv;

      return filter.sortDirection === 'asc'
        ? result
        : -result;

    });

  if (!list.length) {
    tableContainer.innerHTML = `
      <div class="empty">
        Filtrelere uygun ${isPurchase ? 'satın alma' : 'satış'} faturası bulunamadı.
      </div>
    `;
    return;
  }

  const sortHead = (key, label) => `
    <button
      class="sort-button"
      onclick="setInvoiceSort('${filterType}','${key}')"
    >
      ${label} ${invoiceSortArrow(filterType, key)}
    </button>
  `;

  tableContainer.innerHTML = `
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>${sortHead('invoice_date', 'Tarih')}</th>
            <th>${sortHead('invoice_no', 'Fatura No')}</th>
            <th>${sortHead('party', 'Ünvan')}</th>
            <th>${sortHead('currency', 'Fatura Türü')}</th>
            <th>${sortHead('rate', 'Kur')}</th>
            <th>${sortHead('subtotal', 'Matrah')}</th>
            <th>${sortHead('vat', 'KDV')}</th>
            <th>${sortHead('total', 'Toplam Fatura Tutarı')}</th>
            <th>${sortHead('total', 'TL Karşılığı')}</th>
            <th>İşlem</th>
          </tr>
        </thead>

        <tbody>
          ${list.map(invoice => {

            const party = parties.find(
              x => String(x.id) === String(invoice.party_id)
            );

            const display =
              invoiceDisplay(invoice);

            return `
              <tr>
                <td>${formatInvoiceDate(invoice.invoice_date)}</td>
                <td><strong>${esc(invoice.invoice_no || '-')}</strong></td>
                <td>${esc(party?.name || '-')}</td>
                <td>${display.currency === 'TRY' ? 'TL Fatura' : `Döviz (${display.currency})`}</td>
                <td>${display.currency === 'TRY' ? '-' : `1 ${display.currency} = ${moneyCode(display.rate, 'TRY')}`}</td>
                <td>${money(invoice.subtotal, display.currency)}</td>
                <td>${money(invoice.vat_amount, display.currency)}</td>
                <td><strong>${money(invoice.total, display.currency)}</strong></td>
                <td><strong>${money(display.totalTry, 'TRY')}</strong></td>
                <td>
                  <div class="table-actions">
                    <button class="secondary" type="button" onclick="showInvoiceDetail('${type}','${invoice.id}')">Göster</button>
                    <button class="edit-button" type="button" onclick="${isPurchase ? 'editPurchaseInvoice' : 'editSaleInvoice'}('${invoice.id}')">Değiştir</button>
                    <button class="danger" type="button" onclick="${isPurchase ? 'deletePurchaseInvoice' : 'deleteSaleInvoice'}('${invoice.id}')">Sil</button>
                  </div>
                </td>
              </tr>
            `;

          }).join('')}
        </tbody>
      </table>
    </div>
  `;

}


function renderPurchaseInvoices() {

  renderInvoiceList(
    'purchaseInvoicesTable',
    purchases,
    'Alış'
  );

}


function renderSaleInvoices() {

  renderInvoiceList(
    'saleInvoicesTable',
    sales,
    'Satış'
  );

}


function showInvoiceFormModal(
  areaId,
  placeholderId,
  title
) {

  const area = $(areaId);
  const modal = $('modal');
  const modalForm = $('modalForm');

  if (!area || !modal || !modalForm) {
    toast('Fatura penceresi açılamadı.');
    return;
  }

  let placeholder = $(placeholderId);

  if (!placeholder) {
    placeholder = document.createElement('div');
    placeholder.id = placeholderId;
    placeholder.className = 'hidden';
    area.parentNode.insertBefore(
      placeholder,
      area
    );
  }

  modalForm.innerHTML = '';
  modalForm.appendChild(area);

  area.classList.remove('hidden');
  $('modalTitle').textContent = title;
  modal.classList.add('invoice-modal-open');
  modal.classList.remove('hidden');

}


function returnInvoiceForm(
  areaId,
  placeholderId
) {

  const area = $(areaId);
  const placeholder = $(placeholderId);

  if (area) {
    area.classList.add('hidden');
  }

  if (
    area &&
    placeholder?.parentNode
  ) {
    placeholder.parentNode.insertBefore(
      area,
      placeholder.nextSibling
    );
  }

  $('modal')?.classList.add('hidden');
  $('modal')?.classList.remove('invoice-modal-open');

}


function openPurchaseInvoiceModal() {

  editingPurchaseId = null;
  purchaseItems = [];

  clearPurchaseFields();
  preparePurchasePage();
  renderPurchaseItems();

  if ($('savePurchaseBtn')) {
    $('savePurchaseBtn').textContent =
      '💾 Alış Faturasını Kaydet';
  }

  showInvoiceFormModal(
    'purchaseFormArea',
    'purchaseFormAreaPlaceholder',
    'Yeni Alış Faturası'
  );

}


function closePurchaseInvoiceModal() {

  editingPurchaseId = null;

  returnInvoiceForm(
    'purchaseFormArea',
    'purchaseFormAreaPlaceholder'
  );

}


function openSaleInvoiceModal() {

  editingSaleId = null;
  saleItems = [];

  if ($('saleInvoiceNo')) {
    $('saleInvoiceNo').value = '';
  }

  if ($('saleDate')) {
    $('saleDate').value = today();
  }

  if ($('saleParty')) {
    $('saleParty').value = '';
  }

  if ($('saleNote')) {
    $('saleNote').value = '';
  }

  if ($('saleCurrency')) {
    $('saleCurrency').value = 'TRY';
  }

  if ($('saleExchangeRate')) {
    $('saleExchangeRate').value = '';
  }

  prepareSalePage();
  renderSaleItems();

  if ($('saveSaleBtn')) {
    $('saveSaleBtn').textContent =
      '💾 Satış Faturasını Kaydet';
  }

  showInvoiceFormModal(
    'saleFormArea',
    'saleFormAreaPlaceholder',
    'Yeni Satış Faturası'
  );

}


function closeSaleInvoiceModal() {

  editingSaleId = null;

  returnInvoiceForm(
    'saleFormArea',
    'saleFormAreaPlaceholder'
  );

}


function invoiceItemRows(
  type,
  invoiceId,
  items
) {

  const isPurchase =
    type === 'purchase';

  return items.map(item => {

    const subtotal =
      num(item.quantity) *
      num(item.unit_price);

    const vatAmount =
      subtotal *
      num(item.vat_rate) /
      100;

    return {
      [isPurchase ? 'purchase_id' : 'sale_id']:
        invoiceId,
      product_id: item.product_id,
      quantity: num(item.quantity),
      unit_price: num(item.unit_price),
      vat_rate: num(item.vat_rate),
      line_subtotal: subtotal,
      vat_amount: vatAmount,
      line_total: subtotal + vatAmount
    };

  });

}


function calculateStockChanges(
  oldItems,
  newItems,
  type
) {

  const changes = new Map();

  const add = (productId, quantity) => {
    changes.set(
      productId,
      (changes.get(productId) || 0) +
      quantity
    );
  };

  oldItems.forEach(item => {
    add(
      item.product_id,
      type === 'purchase'
        ? -num(item.quantity)
        : num(item.quantity)
    );
  });

  newItems.forEach(item => {
    add(
      item.product_id,
      type === 'purchase'
        ? num(item.quantity)
        : -num(item.quantity)
    );
  });

  return changes;

}


function validateStockChanges(changes) {

  for (const [productId, change] of changes) {

    const product = products.find(
      x => String(x.id) === String(productId)
    );

    if (!product) {
      throw new Error('Faturadaki ürünlerden biri bulunamadı.');
    }

    if (
      num(product.stock_quantity) +
      change < 0
    ) {
      throw new Error(
        `${product.name} için işlem sonrası stok eksiye düşeceği için fatura değiştirilemez veya silinemez.`
      );
    }

  }

}


async function applyStockChanges(
  changes,
  newItems = [],
  priceField = null,
  exchangeRate = 1
) {

  const prices = new Map();

  newItems.forEach(item => {
    prices.set(
      item.product_id,
      num(item.unit_price) *
      num(exchangeRate || 1)
    );
  });

  for (const [productId, change] of changes) {

    const product = products.find(
      x => String(x.id) === String(productId)
    );

    const update = {
      stock_quantity:
        num(product.stock_quantity) +
        change
    };

    if (
      priceField &&
      prices.has(productId)
    ) {
      update[priceField] =
        prices.get(productId);
    }

    const result = await db
      .from('products')
      .update(update)
      .eq('id', productId);

    if (result.error) {
      throw result.error;
    }

  }

}


async function editPurchaseInvoice(id) {

  try {

    const invoice = purchases.find(
      x => String(x.id) === String(id)
    );

    if (!invoice) {
      throw new Error('Alış faturası bulunamadı.');
    }

    const result = await db
      .from('purchase_items')
      .select('*')
      .eq('purchase_id', id);

    if (result.error) throw result.error;

    editingPurchaseId = id;

    purchaseItems = (result.data || []).map(item => {
      const product = products.find(
        x => String(x.id) === String(item.product_id)
      );

      return {
        product_id: item.product_id,
        product_name: product?.name || 'Ürün',
        code: product?.code || '-',
        quantity: num(item.quantity),
        unit_price: num(item.unit_price),
        vat_rate: num(item.vat_rate)
      };
    });

    preparePurchasePage();

    $('purchaseInvoiceNo').value =
      invoice.invoice_no || '';
    $('purchaseDate').value =
      invoice.invoice_date || today();
    $('purchaseParty').value =
      invoice.party_id || '';
    $('purchaseNote').value =
      invoice.note || '';
    $('purchaseCurrency').value =
      (invoice.currency || 'TRY').toUpperCase();

    currencyChanged('purchase');

    if ($('purchaseExchangeRate')) {
      $('purchaseExchangeRate').value =
        (invoice.currency || 'TRY').toUpperCase() === 'TRY'
          ? ''
          : num(invoice.exchange_rate);
    }

    renderPurchaseItems();

    if ($('savePurchaseBtn')) {
      $('savePurchaseBtn').textContent =
        '💾 Alış Faturasını Güncelle';
    }

    showInvoiceFormModal(
      'purchaseFormArea',
      'purchaseFormAreaPlaceholder',
      'Alış Faturasını Değiştir'
    );

  } catch (error) {
    console.error(error);
    toast('Fatura değişiklik için açılamadı: ' + error.message);
  }

}


async function editSaleInvoice(id) {

  try {

    const invoice = sales.find(
      x => String(x.id) === String(id)
    );

    if (!invoice) {
      throw new Error('Satış faturası bulunamadı.');
    }

    const result = await db
      .from('sale_items')
      .select('*')
      .eq('sale_id', id);

    if (result.error) throw result.error;

    editingSaleId = id;

    saleItems = (result.data || []).map(item => {
      const product = products.find(
        x => String(x.id) === String(item.product_id)
      );

      return {
        product_id: item.product_id,
        product_name: product?.name || 'Ürün',
        code: product?.code || '-',
        quantity: num(item.quantity),
        unit_price: num(item.unit_price),
        vat_rate: num(item.vat_rate)
      };
    });

    prepareSalePage();

    $('saleInvoiceNo').value =
      invoice.invoice_no || '';
    $('saleDate').value =
      invoice.invoice_date || today();
    $('saleParty').value =
      invoice.party_id || '';
    $('saleNote').value =
      invoice.note || '';
    $('saleCurrency').value =
      (invoice.currency || 'TRY').toUpperCase();

    currencyChanged('sale');

    if ($('saleExchangeRate')) {
      $('saleExchangeRate').value =
        (invoice.currency || 'TRY').toUpperCase() === 'TRY'
          ? ''
          : num(invoice.exchange_rate);
    }

    renderSaleItems();

    if ($('saveSaleBtn')) {
      $('saveSaleBtn').textContent =
        '💾 Satış Faturasını Güncelle';
    }

    showInvoiceFormModal(
      'saleFormArea',
      'saleFormAreaPlaceholder',
      'Satış Faturasını Değiştir'
    );

  } catch (error) {
    console.error(error);
    toast('Fatura değişiklik için açılamadı: ' + error.message);
  }

}


async function updatePurchaseInvoice(
  id,
  data
) {

  try {

    const oldResult = await db
      .from('purchase_items')
      .select('*')
      .eq('purchase_id', id);

    if (oldResult.error) throw oldResult.error;

    const changes = calculateStockChanges(
      oldResult.data || [],
      purchaseItems,
      'purchase'
    );

    validateStockChanges(changes);

    const headerResult = await db
      .from('purchases')
      .update({
        invoice_no: data.invoiceNo,
        party_id: data.partyId,
        invoice_date: data.invoiceDate,
        subtotal: data.totals.subtotal,
        vat_rate: 0,
        vat_amount: data.totals.vatTotal,
        total: data.totals.total,
        note: data.note,
        currency: data.totals.currency,
        exchange_rate: data.totals.exchangeRate,
        subtotal_try: data.totals.subtotalTry,
        vat_amount_try: data.totals.vatAmountTry,
        total_try: data.totals.totalTry
      })
      .eq('id', id);

    if (headerResult.error) throw headerResult.error;

    const movementDelete = await db
      .from('stock_movements')
      .delete()
      .eq('source_type', 'purchase')
      .eq('source_id', id);

    if (movementDelete.error) throw movementDelete.error;

    const itemDelete = await db
      .from('purchase_items')
      .delete()
      .eq('purchase_id', id);

    if (itemDelete.error) throw itemDelete.error;

    const itemResult = await db
      .from('purchase_items')
      .insert(invoiceItemRows('purchase', id, purchaseItems));

    if (itemResult.error) throw itemResult.error;

    await applyStockChanges(
      changes
    );

    const partyName = parties.find(
      x => x.id === data.partyId
    )?.name || 'Tedarikçi belirtilmedi';

    const movementResult = await db
      .from('stock_movements')
      .insert(purchaseItems.map(item => ({
        product_id: item.product_id,
        party_id: data.partyId,
        type: 'in',
        quantity: item.quantity,
        source_type: 'purchase',
        source_id: id,
        note: `${partyName} firmasından satın alma${data.invoiceNo ? ` - Fatura: ${data.invoiceNo}` : ''}`
      })));

    if (movementResult.error) throw movementResult.error;

    editingPurchaseId = null;
    toast('Alış faturası güncellendi.');
    clearPurchase();
    await loadAll();

  } catch (error) {
    console.error(error);
    toast('Alış faturası güncellenemedi: ' + error.message);
  }

}


async function updateSaleInvoice(
  id,
  data
) {

  try {

    const oldResult = await db
      .from('sale_items')
      .select('*')
      .eq('sale_id', id);

    if (oldResult.error) throw oldResult.error;

    const changes = calculateStockChanges(
      oldResult.data || [],
      saleItems,
      'sale'
    );

    validateStockChanges(changes);

    const headerResult = await db
      .from('sales')
      .update({
        invoice_no: data.invoiceNo,
        party_id: data.partyId,
        invoice_date: data.invoiceDate,
        subtotal: data.totals.subtotal,
        vat_rate: 0,
        vat_amount: data.totals.vatTotal,
        total: data.totals.total,
        note: data.note,
        currency: data.totals.currency,
        exchange_rate: data.totals.exchangeRate,
        subtotal_try: data.totals.subtotalTry,
        vat_amount_try: data.totals.vatAmountTry,
        total_try: data.totals.totalTry
      })
      .eq('id', id);

    if (headerResult.error) throw headerResult.error;

    const movementDelete = await db
      .from('stock_movements')
      .delete()
      .eq('source_type', 'sale')
      .eq('source_id', id);

    if (movementDelete.error) throw movementDelete.error;

    const itemDelete = await db
      .from('sale_items')
      .delete()
      .eq('sale_id', id);

    if (itemDelete.error) throw itemDelete.error;

    const itemResult = await db
      .from('sale_items')
      .insert(invoiceItemRows('sale', id, saleItems));

    if (itemResult.error) throw itemResult.error;

    await applyStockChanges(
      changes
    );

    const partyName = parties.find(
      x => x.id === data.partyId
    )?.name || 'Müşteri belirtilmedi';

    const movementResult = await db
      .from('stock_movements')
      .insert(saleItems.map(item => ({
        product_id: item.product_id,
        party_id: data.partyId,
        type: 'out',
        quantity: item.quantity,
        source_type: 'sale',
        source_id: id,
        note: `${partyName} firmasına satış${data.invoiceNo ? ` - Fatura: ${data.invoiceNo}` : ''}`
      })));

    if (movementResult.error) throw movementResult.error;

    editingSaleId = null;
    toast('Satış faturası güncellendi.');
    clearSale();
    await loadAll();

  } catch (error) {
    console.error(error);
    toast('Satış faturası güncellenemedi: ' + error.message);
  }

}


async function deleteInvoice(
  id,
  type
) {

  const isPurchase =
    type === 'purchase';

  try {

    const itemTable =
      isPurchase
        ? 'purchase_items'
        : 'sale_items';

    const invoiceTable =
      isPurchase
        ? 'purchases'
        : 'sales';

    const foreignKey =
      isPurchase
        ? 'purchase_id'
        : 'sale_id';

    const result = await db
      .from(itemTable)
      .select('*')
      .eq(foreignKey, id);

    if (result.error) throw result.error;

    const changes = calculateStockChanges(
      result.data || [],
      [],
      type
    );

    const negativeStocks = [];

    for (const [productId, change] of changes) {

      const product = products.find(
        x => String(x.id) === String(productId)
      );

      if (!product) continue;

      const newStock =
        num(product.stock_quantity) +
        change;

      if (newStock < 0) {
        negativeStocks.push(
          `${product.name}: ${newStock}`
        );
      }

    }

    let warning =
      'Bu faturayı silmek istediğinize emin misiniz?\n\n' +
      (
        isPurchase
          ? 'Satın alma faturası silindiğinde faturadaki ürünler stoktan düşülecektir.'
          : 'Satış faturası silindiğinde faturadaki ürünler stoğa geri eklenecektir.'
      );

    if (negativeStocks.length) {
      warning +=
        '\n\nDİKKAT: İşlem sonrasında şu stoklar eksiye düşecek:\n' +
        negativeStocks.join('\n') +
        '\n\nYine de silmek istiyor musunuz?';
    } else {
      warning +=
        '\n\nHatalı silme işlemi stok kayıtlarını etkileyebilir.';
    }

    if (!confirm(warning)) return;

    await applyStockChanges(changes);

    const movementDelete = await db
      .from('stock_movements')
      .delete()
      .eq(
        'source_type',
        isPurchase ? 'purchase' : 'sale'
      )
      .eq('source_id', id);

    if (movementDelete.error) throw movementDelete.error;

    const invoiceDelete = await db
      .from(invoiceTable)
      .delete()
      .eq('id', id);

    if (invoiceDelete.error) throw invoiceDelete.error;

    toast(
      `${isPurchase ? 'Alış' : 'Satış'} faturası silindi ve stok güncellendi.`
    );

    await loadAll();

  } catch (error) {
    console.error(error);
    toast('Fatura silinemedi: ' + error.message);
  }

}


function deletePurchaseInvoice(id) {
  return deleteInvoice(id, 'purchase');
}


function deleteSaleInvoice(id) {
  return deleteInvoice(id, 'sale');
}


window.openPurchaseForm =
  openPurchaseInvoiceModal;

window.closePurchaseForm =
  closePurchaseInvoiceModal;

window.openSaleForm =
  openSaleInvoiceModal;

window.closeSaleForm =
  closeSaleInvoiceModal;


/* =========================================================
   BAŞLAT
========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    setupNavigation();

    setDefaultDates();

    $('refreshBtn')?.addEventListener(
      'click',
      loadAll
    );

    $('productSearch')?.addEventListener(
      'input',
      renderProducts
    );

    await loadAll();

  }
);


/* =========================================================
   MODAL TIKLAMA
========================================================= */

document.addEventListener(
  'click',
  e => {

    if (
      e.target ===
      $('modal')
    ) {

      closeModal();

    }

  }
);


/* =========================================================
   ESC
========================================================= */

document.addEventListener(
  'keydown',
  e => {

    if (
      e.key === 'Escape'
    ) {

      closeModal();

    }

  }
);
