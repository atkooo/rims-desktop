const { ipcMain, dialog } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");
const ExcelJS = require("exceljs");
const {
  toInteger,
  sanitizeAvailable,
  generateAccessoryCode,
  normalizeCode,
} = require("../helpers/codeUtils");

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const toBoolean = (value) =>
  value === true ||
  value === 1 ||
  value === "1" ||
  value === "true" ||
  value === "TRUE";

function setupAccessoryHandlers() {
  // Get next accessory code
  ipcMain.handle("accessories:getNextCode", async () => {
    try {
      const code = await generateAccessoryCode(database);
      return code;
    } catch (error) {
      logger.error("Error generating accessory code:", error);
      throw error;
    }
  });

  ipcMain.handle("accessories:create", async (_event, payload = {}) => {
    try {
      // Generate code based on sequential number if not provided
      let code = (payload.code || "").trim();
      if (!code) {
        code = await generateAccessoryCode(database);
      } else {
        // Normalize provided code
        code = normalizeCode(code, payload.name || "", "ACC");
      }
      const name = (payload.name ?? "").toString().trim();
      const description = (payload.description ?? "").toString().trim();

      if (!validator.isNotEmpty(name)) {
        throw new Error("Nama aksesoris wajib diisi");
      }

      // Stok selalu 0 saat create, diatur melalui manajemen stok
      // Force stock_quantity dan available_quantity = 0
      const stockQuantity = 0;
      const availableQuantity = 0;

      const now = new Date().toISOString();

      // Validate discount_group_id if provided
      const discountGroupId = await validator.validateDiscountGroupId(
        payload.discount_group_id,
      );

      const insertSql = `
        INSERT INTO accessories (
          code,
          name,
          description,
          purchase_price,
          rental_price_per_day,
          sale_price,
          stock_quantity,
          available_quantity,
          min_stock_alert,
          is_available_for_rent,
          is_available_for_sale,
          is_active,
          discount_group_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Force is_available_for_rent to false for accessories
      const isAvailableForRent = false;

      const result = await database.execute(insertSql, [
        code,
        name,
        description,
        toNumber(payload.purchase_price),
        toNumber(payload.rental_price_per_day),
        toNumber(payload.sale_price),
        stockQuantity,
        availableQuantity,
        Math.max(
          0,
          toInteger(
            payload.min_stock_alert === undefined || payload.min_stock_alert === null
              ? 1
              : payload.min_stock_alert,
          ),
        ),
        isAvailableForRent ? 1 : 0, // Always false for accessories
        toBoolean(payload.is_available_for_sale) ? 1 : 0,
        toBoolean(payload.is_active) ? 1 : 0,
        discountGroupId,
        now,
        now,
      ]);

      const created = await database.queryOne(
        "SELECT * FROM accessories WHERE id = ?",
        [result.id],
      );

      return created;
    } catch (error) {
      logger.error("Error creating accessory:", error);
      throw error;
    }
  });

  ipcMain.handle("accessories:update", async (_event, id, payload = {}) => {
    try {
      if (!id) {
        throw new Error("ID aksesoris tidak ditemukan");
      }

      const updates = {};

      if (payload.code !== undefined) {
        // Generate code if empty, otherwise normalize provided code
        if (!payload.code || !payload.code.trim()) {
          const code = await generateAccessoryCode(database);
          updates.code = code;
        } else {
          const code = normalizeCode(payload.code, payload.name || "", "ACC");
          updates.code = code;
        }
      }

      if (payload.name !== undefined) {
        const name = (payload.name ?? "").toString().trim();
        if (!validator.isNotEmpty(name)) {
          throw new Error("Nama aksesoris wajib diisi");
        }
        updates.name = name;
      }

      if (payload.description !== undefined) {
        updates.description = (payload.description ?? "").toString().trim();
      }

      const numericFields = [
        "purchase_price",
        "rental_price_per_day",
        "sale_price",
      ];
      numericFields.forEach((field) => {
        if (payload[field] !== undefined) {
          updates[field] = toNumber(payload[field]);
        }
      });

      // Stok tidak bisa diubah dari form edit
      // Hapus stock_quantity dan available_quantity jika ada di payload
      // Stok hanya bisa diubah melalui manajemen stok
      if (payload.stock_quantity !== undefined) {
        logger.warn(`Ignoring stock_quantity update for accessory ${id} - stok hanya bisa diubah melalui manajemen stok`);
      }
      if (payload.available_quantity !== undefined) {
        logger.warn(`Ignoring available_quantity update for accessory ${id} - stok hanya bisa diubah melalui manajemen stok`);
      }

      if (payload.min_stock_alert !== undefined) {
        updates.min_stock_alert = Math.max(
          0,
          toInteger(payload.min_stock_alert),
        );
      }

      // Validate discount_group_id if provided
      if (payload.discount_group_id !== undefined) {
        updates.discount_group_id = await validator.validateDiscountGroupId(
          payload.discount_group_id,
        );
      }

      // Force is_available_for_rent to false for accessories
      updates.is_available_for_rent = 0;

      const booleanFields = [
        "is_available_for_sale",
        "is_active",
      ];
      booleanFields.forEach((field) => {
        if (payload[field] !== undefined) {
          updates[field] = toBoolean(payload[field]) ? 1 : 0;
        }
      });

      if (!Object.keys(updates).length) {
        return database.queryOne("SELECT * FROM accessories WHERE id = ?", [
          id,
        ]);
      }

      updates.updated_at = new Date().toISOString();

      const fields = Object.keys(updates);
      const sql = `UPDATE accessories SET ${fields
        .map((field) => `${field} = ?`)
        .join(", ")} WHERE id = ?`;
      const values = fields.map((field) => updates[field]);
      await database.execute(sql, [...values, id]);

      const updated = await database.queryOne(
        "SELECT * FROM accessories WHERE id = ?",
        [id],
      );
      return updated;
    } catch (error) {
      logger.error(`Error updating accessory ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle("accessories:delete", async (_event, id) => {
    try {
      if (!id) {
        throw new Error("ID aksesoris tidak ditemukan");
      }

      const usage = await database.queryOne(
        "SELECT COUNT(*) AS count FROM bundle_details WHERE accessory_id = ?",
        [id],
      );

      if ((usage?.count ?? 0) > 0) {
        throw new Error(
          "Tidak dapat menghapus aksesoris yang sudah digunakan pada paket.",
        );
      }

      await database.execute("DELETE FROM accessories WHERE id = ?", [id]);
      return true;
    } catch (error) {
      logger.error(`Error deleting accessory ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle("accessories:getById", async (_event, id) => {
    try {
      if (!id) {
        throw new Error("ID aksesoris tidak ditemukan");
      }

      const accessory = await database.queryOne(
        "SELECT * FROM accessories WHERE id = ?",
        [id],
      );

      if (!accessory) {
        throw new Error("Aksesoris tidak ditemukan");
      }

      return accessory;
    } catch (error) {
      logger.error(`Error getting accessory ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle("accessories:getByCode", async (_event, code) => {
    try {
      if (!code || typeof code !== "string") {
        return null;
      }
      
      const { normalizeCode } = require("../helpers/codeUtils");
      const normalizedCode = normalizeCode(code.trim());
      
      const accessory = await database.queryOne(
        `SELECT * FROM accessories WHERE code = ? OR UPPER(code) = UPPER(?) LIMIT 1`,
        [normalizedCode, code.trim()],
      );
      
      return accessory || null;
    } catch (error) {
      logger.error(`Error getting accessory by code ${code}:`, error);
      throw error;
    }
  });

  // Download template Excel for bulk import
  ipcMain.handle("accessories:downloadTemplate", async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Accessories Template");

      // Get discount groups for reference
      const discountGroups = await database.query("SELECT id, name FROM discount_groups WHERE is_active = 1 ORDER BY name");

      // Define headers
      const headers = [
        "Nama*",
        "Deskripsi",
        "Harga Beli",
        "Harga Sewa/Hari",
        "Harga Jual",
        "Min Stok Alert",
        "Tersedia untuk Jual",
        "Aktif",
        "Grup Diskon",
      ];

      // Set headers
      worksheet.addRow(headers);

      // Style header row - hanya kolom yang digunakan
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      
      // Set warna background hanya untuk sel yang digunakan (kolom A sampai I = 9 kolom)
      for (let col = 1; col <= headers.length; col++) {
        const cell = headerRow.getCell(col);
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4F46E5" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Set column widths
      worksheet.columns = [
        { width: 30 }, // Nama
        { width: 40 }, // Deskripsi
        { width: 15 }, // Harga Beli
        { width: 15 }, // Harga Sewa/Hari
        { width: 15 }, // Harga Jual
        { width: 15 }, // Min Stok Alert
        { width: 20 }, // Tersedia untuk Jual
        { width: 15 }, // Aktif
        { width: 20 }, // Grup Diskon
      ];

      // Add data validation for boolean fields
      ["G2:G1000", "H2:H1000"].forEach(range => {
        worksheet.dataValidations.add(range, {
          type: "list",
          allowBlank: true,
          formulae: ['"Ya,Tidak"'],
          showErrorMessage: true,
          errorStyle: "error",
          errorTitle: "Invalid Value",
          error: "Pilih Ya atau Tidak",
        });
      });

      // Add data validation for discount groups
      if (discountGroups.length > 0) {
        worksheet.dataValidations.add("I2:I1000", {
          type: "list",
          allowBlank: true,
          formulae: [`"${discountGroups.map(dg => dg.name).join(",")}"`],
          showErrorMessage: true,
          errorStyle: "error",
          errorTitle: "Invalid Discount Group",
          error: "Pilih grup diskon dari daftar yang tersedia",
        });
      }

      // Add instruction row
      worksheet.insertRow(2, [
        "Contoh: Sepatu Pengantin",
        "Deskripsi aksesoris",
        "0",
        "0",
        "100000",
        "1",
        "Ya",
        "Ya",
        "Nama grup diskon (opsional)",
      ]);

      // Style instruction row
      const instructionRow = worksheet.getRow(2);
      instructionRow.font = { italic: true, color: { argb: "FF6B7280" } };
      instructionRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3F4F6" },
      };

      // Add note sheet
      const noteSheet = workbook.addWorksheet("Panduan");
      noteSheet.addRow(["PANDUAN PENGISIAN TEMPLATE AKSESORIS"]);
      noteSheet.addRow([]);
      noteSheet.addRow(["Kolom dengan tanda * wajib diisi"]);
      noteSheet.addRow([]);
      noteSheet.addRow(["Nama: Nama aksesoris (wajib)"]);
      noteSheet.addRow(["Harga Sewa/Hari: Biasanya 0 untuk aksesoris (tidak disewakan)"]);
      noteSheet.addRow(["Tersedia untuk Jual: Ya atau Tidak (default: Ya)"]);
      noteSheet.addRow(["Aktif: Ya atau Tidak (default: Ya)"]);
      noteSheet.addRow([]);
      noteSheet.addRow(["CATATAN:"]);
      noteSheet.addRow(["1. Hapus baris contoh sebelum mengisi data"]);
      noteSheet.addRow(["2. Stok akan diatur ke 0 saat import (atur melalui manajemen stok)"]);
      noteSheet.addRow(["3. Kode akan dibuat otomatis oleh sistem"]);
      noteSheet.addRow(["4. Aksesoris tidak tersedia untuk sewa (hanya jual)"]);
      noteSheet.addRow(["5. Pastikan format angka untuk harga menggunakan titik (.) sebagai desimal"]);

      // Save file
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Simpan Template Aksesoris",
        defaultPath: "Template_Aksesoris.xlsx",
        filters: [
          { name: "Excel Files", extensions: ["xlsx"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (canceled || !filePath) {
        return { success: false, error: "Download dibatalkan" };
      }

      await workbook.xlsx.writeFile(filePath);
      return { success: true, filePath };
    } catch (error) {
      logger.error("Error downloading accessories template:", error);
      throw error;
    }
  });

  // Import accessories from Excel
  ipcMain.handle("accessories:importExcel", async (event, filePath) => {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const worksheet = workbook.getWorksheet("Accessories Template") || workbook.worksheets[0];
      if (!worksheet) {
        throw new Error("Worksheet tidak ditemukan");
      }

      // Get reference data
      const discountGroups = await database.query("SELECT id, name FROM discount_groups WHERE is_active = 1");
      const discountGroupMap = new Map(discountGroups.map(dg => [dg.name.toLowerCase(), dg.id]));

      const results = {
        success: 0,
        failed: 0,
        errors: [],
      };

      await database.execute("BEGIN TRANSACTION");

      try {
        // Skip header and instruction rows (rows 1-2)
        for (let rowNum = 3; rowNum <= worksheet.rowCount; rowNum++) {
          const row = worksheet.getRow(rowNum);
          
          // Skip empty rows
          if (!row.getCell(1).value || !row.getCell(1).value.toString().trim()) {
            continue;
          }

          try {
            const name = (row.getCell(1).value || "").toString().trim();
            const description = (row.getCell(2).value || "").toString().trim() || null;
            const purchasePrice = parseFloat(row.getCell(3).value || 0) || 0;
            const rentalPricePerDay = parseFloat(row.getCell(4).value || 0) || 0;
            const salePrice = parseFloat(row.getCell(5).value || 0) || 0;
            const minStockAlert = parseInt(row.getCell(6).value || 1) || 1;
            const isAvailableForSale = (row.getCell(7).value || "Ya").toString().trim().toLowerCase() === "ya";
            const isActive = (row.getCell(8).value || "Ya").toString().trim().toLowerCase() === "ya";
            const discountGroupName = (row.getCell(9).value || "").toString().trim() || null;

            // Validation
            if (!name) {
              throw new Error("Nama wajib diisi");
            }

            let discountGroupId = null;
            if (discountGroupName) {
              discountGroupId = discountGroupMap.get(discountGroupName.toLowerCase());
              if (!discountGroupId) {
                throw new Error(`Grup diskon "${discountGroupName}" tidak ditemukan`);
              }
            }

            // Generate code automatically
            const finalCode = await generateAccessoryCode(database);

            const now = new Date().toISOString();

            // Insert accessory
            await database.execute(
              `INSERT INTO accessories (
                code, name, description, purchase_price, rental_price_per_day,
                sale_price, stock_quantity, available_quantity, min_stock_alert,
                is_available_for_rent, is_available_for_sale, is_active,
                discount_group_id, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                finalCode,
                name,
                description,
                purchasePrice,
                rentalPricePerDay,
                salePrice,
                0, // stock_quantity
                0, // available_quantity
                minStockAlert,
                0, // is_available_for_rent (always false for accessories)
                isAvailableForSale ? 1 : 0,
                isActive ? 1 : 0,
                discountGroupId,
                now,
                now,
              ]
            );

            results.success++;
          } catch (error) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              error: error.message || "Error tidak diketahui",
            });
            logger.error(`Error importing row ${rowNum}:`, error);
          }
        }

        await database.execute("COMMIT");
        return results;
      } catch (error) {
        await database.execute("ROLLBACK");
        throw error;
      }
    } catch (error) {
      logger.error("Error importing accessories from Excel:", error);
      throw error;
    }
  });
}

module.exports = setupAccessoryHandlers;
