import { computed } from "vue";
import { ITEM_TYPE } from "@shared/constants";

/**
 * Composable untuk helper functions terkait tipe item
 */
export function useItemType() {
  /**
   * Cek apakah item bisa digunakan untuk transaksi SALE
   * @param {string} itemType - Tipe item (RENTAL, SALE, BOTH)
   * @returns {boolean}
   */
  const canBeSold = (itemType) => {
    return itemType === ITEM_TYPE.SALE || itemType === ITEM_TYPE.BOTH;
  };

  /**
   * Cek apakah item bisa digunakan untuk transaksi RENTAL
   * @param {string} itemType - Tipe item (RENTAL, SALE, BOTH)
   * @returns {boolean}
   */
  const canBeRented = (itemType) => {
    return itemType === ITEM_TYPE.RENTAL || itemType === ITEM_TYPE.BOTH;
  };

  /**
   * Get availability flags berdasarkan tipe item
   * @param {string} itemType - Tipe item (RENTAL, SALE, BOTH)
   * @returns {{is_available_for_rent: boolean, is_available_for_sale: boolean}}
   */
  const getAvailabilityByType = (itemType) => {
    if (itemType === ITEM_TYPE.RENTAL) {
      return {
        is_available_for_rent: true,
        is_available_for_sale: false,
      };
    } else if (itemType === ITEM_TYPE.SALE) {
      return {
        is_available_for_rent: false,
        is_available_for_sale: true,
      };
    } else if (itemType === ITEM_TYPE.BOTH) {
      return {
        is_available_for_rent: true,
        is_available_for_sale: true,
      };
    }
    // Default untuk backward compatibility
    return {
      is_available_for_rent: true,
      is_available_for_sale: false,
    };
  };

  /**
   * Filter items berdasarkan tipe transaksi
   * @param {Array} items - Array of items
   * @param {string} transactionType - Tipe transaksi (SALE atau RENTAL)
   * @returns {Array} Filtered items
   */
  const filterItemsByTransactionType = (items, transactionType) => {
    if (!transactionType) return items;
    
    if (transactionType === "SALE") {
      return items.filter(
        (item) => item.type === ITEM_TYPE.SALE || item.type === ITEM_TYPE.BOTH
      );
    } else if (transactionType === "RENTAL") {
      return items.filter(
        (item) => item.type === ITEM_TYPE.RENTAL || item.type === ITEM_TYPE.BOTH
      );
    }
    return items;
  };

  return {
    canBeSold,
    canBeRented,
    getAvailabilityByType,
    filterItemsByTransactionType,
  };
}

