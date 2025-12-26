const supabase = require("../config/supabase");
const logger = require("../../helpers/logger");

const MAX_RETRY_ATTEMPTS = parseInt(process.env.MAX_RETRY_ATTEMPTS || "3");
const RETRY_DELAY_MS = parseInt(process.env.RETRY_DELAY_MS || "1000");

const SYNC_STATUS_SYNCED = 1;
const SUPABASE_NOT_FOUND_ERROR = "PGRST116";

const PAYMENT_TABLE_MAP = {
  rental: "rental_payments",
  sale: "sales_payments",
  sales: "sales_payments",
};

function getPaymentTable(transactionType) {
  if (!transactionType) return null;
  const normalizedType = `${transactionType}`.trim().toLowerCase();
  return PAYMENT_TABLE_MAP[normalizedType] || null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncTransaction(data, config) {
  const { transaction, details } = data;
  const { transactionTable, detailsTable, foreignKey, transactionType } = config;

  try {
    if (!transaction || !transaction.transaction_code) {
      throw new Error("Transaction code is required");
    }

    const { data: existing, error: checkError } = await supabase
      .from(transactionTable)
      .select("id")
      .eq("transaction_code", transaction.transaction_code)
      .single();

    if (checkError && checkError.code !== SUPABASE_NOT_FOUND_ERROR) {
      throw checkError;
    }

    let transactionId;

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from(transactionTable)
        .update({
          ...transaction,
          is_sync: SYNC_STATUS_SYNCED,
          updated_at: new Date().toISOString(),
        })
        .eq("transaction_code", transaction.transaction_code)
        .select()
        .single();

      if (updateError) throw updateError;
      transactionId = updated.id;
      logger.info(`Updated ${transactionType} transaction: ${transaction.transaction_code}`);
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from(transactionTable)
        .insert({
          ...transaction,
          is_sync: SYNC_STATUS_SYNCED,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      transactionId = inserted.id;
      logger.info(`Inserted ${transactionType} transaction: ${transaction.transaction_code}`);
    }

    if (details && Array.isArray(details) && details.length > 0) {
      await supabase.from(detailsTable).delete().eq(foreignKey, transactionId);

      const detailsToInsert = details.map((detail) => ({
        ...detail,
        [foreignKey]: transactionId,
        is_sync: SYNC_STATUS_SYNCED,
      }));

      const { error: detailsError } = await supabase.from(detailsTable).insert(detailsToInsert);

      if (detailsError) throw detailsError;
      logger.info(`Synced ${details.length} ${transactionType} transaction details`);
    }

    return { success: true, transactionId };
  } catch (error) {
    logger.error(`Error syncing ${transactionType} transaction:`, error);
    throw error;
  }
}

async function syncRentalTransaction(data) {
  return syncTransaction(data, {
    transactionTable: "rental_transactions",
    detailsTable: "rental_transaction_details",
    foreignKey: "rental_transaction_id",
    transactionType: "rental",
  });
}

async function syncSalesTransaction(data) {
  return syncTransaction(data, {
    transactionTable: "sales_transactions",
    detailsTable: "sales_transaction_details",
    foreignKey: "sales_transaction_id",
    transactionType: "sales",
  });
}

async function syncPayment(data) {
  try {
    if (!data.transaction_type || !data.transaction_id) {
      throw new Error("Transaction type and transaction_id are required");
    }

    const paymentTable = getPaymentTable(data.transaction_type);
    if (!paymentTable) {
      throw new Error(`Unsupported transaction type: ${data.transaction_type}`);
    }

    const paymentPayload = { ...data };
    delete paymentPayload.transaction_type;

    let query = supabase
      .from(paymentTable)
      .select("id")
      .eq("transaction_id", paymentPayload.transaction_id);

    if (paymentPayload.payment_date) {
      query = query.eq("payment_date", paymentPayload.payment_date);
    }

    if (paymentPayload.amount !== undefined && paymentPayload.amount !== null) {
      query = query.eq("amount", paymentPayload.amount);
    }

    if (paymentPayload.payment_method) {
      query = query.eq("payment_method", paymentPayload.payment_method);
    }

    if (paymentPayload.reference_number) {
      query = query.eq("reference_number", paymentPayload.reference_number);
    }

    const { data: existing, error: checkError } = await query.limit(1).maybeSingle();

    if (checkError) throw checkError;

    const syncPayload = {
      ...paymentPayload,
      is_sync: SYNC_STATUS_SYNCED,
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from(paymentTable)
        .update(syncPayload)
        .eq("id", existing.id);

      if (updateError) throw updateError;
      logger.info(
        `Updated payment for ${data.transaction_type} transaction ${data.transaction_id}`,
      );
    } else {
      const { error: insertError } = await supabase.from(paymentTable).insert(syncPayload);

      if (insertError) throw insertError;
      logger.info(
        `Inserted payment for ${data.transaction_type} transaction ${data.transaction_id}`,
      );
    }

    return { success: true };
  } catch (error) {
    logger.error("Error syncing payment:", error);
    throw error;
  }
}

async function syncStockMovement(data) {
  try {
    if (!data.movement_type || !data.quantity) {
      throw new Error("Movement type and quantity are required");
    }

    const { data: inserted, error: insertError } = await supabase
      .from("stock_movements")
      .insert({
        ...data,
        is_sync: SYNC_STATUS_SYNCED,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    logger.info(`Inserted stock movement: ${inserted.id}`);

    return { success: true, movementId: inserted.id };
  } catch (error) {
    logger.error("Error syncing stock movement:", error);
    throw error;
  }
}

async function withRetry(fn, maxAttempts = MAX_RETRY_ATTEMPTS) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        logger.warn(`Sync attempt ${attempt} failed, retrying...`, error.message);
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }
  throw lastError;
}

function parseIsActive(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value === true;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  return false;
}

async function getActivationData(machineId) {
  if (!machineId) {
    throw new Error("Machine ID is required");
  }

  const trimmedMachineId = machineId.trim();

  const { data, error } = await supabase
    .from("activations")
    .select("is_active")
    .eq("machine_id", trimmedMachineId)
    .single();

  return { data, error, trimmedMachineId };
}

async function checkActivationStatus(machineId) {
  try {
    const { data, error, trimmedMachineId } = await getActivationData(machineId);

    if (error) {
      if (error.code === SUPABASE_NOT_FOUND_ERROR) {
        logger.warn(`Activation not found: ${trimmedMachineId}`);
        return {
          isActive: false,
          machineId: trimmedMachineId,
          error: "activation_not_found",
        };
      }
      throw error;
    }

    const isActive = parseIsActive(data.is_active);
    logger.info(
      `Activation: ${isActive ? "ACTIVE" : "INACTIVE"} (${trimmedMachineId})`,
    );
    return {
      isActive,
      machineId: trimmedMachineId,
    };
  } catch (error) {
    logger.error("Error checking activation status:", error);
    throw error;
  }
}

async function verifyActivation(machineId) {
  try {
    const { data, error, trimmedMachineId } = await getActivationData(machineId);

    if (error) {
      if (error.code === SUPABASE_NOT_FOUND_ERROR) {
        return {
          success: false,
          error: "activation_not_found",
          message: "Aktivasi tidak ditemukan",
        };
      }
      throw error;
    }

    const isActive = parseIsActive(data.is_active);
    if (!isActive) {
      return {
        success: false,
        error: "activation_inactive",
        message: "Aktivasi tidak aktif",
      };
    }

    return { success: true, message: "Aktivasi berhasil diverifikasi" };
  } catch (error) {
    logger.error("Error verifying activation:", error);
    return {
      success: false,
      error: "verification_failed",
      message: error.message,
    };
  }
}

module.exports = {
  syncRentalTransaction: (data) => withRetry(() => syncRentalTransaction(data)),
  syncSalesTransaction: (data) => withRetry(() => syncSalesTransaction(data)),
  syncPayment: (data) => withRetry(() => syncPayment(data)),
  syncStockMovement: (data) => withRetry(() => syncStockMovement(data)),
  checkActivationStatus: (machineId) => withRetry(() => checkActivationStatus(machineId)),
  verifyActivation: (machineId) => withRetry(() => verifyActivation(machineId)),
};
