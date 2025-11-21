const { ipcMain, dialog, shell } = require("electron");
const fs = require("fs").promises;
const os = require("os");
const path = require("path");
const ExcelJS = require("exceljs");
const database = require("../helpers/database");
const logger = require("../helpers/logger");

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
    if (query.includes("UNION ALL")) {
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
    // Return the SQL query for each report type
    // These should match the queries in reportViewHandlers.js
    const queries = {
      // Transaction reports
      transactions: `
        SELECT 
          id,
          transaction_code,
          transaction_type,
          customer_id,
          customer_name,
          user_name,
          transaction_date,
          planned_return_date,
          actual_return_date,
          total_days,
          subtotal,
          deposit,
          tax,
          total_amount,
          paid_amount,
          payment_status,
          status,
          notes,
          cashier_session_id,
          cashier_session_code,
          created_at
        FROM (
          SELECT
            rt.id,
            rt.transaction_code,
            'rental' AS transaction_type,
            rt.customer_id,
            c.name AS customer_name,
            u.full_name AS user_name,
            rt.rental_date AS transaction_date,
            rt.planned_return_date,
            rt.actual_return_date,
            rt.total_days,
            rt.subtotal,
            rt.deposit,
            rt.tax,
            rt.total_amount,
            COALESCE(SUM(p.amount), 0) as paid_amount,
            CASE 
              WHEN COALESCE(SUM(p.amount), 0) >= rt.total_amount THEN 'paid'
              ELSE 'unpaid'
            END as payment_status,
            rt.status,
            rt.notes,
            rt.cashier_session_id,
            cs.session_code AS cashier_session_code,
            rt.created_at
          FROM rental_transactions rt
          LEFT JOIN customers c ON rt.customer_id = c.id
          LEFT JOIN users u ON rt.user_id = u.id
          LEFT JOIN cashier_sessions cs ON rt.cashier_session_id = cs.id
          LEFT JOIN payments p ON p.transaction_type = 'rental' AND p.transaction_id = rt.id
          GROUP BY rt.id
          
          UNION ALL
          
          SELECT
            st.id,
            st.transaction_code,
            'sale' AS transaction_type,
            st.customer_id,
            c.name AS customer_name,
            u.full_name AS user_name,
            st.sale_date AS transaction_date,
            NULL AS planned_return_date,
            NULL AS actual_return_date,
            NULL AS total_days,
            st.subtotal,
            NULL AS deposit,
            st.tax,
            st.total_amount,
            COALESCE(SUM(p.amount), 0) as paid_amount,
            CASE 
              WHEN COALESCE(SUM(p.amount), 0) >= st.total_amount THEN 'paid'
              ELSE 'unpaid'
            END as payment_status,
            COALESCE(st.status, 'pending') as status,
            st.notes,
            st.cashier_session_id,
            cs.session_code AS cashier_session_code,
            st.created_at
          FROM sales_transactions st
          LEFT JOIN customers c ON st.customer_id = c.id
          LEFT JOIN users u ON st.user_id = u.id
          LEFT JOIN cashier_sessions cs ON st.cashier_session_id = cs.id
          LEFT JOIN payments p ON p.transaction_type = 'sale' AND p.transaction_id = st.id
          GROUP BY st.id
        )
        ORDER BY transaction_date DESC
      `,
      "rental-transactions": `
        SELECT
          rt.id,
          rt.transaction_code,
          rt.customer_id,
          c.name AS customer_name,
          u.full_name AS user_name,
          rt.rental_date,
          rt.planned_return_date,
          rt.actual_return_date,
          rt.total_days,
          rt.subtotal,
          rt.deposit,
          rt.tax,
          rt.total_amount,
          COALESCE(SUM(p.amount), 0) as paid_amount,
          CASE 
            WHEN COALESCE(SUM(p.amount), 0) >= rt.total_amount THEN 'paid'
            ELSE 'unpaid'
          END as payment_status,
          rt.status,
          rt.notes,
          cs.session_code AS cashier_session_code,
          rt.created_at
        FROM rental_transactions rt
        LEFT JOIN customers c ON rt.customer_id = c.id
        LEFT JOIN users u ON rt.user_id = u.id
        LEFT JOIN cashier_sessions cs ON rt.cashier_session_id = cs.id
        LEFT JOIN payments p ON p.transaction_type = 'rental' AND p.transaction_id = rt.id
        GROUP BY rt.id
        ORDER BY rt.rental_date DESC
      `,
      "sales-transactions": `
        SELECT
          st.id,
          st.transaction_code,
          st.customer_id,
          c.name AS customer_name,
          u.full_name AS user_name,
          st.sale_date,
          st.subtotal,
          st.discount,
          st.tax,
          st.total_amount,
          COALESCE(SUM(p.amount), 0) as paid_amount,
          CASE 
            WHEN COALESCE(SUM(p.amount), 0) >= st.total_amount THEN 'paid'
            ELSE 'unpaid'
          END as payment_status,
          COALESCE(st.status, 'pending') as status,
          st.notes,
          cs.session_code AS cashier_session_code,
          st.created_at
        FROM sales_transactions st
        LEFT JOIN customers c ON st.customer_id = c.id
        LEFT JOIN users u ON st.user_id = u.id
        LEFT JOIN cashier_sessions cs ON st.cashier_session_id = cs.id
        LEFT JOIN payments p ON p.transaction_type = 'sale' AND p.transaction_id = st.id
        GROUP BY st.id
        ORDER BY st.sale_date DESC
      `,
      "daily-revenue": `
        SELECT
          date(transaction_date) AS revenue_date,
          COUNT(*) AS total_transactions,
          SUM(CASE WHEN transaction_type = 'rental' THEN 1 ELSE 0 END) AS rental_count,
          SUM(CASE WHEN transaction_type = 'sale' THEN 1 ELSE 0 END) AS sales_count,
          SUM(total_amount) AS total_revenue,
          SUM(CASE WHEN transaction_type = 'rental' THEN total_amount ELSE 0 END) AS rental_revenue,
          SUM(CASE WHEN transaction_type = 'sale' THEN total_amount ELSE 0 END) AS sales_revenue,
          SUM(paid_amount) AS total_paid,
          SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
          SUM(CASE WHEN payment_status = 'unpaid' THEN 1 ELSE 0 END) AS unpaid_count
        FROM (
          SELECT
            rt.rental_date AS transaction_date,
            'rental' AS transaction_type,
            rt.total_amount,
            COALESCE(SUM(p.amount), 0) as paid_amount,
            CASE 
              WHEN COALESCE(SUM(p.amount), 0) >= rt.total_amount THEN 'paid'
              ELSE 'unpaid'
            END as payment_status
          FROM rental_transactions rt
          LEFT JOIN payments p ON p.transaction_type = 'rental' AND p.transaction_id = rt.id
          GROUP BY rt.id
          
          UNION ALL
          
          SELECT
            st.sale_date AS transaction_date,
            'sale' AS transaction_type,
            st.total_amount,
            COALESCE(SUM(p.amount), 0) as paid_amount,
            CASE 
              WHEN COALESCE(SUM(p.amount), 0) >= st.total_amount THEN 'paid'
              ELSE 'unpaid'
            END as payment_status
          FROM sales_transactions st
          LEFT JOIN payments p ON p.transaction_type = 'sale' AND p.transaction_id = st.id
          GROUP BY st.id
        )
        GROUP BY date(transaction_date)
        ORDER BY revenue_date DESC
      `,
      "revenue-by-cashier": `
        SELECT
          cs.id AS cashier_session_id,
          cs.session_code,
          u.full_name AS cashier_name,
          u.username,
          date(cs.opening_date) AS session_date,
          cs.opening_balance,
          COALESCE(cs.closing_balance, 0) AS closing_balance,
          COALESCE(cs.expected_balance, cs.opening_balance) AS expected_balance,
          (COALESCE(cs.closing_balance, 0) - cs.opening_balance) AS actual_revenue,
          (COALESCE(cs.expected_balance, cs.opening_balance) - cs.opening_balance) AS expected_revenue,
          (COALESCE(cs.closing_balance, 0) - COALESCE(cs.expected_balance, cs.opening_balance)) AS difference,
          COUNT(DISTINCT rt.id) AS rental_count,
          COUNT(DISTINCT st.id) AS sales_count,
          COALESCE(SUM(rt.total_amount), 0) AS rental_total,
          COALESCE(SUM(st.total_amount), 0) AS sales_total,
          COALESCE(SUM(rt.total_amount), 0) + COALESCE(SUM(st.total_amount), 0) AS total_revenue,
          cs.status,
          cs.opening_date,
          cs.closing_date
        FROM cashier_sessions cs
        LEFT JOIN users u ON cs.user_id = u.id
        LEFT JOIN rental_transactions rt ON rt.cashier_session_id = cs.id
        LEFT JOIN sales_transactions st ON st.cashier_session_id = cs.id
        GROUP BY cs.id
        ORDER BY cs.opening_date DESC
      `,
      payments: `
        SELECT
          p.id,
          p.transaction_type,
          p.transaction_id,
          COALESCE(rt.transaction_code, st.transaction_code) AS transaction_code,
          COALESCE(c1.name, c2.name) AS customer_name,
          p.payment_date,
          p.amount,
          p.payment_method,
          p.reference_number,
          u.full_name AS user_name,
          p.notes,
          COALESCE(cs1.session_code, cs2.session_code) AS cashier_session_code
        FROM payments p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN rental_transactions rt ON p.transaction_type = 'rental' AND p.transaction_id = rt.id
        LEFT JOIN sales_transactions st ON p.transaction_type = 'sale' AND p.transaction_id = st.id
        LEFT JOIN customers c1 ON rt.customer_id = c1.id
        LEFT JOIN customers c2 ON st.customer_id = c2.id
        LEFT JOIN cashier_sessions cs1 ON rt.cashier_session_id = cs1.id
        LEFT JOIN cashier_sessions cs2 ON st.cashier_session_id = cs2.id
        ORDER BY p.payment_date DESC
      `,
      // Stock reports
      "stock-items": `
        SELECT
          i.id,
          i.code,
          i.name,
          c.name AS category_name,
          i.stock_quantity,
          i.available_quantity,
          (i.stock_quantity - i.available_quantity) AS rented_quantity,
          i.rental_price_per_day,
          i.sale_price,
          i.min_stock_alert,
          i.is_active,
          (
            SELECT sm.created_at 
            FROM stock_movements sm 
            WHERE sm.item_id = i.id 
            ORDER BY sm.created_at DESC 
            LIMIT 1
          ) AS last_movement_date,
          (
            SELECT COUNT(*) 
            FROM stock_movements sm 
            WHERE sm.item_id = i.id
          ) AS total_movements,
          i.created_at,
          i.updated_at
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        ORDER BY i.name ASC
      `,
      "stock-accessories": `
        SELECT
          a.id,
          a.code,
          a.name,
          'Aksesoris' AS category_name,
          a.stock_quantity,
          a.available_quantity,
          0 AS rented_quantity,
          a.rental_price_per_day,
          a.sale_price,
          a.min_stock_alert,
          a.is_active,
          (
            SELECT sm.created_at 
            FROM stock_movements sm 
            WHERE sm.accessory_id = a.id 
            ORDER BY sm.created_at DESC 
            LIMIT 1
          ) AS last_movement_date,
          (
            SELECT COUNT(*) 
            FROM stock_movements sm 
            WHERE sm.accessory_id = a.id
          ) AS total_movements,
          a.created_at,
          a.updated_at
        FROM accessories a
        ORDER BY a.name ASC
      `,
      "stock-bundles": `
        SELECT
          b.id,
          b.code,
          b.name,
          'Paket/Bundle' AS category_name,
          b.stock_quantity,
          b.available_quantity,
          0 AS rented_quantity,
          b.rental_price_per_day,
          NULL AS sale_price,
          0 AS min_stock_alert,
          b.is_active,
          NULL AS last_movement_date,
          0 AS total_movements,
          b.created_at,
          b.updated_at
        FROM bundles b
        ORDER BY b.name ASC
      `,
      "stock-movements": `
        SELECT
          sm.id,
          COALESCE(i.name, a.name, b.name) AS product_name,
          COALESCE(i.code, a.code, b.code) AS product_code,
          CASE 
            WHEN sm.item_id IS NOT NULL THEN 'Item'
            WHEN sm.accessory_id IS NOT NULL THEN 'Aksesoris'
            WHEN sm.bundle_id IS NOT NULL THEN 'Paket/Bundle'
            ELSE 'Unknown'
          END AS product_type,
          sm.movement_type,
          sm.reference_type,
          sm.reference_id,
          sm.quantity,
          sm.stock_before,
          sm.stock_after,
          u.full_name AS user_name,
          sm.notes,
          sm.created_at
        FROM stock_movements sm
        LEFT JOIN items i ON sm.item_id = i.id
        LEFT JOIN accessories a ON sm.accessory_id = a.id
        LEFT JOIN bundles b ON sm.bundle_id = b.id
        LEFT JOIN users u ON sm.user_id = u.id
        ORDER BY sm.created_at DESC
      `,
      "low-stock-alert": `
        SELECT
          id,
          code,
          name,
          category_name,
          'item' AS product_type,
          stock_quantity,
          available_quantity,
          min_stock_alert,
          (min_stock_alert - stock_quantity) AS shortage,
          is_active
        FROM (
          SELECT
            i.id,
            i.code,
            i.name,
            c.name AS category_name,
            i.stock_quantity,
            i.available_quantity,
            i.min_stock_alert,
            i.is_active
          FROM items i
          LEFT JOIN categories c ON i.category_id = c.id
          WHERE i.is_active = 1
            AND i.stock_quantity <= i.min_stock_alert
            AND i.min_stock_alert > 0
          
          UNION ALL
          
          SELECT
            a.id,
            a.code,
            a.name,
            'Aksesoris' AS category_name,
            a.stock_quantity,
            a.available_quantity,
            a.min_stock_alert,
            a.is_active
          FROM accessories a
          WHERE a.is_active = 1
            AND a.stock_quantity <= a.min_stock_alert
            AND a.min_stock_alert > 0
        )
        ORDER BY shortage DESC, name ASC
      `,
      "stock-by-category": `
        SELECT
          c.id AS category_id,
          c.name AS category_name,
          COUNT(DISTINCT i.id) AS item_count,
          SUM(i.stock_quantity) AS total_stock,
          SUM(i.available_quantity) AS total_available,
          SUM(i.stock_quantity - i.available_quantity) AS total_rented,
          AVG(i.rental_price_per_day) AS avg_rental_price,
          AVG(i.sale_price) AS avg_sale_price,
          SUM(CASE WHEN i.stock_quantity <= i.min_stock_alert AND i.min_stock_alert > 0 THEN 1 ELSE 0 END) AS low_stock_count
        FROM categories c
        LEFT JOIN items i ON i.category_id = c.id AND i.is_active = 1
        GROUP BY c.id, c.name
        HAVING item_count > 0
        ORDER BY total_stock DESC
      `,
      // Legacy reports (for backward compatibility)
      executive: `
        SELECT
          date(transaction_date) AS report_date,
          COUNT(*) AS total_transactions,
          SUM(CASE WHEN transaction_type = 'rental' THEN 1 ELSE 0 END) AS rental_count,
          SUM(CASE WHEN transaction_type = 'sale' THEN 1 ELSE 0 END) AS sales_count,
          SUM(total_amount) AS total_revenue,
          SUM(paid_amount) AS total_paid,
          SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_count
        FROM (
          SELECT
            rt.rental_date AS transaction_date,
            'rental' AS transaction_type,
            rt.total_amount,
            COALESCE(SUM(p.amount), 0) as paid_amount,
            CASE 
              WHEN COALESCE(SUM(p.amount), 0) >= rt.total_amount THEN 'paid'
              ELSE 'unpaid'
            END as payment_status
          FROM rental_transactions rt
          LEFT JOIN payments p ON p.transaction_type = 'rental' AND p.transaction_id = rt.id
          GROUP BY rt.id
          
          UNION ALL
          
          SELECT
            st.sale_date AS transaction_date,
            'sale' AS transaction_type,
            st.total_amount,
            COALESCE(SUM(p.amount), 0) as paid_amount,
            CASE 
              WHEN COALESCE(SUM(p.amount), 0) >= st.total_amount THEN 'paid'
              ELSE 'unpaid'
            END as payment_status
          FROM sales_transactions st
          LEFT JOIN payments p ON p.transaction_type = 'sale' AND p.transaction_id = st.id
          GROUP BY st.id
        )
        GROUP BY date(transaction_date)
        ORDER BY report_date DESC
      `,
      finance: `
        SELECT
          date(transaction_date) AS report_date,
          SUM(total_amount) AS total_revenue,
          SUM(paid_amount) AS total_paid,
          SUM(total_amount - paid_amount) AS total_unpaid,
          COUNT(*) AS total_transactions,
          SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
          SUM(CASE WHEN payment_status = 'unpaid' THEN 1 ELSE 0 END) AS unpaid_count
        FROM (
          SELECT
            rt.rental_date AS transaction_date,
            rt.total_amount,
            COALESCE(SUM(p.amount), 0) as paid_amount,
            CASE 
              WHEN COALESCE(SUM(p.amount), 0) >= rt.total_amount THEN 'paid'
              ELSE 'unpaid'
            END as payment_status
          FROM rental_transactions rt
          LEFT JOIN payments p ON p.transaction_type = 'rental' AND p.transaction_id = rt.id
          GROUP BY rt.id
          
          UNION ALL
          
          SELECT
            st.sale_date AS transaction_date,
            st.total_amount,
            COALESCE(SUM(p.amount), 0) as paid_amount,
            CASE 
              WHEN COALESCE(SUM(p.amount), 0) >= st.total_amount THEN 'paid'
              ELSE 'unpaid'
            END as payment_status
          FROM sales_transactions st
          LEFT JOIN payments p ON p.transaction_type = 'sale' AND p.transaction_id = st.id
          GROUP BY st.id
        )
        GROUP BY date(transaction_date)
        ORDER BY report_date DESC
      `,
      stock: `
        SELECT
          i.id,
          i.code,
          i.name,
          c.name AS category_name,
          'item' AS product_type,
          i.stock_quantity,
          i.available_quantity,
          (i.stock_quantity - i.available_quantity) AS rented_quantity,
          i.rental_price_per_day,
          i.sale_price,
          i.min_stock_alert,
          i.is_active,
          (
            SELECT sm.created_at 
            FROM stock_movements sm 
            WHERE sm.item_id = i.id 
            ORDER BY sm.created_at DESC 
            LIMIT 1
          ) AS last_movement_date,
          (
            SELECT COUNT(*) 
            FROM stock_movements sm 
            WHERE sm.item_id = i.id
          ) AS total_movements,
          i.created_at,
          i.updated_at
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        
        UNION ALL
        
        SELECT
          a.id,
          a.code,
          a.name,
          'Aksesoris' AS category_name,
          'accessory' AS product_type,
          a.stock_quantity,
          a.available_quantity,
          0 AS rented_quantity,
          a.rental_price_per_day,
          a.sale_price,
          a.min_stock_alert,
          a.is_active,
          (
            SELECT sm.created_at 
            FROM stock_movements sm 
            WHERE sm.accessory_id = a.id 
            ORDER BY sm.created_at DESC 
            LIMIT 1
          ) AS last_movement_date,
          (
            SELECT COUNT(*) 
            FROM stock_movements sm 
            WHERE sm.accessory_id = a.id
          ) AS total_movements,
          a.created_at,
          a.updated_at
        FROM accessories a
        
        UNION ALL
        
        SELECT
          b.id,
          b.code,
          b.name,
          'Paket/Bundle' AS category_name,
          'bundle' AS product_type,
          b.stock_quantity,
          b.available_quantity,
          0 AS rented_quantity,
          b.rental_price_per_day,
          NULL AS sale_price,
          0 AS min_stock_alert,
          b.is_active,
          NULL AS last_movement_date,
          0 AS total_movements,
          b.created_at,
          b.updated_at
        FROM bundles b
        
        ORDER BY product_type, name ASC
      `,
    };

    // If report type exists in queries, return it
    if (queries[reportType]) {
      return queries[reportType];
    }

    // Otherwise, try to get from reportViewHandlers
    // For now, return a simple query
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

