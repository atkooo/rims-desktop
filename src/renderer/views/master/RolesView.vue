<template>
  <div class="data-page master-page">
    <div class="page-header">
      <div>
        <h1>Data Peran</h1>
        <p class="subtitle">Daftar peran pengguna yang tersimpan di sistem.</p>
      </div>
      <AppButton variant="secondary" :loading="loading" @click="loadData">
        Refresh Data
      </AppButton>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Peran</span>
          <strong>{{ roles.length }}</strong>
        </div>
      </div>

      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <div class="table-container">
      <AppTable
        :columns="columns"
        :rows="roles"
        :loading="loading"
        :searchable-keys="['name', 'description']"
        row-key="id"
        default-page-size="10"
      />
      </div>
    </section>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import { fetchRoles } from "@/services/masterData";

export default {
  name: "RolesView",
  components: { AppButton, AppTable },
  setup() {
    const roles = ref([]);
    const loading = ref(false);
    const error = ref("");

    const columns = [
      { key: "name", label: "Nama Peran", sortable: true },
      { key: "description", label: "Deskripsi", sortable: true },
    ];

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        roles.value = await fetchRoles();
      } catch (err) {
        error.value = err.message || "Gagal memuat data peran.";
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadData);

    return {
      roles,
      loading,
      error,
      columns,
      loadData,
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
