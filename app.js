const db = window.supabaseClient;

let products = [];
let parties = [];
let purchases = [];
let sales = [];
let movements = [];

let purchaseItems = [];
let saleItems = [];

let editingPurchaseId = null;
let editingSaleId = null;


/* =========================================================
   BAŞLANGIÇ
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  setupNavigation();
  setDefaultDates();

  document
    .getElementById("refreshBtn")
    ?.addEventListener("click", loadAll);

  document
    .getElementById("productSearch")
    ?.addEventListener("input", renderProducts);

  await loadAll();

});


/* =========================================================
   YARDIMCILAR
========================================================= */

function number(value) {
  return Number(value || 0);
}


function money(value, currency = "TRY") {

  const amount = Number(value || 0);

  if (currency === "USD") {
    return amount.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " $";
  }

  return amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " ₺";
}


function today() {
  return new Date().toISOString().slice(0, 10);
}


function setText(id, value) {

  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }

}


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function showToast(message) {

  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);

}


function getCurrency(id, fallback = "TRY") {

  const element = document.getElementById(id);

  if (!element) {
    return fallback;
  }

  return element.value || fallback;

}


function getExchangeRate(id) {

  const element = document.getElementById(id);

  if (!element) {
    return 1;
  }

  const value = number(element.value);

  return value > 0 ? value : 1;

}


function currencyLabel(currency) {
  return currency === "USD" ? "USD" : "TL";
}


function invoiceMoney(value, currency) {
  return money(value, currency);
}


/* =========================================================
   MENÜ
========================================================= */

function setupNavigation() {

  document.querySelectorAll(".menu").forEach(button => {

    button.addEventListener("click", () => {

      const page = button.dataset.page;

      document
        .querySelectorAll(".menu")
        .forEach(x => x.classList.remove("active"));

      button.classList.add("active");

      document
        .querySelectorAll(".page")
        .forEach(x => x.classList.add("hidden"));

      const target = document.getElementById(page);

      if (target) {
        target.classList.remove("hidden");
      }

      const titles = {

        dashboard: "Ana Sayfa",
        products: "Ürünler",
        purchase: "Satın Alma",
        sales: "Satış",
        movements: "Stok Hareketleri",
        parties: "Cari / Müşteriler",
        reports: "Raporlar"

      };

      setText(
        "pageTitle",
        titles[page] || "Stok Takip"
      );


      if (page === "dashboard") {
        renderDashboard();
      }

      if (page === "products") {
        renderProducts();
      }

      if (page === "purchase") {
        preparePurchasePage();
        renderPurchaseItems();
        renderPurchaseHistory();
      }

      if (page === "sales") {
        prepareSalePage();
        renderSaleItems();
        renderSaleHistory();
      }

      if (page === "movements") {
        renderMovements();
      }

      if (page === "parties") {
        renderParties();
      }

      if (page === "reports") {
        renderReports();
      }

    });

  });

}


/* =========================================================
   TARİHLER
========================================================= */

function setDefaultDates() {

  const purchaseDate =
    document.getElementById("purchaseDate");

  const saleDate =
    document.getElementById("saleDate");

  if (purchaseDate) {
    purchaseDate.value = today();
  }

  if (saleDate) {
    saleDate.value = today();
  }

}


/* =========================================================
   VERİLER
========================================================= */

async function loadAll() {

  if (!db) {

    showToast(
      "Supabase bağlantısı bulunamadı."
    );

    return;
  }


  try {

    const results = await Promise.all([

      db
        .from("products")
        .select("*")
        .order("name"),

      db
        .from("parties")
        .select("*")
        .order("name"),

      db
        .from("purchases")
        .select("*")
        .order("invoice_date", {
          ascending: false
        }),

      db
        .from("sales")
        .select("*")
        .order("invoice_date", {
          ascending: false
        }),

      db
        .from("stock_movements")
        .select("*")
        .order("created_at", {
          ascending: false
        })

    ]);


    for (const result of results) {

      if (result.error) {
        throw result.error;
      }

    }


    products = results[0].data || [];
    parties = results[1].data || [];
    purchases = results[2].data || [];
    sales = results[3].data || [];
    movements = results[4].data || [];


    renderDashboard();
    renderProducts();
    renderParties();
    renderMovements();
    renderReports();

    preparePurchasePage();
    prepareSalePage();

    renderPurchaseHistory();
    renderSaleHistory();

  }

  catch (error) {

    console.error(
      "loadAll:",
      error
    );

    showToast(
      "Veriler yüklenemedi: " +
      error.message
    );

  }

}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

  const totalProducts =
    products.length;


  const totalStock =
    products.reduce(
      (sum, p) =>
        sum + number(p.stock_quantity),
      0
    );


  const critical =
    products.filter(p =>
      number(p.stock_quantity) <=
      number(p.critical_stock)
    ).length;


  const totalSales =
    sales.reduce(
      (sum, x) =>
        sum + number(x.total),
      0
    );


  const totalPurchases =
    purchases.reduce(
      (sum, x) =>
        sum + number(x.total),
      0
    );


  const todaySales =
    sales
      .filter(x =>
        x.invoice_date === today()
      )
      .reduce(
        (sum, x) =>
          sum + number(x.total),
        0
      );


  setText("totalProducts", totalProducts);
  setText("totalStock", totalStock);
  setText("criticalProducts", critical);
  setText("totalParties", parties.length);

  setText(
    "totalSales",
    money(totalSales)
  );

  setText(
    "totalPurchases",
    money(totalPurchases)
  );

  setText(
    "grossProfit",
    money(totalSales - totalPurchases)
  );

  setText(
    "todaySales",
    money(todaySales)
  );


  const container =
    document.getElementById(
      "criticalProductsTable"
    );

  if (!container) return;


  const criticalProducts =
    products.filter(p =>
      number(p.stock_quantity) <=
      number(p.critical_stock)
    );


  if (!criticalProducts.length) {

    container.innerHTML =
      `<div class="empty">
        Kritik stok bulunmuyor.
      </div>`;

    return;

  }


  container.innerHTML = `

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

        ${criticalProducts.map(p => `

          <tr>

            <td>${escapeHtml(p.code)}</td>

            <td>${escapeHtml(p.name)}</td>

            <td class="text-danger">
              ${number(p.stock_quantity)}
            </td>

            <td>
              ${number(p.critical_stock)}
            </td>

          </tr>

        `).join("")}

      </tbody>

    </table>

  `;

}


/* =========================================================
   ÜRÜNLER
========================================================= */

function renderProducts() {

  const container =
    document.getElementById(
      "productsTable"
    );

  if (!container) return;


  const search =
    (
      document
        .getElementById("productSearch")
        ?.value || ""
    ).toLowerCase();


  const filtered =
    products.filter(p =>

      String(p.code || "")
        .toLowerCase()
        .includes(search)

      ||

      String(p.name || "")
        .toLowerCase()
        .includes(search)

    );


  if (!filtered.length) {

    container.innerHTML =
      `<div class="empty">
        Ürün bulunamadı.
      </div>`;

    return;

  }


  container.innerHTML = `

    <table>

      <thead>

        <tr>

          <th>Kod</th>
          <th>Ürün</th>
          <th>Stok</th>
          <th>Kritik</th>
          <th>Alış</th>
          <th>Satış</th>
          <th>Durum</th>
          <th>İşlem</th>

        </tr>

      </thead>

      <tbody>

        ${filtered.map(p => {

          const critical =
            number(p.stock_quantity) <=
            number(p.critical_stock);

          return `

            <tr>

              <td>${escapeHtml(p.code)}</td>

              <td>${escapeHtml(p.name)}</td>

              <td>${number(p.stock_quantity)}</td>

              <td>${number(p.critical_stock)}</td>

              <td>${money(p.purchase_price)}</td>

              <td>${money(p.sale_price)}</td>

              <td>

                <span class="badge ${
                  critical
                    ? "badge-critical"
                    : "badge-normal"
                }">

                  ${
                    critical
                      ? "Kritik"
                      : "Normal"
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

              </td>

            </tr>

          `;

        }).join("")}

      </tbody>

    </table>

  `;

}


