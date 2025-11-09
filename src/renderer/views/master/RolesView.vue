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
    </section>

    <section class="card-section">
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <AppTable
        :columns="columns"
        :rows="roles"
        :loading="loading"
        :searchable-keys="['name', 'description']"
        row-key="id"
      />
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
      { key: "name", label: "Nama Peran" },
      { key: "description", label: "Deskripsi" },
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
