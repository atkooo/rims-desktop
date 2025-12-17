const { dialog } = require("electron");
const database = require("./database");
const logger = require("./logger");
const { generateItemCode } = require("./codeUtils");
const { getAvailabilityByType } = require("./itemHelpers");
const ExcelJS = require("exceljs");

/**
 * Download Excel template for bulk item import
 * @returns {Promise<Object>} Object with success and filePath
 */
async function downloadItemTemplate() {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Items Template");

    // Get categories, sizes, and discount groups for reference
    const categories = await database.query(
      "SELECT id, name FROM categories WHERE is_active = 1 ORDER BY name"
    );
    const sizes = await database.query(
      "SELECT id, code, name FROM item_sizes WHERE is_active = 1 ORDER BY name"
    );
    const discountGroups = await database.query(
      "SELECT id, name FROM discount_groups WHERE is_active = 1 ORDER BY name"
    );

    // Define headers
    const headers = [
      "Nama*",
      "Kategori*",
      "Ukuran",
      "Deskripsi",
      "Harga Beli",
      "Harga Sewa/Hari",
      "Harga Jual",
      "Deposit",
      "Tipe*",
      "Min Stok Alert",
      "Grup Diskon",
    ];

    // Set headers
    worksheet.addRow(headers);

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Set warna background untuk header
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
      { width: 20 }, // Kategori
      { width: 15 }, // Ukuran
      { width: 40 }, // Deskripsi
      { width: 15 }, // Harga Beli
      { width: 15 }, // Harga Sewa/Hari
      { width: 15 }, // Harga Jual
      { width: 15 }, // Deposit
      { width: 15 }, // Tipe
      { width: 15 }, // Min Stok Alert
      { width: 20 }, // Grup Diskon
    ];

    // Add data validation for categories
    worksheet.dataValidations.add("B2:B1000", {
      type: "list",
      allowBlank: true,
      formulae: [`"${categories.map((c) => c.name).join(",")}"`],
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid Category",
      error: "Pilih kategori dari daftar yang tersedia",
    });

    // Add data validation for sizes (gunakan code, bukan name)
    worksheet.dataValidations.add("C2:C1000", {
      type: "list",
      allowBlank: true,
      formulae: [`"${sizes.map((s) => s.code).join(",")}"`],
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid Size",
      error:
        "Pilih ukuran dari daftar yang tersedia (gunakan code: M, L, XXL, dll)",
    });

    // Add data validation for type
    worksheet.dataValidations.add("I2:I1000", {
      type: "list",
      allowBlank: false,
      formulae: ['"RENTAL,SALE,BOTH"'],
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid Type",
      error: "Pilih RENTAL, SALE, atau BOTH",
    });

    // Add data validation for discount groups
    if (discountGroups.length > 0) {
      worksheet.dataValidations.add("K2:K1000", {
        type: "list",
        allowBlank: true,
        formulae: [`"${discountGroups.map((dg) => dg.name).join(",")}"`],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "Invalid Discount Group",
        error: "Pilih grup diskon dari daftar yang tersedia",
      });
    }

    // Add instruction row
    worksheet.insertRow(2, [
      "Contoh: Baju Pengantin",
      "Pilih dari dropdown",
      "Pilih dari dropdown (opsional)",
      "Deskripsi item",
      "0",
      "50000",
      "100000",
      "200000",
      "RENTAL",
      "1",
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
    noteSheet.addRow(["PANDUAN PENGISIAN TEMPLATE ITEMS"]);
    noteSheet.addRow([]);
    noteSheet.addRow(["Kolom dengan tanda * wajib diisi"]);
    noteSheet.addRow([]);
    noteSheet.addRow(["Nama: Nama item (wajib)"]);
    noteSheet.addRow(["Kategori: Pilih dari dropdown (wajib)"]);
    noteSheet.addRow([
      "Ukuran: Pilih code ukuran dari dropdown (opsional) - contoh: M, L, XL, XXL",
    ]);
    noteSheet.addRow(["Tipe: RENTAL, SALE, atau BOTH (wajib)"]);
    noteSheet.addRow([
      "CATATAN: Status dihitung otomatis berdasarkan stok (AVAILABLE/RENTED/MAINTENANCE)",
    ]);
    noteSheet.addRow([
      "CATATAN: Tersedia untuk Sewa/Jual dan Aktif otomatis di-set berdasarkan Tipe",
    ]);
    noteSheet.addRow([]);
    noteSheet.addRow(["CATATAN:"]);
    noteSheet.addRow(["1. Hapus baris contoh sebelum mengisi data"]);
    noteSheet.addRow([
      "2. Stok akan diatur ke 0 saat import (atur melalui manajemen stok)",
    ]);
    noteSheet.addRow(["3. Kode akan dibuat otomatis oleh sistem"]);
    noteSheet.addRow([
      "4. Pastikan format angka untuk harga menggunakan titik (.) sebagai desimal",
    ]);

    // Save file
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Simpan Template Items",
      defaultPath: "Template_Items.xlsx",
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
    logger.error("Error downloading items template:", error);
    throw error;
  }
}

