<template>
    <div class="data-page">
        <div class="page-header">
            <div>
                <h1>Detail Penjualan</h1>
                <p class="subtitle">Item yang terjual pada setiap transaksi.</p>
            </div>
            <AppButton variant="secondary" :loading="loading" @click="loadData">
                Refresh Data
            </AppButton>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <span>Total Detail</span>
                <strong>{{ details.length }}</strong>
            </div>
        </div>

        <div v-if="error" class="error-banner">
            {{ error }}
        </div>

        <DataTable :columns="columns" :items="details" :loading="loading" />
    </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import AppButton from '@/components/AppButton.vue'
import DataTable from '@/components/DataTable.vue'
import { fetchSalesDetails } from '@/services/transactions'

export default {
    name: 'SalesDetailsView',
    components: { AppButton, DataTable },
    setup() {
        const details = ref([])
        const loading = ref(false)
        const error = ref('')

        const currencyFormatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        })

        const columns = [
            { key: 'transaction_code', label: 'Kode Transaksi' },
            { key: 'item_name', label: 'Item' },
            { key: 'quantity', label: 'Jumlah' },
            {
                key: 'sale_price',
                label: 'Harga',
                format: (value) => currencyFormatter.format(value ?? 0)
            },
            {
                key: 'subtotal',
                label: 'Subtotal',
                format: (value) => currencyFormatter.format(value ?? 0)
            },
            {
                key: 'created_at',
                label: 'Dibuat',
                format: (value) => (value ? new Date(value).toLocaleString('id-ID') : '-')
            }
        ]

        const loadData = async () => {
            loading.value = true
            error.value = ''
            try {
                details.value = await fetchSalesDetails()
            } catch (err) {
                error.value = err.message || 'Gagal memuat detail penjualan.'
            } finally {
                loading.value = false
            }
        }

        onMounted(loadData)

        return {
            details,
            loading,
            error,
            columns,
            loadData
        }
    }
}
</script>
