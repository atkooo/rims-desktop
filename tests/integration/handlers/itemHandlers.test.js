const path = require("path");
const { createFreshTestDb, cleanupTestDb } = require("../../utils/test-db");
const setupItemHandlers = require("../../../src/main/handlers/itemHandlers");
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

describe("Item Handlers", () => {
  let testDb;
  let testCategory;

  beforeAll(async () => {
    // Create test database
    testDb = await createFreshTestDb(path.join(__dirname, "../../../data/test/test.db"));
    
    // Setup handlers
    setupItemHandlers();

    // Create test category
    const now = new Date().toISOString();
    const categoryResult = await database.execute(
      "INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ["Test Category", "Test Description", 1, now, now]
    );
    testCategory = categoryResult.id;
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
    // Clean up items before each test
    try {
      await database.execute("DELETE FROM items WHERE id > 0");
    } catch (error) {
      // Ignore errors
    }
  });

  describe("items:getAll", () => {
    test("should return empty array when no items exist", async () => {
      const handler = mockIpcMain.handlers.get("items:getAll");
      expect(handler).toBeDefined();
      
      const items = await handler({});
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(0);
    });

    test("should return all items with category and size info", async () => {
      const now = new Date().toISOString();
      await database.execute(
        "INSERT INTO items (code, name, price, category_id, type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ["ITEM-001", "Test Item 1", 1000, testCategory, "RENTAL", "AVAILABLE", now, now]
      );

      const handler = mockIpcMain.handlers.get("items:getAll");
      const items = await handler({});
      
      expect(items.length).toBeGreaterThan(0);
      const item = items.find(i => i.code === "ITEM-001");
      expect(item).toBeDefined();
      expect(item.category_name).toBe("Test Category");
    });
  });

  describe("items:add", () => {
    test("should create a new item", async () => {
      const itemData = {
        name: "New Item",
        code: "NEW-ITEM",
        price: 1000,
        category_id: testCategory,
        type: "RENTAL",
        status: "AVAILABLE",
      };

      const handler = mockIpcMain.handlers.get("items:add");
      const item = await handler({}, itemData);
      
      expect(item).toBeDefined();
      expect(item.id).toBeDefined();
      expect(item.name).toBe("New Item");
      expect(item.price).toBe(1000);
      expect(item.category_id).toBe(testCategory);
    });

    test("should validate required fields", async () => {
      const handler = mockIpcMain.handlers.get("items:add");
      
      // Test missing name
      await expect(handler({}, { price: 1000, category_id: testCategory })).rejects.toThrow("Nama item harus diisi");
      
      // Test missing price
      await expect(handler({}, { name: "Test", category_id: testCategory })).rejects.toThrow("Harga harus berupa angka positif");
      
      // Test missing category
      await expect(handler({}, { name: "Test", price: 1000 })).rejects.toThrow("Kategori harus dipilih");
    });

    test("should generate code if not provided", async () => {
      const itemData = {
        name: "Item Without Code",
        price: 1000,
        category_id: testCategory,
      };

      const handler = mockIpcMain.handlers.get("items:add");
      const item = await handler({}, itemData);
      
      expect(item.code).toBeDefined();
      expect(item.code.length).toBeGreaterThan(0);
    });
  });

  describe("items:getById", () => {
    test("should return item by ID", async () => {
      const now = new Date().toISOString();
      const result = await database.execute(
        "INSERT INTO items (code, name, price, category_id, type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ["ITEM-002", "Test Item", 1000, testCategory, "RENTAL", "AVAILABLE", now, now]
      );

      const handler = mockIpcMain.handlers.get("items:getById");
      const item = await handler({}, result.id);
      
      expect(item).toBeDefined();
      expect(item.name).toBe("Test Item");
      expect(item.price).toBe(1000);
    });

    test("should throw error for non-existent item", async () => {
      const handler = mockIpcMain.handlers.get("items:getById");
      await expect(handler({}, 99999)).rejects.toThrow("Item tidak ditemukan");
    });
  });

  describe("items:update", () => {
    test("should update item", async () => {
      const now = new Date().toISOString();
      const result = await database.execute(
        "INSERT INTO items (code, name, price, category_id, type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ["ITEM-003", "Old Name", 1000, testCategory, "RENTAL", "AVAILABLE", now, now]
      );

      const handler = mockIpcMain.handlers.get("items:update");
      const updated = await handler({}, result.id, { name: "Updated Name", price: 2000 });
      
      expect(updated.name).toBe("Updated Name");
      expect(updated.price).toBe(2000);
    });

    test("should validate updates", async () => {
      const now = new Date().toISOString();
      const result = await database.execute(
        "INSERT INTO items (code, name, price, category_id, type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ["ITEM-004", "Test Item", 1000, testCategory, "RENTAL", "AVAILABLE", now, now]
      );

      const handler = mockIpcMain.handlers.get("items:update");
      
      // Test invalid name
      await expect(handler({}, result.id, { name: "" })).rejects.toThrow("Nama item harus diisi");
      
      // Test invalid price
      await expect(handler({}, result.id, { price: -100 })).rejects.toThrow("Harga harus berupa angka positif");
    });
  });

  describe("items:delete", () => {
    test("should delete item when not used", async () => {
      const now = new Date().toISOString();
      const result = await database.execute(
        "INSERT INTO items (code, name, price, category_id, type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ["ITEM-005", "To Delete", 1000, testCategory, "RENTAL", "AVAILABLE", now, now]
      );

      const handler = mockIpcMain.handlers.get("items:delete");
      const deleted = await handler({}, result.id);
      expect(deleted).toBe(true);

      const item = await database.queryOne("SELECT * FROM items WHERE id = ?", [result.id]);
      expect(item).toBeUndefined();
    });

    test("should not delete item used in transactions", async () => {
      const now = new Date().toISOString();
      // Create item
      const itemResult = await database.execute(
        "INSERT INTO items (code, name, price, category_id, type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ["ITEM-006", "Used Item", 1000, testCategory, "RENTAL", "AVAILABLE", now, now]
      );

      // Create customer
      const customerResult = await database.execute(
        "INSERT INTO customers (code, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["CUS-001", "Test Customer", 1, now, now]
      );

      // Create test user for transaction (use existing role from seeder)
      const existingRole = await database.queryOne("SELECT id FROM roles WHERE name = 'staff' LIMIT 1");
      const roleId = existingRole.id;
      const userResult = await database.execute(
        "INSERT INTO users (username, full_name, password_hash, role_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["testuser", "Test User", "hash", roleId, 1, now, now]
      );

      // Create rental transaction
      const transactionResult = await database.execute(
        "INSERT INTO rental_transactions (transaction_code, customer_id, user_id, rental_date, planned_return_date, total_days, subtotal, deposit, tax, total_amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ["RNT-001", customerResult.id, userResult.id, now, now, 1, 1000, 500, 0, 1000, "active", now]
      );

      // Create rental transaction detail
      await database.execute(
        "INSERT INTO rental_transaction_details (rental_transaction_id, item_id, quantity, rental_price, subtotal) VALUES (?, ?, ?, ?, ?)",
        [transactionResult.id, itemResult.id, 1, 1000, 1000]
      );

      // Try to delete item
      const handler = mockIpcMain.handlers.get("items:delete");
      await expect(handler({}, itemResult.id)).rejects.toThrow();

      // Item should still exist
      const item = await database.queryOne("SELECT * FROM items WHERE id = ?", [itemResult.id]);
      expect(item).toBeDefined();

      // Cleanup
      await database.execute("DELETE FROM rental_transaction_details WHERE rental_transaction_id = ?", [transactionResult.id]);
      await database.execute("DELETE FROM rental_transactions WHERE id = ?", [transactionResult.id]);
      await database.execute("DELETE FROM customers WHERE id = ?", [customerResult.id]);
    });
  });
});

