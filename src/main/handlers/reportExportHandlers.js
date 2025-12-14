const { ipcMain, dialog, shell } = require("electron");
const fs = require("fs").promises;
const os = require("os");
const path = require("path");
const ExcelJS = require("exceljs");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const reportQueries = require("../helpers/reportQueries");

// Map report types to their handler channels
const reportTypeMap = {
  executive: "reports:getExecutiveReport",
  finance: "reports:getFinanceReport",
  stock: "reports:getStockReport",
  transactions: "reports:getTransactionsView",
  "rental-transactions": "reports:getRentalTransactions",
  "sales-transactions": "reports:getSalesTransactions",
  "daily-revenue": "reports:getDailyRevenue",
  "revenue-by-cashier": "reports:getRevenueByCashier",
  payments: "reports:getPayments",
  "stock-items": "reports:getStockItems",
  "stock-accessories": "reports:getStockAccessories",
  "stock-bundles": "reports:getStockBundles",
  "stock-movements": "reports:getStockMovements",
  "low-stock-alert": "reports:getLowStockAlert",
  "stock-by-category": "reports:getStockByCategory",
};

function setupReportExportHandlers() {
  // Export report data to file
  ipcMain.handle("reports:export", async (event, reportType, format, filterParams = {}) => {
    try {
      // Get data from the appropriate handler
      const handlerChannel = reportTypeMap[reportType];
      if (!handlerChannel) {
        throw new Error(`Unknown report type: ${reportType}`);
      }

      // Fetch data using direct query (same as reportViewHandlers)
      let query = getSQLQueryForReportType(reportType);
      if (!query) {
        throw new Error(`No query defined for report type: ${reportType}`);
      }

      // Apply date filters
      query = applyDateFilters(query, reportType, filterParams);

      const data = await database.query(query);

      if (!data || data.length === 0) {
        logger.warn(`Report export skipped, no data for type: ${reportType}`);
        return {
          success: false,
          error: "Laporan tidak memiliki data untuk di-export. Periksa kembali filter yang digunakan.",
          code: "NO_DATA",
        };
      }

      // Show save dialog
      const fileExtension = format === "excel" ? "xlsx" : format;
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: `Export ${reportType} Report`,
        defaultPath: `${reportType}_${new Date().toISOString().split("T")[0]}.${fileExtension}`,
        filters: [
          { name: format === "excel" ? "Excel" : format.toUpperCase(), extensions: [fileExtension] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (canceled || !filePath) {
        return { success: false, error: "Export cancelled" };
      }

      // Export based on format
      let exportedPath = filePath;
      if (format.toLowerCase() === "excel") {
        exportedPath = await exportToExcel(data, filePath);
      } else {
        throw new Error(`Unsupported format: ${format}. Only Excel format is supported.`);
      }

      logger.info(`Report exported successfully: ${exportedPath}`);
      return {
        success: true,
        filePath: exportedPath,
      };
    } catch (error) {
      logger.error("Error exporting report:", error);
      throw error;
    }
  });

  // Preview report (export to temp file and open)
  ipcMain.handle("reports:preview", async (event, reportType, filterParams = {}) => {
    try {
      // Get data from the appropriate handler
      const handlerChannel = reportTypeMap[reportType];
      if (!handlerChannel) {
        throw new Error(`Unknown report type: ${reportType}`);
      }

      // Fetch data using direct query (same as reportViewHandlers)
      let query = getSQLQueryForReportType(reportType);
      if (!query) {
        throw new Error(`No query defined for report type: ${reportType}`);
      }

      // Apply date filters
      query = applyDateFilters(query, reportType, filterParams);

      const data = await database.query(query);

      if (!data || data.length === 0) {
        logger.warn(`Report preview skipped, no data for type: ${reportType}`);
        return {
          success: false,
          error: "Laporan tidak memiliki data untuk ditampilkan. Periksa kembali filter yang digunakan.",
          code: "NO_DATA",
        };
      }

      // Create temporary file path
      const tempDir = os.tmpdir();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const tempFilePath = path.join(
        tempDir,
        `rims_preview_${reportType}_${timestamp}.xlsx`
      );

      // Export to temporary file
      await exportToExcel(data, tempFilePath);

      // Open file with default application
      await shell.openPath(tempFilePath);
      logger.info(`Preview file opened: ${tempFilePath}`);
      
      return {
        success: true,
        filePath: tempFilePath,
      };
    } catch (error) {
      logger.error("Error previewing report:", error);
      throw error;
    }
  });

  // Apply date filters to query
  function applyDateFilters(query, reportType, filterParams) {
    const { period, dateFrom, dateTo } = filterParams || {};

    // If no filter or anytime, return original query
    if (!period || period === "anytime") {
      return query;
    }

    // Stock reports don't have date filters
    if (reportType === "stock" || 
        reportType === "stock-items" || 
        reportType === "stock-accessories" || 
        reportType === "stock-bundles" || 
        reportType === "stock-movements" || 
        reportType === "low-stock-alert" || 
        reportType === "stock-by-category") {
      return query;
    }
    
    // Determine date column based on report type
    let dateColumn = "transaction_date";
    if (reportType === "revenue-by-cashier") {
      dateColumn = "opening_date";
    } else if (reportType === "payments") {
      dateColumn = "payment_date";
    } else if (reportType === "sales-transactions") {
      dateColumn = "sale_date";
    } else if (reportType === "rental-transactions") {
      dateColumn = "rental_date";
    }

    // Build date condition based on period
    let dateCondition = "";

    if (period === "daily") {
      // Today's date
      const today = new Date().toISOString().split("T")[0];
      dateCondition = `date(${dateColumn}) = date('${today}')`;
    } else if (period === "monthly") {
      // Current month
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      dateCondition = `strftime('%Y-%m', ${dateColumn}) = '${year}-${month}'`;
    } else if (period === "custom" && dateFrom && dateTo) {
      // Custom date range
      dateCondition = `date(${dateColumn}) >= date('${dateFrom}') AND date(${dateColumn}) <= date('${dateTo}')`;
    }

    if (!dateCondition) {
      return query;
    }

    // For queries with UNION ALL (executive, finance), add WHERE to each subquery
    if (query.includes("UNION ALL") && reportType !== "payments") {
      // Split by UNION ALL and add WHERE clause to each part
      const parts = query.split("UNION ALL");
      const modifiedParts = parts.map((part, index) => {
        // Trim whitespace from part
        part = part.trim();
        // Check if this part ends with outer query structure (closing paren, ORDER BY, etc.)
        // If so, we need to extract just the SELECT part before processing
        const trimmedPart = part.trim();
        let outerQuerySuffix = "";
        const lastParenIndex = trimmedPart.lastIndexOf(')');
        const upperTrimmed = trimmedPart.toUpperCase();
        const hasOuterOrderBy = upperTrimmed.includes(') ORDER BY');
        if (hasOuterOrderBy && lastParenIndex > 0) {
          // This part includes outer query structure, extract it
          const selectPartEnd = trimmedPart.lastIndexOf(')');
          if (selectPartEnd > 0) {
            outerQuerySuffix = trimmedPart.substring(selectPartEnd);
            part = trimmedPart.substring(0, selectPartEnd).trim();
          }
        }
        
        // Determine date column based on part (rental_date or sale_date)
        let dateCol = "transaction_date";
        const upperPart = part.toUpperCase();
        if (upperPart.includes("RENTAL_DATE")) {
          dateCol = "rental_date";
        } else if (upperPart.includes("SALE_DATE")) {
          dateCol = "sale_date";
        }

        // Build date condition with correct column
        let partDateCondition = "";
        if (period === "daily") {
          const today = new Date().toISOString().split("T")[0];
          partDateCondition = `date(${dateCol}) = date('${today}')`;
        } else if (period === "monthly") {
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, "0");
          partDateCondition = `strftime('%Y-%m', ${dateCol}) = '${year}-${month}'`;
        } else if (period === "custom" && dateFrom && dateTo) {
          partDateCondition = `date(${dateCol}) >= date('${dateFrom}') AND date(${dateCol}) <= date('${dateTo}')`;
        }

        if (!partDateCondition) {
          // Return original part with outer query suffix if any
          return part + outerQuerySuffix;
        }

        // Find the FROM clause in each part
        const fromIndex = upperPart.indexOf(" FROM ");
        if (fromIndex === -1) {
          // This part doesn't have a FROM clause, might be outer query structure
          // Skip processing to avoid syntax errors
          return part + outerQuerySuffix;
        }

        // Check if this part already has WHERE
        const hasWhere = upperPart.includes(" WHERE ");
        const groupByIndex = upperPart.indexOf(" GROUP BY ");

        if (hasWhere) {
          // Add AND condition before GROUP BY
          if (groupByIndex > 0) {
            const beforeGroupBy = part.substring(0, groupByIndex);
            const afterGroupBy = part.substring(groupByIndex);
            return `${beforeGroupBy} AND ${partDateCondition} ${afterGroupBy}${outerQuerySuffix}`;
          } else {
            return `${part} AND ${partDateCondition}${outerQuerySuffix}`;
          }
        } else {
          // Add WHERE clause before GROUP BY
          if (groupByIndex > 0) {
            const beforeGroupBy = part.substring(0, groupByIndex);
            const afterGroupBy = part.substring(groupByIndex);
            return `${beforeGroupBy} WHERE ${partDateCondition} ${afterGroupBy}${outerQuerySuffix}`;
          } else {
            // No GROUP BY found in this part - find end of FROM/JOIN clauses
            // Find the last JOIN or FROM to insert WHERE after it
            const upperPart = part.toUpperCase();
            const lastJoinIndex = Math.max(
              upperPart.lastIndexOf(" LEFT JOIN "),
              upperPart.lastIndexOf(" RIGHT JOIN "),
              upperPart.lastIndexOf(" INNER JOIN "),
              upperPart.lastIndexOf(" FULL JOIN "),
              upperPart.lastIndexOf(" JOIN ")
            );
            const fromIndex = upperPart.lastIndexOf(" FROM ");
            
            let insertPos = -1;
            if (lastJoinIndex > fromIndex && lastJoinIndex > 0) {
              // Insert after last JOIN - find end of JOIN's ON clause
              const afterJoin = part.substring(lastJoinIndex);
              // Find the end of the ON clause (look for WHERE, GROUP BY, ORDER BY, or end)
              const onEndMatch = afterJoin.match(/\s+ON\s+[^WHERE\s]+(?:\s+AND\s+[^WHERE\s]+)*\s*(?=WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|$)/i);
              if (onEndMatch) {
                insertPos = lastJoinIndex + onEndMatch.index + onEndMatch[0].length;
              } else {
                // Fallback: insert after JOIN keyword
                const joinEndMatch = afterJoin.match(/JOIN\s+[^\s]+\s*(?:AS\s+[^\s]+\s*)?(?:ON\s+[^\s]+\s*)?/i);
                if (joinEndMatch) {
                  insertPos = lastJoinIndex + joinEndMatch.index + joinEndMatch[0].length;
                }
              }
            }
            
            if (insertPos === -1 && fromIndex > 0) {
              // Insert after FROM clause
              const afterFrom = part.substring(fromIndex);
              // Find end of table name/alias or JOIN
              const tableEndMatch = afterFrom.match(/FROM\s+[^\s]+(?:\s+(?:AS\s+)?[^\s]+)?\s*(?=WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|JOIN|$)/i);
              if (tableEndMatch) {
                insertPos = fromIndex + tableEndMatch.index + tableEndMatch[0].length;
              } else {
                // Simple fallback: after FROM keyword
                insertPos = fromIndex + 5; // " FROM ".length
              }
            }
            
            if (insertPos > 0) {
              const beforeWhere = part.substring(0, insertPos).trim();
              const afterWhere = part.substring(insertPos).trim();
              // Don't add WHERE if there's already a closing parenthesis or invalid syntax
              if (!afterWhere.trim().startsWith(')') && !afterWhere.trim().startsWith('ORDER BY')) {
                return `${beforeWhere} WHERE ${partDateCondition} ${afterWhere}${outerQuerySuffix}`;
              }
            }
            
            // Last resort: if we can't find a good place, skip this part
            // (better than creating invalid SQL)
            return part + outerQuerySuffix;
          }
        }
      });

      return modifiedParts.join(" UNION ALL ");
    } else {
      // For simple queries, add WHERE clause before ORDER BY, GROUP BY, HAVING, or at end of FROM/JOIN clauses
      const upperQuery = query.toUpperCase();
      const hasWhere = upperQuery.includes(" WHERE ");
      const orderByIndex = upperQuery.lastIndexOf(" ORDER BY ");
      const groupByIndex = upperQuery.lastIndexOf(" GROUP BY ");
      const havingIndex = upperQuery.lastIndexOf(" HAVING ");

      // Find the best insertion point: before GROUP BY, HAVING, or ORDER BY
      // WHERE must come before GROUP BY, so prioritize GROUP BY over ORDER BY
      let insertIndex = -1;
      if (groupByIndex > 0) {
        insertIndex = groupByIndex;
      } else if (havingIndex > 0) {
        insertIndex = havingIndex;
      } else if (orderByIndex > 0) {
        insertIndex = orderByIndex;
      }

      if (hasWhere) {
        // Add AND condition
        if (insertIndex > 0) {
          const beforeInsert = query.substring(0, insertIndex);
          const afterInsert = query.substring(insertIndex);
          return `${beforeInsert} AND ${dateCondition} ${afterInsert}`;
        } else {
          // No ORDER BY/GROUP BY/HAVING found, append at end
          return `${query} AND ${dateCondition}`;
        }
      } else {
        // Add WHERE clause
        if (insertIndex > 0) {
          const beforeInsert = query.substring(0, insertIndex);
          const afterInsert = query.substring(insertIndex);
          return `${beforeInsert} WHERE ${dateCondition} ${afterInsert}`;
        } else {
          // No ORDER BY/GROUP BY/HAVING found, find end of FROM/JOIN clauses
          // Use regex to find the position after the last FROM/JOIN clause
          const fromJoinPattern = /(?:FROM|JOIN)\s+[^\s]+\s*(?:AS\s+[^\s]+\s*)?(?:ON\s+[^WHERE\s]+(?:\s+AND\s+[^WHERE\s]+)*\s*)?/gi;
          let lastMatch = null;
          let match;
          while ((match = fromJoinPattern.exec(query)) !== null) {
            lastMatch = match;
          }
          
          if (lastMatch) {
            // Insert WHERE after the last FROM/JOIN match
            const insertPos = lastMatch.index + lastMatch[0].length;
            const beforeWhere = query.substring(0, insertPos).trim();
            const afterWhere = query.substring(insertPos).trim();
            return `${beforeWhere} WHERE ${dateCondition} ${afterWhere}`;
          } else {
            // Fallback: try to find FROM and insert after it
            const fromIndex = upperQuery.lastIndexOf(" FROM ");
            if (fromIndex > 0) {
              // Find end of FROM clause (before WHERE, GROUP BY, ORDER BY, or end of query)
              const afterFrom = query.substring(fromIndex);
              const endMatch = afterFrom.match(/\s+(WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|$)/i);
              if (endMatch) {
                const insertPos = fromIndex + endMatch.index;
                const beforeWhere = query.substring(0, insertPos).trim();
                const afterWhere = query.substring(insertPos).trim();
                return `${beforeWhere} WHERE ${dateCondition} ${afterWhere}`;
              }
            }
            // Last resort: append at end (may cause syntax error but better than nothing)
            return `${query} WHERE ${dateCondition}`;
          }
        }
      }
    }
  }

  function getSQLQueryForReportType(reportType) {
    // Map report types to shared query functions
    const queryMap = {
      transactions: reportQueries.getTransactionsViewQuery,
      "rental-transactions": reportQueries.getRentalTransactionsQuery,
      "sales-transactions": reportQueries.getSalesTransactionsQuery,
      "daily-revenue": reportQueries.getDailyRevenueQuery,
      "revenue-by-cashier": reportQueries.getRevenueByCashierQuery,
      payments: reportQueries.getPaymentsQuery,
      "stock-items": reportQueries.getStockItemsQuery,
      "stock-accessories": reportQueries.getStockAccessoriesQuery,
      "stock-bundles": reportQueries.getStockBundlesQuery,
      "stock-movements": reportQueries.getStockMovementsQuery,
      "low-stock-alert": reportQueries.getLowStockAlertQuery,
      "stock-by-category": reportQueries.getStockByCategoryQuery,
      // Legacy reports (for backward compatibility)
      executive: reportQueries.getDailyRevenueQuery,
      finance: reportQueries.getFinanceReportQuery,
      stock: reportQueries.getStockReportQuery,
    };

    // If report type exists in map, return the query
    if (queryMap[reportType]) {
      return queryMap[reportType]();
    }

    // Otherwise, return empty query
    return `SELECT * FROM (SELECT 1 WHERE 1=0)`;
  }

  async function exportToExcel(data, filePath) {
    if (!data || data.length === 0) {
      throw new Error("No data to export");
    }

    // Ensure file has .xlsx extension
    const xlsxPath = filePath.replace(/\.xlsx?$/, "") + ".xlsx";

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Laporan");

    // Get headers from first row
    const headers = Object.keys(data[0]);

    // Set column headers
    worksheet.columns = headers.map((header) => ({
      header: header,
      key: header,
      width: 15,
    }));

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Add data rows
    data.forEach((row) => {
      const rowData = {};
      headers.forEach((header) => {
        rowData[header] = row[header] !== null && row[header] !== undefined ? row[header] : "";
      });
      worksheet.addRow(rowData);
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column.header) {
        column.width = Math.max(column.header.length + 2, 12);
      }
    });

    // Write to file
    await workbook.xlsx.writeFile(xlsxPath);
    return xlsxPath;
  }
}

module.exports = setupReportExportHandlers;
