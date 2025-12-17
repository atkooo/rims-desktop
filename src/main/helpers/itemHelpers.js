const database = require("./database");
const validator = require("./validator");
const { normalizeCode, toInteger, generateItemCode } = require("./codeUtils");

/**
 * Get availability settings based on item type
 * @param {string} type - Item type: 'RENTAL', 'SALE', or 'BOTH'
 * @returns {Object} Object with is_available_for_rent and is_available_for_sale flags
 */
function getAvailabilityByType(type) {
  if (type === "RENTAL") {
    return { is_available_for_rent: true, is_available_for_sale: false };
  } else if (type === "SALE") {
    return { is_available_for_rent: false, is_available_for_sale: true };
  } else if (type === "BOTH") {
    return { is_available_for_rent: true, is_available_for_sale: true };
  }
  return { is_available_for_rent: true, is_available_for_sale: false };
}

/**
 * Build common item SELECT query with status calculation
 * @param {string} whereClause - WHERE clause (without WHERE keyword)
 * @param {string} orderBy - ORDER BY clause
 * @returns {string} SQL query string
 */
function buildItemSelectQuery(whereClause = "", orderBy = "ORDER BY i.id DESC") {
  return `
    SELECT
      i.*,
      c.name AS category_name,
      s.name AS size_name,
      s.code AS size_code,
      dg.name AS discount_group_name,
      dg.discount_percentage,
      dg.discount_amount,
      COALESCE(SUM(CASE WHEN rtd.is_returned = 0 THEN rtd.quantity ELSE 0 END), 0) AS rented_quantity,
      CASE
        WHEN i.stock_quantity = 0 THEN 'OUT_OF_STOCK'
        WHEN i.available_quantity > 0 THEN 'AVAILABLE'
        WHEN COALESCE(SUM(CASE WHEN rtd.is_returned = 0 THEN rtd.quantity ELSE 0 END), 0) > 0 THEN 'RENTED'
        WHEN i.stock_quantity > 0 AND i.available_quantity = 0 THEN 'MAINTENANCE'
        ELSE 'OUT_OF_STOCK'
      END AS status
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN item_sizes s ON i.size_id = s.id
    LEFT JOIN discount_groups dg ON i.discount_group_id = dg.id
    LEFT JOIN rental_transaction_details rtd ON rtd.item_id = i.id
    ${whereClause}
    GROUP BY i.id
    ${orderBy}
  `;
}

/**
 * Validate and normalize item data for creation
 * @param {Object} itemData - Raw item data
 * @returns {Promise<Object>} Normalized and validated item data
 */
async function prepareItemForCreation(itemData) {
  // Generate code based on type if not provided
  let code = (itemData.code || "").trim();
  if (!code) {
    const itemType = itemData.type || "RENTAL";
    code = await generateItemCode(database, itemType);
  } else {
    // Normalize provided code
    code = normalizeCode(code, itemData.name);
  }

  // Validasi input
  if (!validator.isNotEmpty(itemData.name)) {
    throw new Error("Nama item harus diisi");
  }
  if (!itemData.category_id) {
    throw new Error("Kategori harus dipilih");
  }

  // Map dailyRate to rental_price_per_day
  const rentalPricePerDay =
    itemData.dailyRate ?? itemData.rental_price_per_day ?? 0;

  // Get sale_price from itemData
  const salePrice = itemData.sale_price ?? 0;

  // Get purchase_price from itemData
  const purchasePrice = Math.max(0, Number(itemData.purchase_price ?? 0));

  // Validasi: harga beli tidak boleh lebih dari harga jual
  if (salePrice > 0 && purchasePrice > salePrice) {
    throw new Error("Harga beli tidak boleh lebih dari harga jual");
  }

  // Auto-set is_available_for_rent dan is_available_for_sale berdasarkan tipe item
  const itemType = itemData.type ?? "RENTAL";
  const availability = getAvailabilityByType(itemType);

  // Validate discount_group_id if provided
  const discountGroupId = await validator.validateDiscountGroupId(
    itemData.discount_group_id
  );

  // Stok selalu 0 saat create, diatur melalui manajemen stok
  const stockQuantity = 0;
  const availableQuantity = 0;

  // Get min_stock_alert from itemData, default to 1
  const minStockAlert = Math.max(
    0,
    toInteger(
      itemData.min_stock_alert === undefined ||
        itemData.min_stock_alert === null
        ? 1
        : itemData.min_stock_alert
    )
  );

  // Get deposit from itemData, default to 0
  const deposit = Math.max(0, Number(itemData.deposit ?? 0));

  return {
    code,
    name: itemData.name,
    description: itemData.description ?? null,
    purchasePrice,
    salePrice,
    itemType,
    sizeId: itemData.size_id ?? null,
    categoryId: itemData.category_id,
    rentalPricePerDay,
    deposit,
    discountGroupId,
    stockQuantity,
    availableQuantity,
    minStockAlert,
    isAvailableForRent: availability.is_available_for_rent,
    isAvailableForSale: availability.is_available_for_sale,
    isActive: (itemData.is_active ?? true) ? 1 : 0,
  };
}

/**
 * Validate item can be deleted (not used in transactions)
 * @param {number} itemId - Item ID to check
 * @returns {Promise<void>} Throws error if item cannot be deleted
 */
