const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const { logActivity } = require("../helpers/activity");

// Helper function to get current user safely
function getCurrentUserSafely() {
  try {
    const { getCurrentUser } = require("../auth");
    return getCurrentUser();
  } catch (error) {
    logger.warn("Error getting current user for activity log:", error);
    return null;
  }
}

function setupRoleHandlers() {
  // Get all roles
  ipcMain.handle("roles:getAll", async () => {
    try {
      const sql = `
        SELECT 
          r.id,
          r.name,
          r.description,
          COUNT(DISTINCT u.id) AS user_count,
          COUNT(DISTINCT rp.permission_id) AS permission_count
        FROM roles r
        LEFT JOIN users u ON u.role_id = r.id
        LEFT JOIN role_permissions rp ON rp.role_id = r.id
        GROUP BY r.id, r.name, r.description
        ORDER BY r.name ASC
      `;
      const roles = await database.query(sql);
      return roles;
    } catch (error) {
      logger.error("Error fetching roles:", error);
      throw error;
    }
  });

  // Get role by ID
  ipcMain.handle("roles:getById", async (event, id) => {
    try {
      const sql = `
        SELECT 
          id,
          name,
          description
        FROM roles 
        WHERE id = ?
      `;
      const role = await database.queryOne(sql, [id]);
      return role;
    } catch (error) {
      logger.error(`Error fetching role ${id}:`, error);
      throw error;
    }
  });

  // Create role
  ipcMain.handle("roles:create", async (event, { name, description }) => {
    try {
      if (!name || !name.trim()) {
        throw new Error("Nama role wajib diisi");
      }

      // Check if role already exists
      const existing = await database.queryOne(
        "SELECT id FROM roles WHERE name = ?",
        [name.trim().toLowerCase()],
      );
      if (existing) {
        throw new Error("Role dengan nama tersebut sudah ada");
      }

      // Insert role
      const result = await database.execute(
        "INSERT INTO roles (name, description) VALUES (?, ?)",
        [name.trim().toLowerCase(), description || null],
      );

      const currentUser = getCurrentUserSafely();

      await logActivity({
        userId: currentUser?.id || null,
        action: "CREATE",
        module: "roles",
        description: `Created role: ${name}`,
      });

      return {
        id: result.lastID,
        name: name.trim().toLowerCase(),
        description: description || null,
      };
    } catch (error) {
      logger.error("Error creating role:", error);
      throw error;
    }
  });

  // Update role
  ipcMain.handle("roles:update", async (event, id, { name, description }) => {
    try {
      if (!name || !name.trim()) {
        throw new Error("Nama role wajib diisi");
      }

      // Check if role exists
      const existing = await database.queryOne(
        "SELECT id, name FROM roles WHERE id = ?",
        [id],
      );
      if (!existing) {
        throw new Error("Role tidak ditemukan");
      }

      // Check if name is already taken by another role
      const nameExists = await database.queryOne(
        "SELECT id FROM roles WHERE name = ? AND id != ?",
        [name.trim().toLowerCase(), id],
      );
      if (nameExists) {
        throw new Error("Role dengan nama tersebut sudah ada");
      }

      // Update role
      await database.execute(
        "UPDATE roles SET name = ?, description = ? WHERE id = ?",
        [name.trim().toLowerCase(), description || null, id],
      );

      const currentUser = getCurrentUserSafely();

      await logActivity({
        userId: currentUser?.id || null,
        action: "UPDATE",
        module: "roles",
        description: `Updated role: ${name}`,
      });

      return {
        id,
        name: name.trim().toLowerCase(),
        description: description || null,
      };
    } catch (error) {
      logger.error("Error updating role:", error);
      throw error;
    }
  });

  // Delete role
  ipcMain.handle("roles:delete", async (event, id) => {
    try {
      // Check if role exists
      const role = await database.queryOne(
        "SELECT name FROM roles WHERE id = ?",
        [id],
      );
      if (!role) {
        throw new Error("Role tidak ditemukan");
      }

      // Check if role is used by users
      const userCount = await database.queryOne(
        "SELECT COUNT(*) as count FROM users WHERE role_id = ?",
        [id],
      );
      if (userCount && userCount.count > 0) {
        throw new Error(
          `Role tidak dapat dihapus karena masih digunakan oleh ${userCount.count} user`,
        );
      }

      // Delete role permissions first
      await database.execute("DELETE FROM role_permissions WHERE role_id = ?", [
        id,
      ]);

      // Delete role
      await database.execute("DELETE FROM roles WHERE id = ?", [id]);

      const currentUser = getCurrentUserSafely();

      await logActivity({
        userId: currentUser?.id || null,
        action: "DELETE",
        module: "roles",
        description: `Deleted role: ${role.name}`,
      });

      return true;
    } catch (error) {
      logger.error("Error deleting role:", error);
      throw error;
    }
  });

  // Get all permissions
  ipcMain.handle("permissions:getAll", async () => {
    try {
      const sql = `
        SELECT 
          id,
          name,
          slug,
          description,
          module,
          created_at
        FROM permissions 
        ORDER BY module ASC, name ASC
      `;
      const permissions = await database.query(sql);
      return permissions;
    } catch (error) {
      logger.error("Error fetching permissions:", error);
      throw error;
    }
  });

  // Get permissions by module
  ipcMain.handle("permissions:getByModule", async (event, module) => {
    try {
      const sql = `
        SELECT 
          id,
          name,
          slug,
          description,
          module,
          created_at
        FROM permissions 
        WHERE module = ?
        ORDER BY name ASC
      `;
      const permissions = await database.query(sql, [module]);
      return permissions;
    } catch (error) {
      logger.error(`Error fetching permissions for module ${module}:`, error);
      throw error;
    }
  });

  // Get role permissions
  ipcMain.handle("roles:getPermissions", async (event, roleId) => {
    try {
      const sql = `
        SELECT 
          p.id,
          p.name,
          p.slug,
          p.description,
          p.module
        FROM permissions p
        INNER JOIN role_permissions rp ON rp.permission_id = p.id
        WHERE rp.role_id = ?
        ORDER BY p.module ASC, p.name ASC
      `;
      const permissions = await database.query(sql, [roleId]);
      return permissions;
    } catch (error) {
      logger.error(`Error fetching permissions for role ${roleId}:`, error);
      throw error;
    }
  });

  // Update role permissions
  ipcMain.handle(
    "roles:updatePermissions",
    async (event, roleId, permissionIds) => {
      try {
        // Check if role exists
        const role = await database.queryOne(
          "SELECT name FROM roles WHERE id = ?",
          [roleId],
        );
        if (!role) {
          throw new Error("Role tidak ditemukan");
        }

        // Validate permission IDs
        if (!Array.isArray(permissionIds)) {
          throw new Error("Permission IDs harus berupa array");
        }
        
        // Ensure all IDs are numbers (convert if needed)
        const validPermissionIds = permissionIds.map((id) => {
          const numId = Number(id);
          if (isNaN(numId) || numId <= 0) {
            throw new Error("Permission ID tidak valid");
          }
          return numId;
        });

        // Begin transaction
        await database.execute("BEGIN TRANSACTION");

        try {
          // Delete existing role permissions
          await database.execute(
            "DELETE FROM role_permissions WHERE role_id = ?",
            [roleId],
          );

          // Insert new role permissions
          if (validPermissionIds.length > 0) {
            const placeholders = validPermissionIds.map(() => "(?, ?)").join(", ");
            const values = validPermissionIds.flatMap((permId) => [roleId, permId]);
            await database.execute(
              `INSERT INTO role_permissions (role_id, permission_id) VALUES ${placeholders}`,
              values,
            );
          }

          // Commit transaction
          await database.execute("COMMIT");

          const currentUser = getCurrentUserSafely();

          // Log activity (don't await if it might cause issues)
          logActivity({
            userId: currentUser?.id || null,
            action: "UPDATE",
            module: "roles",
            description: `Updated permissions for role: ${role.name}`,
          }).catch((err) => {
            logger.warn("Error logging activity:", err);
          });

          // Return simple object that can be cloned
          return { success: true };
        } catch (error) {
          // Rollback on error
          await database.execute("ROLLBACK");
          throw error;
        }
      } catch (error) {
        logger.error("Error updating role permissions:", error);
        throw error;
      }
    },
  );

  // Get permission by ID
  ipcMain.handle("permissions:getById", async (event, id) => {
    try {
      const sql = `
        SELECT 
          id,
          name,
          slug,
          description,
          module,
          created_at
        FROM permissions 
        WHERE id = ?
      `;
      const permission = await database.queryOne(sql, [id]);
      return permission;
    } catch (error) {
      logger.error(`Error fetching permission ${id}:`, error);
      throw error;
    }
  });
}

module.exports = setupRoleHandlers;
