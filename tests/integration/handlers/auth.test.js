const path = require("path");
const { createFreshTestDb, cleanupTestDb } = require("../../utils/test-db");
const { registerAuthIpc, scryptHash } = require("../../../src/main/auth");
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

describe("Auth Handlers", () => {
  let testDb;
  let testUser;
  let testRole;

  beforeAll(async () => {
    // Create test database
    testDb = await createFreshTestDb(path.join(__dirname, "../../../data/test/test.db"));
    
    // Register auth handlers
    registerAuthIpc();

    const now = new Date().toISOString();
    
    // Use existing role from seeder (staff role should exist)
    // Valid roles: 'admin','manager','staff','kasir'
    const existingRole = await database.queryOne("SELECT id FROM roles WHERE name = 'staff' LIMIT 1");
    if (existingRole) {
      testRole = existingRole.id;
    } else {
      // If for some reason staff doesn't exist, create it
      const roleResult = await database.execute(
        "INSERT INTO roles (name, description) VALUES (?, ?)",
        ["staff", "Test Staff Role"]
      );
      testRole = roleResult.id;
    }

    // Create test user
    const passwordHash = scryptHash("testpassword");
    const userResult = await database.execute(
      "INSERT INTO users (username, full_name, email, password_hash, role_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ["testuser", "Test User", "test@example.com", passwordHash, testRole, 1, now, now]
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
    // Clean up activity logs before each test
    try {
      await database.execute("DELETE FROM activity_logs WHERE id > 0");
    } catch (error) {
      // Ignore errors
    }
  });

  describe("auth:login", () => {
    test("should login with valid credentials", async () => {
      const handler = mockIpcMain.handlers.get("auth:login");
      const user = await handler({}, {
        username: "testuser",
        password: "testpassword",
      });
      
      expect(user).toBeDefined();
      expect(user.id).toBe(testUser);
      expect(user.username).toBe("testuser");
      expect(user.full_name).toBe("Test User");
      expect(user.permissions).toBeDefined();
    });

    test("should reject invalid credentials", async () => {
      const handler = mockIpcMain.handlers.get("auth:login");
      
      // Test wrong password
      await expect(handler({}, {
        username: "testuser",
        password: "wrongpassword",
      })).rejects.toThrow("Username atau password salah");
      
      // Test non-existent user
      await expect(handler({}, {
        username: "nonexistent",
        password: "testpassword",
      })).rejects.toThrow("User tidak ditemukan atau non-aktif");
    });

    test("should reject inactive user", async () => {
      const now = new Date().toISOString();
      const passwordHash = scryptHash("testpassword2");
      const userResult = await database.execute(
        "INSERT INTO users (username, full_name, email, password_hash, role_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ["inactiveuser", "Inactive User", "inactive@example.com", passwordHash, testRole, 0, now, now]
      );

      const handler = mockIpcMain.handlers.get("auth:login");
      await expect(handler({}, {
        username: "inactiveuser",
        password: "testpassword2",
      })).rejects.toThrow("User tidak ditemukan atau non-aktif");

      // Cleanup
      await database.execute("DELETE FROM users WHERE id = ?", [userResult.id]);
    });
  });

  describe("auth:logout", () => {
    test("should logout successfully", async () => {
      // Login first
      const loginHandler = mockIpcMain.handlers.get("auth:login");
      await loginHandler({}, {
        username: "testuser",
        password: "testpassword",
      });

      // Logout
      const handler = mockIpcMain.handlers.get("auth:logout");
      const result = await handler({});
      
      expect(result).toBe(true);

      // Check current user is null
      const getCurrentUserHandler = mockIpcMain.handlers.get("auth:getCurrentUser");
      const currentUser = await getCurrentUserHandler({});
      expect(currentUser).toBeNull();
    });
  });

  describe("auth:getCurrentUser", () => {
    test("should return current user when logged in", async () => {
      // Login first
      const loginHandler = mockIpcMain.handlers.get("auth:login");
      await loginHandler({}, {
        username: "testuser",
        password: "testpassword",
      });

      const handler = mockIpcMain.handlers.get("auth:getCurrentUser");
      const user = await handler({});
      
      expect(user).toBeDefined();
      expect(user.username).toBe("testuser");
    });

    test("should return null when not logged in", async () => {
      // Logout first
      const logoutHandler = mockIpcMain.handlers.get("auth:logout");
      await logoutHandler({});

      const handler = mockIpcMain.handlers.get("auth:getCurrentUser");
      const user = await handler({});
      
      expect(user).toBeNull();
    });
  });

  describe("auth:changePassword", () => {
    test("should change password successfully", async () => {
      const handler = mockIpcMain.handlers.get("auth:changePassword");
      const result = await handler({}, {
        userId: testUser,
        newPassword: "newpassword123",
      });
      
      expect(result).toBe(true);

      // Verify new password works
      const loginHandler = mockIpcMain.handlers.get("auth:login");
      const user = await loginHandler({}, {
        username: "testuser",
        password: "newpassword123",
      });
      
      expect(user).toBeDefined();
      expect(user.id).toBe(testUser);

      // Change password back
      await handler({}, {
        userId: testUser,
        newPassword: "testpassword",
      });
    });

    test("should reject short password", async () => {
      const handler = mockIpcMain.handlers.get("auth:changePassword");
      await expect(handler({}, {
        userId: testUser,
        newPassword: "short",
      })).rejects.toThrow("Password terlalu pendek");
    });
  });

  describe("auth:hasPermission", () => {
    test("should check user permissions", async () => {
      // Login first
      const loginHandler = mockIpcMain.handlers.get("auth:login");
      await loginHandler({}, {
        username: "testuser",
        password: "testpassword",
      });

      const handler = mockIpcMain.handlers.get("auth:hasPermission");
      const hasPermission = await handler({}, "test.permission");
      
      // Result depends on permissions setup, but should not throw
      expect(typeof hasPermission).toBe("boolean");
    });

    test("should return false when not logged in", async () => {
      // Logout first
      const logoutHandler = mockIpcMain.handlers.get("auth:logout");
      await logoutHandler({});

      const handler = mockIpcMain.handlers.get("auth:hasPermission");
      const hasPermission = await handler({}, "test.permission");
      
      expect(hasPermission).toBe(false);
    });
  });
});

