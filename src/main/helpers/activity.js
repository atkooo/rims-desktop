const logger = require("./logger");
const database = require("./database");

/**
 * Get current user safely for activity logging
 * @returns {Object|null} Current user object or null
 */
function getCurrentUserSafely() {
  try {
    const { getCurrentUser } = require("../auth");
    return getCurrentUser();
  } catch (error) {
    logger.warn("Error getting current user for activity log:", error);
    return null;
  }
}

async function logActivity({
  userId = null,
  action,
  module = "system",
  description = null,
  ipAddress = null,
}) {
  try {
    await database.execute(
      `INSERT INTO activity_logs (user_id, action, module, description, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, action, module, description, ipAddress],
    );
  } catch (error) {
    // Don't block main flow on logging failures
    logger.warn("Failed to log activity", { error, action, module });
  }
}

module.exports = { logActivity, getCurrentUserSafely };
