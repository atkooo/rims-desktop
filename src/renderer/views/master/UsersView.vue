<template>
  <div class="data-page master-page">
    <div class="page-header">
      <div>
        <h1>Data Pengguna</h1>
        <p class="subtitle">Monitoring pengguna aplikasi beserta perannya.</p>
      </div>
      <AppButton variant="secondary" :loading="loading" @click="loadData">
        Refresh Data
      </AppButton>
    </div>

    <section class="card-section">
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

      <div class="table-container">
        <AppTable
          :columns="columns"
          :rows="users"
          :loading="loading"
          :searchable-keys="['username', 'full_name', 'email', 'role_name']"
          row-key="id"
          :default-page-size="10"
        >
          <template #cell-is_active="{ row }">
            {{ row.is_active ? "Aktif" : "Nonaktif" }}
          </template>
          <template #cell-last_login="{ row }">
            {{ row.last_login ? formatDateTime(row.last_login) : "-" }}
          </template>
        </AppTable>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import { fetchUsers } from "@/services/masterData";
import { formatDateTime } from "@/utils/dateUtils";

export default {
  name: "UsersView",
  components: { AppButton, AppTable },
  setup() {
    const users = ref([]);
    const loading = ref(false);
    const error = ref("");

    const columns = [
      { key: "username", label: "Username", sortable: true },
      { key: "full_name", label: "Nama Lengkap", sortable: true },
      { key: "email", label: "Email", sortable: true },
      { key: "role_name", label: "Peran", sortable: true },
      {
        key: "is_active",
        label: "Status",
        format: (value) => (value ? "Aktif" : "Nonaktif"),
        sortable: true,
      },
      {
        key: "last_login",
        label: "Terakhir Login",
        format: (value) => (value ? formatDateTime(value) : "-"),
        sortable: true,
      },
    ];

    const stats = computed(() => {
      const totalUsers = users.value.length;
      const activeUsers = users.value.filter((user) => user.is_active).length;
      const latest = users.value
        .map((user) => (user.last_login ? new Date(user.last_login) : null))
        .filter(Boolean)
        .sort((a, b) => b - a)[0];

      const lastLogin = latest ? formatDateTime(latest) : "-";

      return { totalUsers, activeUsers, lastLogin };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        users.value = await fetchUsers();
      } catch (err) {
        error.value = err.message || "Gagal memuat data pengguna.";
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadData);

    return {
      users,
      loading,
      error,
      columns,
      stats,
      loadData,
      formatDateTime,
    };
  },
};
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background-color: #f9fafb;
  padding: 1.25rem;
  border-radius: 10px;
  border: 1px solid #e0e7ff;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
}

.summary-card span {
  display: block;
  color: #4b5563;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.summary-card strong {
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.table-container {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}
</style>
