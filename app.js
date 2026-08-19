const db = window.supabaseClient;

let products = [];
let parties = [];
let purchases = [];
let sales = [];
let movements = [];

let purchaseItems = [];
let saleItems = [];

let purchaseCurrency = "TRY";
let saleCurrency = "TRY";

let purchaseRate = 1;
let saleRate = 1;


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

  setupCurrencyAreas();

});


/* =========================================================
   GENEL
========================================================= */

function number(value) {
  return Number(value || 0);
}


function money(value, currency = "TRY") {

  const symbol =
    currency === "USD"
      ? "$"
      : "₺";

  return Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " " + symbol;

}


function today() {
  return new Date().toISOString().slice(0, 10);
}


function setText(id, value) {

  const element =
    document.getElementById(id);

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

  const toast =
    document.getElementById("toast");

  if (!toast) return;

  toast.textContent = message;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);

}


/* =========================================================
   MENÜ
========================================================= */

function setupNavigation() {

  document.querySelectorAll(".menu").forEach(button => {

    button.addEventListener("click", () => {

      const page =
        button.dataset.page;

      document
        .querySelectorAll(".menu")
        .forEach(x =>
          x.classList.remove("active")
        );

      button.classList.add("active");

      document
        .querySelectorAll(".page")
        .forEach(x =>
          x.classList.add("hidden")
        );

      const target =
        document.getElementById(page);

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
        documents: "Faturalar",
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
        setupCurrencyAreas();
      }

      if (page === "sales") {
        prepareSalePage();
        renderSaleItems();
        setupCurrencyAreas();
      }

      if (page === "movements") {
        renderMovements();
      }

      if (page === "parties") {
        renderParties();
      }

      if (page === "documents") {
        renderDocuments();
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

    const results =
      await Promise.all([

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
          .order(
            "invoice_date",
            {
              ascending: false
            }
          ),

        db
          .from("sales")
          .select("*")
          .order(
            "invoice_date",
            {
              ascending: false
            }
          ),

        db
          .from("stock_movements")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false
            }
          )

      ]);


    for (const result of results) {

      if (result.error) {
        throw result.error;
      }

    }


    products =
      results[0].data || [];

    parties =
      results[1].data || [];

    purchases =
      results[2].data || [];

    sales =
      results[3].data || [];

    movements =
      results[4].data || [];


    renderDashboard();
    renderProducts();
    renderParties();
    renderMovements();
    renderDocuments();
    renderReports();

    preparePurchasePage();
    prepareSalePage();

    setupCurrencyAreas();

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

  setText(
    "totalProducts",
    products.length
  );


  const totalStock =
    products.reduce(
      (sum, p) =>
        sum + number(p.stock_quantity),
      0
    );


  const critical =
    products.filter(
      p =>
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
      .filter(
        x =>
          x.invoice_date === today()
      )
      .reduce(
        (sum, x) =>
          sum + number(x.total),
        0
      );


  setText(
    "totalStock",
    totalStock
  );

  setText(
    "criticalProducts",
    critical
  );

  setText(
    "totalParties",
    parties.length
  );

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
    money(
      totalSales - totalPurchases
    )
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
    products.filter(
      p =>
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

              <td>
                ${escapeHtml(p.code)}
              </td>

              <td>
                ${escapeHtml(p.name)}
              </td>

              <td>
                ${number(p.stock_quantity)}
              </td>

              <td>
                ${number(p.critical_stock)}
              </td>

              <td>
                ${money(p.purchase_price)}
              </td>

              <td>
                ${money(p.sale_price)}
              </td>

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
      x =>
        String(x.id) ===
        String(id)
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
            value="${escapeHtml(
              product?.code || ""
            )}"
          >

        </div>


        <div class="form-group">

          <label>Ürün Adı</label>

          <input
            id="formProductName"
            value="${escapeHtml(
              product?.name || ""
            )}"
          >

        </div>


        <div class="form-group">

          <label>Mevcut Stok</label>

          <input
            id="formProductStock"
            type="number"
            step="0.01"
            value="${number(
              product?.stock_quantity
            )}"
          >

        </div>


        <div class="form-group">

          <label>Kritik Stok</label>

          <input
            id="formProductCritical"
            type="number"
            step="0.01"
            value="${number(
              product?.critical_stock || 5
            )}"
          >

        </div>


        <div class="form-group">

          <label>Alış Fiyatı</label>

          <input
            id="formProductPurchase"
            type="number"
            step="0.01"
            value="${number(
              product?.purchase_price
            )}"
          >

        </div>


        <div class="form-group">

          <label>Satış Fiyatı</label>

          <input
            id="formProductSale"
            type="number"
            step="0.01"
            value="${number(
              product?.sale_price
            )}"
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

    stock_quantity:
      stock,

    critical_stock:
      critical,

    purchase_price:
      purchase,

    sale_price:
      sale

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


    showToast(
      "Ürün silindi."
    );

    await loadAll();

  }

  catch (error) {

    console.error(error);

    showToast(
      "Ürün silinemedi."
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

            <td>
              ${escapeHtml(p.name)}
            </td>

            <td>
              ${partyType(p.type)}
            </td>

            <td>
              ${escapeHtml(
                p.phone || "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                p.email || "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                p.tax_number || "-"
              )}
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
      x =>
        String(x.id) ===
        String(id)
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
          value="${escapeHtml(
            party?.name || ""
          )}"
        >

      </div>


      <div class="form-grid">

        <div class="form-group">

          <label>Cari Tipi</label>

          <select id="formPartyType">

            <option
              value="customer"
              ${
                party?.type === "customer"
                  ? "selected"
                  : ""
              }
            >
              Müşteri
            </option>

            <option
              value="supplier"
              ${
                party?.type === "supplier"
                  ? "selected"
                  : ""
              }
            >
              Tedarikçi
            </option>

            <option
              value="both"
              ${
                party?.type === "both"
                  ? "selected"
                  : ""
              }
            >
              Müşteri + Tedarikçi
            </option>

          </select>

        </div>


        <div class="form-group">

          <label>Telefon</label>

          <input
            id="formPartyPhone"
            value="${escapeHtml(
              party?.phone || ""
            )}"
          >

        </div>


        <div class="form-group">

          <label>E-posta</label>

          <input
            id="formPartyEmail"
            value="${escapeHtml(
              party?.email || ""
            )}"
          >

        </div>


        <div class="form-group">

          <label>Vergi No</label>

          <input
            id="formPartyTax"
            value="${escapeHtml(
              party?.tax_number || ""
            )}"
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
    document.getElementById(
      "modalTitle"
    );

  const form =
    document.getElementById(
      "modalForm"
    );

  const modal =
    document.getElementById(
      "modal"
    );


  if (
    !titleElement ||
    !form ||
    !modal
  ) return;


  titleElement.textContent =
    title;

  form.innerHTML =
    content;

  modal.classList.remove(
    "hidden"
  );

}


