const { ipcMain } = require("electron");
const crypto = require("crypto");
const { getDb } = require("./database");

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
      Buffer.from(derived, "hex")
    );
  }
  if (storedHash.startsWith("sha256:")) {
    const hash = crypto
      .createHash("sha256")
      .update(inputPassword)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(storedHash.slice(7), "hex"),
      Buffer.from(hash, "hex")
    );
  }
  return false;
}

function registerAuthIpc() {
  const { getDb, getAsync, runAsync } = require("./database");
  const db = getDb();

  ipcMain.handle("auth:login", async (event, { username, password }) => {
    const user = await getAsync(
      "SELECT id, username, full_name, email, role_id, is_active, password_hash FROM users WHERE username = ? LIMIT 1",
      [username]
    );

    if (!user || !user.is_active)
      throw new Error("User tidak ditemukan atau non-aktif");
    if (!verifyPassword(password, user.password_hash))
      throw new Error("Username atau password salah");

    await runAsync(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      [user.id]
    );
    currentUser = {
      id: user.id,
      role_id: user.role_id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    };
    return currentUser;
  });

  ipcMain.handle("auth:logout", () => {
    currentUser = null;
    return true;
  });
  ipcMain.handle("auth:getCurrentUser", () => currentUser);
  ipcMain.handle("auth:changePassword", (event, { userId, newPassword }) => {
    if (!newPassword || newPassword.length < 6)
      throw new Error("Password terlalu pendek");
    const hash = scryptHash(newPassword);
    getDb()
      .prepare(
        "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .run(hash, userId);
    return true;
  });
}

module.exports = { registerAuthIpc };
