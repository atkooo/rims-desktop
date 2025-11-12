const path = require("path");
const { createFreshTestDb, cleanupTestDb } = require("../../utils/test-db");
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

describe("Database Helpers", () => {
  let testDb;

  beforeAll(async () => {
    // Create test database
    testDb = await createFreshTestDb(path.join(__dirname, "../../../data/test/test.db"));
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

  describe("database.query", () => {
    test("should execute SELECT query", async () => {
      const now = new Date().toISOString();
      await database.execute(
        "INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["Test Category", "Test Description", 1, now, now]
      );

      const categories = await database.query("SELECT * FROM categories WHERE name = ?", ["Test Category"]);
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0].name).toBe("Test Category");
    });

    test("should return empty array for no results", async () => {
      const categories = await database.query("SELECT * FROM categories WHERE name = ?", ["Non-existent"]);
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBe(0);
    });
  });

  describe("database.queryOne", () => {
    test("should return single row", async () => {
      const now = new Date().toISOString();
      const result = await database.execute(
        "INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["Test Category 2", "Test Description", 1, now, now]
      );

      const category = await database.queryOne("SELECT * FROM categories WHERE id = ?", [result.id]);
      expect(category).toBeDefined();
      expect(category.id).toBe(result.id);
      expect(category.name).toBe("Test Category 2");
    });

    test("should return undefined for no results", async () => {
      const category = await database.queryOne("SELECT * FROM categories WHERE id = ?", [99999]);
      expect(category).toBeUndefined();
    });
  });

  describe("database.execute", () => {
    test("should execute INSERT query", async () => {
      const now = new Date().toISOString();
      const result = await database.execute(
        "INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["New Category", "New Description", 1, now, now]
      );

      expect(result.id).toBeDefined();
      expect(result.changes).toBe(1);

      // Verify insertion
      const category = await database.queryOne("SELECT * FROM categories WHERE id = ?", [result.id]);
      expect(category).toBeDefined();
      expect(category.name).toBe("New Category");
    });

    test("should execute UPDATE query", async () => {
      const now = new Date().toISOString();
      const result = await database.execute(
        "INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["Update Test", "Description", 1, now, now]
      );

      const updateResult = await database.execute(
        "UPDATE categories SET name = ? WHERE id = ?",
        ["Updated Name", result.id]
      );

      expect(updateResult.changes).toBe(1);

      // Verify update
      const category = await database.queryOne("SELECT * FROM categories WHERE id = ?", [result.id]);
      expect(category.name).toBe("Updated Name");
    });

    test("should execute DELETE query", async () => {
      const now = new Date().toISOString();
      const result = await database.execute(
        "INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["Delete Test", "Description", 1, now, now]
      );

      const deleteResult = await database.execute("DELETE FROM categories WHERE id = ?", [result.id]);
      expect(deleteResult.changes).toBe(1);

      // Verify deletion
      const category = await database.queryOne("SELECT * FROM categories WHERE id = ?", [result.id]);
      expect(category).toBeUndefined();
    });
  });

  describe("database transactions", () => {
    test("should rollback on error", async () => {
      const now = new Date().toISOString();
      
      try {
        await database.execute("BEGIN TRANSACTION");
        
        await database.execute(
          "INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
          ["Transaction Test", "Description", 1, now, now]
        );
        
        // Force error
        await database.execute("INSERT INTO non_existent_table VALUES (?)", [1]);
        
        await database.execute("COMMIT");
      } catch (error) {
        await database.execute("ROLLBACK");
      }

      // Verify rollback - category should not exist
      const category = await database.queryOne("SELECT * FROM categories WHERE name = ?", ["Transaction Test"]);
      expect(category).toBeUndefined();
    });

    test("should commit on success", async () => {
      const now = new Date().toISOString();
      
      await database.execute("BEGIN TRANSACTION");
      
      const result = await database.execute(
        "INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["Commit Test", "Description", 1, now, now]
      );
      
      await database.execute("COMMIT");

      // Verify commit - category should exist
      const category = await database.queryOne("SELECT * FROM categories WHERE id = ?", [result.id]);
      expect(category).toBeDefined();
      expect(category.name).toBe("Commit Test");
    });
  });

  describe("database.tableExists", () => {
    test("should return true for existing table", async () => {
      const exists = await database.tableExists("categories");
      expect(exists).toBe(true);
    });

    test("should return false for non-existent table", async () => {
      const exists = await database.tableExists("non_existent_table");
      expect(exists).toBe(false);
    });
  });
});

