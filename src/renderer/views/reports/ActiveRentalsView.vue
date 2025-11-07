<template>
    <div class="report-page">
        <div class="page-header">
            <div>
                <h1>Sewa Aktif</h1>
                <p class="subtitle">
                    Monitoring transaksi sewa yang masih berjalan beserta potensi keterlambatan.
                </p>
            </div>
            <AppButton variant="secondary" :loading="loading" @click="loadData">
                Refresh Data
            </AppButton>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <span>Transaksi Aktif</span>
                <strong>{{ stats.activeCount }}</strong>
            </div>
            <div class="summary-card">
                <span>Nilai Tertahan</span>
                <strong>{{ formatCurrency(stats.totalValue) }}</strong>
            </div>
            <div class="summary-card">
                <span>Sewa Terlambat</span>
                <strong>{{ stats.overdueCount }}</strong>
            </div>
            <div class="summary-card">
                <span>Rata-rata Hari Terlambat</span>
                <strong>{{ stats.avgOverdueDays }}</strong>
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
import { fetchActiveRentals } from '@/services/reports'

export default {
    name: 'ActiveRentalsView',
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
        const formatDate = (value) =>
            value ? new Date(value).toLocaleDateString('id-ID') : '-'

        const columns = [
            { key: 'transaction_code', label: 'Kode Transaksi' },
            { key: 'customer_name', label: 'Customer' },
            {
                key: 'rental_date',
                label: 'Tanggal Sewa',
                format: formatDate
            },
            {
                key: 'planned_return_date',
                label: 'Rencana Kembali',
                format: formatDate
            },
            {
                key: 'total_amount',
                label: 'Total',
                format: formatCurrency
            },
            { key: 'status', label: 'Status' },
            {
                key: 'days_overdue',
                label: 'Terlambat (hari)',
                format: (value) => (value > 0 ? value : '-')
            }
        ]

        const stats = computed(() => {
            const activeCount = rentals.value.length
            const totalValue = rentals.value.reduce(
                (sum, item) => sum + (item.total_amount || 0),
                0
            )
            const overdue = rentals.value.filter((item) => (item.days_overdue || 0) > 0)
            const overdueCount = overdue.length
            const avgOverdueDays = overdueCount
                ? (overdue.reduce((sum, item) => sum + item.days_overdue, 0) / overdueCount).toFixed(1)
                : 0

            return {
                activeCount,
                totalValue,
                overdueCount,
                avgOverdueDays
            }
        })

        const loadData = async () => {
            loading.value = true
            error.value = ''
            try {
                rentals.value = await fetchActiveRentals()
            } catch (err) {
                error.value = err.message || 'Gagal memuat data sewa aktif.'
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

<style scoped>
.report-page {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
}

.page-header h1 {
    margin: 0;
    font-size: 1.5rem;
    color: #111827;
}

.subtitle {
    margin: 0.25rem 0 0;
    color: #6b7280;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
}

.summary-card {
    background-color: white;
    padding: 1rem 1.25rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    color: #4b5563;
}

.summary-card strong {
    font-size: 1.4rem;
    color: #111827;
}

.error-banner {
    padding: 0.75rem 1rem;
    border-radius: 6px;
    background-color: #fee2e2;
    color: #991b1b;
}
</style>
