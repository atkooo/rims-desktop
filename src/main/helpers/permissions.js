const database = require("./database");

/**
 * Get all permissions for a user based on their role
 * @param {number} userId - User ID
 * @returns {Promise<Array<string>>} Array of permission slugs
 */
async function getUserPermissions(userId) {
  try {
    const permissions = await database.query(
      `SELECT p.slug
       FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id
       INNER JOIN users u ON u.role_id = rp.role_id
       WHERE u.id = ? AND u.is_active = 1`,
      [userId],
    );
    return permissions.map((p) => p.slug);
  } catch (error) {
    console.error("Error getting user permissions:", error);
    return [];
  }
}

/**
 * Get all permissions for a role
 * @param {number} roleId - Role ID
 * @returns {Promise<Array<string>>} Array of permission slugs
 */
async function getRolePermissions(roleId) {
  try {
    const permissions = await database.query(
      `SELECT p.slug
       FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = ?`,
      [roleId],
    );
    return permissions.map((p) => p.slug);
  } catch (error) {
    console.error("Error getting role permissions:", error);
    return [];
  }
}

/**
 * Check if user has a specific permission
 * @param {number} userId - User ID
 * @param {string} permissionSlug - Permission slug to check
 * @returns {Promise<boolean>} True if user has permission
 */
async function hasPermission(userId, permissionSlug) {
  try {
    const result = await database.queryOne(
      `SELECT COUNT(*) as count
       FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id
       INNER JOIN users u ON u.role_id = rp.role_id
       WHERE u.id = ? AND u.is_active = 1 AND p.slug = ?`,
      [userId, permissionSlug],
    );
    return result && result.count > 0;
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

/**
 * Check if user has any of the specified permissions
 * @param {number} userId - User ID
 * @param {Array<string>} permissionSlugs - Array of permission slugs to check
 * @returns {Promise<boolean>} True if user has at least one permission
 */
async function hasAnyPermission(userId, permissionSlugs) {
  if (!permissionSlugs || permissionSlugs.length === 0) return true;
  try {
    const placeholders = permissionSlugs.map(() => "?").join(",");
    const result = await database.queryOne(
      `SELECT COUNT(*) as count
       FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id
       INNER JOIN users u ON u.role_id = rp.role_id
       WHERE u.id = ? AND u.is_active = 1 AND p.slug IN (${placeholders})`,
      [userId, ...permissionSlugs],
    );
    return result && result.count > 0;
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false;
  }
}

/**
 * Check if user has all of the specified permissions
 * @param {number} userId - User ID
 * @param {Array<string>} permissionSlugs - Array of permission slugs to check
 * @returns {Promise<boolean>} True if user has all permissions
 */
async function hasAllPermissions(userId, permissionSlugs) {
  if (!permissionSlugs || permissionSlugs.length === 0) return true;
  try {
    const placeholders = permissionSlugs.map(() => "?").join(",");
    const result = await database.queryOne(
      `SELECT COUNT(DISTINCT p.slug) as count
       FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id
       INNER JOIN users u ON u.role_id = rp.role_id
       WHERE u.id = ? AND u.is_active = 1 AND p.slug IN (${placeholders})`,
      [userId, ...permissionSlugs],
    );
    return result && result.count === permissionSlugs.length;
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false;
  }
}

module.exports = {
  getUserPermissions,
  getRolePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
};

