<template>
    <div class="cashier-history-page">
        <!-- Transaction Type Selector -->
        <div class="history-type-selector">
            <div class="selector-container">
                <h3 class="selector-title">Tipe Transaksi</h3>
                <div class="type-buttons">
                    <button class="type-button" :class="{ active: historyMode === 'sales' }"
                        @click="setHistoryMode('sales')">
                        <span class="button-icon">💰</span>
                        <span class="button-text">Penjualan</span>
                    </button>
                    <button class="type-button" :class="{ active: historyMode === 'rentals' }"
                        @click="setHistoryMode('rentals')">
                        <span class="button-icon">📦</span>
                        <span class="button-text">Rental</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Sales Transactions -->
        <div v-show="historyMode === 'sales'" class="history-content">
            <CashierSalesTransactionsView ref="salesViewRef" />
        </div>

        <!-- Rental Transactions -->
        <div v-show="historyMode === 'rentals'" class="history-content">
            <CashierRentalsTransactionsView ref="rentalsViewRef" />
        </div>
    </div>
</template>

<script>
import { ref } from "vue";
import CashierSalesTransactionsView from "./CashierSalesTransactionsView.vue";
import CashierRentalsTransactionsView from "./CashierRentalsTransactionsView.vue";

export default {
    name: "CashierTransactionsHistoryPage",
    components: {
        CashierSalesTransactionsView,
        CashierRentalsTransactionsView,
    },
    setup() {
        const historyMode = ref("sales");
        const salesViewRef = ref(null);
        const rentalsViewRef = ref(null);

        const setHistoryMode = (mode) => {
            historyMode.value = mode;
        };

        return {
            historyMode,
            setHistoryMode,
            salesViewRef,
            rentalsViewRef,
        };
    },
};
</script>

<style scoped>
.cashier-history-page {
    display: flex;
    flex-direction: column;
    height: 100%;
}

/* History Type Selector */
.history-type-selector {
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

/* History Content */
.history-content {
    flex: 1;
    overflow-y: auto;
}
</style>