/* =========================================================
   ÜRÜN FORMU
========================================================= */

function openProductForm(id = null) {

  const product =
    products.find(
      x => String(x.id) === String(id)
    );


  openModal(

    id
      ? "Ürün Düzenle"
      : "Yeni Ürün",

    `

      <div class="form-grid">

        <div class="form-group">

          <label>Ürün Kodu</label>

          <input
            id="formProductCode"
            value="${escapeHtml(product?.code || "")}"
          >

        </div>


        <div class="form-group">

          <label>Ürün Adı</label>

          <input
            id="formProductName"
            value="${escapeHtml(product?.name || "")}"
          >

        </div>


        <div class="form-group">

          <label>Mevcut Stok</label>

          <input
            id="formProductStock"
            type="number"
            step="0.01"
            value="${number(product?.stock_quantity)}"
          >

        </div>


        <div class="form-group">

          <label>Kritik Stok</label>

          <input
            id="formProductCritical"
            type="number"
            step="0.01"
            value="${number(product?.critical_stock || 5)}"
          >

        </div>


        <div class="form-group">

          <label>Alış Fiyatı</label>

          <input
            id="formProductPurchase"
            type="number"
            step="0.01"
            value="${number(product?.purchase_price)}"
          >

        </div>


        <div class="form-group">

          <label>Satış Fiyatı</label>

          <input
            id="formProductSale"
            type="number"
            step="0.01"
            value="${number(product?.sale_price)}"
          >

        </div>

      </div>


      <div class="form-buttons">

        <button
          type="button"
          class="secondary"
          onclick="closeModal()"
        >
          Vazgeç
        </button>

        <button
          type="button"
          class="success"
          onclick="saveProduct('${id || ""}')"
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


async function saveProduct(id) {

  const code =
    document
      .getElementById("formProductCode")
      .value
      .trim();

  const name =
    document
      .getElementById("formProductName")
      .value
      .trim();

  const stock =
    number(
      document
        .getElementById("formProductStock")
        .value
    );

  const critical =
    number(
      document
        .getElementById("formProductCritical")
        .value
    );

  const purchase =
    number(
      document
        .getElementById("formProductPurchase")
        .value
    );

  const sale =
    number(
      document
        .getElementById("formProductSale")
        .value
    );


  if (!code || !name) {

    showToast(
      "Ürün kodu ve adı zorunludur."
    );

    return;

  }


  const data = {

    code,
    name,
    stock_quantity: stock,
    critical_stock: critical,
    purchase_price: purchase,
    sale_price: sale

  };


  try {

    let result;

    if (id) {

      result =
        await db
          .from("products")
          .update(data)
          .eq("id", id);

    }

    else {

      result =
        await db
          .from("products")
          .insert(data);

    }


    if (result.error) {
      throw result.error;
    }


    closeModal();

    showToast(
      "Ürün kaydedildi."
    );

    await loadAll();

  }

  catch (error) {

    console.error(error);

    showToast(
      "Ürün kaydedilemedi: " +
      error.message
    );

  }

}


async function deleteProduct(id) {

  if (
    !confirm(
      "Bu ürünü silmek istediğinize emin misiniz?"
    )
  ) return;


  try {

    const result =
      await db
        .from("products")
        .delete()
        .eq("id", id);


    if (result.error) {
      throw result.error;
    }


    showToast("Ürün silindi.");

    await loadAll();

  }

  catch (error) {

    console.error(error);

    showToast(
      "Ürün silinemedi: " +
      error.message
    );

  }

}


/* =========================================================
   CARİLER
========================================================= */

function renderParties() {

  const container =
    document.getElementById(
      "partiesTable"
    );

  if (!container) return;


  if (!parties.length) {

    container.innerHTML =
      `<div class="empty">
        Henüz cari kaydı yok.
      </div>`;

    return;

  }


  container.innerHTML = `

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

            <td>${escapeHtml(p.name)}</td>

            <td>${partyType(p.type)}</td>

            <td>
              ${escapeHtml(p.phone || "-")}
            </td>

            <td>
              ${escapeHtml(p.email || "-")}
            </td>

            <td>
              ${escapeHtml(p.tax_number || "-")}
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

        `).join("")}

      </tbody>

    </table>

  `;

}


function partyType(type) {

  if (type === "supplier") {
    return "Tedarikçi";
  }

  if (type === "both") {
    return "Müşteri + Tedarikçi";
  }

  return "Müşteri";

}


function openPartyForm(id = null) {

  const party =
    parties.find(
      x => String(x.id) === String(id)
    );


  openModal(

    id
      ? "Cari Düzenle"
      : "Yeni Cari",

    `

      <div class="form-group">

        <label>Unvan / Ad Soyad</label>

        <input
          id="formPartyName"
          value="${escapeHtml(party?.name || "")}"
        >

      </div>


      <div class="form-grid">

        <div class="form-group">

          <label>Cari Tipi</label>

          <select id="formPartyType">

            <option value="customer"
              ${party?.type === "customer" ? "selected" : ""}>
              Müşteri
            </option>

            <option value="supplier"
              ${party?.type === "supplier" ? "selected" : ""}>
              Tedarikçi
            </option>

            <option value="both"
              ${party?.type === "both" ? "selected" : ""}>
              Müşteri + Tedarikçi
            </option>

          </select>

        </div>


        <div class="form-group">

          <label>Telefon</label>

          <input
            id="formPartyPhone"
            value="${escapeHtml(party?.phone || "")}"
          >

        </div>


        <div class="form-group">

          <label>E-posta</label>

          <input
            id="formPartyEmail"
            value="${escapeHtml(party?.email || "")}"
          >

        </div>


        <div class="form-group">

          <label>Vergi No</label>

          <input
            id="formPartyTax"
            value="${escapeHtml(party?.tax_number || "")}"
          >

        </div>


        <div class="form-group full">

          <label>Adres</label>

          <textarea id="formPartyAddress">${escapeHtml(
            party?.address || ""
          )}</textarea>

        </div>

      </div>


      <div class="form-buttons">

        <button
          type="button"
          class="secondary"
          onclick="closeModal()"
        >
          Vazgeç
        </button>

        <button
          type="button"
          class="success"
          onclick="saveParty('${id || ""}')"
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
      document
        .getElementById("formPartyName")
        .value
        .trim(),

    type:
      document
        .getElementById("formPartyType")
        .value,

    phone:
      document
        .getElementById("formPartyPhone")
        .value
        .trim(),

    email:
      document
        .getElementById("formPartyEmail")
        .value
        .trim(),

    tax_number:
      document
        .getElementById("formPartyTax")
        .value
        .trim(),

    address:
      document
        .getElementById("formPartyAddress")
        .value
        .trim()

  };


  if (!data.name) {

    showToast(
      "Unvan / Ad Soyad zorunludur."
    );

    return;

  }


  try {

    let result;

    if (id) {

      result =
        await db
          .from("parties")
          .update(data)
          .eq("id", id);

    }

    else {

      result =
        await db
          .from("parties")
          .insert(data);

    }


    if (result.error) {
      throw result.error;
    }


    closeModal();

    showToast(
      "Cari kaydedildi."
    );

    await loadAll();

  }

  catch (error) {

    console.error(error);

    showToast(
      "Cari kaydedilemedi: " +
      error.message
    );

  }

}


async function deleteParty(id) {

  if (
    !confirm(
      "Bu cariyi silmek istediğinize emin misiniz?"
    )
  ) return;


  try {

    const result =
      await db
        .from("parties")
        .delete()
        .eq("id", id);


    if (result.error) {
      throw result.error;
    }


    showToast(
      "Cari silindi."
    );

    await loadAll();

  }

  catch (error) {

    console.error(error);

    showToast(
      "Bu cari kullanıldığı için silinemiyor."
    );

  }

}


/* =========================================================
   MODAL
========================================================= */

function openModal(title, content) {

  const titleElement =
    document.getElementById("modalTitle");

  const form =
    document.getElementById("modalForm");

  const modal =
    document.getElementById("modal");


  if (!titleElement || !form || !modal) {
    return;
  }


  titleElement.textContent = title;
  form.innerHTML = content;

  modal.classList.remove("hidden");

}


function closeModal() {

  const modal =
    document.getElementById("modal");

  if (modal) {
    modal.classList.add("hidden");
  }

}


/* =========================================================
   PARA BİRİMİ
========================================================= */

function togglePurchaseCurrency() {

  const currency =
    getCurrency(
      "purchaseCurrency",
      "TRY"
    );


  const rateBox =
    document.getElementById(
      "purchaseRateBox"
    );


  const rateInput =
    document.getElementById(
      "purchaseExchangeRate"
    );


  if (rateBox) {

    rateBox.style.display =
      currency === "USD"
        ? ""
        : "none";

  }


  if (currency === "TRY" && rateInput) {
    rateInput.value = "1";
  }


  renderPurchaseItems();

}


function toggleSaleCurrency() {

  const currency =
    getCurrency(
      "saleCurrency",
      "TRY"
    );


  const rateBox =
    document.getElementById(
      "saleRateBox"
    );


  const rateInput =
    document.getElementById(
      "saleExchangeRate"
    );


  if (rateBox) {

    rateBox.style.display =
      currency === "USD"
        ? ""
        : "none";

  }


  if (currency === "TRY" && rateInput) {
    rateInput.value = "1";
  }


  renderSaleItems();

}


/* =========================================================
   SATIN ALMA HAZIRLIK
========================================================= */

function preparePurchasePage() {

  fillPartySelect(
    "purchaseParty",
    ["supplier", "both"]
  );

  fillProductSelect(
    "purchaseProduct"
  );


  const currency =
    document.getElementById(
      "purchaseCurrency"
    );

  if (currency && !currency.value) {
    currency.value = "TRY";
  }


  togglePurchaseCurrency();

}


function fillProductSelect(id) {

  const select =
    document.getElementById(id);

  if (!select) return;


  select.innerHTML =
    `<option value="">
      Ürün seçin...
    </option>` +

    products.map(p => `

      <option value="${p.id}">
        ${escapeHtml(p.code)}
        -
        ${escapeHtml(p.name)}
      </option>

    `).join("");

}


function fillPartySelect(
  id,
  allowedTypes
) {

  const select =
    document.getElementById(id);

  if (!select) return;


  const filtered =
    parties.filter(p =>
      allowedTypes.includes(p.type)
    );


  select.innerHTML =
    `<option value="">
      Cari seçin...
    </option>` +

    filtered.map(p => `

      <option value="${p.id}">
        ${escapeHtml(p.name)}
      </option>

    `).join("");

}


/* =========================================================
   YENİ ALIŞ FATURASI
========================================================= */

function openNewPurchase() {

  editingPurchaseId = null;
  purchaseItems = [];

  const form =
    document.getElementById(
      "purchaseForm"
    );

  if (form) {
    form.classList.remove("hidden");
  }


  const history =
    document.getElementById(
      "purchaseHistory"
    );

  if (history) {
    history.classList.remove("hidden");
  }


  clearPurchaseFields();

  setText(
    "purchaseFormTitle",
    "Yeni Alış Faturası"
  );


  const button =
    document.getElementById(
      "savePurchaseBtn"
    );

  if (button) {
    button.textContent =
      "💾 Alış Faturasını Kaydet";
  }


  renderPurchaseItems();

}


function closePurchaseForm() {

  editingPurchaseId = null;
  purchaseItems = [];

  const form =
    document.getElementById(
      "purchaseForm"
    );

  if (form) {
    form.classList.add("hidden");
  }

}


/* =========================================================
   ALIŞ ÜRÜN EKLE
========================================================= */

function addPurchaseItem() {

  const productId =
    document.getElementById(
      "purchaseProduct"
    )?.value;


  const qty =
    number(
      document.getElementById(
        "purchaseQty"
      )?.value
    );


  const price =
    number(
      document.getElementById(
        "purchasePrice"
      )?.value
    );


  const vat =
    number(
      document.getElementById(
        "purchaseVat"
      )?.value
    );


  if (!productId) {

    showToast(
      "Lütfen ürün seçin."
    );

    return;

  }


  if (qty <= 0) {

    showToast(
      "Lütfen miktar girin."
    );

    return;

  }


  if (price < 0) {

    showToast(
      "Birim fiyatı kontrol edin."
    );

    return;

  }


  const product =
    products.find(
      p =>
        String(p.id) ===
        String(productId)
    );


  if (!product) {

    showToast(
      "Ürün bulunamadı."
    );

    return;

  }


  purchaseItems.push({

    product_id: product.id,
    product_name: product.name,
    code: product.code,
    quantity: qty,
    unit_price: price,
    vat_rate: vat

  });


  document.getElementById(
    "purchaseQty"
  ).value = "";


  document.getElementById(
    "purchasePrice"
  ).value = "";


  renderPurchaseItems();

}


/* =========================================================
   ALIŞ KALEMLERİ
========================================================= */

function renderPurchaseItems() {

  const container =
    document.getElementById(
      "purchaseItems"
    );

  if (!container) return;


  const currency =
    getCurrency(
      "purchaseCurrency",
      "TRY"
    );


  if (!purchaseItems.length) {

    container.innerHTML =
      `<div class="empty">
        Faturaya henüz ürün eklenmedi.
      </div>`;

    calculatePurchaseTotals();

    return;

  }


  container.innerHTML = `

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

        ${purchaseItems.map(
          (item, index) => {

            const subtotal =
              item.quantity *
              item.unit_price;

            const vatAmount =
              subtotal *
              item.vat_rate /
              100;

            const total =
              subtotal + vatAmount;


            return `

              <tr>

                <td>${index + 1}</td>

                <td>
                  ${escapeHtml(item.code)}
                  -
                  ${escapeHtml(item.product_name)}
                </td>

                <td>${item.quantity}</td>

                <td>
                  ${invoiceMoney(
                    item.unit_price,
                    currency
                  )}
                </td>

                <td>%${item.vat_rate}</td>

                <td>
                  ${invoiceMoney(
                    subtotal,
                    currency
                  )}
                </td>

                <td>
                  ${invoiceMoney(
                    vatAmount,
                    currency
                  )}
                </td>

                <td>
                  <strong>
                    ${invoiceMoney(
                      total,
                      currency
                    )}
                  </strong>
                </td>

                <td>

                  <button
                    class="item-remove"
                    onclick="removePurchaseItem(${index})"
                  >
                    ✕
                  </button>

                </td>

              </tr>

            `;

          }
        ).join("")}

      </tbody>

    </table>

  `;


  calculatePurchaseTotals();

}


function removePurchaseItem(index) {

  purchaseItems.splice(index, 1);

  renderPurchaseItems();

}


function calculatePurchaseTotals() {

  let subtotal = 0;
  let vatTotal = 0;


  purchaseItems.forEach(item => {

    const line =
      item.quantity *
      item.unit_price;

    subtotal += line;

    vatTotal +=
      line *
      item.vat_rate /
      100;

  });


  const currency =
    getCurrency(
      "purchaseCurrency",
      "TRY"
    );


  setText(
    "purchaseSubtotal",
    invoiceMoney(
      subtotal,
      currency
    )
  );


  setText(
    "purchaseVatTotal",
    invoiceMoney(
      vatTotal,
      currency
    )
  );


  setText(
    "purchaseGrandTotal",
    invoiceMoney(
      subtotal + vatTotal,
      currency
    )
  );


  return {

    subtotal,
    vatTotal,
    total: subtotal + vatTotal

  };

}


/* =========================================================
   ALIŞ FATURASI KAYDET
========================================================= */

async function savePurchase() {

  if (!purchaseItems.length) {

    showToast(
      "Faturaya en az bir ürün ekleyin."
    );

    return;

  }


  const partyId =
    document
      .getElementById("purchaseParty")
      ?.value || null;


  const invoiceNo =
    document
      .getElementById("purchaseInvoiceNo")
      ?.value
      .trim() || "";


  const invoiceDate =
    document
      .getElementById("purchaseDate")
      ?.value ||
    today();


  const note =
    document
      .getElementById("purchaseNote")
      ?.value
      .trim() || "";


  const currency =
    getCurrency(
      "purchaseCurrency",
      "TRY"
    );


  const exchangeRate =
    currency === "USD"
      ? getExchangeRate(
          "purchaseExchangeRate"
        )
      : 1;


  const totals =
    calculatePurchaseTotals();


  try {

    const data = {

      invoice_no: invoiceNo,
      party_id: partyId,
      invoice_date: invoiceDate,
      subtotal: totals.subtotal,
      vat_rate: 0,
      vat_amount: totals.vatTotal,
      total: totals.total,
      note

    };


    /*
      currency ve exchange_rate kolonları
      veritabanında varsa eklenir.
    */

    data.currency = currency;
    data.exchange_rate = exchangeRate;


    let purchaseId;


    if (editingPurchaseId) {

      const old =
        purchases.find(
          x =>
            String(x.id) ===
            String(editingPurchaseId)
        );


      if (old) {

        await restorePurchaseStock(old.id);

      }


      const result =
        await db
          .from("purchases")
          .update(data)
          .eq(
            "id",
            editingPurchaseId
          )
          .select()
          .single();


      if (result.error) {
        throw result.error;
      }


      purchaseId =
        result.data.id;


      await db
        .from("purchase_items")
        .delete()
        .eq(
          "purchase_id",
          purchaseId
        );


      await db
        .from("stock_movements")
        .delete()
        .eq("source_id", purchaseId)
        .eq("source_type", "purchase");

    }

    else {

      const result =
        await db
          .from("purchases")
          .insert(data)
          .select()
          .single();


      if (result.error) {
        throw result.error;
      }


      purchaseId =
        result.data.id;

    }


    const items =
      purchaseItems.map(item => {

        const subtotal =
          item.quantity *
          item.unit_price;

        const vatAmount =
          subtotal *
          item.vat_rate /
          100;


        return {

          purchase_id:
            purchaseId,

          product_id:
            item.product_id,

          quantity:
            item.quantity,

          unit_price:
            item.unit_price,

          vat_rate:
            item.vat_rate,

          line_subtotal:
            subtotal,

          vat_amount:
            vatAmount,

          line_total:
            subtotal + vatAmount

        };

      });


    const itemsResult =
      await db
        .from("purchase_items")
        .insert(items);


    if (itemsResult.error) {
      throw itemsResult.error;
    }


    for (const item of purchaseItems) {

      const product =
        products.find(
          p =>
            String(p.id) ===
            String(item.product_id)
        );


      if (!product) continue;


      const newStock =
        number(product.stock_quantity) +
        number(item.quantity);


      const updateResult =
        await db
          .from("products")
          .update({

            stock_quantity:
              newStock,

            purchase_price:
              item.unit_price

          })
          .eq(
            "id",
            item.product_id
          );


      if (updateResult.error) {
        throw updateResult.error;
      }


      const movementResult =
        await db
          .from("stock_movements")
          .insert({

            product_id:
              item.product_id,

            party_id:
              partyId,

            type:
              "in",

            quantity:
              item.quantity,

            source_type:
              "purchase",

            source_id:
              purchaseId,

            note:
              `Alış faturası ${invoiceNo}`

          });


      if (movementResult.error) {
        throw movementResult.error;
      }

    }


    showToast(
      editingPurchaseId
        ? "Alış faturası güncellendi."
        : "Alış faturası kaydedildi."
    );


    closePurchaseForm();

    await loadAll();

  }

  catch (error) {

    console.error(error);

    showToast(
      "Alış faturası kaydedilemedi: " +
      error.message
    );

  }

}


/* =========================================================
   ALIŞ STOK GERİ AL
========================================================= */

async function restorePurchaseStock(purchaseId) {

  const result =
    await db
      .from("purchase_items")
      .select("*")
      .eq(
        "purchase_id",
        purchaseId
      );


  if (result.error) {
    throw result.error;
  }


  for (const item of result.data || []) {

    const product =
      products.find(
        p =>
          String(p.id) ===
          String(item.product_id)
      );


    if (!product) continue;


    const newStock =
      number(product.stock_quantity) -
      number(item.quantity);


    const update =
      await db
        .from("products")
        .update({
          stock_quantity: newStock
        })
        .eq(
          "id",
          item.product_id
        );


    if (update.error) {
      throw update.error;
    }

  }

}


/* =========================================================
   ALIŞ FATURALARI
========================================================= */

function renderPurchaseHistory() {

  const container =
    document.getElementById(
      "purchaseHistory"
    );

  if (!container) return;


  if (!purchases.length) {

    container.innerHTML =
      `<div class="empty">
        Henüz alış faturası yok.
      </div>`;

    return;

  }


  container.innerHTML = `

    <div class="panel-header">

      <h2>📋 Kayıtlı Alış Faturaları</h2>

      <button
        class="secondary"
        onclick="exportPurchasesCSV()"
      >
        Excel / CSV
      </button>

    </div>


    <table>

      <thead>

        <tr>

          <th>Fatura No</th>
          <th>Tarih</th>
          <th>Tedarikçi</th>
          <th>Para Birimi</th>
          <th>Toplam</th>
          <th>İşlem</th>

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
            p.currency ||
            "TRY";


          return `

            <tr
              style="cursor:pointer"
              onclick="editPurchase('${p.id}')"
            >

              <td>
                <strong>
                  ${escapeHtml(
                    p.invoice_no || "-"
                  )}
                </strong>
              </td>

              <td>
                ${p.invoice_date || "-"}
              </td>

              <td>
                ${escapeHtml(
                  party?.name || "-"
                )}
              </td>

              <td>
                ${currency === "USD"
                  ? "USD"
                  : "TL"}
              </td>

              <td>
                <strong>
                  ${invoiceMoney(
                    p.total,
                    currency
                  )}
                </strong>
              </td>

              <td>

                <button
                  class="secondary"
                  onclick="
                    event.stopPropagation();
                    editPurchase('${p.id}')
                  "
                >
                  ✏️ Değiştir
                </button>

                <button
                  class="danger"
                  onclick="
                    event.stopPropagation();
                    deletePurchase('${p.id}')
                  "
                >
                  Sil
                </button>

              </td>

            </tr>

          `;

        }).join("")}

      </tbody>

    </table>

  `;

}


/* =========================================================
   ALIŞ FATURASI DÜZENLE
========================================================= */

async function editPurchase(id) {

  const purchase =
    purchases.find(
      x =>
        String(x.id) ===
        String(id)
    );


  if (!purchase) {

    showToast(
      "Fatura bulunamadı."
    );

    return;

  }


  editingPurchaseId = id;


  const form =
    document.getElementById(
      "purchaseForm"
    );

  if (form) {
    form.classList.remove("hidden");
  }


  setText(
    "purchaseFormTitle",
    "Alış Faturasını Düzenle"
  );


  const saveBtn =
    document.getElementById(
      "savePurchaseBtn"
    );

  if (saveBtn) {
    saveBtn.textContent =
      "💾 Değişiklikleri Kaydet";
  }


  const invoice =
    document.getElementById(
      "purchaseInvoiceNo"
    );

  const date =
    document.getElementById(
      "purchaseDate"
    );

  const party =
    document.getElementById(
      "purchaseParty"
    );

  const note =
    document.getElementById(
      "purchaseNote"
    );

  const currency =
    document.getElementById(
      "purchaseCurrency"
    );

  const rate =
    document.getElementById(
      "purchaseExchangeRate"
    );


  if (invoice) {
    invoice.value =
      purchase.invoice_no || "";
  }

  if (date) {
    date.value =
      purchase.invoice_date || today();
  }

  if (party) {
    party.value =
      purchase.party_id || "";
  }

  if (note) {
    note.value =
      purchase.note || "";
  }

  if (currency) {
    currency.value =
      purchase.currency || "TRY";
  }

  if (rate) {
    rate.value =
      purchase.exchange_rate || 1;
  }


  togglePurchaseCurrency();


  const itemsResult =
    await db
      .from("purchase_items")
      .select("*")
      .eq(
        "purchase_id",
        id
      );


  if (itemsResult.error) {

    showToast(
      "Fatura kalemleri alınamadı: " +
      itemsResult.error.message
    );

    return;

  }


  purchaseItems =
    (itemsResult.data || []).map(item => {

      const product =
        products.find(
          p =>
            String(p.id) ===
            String(item.product_id)
        );


      return {

        product_id:
          item.product_id,

        product_name:
          product?.name || "",

        code:
          product?.code || "",

        quantity:
          number(item.quantity),

        unit_price:
          number(item.unit_price),

        vat_rate:
          number(item.vat_rate)

      };

    });


  renderPurchaseItems();


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   ALIŞ FATURASI SİL
========================================================= */

async function deletePurchase(id) {

  if (
    !confirm(
      "Bu alış faturasını silmek istediğinize emin misiniz?"
    )
  ) return;


  try {

    await restorePurchaseStock(id);


    const movementDelete =
      await db
        .from("stock_movements")
        .delete()
        .eq("source_type", "purchase")
        .eq("source_id", id);


    if (movementDelete.error) {
      throw movementDelete.error;
    }


    const itemDelete =
      await db
        .from("purchase_items")
        .delete()
        .eq("purchase_id", id);


    if (itemDelete.error) {
      throw itemDelete.error;
    }


    const purchaseDelete =
      await db
        .from("purchases")
        .delete()
        .eq("id", id);


    if (purchaseDelete.error) {
      throw purchaseDelete.error;
    }


    showToast(
      "Alış faturası silindi."
    );


    await loadAll();

  }

  catch (error) {

    console.error(error);

    showToast(
      "Fatura silinemedi: " +
      error.message
    );

  }

}


/* =========================================================
   SATIŞ
========================================================= */

function prepareSalePage() {

  fillPartySelect(
    "saleParty",
    ["customer", "both"]
  );

  fillProductSelect(
    "saleProduct"
  );


  const currency =
    document.getElementById(
      "saleCurrency"
    );

  if (currency && !currency.value) {
    currency.value = "TRY";
  }


  toggleSaleCurrency();

}


function openNewSale() {

  editingSaleId = null;
  saleItems = [];

  const form =
    document.getElementById(
      "saleForm"
    );

  if (form) {
    form.classList.remove("hidden");
  }


  clearSaleFields();

  setText(
    "saleFormTitle",
    "Yeni Satış Faturası"
  );


  const button =
    document.getElementById(
      "saveSaleBtn"
    );

  if (button) {
    button.textContent =
      "💾 Satış Faturasını Kaydet";
  }


  renderSaleItems();

}


function closeSaleForm() {

  editingSaleId = null;
  saleItems = [];

  const form =
    document.getElementById(
      "saleForm"
    );

  if (form) {
    form.classList.add("hidden");
  }

}


/* =========================================================
   SATIŞ ÜRÜN EKLE
========================================================= */

function addSaleItem() {

  const productId =
    document.getElementById(
      "saleProduct"
    )?.value;


  const qty =
    number(
      document.getElementById(
        "saleQty"
      )?.value
    );


  const price =
    number(
      document.getElementById(
        "salePrice"
      )?.value
    );


  const vat =
    number(
      document.getElementById(
        "saleVat"
      )?.value
    );


  if (!productId || qty <= 0) {

    showToast(
      "Ürün ve miktar seçmelisiniz."
    );

    return;

  }


  const product =
    products.find(
      p =>
        String(p.id) ===
        String(productId)
    );


  if (!product) {

    showToast(
      "Ürün bulunamadı."
    );

    return;

  }


  const already =
    saleItems
      .filter(
        x =>
          String(x.product_id) ===
          String(productId)
      )
      .reduce(
        (sum, x) =>
          sum + number(x.quantity),
        0
      );


  if (
    already + qty >
    number(product.stock_quantity)
  ) {

    showToast(
      `Yetersiz stok! Mevcut stok: ${product.stock_quantity}`
    );

    return;

  }


  saleItems.push({

    product_id:
      product.id,

    product_name:
      product.name,

    code:
      product.code,

    quantity:
      qty,

    unit_price:
      price,

    vat_rate:
      vat

  });


  document.getElementById(
    "saleQty"
  ).value = "";


  document.getElementById(
    "salePrice"
  ).value = "";


  renderSaleItems();

}


/* =========================================================
   SATIŞ KALEMLERİ
========================================================= */

function renderSaleItems() {

  const container =
    document.getElementById(
      "saleItems"
    );

  if (!container) return;


  const currency =
    getCurrency(
      "saleCurrency",
      "TRY"
    );


  if (!saleItems.length) {

    container.innerHTML =
      `<div class="empty">
        Faturaya henüz ürün eklenmedi.
      </div>`;

    calculateSaleTotals();

    return;

  }


  container.innerHTML = `

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

        ${saleItems.map(
          (item, index) => {

            const subtotal =
              item.quantity *
              item.unit_price;

            const vatAmount =
              subtotal *
              item.vat_rate /
              100;

            const total =
              subtotal + vatAmount;


            return `

              <tr>

                <td>${index + 1}</td>

                <td>
                  ${escapeHtml(item.code)}
                  -
                  ${escapeHtml(item.product_name)}
                </td>

                <td>${item.quantity}</td>

                <td>
                  ${invoiceMoney(
                    item.unit_price,
                    currency
                  )}
                </td>

                <td>%${item.vat_rate}</td>

                <td>
                  ${invoiceMoney(
                    subtotal,
                    currency
                  )}
                </td>

                <td>
                  ${invoiceMoney(
                    vatAmount,
                    currency
                  )}
                </td>

                <td>
                  <strong>
                    ${invoiceMoney(
                      total,
                      currency
                    )}
                  </strong>
                </td>

                <td>

                  <button
                    class="item-remove"
                    onclick="removeSaleItem(${index})"
                  >
                    ✕
                  </button>

                </td>

              </tr>

            `;

          }
        ).join("")}

      </tbody>

    </table>

  `;


  calculateSaleTotals();

}


function removeSaleItem(index) {

  saleItems.splice(index, 1);

  renderSaleItems();

}


function calculateSaleTotals() {

  let subtotal = 0;
  let vatTotal = 0;


  saleItems.forEach(item => {

    const line =
      item.quantity *
      item.unit_price;

    subtotal += line;

    vatTotal +=
      line *
      item.vat_rate /
      100;

  });


  const currency =
    getCurrency(
      "saleCurrency",
      "TRY"
    );


  setText(
    "saleSubtotal",
    invoiceMoney(
      subtotal,
      currency
    )
  );


  setText(
    "saleVatTotal",
    invoiceMoney(
      vatTotal,
      currency
    )
  );


  setText(
    "saleGrandTotal",
    invoiceMoney(
      subtotal + vatTotal,
      currency
    )
  );


  return {

    subtotal,
    vatTotal,
    total:
      subtotal + vatTotal

  };

}


/* =========================================================
   SATIŞ FATURASI KAYDET
========================================================= */

async function saveSale() {

  if (!saleItems.length) {

    showToast(
      "Faturaya en az bir ürün ekleyin."
    );

    return;

  }


  const partyId =
    document
      .getElementById("saleParty")
      ?.value || null;


  const invoiceNo =
    document
      .getElementById("saleInvoiceNo")
      ?.value
      .trim() || "";


  const invoiceDate =
    document
      .getElementById("saleDate")
      ?.value ||
    today();


  const note =
    document
      .getElementById("saleNote")
      ?.value
      .trim() || "";


  const currency =
    getCurrency(
      "saleCurrency",
      "TRY"
    );


  const exchangeRate =
    currency === "USD"
      ? getExchangeRate(
          "saleExchangeRate"
        )
      : 1;


  const totals =
    calculateSaleTotals();


  try {

    if (editingSaleId) {

      await restoreSaleStock(
        editingSaleId
      );

    }


    for (const item of saleItems) {

      const product =
        products.find(
          p =>
            String(p.id) ===
            String(item.product_id)
        );


      if (!product) {
        throw new Error(
          "Ürün bulunamadı."
        );
      }


      const newStock =
        number(product.stock_quantity) -
        number(item.quantity);


      if (newStock < 0) {

        throw new Error(
          `${product.name} için stok yetersiz.`
        );

      }

    }


    const data = {

      invoice_no: invoiceNo,
      party_id: partyId,
      invoice_date: invoiceDate,
      subtotal: totals.subtotal,
      vat_rate: 0,
      vat_amount: totals.vatTotal,
      total: totals.total,
      note

    };


    data.currency = currency;
    data.exchange_rate = exchangeRate;


    let saleId;


    if (editingSaleId) {

      const result =
        await db
          .from("sales")
          .update(data)
          .eq(
            "id",
            editingSaleId
          )
          .select()
          .single();


      if (result.error) {
        throw result.error;
      }


      saleId =
        result.data.id;


      const deleteItems =
        await db
          .from("sale_items")
          .delete()
          .eq(
            "sale_id",
            saleId
          );


      if (deleteItems.error) {
        throw deleteItems.error;
      }


      const deleteMovements =
        await db
          .from("stock_movements")
          .delete()
          .eq("source_type", "sale")
          .eq("source_id", saleId);


      if (deleteMovements.error) {
        throw deleteMovements.error;
      }

    }

    else {

      const result =
        await db
          .from("sales")
          .insert(data)
          .select()
          .single();


      if (result.error) {
        throw result.error;
      }


      saleId =
        result.data.id;

    }


    const items =
      saleItems.map(item => {

        const subtotal =
          item.quantity *
          item.unit_price;

        const vatAmount =
          subtotal *
          item.vat_rate /
          100;


        return {

          sale_id:
            saleId,

          product_id:
            item.product_id,

          quantity:
            item.quantity,

          unit_price:
            item.unit_price,

          vat_rate:
            item.vat_rate,

          line_subtotal:
            subtotal,

          vat_amount:
            vatAmount,

          line_total:
            subtotal + vatAmount

        };

      });


    const itemsResult =
      await db
        .from("sale_items")
        .insert(items);


    if (itemsResult.error) {
      throw itemsResult.error;
    }


    for (const item of saleItems) {

      const product =
        products.find(
          p =>
            String(p.id) ===
            String(item.product_id)
        );


      if (!product) continue;


      const newStock =
        number(product.stock_quantity) -
        number(item.quantity);


      const updateResult =
        await db
          .from("products")
          .update({

            stock_quantity:
              newStock,

            sale_price:
              item.unit_price

          })
          .eq(
            "id",
            item.product_id
          );


      if (updateResult.error) {
        throw updateResult.error;
      }


      const movementResult =
        await db
          .from("stock_movements")
          .insert({

            product_id:
              item.product_id,

            party_id:
              partyId,

            type:
              "out",

            quantity:
              item.quantity,

            source_type:
              "sale",

            source_id:
              saleId,

            note:
              `Satış faturası ${invoiceNo}`

          });


      if (movementResult.error) {
        throw movementResult.error;
      }

    }


    showToast(
      editingSaleId
        ? "Satış faturası güncellendi."
        : "Satış faturası kaydedildi."
    );


    closeSaleForm();

    await loadAll();

  }

  catch (error) {

    console.error(error);

    showToast(
      "Satış faturası kaydedilemedi: " +
      error.message
    );

  }

}


/* =========================================================
   SATIŞ STOK GERİ AL
========================================================= */

async function restoreSaleStock(saleId) {

  const result =
    await db
      .from("sale_items")
      .select("*")
      .eq(
        "sale_id",
        saleId
      );


  if (result.error) {
    throw result.error;
  }


  for (const item of result.data || []) {

    const product =
      products.find(
        p =>
          String(p.id) ===
          String(item.product_id)
      );


    if (!product) continue;


    const newStock =
      number(product.stock_quantity) +
      number(item.quantity);


    const update =
      await db
        .from("products")
        .update({
          stock_quantity: newStock
        })
        .eq(
          "id",
          item.product_id
        );


    if (update.error) {
      throw update.error;
    }

  }

}


/* =========================================================
   SATIŞ FATURALARI
========================================================= */

function renderSaleHistory() {

  const container =
    document.getElementById(
      "saleHistory"
    );

  if (!container) return;


  if (!sales.length) {

    container.innerHTML =
      `<div class="empty">
        Henüz satış faturası yok.
      </div>`;

    return;

  }


  container.innerHTML = `

    <div class="panel-header">

      <h2>📋 Kayıtlı Satış Faturaları</h2>

      <button
        class="secondary"
        onclick="exportSalesCSV()"
      >
        Excel / CSV
      </button>

    </div>


    <table>

      <thead>

        <tr>

          <th>Fatura No</th>
          <th>Tarih</th>
          <th>Müşteri</th>
          <th>Para Birimi</th>
          <th>Toplam</th>
          <th>İşlem</th>

        </tr>

      </thead>

      <tbody>

        ${sales.map(s => {

          const party =
            parties.find(
              x =>
                String(x.id) ===
                String(s.party_id)
            );


          const currency =
            s.currency ||
            "TRY";


          return `

            <tr
              style="cursor:pointer"
              onclick="editSale('${s.id}')"
            >

              <td>
                <strong>
                  ${escapeHtml(
                    s.invoice_no || "-"
                  )}
                </strong>
              </td>

              <td>
                ${s.invoice_date || "-"}
              </td>

              <td>
                ${escapeHtml(
                  party?.name || "-"
                )}
              </td>

              <td>
                ${currency === "USD"
                  ? "USD"
                  : "TL"}
              </td>

              <td>
                <strong>
                  ${invoiceMoney(
                    s.total,
                    currency
                  )}
                </strong>
              </td>

              <td>

                <button
                  class="secondary"
                  onclick="
                    event.stopPropagation();
                    editSale('${s.id}')
                  "
                >
                  ✏️ Değiştir
                </button>

                <button
                  class="danger"
                  onclick="
                    event.stopPropagation();
                    deleteSale('${s.id}')
                  "
                >
                  Sil
                </button>

              </td>

            </tr>

          `;

        }).join("")}

      </tbody>

    </table>

  `;

}


/* =========================================================
   SATIŞ FATURASI DÜZENLE
========================================================= */

async function editSale(id) {

  const sale =
    sales.find(
      x =>
        String(x.id) ===
        String(id)
    );


  if (!sale) {

    showToast(
      "Fatura bulunamadı."
    );

    return;

  }


  editingSaleId = id;


  const form =
    document.getElementById(
      "saleForm"
    );

  if (form) {
    form.classList.remove("hidden");
  }


  setText(
    "saleFormTitle",
    "Satış Faturasını Düzenle"
  );


  const saveBtn =
    document.getElementById(
      "saveSaleBtn"
    );

  if (saveBtn) {
    saveBtn.textContent =
      "💾 Değişiklikleri Kaydet";
  }


  const invoice =
    document.getElementById(
      "saleInvoiceNo"
    );

  const date =
    document.getElementById(
      "saleDate"
    );

  const party =
    document.getElementById(
      "saleParty"
    );

  const note =
    document.getElementById(
      "saleNote"
    );

  const currency =
    document.getElementById(
      "saleCurrency"
    );

  const rate =
    document.getElementById(
      "saleExchangeRate"
    );


  if (invoice) {
    invoice.value =
      sale.invoice_no || "";
  }

  if (date) {
    date.value =
      sale.invoice_date || today();
  }

  if (party) {
    party.value =
      sale.party_id || "";
  }

  if (note) {
    note.value =
      sale.note || "";
  }

  if (currency) {
    currency.value =
      sale.currency || "TRY";
  }

  if (rate) {
    rate.value =
      sale.exchange_rate || 1;
  }


  toggleSaleCurrency();


  const itemsResult =
    await db
      .from("sale_items")
      .select("*")
      .eq(
        "sale_id",
        id
      );


  if (itemsResult.error) {

    showToast(
      "Fatura kalemleri alınamadı: " +
      itemsResult.error.message
    );

    return;

  }


  saleItems =
    (itemsResult.data || []).map(item => {

      const product =
        products.find(
          p =>
            String(p.id) ===
            String(item.product_id)
        );


      return {

        product_id:
          item.product_id,

        product_name:
          product?.name || "",

        code:
          product?.code || "",

        quantity:
          number(item.quantity),

        unit_price:
          number(item.unit_price),

        vat_rate:
          number(item.vat_rate)

      };

    });


  renderSaleItems();


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   SATIŞ FATURASI SİL
========================================================= */

async function deleteSale(id) {

  if (
    !confirm(
      "Bu satış faturasını silmek istediğinize emin misiniz?"
    )
  ) return;


  try {

    await restoreSaleStock(id);


    const movementDelete =
      await db
        .from("stock_movements")
        .delete()
        .eq("source_type", "sale")
        .eq("source_id", id);


    if (movementDelete.error) {
      throw movementDelete.error;
    }


    const itemDelete =
      await db
        .from("sale_items")
        .delete()
        .eq("sale_id", id);


    if (itemDelete.error) {
      throw itemDelete.error;
    }


    const saleDelete =
      await db
        .from("sales")
        .delete()
        .eq("id", id);


    if (saleDelete.error) {
      throw saleDelete.error;
    }


    showToast(
      "Satış faturası silindi."
    );


    await loadAll();

  }

  catch (error) {

    console.error(error);

    showToast(
      "Fatura silinemedi: " +
      error.message
    );

  }

}


/* =========================================================
   FORM TEMİZLEME
========================================================= */

function clearPurchaseFields() {

  const invoice =
    document.getElementById(
      "purchaseInvoiceNo"
    );

  const date =
    document.getElementById(
      "purchaseDate"
    );

  const party =
    document.getElementById(
      "purchaseParty"
    );

  const note =
    document.getElementById(
      "purchaseNote"
    );

  const currency =
    document.getElementById(
      "purchaseCurrency"
    );

  const rate =
    document.getElementById(
      "purchaseExchangeRate"
    );


  if (invoice) {
    invoice.value = "";
  }

  if (date) {
    date.value = today();
  }

  if (party) {
    party.value = "";
  }

  if (note) {
    note.value = "";
  }

  if (currency) {
    currency.value = "TRY";
  }

  if (rate) {
    rate.value = "1";
  }


  togglePurchaseCurrency();

}


function clearSaleFields() {

  const invoice =
    document.getElementById(
      "saleInvoiceNo"
    );

  const date =
    document.getElementById(
      "saleDate"
    );

  const party =
    document.getElementById(
      "saleParty"
    );

  const note =
    document.getElementById(
      "saleNote"
    );

  const currency =
    document.getElementById(
      "saleCurrency"
    );

  const rate =
    document.getElementById(
      "saleExchangeRate"
    );


  if (invoice) {
    invoice.value = "";
  }

  if (date) {
    date.value = today();
  }

  if (party) {
    party.value = "";
  }

  if (note) {
    note.value = "";
  }

  if (currency) {
    currency.value = "TRY";
  }

  if (rate) {
    rate.value = "1";
  }


  toggleSaleCurrency();

}


function clearPurchase() {

  editingPurchaseId = null;
  purchaseItems = [];

  clearPurchaseFields();

  renderPurchaseItems();

}


function clearSale() {

  editingSaleId = null;
  saleItems = [];

  clearSaleFields();

  renderSaleItems();

}


/* =========================================================
   STOK HAREKETLERİ
========================================================= */

function renderMovements() {

  const container =
    document.getElementById(
      "movementsTable"
    );

  if (!container) return;


  if (!movements.length) {

    container.innerHTML =
      `<div class="empty">
        Henüz stok hareketi yok.
      </div>`;

    return;

  }


  container.innerHTML = `

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

          const product =
            products.find(
              p =>
                String(p.id) ===
                String(m.product_id)
            );


          return `

            <tr>

              <td>
                ${
                  m.created_at
                    ? new Date(
                        m.created_at
                      ).toLocaleString(
                        "tr-TR"
                      )
                    : "-"
                }
              </td>

              <td>
                ${escapeHtml(
                  product?.name || "-"
                )}
              </td>

              <td>

                <span class="badge ${
                  m.type === "in"
                    ? "badge-in"
                    : "badge-out"
                }">

                  ${
                    m.type === "in"
                      ? "Giriş"
                      : "Çıkış"
                  }

                </span>

              </td>

              <td>
                ${number(m.quantity)}
              </td>

              <td>
                ${escapeHtml(
                  m.note || "-"
                )}
              </td>

            </tr>

          `;

        }).join("")}

      </tbody>

    </table>

  `;

}


function openMovementForm() {

  openModal(

    "Manuel Stok Hareketi",

    `

      <div class="form-group">

        <label>Ürün</label>

        <select id="movementProduct">

          <option value="">
            Ürün seçin...
          </option>

          ${products.map(p => `

            <option value="${p.id}">
              ${escapeHtml(p.code)}
              -
              ${escapeHtml(p.name)}
            </option>

          `).join("")}

        </select>

      </div>


      <div class="form-grid">

        <div class="form-group">

          <label>Hareket</label>

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

          <label>Miktar</label>

          <input
            id="movementQty"
            type="number"
            min="0.01"
            step="0.01"
          >

        </div>

      </div>


      <div class="form-group">

        <label>Açıklama</label>

        <textarea id="movementNote"></textarea>

      </div>


      <div class="form-buttons">

        <button
          class="secondary"
          type="button"
          onclick="closeModal()"
        >
          Vazgeç
        </button>

        <button
          class="success"
          type="button"
          onclick="saveMovement()"
        >
          Kaydet
        </button>

      </div>

    `

  );

}


async function saveMovement() {

  const productId =
    document
      .getElementById("movementProduct")
      ?.value;


  const type =
    document
      .getElementById("movementType")
      ?.value;


  const qty =
    number(
      document
        .getElementById("movementQty")
        ?.value
    );


  const note =
    document
      .getElementById("movementNote")
      ?.value
      .trim() || "";


  if (!productId || qty <= 0) {

    showToast(
      "Ürün ve miktar zorunludur."
    );

    return;

  }


  const product =
    products.find(
      p =>
        String(p.id) ===
        String(productId)
    );


  if (!product) {

    showToast(
      "Ürün bulunamadı."
    );

    return;

  }


  let newStock;


  if (type === "in") {

    newStock =
      number(product.stock_quantity) +
      qty;

  }

  else {

    newStock =
      number(product.stock_quantity) -
      qty;


    if (newStock < 0) {

      showToast(
        "Yetersiz stok."
      );

      return;

    }

  }


  try {

    const updateResult =
      await db
        .from("products")
        .update({
          stock_quantity: newStock
        })
        .eq(
          "id",
          productId
        );


    if (updateResult.error) {
      throw updateResult.error;
    }


    const movementResult =
      await db
        .from("stock_movements")
        .insert({

          product_id:
            productId,

          type,

          quantity:
            qty,

          source_type:
            "manual",

          note

        });


    if (movementResult.error) {
      throw movementResult.error;
    }


    closeModal();

    showToast(
      "Stok hareketi kaydedildi."
    );

    await loadAll();

  }

  catch (error) {

    console.error(error);

    showToast(
      "Hareket kaydedilemedi: " +
      error.message
    );

  }

}


/* =========================================================
   RAPORLAR
========================================================= */

function renderReports() {

  const purchaseTotal =
    purchases.reduce(
      (sum, x) =>
        sum + number(x.total),
      0
    );


  const saleTotal =
    sales.reduce(
      (sum, x) =>
        sum + number(x.total),
      0
    );


  setText(
    "purchaseCount",
    purchases.length
  );

  setText(
    "saleCount",
    sales.length
  );

  setText(
    "reportPurchaseTotal",
    money(purchaseTotal)
  );

  setText(
    "reportSaleTotal",
    money(saleTotal)
  );


  const container =
    document.getElementById(
      "reportSummary"
    );

  if (!container) return;


  const difference =
    saleTotal - purchaseTotal;


  const totalVatPurchase =
    purchases.reduce(
      (sum, x) =>
        sum + number(x.vat_amount),
      0
    );


  const totalVatSale =
    sales.reduce(
      (sum, x) =>
        sum + number(x.vat_amount),
      0
    );


  container.innerHTML = `

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
        Toplam alış
      </span>

      <strong>
        ${money(purchaseTotal)}
      </strong>

    </div>


    <div class="report-row">

      <span>
        Toplam satış
      </span>

      <strong>
        ${money(saleTotal)}
      </strong>

    </div>


    <div class="report-row">

      <span>
        Alış KDV
      </span>

      <strong>
        ${money(totalVatPurchase)}
      </strong>

    </div>


    <div class="report-row">

      <span>
        Satış KDV
      </span>

      <strong>
        ${money(totalVatSale)}
      </strong>

    </div>


    <div class="report-row">

      <span>
        Satış - Alış
      </span>

      <strong class="${
        difference >= 0
          ? "text-success"
          : "text-danger"
      }">

        ${money(difference)}

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
      .map(row =>
        row.map(value => {

          const text =
            String(value ?? "");

          return `"${text.replaceAll(
            '"',
            '""'
          )}"`;

        }).join(";")
      )
      .join("\n");


  const blob =
    new Blob(
      ["\uFEFF" + csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");


  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);

}


