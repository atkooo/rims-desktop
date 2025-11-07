<template>
    <div class="data-page">
        <div class="page-header">
            <div>
                <h1>Data Pengguna</h1>
                <p class="subtitle">Monitoring pengguna aplikasi beserta perannya.</p>
            </div>
            <AppButton variant="secondary" :loading="loading" @click="loadData">
                Refresh Data
            </AppButton>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <span>Total Pengguna</span>
                <strong>{{ stats.totalUsers }}</strong>
            </div>
            <div class="summary-card">
                <span>Aktif</span>
                <strong>{{ stats.activeUsers }}</strong>
            </div>
            <div class="summary-card">
                <span>Terakhir Login</span>
                <strong>{{ stats.lastLogin }}</strong>
            </div>
        </div>

        <div v-if="error" class="error-banner">
            {{ error }}
        </div>

        <DataTable :columns="columns" :items="users" :loading="loading" />
    </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import AppButton from '@/components/AppButton.vue'
import DataTable from '@/components/DataTable.vue'
import { fetchUsers } from '@/services/masterData'

export default {
    name: 'UsersView',
    components: { AppButton, DataTable },
    setup() {
        const users = ref([])
        const loading = ref(false)
        const error = ref('')

        const columns = [
            { key: 'username', label: 'Username' },
            { key: 'full_name', label: 'Nama Lengkap' },
            { key: 'email', label: 'Email' },
            { key: 'role_name', label: 'Peran' },
            {
                key: 'is_active',
                label: 'Status',
                format: (value) => (value ? 'Aktif' : 'Nonaktif')
            },
            {
                key: 'last_login',
                label: 'Terakhir Login',
                format: (value) => (value ? new Date(value).toLocaleString('id-ID') : '-')
            }
        ]

        const stats = computed(() => {
            const totalUsers = users.value.length
            const activeUsers = users.value.filter((user) => user.is_active).length
            const latest = users.value
                .map((user) => (user.last_login ? new Date(user.last_login) : null))
                .filter(Boolean)
                .sort((a, b) => b - a)[0]

            const lastLogin = latest ? latest.toLocaleString('id-ID') : '-'

            return { totalUsers, activeUsers, lastLogin }
        })

        const loadData = async () => {
            loading.value = true
            error.value = ''
            try {
                users.value = await fetchUsers()
            } catch (err) {
                error.value = err.message || 'Gagal memuat data pengguna.'
            } finally {
                loading.value = false
            }
        }

        onMounted(loadData)

        return {
            users,
            loading,
            error,
            columns,
            stats,
            loadData
        }
    }
}
</script>
