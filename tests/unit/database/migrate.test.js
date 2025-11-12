const path = require("path");
const fs = require("fs");
const { createFreshTestDb, cleanupTestDb } = require("../../utils/test-db");
const { runMigrations, getExecutedMigrations, getCurrentBatch } = require("../../../src/database/migrate");

describe("Database Migrations", () => {
  let testDb;

  beforeAll(async () => {
    testDb = await createFreshTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb(testDb);
  });

  describe("runMigrations", () => {
    test("should create migrations table", async () => {
      const migrations = await getExecutedMigrations({
        allAsync: testDb.allAsync.bind(testDb),
      });
      expect(Array.isArray(migrations)).toBe(true);
    });

    test("should record executed migrations", async () => {
      const migrations = await getExecutedMigrations({
        allAsync: testDb.allAsync.bind(testDb),
      });
      expect(migrations.length).toBeGreaterThan(0);
    });

    test("should get current batch number", async () => {
      const batch = await getCurrentBatch({
        getAsync: testDb.getAsync.bind(testDb),
      });
      expect(typeof batch).toBe("number");
      expect(batch).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Migration execution", () => {
    test("should not run migrations twice", async () => {
      const migrationsBefore = await getExecutedMigrations({
        allAsync: testDb.allAsync.bind(testDb),
      });
      const countBefore = migrationsBefore.length;

      // Run migrations again
      await runMigrations(testDb.db);

      const migrationsAfter = await getExecutedMigrations({
        allAsync: testDb.allAsync.bind(testDb),
      });
      const countAfter = migrationsAfter.length;

      // Should not have new migrations
      expect(countAfter).toBe(countBefore);
    });
  });
});

