const path = require("path");
const { createFreshTestDb, cleanupTestDb } = require("../../utils/test-db");
const setupCategoryHandlers = require("../../../src/main/handlers/categoryHandlers");
const database = require("../../../src/main/helpers/database");

// Mock database config to use test database
jest.mock("../../../src/main/config/database", () => {
  const path = require("path");
  const testDbPath = path.join(__dirname, "../../../data/test/test.db");
  return {
    path: testDbPath,
    options: {
      pragma: {
        foreign_keys: "ON",
      },
    },
  };
});

describe("Category Handlers", () => {
  let testDb;

  beforeAll(async () => {
    // Create test database
    testDb = await createFreshTestDb(path.join(__dirname, "../../../data/test/test.db"));
    
    // Setup handlers - they will use the mocked database config
    setupCategoryHandlers();
  });

  afterAll(async () => {
    // Close database connection first
    try {
      await database.close();
    } catch (error) {
      // Ignore errors during cleanup
    }
    
    // Wait a bit to ensure database is fully closed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Clean up test database
    await cleanupTestDb(testDb);
  });

  beforeEach(async () => {
    // Clean up categories before each test
    try {
      await database.execute("DELETE FROM categories WHERE id > 0");
    } catch (error) {
      // Ignore errors if table doesn't exist
    }
  });

  describe("categories:getAll", () => {
    test("should return empty array when no categories exist", async () => {
      // Clear all categories for this test (need to handle foreign key constraints)
      // First delete items that reference categories
      await database.execute("DELETE FROM items");
      await database.execute("DELETE FROM categories");
      
      const handler = mockIpcMain.handlers.get("categories:getAll");
      expect(handler).toBeDefined();
      
      const categories = await handler({});
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBe(0);
    });

    test("should return all categories", async () => {
      // Create test categories
      const now = new Date().toISOString();
      await database.execute(
        "INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["Category 1", "Description 1", 1, now, now]
      );
      await database.execute(
        "INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["Category 2", "Description 2", 1, now, now]
      );

      const handler = mockIpcMain.handlers.get("categories:getAll");
      const categories = await handler({});
      
      expect(categories.length).toBeGreaterThanOrEqual(2);
      const names = categories.map(c => c.name);
      expect(names).toContain("Category 1");
      expect(names).toContain("Category 2");
    });
  });

  describe("categories:getById", () => {
    test("should return category by ID", async () => {
      const now = new Date().toISOString();
      const result = await database.execute(
        "INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["Test Category", "Test Description", 1, now, now]
      );

      const handler = mockIpcMain.handlers.get("categories:getById");
      const category = await handler({}, result.id);
      
      expect(category).toBeDefined();
      expect(category.name).toBe("Test Category");
      expect(category.description).toBe("Test Description");
    });

    test("should return null for non-existent category", async () => {
      const handler = mockIpcMain.handlers.get("categories:getById");
      const category = await handler({}, 99999);
      expect(category).toBeUndefined();
    });
  });

  describe("categories:create", () => {
    test("should create a new category", async () => {
      const categoryData = {
        name: "New Category",
        description: "New Description",
        is_active: 1,
      };

      const handler = mockIpcMain.handlers.get("categories:create");
      const category = await handler({}, categoryData);
      
      expect(category).toBeDefined();
      expect(category.id).toBeDefined();
      expect(category.name).toBe("New Category");
      expect(category.description).toBe("New Description");
    });

    test("should set default is_active to 1", async () => {
      const categoryData = {
        name: "New Category 2",
        description: "New Description",
      };

      const handler = mockIpcMain.handlers.get("categories:create");
      const category = await handler({}, categoryData);
      expect(category.is_active).toBe(1);
    });
  });

  describe("categories:update", () => {
    test("should update category", async () => {
      const now = new Date().toISOString();
      const result = await database.execute(
        "INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["Old Name", "Old Description", 1, now, now]
      );

      const updateData = {
        id: result.id,
        name: "Updated Name",
        description: "Updated Description",
        is_active: 0,
      };

      const handler = mockIpcMain.handlers.get("categories:update");
      const updated = await handler({}, updateData);
      
      expect(updated.name).toBe("Updated Name");
      expect(updated.description).toBe("Updated Description");
    });
  });

  describe("categories:delete", () => {
    test("should delete category when not used", async () => {
      const now = new Date().toISOString();
      const result = await database.execute(
        "INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["To Delete", "Description", 1, now, now]
      );

      const handler = mockIpcMain.handlers.get("categories:delete");
      const deleted = await handler({}, result.id);
      expect(deleted).toBe(true);

      const category = await database.queryOne("SELECT * FROM categories WHERE id = ?", [result.id]);
      expect(category).toBeUndefined();
    });

    test("should not delete category when used by items", async () => {
      const now = new Date().toISOString();
      // Create category
      const categoryResult = await database.execute(
        "INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["Used Category", "Description", 1, now, now]
      );

      // Create item using this category
      const itemResult = await database.execute(
        "INSERT INTO items (code, name, price, category_id, type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ["ITEM-001", "Test Item", 1000, categoryResult.id, "RENTAL", "AVAILABLE", now, now]
      );

      // Try to delete category
      const handler = mockIpcMain.handlers.get("categories:delete");
      await expect(handler({}, categoryResult.id)).rejects.toThrow();

      // Category should still exist
      const category = await database.queryOne("SELECT * FROM categories WHERE id = ?", [categoryResult.id]);
      expect(category).toBeDefined();

      // Cleanup
      await database.execute("DELETE FROM items WHERE id = ?", [itemResult.id]);
    });
  });
});

