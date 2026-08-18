const db = window.supabaseClient;

let products = [];
let parties = [];
let purchases = [];
let sales = [];
let movements = [];

let purchaseItems = [];
let saleItems = [];

document.addEventListener("DOMContentLoaded", async () => {

  setupNavigation();

  setDefaultDates();

  document.getElementById("refreshBtn")
    ?.addEventListener("click", loadAll);

  document.getElementById("productSearch")
    ?.addEventListener("input", renderProducts);

  await loadAll();

});


/* =========================
   GENEL YARDIMCILAR
========================= */

function money(value) {

  return Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " ₺";

}


function number(value) {

  return Number(value || 0);
}


function today() {

  return new Date().toISOString().slice(0, 10);

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


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================
   MENÜ
========================= */

function setupNavigation() {

  document.querySelectorAll(".menu").forEach(button => {

    button.addEventListener("click", async () => {

      const page = button.dataset.page;

      document.querySelectorAll(".menu")
        .forEach(x => x.classList.remove("active"));

      button.classList.add("active");

      document.querySelectorAll(".page")
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
        documents: "Faturalar",
        reports: "Raporlar"
      };

      document.getElementById("pageTitle").textContent =
        titles[page] || "Stok Takip";

      if (page === "products") renderProducts();
      if (page === "purchase") preparePurchasePage();
      if (page === "sales") prepareSalePage();
      if (page === "movements") renderMovements();
      if (page === "parties") renderParties();
      if (page === "documents") renderDocuments();
      if (page === "reports") renderReports();

    });

  });

}


/* =========================
   TARİH
========================= */

function setDefaultDates() {

  const purchaseDate = document.getElementById("purchaseDate");
  const saleDate = document.getElementById("saleDate");

  if (purchaseDate) purchaseDate.value = today();
  if (saleDate) saleDate.value = today();

}


/* =========================
   VERİLERİ YÜKLE
========================= */

async function loadAll() {

  try {

    const [
      productsResult,
      partiesResult,
      purchasesResult,
      salesResult,
      movementsResult
    ] = await Promise.all([

      db.from("products")
        .select("*")
        .order("name"),

      db.from("parties")
        .select("*")
        .order("name"),

      db.from("purchases")
        .select("*")
        .order("invoice_date", { ascending: false }),

      db.from("sales")
        .select("*")
        .order("invoice_date", { ascending: false }),

      db.from("stock_movements")
        .select("*")
        .order("created_at", { ascending: false })

    ]);


    if (productsResult.error) throw productsResult.error;
    if (partiesResult.error) throw partiesResult.error;
    if (purchasesResult.error) throw purchasesResult.error;
    if (salesResult.error) throw salesResult.error;
    if (movementsResult.error) throw movementsResult.error;


    products = productsResult.data || [];
    parties = partiesResult.data || [];
    purchases = purchasesResult.data || [];
    sales = salesResult.data || [];
    movements = movementsResult.data || [];


    renderDashboard();
    renderProducts();
    renderParties();
    renderMovements();
    renderDocuments();
    renderReports();

    preparePurchasePage();
    prepareSalePage();

  } catch (error) {

    console.error(error);

    showToast(
      "Veriler yüklenemedi: " +
      (error.message || "Bilinmeyen hata")
    );

  }

}


/* =========================
   ANA SAYFA
========================= */

