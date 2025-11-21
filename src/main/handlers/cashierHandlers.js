const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");
const { logActivity, getCurrentUserSafely } = require("../helpers/activity");
const { createBackup } = require("../helpers/backupUtils");

function generateSessionCode() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  return `CSH${year}${month}${day}${random}`;
}

/**
 * Calculate expected balance for cashier session
 */
async function calculateExpectedBalance(session) {
  // Try using cashier_session_id (more accurate)
  const salesResult = await database.queryOne(
    `SELECT 
      COALESCE(SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount ELSE 0 END), 0) as cash_sales
    FROM sales_transactions st
    LEFT JOIN payments p ON p.transaction_type = 'sale' AND p.transaction_id = st.id
    WHERE st.cashier_session_id = ?`,
    [session.id],
  );

  const rentalResult = await database.queryOne(
    `SELECT 
      COALESCE(SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount ELSE 0 END), 0) as cash_rentals
    FROM rental_transactions rt
    LEFT JOIN payments p ON p.transaction_type = 'rental' AND p.transaction_id = rt.id
    WHERE rt.cashier_session_id = ?`,
    [session.id],
  );

  let cashSales = Number(salesResult?.cash_sales || 0);
  let cashRentals = Number(rentalResult?.cash_rentals || 0);

  // Fallback to date-based if no transactions linked
  if (cashSales === 0 && cashRentals === 0) {
    const salesResultFallback = await database.queryOne(
      `SELECT 
        COALESCE(SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount ELSE 0 END), 0) as cash_sales
      FROM sales_transactions st
      LEFT JOIN payments p ON p.transaction_type = 'sale' AND p.transaction_id = st.id
      WHERE st.user_id = ? 
        AND st.sale_date >= date(?) 
        AND st.sale_date <= date('now', '+1 day')`,
      [session.user_id, session.opening_date],
    );

    const rentalResultFallback = await database.queryOne(
      `SELECT 
        COALESCE(SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount ELSE 0 END), 0) as cash_rentals
      FROM rental_transactions rt
      LEFT JOIN payments p ON p.transaction_type = 'rental' AND p.transaction_id = rt.id
      WHERE rt.user_id = ? 
        AND rt.rental_date >= date(?) 
        AND rt.rental_date <= date('now', '+1 day')`,
      [session.user_id, session.opening_date],
    );

    cashSales = Number(salesResultFallback?.cash_sales || 0);
    cashRentals = Number(rentalResultFallback?.cash_rentals || 0);
  }

  return Number(session.opening_balance) + cashSales + cashRentals;
}

