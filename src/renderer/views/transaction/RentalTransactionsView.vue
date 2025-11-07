<template>
    <div class="data-page">
        <div class="page-header">
            <div>
                <h1>Transaksi Sewa</h1>
                <p class="subtitle">Ringkasan transaksi sewa langsung dari database.</p>
            </div>
            <AppButton variant="secondary" :loading="loading" @click="loadData">
                Refresh Data
            </AppButton>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <span>Total Transaksi</span>
                <strong>{{ stats.totalRentals }}</strong>
            </div>
            <div class="summary-card">
                <span>Aktif</span>
                <strong>{{ stats.activeRentals }}</strong>
            </div>
            <div class="summary-card">
                <span>Terlambat</span>
                <strong>{{ stats.overdueRentals }}</strong>
            </div>
            <div class="summary-card">
                <span>Total Nilai</span>
                <strong>{{ formatCurrency(stats.totalAmount) }}</strong>
            </div>
        </div>

        <div v-if="error" class="error-banner">
            {{ error }}
        </div>

        <DataTable :columns="columns" :items="rentals" :loading="loading" />
    </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import AppButton from '@/components/AppButton.vue'
import DataTable from '@/components/DataTable.vue'
import { fetchRentalTransactions } from '@/services/transactions'

export default {
    name: 'RentalTransactionsView',
    components: { AppButton, DataTable },
    setup() {
        const rentals = ref([])
        const loading = ref(false)
        const error = ref('')

        const currencyFormatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        })

        const formatCurrency = (value) => currencyFormatter.format(value ?? 0)
        const formatDate = (value) => (value ? new Date(value).toLocaleDateString('id-ID') : '-')

        const columns = [
            { key: 'transaction_code', label: 'Kode' },
            { key: 'customer_name', label: 'Customer' },
            { key: 'user_name', label: 'Petugas' },
            { key: 'rental_date', label: 'Tanggal Sewa', format: formatDate },
            { key: 'planned_return_date', label: 'Rencana Kembali', format: formatDate },
            { key: 'actual_return_date', label: 'Realisasi', format: formatDate },
            { key: 'total_days', label: 'Durasi (hari)' },
            { key: 'total_amount', label: 'Total', format: formatCurrency },
            { key: 'paid_amount', label: 'Terbayar', format: formatCurrency },
            { key: 'payment_status', label: 'Status Pembayaran' },
            { key: 'status', label: 'Status Sewa' }
        ]

        const stats = computed(() => {
            const totalRentals = rentals.value.length
            const activeRentals = rentals.value.filter((rental) => rental.status === 'active').length
            const overdueRentals = rentals.value.filter((rental) => rental.status === 'overdue').length
            const totalAmount = rentals.value.reduce(
                (sum, rental) => sum + (rental.total_amount || 0),
                0
            )
            return { totalRentals, activeRentals, overdueRentals, totalAmount }
        })

        const loadData = async () => {
            loading.value = true
            error.value = ''
            try {
                rentals.value = await fetchRentalTransactions()
            } catch (err) {
                error.value = err.message || 'Gagal memuat data sewa.'
            } finally {
                loading.value = false
            }
        }

        onMounted(loadData)

        return {
            rentals,
            loading,
            error,
            columns,
            stats,
            loadData,
            formatCurrency
        }
    }
}
</script>
