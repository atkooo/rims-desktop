const fs = require("fs");
const path = require("path");
const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");

const DATA_DIR = path.join(__dirname, "../../..", "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads", "customers");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const mimeExtensions = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "application/pdf": ".pdf",
};

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function normalizeExtension(originalName, mimeType) {
  const ext = (path.extname(originalName) || "").toLowerCase();
  if (ext) return ext;
  if (mimeType && mimeExtensions[mimeType]) {
    return mimeExtensions[mimeType];
  }
  return ".dat";
}

function createStoredFilename(prefix, originalName, mimeType) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1_000_000);
  const ext = normalizeExtension(originalName, mimeType);
  return `${prefix}-${timestamp}-${random}${ext}`;
}

function decodeFilePayload(filePayload) {
  if (!filePayload || !filePayload.data) {
    return null;
  }

  const encoding = filePayload.encoding || "base64";

  try {
    if (encoding === "base64") {
      return Buffer.from(filePayload.data, "base64");
    }
    if (encoding === "binary") {
      return Buffer.from(filePayload.data);
    }
    if (encoding === "arraybuffer") {
      return Buffer.from(filePayload.data);
    }
  } catch (error) {
    logger.error("Failed to decode file payload:", error);
    throw new Error("Dokumen tidak dapat diproses");
  }

  throw new Error(`Encoding dokumen tidak didukung: ${encoding}`);
}

function saveUploadedFile(filePayload, prefix) {
  if (!filePayload) return null;

  const buffer = decodeFilePayload(filePayload);
  if (!buffer) return null;

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("Ukuran file melebihi batas 5MB");
  }

  ensureUploadDir();

  const filename = createStoredFilename(
    prefix,
    filePayload.name || prefix,
    filePayload.mimeType,
  );
  const storedPath = path.join(UPLOAD_DIR, filename);

  fs.writeFileSync(storedPath, buffer);

  const relativePath = path
    .relative(DATA_DIR, storedPath)
    .split(path.sep)
    .join("/");

  return relativePath;
}

function deleteStoredFile(relativePath) {
  if (!relativePath) return;

  const normalized = path.normalize(relativePath);
  const fullPath = path.join(DATA_DIR, normalized);

  if (!fullPath.startsWith(DATA_DIR)) {
    logger.warn("Attempt to delete file outside data dir:", fullPath);
    return;
  }

  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (error) {
      logger.warn("Failed to delete stored file:", fullPath, error);
    }
  }
}

function resolveDocument(relativePath) {
  if (!relativePath) return null;

  const normalized = path.normalize(relativePath);
  const fullPath = path.join(DATA_DIR, normalized);

  if (!fullPath.startsWith(UPLOAD_DIR)) {
    throw new Error("Path dokumen tidak valid");
  }

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  return fullPath;
}

function mapCustomerRow(row) {
  if (!row) return row;
  return {
    ...row,
    is_active:
      row.is_active === true || row.is_active === 1 || row.is_active === "1",
  };
}

/**
 * Generate customer code automatically
 * Format: CUS-001, CUS-002, etc.
 */
