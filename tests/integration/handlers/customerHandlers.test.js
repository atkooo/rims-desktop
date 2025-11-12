const path = require("path");
const { createFreshTestDb, cleanupTestDb } = require("../../utils/test-db");
const setupCustomerHandlers = require("../../../src/main/handlers/customerHandlers");
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

describe("Customer Handlers", () => {
  let testDb;

  beforeAll(async () => {
    // Create test database
    testDb = await createFreshTestDb(path.join(__dirname, "../../../data/test/test.db"));
    
    // Setup handlers
    setupCustomerHandlers();
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
    // Clean up customers before each test
    try {
      await database.execute("DELETE FROM customers WHERE id > 0");
    } catch (error) {
      // Ignore errors
    }
  });

  describe("customers:create", () => {
    test("should create a new customer", async () => {
      const customerData = {
        name: "Test Customer",
        phone: "081234567890",
        email: "test@example.com",
        address: "Test Address",
      };

      const handler = mockIpcMain.handlers.get("customers:create");
      const customer = await handler({}, customerData);
      
      expect(customer).toBeDefined();
      expect(customer.id).toBeDefined();
      expect(customer.name).toBe("Test Customer");
      expect(customer.phone).toBe("081234567890");
      expect(customer.email).toBe("test@example.com");
    });

    test("should auto-generate code if not provided", async () => {
      const customerData = {
        name: "New Customer",
      };

      const handler = mockIpcMain.handlers.get("customers:create");
      const customer = await handler({}, customerData);
      
      expect(customer.code).toBeDefined();
      expect(customer.code).toMatch(/^CUS-/);
    });

    test("should validate required fields", async () => {
      const handler = mockIpcMain.handlers.get("customers:create");
      
      // Test missing name
      await expect(handler({}, {})).rejects.toThrow("Nama pelanggan wajib diisi");
      
      // Test invalid email
      await expect(handler({}, { name: "Test", email: "invalid" })).rejects.toThrow("Format email tidak valid");
    });
  });

  describe("customers:getById", () => {
    test("should return customer by ID", async () => {
      const now = new Date().toISOString();
      const result = await database.execute(
        "INSERT INTO customers (code, name, phone, email, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["CUS-001", "Test Customer", "081234567890", "test@example.com", 1, now, now]
      );

      const handler = mockIpcMain.handlers.get("customers:getById");
      const customer = await handler({}, result.id);
      
      expect(customer).toBeDefined();
      expect(customer.name).toBe("Test Customer");
      expect(customer.phone).toBe("081234567890");
    });

    test("should throw error for non-existent customer", async () => {
      const handler = mockIpcMain.handlers.get("customers:getById");
      await expect(handler({}, 99999)).rejects.toThrow("Data pelanggan tidak ditemukan");
    });
  });

  describe("customers:update", () => {
    test("should update customer", async () => {
      const now = new Date().toISOString();
      const result = await database.execute(
        "INSERT INTO customers (code, name, phone, email, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["CUS-002", "Old Name", "081234567890", "old@example.com", 1, now, now]
      );

      const handler = mockIpcMain.handlers.get("customers:update");
      const updated = await handler({}, result.id, {
        name: "Updated Name",
        phone: "089876543210",
        email: "new@example.com",
      });
      
      expect(updated.name).toBe("Updated Name");
      expect(updated.phone).toBe("089876543210");
      expect(updated.email).toBe("new@example.com");
    });

    test("should validate updates", async () => {
      const now = new Date().toISOString();
      const result = await database.execute(
        "INSERT INTO customers (code, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["CUS-003", "Test Customer", 1, now, now]
      );

      const handler = mockIpcMain.handlers.get("customers:update");
      
      // Test invalid email
      await expect(handler({}, result.id, { email: "invalid" })).rejects.toThrow("Format email tidak valid");
      
      // Test empty name
      await expect(handler({}, result.id, { name: "" })).rejects.toThrow("Nama pelanggan wajib diisi");
    });
  });

  describe("customers:delete", () => {
    test("should delete customer when not used", async () => {
      const now = new Date().toISOString();
      const result = await database.execute(
        "INSERT INTO customers (code, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["CUS-004", "To Delete", 1, now, now]
      );

      const handler = mockIpcMain.handlers.get("customers:delete");
      const deleted = await handler({}, result.id);
      expect(deleted).toBe(true);

      const customer = await database.queryOne("SELECT * FROM customers WHERE id = ?", [result.id]);
      expect(customer).toBeUndefined();
    });

    test("should not delete customer with transactions", async () => {
      const now = new Date().toISOString();
      // Create customer
      const customerResult = await database.execute(
        "INSERT INTO customers (code, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["CUS-005", "Used Customer", 1, now, now]
      );

      // Create category and item
      const categoryResult = await database.execute(
        "INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ["Test Category", "Description", 1, now, now]
      );

      const itemResult = await database.execute(
        "INSERT INTO items (code, name, price, category_id, type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ["ITEM-001", "Test Item", 1000, categoryResult.id, "RENTAL", "AVAILABLE", now, now]
      );

      // Create user
      const userResult = await database.execute(
        "INSERT INTO users (username, full_name, email, password_hash, role_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ["testuser", "Test User", "test@example.com", "scrypt:test:hash", 1, 1, now, now]
      );

      // Create rental transaction
      const transactionResult = await database.execute(
        "INSERT INTO rental_transactions (transaction_code, customer_id, user_id, rental_date, planned_return_date, total_days, subtotal, deposit, tax, total_amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ["RNT-001", customerResult.id, userResult.id, now, now, 1, 1000, 500, 0, 1000, "active", now]
      );

      // Try to delete customer
      const handler = mockIpcMain.handlers.get("customers:delete");
      await expect(handler({}, customerResult.id)).rejects.toThrow();

      // Customer should still exist
      const customer = await database.queryOne("SELECT * FROM customers WHERE id = ?", [customerResult.id]);
      expect(customer).toBeDefined();

      // Cleanup
      await database.execute("DELETE FROM rental_transactions WHERE id = ?", [transactionResult.id]);
      await database.execute("DELETE FROM items WHERE id = ?", [itemResult.id]);
      await database.execute("DELETE FROM categories WHERE id = ?", [categoryResult.id]);
      await database.execute("DELETE FROM users WHERE id = ?", [userResult.id]);
    });
  });
});

