<template>
    <div class="data-page">
        <div class="page-header">
            <div>
                <h1>Log Aktivitas</h1>
                <p class="subtitle">Catatan aktivitas pengguna pada aplikasi.</p>
            </div>
            <AppButton variant="secondary" :loading="loading" @click="loadLogs">
                Refresh Data
            </AppButton>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <span>Total Log</span>
                <strong>{{ logs.length }}</strong>
            </div>
            <div class="summary-card">
                <span>Modul Unik</span>
                <strong>{{ stats.uniqueModules }}</strong>
            </div>
            <div class="summary-card">
                <span>Pengguna Aktif</span>
                <strong>{{ stats.uniqueUsers }}</strong>
            </div>
        </div>

        <div v-if="error" class="error-banner">
            {{ error }}
        </div>

        <DataTable :columns="columns" :items="logs" :loading="loading" />
    </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import AppButton from '@/components/AppButton.vue'
import DataTable from '@/components/DataTable.vue'
import { fetchActivityLogs } from '@/services/settings'

export default {
    name: 'ActivityLogsView',
    components: { AppButton, DataTable },
    setup() {
        const logs = ref([])
        const loading = ref(false)
        const error = ref('')

        const formatDateTime = (value) =>
            value ? new Date(value).toLocaleString('id-ID') : '-'

        const columns = [
            { key: 'user_name', label: 'Pengguna' },
            { key: 'action', label: 'Aksi' },
            { key: 'module', label: 'Modul' },
            { key: 'description', label: 'Deskripsi' },
            { key: 'ip_address', label: 'IP' },
            {
                key: 'created_at',
                label: 'Waktu',
                format: formatDateTime
            }
        ]

        const stats = computed(() => {
            const uniqueModules = new Set(logs.value.map((log) => log.module)).size
            const uniqueUsers = new Set(logs.value.map((log) => log.user_name)).size
            return { uniqueModules, uniqueUsers }
        })

        const loadLogs = async () => {
            loading.value = true
            error.value = ''
            try {
                logs.value = await fetchActivityLogs()
            } catch (err) {
                error.value = err.message || 'Gagal memuat log aktivitas.'
            } finally {
                loading.value = false
            }
        }

        onMounted(loadLogs)

        return {
            logs,
            loading,
            error,
            columns,
            stats,
            loadLogs
        }
    }
}
</script>
