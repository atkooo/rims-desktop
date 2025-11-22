import { invoke } from '@/services/ipc';

/**
 * Sync rental transaction to sync service
 */
export async function syncRentalTransaction(transactionId) {
  try {
    const result = await invoke('sync:rental-transaction', transactionId);
    return result;
  } catch (error) {
    console.error('Error syncing rental transaction:', error);
    throw error;
  }
}

/**
 * Sync sales transaction to sync service
 */
export async function syncSalesTransaction(transactionId) {
  try {
    const result = await invoke('sync:sales-transaction', transactionId);
    return result;
  } catch (error) {
    console.error('Error syncing sales transaction:', error);
    throw error;
  }
}

/**
 * Sync payment to sync service
 */
export async function syncPayment(paymentId) {
  try {
    const result = await invoke('sync:payment', paymentId);
    return result;
  } catch (error) {
    console.error('Error syncing payment:', error);
    throw error;
  }
}

/**
 * Sync stock movement to sync service
 */
export async function syncStockMovement(movementId) {
  try {
    const result = await invoke('sync:stock-movement', movementId);
    return result;
  } catch (error) {
    console.error('Error syncing stock movement:', error);
    throw error;
  }
}

/**
 * Sync all pending transactions
 */
export async function syncAllPending() {
  try {
    const result = await invoke('sync:all-pending');
    return result;
  } catch (error) {
    console.error('Error syncing all pending:', error);
    throw error;
  }
}

/**
 * Check sync service status
 */
export async function checkSyncServiceStatus() {
  try {
    const result = await invoke('sync:check-status');
    return result;
  } catch (error) {
    console.error('Error checking sync service status:', error);
    throw error;
  }
}

