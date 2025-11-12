const path = require("path");
const { createFreshTestDb, cleanupTestDb } = require("../../utils/test-db");
const { setupTransactionHandlers, setupPaymentHandlers, setupStockMovementHandlers } = require("../../../src/main/handlers/transactionHandlers");
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

describe("Transaction Handlers", () => {
  let testDb;
  let testCategory;
  let testItem;
  let testCustomer;
  let testUser;

  beforeAll(async () => {
    // Create test database
    testDb = await createFreshTestDb(path.join(__dirname, "../../../data/test/test.db"));
    
    // Setup handlers
    setupTransactionHandlers();
    setupPaymentHandlers();
    setupStockMovementHandlers();

    const now = new Date().toISOString();
    
    // Create test category
    const categoryResult = await database.execute(
      "INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ["Test Category", "Test Description", 1, now, now]
    );
    testCategory = categoryResult.id;

    // Create test item
    const itemResult = await database.execute(
      "INSERT INTO items (code, name, price, category_id, type, status, stock_quantity, available_quantity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ["ITEM-001", "Test Item", 1000, testCategory, "RENTAL", "AVAILABLE", 10, 10, now, now]
    );
    testItem = itemResult.id;

    // Create test customer
    const customerResult = await database.execute(
      "INSERT INTO customers (code, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ["CUS-001", "Test Customer", 1, now, now]
    );
    testCustomer = customerResult.id;

    // Create test user
    const userResult = await database.execute(
      "INSERT INTO users (username, full_name, email, password_hash, role_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ["testuser", "Test User", "test@example.com", "scrypt:test:hash", 1, 1, now, now]
    );
    testUser = userResult.id;
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
    // Clean up transactions before each test
    try {
      await database.execute("DELETE FROM payments WHERE id > 0");
      await database.execute("DELETE FROM stock_movements WHERE id > 0");
      await database.execute("DELETE FROM rental_transaction_details WHERE id > 0");
      await database.execute("DELETE FROM sales_transaction_details WHERE id > 0");
      await database.execute("DELETE FROM rental_transactions WHERE id > 0");
      await database.execute("DELETE FROM sales_transactions WHERE id > 0");
      await database.execute("DELETE FROM cashier_sessions WHERE id > 0");
      // Reset stock quantities to initial values
      await database.execute("UPDATE items SET stock_quantity = 10, available_quantity = 10 WHERE id = ?", [testItem]);
    } catch (error) {
      // Ignore errors
    }
  });

  describe("transactions:create", () => {
    test("should create rental transaction", async () => {
      const now = new Date().toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      // Create cashier session first (required for cash payments)
      const sessionCode = `CS-${Date.now()}`;
      const sessionResult = await database.execute(
        "INSERT INTO cashier_sessions (session_code, user_id, opening_date, opening_balance, status) VALUES (?, ?, ?, ?, ?)",
        [sessionCode, testUser, now, 0, "open"]
      );
      
      // Verify session was created
      const session = await database.queryOne(
        "SELECT id FROM cashier_sessions WHERE user_id = ? AND status = 'open' ORDER BY opening_date DESC LIMIT 1",
        [testUser]
      );
      expect(session).toBeDefined();
      
      const transactionData = {
        type: "RENTAL",
        customerId: testCustomer,
        userId: testUser,
        transactionDate: now,
        rentalDate: now,
        plannedReturnDate: tomorrow,
        totalDays: 1,
        subtotal: 1000,
        deposit: 500,
        tax: 0,
        totalAmount: 1000,
        items: [
          {
            itemId: testItem,
            quantity: 1,
            rentalPrice: 1000,
            subtotal: 1000,
          },
        ],
      };

      const handler = mockIpcMain.handlers.get("transactions:create");
      const transaction = await handler({}, transactionData);
      
      expect(transaction).toBeDefined();
      expect(transaction.transaction_code).toBeDefined();
      expect(transaction.customer_id).toBe(testCustomer);
      expect(transaction.status).toBe("active");

      // Check stock was updated
      const item = await database.queryOne("SELECT available_quantity FROM items WHERE id = ?", [testItem]);
      expect(item.available_quantity).toBe(9); // 10 - 1

      // Check stock movement was created
      const stockMovements = await database.query(
        "SELECT * FROM stock_movements WHERE item_id = ? AND reference_type = 'rental_transaction'",
        [testItem]
      );
      expect(stockMovements.length).toBe(1);
      expect(stockMovements[0].movement_type).toBe("OUT");
    });

    test("should create sales transaction", async () => {
      const now = new Date().toISOString();
      
      // Create cashier session first (required for cash payments)
      const sessionCode = `CS-${Date.now()}-2`;
      const sessionResult = await database.execute(
        "INSERT INTO cashier_sessions (session_code, user_id, opening_date, opening_balance, status) VALUES (?, ?, ?, ?, ?)",
        [sessionCode, testUser, now, 0, "open"]
      );
      
      // Verify session was created
      const session = await database.queryOne(
        "SELECT id FROM cashier_sessions WHERE user_id = ? AND status = 'open' ORDER BY opening_date DESC LIMIT 1",
        [testUser]
      );
      expect(session).toBeDefined();
      
      const transactionData = {
        type: "SALE",
        customerId: testCustomer,
        userId: testUser,
        transactionDate: now,
        saleDate: now,
        subtotal: 1000,
        discount: 0,
        tax: 0,
        totalAmount: 1000,
        items: [
          {
            itemId: testItem,
            quantity: 1,
            salePrice: 1000,
            subtotal: 1000,
          },
        ],
      };

      const handler = mockIpcMain.handlers.get("transactions:create");
      const transaction = await handler({}, transactionData);
      
      expect(transaction).toBeDefined();
      expect(transaction.transaction_code).toBeDefined();
      expect(transaction.customer_id).toBe(testCustomer);

      // Check stock was updated
      const item = await database.queryOne("SELECT available_quantity, stock_quantity FROM items WHERE id = ?", [testItem]);
      expect(item.available_quantity).toBeLessThan(10);
      expect(item.stock_quantity).toBeLessThan(10);
    });

    test("should validate transaction data", async () => {
      const handler = mockIpcMain.handlers.get("transactions:create");
      
      // Test invalid date
      await expect(handler({}, {
        type: "RENTAL",
        transactionDate: "invalid",
      })).rejects.toThrow();
      
      // Test invalid total amount
      await expect(handler({}, {
        type: "RENTAL",
        transactionDate: new Date().toISOString(),
        totalAmount: -100,
      })).rejects.toThrow();
      
      // Test no items
      await expect(handler({}, {
        type: "RENTAL",
        transactionDate: new Date().toISOString(),
        totalAmount: 1000,
        items: [],
      })).rejects.toThrow();
    });
  });

  describe("transactions:getAll", () => {
    test("should return all transactions", async () => {
      const handler = mockIpcMain.handlers.get("transactions:getAll");
      const transactions = await handler({});
      
      expect(Array.isArray(transactions)).toBe(true);
    });
  });

  describe("transactions:updateStatus", () => {
    test("should update rental transaction status to returned", async () => {
      const now = new Date().toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      // Create rental transaction
      const transactionResult = await database.execute(
        "INSERT INTO rental_transactions (transaction_code, customer_id, user_id, rental_date, planned_return_date, total_days, subtotal, deposit, tax, total_amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ["RNT-001", testCustomer, testUser, now, tomorrow, 1, 1000, 500, 0, 1000, "active", now]
      );

      // Create rental transaction detail
      await database.execute(
        "INSERT INTO rental_transaction_details (rental_transaction_id, item_id, quantity, rental_price, subtotal, is_returned) VALUES (?, ?, ?, ?, ?, ?)",
        [transactionResult.id, testItem, 1, 1000, 1000, 0]
      );

      // Update item stock
      await database.execute(
        "UPDATE items SET available_quantity = available_quantity - 1 WHERE id = ?",
        [testItem]
      );

      const handler = mockIpcMain.handlers.get("transactions:updateStatus");
      const result = await handler({}, { transactionType: "RENTAL", transactionId: transactionResult.id }, "COMPLETED");
      
      expect(result).toBe(true);

      // Check status was updated
      const transaction = await database.queryOne("SELECT status FROM rental_transactions WHERE id = ?", [transactionResult.id]);
      expect(transaction.status).toBe("returned");

      // Check stock was restored
      const item = await database.queryOne("SELECT available_quantity FROM items WHERE id = ?", [testItem]);
      expect(item.available_quantity).toBe(10); // Stock restored

      // Check stock movement was created
      const stockMovements = await database.query(
        "SELECT * FROM stock_movements WHERE item_id = ? AND reference_type = 'rental_return'",
        [testItem]
      );
      expect(stockMovements.length).toBe(1);
      expect(stockMovements[0].movement_type).toBe("IN");
    });
  });

  describe("payments:create", () => {
    test("should create payment", async () => {
      const now = new Date().toISOString();
      
      // Create cashier session first (required for cash payments)
      const sessionCode = `CS-${Date.now()}`;
      const sessionResult = await database.execute(
        "INSERT INTO cashier_sessions (session_code, user_id, opening_date, opening_balance, status) VALUES (?, ?, ?, ?, ?)",
        [sessionCode, testUser, now, 0, "open"]
      );
      
      // Create rental transaction
      const transactionResult = await database.execute(
        "INSERT INTO rental_transactions (transaction_code, customer_id, user_id, rental_date, planned_return_date, total_days, subtotal, deposit, tax, total_amount, status, cashier_session_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ["RNT-002", testCustomer, testUser, now, now, 1, 1000, 500, 0, 1000, "active", sessionResult.id, now]
      );

      const paymentData = {
        transactionType: "rental",
        transactionId: transactionResult.id,
        paymentDate: now,
        amount: 1000,
        paymentMethod: "cash",
        userId: testUser,
      };

      const handler = mockIpcMain.handlers.get("payments:create");
      const payment = await handler({}, paymentData);
      
      expect(payment).toBeDefined();
      expect(payment.id).toBeDefined();
      expect(payment.amount).toBe(1000);
      expect(payment.transaction_type).toBe("rental");
    });

    test("should validate payment data", async () => {
      const handler = mockIpcMain.handlers.get("payments:create");
      
      // Test invalid amount
      await expect(handler({}, {
        transactionType: "rental",
        transactionId: 1,
        amount: -100,
      })).rejects.toThrow();
    });
  });

  describe("stockMovements:create", () => {
    test("should create stock movement IN", async () => {
      const movementData = {
        itemId: testItem,
        movementType: "IN",
        quantity: 5,
        userId: testUser,
        notes: "Test stock movement",
      };

      const handler = mockIpcMain.handlers.get("stockMovements:create");
      const movement = await handler({}, movementData);
      
      expect(movement).toBeDefined();
      expect(movement.movement_type).toBe("IN");
      expect(movement.quantity).toBe(5);

      // Check stock was updated
      const item = await database.queryOne("SELECT available_quantity FROM items WHERE id = ?", [testItem]);
      expect(item.available_quantity).toBe(15); // 10 + 5
    });

    test("should create stock movement OUT", async () => {
      // Get current quantity first
      const itemBefore = await database.queryOne("SELECT available_quantity FROM items WHERE id = ?", [testItem]);
      const initialQuantity = itemBefore.available_quantity;
      
      const movementData = {
        itemId: testItem,
        movementType: "OUT",
        quantity: 3,
        userId: testUser,
        notes: "Test stock movement",
      };

      const handler = mockIpcMain.handlers.get("stockMovements:create");
      const movement = await handler({}, movementData);
      
      expect(movement).toBeDefined();
      expect(movement.movement_type).toBe("OUT");
      expect(movement.quantity).toBe(3);

      // Check stock was updated
      const item = await database.queryOne("SELECT available_quantity FROM items WHERE id = ?", [testItem]);
      expect(item.available_quantity).toBe(initialQuantity - 3);
    });

    test("should not allow negative stock", async () => {
      const movementData = {
        itemId: testItem,
        movementType: "OUT",
        quantity: 1000, // More than available
        userId: testUser,
        notes: "Test stock movement",
      };

      const handler = mockIpcMain.handlers.get("stockMovements:create");
      await expect(handler({}, movementData)).rejects.toThrow("Stok tidak mencukupi");
    });
  });
});