function setupCashierHandlers() {
  // Get current open session
  ipcMain.handle("cashier:getCurrentSession", async (event, userId, userRole = null) => {
    try {
      if (!userId) {
        // Return null if no userId provided (no active session)
        return null;
      }

      // Check if table exists first
      const tableExists = await database.tableExists("cashier_sessions");
      if (!tableExists) {
        throw new Error(
          "Tabel cashier_sessions belum dibuat. Silakan jalankan migrasi database terlebih dahulu.",
        );
      }

      // If user is kasir, show only their own active session
      // Otherwise (admin, manager, staff, etc), show the most recent active session from any user
      // This allows all roles to see cashier status, but only kasir can open/close
      let query, params;
      
      // Check if user is kasir - if so, only show their own session
      // For all other roles (including null/undefined), show any active session
      const normalizedRole = userRole ? String(userRole).toLowerCase().trim() : '';
      const isKasir = normalizedRole === 'kasir';
      
      if (isKasir) {
        // Kasir: only show their own active session
        query = `SELECT 
          cs.*,
          u.username,
          u.full_name
        FROM cashier_sessions cs
        JOIN users u ON cs.user_id = u.id
        WHERE cs.user_id = ? AND cs.status = 'open'
        ORDER BY cs.opening_date DESC
        LIMIT 1`;
        params = [userId];
      } else {
        // All other roles (admin, manager, staff, etc): show any active session
        // This includes null/undefined userRole to handle edge cases
        query = `SELECT 
          cs.*,
          u.username,
          u.full_name
        FROM cashier_sessions cs
        JOIN users u ON cs.user_id = u.id
        WHERE cs.status = 'open'
        ORDER BY cs.opening_date DESC
        LIMIT 1`;
        params = [];
      }
      
      logger.debug(`Getting cashier session - userId: ${userId}, userRole: ${userRole}, normalizedRole: ${normalizedRole}, isKasir: ${isKasir}`);

      const session = await database.queryOne(query, params);

      if (session) {
        const expectedBalance = await calculateExpectedBalance(session);
        return {
          ...session,
          expected_balance: expectedBalance,
        };
      }

      return null;
    } catch (error) {
      logger.error("Error getting current cashier session:", error);
      // Provide more user-friendly error messages
      if (error.message && error.message.includes("no such table")) {
        throw new Error(
          "Tabel cashier_sessions belum dibuat. Silakan jalankan migrasi database terlebih dahulu.",
        );
      }
      throw error;
    }
  });

  // Get all sessions
  ipcMain.handle("cashier:getAllSessions", async (event, filters = {}) => {
    try {
      // Check if table exists first
      const tableExists = await database.tableExists("cashier_sessions");
      if (!tableExists) {
        throw new Error(
          "Tabel cashier_sessions belum dibuat. Silakan jalankan migrasi database terlebih dahulu.",
        );
      }

      let query = `
        SELECT 
          cs.*,
          u.username,
          u.full_name
        FROM cashier_sessions cs
        JOIN users u ON cs.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.userId) {
        query += " AND cs.user_id = ?";
        params.push(filters.userId);
      }

      if (filters.status) {
        query += " AND cs.status = ?";
        params.push(filters.status);
      }

      if (filters.startDate) {
        query += " AND date(cs.opening_date) >= ?";
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += " AND date(cs.opening_date) <= ?";
        params.push(filters.endDate);
      }

      query += " ORDER BY cs.opening_date DESC";

      if (filters.limit) {
        query += " LIMIT ?";
        params.push(filters.limit);
      }

      const sessions = await database.query(query, params);
      return sessions;
    } catch (error) {
      logger.error("Error getting cashier sessions:", error);
      throw error;
    }
  });

  // Open cashier session
  ipcMain.handle("cashier:openSession", async (event, sessionData) => {
    try {
      // Check if table exists first
      const tableExists = await database.tableExists("cashier_sessions");
      if (!tableExists) {
        throw new Error(
          "Tabel cashier_sessions belum dibuat. Silakan jalankan migrasi database terlebih dahulu.",
        );
      }

      // Get current user
      const currentUser = getCurrentUserSafely();
      if (!currentUser) {
        throw new Error("User tidak ditemukan. Silakan login ulang.");
      }

      // Check if user has kasir role
      if (currentUser.role !== "kasir") {
        throw new Error("Hanya user dengan role kasir yang dapat membuka sesi kasir.");
      }

      const { userId, openingBalance, notes } = sessionData;

      if (!userId) {
        throw new Error("User ID harus diisi");
      }

      // Verify that userId matches current user
      if (currentUser.id !== userId) {
        throw new Error("User ID tidak sesuai dengan user yang sedang login.");
      }

      if (!validator.isPositiveNumber(openingBalance)) {
        throw new Error("Saldo awal harus berupa angka positif");
      }

      // Check if there is any open session globally
      const anyOpenSession = await database.queryOne(
        "SELECT id, user_id, session_code FROM cashier_sessions WHERE status = 'open' LIMIT 1",
      );

      if (anyOpenSession) {
        // Check if it's the same user trying to open another session
        if (anyOpenSession.user_id === userId) {
          throw new Error(
            "Anda masih memiliki sesi kasir yang terbuka. Tutup sesi sebelumnya terlebih dahulu.",
          );
        } else {
          // Another user has an open session
          throw new Error(
            "Tidak dapat membuka sesi kasir baru. Masih ada sesi kasir yang terbuka. Tutup sesi yang sedang aktif terlebih dahulu.",
          );
        }
      }

      const sessionCode = generateSessionCode();

      const result = await database.transaction(async () => {
        const sessionResult = await database.execute(
          `INSERT INTO cashier_sessions (
            session_code, user_id, opening_balance, status, notes
          ) VALUES (?, ?, ?, 'open', ?)`,
          [sessionCode, userId, openingBalance, notes || null],
        );

        await logActivity({
          userId,
          action: "CASHIER_OPEN",
          module: "cashier",
          description: `Membuka sesi kasir ${sessionCode} dengan saldo awal ${openingBalance}`,
        });

        return sessionResult;
      });

      const newSession = await database.queryOne(
        `SELECT 
            cs.*,
            u.username,
            u.full_name
          FROM cashier_sessions cs
          JOIN users u ON cs.user_id = u.id
          WHERE cs.id = ?`,
        [result.id],
      );

      return newSession;
    } catch (error) {
      logger.error("Error opening cashier session:", error);
      throw error;
    }
  });

  // Close cashier session
  ipcMain.handle("cashier:closeSession", async (event, sessionData) => {
    try {
      // Check if table exists first
      const tableExists = await database.tableExists("cashier_sessions");
      if (!tableExists) {
        throw new Error(
          "Tabel cashier_sessions belum dibuat. Silakan jalankan migrasi database terlebih dahulu.",
        );
      }

      // Get current user
      const currentUser = getCurrentUserSafely();
      if (!currentUser) {
        throw new Error("User tidak ditemukan. Silakan login ulang.");
      }

      // Check if user has kasir role
      if (currentUser.role !== "kasir") {
        throw new Error("Hanya user dengan role kasir yang dapat menutup sesi kasir.");
      }

      const { sessionId, actualBalance, notes } = sessionData;

      if (!sessionId) {
        throw new Error("Session ID harus diisi");
      }

      if (!validator.isPositiveNumber(actualBalance)) {
        throw new Error("Saldo akhir harus berupa angka positif");
      }

      // Get session
      const session = await database.queryOne(
        "SELECT * FROM cashier_sessions WHERE id = ? AND status = 'open'",
        [sessionId],
      );

      if (!session) {
        throw new Error("Sesi kasir tidak ditemukan atau sudah ditutup");
      }

      // Verify that the session was opened by the current user
      if (session.user_id !== currentUser.id) {
        throw new Error("Hanya user yang membuka sesi kasir yang dapat menutup sesi tersebut.");
      }

      const expectedBalance = await calculateExpectedBalance(session);
      const difference = Number(actualBalance) - expectedBalance;

      await database.transaction(async () => {
        await database.execute(
          `UPDATE cashier_sessions SET
            closing_date = CURRENT_TIMESTAMP,
            closing_balance = ?,
            expected_balance = ?,
            actual_balance = ?,
            difference = ?,
            status = 'closed',
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [
            actualBalance,
            expectedBalance,
            actualBalance,
            difference,
            notes || session.notes,
            sessionId,
          ],
        );

        await logActivity({
          userId: session.user_id,
          action: "CASHIER_CLOSE",
          module: "cashier",
          description: `Menutup sesi kasir ${session.session_code}. Selisih: ${difference}`,
        });
      });

      const closedSession = await database.queryOne(
        `SELECT 
          cs.*,
          u.username,
          u.full_name
        FROM cashier_sessions cs
        JOIN users u ON cs.user_id = u.id
        WHERE cs.id = ?`,
        [sessionId],
      );

      // Create automatic backup after closing cashier session
      try {
        logger.info("Creating automatic backup after cashier session close...");
        const backupResult = await createBackup("auto", session.user_id);
        if (backupResult.success) {
          logger.info("Automatic backup created successfully after cashier close:", backupResult.backupFile);
        }
      } catch (backupError) {
        // Log error but don't fail the close session operation
        logger.error("Failed to create automatic backup after cashier close:", backupError);
      }

      return closedSession;
    } catch (error) {
      logger.error("Error closing cashier session:", error);
      throw error;
    }
  });

  // Get session by ID
  ipcMain.handle("cashier:getSessionById", async (event, sessionId) => {
    try {
      // Check if table exists first
      const tableExists = await database.tableExists("cashier_sessions");
      if (!tableExists) {
        throw new Error(
          "Tabel cashier_sessions belum dibuat. Silakan jalankan migrasi database terlebih dahulu.",
        );
      }

      const session = await database.queryOne(
        `SELECT 
          cs.*,
          u.username,
          u.full_name
        FROM cashier_sessions cs
        JOIN users u ON cs.user_id = u.id
        WHERE cs.id = ?`,
        [sessionId],
      );

      if (!session) {
        throw new Error("Sesi kasir tidak ditemukan");
      }

      return session;
    } catch (error) {
      logger.error("Error getting cashier session by ID:", error);
      throw error;
    }
  });
}

module.exports = setupCashierHandlers;
