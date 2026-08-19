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

function addPurchaseItem() 
  
    
