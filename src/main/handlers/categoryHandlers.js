const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");

// Setup handlers untuk kategori
function setupCategoryHandlers() {
  // Get all categories
  ipcMain.handle("categories:getAll", async () => {
    try {
      const sql = `
                SELECT 
                    id,
                    name,
                    description,
                    is_active,
                    created_at,
                    updated_at
                FROM categories 
                ORDER BY name ASC
            `;
      const categories = await database.query(sql);
      return categories;
    } catch (error) {
      logger.error("Error fetching categories:", error);
      throw error;
    }
  });

  // Get category by ID
  ipcMain.handle("categories:getById", async (event, id) => {
    try {
      const sql = `
                SELECT 
                    id,
                    name,
                    description,
                    is_active,
                    created_at,
                    updated_at
                FROM categories 
                WHERE id = ?
            `;
      const category = await database.queryOne(sql, [id]);
      return category;
    } catch (error) {
      logger.error(`Error fetching category ${id}:`, error);
      throw error;
    }
  });

  // Create new category
  ipcMain.handle("categories:create", async (event, categoryData) => {
    try {
      const { name, description, is_active } = categoryData;
      const now = new Date().toISOString();

      const sql = `
                INSERT INTO categories (
                    name, 
                    description, 
                    is_active,
                    created_at, 
                    updated_at
                ) VALUES (?, ?, ?, ?, ?)
            `;

      const result = await database.execute(sql, [
        name,
        description,
        is_active ?? 1,
        now,
        now,
      ]);

      return {
        id: result.id,
        name,
        description,
        is_active: is_active ?? 1,
        created_at: now,
        updated_at: now,
      };
    } catch (error) {
      logger.error("Error creating category:", error);
      throw error;
    }
  });

  // Update category
  ipcMain.handle("categories:update", async (event, categoryData) => {
    try {
      const { id, name, description, is_active } = categoryData;
      const now = new Date().toISOString();

      const sql = `
                UPDATE categories 
                SET 
                    name = ?,
                    description = ?,
                    is_active = ?,
                    updated_at = ?
                WHERE id = ?
            `;

      await database.execute(sql, [name, description, is_active ?? 1, now, id]);

      return {
        id,
        name,
        description,
        updated_at: now,
      };
    } catch (error) {
      logger.error(`Error updating category ${categoryData.id}:`, error);
      throw error;
    }
  });

  // Delete category
  ipcMain.handle("categories:delete", async (event, id) => {
    try {
      // Check if category is used in items
      const checkSql = `
                SELECT COUNT(*) as count 
                FROM items 
                WHERE category_id = ?
            `;
      const countRow = await database.queryOne(checkSql, [id]);
      const count = countRow ? countRow.count : 0;

      if (count > 0) {
        throw new Error("Cannot delete category that is being used by items");
      }

      const sql = `DELETE FROM categories WHERE id = ?`;
      await database.execute(sql, [id]);
      return true;
    } catch (error) {
      logger.error(`Error deleting category ${id}:`, error);
      throw error;
    }
  });
}

module.exports = setupCategoryHandlers;