function renderDashboard() {

  const totalProducts =
    products.length;

  const totalStock =
    products.reduce(
      (sum, p) => sum + number(p.stock_quantity),
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
      (sum, x) => sum + number(x.total),
      0
    );

  const totalPurchases =
    purchases.reduce(
      (sum, x) => sum + number(x.total),
      0
    );

  const todaySales =
    sales
      .filter(x => x.invoice_date === today())
      .reduce(
        (sum, x) => sum + number(x.total),
        0
      );


  setText("totalProducts", totalProducts);
  setText("totalStock", totalStock);
  setText("criticalProducts", critical);
  setText("totalParties", parties.length);

  setText("totalSales", money(totalSales));
  setText("totalPurchases", money(totalPurchases));
  setText("grossProfit", money(totalSales - totalPurchases));
  setText("todaySales", money(todaySales));


  const criticalProducts =
    products.filter(
      p =>
        number(p.stock_quantity) <=
        number(p.critical_stock)
    );


  const container =
    document.getElementById("criticalProductsTable");

  if (!container) return;


  if (!criticalProducts.length) {

    container.innerHTML =
      `<div class="empty">Kritik stok bulunmuyor.</div>`;

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


function setText(id, value) {

  const element =
    document.getElementById(id);

  if (element) {
    element.textContent = value;
  }

}


/* =========================
   ÜRÜNLER
========================= */

function renderProducts() {

  const container =
    document.getElementById("productsTable");

  if (!container) return;


  const search =
    (
      document.getElementById("productSearch")
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
      `<div class="empty">Ürün bulunamadı.</div>`;

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


/* =========================
   ÜRÜN FORMU
========================= */

function openProductForm(id = null) {

  const product =
    products.find(x => x.id === id);


  openModal(
    id ? "Ürün Düzenle" : "Yeni Ürün",
    `

      <div class="form-grid">

        <div class="form-group">

          <label>Ürün Kodu</label>

          <input
            id="formProductCode"
            required
            value="${escapeHtml(product?.code || "")}"
          >

        </div>


        <div class="form-group">

          <label>Ürün Adı</label>

          <input
            id="formProductName"
            required
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
    document.getElementById("formProductCode").value.trim();

  const name =
    document.getElementById("formProductName").value.trim();

  const stock =
    number(
      document.getElementById("formProductStock").value
    );

  const critical =
    number(
      document.getElementById("formProductCritical").value
    );

  const purchase =
    number(
      document.getElementById("formProductPurchase").value
    );

  const sale =
    number(
      document.getElementById("formProductSale").value
    );


  if (!code || !name) {

    showToast("Ürün kodu ve adı zorunludur.");

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

    } else {

      result =
        await db
          .from("products")
          .insert(data);

    }


    if (result.error) throw result.error;


    closeModal();

    showToast("Ürün kaydedildi.");

    await loadAll();

  } catch (error) {

    console.error(error);

    showToast(
      "Ürün kaydedilemedi: " +
      error.message
    );

  }

}


async function deleteProduct(id) {

  if (!confirm(
    "Bu ürünü silmek istediğinize emin misiniz?"
  )) return;


  try {

    const result =
      await db
        .from("products")
        .delete()
        .eq("id", id);


    if (result.error) throw result.error;


    showToast("Ürün silindi.");

    await loadAll();

  } catch (error) {

    showToast(
      "Ürün silinemedi. Hareket kaydı varsa silinemez."
    );

  }

}


/* =========================
   CARİLER
========================= */

function renderParties() {

  const container =
    document.getElementById("partiesTable");

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

            <td>
              ${partyType(p.type)}
            </td>

            <td>${escapeHtml(p.phone || "-")}</td>

            <td>${escapeHtml(p.email || "-")}</td>

            <td>${escapeHtml(p.tax_number || "-")}</td>

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

  if (type === "supplier")
    return "Tedarikçi";

  if (type === "both")
    return "Müşteri + Tedarikçi";

  return "Müşteri";

}


function openPartyForm(id = null) {

  const party =
    parties.find(x => x.id === id);


  openModal(
    id ? "Cari Düzenle" : "Yeni Cari",
    `

      <div class="form-group">

        <label>Unvan / Ad Soyad</label>

        <input
          id="formPartyName"
          value="${escapeHtml(party?.name || "")}"
          required
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

          <textarea id="formPartyAddress">
${escapeHtml(party?.address || "")}
          </textarea>

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
      document.getElementById("formPartyName").value.trim(),

    type:
      document.getElementById("formPartyType").value,

    phone:
      document.getElementById("formPartyPhone").value.trim(),

    email:
      document.getElementById("formPartyEmail").value.trim(),

    tax_number:
      document.getElementById("formPartyTax").value.trim(),

    address:
      document.getElementById("formPartyAddress").value.trim()

  };


  if (!data.name) {

    showToast("Unvan / Ad Soyad zorunludur.");

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

    } else {

      result =
        await db
          .from("parties")
          .insert(data);

    }


    if (result.error) throw result.error;


    closeModal();

    showToast("Cari kaydedildi.");

    await loadAll();

  } catch (error) {

    showToast(
      "Cari kaydedilemedi: " +
      error.message
    );

  }

}


async function deleteParty(id) {

  if (!confirm(
    "Bu cariyi silmek istediğinize emin misiniz?"
  )) return;


  try {

    const result =
      await db
        .from("parties")
        .delete()
        .eq("id", id);


    if (result.error) throw result.error;


    showToast("Cari silindi.");

    await loadAll();

  } catch (error) {

    showToast(
      "Bu cari kullanıldığı için silinemiyor."
    );

  }

}


/* =========================
   MODAL
========================= */

function openModal(title, content) {

  document.getElementById("modalTitle")
    .textContent = title;

  document.getElementById("modalForm")
    .innerHTML = content;

  document.getElementById("modal")
    .classList.remove("hidden");

}


function closeModal() {

  document.getElementById("modal")
    .classList.add("hidden");

}


/* =========================
   SATIN ALMA HAZIRLIK
========================= */

function preparePurchasePage() {

  fillPartySelect(
    "purchaseParty",
    ["supplier", "both"]
  );

  fillProductSelect(
    "purchaseProduct"
  );

}


function fillProductSelect(id) {

  const select =
    document.getElementById(id);

  if (!select) return;


  select.innerHTML =

    `<option value="">Ürün seçin...</option>` +

    products.map(p => `

      <option value="${p.id}">

        ${escapeHtml(p.code)}
        -
        ${escapeHtml(p.name)}

      </option>

    `).join("");

}


function fillPartySelect(id, allowedTypes) {

  const select =
    document.getElementById(id);

  if (!select) return;


  const filtered =
    parties.filter(
      p => allowedTypes.includes(p.type)
    );


  select.innerHTML =

    `<option value="">Cari seçin...</option>` +

    filtered.map(p => `

      <option value="${p.id}">

        ${escapeHtml(p.name)}

      </option>

    `).join("");

}


/* =========================
   SATIN ALMA ÜRÜN EKLE
========================= */

function addPurchaseItem() {

  const productId =
    document.getElementById("purchaseProduct").value;

  const qty =
    number(
      document.getElementById("purchaseQty").value
    );

  const price =
    number(
      document.getElementById("purchasePrice").value
    );

  const vat =
    number(
      document.getElementById("purchaseVat").value
    );


  if (!productId || qty <= 0) {

    showToast(
      "Ürün ve miktar seçmelisiniz."
    );

    return;

  }


  const product =
    products.find(x => x.id === productId);

  if (!product) return;


  purchaseItems.push({

    product_id: productId,

    product_name: product.name,

    code: product.code,

    quantity: qty,

    unit_price: price,

    vat_rate: vat

  });


  document.getElementById("purchaseQty").value = "";
  document.getElementById("purchasePrice").value = "";

  renderPurchaseItems();

}


function renderPurchaseItems() {

  const container =
    document.getElementById("purchaseItems");

  if (!container) return;


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

        ${purchaseItems.map((item, index) => {

          const subtotal =
            item.quantity * item.unit_price;

          const vatAmount =
            subtotal * item.vat_rate / 100;

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

              <td>${money(item.unit_price)}</td>

              <td>%${item.vat_rate}</td>

              <td>${money(subtotal)}</td>

              <td>${money(vatAmount)}</td>

              <td>${money(total)}</td>

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

        }).join("")}

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
      item.quantity * item.unit_price;

    subtotal += line;

    vatTotal +=
      line * item.vat_rate / 100;

  });


  setText(
    "purchaseSubtotal",
    money(subtotal)
  );

  setText(
    "purchaseVatTotal",
    money(vatTotal)
  );

  setText(
    "purchaseGrandTotal",
    money(subtotal + vatTotal)
  );


  return {
    subtotal,
    vatTotal,
    total: subtotal + vatTotal
  };

}


/* =========================
   SATIŞ HAZIRLIK
========================= */

function prepareSalePage() {

  fillPartySelect(
    "saleParty",
    ["customer", "both"]
  );

  fillProductSelect(
    "saleProduct"
  );

}


function addSaleItem() {

  const productId =
    document.getElementById("saleProduct").value;

  const qty =
    number(
      document.getElementById("saleQty").value
    );

  const price =
    number(
      document.getElementById("salePrice").value
    );

  const vat =
    number(
      document.getElementById("saleVat").value
    );


  if (!productId || qty <= 0) {

    showToast(
      "Ürün ve miktar seçmelisiniz."
    );

    return;

  }


  const product =
    products.find(x => x.id === productId);

  if (!product) return;


  const already =
    saleItems
      .filter(x => x.product_id === productId)
      .reduce(
        (sum, x) => sum + x.quantity,
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

    product_id: productId,

    product_name: product.name,

    code: product.code,

    quantity: qty,

    unit_price: price,

    vat_rate: vat

  });


  document.getElementById("saleQty").value = "";
  document.getElementById("salePrice").value = "";

  renderSaleItems();

}


