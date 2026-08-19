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

addPurchaseItem()

function addPurchaseItem() {

  try {

    const productSelect =
      document.getElementById("purchaseProduct");

    const qtyInput =
      document.getElementById("purchaseQty");

    const priceInput =
      document.getElementById("purchasePrice");

    const vatSelect =
      document.getElementById("purchaseVat");

    if (!productSelect || !qtyInput || !priceInput || !vatSelect) {

      showToast("Satın alma alanları bulunamadı.");

      console.error("Satın alma form elemanları eksik.");

      return;

    }

    const productId =
      productSelect.value;

    const qty =
      Number(qtyInput.value || 0);

    const price =
      Number(priceInput.value || 0);

    const vat =
      Number(vatSelect.value || 0);

    console.log("ALIŞ ÜRÜN EKLE:", {
      productId,
      qty,
      price,
      vat
    });

    if (!productId) {

      showToast("Lütfen ürün seçin.");

      return;

    }

    if (qty <= 0) {

      showToast("Lütfen miktar girin.");

      return;

    }

    if (price < 0 || isNaN(price)) {

      showToast("Birim fiyatı kontrol edin.");

      return;

    }

    const product =
      products.find(
        p => String(p.id) === String(productId)
      );

    if (!product) {

      showToast("Seçilen ürün bulunamadı.");

      console.error(
        "Ürün bulunamadı:",
        productId,
        products
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

    console.log(
      "purchaseItems:",
      purchaseItems
    );

    qtyInput.value = "";
    priceInput.value = "";

    renderPurchaseItems();

    showToast("Ürün faturaya eklendi.");

  }

  catch (error) {

    console.error(
      "addPurchaseItem hatası:",
      error
    );

    showToast(
      "Ürün eklenirken hata oluştu: " +
      error.message
    );

  }

}
