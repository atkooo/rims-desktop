<template>
    <div class="cashier-transaction-page">
        <!-- Transaction Type Selector -->
        <div class="transaction-type-selector">
            <div class="selector-container">
                <h3 class="selector-title">Jenis Transaksi</h3>
                <div class="type-buttons">
                    <button class="type-button" :class="{ active: transactionMode === 'sale' }"
                        @click="setTransactionMode('sale')">
                        <span class="button-icon">💰</span>
                        <span class="button-text">Penjualan</span>
                    </button>
                    <button class="type-button" :class="{ active: transactionMode === 'rental' }"
                        @click="setTransactionMode('rental')">
                        <span class="button-icon">📦</span>
                        <span class="button-text">Rental</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Sale Transaction -->
        <div v-show="transactionMode === 'sale'" class="transaction-content">
            <CashierSalePage ref="salePageRef" />
        </div>

        <!-- Rental Transaction -->
        <div v-show="transactionMode === 'rental'" class="transaction-content">
            <CashierRentalPage ref="rentalPageRef" />
        </div>
    </div>
</template>

<script>
import { ref } from "vue";
import CashierSalePage from "./CashierSalePage.vue";
import CashierRentalPage from "./CashierRentalPage.vue";

export default {
    name: "CashierTransactionPage",
    components: {
        CashierSalePage,
        CashierRentalPage,
    },
    setup() {
        const transactionMode = ref("sale");
        const salePageRef = ref(null);
        const rentalPageRef = ref(null);

        const setTransactionMode = (mode) => {
            transactionMode.value = mode;
        };

        return {
            transactionMode,
            setTransactionMode,
            salePageRef,
            rentalPageRef,
        };
    },
};
</script>

<style scoped>
.cashier-transaction-page {
    display: flex;
    flex-direction: column;
    height: 100%;
}

/* Transaction Type Selector */
.transaction-type-selector {
    background: white;
    border-bottom: 2px solid #e5e7eb;
    padding: 1.5rem 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.selector-container {
    max-width: 1400px;
    margin: 0 auto;
}

.selector-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 1rem 0;
}

.type-buttons {
    display: flex;
    gap: 1rem;
}

.type-button {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    background: #f9fafb;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s ease;
}

.type-button:hover {
    border-color: #4f46e5;
    color: #4f46e5;
    background: rgba(79, 70, 229, 0.05);
}

.type-button.active {
    background: #4f46e5;
    border-color: #4f46e5;
    color: white;
    font-weight: 600;
}

.button-icon {
    font-size: 1.25rem;
}

.button-text {
    font-weight: 500;
}

/* Transaction Content */
.transaction-content {
    flex: 1;
    overflow-y: auto;
}
</style>