function renderSaleItems() {

  const container =
    document.getElementById("saleItems");

  if (!container) return;


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

        ${saleItems.map((item, index) => {

          const subtotal =
            item.quantity * item.unit_price;

          const vatAmount =
            subtotal * item.vat_rate / 100;

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

              <td>${money(item.unit_price)}</td>

              <td>%${item.vat_rate}</td>

              <td>${money(subtotal)}</td>

              <td>${money(vatAmount)}</td>

              <td>${money(total)}</td>

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

        }).join("")}

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
      item.quantity * item.unit_price;

    subtotal += line;

    vatTotal +=
      line * item.vat_rate / 100;

  });


  setText(
    "saleSubtotal",
    money(subtotal)
  );

  setText(
    "saleVatTotal",
    money(vatTotal)
  );

  setText(
    "saleGrandTotal",
    money(subtotal + vatTotal)
  );


  return {
    subtotal,
    vatTotal,
    total: subtotal + vatTotal
  };

}


/* =========================
   ALIŞ FATURASI KAYDET
========================= */

async function savePurchase() {

  if (!purchaseItems.length) {

    showToast(
      "Faturaya en az bir ürün ekleyin."
    );

    return;

  }


  const partyId =
    document.getElementById("purchaseParty").value || null;

  const invoiceNo =
    document.getElementById("purchaseInvoiceNo").value.trim();

  const invoiceDate =
    document.getElementById("purchaseDate").value || today();

  const note =
    document.getElementById("purchaseNote").value.trim();


  const totals =
    calculatePurchaseTotals();


  try {

    const purchaseResult =
      await db
        .from("purchases")
        .insert({

          invoice_no: invoiceNo,

          party_id: partyId,

          invoice_date: invoiceDate,

          subtotal: totals.subtotal,

          vat_rate: 0,

          vat_amount: totals.vatTotal,

          total: totals.total,

          note

        })
        .select()
        .single();


    if (purchaseResult.error)
      throw purchaseResult.error;


    const purchaseId =
      purchaseResult.data.id;


    const items =
      purchaseItems.map(item => {

        const subtotal =
          item.quantity * item.unit_price;

        const vatAmount =
          subtotal * item.vat_rate / 100;

        return {

          purchase_id: purchaseId,

          product_id: item.product_id,

          quantity: item.quantity,

          unit_price: item.unit_price,

          vat_rate: item.vat_rate,

          line_subtotal: subtotal,

          vat_amount: vatAmount,

          line_total:
            subtotal + vatAmount

        };

      });


    const itemsResult =
      await db
        .from("purchase_items")
        .insert(items);


    if (itemsResult.error)
      throw itemsResult.error;


    for (const item of purchaseItems) {

      const product =
        products.find(
          p => p.id === item.product_id
        );

      if (!product) continue;


      const newStock =
        number(product.stock_quantity) +
        number(item.quantity);


      const updateResult =
        await db
          .from("products")
          .update({

            stock_quantity: newStock,

            purchase_price: item.unit_price

          })
          .eq("id", item.product_id);


      if (updateResult.error)
        throw updateResult.error;


      const movementResult =
        await db
          .from("stock_movements")
          .insert({

            product_id: item.product_id,

            party_id: partyId,

            type: "in",

            quantity: item.quantity,

            source_type: "purchase",

            source_id: purchaseId,

            note:
              `Alış faturası ${invoiceNo || ""}`

          });


      if (movementResult.error)
        throw movementResult.error;

    }


    showToast(
      "Alış faturası başarıyla kaydedildi."
    );


    clearPurchase();

    await loadAll();

  } catch (error) {

    console.error(error);

    showToast(
      "Alış faturası kaydedilemedi: " +
      error.message
    );

  }

}


