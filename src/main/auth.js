const { ipcMain } = require("electron");
const crypto = require("crypto");
const database = require("./helpers/database");
const { logActivity } = require("./helpers/activity");

let currentUser = null;

function scryptHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.scryptSync(password, salt, 32).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(inputPassword, storedHash) {
  if (!storedHash) return false;

  if (storedHash.startsWith("scrypt:")) {
    const [, salt, hash] = storedHash.split(":");
    const derived = crypto.scryptSync(inputPassword, salt, 32).toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(derived, "hex"),
    );
  }

  if (storedHash.startsWith("sha256:")) {
    const hash = crypto
      .createHash("sha256")
      .update(inputPassword)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(storedHash.slice(7), "hex"),
      Buffer.from(hash, "hex"),
    );
  }

  return false;
}

function registerAuthIpc() {
  ipcMain.handle("auth:login", async (event, { username, password }) => {
    try {
      const user = await database.queryOne(
        `SELECT id, username, full_name, email, role, is_active, password_hash
         FROM users
         WHERE username = ?
         LIMIT 1`,
        [username],
      );

      if (!user || !user.is_active) {
        throw new Error("User tidak ditemukan atau non-aktif");
      }

      if (!verifyPassword(password, user.password_hash)) {
        throw new Error("Username atau password salah");
      }

      await database.execute(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
        [user.id],
      );

      currentUser = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role || null,
      };

      await logActivity({
        userId: user.id,
        action: "LOGIN",
        module: "auth",
        description: `User ${user.username} login`,
      });

      return currentUser;
    } catch (error) {
      await logActivity({
        userId: null,
        action: "LOGIN_FAILED",
        module: "auth",
        description: `User ${username} login failed: ${error.message}`,
      });
      throw error;
    }
  });

  ipcMain.handle("auth:logout", async () => {
    try {
      if (currentUser?.id) {
        await logActivity({
          userId: currentUser.id,
          action: "LOGOUT",
          module: "auth",
          description: `User ${currentUser.username} logout`,
        });
      }
    } finally {
      currentUser = null;
    }
    return true;
  });
  ipcMain.handle("auth:getCurrentUser", () => currentUser);

  ipcMain.handle("auth:changePassword", async (event, { userId, newPassword }) => {
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Password terlalu pendek");
    }

    const hash = scryptHash(newPassword);
    await database.execute(
      "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [hash, userId],
    );

    await logActivity({
      userId,
      action: "PASSWORD_CHANGE",
      module: "auth",
      description: `User ${userId} changed password`,
    });

    return true;
  });
}

function getCurrentUser() {
  return currentUser;
}

async function updateCurrentUser(userId) {
  if (!userId) return;
  try {
    const user = await database.queryOne(
      `SELECT id, username, full_name, email, role, is_active
       FROM users
       WHERE id = ?`,
      [userId],
    );

    if (user && currentUser && currentUser.id === userId) {
      currentUser = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role || null,
      };
    }
  } catch (error) {
    console.error("Error updating current user:", error);
  }
}

module.exports = { registerAuthIpc, getCurrentUser, updateCurrentUser, scryptHash, verifyPassword };
