const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");

function setupMasterDataViewHandlers() {
  const register = (channel, queryBuilder, label) => {
    ipcMain.handle(channel, async () => {
      try {
        const sql =
          typeof queryBuilder === "function" ? queryBuilder() : queryBuilder;
        return await database.query(sql);
      } catch (error) {
        logger.error(`Error fetching ${label}:`, error);
        throw error;
      }
    });
  };

  register(
    "master:getAccessories",
    () => `
      SELECT
        a.id,
        a.code,
        a.name,
        a.description,
        a.rental_price_per_day,
        a.sale_price,
        a.stock_quantity,
        a.available_quantity,
        a.min_stock_alert,
        a.is_available_for_rent,
        a.is_available_for_sale,
        a.is_active,
        dg.name AS discount_group_name,
        dg.discount_percentage,
        dg.discount_amount
      FROM accessories a
      LEFT JOIN discount_groups dg ON a.discount_group_id = dg.id
      ORDER BY a.name ASC
    `,
    "accessories",
  );

  register(
    "master:getBundles",
    () => `
      SELECT
        b.id,
        b.code,
        b.name,
        b.description,
        b.bundle_type,
        b.price,
        b.rental_price_per_day,
        b.stock_quantity,
        b.available_quantity,
        b.is_active,
        dg.name AS discount_group_name,
        dg.discount_percentage,
        dg.discount_amount
      FROM bundles b
      LEFT JOIN discount_groups dg ON b.discount_group_id = dg.id
      ORDER BY b.name ASC
    `,
    "bundles",
  );

  register(
    "master:getBundleDetails",
    () => `
      SELECT
        bd.id,
        b.name AS bundle_name,
        b.code AS bundle_code,
        i.name AS item_name,
        i.code AS item_code,
        i.sale_price AS item_sale_price,
        i.rental_price_per_day AS item_rental_price,
        i.price AS item_price,
        c.name AS category_name,
        a.name AS accessory_name,
        a.code AS accessory_code,
        a.sale_price AS accessory_sale_price,
        bd.quantity,
        bd.notes,
        bd.created_at,
        CASE 
          WHEN bd.item_id IS NOT NULL THEN 'item'
          WHEN bd.accessory_id IS NOT NULL THEN 'accessory'
          ELSE NULL
        END AS type,
        CASE 
          WHEN bd.item_id IS NOT NULL THEN 'Item'
          WHEN bd.accessory_id IS NOT NULL THEN 'Aksesoris'
          ELSE NULL
        END AS type_label
      FROM bundle_details bd
      LEFT JOIN bundles b ON bd.bundle_id = b.id
      LEFT JOIN items i ON bd.item_id = i.id
      LEFT JOIN accessories a ON bd.accessory_id = a.id
      LEFT JOIN categories c ON i.category_id = c.id
      ORDER BY b.name ASC, bd.id ASC
    `,
    "bundle details",
  );

  register(
    "master:getCustomers",
    () => `
      WITH rental_counts AS (
        SELECT customer_id, COUNT(*) AS total_rentals
        FROM rental_transactions
        GROUP BY customer_id
      ),
      sales_counts AS (
        SELECT customer_id, COUNT(*) AS total_sales
        FROM sales_transactions
        GROUP BY customer_id
      )
      SELECT
        c.id,
        c.code,
        c.name,
        c.phone,
        c.email,
        c.address,
        c.id_card_number,
        c.photo_path,
        c.id_card_image_path,
        c.notes,
        c.discount_group_id,
        dg.name AS discount_group_name,
        dg.discount_percentage,
        dg.discount_amount,
        COALESCE(rc.total_rentals, 0) + COALESCE(sc.total_sales, 0) AS total_transactions,
        c.is_active,
        c.created_at,
        c.updated_at
      FROM customers c
      LEFT JOIN rental_counts rc ON rc.customer_id = c.id
      LEFT JOIN sales_counts sc ON sc.customer_id = c.id
      LEFT JOIN discount_groups dg ON c.discount_group_id = dg.id
      ORDER BY c.name ASC
    `,
    "customers",
  );

  register(
    "master:getDiscountGroups",
    () => `
      SELECT
        id,
        code,
        name,
        discount_percentage,
        discount_amount,
        description,
        is_active,
        created_at,
        updated_at
      FROM discount_groups
      ORDER BY name ASC
    `,
    "discount groups",
  );

  register(
    "master:getRoles",
    () => `
      SELECT
        id,
        name,
        description
      FROM roles
      ORDER BY name ASC
    `,
    "roles",
  );

  register(
    "master:getUsers",
    () => `
      SELECT
        u.id,
        u.username,
        u.full_name,
        u.email,
        u.is_active,
        r.name AS role_name,
        u.last_login,
        u.created_at
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.full_name ASC
    `,
    "users",
  );
}

module.exports = setupMasterDataViewHandlers;
