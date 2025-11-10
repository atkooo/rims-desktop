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
        id,
        code,
        name,
        description,
        rental_price_per_day,
        sale_price,
        stock_quantity,
        available_quantity,
        min_stock_alert,
        is_available_for_rent,
        is_available_for_sale,
        is_active
      FROM accessories
      ORDER BY name ASC
    `,
    "accessories",
  );

  register(
    "master:getBundles",
    () => `
      SELECT
        id,
        code,
        name,
        description,
        bundle_type,
        price,
        rental_price_per_day,
        stock_quantity,
        available_quantity,
        is_active
      FROM bundles
      ORDER BY name ASC
    `,
    "bundles",
  );

  register(
    "master:getBundleDetails",
    () => `
      SELECT
        bd.id,
        b.name AS bundle_name,
        i.name AS item_name,
        a.name AS accessory_name,
        bd.quantity,
        bd.notes,
        bd.created_at
      FROM bundle_details bd
      LEFT JOIN bundles b ON bd.bundle_id = b.id
      LEFT JOIN items i ON bd.item_id = i.id
      LEFT JOIN accessories a ON bd.accessory_id = a.id
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
        COALESCE(rc.total_rentals, 0) + COALESCE(sc.total_sales, 0) AS total_transactions,
        c.is_active,
        c.created_at,
        c.updated_at
      FROM customers c
      LEFT JOIN rental_counts rc ON rc.customer_id = c.id
      LEFT JOIN sales_counts sc ON sc.customer_id = c.id
      ORDER BY c.name ASC
    `,
    "customers",
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