function closeModal() {

  const modal =
    document.getElementById(
      "modal"
    );

  if (modal) {
    modal.classList.add(
      "hidden"
    );
  }

}


/* =========================================================
   PARA BİRİMİ
========================================================= */

function setupCurrencyAreas() {

  setupCurrencyArea(
    "purchase"
  );

  setupCurrencyArea(
    "sale"
  );

}


function setupCurrencyArea(type) {

  const prefix =
    type === "purchase"
      ? "purchase"
      : "sale";


  const productId =
    `${prefix}Product`;

  const product =
    document.getElementById(productId);

  if (!product) return;


  if (
    document.getElementById(
      `${prefix}CurrencyBox`
    )
  ) {

    updateCurrencyVisibility(
      type
    );

    return;

  }


  const invoiceNo =
    document.getElementById(
      `${prefix}InvoiceNo`
    );


  if (!invoiceNo) return;


  const box =
    document.createElement("div");

  box.id =
    `${prefix}CurrencyBox`;

  box.style.marginBottom =
    "15px";

  box.innerHTML = `

    <div
      style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:15px;
        background:#f9fafb;
        padding:15px;
        border-radius:8px;
      "
    >

      <div>

        <label>Fatura Para Birimi</label>

        <select id="${prefix}Currency">

          <option value="TRY">
            TL
          </option>

          <option value="USD">
            USD
          </option>

        </select>

      </div>


      <div
        id="${prefix}RateWrap"
        style="display:none;"
      >

        <label>
          Fatura Kuru (1 USD = TL)
        </label>

        <input
          id="${prefix}Rate"
          type="number"
          min="0"
          step="0.0001"
          placeholder="Örn: 40.2500"
        >

      </div>

    </div>

  `;


  const parent =
    invoiceNo.parentElement;


  parent.parentElement.insertBefore(
    box,
    parent.nextSibling
  );


  document
    .getElementById(`${prefix}Currency`)
    ?.addEventListener(
      "change",
      () => {

        if (type === "purchase") {

          purchaseCurrency =
            document
              .getElementById(
                "purchaseCurrency"
              )
              .value;

        }

        else {

          saleCurrency =
            document
              .getElementById(
                "saleCurrency"
              )
              .value;

        }

        updateCurrencyVisibility(
          type
        );

        renderInvoiceItemsByType(
          type
        );

      }
    );


  document
    .getElementById(`${prefix}Rate`)
    ?.addEventListener(
      "input",
      () => {

        if (type === "purchase") {

          purchaseRate =
            number(
              document
                .getElementById(
                  "purchaseRate"
                )
                .value
            );

        }

        else {

          saleRate =
            number(
              document
                .getElementById(
                  "saleRate"
                )
                .value
            );

        }

        calculatePurchaseTotals();
        calculateSaleTotals();

      }
    );


  updateCurrencyVisibility(
    type
  );

}