async function generateCustomerCode() {
  try {
    // Get all customer codes that match pattern CUS-XXX
    const customers = await database.query(
      `SELECT code FROM customers WHERE code LIKE 'CUS-%' ORDER BY code DESC`,
    );

    if (customers && customers.length > 0) {
      // Find the highest number
      let maxNumber = 0;
      for (const customer of customers) {
        const match = customer.code.match(/CUS-(\d+)/);
        if (match && match[1]) {
          const number = parseInt(match[1], 10);
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      }

      if (maxNumber > 0) {
        const nextNumber = maxNumber + 1;
        return `CUS-${nextNumber.toString().padStart(3, "0")}`;
      }
    }

    // If no existing code found, start from CUS-001
    return "CUS-001";
  } catch (error) {
    logger.error("Error generating customer code:", error);
    // Fallback: use timestamp-based code
    const timestamp = Date.now().toString().slice(-6);
    return `CUS-${timestamp}`;
  }
}

function setupCustomerHandlers() {
  ipcMain.handle("customers:create", async (_event, payload = {}) => {
    try {
      const now = new Date().toISOString();
      let code = (payload.code ?? "").toString().trim();
      const name = (payload.name ?? "").toString().trim();
      const phone = (payload.phone ?? "").toString().trim();
      const email = (payload.email ?? "").toString().trim();
      const address = (payload.address ?? "").toString().trim();
      const notes = (payload.notes ?? "").toString().trim();
      const idCardNumber = (payload.id_card_number ?? "").toString().trim();

      // Auto-generate code if not provided
      if (!validator.isNotEmpty(code)) {
        code = await generateCustomerCode();
      } else {
        // Normalize code to uppercase
        code = code.toUpperCase();
      }

      if (!validator.isNotEmpty(name)) {
        throw new Error("Nama pelanggan wajib diisi");
      }
      if (email && !validator.isValidEmail(email)) {
        throw new Error("Format email tidak valid");
      }

      // Check if code already exists (only if code was manually provided)
      // For auto-generated codes, generateCustomerCode already handles uniqueness
      if (payload.code && payload.code.trim() !== "") {
        const existing = await database.queryOne(
          "SELECT id FROM customers WHERE code = ?",
          [code],
        );

        if (existing) {
          throw new Error("Kode pelanggan sudah digunakan");
        }
      } else {
        // For auto-generated codes, ensure uniqueness by checking if it exists
        // and generating a new one if needed
        let attempts = 0;
        let maxAttempts = 10;
        while (attempts < maxAttempts) {
          const existing = await database.queryOne(
            "SELECT id FROM customers WHERE code = ?",
            [code],
          );

          if (!existing) {
            // Code is unique, we can use it
            break;
          }

          // Code exists, generate a new one
          const match = code.match(/CUS-(\d+)/);
          if (match && match[1]) {
            const number = parseInt(match[1], 10) + 1;
            code = `CUS-${number.toString().padStart(3, "0")}`;
          } else {
            // Fallback: regenerate completely
            code = await generateCustomerCode();
          }
          attempts++;
        }

        if (attempts >= maxAttempts) {
          // Final fallback: use timestamp-based code
          code = `CUS-${Date.now().toString().slice(-6)}`;
        }
      }

      let photoPath = null;
      let idCardImagePath = null;

      if (payload.photo) {
        photoPath = saveUploadedFile(payload.photo, "photo");
      }
      if (payload.id_card_image) {
        idCardImagePath = saveUploadedFile(payload.id_card_image, "ktp");
      }

      // Validate discount_group_id if provided
      let discountGroupId = null;
      if (
        payload.discount_group_id !== undefined &&
        payload.discount_group_id !== null &&
        payload.discount_group_id !== ""
      ) {
        discountGroupId = Number(payload.discount_group_id);
        if (discountGroupId) {
          const discountGroup = await database.queryOne(
            "SELECT id FROM discount_groups WHERE id = ?",
            [discountGroupId],
          );
          if (!discountGroup) {
            throw new Error("Grup diskon tidak ditemukan");
          }
        } else {
          discountGroupId = null;
        }
      }

      const insertSql = `
        INSERT INTO customers (
          code,
          name,
          phone,
          email,
          address,
          id_card_number,
          notes,
          is_active,
          photo_path,
          id_card_image_path,
          discount_group_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await database.execute(insertSql, [
        code,
        name,
        phone || null,
        email || null,
        address || null,
        idCardNumber || null,
        notes || null,
        payload.is_active === false ? 0 : 1,
        photoPath,
        idCardImagePath,
        discountGroupId,
        now,
        now,
      ]);

      const created = await database.queryOne(
        "SELECT * FROM customers WHERE id = ?",
        [result.id],
      );

      return mapCustomerRow(created);
    } catch (error) {
      logger.error("Error creating customer:", error);
      throw error;
    }
  });

  ipcMain.handle(
    "customers:update",
    async (_event, id, payload = {}, options = {}) => {
      try {
        if (!id) {
          throw new Error("ID pelanggan tidak ditemukan");
        }

        const existing = await database.queryOne(
          "SELECT * FROM customers WHERE id = ?",
          [id],
        );

        if (!existing) {
          throw new Error("Data pelanggan tidak ditemukan");
        }

        const updates = {};
        const fields = [];
        const values = [];

        if (payload.code !== undefined) {
          const code = (payload.code ?? "").toString().trim();

          // Only update code if it's provided and not empty
          // If empty, skip code update (keep existing code)
          if (validator.isNotEmpty(code)) {
            // Normalize code to uppercase
            const normalizedCode = code.toUpperCase();

            // Check for duplicate
            const duplicate = await database.queryOne(
              "SELECT id FROM customers WHERE code = ? AND id != ?",
              [normalizedCode, id],
            );

            if (duplicate) {
              throw new Error(
                "Kode pelanggan sudah digunakan oleh pelanggan lain",
              );
            }

            updates.code = normalizedCode;
          }
          // If code is empty, don't update it (skip)
        }

        if (payload.name !== undefined) {
          const name = (payload.name ?? "").toString().trim();
          if (!validator.isNotEmpty(name)) {
            throw new Error("Nama pelanggan wajib diisi");
          }
          updates.name = name;
        }

        const optionalStringFields = [
          "phone",
          "email",
          "address",
          "notes",
          "id_card_number",
        ];

        optionalStringFields.forEach((field) => {
          if (payload[field] !== undefined) {
            const value = (payload[field] ?? "").toString().trim();
            if (field === "email" && value && !validator.isValidEmail(value)) {
              throw new Error("Format email tidak valid");
            }
            updates[field] = value || null;
          }
        });

        if (payload.discount_group_id !== undefined) {
          if (
            payload.discount_group_id === null ||
            payload.discount_group_id === ""
          ) {
            updates.discount_group_id = null;
          } else {
            const discountGroupId = Number(payload.discount_group_id);
            if (discountGroupId) {
              const discountGroup = await database.queryOne(
                "SELECT id FROM discount_groups WHERE id = ?",
                [discountGroupId],
              );
              if (!discountGroup) {
                throw new Error("Grup diskon tidak ditemukan");
              }
              updates.discount_group_id = discountGroupId;
            } else {
              updates.discount_group_id = null;
            }
          }
        }

        if (payload.is_active !== undefined) {
          updates.is_active =
            payload.is_active === true ||
            payload.is_active === 1 ||
            payload.is_active === "1"
              ? 1
              : 0;
        }

        let photoPath = existing.photo_path;
        let idCardPath = existing.id_card_image_path;

        if (payload.photo) {
          const newPath = saveUploadedFile(payload.photo, "photo");
          if (newPath) {
            deleteStoredFile(existing.photo_path);
            photoPath = newPath;
          }
        } else if (options.removePhoto === true && existing.photo_path) {
          deleteStoredFile(existing.photo_path);
          photoPath = null;
        }

        if (payload.id_card_image) {
          const newPath = saveUploadedFile(payload.id_card_image, "ktp");
          if (newPath) {
            deleteStoredFile(existing.id_card_image_path);
            idCardPath = newPath;
          }
        } else if (
          options.removeIdCard === true &&
          existing.id_card_image_path
        ) {
          deleteStoredFile(existing.id_card_image_path);
          idCardPath = null;
        }

        updates.photo_path = photoPath;
        updates.id_card_image_path = idCardPath;
        updates.updated_at = new Date().toISOString();

        Object.entries(updates).forEach(([field, value]) => {
          fields.push(`${field} = ?`);
          values.push(value);
        });

        if (!fields.length) {
          return mapCustomerRow(existing);
        }

        await database.execute(
          `UPDATE customers SET ${fields.join(", ")} WHERE id = ?`,
          [...values, id],
        );

        const updated = await database.queryOne(
          "SELECT * FROM customers WHERE id = ?",
          [id],
        );

        return mapCustomerRow(updated);
      } catch (error) {
        logger.error(`Error updating customer ${id}:`, error);
        throw error;
      }
    },
  );

  ipcMain.handle("customers:delete", async (_event, id) => {
    try {
      if (!id) {
        throw new Error("ID pelanggan tidak ditemukan");
      }

      const existing = await database.queryOne(
        "SELECT * FROM customers WHERE id = ?",
        [id],
      );

      if (!existing) {
        throw new Error("Data pelanggan tidak ditemukan");
      }

      const usage = await database.queryOne(
        `
          SELECT
            (SELECT COUNT(1) FROM rental_transactions WHERE customer_id = ?) AS rentals,
            (SELECT COUNT(1) FROM sales_transactions WHERE customer_id = ?) AS sales,
            (SELECT COUNT(1) FROM bookings WHERE customer_id = ?) AS bookings
        `,
        [id, id, id],
      );

      if (
        (usage?.rentals ?? 0) > 0 ||
        (usage?.sales ?? 0) > 0 ||
        (usage?.bookings ?? 0) > 0
      ) {
        throw new Error(
          "Tidak dapat menghapus pelanggan yang sudah memiliki transaksi",
        );
      }

      await database.execute("DELETE FROM customers WHERE id = ?", [id]);

      deleteStoredFile(existing.photo_path);
      deleteStoredFile(existing.id_card_image_path);

      return true;
    } catch (error) {
      logger.error(`Error deleting customer ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle("customers:getById", async (_event, id) => {
    if (!id) {
      throw new Error("ID pelanggan wajib diisi");
    }

    const row = await database.queryOne(
      "SELECT * FROM customers WHERE id = ?",
      [id],
    );

    if (!row) {
      throw new Error("Data pelanggan tidak ditemukan");
    }

    return mapCustomerRow(row);
  });

  ipcMain.handle("customers:getDocument", async (_event, relativePath) => {
    try {
      const fullPath = resolveDocument(relativePath);
      if (!fullPath) return null;

      const buffer = fs.readFileSync(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      const mimeType =
        Object.entries(mimeExtensions).find(
          ([, extension]) => extension === ext,
        )?.[0] || "application/octet-stream";

      return {
        dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
        mimeType,
        size: buffer.length,
        fileName: path.basename(fullPath),
      };
    } catch (error) {
      logger.error("Error loading customer document:", error);
      throw new Error("Dokumen tidak dapat dibuka");
    }
  });
}

module.exports = setupCustomerHandlers;
