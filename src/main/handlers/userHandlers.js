const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const {
  logActivity,
  getCurrentUserSafely,
} = require("../helpers/activity");
const { scryptHash } = require("../auth");

function setupUserHandlers() {
  // Get user by ID
  ipcMain.handle("users:getById", async (event, id) => {
    try {
      const sql = `
        SELECT 
          u.id,
          u.username,
          u.full_name,
          u.email,
          u.role_id,
          u.is_active,
          r.name AS role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
      `;
      const user = await database.queryOne(sql, [id]);
      return user;
    } catch (error) {
      logger.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  });

  // Create user
  ipcMain.handle("users:create", async (event, { username, password, full_name, email, role_id, is_active }) => {
    try {
      if (!username || !username.trim()) {
        throw new Error("Username wajib diisi");
      }
      if (!password || password.length < 6) {
        throw new Error("Password minimal 6 karakter");
      }
      if (!full_name || !full_name.trim()) {
        throw new Error("Nama lengkap wajib diisi");
      }
      if (!role_id) {
        throw new Error("Role wajib dipilih");
      }

      // Check if username already exists
      const existing = await database.queryOne(
        "SELECT id FROM users WHERE username = ?",
        [username.trim().toLowerCase()],
      );
      if (existing) {
        throw new Error("Username sudah digunakan");
      }

      // Check if role exists
      const role = await database.queryOne(
        "SELECT id, name FROM roles WHERE id = ?",
        [role_id],
      );
      if (!role) {
        throw new Error("Role tidak ditemukan");
      }
      
      // Prevent creating user with admin role
      if (role.name === "admin") {
        throw new Error("Tidak dapat membuat user dengan role admin");
      }

      // Hash password
      const passwordHash = scryptHash(password);

      // Insert user
      const result = await database.execute(
        "INSERT INTO users (username, password_hash, full_name, email, role_id, is_active) VALUES (?, ?, ?, ?, ?, ?)",
        [
          username.trim().toLowerCase(),
          passwordHash,
          full_name.trim(),
          email ? email.trim() : null,
          role_id,
          is_active !== undefined ? (is_active ? 1 : 0) : 1,
        ],
      );

      const currentUser = getCurrentUserSafely();

      await logActivity({
        userId: currentUser?.id || null,
        action: "CREATE",
        module: "users",
        description: `Created user: ${username}`,
      });

      // Return created user
      const createdUser = await database.queryOne(
        `SELECT 
          u.id,
          u.username,
          u.full_name,
          u.email,
          u.role_id,
          u.is_active,
          r.name AS role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?`,
        [result.lastID],
      );

      return createdUser;
    } catch (error) {
      logger.error("Error creating user:", error);
      throw error;
    }
  });

  // Update user
  ipcMain.handle("users:update", async (event, id, { full_name, email, role_id, is_active, password }) => {
    try {
      // Check if user exists
      const existing = await database.queryOne(
        "SELECT id FROM users WHERE id = ?",
        [id],
      );
      if (!existing) {
        throw new Error("User tidak ditemukan");
      }

      const updates = [];
      const values = [];

      if (full_name !== undefined) {
        if (!full_name || !full_name.trim()) {
          throw new Error("Nama lengkap wajib diisi");
        }
        updates.push("full_name = ?");
        values.push(full_name.trim());
      }

      if (email !== undefined) {
        updates.push("email = ?");
        values.push(email ? email.trim() : null);
      }

      if (role_id !== undefined) {
        // Check if role exists
        const role = await database.queryOne(
          "SELECT id, name FROM roles WHERE id = ?",
          [role_id],
        );
        if (!role) {
          throw new Error("Role tidak ditemukan");
        }
        
        // Check if trying to change to admin role
        if (role.name === "admin") {
          // Get current user's role
          const currentUser = await database.queryOne(
            `SELECT r.name as role_name 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             WHERE u.id = ?`,
            [id],
          );
          
          // Only allow if user is already admin
          if (!currentUser || currentUser.role_name !== "admin") {
            throw new Error("Tidak dapat mengubah role menjadi admin");
          }
        }
        
        updates.push("role_id = ?");
        values.push(role_id);
      }

      if (is_active !== undefined) {
        updates.push("is_active = ?");
        values.push(is_active ? 1 : 0);
      }

      if (password !== undefined && password) {
        if (password.length < 6) {
          throw new Error("Password minimal 6 karakter");
        }
        const passwordHash = scryptHash(password);
        updates.push("password_hash = ?");
        values.push(passwordHash);
      }

      if (updates.length === 0) {
        throw new Error("Tidak ada data yang diubah");
      }

      updates.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);

      await database.execute(
        `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
        values,
      );

      const currentUser = getCurrentUserSafely();

      await logActivity({
        userId: currentUser?.id || null,
        action: "UPDATE",
        module: "users",
        description: `Updated user: ${id}`,
      });

      // Return updated user
      const updatedUser = await database.queryOne(
        `SELECT 
          u.id,
          u.username,
          u.full_name,
          u.email,
          u.role_id,
          u.is_active,
          r.name AS role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?`,
        [id],
      );

      return updatedUser;
    } catch (error) {
      logger.error("Error updating user:", error);
      throw error;
    }
  });

  // Delete user
  ipcMain.handle("users:delete", async (event, id) => {
    try {
      // Check if user exists
      const user = await database.queryOne(
        "SELECT username FROM users WHERE id = ?",
        [id],
      );
      if (!user) {
        throw new Error("User tidak ditemukan");
      }

      // Prevent deleting yourself
      const currentUser = getCurrentUserSafely();
      if (currentUser && currentUser.id === id) {
        throw new Error("Tidak dapat menghapus user yang sedang login");
      }

      // Delete user
      await database.execute("DELETE FROM users WHERE id = ?", [id]);

      await logActivity({
        userId: currentUser?.id || null,
        action: "DELETE",
        module: "users",
        description: `Deleted user: ${user.username}`,
      });

      return true;
    } catch (error) {
      logger.error("Error deleting user:", error);
      throw error;
    }
  });

  // Update own profile (user can only update their own full_name, email, and password)
  ipcMain.handle("users:updateOwnProfile", async (event, { full_name, email, password, currentPassword }) => {
    try {
      const currentUser = getCurrentUserSafely();
      if (!currentUser || !currentUser.id) {
        throw new Error("User tidak terautentikasi");
      }

      const userId = currentUser.id;

      // Check if user exists
      const existing = await database.queryOne(
        "SELECT id, password_hash FROM users WHERE id = ?",
        [userId],
      );
      if (!existing) {
        throw new Error("User tidak ditemukan");
      }

      // If changing password, verify current password
      if (password) {
        if (!currentPassword) {
          throw new Error("Password lama wajib diisi untuk mengubah password");
        }
        const { verifyPassword } = require("../auth");
        if (!verifyPassword(currentPassword, existing.password_hash)) {
          throw new Error("Password lama salah");
        }
        if (password.length < 6) {
          throw new Error("Password baru minimal 6 karakter");
        }
      }

      const updates = [];
      const values = [];

      if (full_name !== undefined) {
        if (!full_name || !full_name.trim()) {
          throw new Error("Nama lengkap wajib diisi");
        }
        updates.push("full_name = ?");
        values.push(full_name.trim());
      }

      if (email !== undefined) {
        updates.push("email = ?");
        values.push(email ? email.trim() : null);
      }

      if (password) {
        const passwordHash = scryptHash(password);
        updates.push("password_hash = ?");
        values.push(passwordHash);
      }

      if (updates.length === 0) {
        throw new Error("Tidak ada data yang diubah");
      }

      updates.push("updated_at = CURRENT_TIMESTAMP");
      values.push(userId);

      await database.execute(
        `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
        values,
      );

      await logActivity({
        userId: userId,
        action: "UPDATE",
        module: "users",
        description: `Updated own profile`,
      });

      // Return updated user
      const updatedUser = await database.queryOne(
        `SELECT 
          u.id,
          u.username,
          u.full_name,
          u.email,
          u.role_id,
          u.is_active,
          r.name AS role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?`,
        [userId],
      );

      return updatedUser;
    } catch (error) {
      logger.error("Error updating own profile:", error);
      throw error;
    }
  });
}

module.exports = setupUserHandlers;