function exportPurchasesCSV() {

  const rows = [

    [
      "Fatura No",
      "Tarih",
      "Tedarikçi",
      "Para Birimi",
      "Kur",
      "Matrah",
      "KDV",
      "Genel Toplam"
    ]

  ];


  purchases.forEach(p => {

    const party =
      parties.find(
        x =>
          String(x.id) ===
          String(p.party_id)
      );


    rows.push([

      p.invoice_no || "",

      p.invoice_date || "",

      party?.name || "",

      p.currency || "TRY",

      p.exchange_rate || 1,

      p.subtotal || 0,

      p.vat_amount || 0,

      p.total || 0

    ]);

  });


  downloadCSV(
    "alis_faturalari.csv",
    rows
  );

}


function exportSalesCSV() {

  const rows = [

    [
      "Fatura No",
      "Tarih",
      "Müşteri",
      "Para Birimi",
      "Kur",
      "Matrah",
      "KDV",
      "Genel Toplam"
    ]

  ];


  sales.forEach(s => {

    const party =
      parties.find(
        x =>
          String(x.id) ===
          String(s.party_id)
      );


    rows.push([

      s.invoice_no || "",

      s.invoice_date || "",

      party?.name || "",

      s.currency || "TRY",

      s.exchange_rate || 1,

      s.subtotal || 0,

      s.vat_amount || 0,

      s.total || 0

    ]);

  });


  downloadCSV(
    "satis_faturalari.csv",
    rows
  );

}


/* =========================================================
   ESKİ FONKSİYON UYUMLULUĞU
========================================================= */

function renderDocuments() {
  return;
}


/* =========================================================
   MODAL KAPATMA
========================================================= */

document.addEventListener(
  "click",
  event => {

    const modal =
      document.getElementById("modal");


    if (
      modal &&
      event.target === modal
    ) {

      closeModal();

    }

  }
);


document.addEventListener(
  "keydown",
  event => {

    if (event.key === "Escape") {

      closeModal();

    }

  }
);