/**
 * Import items from Excel file
 * @param {string} filePath - Path to Excel file
 * @returns {Promise<Object>} Object with success, failed counts and errors
 */
async function importItemsFromExcel(filePath) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet =
      workbook.getWorksheet("Items Template") || workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("Worksheet tidak ditemukan");
    }

    // Get reference data
    const categories = await database.query(
      "SELECT id, name FROM categories WHERE is_active = 1"
    );
    const sizes = await database.query(
      "SELECT id, code, name FROM item_sizes WHERE is_active = 1"
    );
    const discountGroups = await database.query(
      "SELECT id, name FROM discount_groups WHERE is_active = 1"
    );

    const categoryMap = new Map(
      categories.map((c) => [c.name.toLowerCase(), c.id])
    );
    // Gunakan code untuk ukuran (M, L, XXL, dll), bukan name
    const sizeMap = new Map(sizes.map((s) => [s.code.toUpperCase(), s.id]));
    const discountGroupMap = new Map(
      discountGroups.map((dg) => [dg.name.toLowerCase(), dg.id])
    );

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
        if (
          !row.getCell(1).value ||
          !row.getCell(1).value.toString().trim()
        ) {
          continue;
        }

        try {
          const name = (row.getCell(1).value || "").toString().trim();
          const categoryName = (row.getCell(2).value || "").toString().trim();
          const sizeCode =
            (row.getCell(3).value || "").toString().trim() || null;
          const description =
            (row.getCell(4).value || "").toString().trim() || null;
          const purchasePrice = parseFloat(row.getCell(5).value || 0) || 0;
          const rentalPricePerDay =
            parseFloat(row.getCell(6).value || 0) || 0;
          const salePrice = parseFloat(row.getCell(7).value || 0) || 0;
          const deposit = parseFloat(row.getCell(8).value || 0) || 0;
          const type = (row.getCell(9).value || "RENTAL")
            .toString()
            .trim()
            .toUpperCase();
          const minStockAlert = parseInt(row.getCell(10).value || 1) || 1;
          const discountGroupName =
            (row.getCell(11).value || "").toString().trim() || null;

          // Auto-set is_available_for_rent dan is_available_for_sale berdasarkan tipe item
          const availability = getAvailabilityByType(type);
          const isAvailableForRent = availability.is_available_for_rent;
          const isAvailableForSale = availability.is_available_for_sale;
          const isActive = true; // Default aktif

          // Validation
          if (!name) {
            throw new Error("Nama wajib diisi");
          }

          if (!categoryName) {
            throw new Error("Kategori wajib diisi");
          }

          const categoryId = categoryMap.get(categoryName.toLowerCase());
          if (!categoryId) {
            throw new Error(`Kategori "${categoryName}" tidak ditemukan`);
          }

          let sizeId = null;
          if (sizeCode) {
            // Gunakan code (M, L, XXL, dll) untuk mencocokkan ukuran
            sizeId = sizeMap.get(sizeCode.toUpperCase());
            if (!sizeId) {
              throw new Error(
                `Ukuran dengan code "${sizeCode}" tidak ditemukan`
              );
            }
          }

          let discountGroupId = null;
          if (discountGroupName) {
            discountGroupId = discountGroupMap.get(
              discountGroupName.toLowerCase()
            );
            if (!discountGroupId) {
              throw new Error(
                `Grup diskon "${discountGroupName}" tidak ditemukan`
              );
            }
          }

          // Generate code automatically
          const finalCode = await generateItemCode(database, type);

          // Insert item
          await database.execute(
            `INSERT INTO items (
              code, name, description, sale_price, type,
              size_id, category_id, rental_price_per_day, deposit,
              discount_group_id, stock_quantity, available_quantity,
              min_stock_alert, is_available_for_rent, is_available_for_sale,
              is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              finalCode,
              name,
              description,
              salePrice,
              type,
              sizeId,
              categoryId,
              rentalPricePerDay,
              deposit,
              discountGroupId,
              0, // stock_quantity
              0, // available_quantity
              minStockAlert,
              isAvailableForRent ? 1 : 0,
              isAvailableForSale ? 1 : 0,
              isActive ? 1 : 0,
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
    logger.error("Error importing items from Excel:", error);
    throw error;
  }
}

module.exports = {
  downloadItemTemplate,
  importItemsFromExcel,
};