/* =========================
   SATIŞ FATURASI KAYDET
========================= */

async function saveSale() {

  if (!saleItems.length) {

    showToast(
      "Faturaya en az bir ürün ekleyin."
    );

    return;

  }


  const partyId =
    document.getElementById("saleParty").value || null;

  const invoiceNo =
    document.getElementById("saleInvoiceNo").value.trim();

  const invoiceDate =
    document.getElementById("saleDate").value || today();

  const note =
    document.getElementById("saleNote").value.trim();


  for (const item of saleItems) {

    const product =
      products.find(
        p => p.id === item.product_id
      );

    if (!product) {

      showToast("Ürün bulunamadı.");

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


  const totals =
    calculateSaleTotals();


  try {

    const saleResult =
      await db
        .from("sales")
        .insert({

          invoice_no: invoiceNo,

          party_id: partyId,

          invoice_date: invoiceDate,

          subtotal: totals.subtotal,

          vat_rate: 0,

          vat_amount: totals.vatTotal,

          total: totals.total,

          note

        })
        .select()
        .single();


    if (saleResult.error)
      throw saleResult.error;


    const saleId =
      saleResult.data.id;


    const items =
      saleItems.map(item => {

        const subtotal =
          item.quantity * item.unit_price;

        const vatAmount =
          subtotal * item.vat_rate / 100;

        return {

          sale_id: saleId,

          product_id: item.product_id,

          quantity: item.quantity,

          unit_price: item.unit_price,

          vat_rate: item.vat_rate,

          line_subtotal: subtotal,

          vat_amount: vatAmount,

          line_total:
            subtotal + vatAmount

        };

      });


    const itemsResult =
      await db
        .from("sale_items")
        .insert(items);


    if (itemsResult.error)
      throw itemsResult.error;


    for (const item of saleItems) {

      const product =
        products.find(
          p => p.id === item.product_id
        );

      if (!product) continue;


      const newStock =
        number(product.stock_quantity) -
        number(item.quantity);


      if (newStock < 0) {

        throw new Error(
          `${product.name} için stok yetersiz.`
        );

      }


      const updateResult =
        await db
          .from("products")
          .update({

            stock_quantity: newStock,

            sale_price: item.unit_price

          })
          .eq("id", item.product_id);


      if (updateResult.error)
        throw updateResult.error;


      const movementResult =
        await db
          .from("stock_movements")
          .insert({

            product_id: item.product_id,

            party_id: partyId,

            type: "out",

            quantity: item.quantity,

            source_type: "sale",

            source_id: saleId,

            note:
              `Satış faturası ${invoiceNo || ""}`

          });


      if (movementResult.error)
        throw movementResult.error;

    }


    showToast(
      "Satış faturası başarıyla kaydedildi."
    );


    clearSale();

    await loadAll();

  } catch (error) {

    console.error(error);

    showToast(
      "Satış faturası kaydedilemedi: " +
      error.message
    );

  }

}


/* =========================
   FATURA TEMİZLE
========================= */

function clearPurchase() {

  purchaseItems = [];

  const invoice =
    document.getElementById("purchaseInvoiceNo");

  const date =
    document.getElementById("purchaseDate");

  const party =
    document.getElementById("purchaseParty");

  const note =
    document.getElementById("purchaseNote");


  if (invoice) invoice.value = "";
  if (date) date.value = today();
  if (party) party.value = "";
  if (note) note.value = "";


  renderPurchaseItems();

}


function clearSale() {

  saleItems = [];

  const invoice =
    document.getElementById("saleInvoiceNo");

  const date =
    document.getElementById("saleDate");

  const party =
    document.getElementById("saleParty");

  const note =
    document.getElementById("saleNote");


  if (invoice) invoice.value = "";
  if (date) date.value = today();
  if (party) party.value = "";
  if (note) note.value = "";


  renderSaleItems();

}


/* =========================
   STOK HAREKETLERİ
========================= */

function renderMovements() {

  const container =
    document.getElementById("movementsTable");

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
              p => p.id === m.product_id
            );


          return `

            <tr>

              <td>
                ${new Date(m.created_at)
                  .toLocaleString("tr-TR")}
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
                ${escapeHtml(m.note || "-")}
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
    document.getElementById("movementProduct").value;

  const type =
    document.getElementById("movementType").value;

  const qty =
    number(
      document.getElementById("movementQty").value
    );

  const note =
    document.getElementById("movementNote").value.trim();


  if (!productId || qty <= 0) {

    showToast(
      "Ürün ve miktar zorunludur."
    );

    return;

  }


  const product =
    products.find(
      p => p.id === productId
    );


  if (!product) return;


  let newStock;

  if (type === "in") {

    newStock =
      number(product.stock_quantity) + qty;

  } else {

    newStock =
      number(product.stock_quantity) - qty;

    if (newStock < 0) {

      showToast("Yetersiz stok.");

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
        .eq("id", productId);


    if (updateResult.error)
      throw updateResult.error;


    const movementResult =
      await db
        .from("stock_movements")
        .insert({

          product_id: productId,

          type,

          quantity: qty,

          source_type: "manual",

          note

        });


    if (movementResult.error)
      throw movementResult.error;


    closeModal();

    showToast("Stok hareketi kaydedildi.");

    await loadAll();

  } catch (error) {

    showToast(
      "Hareket kaydedilemedi: " +
      error.message
    );

  }

}
/* =========================
   FATURALAR
========================= */

function renderDocuments() {

  const container =
    document.getElementById("documentsTable");

  if (!container) return;


  const purchaseRows = purchases.map(p => {

    const party =
      parties.find(x => x.id === p.party_id);


    return `

      <tr>

        <td>${escapeHtml(p.invoice_no || "-")}</td>

        <td>${p.invoice_date || "-"}</td>

        <td>Alış</td>

        <td>${escapeHtml(party?.name || "-")}</td>

        <td>${money(p.subtotal)}</td>

        <td>${money(p.vat_amount)}</td>

        <td><strong>${money(p.total)}</strong></td>

      </tr>

    `;

  }).join("");


  const saleRows = sales.map(s => {

    const party =
      parties.find(x => x.id === s.party_id);


    return `

      <tr>

        <td>${escapeHtml(s.invoice_no || "-")}</td>

        <td>${s.invoice_date || "-"}</td>

        <td>Satış</td>

        <td>${escapeHtml(party?.name || "-")}</td>

        <td>${money(s.subtotal)}</td>

        <td>${money(s.vat_amount)}</td>

        <td><strong>${money(s.total)}</strong></td>

      </tr>

    `;

  }).join("");


  if (!purchaseRows && !saleRows) {

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

  `;

}


/* =========================
   RAPORLAR
========================= */

function renderReports() {

  const purchaseTotal =
    purchases.reduce(
      (sum, x) => sum + number(x.total),
      0
    );


  const saleTotal =
    sales.reduce(
      (sum, x) => sum + number(x.total),
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
    document.getElementById("reportSummary");

  if (!container) return;


  const difference =
    saleTotal - purchaseTotal;


  const totalVatPurchase =
    purchases.reduce(
      (sum, x) => sum + number(x.vat_amount),
      0
    );


  const totalVatSale =
    sales.reduce(
      (sum, x) => sum + number(x.vat_amount),
      0
    );


  container.innerHTML = `

    <div class="report-row">

      <span>Toplam alış faturası</span>

      <strong>
        ${purchases.length}
      </strong>

    </div>


    <div class="report-row">

      <span>Toplam satış faturası</span>

      <strong>
        ${sales.length}
      </strong>

    </div>


    <div class="report-row">

      <span>Toplam alış</span>

      <strong>
        ${money(purchaseTotal)}
      </strong>

    </div>


    <div class="report-row">

      <span>Toplam satış</span>

      <strong>
        ${money(saleTotal)}
      </strong>

    </div>


    <div class="report-row">

      <span>Alış KDV</span>

      <strong>
        ${money(totalVatPurchase)}
      </strong>

    </div>


    <div class="report-row">

      <span>Satış KDV</span>

      <strong>
        ${money(totalVatSale)}
      </strong>

    </div>


    <div class="report-row">

      <span>Satış - Alış</span>

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


/* =========================
   CSV / EXCEL
========================= */

function downloadCSV(filename, rows) {

  const csv =
    rows
      .map(row =>
        row.map(value => {

          const text =
            String(value ?? "");

          return `"${text.replaceAll('"', '""')}"`;

        }).join(";")
      )
      .join("\n");


  const blob =
    new Blob(
      ["\uFEFF" + csv],
      {
        type: "text/csv;charset=utf-8;"
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
      "Matrah",
      "KDV",
      "Genel Toplam"
    ]

  ];


  purchases.forEach(p => {

    const party =
      parties.find(
        x => x.id === p.party_id
      );


    rows.push([

      p.invoice_no || "",

      p.invoice_date || "",

      party?.name || "",

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
      "Matrah",
      "KDV",
      "Genel Toplam"
    ]

  ];


  sales.forEach(s => {

    const party =
      parties.find(
        x => x.id === s.party_id
      );


    rows.push([

      s.invoice_no || "",

      s.invoice_date || "",

      party?.name || "",

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


/* =========================
   KAPATMA
========================= */

document.addEventListener("click", event => {

  const modal =
    document.getElementById("modal");


  if (
    event.target === modal
  ) {

    closeModal();

  }

});


/* =========================
   ESC TUŞU
========================= */

document.addEventListener("keydown", event => {

  if (event.key === "Escape") {

    closeModal();

  }

});