function updateCurrencyVisibility(type) {

  const prefix =
    type === "purchase"
      ? "purchase"
      : "sale";


  const currency =
    document
      .getElementById(
        `${prefix}Currency`
      );


  const rateWrap =
    document
      .getElementById(
        `${prefix}RateWrap`
      );


  if (!currency || !rateWrap) return;


  const value =
    currency.value;


  if (type === "purchase") {
    purchaseCurrency = value;
  }

  else {
    saleCurrency = value;
  }


  if (value === "USD") {

    rateWrap.style.display =
      "block";

  }

  else {

    rateWrap.style.display =
      "none";

  }

}


function getPurchaseCurrency() {

  return (
    document
      .getElementById(
        "purchaseCurrency"
      )
      ?.value ||
    purchaseCurrency ||
    "TRY"
  );

}


function getSaleCurrency() {

  return (
    document
      .getElementById(
        "saleCurrency"
      )
      ?.value ||
    saleCurrency ||
    "TRY"
  );

}


function getPurchaseRate() {

  const currency =
    getPurchaseCurrency();

  if (currency !== "USD") {
    return 1;
  }


  return number(
    document
      .getElementById(
        "purchaseRate"
      )
      ?.value
  );

}


function getSaleRate() {

  const currency =
    getSaleCurrency();

  if (currency !== "USD") {
    return 1;
  }


  return number(
    document
      .getElementById(
        "saleRate"
      )
      ?.value
  );

}


/* =========================================================
   SATIN ALMA
========================================================= */

