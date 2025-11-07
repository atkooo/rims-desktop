<template>
    <div class="dashboard">
        <!-- Summary Cards -->
        <div class="summary-cards">
            <div class="card">
                <h3>Pendapatan Hari Ini</h3>
                <p class="amount">{{ formatCurrency(todayIncome) }}</p>
            </div>
            <div class="card">
                <h3>Total Transaksi Hari Ini</h3>
                <p class="amount">{{ todayTransactions }}</p>
            </div>
            <div class="card">
                <h3>Item Tersedia</h3>
                <p class="amount">{{ availableItems }}</p>
            </div>
            <div class="card">
                <h3>Item Disewa</h3>
                <p class="amount">{{ rentedItems }}</p>
            </div>
        </div>

        <!-- Recent Transactions -->
        <div class="section">
            <div class="section-header">
                <h2>Transaksi Terbaru</h2>
                <AppButton variant="primary" @click="$router.push('/transactions')">
                    Lihat Semua
                </AppButton>
            </div>

            <DataTable :columns="transactionColumns" :items="recentTransactions" :loading="transactionsLoading" />
        </div>

        <!-- Popular Items -->
        <div class="section">
            <div class="section-header">
                <h2>Item Populer</h2>
                <AppButton variant="primary" @click="$router.push('/items')">
                    Kelola Item
                </AppButton>
            </div>

            <DataTable :columns="itemColumns" :items="popularItems" :loading="itemsLoading" />
        </div>
    </div>
</template>

<script>
import { onMounted } from 'vue'
import { useTransactionStore } from '../store/transactions'
import { useItemStore } from '../store/items'
import AppButton from '../components/AppButton.vue'
import DataTable from '../components/DataTable.vue'

export default {
    name: 'Dashboard',
    components: { AppButton, DataTable },

    setup() {
        const transactionStore = useTransactionStore()
        const itemStore = useItemStore()

        // Load data
        onMounted(async () => {
            await Promise.all([
                transactionStore.fetchTransactions(),
                itemStore.fetchItems()
            ])
        })

        // Format currency
        const formatCurrency = (value) => {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR'
            }).format(value)
        }

        // Format date
        const formatDate = (date) => {
            return new Date(date).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            })
        }

        return {
            // Data
            transactionColumns: [
                { key: 'id', label: 'ID' },
                { key: 'transactionDate', label: 'Tanggal', format: formatDate },
                { key: 'customerName', label: 'Customer' },
                { key: 'totalAmount', label: 'Total', format: formatCurrency },
                { key: 'status', label: 'Status' }
            ],
            itemColumns: [
                { key: 'name', label: 'Nama Item' },
                { key: 'type', label: 'Tipe' },
                { key: 'price', label: 'Harga', format: formatCurrency },
                { key: 'status', label: 'Status' }
            ],

            // Computed
            todayIncome: transactionStore.getTodayIncome,
            todayTransactions: transactionStore.getTransactionsByDateRange(
                new Date().toISOString().split('T')[0],
                new Date().toISOString().split('T')[0]
            ).length,
            availableItems: itemStore.items.filter(i => i.status === 'AVAILABLE').length,
            rentedItems: itemStore.items.filter(i => i.status === 'RENTED').length,
            recentTransactions: transactionStore.transactions.slice(0, 5),
            popularItems: itemStore.items.slice(0, 5),
            transactionsLoading: transactionStore.loading,
            itemsLoading: itemStore.loading,

            // Methods
            formatCurrency
        }
    }
}
</script>

<style scoped>
.dashboard {
    padding: 1.5rem;
}

.summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
}

.card {
    background-color: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card h3 {
    margin: 0 0 0.5rem 0;
    color: #4b5563;
    font-size: 1rem;
}

.amount {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
}

.section {
    background-color: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-bottom: 1.5rem;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.section-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: #111827;
}
</style>