async function validateItemDeletion(itemId) {
  // Check if item is used in rental transactions
  const rentalCheck = await database.queryOne(
    "SELECT COUNT(*) as count FROM rental_transaction_details WHERE item_id = ?",
    [itemId]
  );
  if ((rentalCheck?.count ?? 0) > 0) {
    throw new Error(
      "Tidak dapat menghapus item yang digunakan dalam transaksi sewa"
    );
  }

  // Check if item is used in sales transactions
  const salesCheck = await database.queryOne(
    "SELECT COUNT(*) as count FROM sales_transaction_details WHERE item_id = ?",
    [itemId]
  );
  if ((salesCheck?.count ?? 0) > 0) {
    throw new Error(
      "Tidak dapat menghapus item yang digunakan dalam transaksi penjualan"
    );
  }

  // Check if item is used in stock movements
  const stockMovementCheck = await database.queryOne(
    "SELECT COUNT(*) as count FROM stock_movements WHERE item_id = ?",
    [itemId]
  );
  if ((stockMovementCheck?.count ?? 0) > 0) {
    throw new Error(
      "Tidak dapat menghapus item yang memiliki riwayat pergerakan stok"
    );
  }
}

/**
 * Normalize and validate item update data
 * @param {number} id - Item ID
 * @param {Object} updates - Update data
 * @returns {Promise<Object>} Normalized update data
 */
async function prepareItemForUpdate(id, updates) {
  // Validasi input
  if (updates.name !== undefined && !validator.isNotEmpty(updates.name)) {
    throw new Error("Nama item harus diisi");
  }
  if (updates.code !== undefined && !validator.isNotEmpty(updates.code)) {
    throw new Error("Kode item harus diisi");
  }
  if (updates.category_id !== undefined && !updates.category_id) {
    throw new Error("Kategori harus dipilih");
  }

  // Map form fields to database columns and filter out invalid fields
  const validColumns = [
    "code",
    "name",
    "description",
    "type",
    "size_id",
    "category_id",
    "purchase_price",
    "rental_price_per_day",
    "sale_price",
    "deposit",
    "stock_quantity",
    "available_quantity",
    "min_stock_alert",
    "image_path",
    "is_available_for_rent",
    "is_available_for_sale",
    "is_active",
    "discount_group_id",
  ];

  const normalizedUpdates = {};

  // Validasi: Type item tidak bisa diubah saat edit
  const existingItem = await database.queryOne(
    "SELECT type FROM items WHERE id = ?",
    [id]
  );

  if (!existingItem) {
    throw new Error("Item tidak ditemukan");
  }

  // Jika ada percobaan untuk mengubah type, tolak dengan error
  if (updates.type !== undefined && updates.type !== existingItem.type) {
    throw new Error(
      "Jenis item (type) tidak dapat diubah. Item yang sudah dibuat dengan jenis tertentu tidak dapat diubah jenisnya."
    );
  }

  // Map dailyRate or rental_price_per_day to rental_price_per_day
  if (updates.rental_price_per_day !== undefined) {
    normalizedUpdates.rental_price_per_day = updates.rental_price_per_day;
  } else if (updates.dailyRate !== undefined) {
    normalizedUpdates.rental_price_per_day = updates.dailyRate;
  }

  // Validate discount_group_id if provided
  if (updates.discount_group_id !== undefined) {
    normalizedUpdates.discount_group_id =
      await validator.validateDiscountGroupId(updates.discount_group_id);
  }

  // Handle min_stock_alert if provided
  if (updates.min_stock_alert !== undefined) {
    normalizedUpdates.min_stock_alert = Math.max(
      0,
      toInteger(updates.min_stock_alert)
    );
  }

  // Handle deposit if provided
  if (updates.deposit !== undefined) {
    normalizedUpdates.deposit = Math.max(0, Number(updates.deposit ?? 0));
  }

  // Copy other valid fields
  for (const [key, value] of Object.entries(updates)) {
    // Skip fields that don't exist in database or already handled
    if (
      key === "dailyRate" ||
      key === "discount_group_id" ||
      key === "min_stock_alert" ||
      key === "deposit" ||
      key === "stock_quantity" ||
      key === "available_quantity" ||
      key === "type" ||
      key === "status"
    ) {
      continue;
    }
    if (validColumns.includes(key)) {
      normalizedUpdates[key] = value;
    }
  }

  // Validasi: harga beli tidak boleh lebih dari harga jual
  if (
    normalizedUpdates.purchase_price !== undefined ||
    normalizedUpdates.sale_price !== undefined
  ) {
    const existingItem = await database.queryOne(
      "SELECT purchase_price, sale_price FROM items WHERE id = ?",
      [id]
    );

    const finalPurchasePrice =
      normalizedUpdates.purchase_price !== undefined
        ? Math.max(0, Number(normalizedUpdates.purchase_price))
        : (existingItem?.purchase_price ?? 0);

    const finalSalePrice =
      normalizedUpdates.sale_price !== undefined
        ? Math.max(0, Number(normalizedUpdates.sale_price))
        : (existingItem?.sale_price ?? 0);

    if (finalSalePrice > 0 && finalPurchasePrice > finalSalePrice) {
      throw new Error("Harga beli tidak boleh lebih dari harga jual");
    }

    if (normalizedUpdates.purchase_price !== undefined) {
      normalizedUpdates.purchase_price = finalPurchasePrice;
    }
    if (normalizedUpdates.sale_price !== undefined) {
      normalizedUpdates.sale_price = finalSalePrice;
    }
  }

  // Normalize code if provided
  if (normalizedUpdates.code !== undefined) {
    normalizedUpdates.code = normalizeCode(normalizedUpdates.code);
  }

  if (Object.keys(normalizedUpdates).length === 0) {
    throw new Error("Tidak ada field yang valid untuk diupdate");
  }

  return normalizedUpdates;
}

module.exports = {
  getAvailabilityByType,
  buildItemSelectQuery,
  prepareItemForCreation,
  validateItemDeletion,
  prepareItemForUpdate,
};

