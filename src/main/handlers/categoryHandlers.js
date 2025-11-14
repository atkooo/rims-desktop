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
      return await database.query(sql);
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
      return await database.queryOne(sql, [id]);
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
      const isActive = is_active ?? 1;

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
        isActive,
        now,
        now,
      ]);

      return {
        id: result.id,
        name,
        description,
        is_active: isActive,
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
      const isActive = is_active ?? 1;

      const sql = `
        UPDATE categories 
        SET 
          name = ?,
          description = ?,
          is_active = ?,
          updated_at = ?
        WHERE id = ?
      `;

      await database.execute(sql, [name, description, isActive, now, id]);

      return {
        id,
        name,
        description,
        is_active: isActive,
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
      const countRow = await database.queryOne(
        `SELECT COUNT(*) as count 
         FROM items 
         WHERE category_id = ?`,
        [id],
      );

      if ((countRow?.count ?? 0) > 0) {
        throw new Error("Cannot delete category that is being used by items");
      }

      await database.execute("DELETE FROM categories WHERE id = ?", [id]);
      return true;
    } catch (error) {
      logger.error(`Error deleting category ${id}:`, error);
      throw error;
    }
  });
}

module.exports = setupCategoryHandlers;
