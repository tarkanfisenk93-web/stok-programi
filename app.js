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
   GENEL
========================================================= */

function $(id) {
  return document.getElementById(id);
}

function number(value) {
  return Number(value || 0);
}

function money(value) {
  return Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " ₺";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
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
  const toast = $("toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}


/* =========================================================
   BAŞLANGIÇ
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  setupNavigation();
  setDefaultDates();

  const refreshBtn = $("refreshBtn");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadAll);
  }

  const productSearch = $("productSearch");

  if (productSearch) {
    productSearch.addEventListener(
      "input",
      renderProducts
    );
  }

  hideDocumentsMenu();

  await loadAll();

});


/* =========================================================
   MENÜ
========================================================= */

function hideDocumentsMenu() {

  document
    .querySelectorAll(".menu")
    .forEach(button => {

      if (
        button.dataset.page === "documents"
      ) {
        button.style.display = "none";
      }

    });

  const documentsPage = $("documents");

  if (documentsPage) {
    documentsPage.classList.add("hidden");
  }

}


function setupNavigation() {

  document
    .querySelectorAll(".menu")
    .forEach(button => {

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

        const target = $(page);

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
          renderSavedPurchases();
        }

        if (page === "sales") {
          prepareSalePage();
          renderSaleItems();
          renderSavedSales();
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

  if ($("purchaseDate")) {
    $("purchaseDate").value = today();
  }

  if ($("saleDate")) {
    $("saleDate").value = today();
  }

}


/* =========================================================
   VERİLERİ YÜKLE
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

    renderSavedPurchases();

    renderSavedSales();

  }

  catch (error) {

    console.error(error);

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


  setText(
    "totalProducts",
    totalProducts
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
    $("criticalProductsTable");

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

            <td>
              ${escapeHtml(p.code)}
            </td>

            <td>
              ${escapeHtml(p.name)}
            </td>

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
    $("productsTable");

  if (!container) return;


  const search =
    (
      $("productSearch")?.value || ""
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

  const data = {

    code:
      $("formProductCode")
        .value
        .trim(),

    name:
      $("formProductName")
        .value
        .trim(),

    stock_quantity:
      number(
        $("formProductStock").value
      ),

    critical_stock:
      number(
        $("formProductCritical").value
      ),

    purchase_price:
      number(
        $("formProductPurchase").value
      ),

    sale_price:
      number(
        $("formProductSale").value
      )

  };


  if (!data.code || !data.name) {

    showToast(
      "Ürün kodu ve adı zorunludur."
    );

    return;

  }


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
   CARİ
========================================================= */

function partyType(type) {

  if (type === "supplier") {
    return "Tedarikçi";
  }

  if (type === "both") {
    return "Müşteri + Tedarikçi";
  }

  return "Müşteri";

}


function renderParties() {

  const container =
    $("partiesTable");

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

            <option value="customer"
              ${
                party?.type === "customer"
                  ? "selected"
                  : ""
              }>
              Müşteri
            </option>

            <option value="supplier"
              ${
                party?.type === "supplier"
                  ? "selected"
                  : ""
              }>
              Tedarikçi
            </option>

            <option value="both"
              ${
                party?.type === "both"
                  ? "selected"
                  : ""
              }>
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
          class="secondary"
          type="button"
          onclick="closeModal()"
        >
          Vazgeç
        </button>

        <button
          class="success"
          type="button"
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
      $("formPartyName")
        .value
        .trim(),

    type:
      $("formPartyType")
        .value,

    phone:
      $("formPartyPhone")
        .value
        .trim(),

    email:
      $("formPartyEmail")
        .value
        .trim(),

    tax_number:
      $("formPartyTax")
        .value
        .trim(),

    address:
      $("formPartyAddress")
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
    $("modalTitle");

  const form =
    $("modalForm");

  const modal =
    $("modal");


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
    $("modal");

  if (modal) {
    modal.classList.add(
      "hidden"
    );
  }

}


/* =========================================================
   ÜRÜN / CARİ SEÇİMLERİ
========================================================= */

function fillProductSelect(id) {

  const select = $(id);

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

  const select = $(id);

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
   SATIN ALMA
========================================================= */

function preparePurchasePage() {

  fillPartySelect(
    "purchaseParty",
    ["supplier", "both"]
  );

  fillProductSelect(
    "purchaseProduct"
  );

}


function addPurchaseItem() {

  const productId =
    $("purchaseProduct")?.value;

  const qty =
    number(
      $("purchaseQty")?.value
    );

  const price =
    number(
      $("purchasePrice")?.value
    );

  const vat =
    number(
      $("purchaseVat")?.value
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


  if ($("purchaseQty")) {
    $("purchaseQty").value = "";
  }

  if ($("purchasePrice")) {
    $("purchasePrice").value = "";
  }


  renderPurchaseItems();

  showToast(
    "Ürün faturaya eklendi."
  );

}


function renderPurchaseItems() {

  const container =
    $("purchaseItems");

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
                    item.unit_price
                  )}
                </td>

                <td>
                  %${item.vat_rate}
                </td>

                <td>
                  ${money(subtotal)}
                </td>

                <td>
                  ${money(vatAmount)}
                </td>

                <td>
                  ${money(total)}
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
    money(
      subtotal + vatTotal
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

}


function addSaleItem() {

  const productId =
    $("saleProduct")?.value;

  const qty =
    number(
      $("saleQty")?.value
    );

  const price =
    number(
      $("salePrice")?.value
    );

  const vat =
    number(
      $("saleVat")?.value
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


  if ($("saleQty")) {
    $("saleQty").value = "";
  }

  if ($("salePrice")) {
    $("salePrice").value = "";
  }


  renderSaleItems();

  showToast(
    "Ürün faturaya eklendi."
  );

}


function renderSaleItems() {

  const container =
    $("saleItems");

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
                    item.unit_price
                  )}
                </td>

                <td>
                  %${item.vat_rate}
                </td>

                <td>
                  ${money(subtotal)}
                </td>

                <td>
                  ${money(vatAmount)}
                </td>

                <td>
                  ${money(total)}
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
    money(
      subtotal + vatTotal
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
   YENİ ALIŞ FATURASI KAYDET / DEĞİŞTİR
========================================================= */

async function savePurchase() {

  if (!purchaseItems.length) {

    showToast(
      "Faturaya en az bir ürün ekleyin."
    );

    return;

  }


  try {

    if (editingPurchaseId) {

      await updatePurchase(
        editingPurchaseId
      );

      showToast(
        "Alış faturası değiştirildi."
      );

      editingPurchaseId = null;

      clearPurchase();

      removeEditBanner("purchase");

    }

    else {

      await createPurchase();

      showToast(
        "Alış faturası başarıyla kaydedildi."
      );

      clearPurchase();

    }


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
   YENİ SATIŞ FATURASI KAYDET / DEĞİŞTİR
========================================================= */

async function saveSale() {

  if (!saleItems.length) {

    showToast(
      "Faturaya en az bir ürün ekleyin."
    );

    return;

  }


  try {

    if (editingSaleId) {

      await updateSale(
        editingSaleId
      );

      showToast(
        "Satış faturası değiştirildi."
      );

      editingSaleId = null;

      clearSale();

      removeEditBanner("sale");

    }

    else {

      await createSale();

      showToast(
        "Satış faturası başarıyla kaydedildi."
      );

      clearSale();

    }


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
   ALIŞ OLUŞTUR
========================================================= */

async function createPurchase() {

  const partyId =
    $("purchaseParty")?.value ||
    null;

  const invoiceNo =
    $("purchaseInvoiceNo")
      ?.value
      .trim() || "";

  const invoiceDate =
    $("purchaseDate")
      ?.value ||
    today();

  const note =
    $("purchaseNote")
      ?.value
      .trim() || "";


  const totals =
    calculatePurchaseTotals();


  const result =
    await db
      .from("purchases")
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

        note

      })
      .select()
      .single();


  if (result.error) {
    throw result.error;
  }


  const purchaseId =
    result.data.id;


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


  const itemResult =
    await db
      .from("purchase_items")
      .insert(items);


  if (itemResult.error) {
    throw itemResult.error;
  }


  for (const item of purchaseItems) {

    const product =
      products.find(
        p =>
          String(p.id) ===
          String(item.product_id)
      );


    if (!product) {
      continue;
    }


    const newStock =
      number(product.stock_quantity) +
      number(item.quantity);


    const update =
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


    if (update.error) {
      throw update.error;
    }


    const movement =
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


    if (movement.error) {
      throw movement.error;
    }

  }

}


/* =========================================================
   SATIŞ OLUŞTUR
========================================================= */

async function createSale() {

  const partyId =
    $("saleParty")?.value ||
    null;

  const invoiceNo =
    $("saleInvoiceNo")
      ?.value
      .trim() || "";

  const invoiceDate =
    $("saleDate")
      ?.value ||
    today();

  const note =
    $("saleNote")
      ?.value
      .trim() || "";


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


    if (
      number(item.quantity) >
      number(product.stock_quantity)
    ) {

      throw new Error(
        `${product.name} için yeterli stok yok.`
      );

    }

  }


  const totals =
    calculateSaleTotals();


  const result =
    await db
      .from("sales")
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

        note

      })
      .select()
      .single();


  if (result.error) {
    throw result.error;
  }


  const saleId =
    result.data.id;


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


  const itemResult =
    await db
      .from("sale_items")
      .insert(items);


  if (itemResult.error) {
    throw itemResult.error;
  }


  for (const item of saleItems) {

    const product =
      products.find(
        p =>
          String(p.id) ===
          String(item.product_id)
      );


    if (!product) {
      continue;
    }


    const newStock =
      number(product.stock_quantity) -
      number(item.quantity);


    if (newStock < 0) {

      throw new Error(
        `${product.name} için stok yetersiz.`
      );

    }


    const update =
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


    if (update.error) {
      throw update.error;
    }


    const movement =
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


    if (movement.error) {
      throw movement.error;
    }

  }

}


/* =========================================================
   FATURA DÜZENLEME
========================================================= */

async function editPurchase(id) {

  try {

    const purchase =
      purchases.find(
        x =>
          String(x.id) ===
          String(id)
      );


    if (!purchase) {
      throw new Error(
        "Fatura bulunamadı."
      );
    }


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


    editingPurchaseId = id;

    editingSaleId = null;


    if ($("purchaseInvoiceNo")) {
      $("purchaseInvoiceNo").value =
        purchase.invoice_no || "";
    }


    if ($("purchaseDate")) {
      $("purchaseDate").value =
        purchase.invoice_date ||
        today();
    }


    if ($("purchaseParty")) {
      $("purchaseParty").value =
        purchase.party_id || "";
    }


    if ($("purchaseNote")) {
      $("purchaseNote").value =
        purchase.note || "";
    }


    purchaseItems =
      (result.data || []).map(item => {

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

    showEditBanner(
      "purchase",
      id
    );


    const page =
      $("purchase");

    if (page) {

      page.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    }

    showToast(
      "Fatura düzenleme moduna alındı."
    );

  }

  catch (error) {

    console.error(error);

    showToast(
      "Fatura açılamadı: " +
      error.message
    );

  }

}


async function editSale(id) {

  try {

    const sale =
      sales.find(
        x =>
          String(x.id) ===
          String(id)
      );


    if (!sale) {
      throw new Error(
        "Fatura bulunamadı."
      );
    }


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


    editingSaleId = id;

    editingPurchaseId = null;


    if ($("saleInvoiceNo")) {
      $("saleInvoiceNo").value =
        sale.invoice_no || "";
    }


    if ($("saleDate")) {
      $("saleDate").value =
        sale.invoice_date ||
        today();
    }


    if ($("saleParty")) {
      $("saleParty").value =
        sale.party_id || "";
    }


    if ($("saleNote")) {
      $("saleNote").value =
        sale.note || "";
    }


    saleItems =
      (result.data || []).map(item => {

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

    showEditBanner(
      "sale",
      id
    );


    const page =
      $("sales");

    if (page) {

      page.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    }

    showToast(
      "Fatura düzenleme moduna alındı."
    );

  }

  catch (error) {

    console.error(error);

    showToast(
      "Fatura açılamadı: " +
      error.message
    );

  }

}


/* =========================================================
   STOK GERİ AL
========================================================= */

async function restorePurchaseStock(
  purchaseId
) {

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


  for (
    const item of result.data || []
  ) {

    const product =
      products.find(
        p =>
          String(p.id) ===
          String(item.product_id)
      );


    if (!product) {
      continue;
    }


    const newStock =
      number(product.stock_quantity) -
      number(item.quantity);


    if (newStock < 0) {

      throw new Error(
        `${product.name} için stok hesaplanamadı.`
      );

    }


    const update =
      await db
        .from("products")
        .update({
          stock_quantity:
            newStock
        })
        .eq(
          "id",
          product.id
        );


    if (update.error) {
      throw update.error;
    }


    product.stock_quantity =
      newStock;

  }


  return result.data || [];

}


async function restoreSaleStock(
  saleId
) {

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


  for (
    const item of result.data || []
  ) {

    const product =
      products.find(
        p =>
          String(p.id) ===
          String(item.product_id)
      );


    if (!product) {
      continue;
    }


    const newStock =
      number(product.stock_quantity) +
      number(item.quantity);


    const update =
      await db
        .from("products")
        .update({
          stock_quantity:
            newStock
        })
        .eq(
          "id",
          product.id
        );


    if (update.error) {
      throw update.error;
    }


    product.stock_quantity =
      newStock;

  }


  return result.data || [];

}


/* =========================================================
   YENİ STOK UYGULA
========================================================= */

async function applyPurchaseStock(
  items,
  partyId,
  purchaseId,
  invoiceNo
) {

  for (const item of items) {

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
      number(product.stock_quantity) +
      number(item.quantity);


    const update =
      await db
        .from("products")
        .update({

          stock_quantity:
            newStock,

          purchase_price:
            number(item.unit_price)

        })
        .eq(
          "id",
          item.product_id
        );


    if (update.error) {
      throw update.error;
    }


    product.stock_quantity =
      newStock;


    product.purchase_price =
      number(item.unit_price);


    const movement =
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
            number(item.quantity),

          source_type:
            "purchase",

          source_id:
            purchaseId,

          note:
            `Alış faturası ${invoiceNo}`

        });


    if (movement.error) {
      throw movement.error;
    }

  }

}


async function applySaleStock(
  items,
  partyId,
  saleId,
  invoiceNo
) {

  for (const item of items) {

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
        `${product.name} için yeterli stok yok.`
      );

    }


    const update =
      await db
        .from("products")
        .update({

          stock_quantity:
            newStock,

          sale_price:
            number(item.unit_price)

        })
        .eq(
          "id",
          item.product_id
        );


    if (update.error) {
      throw update.error;
    }


    product.stock_quantity =
      newStock;


    product.sale_price =
      number(item.unit_price);


    const movement =
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
            number(item.quantity),

          source_type:
            "sale",

          source_id:
            saleId,

          note:
            `Satış faturası ${invoiceNo}`

        });


    if (movement.error) {
      throw movement.error;
    }

  }

}


/* =========================================================
   ALIŞ FATURASI GÜNCELLE
========================================================= */

async function updatePurchase(id) {

  if (!purchaseItems.length) {

    throw new Error(
      "Faturada en az bir ürün olmalı."
    );

  }


  await restorePurchaseStock(id);


  const partyId =
    $("purchaseParty")?.value ||
    null;

  const invoiceNo =
    $("purchaseInvoiceNo")
      ?.value
      .trim() || "";

  const invoiceDate =
    $("purchaseDate")
      ?.value ||
    today();

  const note =
    $("purchaseNote")
      ?.value
      .trim() || "";


  const totals =
    calculatePurchaseTotals();


  const update =
    await db
      .from("purchases")
      .update({

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

      })
      .eq(
        "id",
        id
      );


  if (update.error) {
    throw update.error;
  }


  const deleteItems =
    await db
      .from("purchase_items")
      .delete()
      .eq(
        "purchase_id",
        id
      );


  if (deleteItems.error) {
    throw deleteItems.error;
  }


  const rows =
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
          id,

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


  const insertItems =
    await db
      .from("purchase_items")
      .insert(rows);


  if (insertItems.error) {
    throw insertItems.error;
  }


  await applyPurchaseStock(
    purchaseItems,
    partyId,
    id,
    invoiceNo
  );

}


/* =========================================================
   SATIŞ FATURASI GÜNCELLE
========================================================= */

async function updateSale(id) {

  if (!saleItems.length) {

    throw new Error(
      "Faturada en az bir ürün olmalı."
    );

  }


  await restoreSaleStock(id);


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


    if (
      number(item.quantity) >
      number(product.stock_quantity)
    ) {

      throw new Error(
        `${product.name} için yeterli stok yok.`
      );

    }

  }


  const partyId =
    $("saleParty")?.value ||
    null;

  const invoiceNo =
    $("saleInvoiceNo")
      ?.value
      .trim() || "";

  const invoiceDate =
    $("saleDate")
      ?.value ||
    today();

  const note =
    $("saleNote")
      ?.value
      .trim() || "";


  const totals =
    calculateSaleTotals();


  const update =
    await db
      .from("sales")
      .update({

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

      })
      .eq(
        "id",
        id
      );


  if (update.error) {
    throw update.error;
  }


  const deleteItems =
    await db
      .from("sale_items")
      .delete()
      .eq(
        "sale_id",
        id
      );


  if (deleteItems.error) {
    throw deleteItems.error;
  }


  const rows =
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
          id,

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


  const insertItems =
    await db
      .from("sale_items")
      .insert(rows);


  if (insertItems.error) {
    throw insertItems.error;
  }


  await applySaleStock(
    saleItems,
    partyId,
    id,
    invoiceNo
  );

}


/* =========================================================
   DÜZENLEME BANNER
========================================================= */

function showEditBanner(
  type,
  id
) {

  const page =
    type === "purchase"
      ? $("purchase")
      : $("sales");

  if (!page) return;


  removeEditBanner(type);


  const banner =
    document.createElement("div");

  banner.id =
    `${type}EditBanner`;

  banner.style.cssText = `
    background:#fff7ed;
    border:1px solid #fed7aa;
    color:#9a3412;
    padding:12px 15px;
    border-radius:8px;
    margin-bottom:15px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:10px;
  `;


  banner.innerHTML = `

    <strong>
      Fatura düzenleme modundasınız.
    </strong>

    <button
      type="button"
      class="secondary"
      onclick="${
        type === "purchase"
          ? "cancelPurchaseEdit()"
          : "cancelSaleEdit()"
      }"
    >
      Düzenlemeyi İptal Et
    </button>

  `;


  const firstPanel =
    page.querySelector(".panel");


  if (firstPanel) {

    firstPanel.prepend(
      banner
    );

  }

}


function removeEditBanner(type) {

  const banner =
    $(`${type}EditBanner`);

  if (banner) {
    banner.remove();
  }

}


function cancelPurchaseEdit() {

  editingPurchaseId = null;

  purchaseItems = [];

  removeEditBanner(
    "purchase"
  );

  clearPurchase();

}


function cancelSaleEdit() {

  editingSaleId = null;

  saleItems = [];

  removeEditBanner(
    "sale"
  );

  clearSale();

}


/* =========================================================
   FATURA TEMİZLE
========================================================= */

function clearPurchase() {

  purchaseItems = [];


  if ($("purchaseInvoiceNo")) {
    $("purchaseInvoiceNo").value = "";
  }

  if ($("purchaseDate")) {
    $("purchaseDate").value = today();
  }

  if ($("purchaseParty")) {
    $("purchaseParty").value = "";
  }

  if ($("purchaseNote")) {
    $("purchaseNote").value = "";
  }


  renderPurchaseItems();

}


function clearSale() {

  saleItems = [];


  if ($("saleInvoiceNo")) {
    $("saleInvoiceNo").value = "";
  }

  if ($("saleDate")) {
    $("saleDate").value = today();
  }

  if ($("saleParty")) {
    $("saleParty").value = "";
  }

  if ($("saleNote")) {
    $("saleNote").value = "";
  }


  renderSaleItems();

}


/* =========================================================
   KAYITLI ALIŞ FATURALARI
========================================================= */

function renderSavedPurchases() {

  const purchasePage =
    $("purchase");

  if (!purchasePage) return;


  let container =
    $("savedPurchases");


  if (!container) {

    container =
      document.createElement("div");

    container.id =
      "savedPurchases";

    container.className =
      "panel";


    purchasePage.appendChild(
      container
    );

  }


  if (!purchases.length) {

    container.innerHTML = `

      <div class="panel-header">

        <h2>
          Kayıtlı Alış Faturaları
        </h2>

      </div>

      <div class="empty">
        Henüz kayıtlı alış faturası yok.
      </div>

    `;

    return;

  }


  container.innerHTML = `

    <div class="panel-header">

      <h2>
        Kayıtlı Alış Faturaları
      </h2>

      <strong>
        ${purchases.length} fatura
      </strong>

    </div>


    <table>

      <thead>

        <tr>

          <th>Fatura No</th>
          <th>Tarih</th>
          <th>Tedarikçi</th>
          <th>Matrah</th>
          <th>KDV</th>
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


          return `

            <tr>

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
                ${money(p.subtotal)}
              </td>

              <td>
                ${money(p.vat_amount)}
              </td>

              <td>
                <strong>
                  ${money(p.total)}
                </strong>
              </td>

              <td>

                <button
                  class="primary"
                  onclick="viewPurchase('${p.id}')"
                >
                  Aç
                </button>

                <button
                  class="secondary"
                  onclick="editPurchase('${p.id}')"
                >
                  Değiştir
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
   KAYITLI SATIŞ FATURALARI
========================================================= */

function renderSavedSales() {

  const salePage =
    $("sales");

  if (!salePage) return;


  let container =
    $("savedSales");


  if (!container) {

    container =
      document.createElement("div");

    container.id =
      "savedSales";

    container.className =
      "panel";


    salePage.appendChild(
      container
    );

  }


  if (!sales.length) {

    container.innerHTML = `

      <div class="panel-header">

        <h2>
          Kayıtlı Satış Faturaları
        </h2>

      </div>

      <div class="empty">
        Henüz kayıtlı satış faturası yok.
      </div>

    `;

    return;

  }


  container.innerHTML = `

    <div class="panel-header">

      <h2>
        Kayıtlı Satış Faturaları
      </h2>

      <strong>
        ${sales.length} fatura
      </strong>

    </div>


    <table>

      <thead>

        <tr>

          <th>Fatura No</th>
          <th>Tarih</th>
          <th>Müşteri</th>
          <th>Matrah</th>
          <th>KDV</th>
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


          return `

            <tr>

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
                ${money(s.subtotal)}
              </td>

              <td>
                ${money(s.vat_amount)}
              </td>

              <td>
                <strong>
                  ${money(s.total)}
                </strong>
              </td>

              <td>

                <button
                  class="primary"
                  onclick="viewSale('${s.id}')"
                >
                  Aç
                </button>

                <button
                  class="secondary"
                  onclick="editSale('${s.id}')"
                >
                  Değiştir
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
   ALIŞ FATURASI GÖRÜNTÜLE
========================================================= */

async function viewPurchase(id) {

  try {

    const purchase =
      purchases.find(
        x =>
          String(x.id) ===
          String(id)
      );


    if (!purchase) {
      throw new Error(
        "Fatura bulunamadı."
      );
    }


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


    const party =
      parties.find(
        x =>
          String(x.id) ===
          String(purchase.party_id)
      );


    const rows =
      (result.data || [])
        .map((item, index) => {

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
                  item.unit_price
                )}
              </td>

              <td>
                %${number(
                  item.vat_rate
                )}
              </td>

              <td>
                ${money(
                  item.line_total
                )}
              </td>

            </tr>

          `;

        })
        .join("");


    openModal(

      "Alış Faturası",

      `

        <div class="report-row">

          <span>
            Fatura No
          </span>

          <strong>
            ${escapeHtml(
              purchase.invoice_no || "-"
            )}
          </strong>

        </div>


        <div class="report-row">

          <span>
            Tarih
          </span>

          <strong>
            ${purchase.invoice_date || "-"}
          </strong>

        </div>


        <div class="report-row">

          <span>
            Tedarikçi
          </span>

          <strong>
            ${escapeHtml(
              party?.name || "-"
            )}
          </strong>

        </div>


        <div style="overflow-x:auto;margin-top:20px;">

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
              ${rows}
            </tbody>

          </table>

        </div>


        <div class="invoice-total">

          <div>

            <span>
              Matrah
            </span>

            <strong>
              ${money(
                purchase.subtotal
              )}
            </strong>

          </div>


          <div>

            <span>
              KDV
            </span>

            <strong>
              ${money(
                purchase.vat_amount
              )}
            </strong>

          </div>


          <div class="grand-total">

            <span>
              Genel Toplam
            </span>

            <strong>
              ${money(
                purchase.total
              )}
            </strong>

          </div>

        </div>


        <div class="form-buttons">

          <button
            class="secondary"
            onclick="closeModal()"
          >
            Kapat
          </button>

          <button
            class="primary"
            onclick="closeModal();editPurchase('${id}')"
          >
            Değiştir
          </button>

        </div>

      `

    );

  }

  catch (error) {

    console.error(error);

    showToast(
      "Fatura açılamadı: " +
      error.message
    );

  }

}


/* =========================================================
   SATIŞ FATURASI GÖRÜNTÜLE
========================================================= */

async function viewSale(id) {

  try {

    const sale =
      sales.find(
        x =>
          String(x.id) ===
          String(id)
      );


    if (!sale) {
      throw new Error(
        "Fatura bulunamadı."
      );
    }


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


    const party =
      parties.find(
        x =>
          String(x.id) ===
          String(sale.party_id)
      );


    const rows =
      (result.data || [])
        .map((item, index) => {

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
                  item.unit_price
                )}
              </td>

              <td>
                %${number(
                  item.vat_rate
                )}
              </td>

              <td>
                ${money(
                  item.line_total
                )}
              </td>

            </tr>

          `;

        })
        .join("");


    openModal(

      "Satış Faturası",

      `

        <div class="report-row">

          <span>
            Fatura No
          </span>

          <strong>
            ${escapeHtml(
              sale.invoice_no || "-"
            )}
          </strong>

        </div>


        <div class="report-row">

          <span>
            Tarih
          </span>

          <strong>
            ${sale.invoice_date || "-"}
          </strong>

        </div>


        <div class="report-row">

          <span>
            Müşteri
          </span>

          <strong>
            ${escapeHtml(
              party?.name || "-"
            )}
          </strong>

        </div>


        <div style="overflow-x:auto;margin-top:20px;">

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
              ${rows}
            </tbody>

          </table>

        </div>


        <div class="invoice-total">

          <div>

            <span>
              Matrah
            </span>

            <strong>
              ${money(
                sale.subtotal
              )}
            </strong>

          </div>


          <div>

            <span>
              KDV
            </span>

            <strong>
              ${money(
                sale.vat_amount
              )}
            </strong>

          </div>


          <div class="grand-total">

            <span>
              Genel Toplam
            </span>

            <strong>
              ${money(
                sale.total
              )}
            </strong>

          </div>

        </div>


        <div class="form-buttons">

          <button
            class="secondary"
            onclick="closeModal()"
          >
            Kapat
          </button>

          <button
            class="primary"
            onclick="closeModal();editSale('${id}')"
          >
            Değiştir
          </button>

        </div>

      `

    );

  }

  catch (error) {

    console.error(error);

    showToast(
      "Fatura açılamadı: " +
      error.message
    );

  }

}


/* =========================================================
   STOK HAREKETLERİ
========================================================= */

function renderMovements() {

  const container =
    $("movementsTable");

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

  const productId =
    $("movementProduct")?.value;

  const type =
    $("movementType")?.value;

  const qty =
    number(
      $("movementQty")?.value
    );

  const note =
    $("movementNote")
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

    const update =
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


    if (update.error) {
      throw update.error;
    }


    const movement =
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


    if (movement.error) {
      throw movement.error;
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
    $("reportSummary");

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
   ESKİ FATURALAR SAYFASI İÇİN GÜVENLİK
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
      $("modal");


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

/* =========================================================
   YENİ FATURA SİSTEMİ
   TL / USD + KUR + FORM GİZLE/GÖSTER
========================================================= */

let editingPurchaseId = null;
let editingSaleId = null;


/* ---------------------------------------------------------
   PARA BİRİMİ
--------------------------------------------------------- */

function invoiceMoney(value, currency = "TRY") {

  const symbol =
    currency === "USD"
      ? "$"
      : "₺";

  return Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " " + symbol;

}


/* ---------------------------------------------------------
   FATURA FORMUNU GİZLE
--------------------------------------------------------- */

function hideInvoiceForms() {

  const purchaseForm =
    document.getElementById("purchaseInvoiceForm");

  const saleForm =
    document.getElementById("saleInvoiceForm");

  if (purchaseForm) {
    purchaseForm.style.display = "none";
  }

  if (saleForm) {
    saleForm.style.display = "none";
  }

}


/* ---------------------------------------------------------
   SATIN ALMA FORMUNU AÇ
--------------------------------------------------------- */

function showPurchaseInvoiceForm() {

  const form =
    document.getElementById("purchaseInvoiceForm");

  if (!form) {

    showToast(
      "Satın alma fatura formu bulunamadı."
    );

    return;

  }

  editingPurchaseId = null;

  form.style.display = "block";

  purchaseItems = [];

  renderPurchaseItems();

  setDefaultDates();

  const currency =
    document.getElementById("purchaseCurrency");

  const rate =
    document.getElementById("purchaseExchangeRate");

  if (currency) {
    currency.value = "TRY";
  }

  if (rate) {
    rate.value = "";
  }

  updatePurchaseCurrencyUI();

}


/* ---------------------------------------------------------
   SATIN ALMA FORMUNU KAPAT
--------------------------------------------------------- */

function hidePurchaseInvoiceForm() {

  const form =
    document.getElementById("purchaseInvoiceForm");

  if (form) {
    form.style.display = "none";
  }

  editingPurchaseId = null;

  purchaseItems = [];

}


/* ---------------------------------------------------------
   SATIŞ FORMUNU AÇ
--------------------------------------------------------- */

function showSaleInvoiceForm() {

  const form =
    document.getElementById("saleInvoiceForm");

  if (!form) {

    showToast(
      "Satış fatura formu bulunamadı."
    );

    return;

  }

  editingSaleId = null;

  form.style.display = "block";

  saleItems = [];

  renderSaleItems();

  setDefaultDates();

  const currency =
    document.getElementById("saleCurrency");

  const rate =
    document.getElementById("saleExchangeRate");

  if (currency) {
    currency.value = "TRY";
  }

  if (rate) {
    rate.value = "";
  }

  updateSaleCurrencyUI();

}


/* ---------------------------------------------------------
   SATIŞ FORMUNU KAPAT
--------------------------------------------------------- */

function hideSaleInvoiceForm() {

  const form =
    document.getElementById("saleInvoiceForm");

  if (form) {
    form.style.display = "none";
  }

  editingSaleId = null;

  saleItems = [];

}


/* ---------------------------------------------------------
   ALIŞ PARA BİRİMİ UI
--------------------------------------------------------- */

function updatePurchaseCurrencyUI() {

  const currency =
    document.getElementById("purchaseCurrency");

  const rateGroup =
    document.getElementById(
      "purchaseExchangeRateGroup"
    );

  const rate =
    document.getElementById(
      "purchaseExchangeRate"
    );

  if (!currency) return;

  if (currency.value === "USD") {

    if (rateGroup) {
      rateGroup.style.display = "block";
    }

    if (rate) {
      rate.required = true;
    }

  }

  else {

    if (rateGroup) {
      rateGroup.style.display = "none";
    }

    if (rate) {
      rate.required = false;
      rate.value = "";
    }

  }

  renderPurchaseItems();

}


/* ---------------------------------------------------------
   SATIŞ PARA BİRİMİ UI
--------------------------------------------------------- */

function updateSaleCurrencyUI() {

  const currency =
    document.getElementById("saleCurrency");

  const rateGroup =
    document.getElementById(
      "saleExchangeRateGroup"
    );

  const rate =
    document.getElementById(
      "saleExchangeRate"
    );

  if (!currency) return;

  if (currency.value === "USD") {

    if (rateGroup) {
      rateGroup.style.display = "block";
    }

    if (rate) {
      rate.required = true;
    }

  }

  else {

    if (rateGroup) {
      rateGroup.style.display = "none";
    }

    if (rate) {
      rate.required = false;
      rate.value = "";
    }

  }

  renderSaleItems();

}


/* ---------------------------------------------------------
   ALIŞ FATURA LİSTESİ
--------------------------------------------------------- */

function renderPurchaseInvoiceList() {

  const container =
    document.getElementById(
      "purchaseInvoiceList"
    );

  if (!container) return;

  if (!purchases.length) {

    container.innerHTML = `
      <div class="empty">
        Henüz alış faturası kaydedilmedi.
      </div>
    `;

    return;

  }

  container.innerHTML = `

    <table>

      <thead>

        <tr>

          <th>Fatura No</th>
          <th>Tarih</th>
          <th>Tedarikçi</th>
          <th>Para Birimi</th>
          <th>Kur</th>
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
            p.currency || "TRY";

          const rate =
            Number(p.exchange_rate || 1);

          return `

            <tr>

              <td>
                ${escapeHtml(
                  p.invoice_no || "-"
                )}
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
                <strong>
                  ${currency === "USD"
                    ? "USD"
                    : "TL"}
                </strong>
              </td>

              <td>
                ${
                  currency === "USD"
                    ? Number(rate).toLocaleString(
                        "tr-TR",
                        {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4
                        }
                      )
                    : "-"
                }
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
                  onclick="editPurchaseInvoice('${p.id}')"
                >
                  Düzenle
                </button>

              </td>

            </tr>

          `;

        }).join("")}

      </tbody>

    </table>

  `;

}


/* ---------------------------------------------------------
   SATIŞ FATURA LİSTESİ
--------------------------------------------------------- */

function renderSaleInvoiceList() {

  const container =
    document.getElementById(
      "saleInvoiceList"
    );

  if (!container) return;

  if (!sales.length) {

    container.innerHTML = `
      <div class="empty">
        Henüz satış faturası kaydedilmedi.
      </div>
    `;

    return;

  }

  container.innerHTML = `

    <table>

      <thead>

        <tr>

          <th>Fatura No</th>
          <th>Tarih</th>
          <th>Müşteri</th>
          <th>Para Birimi</th>
          <th>Kur</th>
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
            s.currency || "TRY";

          const rate =
            Number(s.exchange_rate || 1);

          return `

            <tr>

              <td>
                ${escapeHtml(
                  s.invoice_no || "-"
                )}
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
                <strong>
                  ${currency === "USD"
                    ? "USD"
                    : "TL"}
                </strong>
              </td>

              <td>
                ${
                  currency === "USD"
                    ? Number(rate).toLocaleString(
                        "tr-TR",
                        {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4
                        }
                      )
                    : "-"
                }
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
                  onclick="editSaleInvoice('${s.id}')"
                >
                  Düzenle
                </button>

              </td>

            </tr>

          `;

        }).join("")}

      </tbody>

    </table>

  `;

}


/* ---------------------------------------------------------
   ALIŞ KALEMLERİNİ PARA BİRİMİNE GÖRE GÖSTER
--------------------------------------------------------- */

const oldRenderPurchaseItems =
  window.renderPurchaseItems;

window.renderPurchaseItems =
  function () {

    if (
      typeof oldRenderPurchaseItems ===
      "function"
    ) {
      oldRenderPurchaseItems();
    }

    const currency =
      document.getElementById(
        "purchaseCurrency"
      )?.value || "TRY";

    const table =
      document.querySelector(
        "#purchaseItems .invoice-items-table"
      );

    if (!table) return;

    table
      .querySelectorAll("tbody tr")
      .forEach(row => {

        const cells =
          row.querySelectorAll("td");

        if (cells.length >= 8) {

          const unitPrice =
            cells[3];

          const subtotal =
            cells[5];

          const vat =
            cells[6];

          const total =
            cells[7];

          [
            unitPrice,
            subtotal,
            vat,
            total
          ].forEach(cell => {

            if (!cell) return;

            const text =
              cell.textContent
                .replace(/[₺$]/g, "")
                .trim();

            const value =
              Number(
                text
                  .replace(/\./g, "")
                  .replace(",", ".")
              );

            if (!Number.isNaN(value)) {

              cell.textContent =
                invoiceMoney(
                  value,
                  currency
                );

            }

          });

        }

      });

  };


/* ---------------------------------------------------------
   SATIŞ KALEMLERİNİ PARA BİRİMİNE GÖRE GÖSTER
--------------------------------------------------------- */

const oldRenderSaleItems =
  window.renderSaleItems;

window.renderSaleItems =
  function () {

    if (
      typeof oldRenderSaleItems ===
      "function"
    ) {
      oldRenderSaleItems();
    }

    const currency =
      document.getElementById(
        "saleCurrency"
      )?.value || "TRY";

    const table =
      document.querySelector(
        "#saleItems .invoice-items-table"
      );

    if (!table) return;

    table
      .querySelectorAll("tbody tr")
      .forEach(row => {

        const cells =
          row.querySelectorAll("td");

        if (cells.length >= 8) {

          [
            cells[3],
            cells[5],
            cells[6],
            cells[7]
          ].forEach(cell => {

            if (!cell) return;

            const text =
              cell.textContent
                .replace(/[₺$]/g, "")
                .trim();

            const value =
              Number(
                text
                  .replace(/\./g, "")
                  .replace(",", ".")
              );

            if (!Number.isNaN(value)) {

              cell.textContent =
                invoiceMoney(
                  value,
                  currency
                );

            }

          });

        }

      });

  };


/* ---------------------------------------------------------
   ALIŞ FORMUNA PARA BİRİMİ ALANI EKLE
--------------------------------------------------------- */

function addPurchaseCurrencyFields() {

  const invoiceNo =
    document.getElementById(
      "purchaseInvoiceNo"
    );

  if (!invoiceNo) return;

  if (
    document.getElementById(
      "purchaseCurrency"
    )
  ) return;

  const wrapper =
    invoiceNo.closest(
      ".form-group"
    )?.parentElement;

  if (!wrapper) return;

  const html = `

    <div class="form-group">

      <label>Para Birimi</label>

      <select
        id="purchaseCurrency"
        onchange="updatePurchaseCurrencyUI()"
      >

        <option value="TRY">
          TL
        </option>

        <option value="USD">
          USD
        </option>

      </select>

    </div>

    <div
      class="form-group"
      id="purchaseExchangeRateGroup"
      style="display:none"
    >

      <label>Fatura Kuru</label>

      <input
        id="purchaseExchangeRate"
        type="number"
        min="0.0001"
        step="0.0001"
        placeholder="Örn: 40.2500"
      >

      <small>
        1 USD = kaç TL?
      </small>

    </div>

  `;

  wrapper.insertAdjacentHTML(
    "beforeend",
    html
  );

}


/* ---------------------------------------------------------
   SATIŞ FORMUNA PARA BİRİMİ ALANI EKLE
--------------------------------------------------------- */

function addSaleCurrencyFields() {

  const invoiceNo =
    document.getElementById(
      "saleInvoiceNo"
    );

  if (!invoiceNo) return;

  if (
    document.getElementById(
      "saleCurrency"
    )
  ) return;

  const wrapper =
    invoiceNo.closest(
      ".form-group"
    )?.parentElement;

  if (!wrapper) return;

  const html = `

    <div class="form-group">

      <label>Para Birimi</label>

      <select
        id="saleCurrency"
        onchange="updateSaleCurrencyUI()"
      >

        <option value="TRY">
          TL
        </option>

        <option value="USD">
          USD
        </option>

      </select>

    </div>

    <div
      class="form-group"
      id="saleExchangeRateGroup"
      style="display:none"
    >

      <label>Fatura Kuru</label>

      <input
        id="saleExchangeRate"
        type="number"
        min="0.0001"
        step="0.0001"
        placeholder="Örn: 40.2500"
      >

      <small>
        1 USD = kaç TL?
      </small>

    </div>

  `;

  wrapper.insertAdjacentHTML(
    "beforeend",
    html
  );

}


/* ---------------------------------------------------------
   SAYFA AÇILINCA FORMU GİZLE
--------------------------------------------------------- */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setTimeout(() => {

      hideInvoiceForms();

      addPurchaseCurrencyFields();
      addSaleCurrencyFields();

      renderPurchaseInvoiceList();
      renderSaleInvoiceList();

    }, 300);

  }
);


/* ---------------------------------------------------------
   NAVİGASYONDA ALIŞ
--------------------------------------------------------- */

const originalPreparePurchasePage =
  window.preparePurchasePage;

window.preparePurchasePage =
  function () {

    if (
      typeof originalPreparePurchasePage ===
      "function"
    ) {
      originalPreparePurchasePage();
    }

    addPurchaseCurrencyFields();

    renderPurchaseInvoiceList();

    hideInvoiceForms();

  };


/* ---------------------------------------------------------
   NAVİGASYONDA SATIŞ
--------------------------------------------------------- */

const originalPrepareSalePage =
  window.prepareSalePage;

window.prepareSalePage =
  function () {

    if (
      typeof originalPrepareSalePage ===
      "function"
    ) {
      originalPrepareSalePage();
    }

    addSaleCurrencyFields();

    renderSaleInvoiceList();

    hideInvoiceForms();

  };


/* ---------------------------------------------------------
   YÜKLEME SONRASI LİSTELERİ YENİLE
--------------------------------------------------------- */

const originalLoadAll =
  window.loadAll;

window.loadAll =
  async function () {

    if (
      typeof originalLoadAll ===
      "function"
    ) {
      await originalLoadAll();
    }

    renderPurchaseInvoiceList();
    renderSaleInvoiceList();

  };


/* ---------------------------------------------------------
   ALIŞ KAYDETMEDE PARA BİRİMİ
--------------------------------------------------------- */

const originalSavePurchase =
  window.savePurchase;

window.savePurchase =
  async function () {

    const currency =
      document.getElementById(
        "purchaseCurrency"
      )?.value || "TRY";

    const exchangeRate =
      currency === "USD"
        ? number(
            document.getElementById(
              "purchaseExchangeRate"
            )?.value
          )
        : 1;

    if (
      currency === "USD" &&
      exchangeRate <= 0
    ) {

      showToast(
        "USD faturada fatura kuru girin."
      );

      return;

    }

    const oldInsert =
      db.from.bind(db);

    /*
      Orijinal savePurchase fonksiyonu
      çalışmadan önce para birimini
      geçici olarak saklıyoruz.
    */

    window.__purchaseCurrency =
      currency;

    window.__purchaseExchangeRate =
      exchangeRate;

    await originalSavePurchase();

  };


/* ---------------------------------------------------------
   SATIŞ KAYDETMEDE PARA BİRİMİ
--------------------------------------------------------- */

const originalSaveSale =
  window.saveSale;

window.saveSale =
  async function () {

    const currency =
      document.getElementById(
        "saleCurrency"
      )?.value || "TRY";

    const exchangeRate =
      currency === "USD"
        ? number(
            document.getElementById(
              "saleExchangeRate"
            )?.value
          )
        : 1;

    if (
      currency === "USD" &&
      exchangeRate <= 0
    ) {

      showToast(
        "USD faturada fatura kuru girin."
      );

      return;

    }

    window.__saleCurrency =
      currency;

    window.__saleExchangeRate =
      exchangeRate;

    await originalSaveSale();

  };


/* =========================================================
   NOT:
   Aşağıdaki iki fonksiyon kayıt sırasında
   currency/exchange_rate alanlarını kullanır.
========================================================= */


/* ---------------------------------------------------------
   ALIŞ KAYDINI DOĞRUDAN YENİDEN YAP
--------------------------------------------------------- */

async function savePurchaseWithCurrency() {

  if (!purchaseItems.length) {

    showToast(
      "Faturaya en az bir ürün ekleyin."
    );

    return;

  }

  const partyId =
    document.getElementById(
      "purchaseParty"
    )?.value || null;

  const invoiceNo =
    document.getElementById(
      "purchaseInvoiceNo"
    )?.value
    .trim() || "";

  const invoiceDate =
    document.getElementById(
      "purchaseDate"
    )?.value || today();

  const note =
    document.getElementById(
      "purchaseNote"
    )?.value
    .trim() || "";

  const currency =
    document.getElementById(
      "purchaseCurrency"
    )?.value || "TRY";

  const exchangeRate =
    currency === "USD"
      ? number(
          document.getElementById(
            "purchaseExchangeRate"
          )?.value
        )
      : 1;

  if (
    currency === "USD" &&
    exchangeRate <= 0
  ) {

    showToast(
      "USD faturada kur girmeniz gerekiyor."
    );

    return;

  }

  const totals =
    calculatePurchaseTotals();

  try {

    const result =
      await db
        .from("purchases")
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

          currency,

          exchange_rate:
            exchangeRate

        })
        .select()
        .single();

    if (result.error) {
      throw result.error;
    }

    const purchaseId =
      result.data.id;

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

    const itemResult =
      await db
        .from("purchase_items")
        .insert(items);

    if (itemResult.error) {
      throw itemResult.error;
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

      const update =
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

      if (update.error) {
        throw update.error;
      }

      const movement =
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

      if (movement.error) {
        throw movement.error;
      }

    }

    showToast(
      "Alış faturası kaydedildi."
    );

    hidePurchaseInvoiceForm();

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


/* ---------------------------------------------------------
   SATIŞ KAYDINI PARA BİRİMİYLE YAP
--------------------------------------------------------- */

async function saveSaleWithCurrency() {

  if (!saleItems.length) {

    showToast(
      "Faturaya en az bir ürün ekleyin."
    );

    return;

  }

  const partyId =
    document.getElementById(
      "saleParty"
    )?.value || null;

  const invoiceNo =
    document.getElementById(
      "saleInvoiceNo"
    )?.value
    .trim() || "";

  const invoiceDate =
    document.getElementById(
      "saleDate"
    )?.value || today();

  const note =
    document.getElementById(
      "saleNote"
    )?.value
    .trim() || "";

  const currency =
    document.getElementById(
      "saleCurrency"
    )?.value || "TRY";

  const exchangeRate =
    currency === "USD"
      ? number(
          document.getElementById(
            "saleExchangeRate"
          )?.value
        )
      : 1;

  if (
    currency === "USD" &&
    exchangeRate <= 0
  ) {

    showToast(
      "USD faturada kur girmeniz gerekiyor."
    );

    return;

  }

  const totals =
    calculateSaleTotals();

  try {

    const result =
      await db
        .from("sales")
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

          currency,

          exchange_rate:
            exchangeRate

        })
        .select()
        .single();

    if (result.error) {
      throw result.error;
    }

    const saleId =
      result.data.id;

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

    const itemResult =
      await db
        .from("sale_items")
        .insert(items);

    if (itemResult.error) {
      throw itemResult.error;
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

      if (newStock < 0) {

        throw new Error(
          `${product.name} için stok yetersiz.`
        );

      }

      const update =
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

      if (update.error) {
        throw update.error;
      }

      const movement =
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

      if (movement.error) {
        throw movement.error;
      }

    }

    showToast(
      "Satış faturası kaydedildi."
    );

    hideSaleInvoiceForm();

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


/* ---------------------------------------------------------
   BUTONLARI OTOMATİK EKLE
--------------------------------------------------------- */

function addInvoiceButtons() {

  const purchasePage =
    document.getElementById("purchase");

  if (
    purchasePage &&
    !document.getElementById(
      "newPurchaseInvoiceBtn"
    )
  ) {

    const button =
      document.createElement("button");

    button.id =
      "newPurchaseInvoiceBtn";

    button.className =
      "primary big";

    button.textContent =
      "+ Fatura Ekle";

    button.onclick =
      showPurchaseInvoiceForm;

    const header =
      purchasePage.querySelector(
        ".panel-header"
      );

    if (header) {
      header.appendChild(button);
    }

  }


  const salePage =
    document.getElementById("sales");

  if (
    salePage &&
    !document.getElementById(
      "newSaleInvoiceBtn"
    )
  ) {

    const button =
      document.createElement("button");

    button.id =
      "newSaleInvoiceBtn";

    button.className =
      "primary big";

    button.textContent =
      "+ Fatura Ekle";

    button.onclick =
      showSaleInvoiceForm;

    const header =
      salePage.querySelector(
        ".panel-header"
      );

    if (header) {
      header.appendChild(button);
    }

  }

}


/* ---------------------------------------------------------
   FORM VE LİSTELERİ AYIR
--------------------------------------------------------- */

function createInvoiceContainers() {

  const purchase =
    document.getElementById("purchase");

  if (purchase) {

    let list =
      document.getElementById(
        "purchaseInvoiceList"
      );

    if (!list) {

      list =
        document.createElement("div");

      list.id =
        "purchaseInvoiceList";

      list.className =
        "panel";

      purchase.appendChild(list);

    }

  }


  const sale =
    document.getElementById("sales");

  if (sale) {

    let list =
      document.getElementById(
        "saleInvoiceList"
      );

    if (!list) {

      list =
        document.createElement("div");

      list.id =
        "saleInvoiceList";

      list.className =
        "panel";

      sale.appendChild(list);

    }

  }

}


/* ---------------------------------------------------------
   BAŞLANGIÇ
--------------------------------------------------------- */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setTimeout(() => {

      createInvoiceContainers();

      addInvoiceButtons();

      hideInvoiceForms();

      addPurchaseCurrencyFields();
      addSaleCurrencyFields();

      renderPurchaseInvoiceList();
      renderSaleInvoiceList();

    }, 500);

  }
);
