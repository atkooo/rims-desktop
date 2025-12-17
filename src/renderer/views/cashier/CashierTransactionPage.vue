<template>
    <div class="cashier-transaction-page">
        <!-- Transaction Type Selector -->
        <div class="transaction-type-selector" :class="{ collapsed: isCollapsed }">
            <div class="selector-container">
                <div class="selector-header">
                    <h3 class="selector-title">Jenis Transaksi</h3>
                </div>
                <div v-show="!isCollapsed" class="type-buttons">
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
        <div v-if="transactionMode === 'sale'" class="transaction-content" :key="'sale-' + saleKey">
            <CashierSalePage ref="salePageRef" />
        </div>

        <!-- Rental Transaction -->
        <div v-if="transactionMode === 'rental'" class="transaction-content" :key="'rental-' + rentalKey">
            <CashierRentalPage ref="rentalPageRef" />
        </div>
    </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from "vue";
import CashierSalePage from "./CashierSalePage.vue";
import CashierRentalPage from "./CashierRentalPage.vue";
import Icon from "@/components/ui/Icon.vue";
import { eventBus } from "@/utils/eventBus";

export default {
    name: "CashierTransactionPage",
    components: {
        CashierSalePage,
        CashierRentalPage,
        Icon,
    },
    setup() {
        const transactionMode = ref("sale");
        const salePageRef = ref(null);
        const rentalPageRef = ref(null);
        const saleKey = ref(0);
        const rentalKey = ref(0);
        
        // Load collapsed state from localStorage (same key as parent)
        const STORAGE_KEY = "cashier:headerCollapsed";
        const loadCollapsedState = () => {
            try {
                const stored = window.localStorage?.getItem(STORAGE_KEY);
                return stored === "true";
            } catch (error) {
                console.warn("Error loading collapsed state:", error);
                return false;
            }
        };
        
        const isCollapsed = ref(loadCollapsedState());

        const setTransactionMode = (mode) => {
            // Force recreate component dengan mengubah key untuk reset form
            if (mode === "sale") {
                saleKey.value += 1;
            } else if (mode === "rental") {
                rentalKey.value += 1;
            }
            transactionMode.value = mode;
        };

        const handleHeaderToggle = (collapsed) => {
            isCollapsed.value = collapsed;
        };

        onMounted(() => {
            // Listen for header toggle events from CashierLayout
            eventBus.on("cashier:headerToggle", handleHeaderToggle);
            // Also sync with current state from parent (in case event was already emitted)
            const currentState = loadCollapsedState();
            if (currentState !== isCollapsed.value) {
                isCollapsed.value = currentState;
            }
        });

        onBeforeUnmount(() => {
            eventBus.off("cashier:headerToggle", handleHeaderToggle);
        });

        return {
            transactionMode,
            setTransactionMode,
            salePageRef,
            rentalPageRef,
            saleKey,
            rentalKey,
            isCollapsed,
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
    transition: padding 0.3s ease;
}

.transaction-type-selector.collapsed {
    padding: 0.75rem 2rem;
}

.selector-container {
    max-width: 1400px;
    margin: 0 auto;
}

.selector-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.transaction-type-selector:not(.collapsed) .selector-header {
    margin-bottom: 1rem;
}

.transaction-type-selector.collapsed .selector-header {
    margin-bottom: 0;
}

.selector-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0;
}

.collapse-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s ease;
}

.collapse-toggle:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    color: #4f46e5;
}

.type-buttons {
    display: flex;
    gap: 1rem;
    transition: opacity 0.3s ease, max-height 0.3s ease;
    overflow: hidden;
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
