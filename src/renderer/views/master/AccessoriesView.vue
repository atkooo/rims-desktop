<template>
    <div class="data-page">
        <div class="page-header">
            <div>
                <h1>Data Aksesoris</h1>
                <p class="subtitle">Daftar aksesoris beserta stok dan status ketersediaan.</p>
            </div>
            <AppButton variant="secondary" :loading="loading" @click="loadData">
                Refresh Data
            </AppButton>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <span>Total Aksesoris</span>
                <strong>{{ stats.totalAccessories }}</strong>
            </div>
            <div class="summary-card">
                <span>Total Stok</span>
                <strong>{{ stats.totalStock }}</strong>
            </div>
            <div class="summary-card">
                <span>Stok Tersedia</span>
                <strong>{{ stats.availableStock }}</strong>
            </div>
            <div class="summary-card">
                <span>Aksesoris Aktif</span>
                <strong>{{ stats.activeAccessories }}</strong>
            </div>
        </div>

        <div v-if="error" class="error-banner">
            {{ error }}
        </div>

        <DataTable :columns="columns" :items="accessories" :loading="loading" />
    </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import AppButton from '@/components/AppButton.vue'
import DataTable from '@/components/DataTable.vue'
import { fetchAccessories } from '@/services/masterData'

export default {
    name: 'AccessoriesView',
    components: { AppButton, DataTable },
    setup() {
        const accessories = ref([])
        const loading = ref(false)
        const error = ref('')

        const currencyFormatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        })

        const formatCurrency = (value) => currencyFormatter.format(value ?? 0)

        const columns = [
            { key: 'code', label: 'Kode' },
            { key: 'name', label: 'Nama' },
            {
                key: 'rental_price_per_day',
                label: 'Harga Sewa/Hari',
                format: formatCurrency
            },
            {
                key: 'sale_price',
                label: 'Harga Jual',
                format: formatCurrency
            },
            { key: 'stock_quantity', label: 'Total Stok' },
            { key: 'available_quantity', label: 'Tersedia' },
            { key: 'min_stock_alert', label: 'Min Alert' },
            {
                key: 'is_available_for_rent',
                label: 'Bisa Disewa',
                format: (value) => (value ? 'Ya' : 'Tidak')
            },
            {
                key: 'is_available_for_sale',
                label: 'Bisa Dijual',
                format: (value) => (value ? 'Ya' : 'Tidak')
            },
            {
                key: 'is_active',
                label: 'Status',
                format: (value) => (value ? 'Aktif' : 'Nonaktif')
            }
        ]

        const stats = computed(() => {
            const totalAccessories = accessories.value.length
            const totalStock = accessories.value.reduce(
                (sum, item) => sum + (item.stock_quantity || 0),
                0
            )
            const availableStock = accessories.value.reduce(
                (sum, item) => sum + (item.available_quantity || 0),
                0
            )
            const activeAccessories = accessories.value.filter((item) => item.is_active).length

            return { totalAccessories, totalStock, availableStock, activeAccessories }
        })

        const loadData = async () => {
            loading.value = true
            error.value = ''
            try {
                accessories.value = await fetchAccessories()
            } catch (err) {
                error.value = err.message || 'Gagal memuat data aksesoris.'
            } finally {
                loading.value = false
            }
        }

        onMounted(loadData)

        return {
            accessories,
            loading,
            error,
            columns,
            stats,
            loadData
        }
    }
}
</script>