function preparePurchasePage() {

  fillPartySelect(
    "purchaseParty",
    [
      "supplier",
      "both"
    ]
  );

  fillProductSelect(
    "purchaseProduct"
  );

  setupCurrencyArea(
    "purchase"
  );

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
    parties.filter(
      p =>
        allowedTypes.includes(
          p.type
        )
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
   ALIŞ ÜRÜN EKLE
========================================================= */

function addPurchaseItem() {

  const productSelect =
    document.getElementById(
      "purchaseProduct"
    );

  const qtyInput =
    document.getElementById(
      "purchaseQty"
    );

  const priceInput =
    document.getElementById(
      "purchasePrice"
    );

  const vatSelect =
    document.getElementById(
      "purchaseVat"
    );


  if (
    !productSelect ||
    !qtyInput ||
    !priceInput ||
    !vatSelect
  ) {

    showToast(
      "Satın alma alanları bulunamadı."
    );

    return;

  }


  const productId =
    productSelect.value;


  const qty =
    number(
      qtyInput.value
    );


  const price =
    number(
      priceInput.value
    );


  const vat =
    number(
      vatSelect.value
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


  const currency =
    getPurchaseCurrency();


  if (
    currency === "USD" &&
    getPurchaseRate() <= 0
  ) {

    showToast(
      "USD fatura için kur girin."
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
      "Seçilen ürün bulunamadı."
    );

    return;

  }


  purchaseItems.push({

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


  qtyInput.value = "";
  priceInput.value = "";


  renderPurchaseItems();

  showToast(
    "Ürün faturaya eklendi."
  );

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


  if (!purchaseItems.length) {

    container.innerHTML =
      `<div class="empty">
        Faturaya henüz ürün eklenmedi.
      </div>`;

    calculatePurchaseTotals();

    return;

  }


  const currency =
    getPurchaseCurrency();


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
              subtotal +
              vatAmount;


            return `

              <tr>

                <td>
                  ${index + 1}
                </td>

                <td>
                  ${escapeHtml(item.code)}
                  -
                  ${escapeHtml(
                    item.product_name
                  )}
                </td>

                <td>
                  ${item.quantity}
                </td>

                <td>
                  ${money(
                    item.unit_price,
                    currency
                  )}
                </td>

                <td>
                  %${item.vat_rate}
                </td>

                <td>
                  ${money(
                    subtotal,
                    currency
                  )}
                </td>

                <td>
                  ${money(
                    vatAmount,
                    currency
                  )}
                </td>

                <td>
                  ${money(
                    total,
                    currency
                  )}
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

  purchaseItems.splice(
    index,
    1
  );

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
    getPurchaseCurrency();


  setText(
    "purchaseSubtotal",
    money(
      subtotal,
      currency
    )
  );

  setText(
    "purchaseVatTotal",
    money(
      vatTotal,
      currency
    )
  );

  setText(
    "purchaseGrandTotal",
    money(
      subtotal + vatTotal,
      currency
    )
  );


  const rate =
    getPurchaseRate();


  const tlTotal =
    (subtotal + vatTotal) *
    rate;


  let tlElement =
    document.getElementById(
      "purchaseGrandTotalTL"
    );


  if (
    currency === "USD" &&
    rate > 0
  ) {

    if (!tlElement) {

      const total =
        document.querySelector(
          "#purchaseGrandTotal"
        );

      if (
        total &&
        total.parentElement
      ) {

        tlElement =
          document.createElement(
            "div"
          );

        tlElement.id =
          "purchaseGrandTotalTL";

        tlElement.style.marginTop =
          "8px";

        tlElement.style.fontWeight =
          "600";

        total.parentElement.appendChild(
          tlElement
        );

      }

    }


    if (tlElement) {

      tlElement.textContent =
        "TL Karşılığı: " +
        money(tlTotal);

    }

  }

  else if (tlElement) {

    tlElement.remove();

  }


  return {

    subtotal,
    vatTotal,

    total:
      subtotal + vatTotal,

    currency,

    exchangeRate:
      rate,

    totalTL:
      tlTotal

  };

}


/* =========================================================
   SATIŞ
========================================================= */

function prepareSalePage() {

  fillPartySelect(
    "saleParty",
    [
      "customer",
      "both"
    ]
  );

  fillProductSelect(
    "saleProduct"
  );

  setupCurrencyArea(
    "sale"
  );

}


function addSaleItem() {

  const productSelect =
    document.getElementById(
      "saleProduct"
    );

  const qtyInput =
    document.getElementById(
      "saleQty"
    );

  const priceInput =
    document.getElementById(
      "salePrice"
    );

  const vatSelect =
    document.getElementById(
      "saleVat"
    );


  if (
    !productSelect ||
    !qtyInput ||
    !priceInput ||
    !vatSelect
  ) {

    showToast(
      "Satış alanları bulunamadı."
    );

    return;

  }


  const productId =
    productSelect.value;


  const qty =
    number(
      qtyInput.value
    );


  const price =
    number(
      priceInput.value
    );


  const vat =
    number(
      vatSelect.value
    );


  if (!productId || qty <= 0) {

    showToast(
      "Ürün ve miktar seçmelisiniz."
    );

    return;

  }


  const currency =
    getSaleCurrency();


  if (
    currency === "USD" &&
    getSaleRate() <= 0
  ) {

    showToast(
      "USD fatura için kur girin."
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


  qtyInput.value = "";
  priceInput.value = "";


  renderSaleItems();

  showToast(
    "Ürün faturaya eklendi."
  );

}


function renderSaleItems() {

  const container =
    document.getElementById(
      "saleItems"
    );

  if (!container) return;


  if (!saleItems.length) {

    container.innerHTML =
      `<div class="empty">
        Faturaya henüz ürün eklenmedi.
      </div>`;

    calculateSaleTotals();

    return;

  }


  const currency =
    getSaleCurrency();


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
              subtotal +
              vatAmount;


            return `

              <tr>

                <td>
                  ${index + 1}
                </td>

                <td>
                  ${escapeHtml(item.code)}
                  -
                  ${escapeHtml(
                    item.product_name
                  )}
                </td>

                <td>
                  ${item.quantity}
                </td>

                <td>
                  ${money(
                    item.unit_price,
                    currency
                  )}
                </td>

                <td>
                  %${item.vat_rate}
                </td>

                <td>
                  ${money(
                    subtotal,
                    currency
                  )}
                </td>

                <td>
                  ${money(
                    vatAmount,
                    currency
                  )}
                </td>

                <td>
                  ${money(
                    total,
                    currency
                  )}
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

  saleItems.splice(
    index,
    1
  );

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
    getSaleCurrency();


  setText(
    "saleSubtotal",
    money(
      subtotal,
      currency
    )
  );

  setText(
    "saleVatTotal",
    money(
      vatTotal,
      currency
    )
  );

  setText(
    "saleGrandTotal",
    money(
      subtotal + vatTotal,
      currency
    )
  );


  const rate =
    getSaleRate();


  const tlTotal =
    (subtotal + vatTotal) *
    rate;


  let tlElement =
    document.getElementById(
      "saleGrandTotalTL"
    );


  if (
    currency === "USD" &&
    rate > 0
  ) {

    if (!tlElement) {

      const total =
        document.querySelector(
          "#saleGrandTotal"
        );

      if (
        total &&
        total.parentElement
      ) {

        tlElement =
          document.createElement(
            "div"
          );

        tlElement.id =
          "saleGrandTotalTL";

        tlElement.style.marginTop =
          "8px";

        tlElement.style.fontWeight =
          "600";

        total.parentElement.appendChild(
          tlElement
        );

      }

    }


    if (tlElement) {

      tlElement.textContent =
        "TL Karşılığı: " +
        money(tlTotal);

    }

  }

  else if (tlElement) {

    tlElement.remove();

  }


  return {

    subtotal,
    vatTotal,

    total:
      subtotal + vatTotal,

    currency,

    exchangeRate:
      rate,

    totalTL:
      tlTotal

  };

}


function renderInvoiceItemsByType(type) {

  if (type === "purchase") {

    renderPurchaseItems();

  }

  else {

    renderSaleItems();

  }

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
      .getElementById(
        "purchaseParty"
      )
      ?.value || null;


  const invoiceNo =
    document
      .getElementById(
        "purchaseInvoiceNo"
      )
      ?.value
      .trim() || "";


  const invoiceDate =
    document
      .getElementById(
        "purchaseDate"
      )
      ?.value ||
    today();


  const note =
    document
      .getElementById(
        "purchaseNote"
      )
      ?.value
      .trim() || "";


  const totals =
    calculatePurchaseTotals();


  if (
    totals.currency === "USD" &&
    totals.exchangeRate <= 0
  ) {

    showToast(
      "USD fatura için kur girmelisiniz."
    );

    return;

  }


  try {

    const invoiceData = {

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

      note

    };


    /*
      Önce yeni para birimi alanlarıyla deniyoruz.
      Eğer Supabase tablosunda bu kolonlar henüz yoksa
      eski yapıya geri dönüyoruz.
    */

    let purchaseResult =
      await db
        .from("purchases")
        .insert({

          ...invoiceData,

          currency:
            totals.currency,

          exchange_rate:
            totals.exchangeRate,

          total_tl:
            totals.totalTL

        })
        .select()
        .single();


    if (
      purchaseResult.error &&
      /column|schema cache|currency|exchange_rate|total_tl/i
        .test(
          purchaseResult.error.message
        )
    ) {

      purchaseResult =
        await db
          .from("purchases")
          .insert(
            invoiceData
          )
          .select()
          .single();

    }


    if (purchaseResult.error) {
      throw purchaseResult.error;
    }


    const purchaseId =
      purchaseResult.data.id;


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
            subtotal +
            vatAmount

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
        number(
          product.stock_quantity
        ) +
        number(
          item.quantity
        );


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
      "Alış faturası başarıyla kaydedildi."
    );


    clearPurchase();

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
      .getElementById(
        "saleParty"
      )
      ?.value || null;


  const invoiceNo =
    document
      .getElementById(
        "saleInvoiceNo"
      )
      ?.value
      .trim() || "";


  const invoiceDate =
    document
      .getElementById(
        "saleDate"
      )
      ?.value ||
    today();


  const note =
    document
      .getElementById(
        "saleNote"
      )
      ?.value
      .trim() || "";


  const totals =
    calculateSaleTotals();


  if (
    totals.currency === "USD" &&
    totals.exchangeRate <= 0
  ) {

    showToast(
      "USD fatura için kur girmelisiniz."
    );

    return;

  }


  for (const item of saleItems) {

    const product =
      products.find(
        p =>
          String(p.id) ===
          String(item.product_id)
      );


    if (!product) {

      showToast(
        "Ürün bulunamadı."
      );

      return;

    }


    if (
      number(item.quantity) >
      number(product.stock_quantity)
    ) {

      showToast(
        `${product.name} için yeterli stok yok.`
      );

      return;

    }

  }


  try {

    const invoiceData = {

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

      note

    };


    let saleResult =
      await db
        .from("sales")
        .insert({

          ...invoiceData,

          currency:
            totals.currency,

          exchange_rate:
            totals.exchangeRate,

          total_tl:
            totals.totalTL

        })
        .select()
        .single();


    if (
      saleResult.error &&
      /column|schema cache|currency|exchange_rate|total_tl/i
        .test(
          saleResult.error.message
        )
    ) {

      saleResult =
        await db
          .from("sales")
          .insert(
            invoiceData
          )
          .select()
          .single();

    }


    if (saleResult.error) {
      throw saleResult.error;
    }


    const saleId =
      saleResult.data.id;


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
            subtotal +
            vatAmount

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
        number(
          product.stock_quantity
        ) -
        number(
          item.quantity
        );


      if (newStock < 0) {

        throw new Error(
          `${product.name} için stok yetersiz.`
        );

      }


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
      "Satış faturası başarıyla kaydedildi."
    );


    clearSale();

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
   FATURA TEMİZLE
========================================================= */

function clearPurchase() {

  purchaseItems = [];

  purchaseCurrency = "TRY";
  purchaseRate = 1;


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
      "purchaseRate"
    );


  if (invoice) invoice.value = "";

  if (date) date.value = today();

  if (party) party.value = "";

  if (note) note.value = "";

  if (currency) currency.value = "TRY";

  if (rate) rate.value = "";


  updateCurrencyVisibility(
    "purchase"
  );

  renderPurchaseItems();

}


function clearSale() {

  saleItems = [];

  saleCurrency = "TRY";
  saleRate = 1;


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
      "saleRate"
    );


  if (invoice) invoice.value = "";

  if (date) date.value = today();

  if (party) party.value = "";

  if (note) note.value = "";

  if (currency) currency.value = "TRY";

  if (rate) rate.value = "";


  updateCurrencyVisibility(
    "sale"
  );

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

        <textarea
          id="movementNote"
        ></textarea>

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
      .getElementById(
        "movementProduct"
      )
      ?.value;


  const type =
    document
      .getElementById(
        "movementType"
      )
      ?.value;


  const qty =
    number(
      document
        .getElementById(
          "movementQty"
        )
        ?.value
    );


  const note =
    document
      .getElementById(
        "movementNote"
      )
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
      number(
        product.stock_quantity
      ) + qty;

  }

  else {

    newStock =
      number(
        product.stock_quantity
      ) - qty;


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
          stock_quantity:
            newStock
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
   FATURALAR
========================================================= */

function getInvoiceCurrency(invoice) {

  if (
    invoice?.currency === "USD"
  ) {
    return "USD";
  }

  return "TRY";

}


function getInvoiceRate(invoice) {

  const rate =
    number(
      invoice?.exchange_rate
    );

  return rate > 0
    ? rate
    : 1;

}


function renderDocuments() {

  const container =
    document.getElementById(
      "documentsTable"
    );

  if (!container) return;


  const purchaseRows =
    purchases.map(p => {

      const party =
        parties.find(
          x =>
            String(x.id) ===
            String(p.party_id)
        );


      const currency =
        getInvoiceCurrency(p);


      return `

        <tr
          onclick="openPurchaseDetails('${p.id}')"
          style="cursor:pointer;"
          title="Fatura detayını aç"
        >

          <td>
            ${escapeHtml(
              p.invoice_no || "-"
            )}
          </td>

          <td>
            ${p.invoice_date || "-"}
          </td>

          <td>
            <span class="badge badge-in">
              Alış
            </span>
          </td>

          <td>
            ${escapeHtml(
              party?.name || "-"
            )}
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

    }).join("");


  const saleRows =
    sales.map(s => {

      const party =
        parties.find(
          x =>
            String(x.id) ===
            String(s.party_id)
        );


      const currency =
        getInvoiceCurrency(s);


      return `

        <tr
          onclick="openSaleDetails('${s.id}')"
          style="cursor:pointer;"
          title="Fatura detayını aç"
        >

          <td>
            ${escapeHtml(
              s.invoice_no || "-"
            )}
          </td>

          <td>
            ${s.invoice_date || "-"}
          </td>

          <td>
            <span class="badge badge-out">
              Satış
            </span>
          </td>

          <td>
            ${escapeHtml(
              party?.name || "-"
            )}
          </td>

          <td>
            ${money(
              s.subtotal,
              currency
            )}
          </td>

          <td>
            ${money(
              s.vat_amount,
              currency
            )}
          </td>

          <td>
            <strong>
              ${money(
                s.total,
                currency
              )}
            </strong>
          </td>

        </tr>

      `;

    }).join("");


  if (
    !purchaseRows &&
    !saleRows
  ) {

    container.innerHTML =
      `<div class="empty">
        Henüz fatura kaydı yok.
      </div>`;

    return;

  }


  container.innerHTML = `

    <table>

      <thead>

        <tr>

          <th>Fatura No</th>
          <th>Tarih</th>
          <th>Tür</th>
          <th>Cari</th>
          <th>Matrah</th>
          <th>KDV</th>
          <th>Genel Toplam</th>

        </tr>

      </thead>

      <tbody>

        ${purchaseRows}
        ${saleRows}

      </tbody>

    </table>

    <div
      style="
        margin-top:10px;
        color:#6b7280;
        font-size:13px;
      "
    >
      Fatura detayını görmek için satıra tıklayın.
    </div>

  `;

}


/* =========================================================
   ALIŞ FATURA DETAY
========================================================= */

async function openPurchaseDetails(id) {

  try {

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


    const party =
      parties.find(
        x =>
          String(x.id) ===
          String(purchase.party_id)
      );


    const result =
      await db
        .from("purchase_items")
        .select("*")
        .eq(
          "purchase_id",
          id
        );


    if (result.error) {
      throw result.error;
    }


    const items =
      result.data || [];


    const currency =
      getInvoiceCurrency(
        purchase
      );


    const rate =
      getInvoiceRate(
        purchase
      );


    const itemRows =
      items.map(
        (item, index) => {

          const product =
            products.find(
              p =>
                String(p.id) ===
                String(item.product_id)
            );


          return `

            <tr>

              <td>
                ${index + 1}
              </td>

              <td>
                ${escapeHtml(
                  product?.code || "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  product?.name || "-"
                )}
              </td>

              <td>
                ${number(
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
                %${number(
                  item.vat_rate
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
      ).join("");


    const tlInfo =
      currency === "USD"
        ? `
          <div
            style="
              margin-top:10px;
              padding:10px;
              background:#f3f4f6;
              border-radius:7px;
            "
          >
            <strong>
              Kur:
            </strong>
            1 USD = ${rate.toLocaleString(
              "tr-TR",
              {
                minimumFractionDigits:2,
                maximumFractionDigits:4
              }
            )} TL

            <br>

            <strong>
              TL Karşılığı:
            </strong>

            ${money(
              number(purchase.total) * rate
            )}
          </div>
        `
        : "";


    openModal(

      "Alış Faturası Detayı",

      `

        <div
          style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:15px;
            margin-bottom:20px;
          "
        >

          <div>
            <strong>Fatura No</strong>
            <br>
            ${escapeHtml(
              purchase.invoice_no || "-"
            )}
          </div>

          <div>
            <strong>Tarih</strong>
            <br>
            ${purchase.invoice_date || "-"}
          </div>

          <div>
            <strong>Tedarikçi</strong>
            <br>
            ${escapeHtml(
              party?.name || "-"
            )}
          </div>

          <div>
            <strong>Para Birimi</strong>
            <br>
            ${
              currency === "USD"
                ? "USD"
                : "TL"
            }
          </div>

        </div>


        ${tlInfo}


        <div
          style="
            overflow-x:auto;
            margin-top:20px;
          "
        >

          <table>

            <thead>

              <tr>

                <th>#</th>
                <th>Kod</th>
                <th>Ürün</th>
                <th>Miktar</th>
                <th>Birim Fiyat</th>
                <th>KDV</th>
                <th>Toplam</th>

              </tr>

            </thead>

            <tbody>

              ${
                itemRows ||
                `
                  <tr>
                    <td colspan="7">
                      Fatura kalemi bulunamadı.
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
              font-size:20px;
              margin-top:8px;
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
                  margin-top:20px;
                  padding:12px;
                  background:#f9fafb;
                  border-radius:7px;
                "
              >
                <strong>Not:</strong>
                ${escapeHtml(
                  purchase.note
                )}
              </div>
            `
            : ""
        }


        <div class="form-buttons">

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

  }

  catch (error) {

    console.error(error);

    showToast(
      "Fatura detayları alınamadı: " +
      error.message
    );

  }

}


/* =========================================================
   SATIŞ FATURA DETAY
========================================================= */

async function openSaleDetails(id) {

  try {

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


    const party =
      parties.find(
        x =>
          String(x.id) ===
          String(sale.party_id)
      );


    const result =
      await db
        .from("sale_items")
        .select("*")
        .eq(
          "sale_id",
          id
        );


    if (result.error) {
      throw result.error;
    }


    const items =
      result.data || [];


    const currency =
      getInvoiceCurrency(
        sale
      );


    const rate =
      getInvoiceRate(
        sale
      );


    const itemRows =
      items.map(
        (item, index) => {

          const product =
            products.find(
              p =>
                String(p.id) ===
                String(item.product_id)
            );


          return `

            <tr>

              <td>
                ${index + 1}
              </td>

              <td>
                ${escapeHtml(
                  product?.code || "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  product?.name || "-"
                )}
              </td>

              <td>
                ${number(
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
                %${number(
                  item.vat_rate
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
      ).join("");


    const tlInfo =
      currency === "USD"
        ? `
          <div
            style="
              margin-top:10px;
              padding:10px;
              background:#f3f4f6;
              border-radius:7px;
            "
          >
            <strong>
              Kur:
            </strong>
            1 USD = ${rate.toLocaleString(
              "tr-TR",
              {
                minimumFractionDigits:2,
                maximumFractionDigits:4
              }
            )} TL

            <br>

            <strong>
              TL Karşılığı:
            </strong>

            ${money(
              number(sale.total) * rate
            )}
          </div>
        `
        : "";


    openModal(

      "Satış Faturası Detayı",

      `

        <div
          style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:15px;
            margin-bottom:20px;
          "
        >

          <div>
            <strong>Fatura No</strong>
            <br>
            ${escapeHtml(
              sale.invoice_no || "-"
            )}
          </div>

          <div>
            <strong>Tarih</strong>
            <br>
            ${sale.invoice_date || "-"}
          </div>

          <div>
            <strong>Müşteri</strong>
            <br>
            ${escapeHtml(
              party?.name || "-"
            )}
          </div>

          <div>
            <strong>Para Birimi</strong>
            <br>
            ${
              currency === "USD"
                ? "USD"
                : "TL"
            }
          </div>

        </div>


        ${tlInfo}


        <div
          style="
            overflow-x:auto;
            margin-top:20px;
          "
        >

          <table>

            <thead>

              <tr>

                <th>#</th>
                <th>Kod</th>
                <th>Ürün</th>
                <th>Miktar</th>
                <th>Birim Fiyat</th>
                <th>KDV</th>
                <th>Toplam</th>

              </tr>

            </thead>

            <tbody>

              ${
                itemRows ||
                `
                  <tr>
                    <td colspan="7">
                      Fatura kalemi bulunamadı.
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
          "
        >

          <div>
            Matrah:
            <strong>
              ${money(
                sale.subtotal,
                currency
              )}
            </strong>
          </div>

          <div>
            KDV:
            <strong>
              ${money(
                sale.vat_amount,
                currency
              )}
            </strong>
          </div>

          <div
            style="
              font-size:20px;
              margin-top:8px;
            "
          >
            Genel Toplam:
            <strong>
              ${money(
                sale.total,
                currency
              )}
            </strong>
          </div>

        </div>


        ${
          sale.note
            ? `
              <div
                style="
                  margin-top:20px;
                  padding:12px;
                  background:#f9fafb;
                  border-radius:7px;
                "
              >
                <strong>Not:</strong>
                ${escapeHtml(
                  sale.note
                )}
              </div>
            `
            : ""
        }


        <div class="form-buttons">

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

  }

  catch (error) {

    console.error(error);

    showToast(
      "Fatura detayları alınamadı: " +
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
    saleTotal -
    purchaseTotal;


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
      .map(
        row =>
          row.map(value => {

            const text =
              String(
                value ?? ""
              );

            return `"${text.replaceAll(
              '"',
              '""'
            )}"`;

          }).join(";")
      )
      .join("\n");


  const blob =
    new Blob(
      [
        "\uFEFF" +
        csv
      ],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;

  link.download =
    filename;


  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  URL.revokeObjectURL(
    url
  );

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
      "Genel Toplam",
      "TL Karşılığı"
    ]

  ];


  purchases.forEach(p => {

    const party =
      parties.find(
        x =>
          String(x.id) ===
          String(p.party_id)
      );


    const currency =
      getInvoiceCurrency(p);


    const rate =
      getInvoiceRate(p);


    rows.push([

      p.invoice_no || "",

      p.invoice_date || "",

      party?.name || "",

      currency,

      rate,

      p.subtotal || 0,

      p.vat_amount || 0,

      p.total || 0,

      currency === "USD"
        ? number(p.total) * rate
        : number(p.total)

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
      "Genel Toplam",
      "TL Karşılığı"
    ]

  ];


  sales.forEach(s => {

    const party =
      parties.find(
        x =>
          String(x.id) ===
          String(s.party_id)
      );


    const currency =
      getInvoiceCurrency(s);


    const rate =
      getInvoiceRate(s);


    rows.push([

      s.invoice_no || "",

      s.invoice_date || "",

      party?.name || "",

      currency,

      rate,

      s.subtotal || 0,

      s.vat_amount || 0,

      s.total || 0,

      currency === "USD"
        ? number(s.total) * rate
        : number(s.total)

    ]);

  });


  downloadCSV(
    "satis_faturalari.csv",
    rows
  );

}


/* =========================================================
   MODAL KAPATMA
========================================================= */

document.addEventListener(
  "click",
  event => {

    const modal =
      document.getElementById(
        "modal"
      );


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

    if (
      event.key === "Escape"
    ) {

      closeModal();

    }

  }
);
