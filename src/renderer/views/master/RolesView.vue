<template>
  <div class="data-page master-page">
    <header class="page-header">
      <div class="title-wrap">
        <h1>Role & Hak Akses</h1>
        <p class="subtitle">
          Kelola daftar role dan permission. Setiap role dapat memiliki
          permission yang berbeda.
        </p>
      </div>
      <AppButton
        v-if="hasPermissionSync('roles.create')"
        variant="primary"
        @click="openCreateDialog"
      >
        <Icon name="plus" :size="16" />
        <span>Tambah Role</span>
      </AppButton>
    </header>

    <!-- Tabel Roles -->
    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Role</span>
          <strong>{{ roles.length }}</strong>
        </div>
        <div class="summary-card">
          <span>Total Permission</span>
          <strong>{{ allPermissions.length }}</strong>
        </div>
      </div>

      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <AppTable
        :columns="columns"
        :rows="roles"
        :loading="loading"
        :searchable-keys="['name', 'description']"
        :show-index="true"
        :dense="true"
        :default-page-size="20"
      >
        <template #cell-name="{ row }">
          <div class="role-name">
            <strong>{{ row.name }}</strong>
          </div>
        </template>
        <template #cell-permission_count="{ row }">
          <span class="badge badge-info">
            {{ row.permission_count || 0 }} Permission
          </span>
        </template>
        <template #cell-user_count="{ row }">
          <span class="badge badge-secondary">
            {{ row.user_count || 0 }} User
          </span>
        </template>
        <template #actions="{ row }">
          <AppButton
            v-if="hasPermissionSync('roles.permissions.manage')"
            variant="secondary"
            @click="openPermissionsDialog(row)"
            title="Kelola Permission"
          >
            <Icon name="shield" :size="14" />
            Permission
          </AppButton>
          <AppButton
            v-if="hasPermissionSync('roles.update')"
            variant="secondary"
            @click="editRole(row)"
            title="Edit"
          >
            <Icon name="edit" :size="14" />
            Edit
          </AppButton>
          <AppButton
            v-if="hasPermissionSync('roles.delete') && row.user_count === 0"
            variant="danger"
            @click="confirmDelete(row)"
            title="Hapus"
          >
            <Icon name="trash" :size="14" />
            Hapus
          </AppButton>
        </template>
      </AppTable>
    </section>

    <!-- Dialog Form Role -->
    <Dialog
      v-model="showDialog"
      :title="isEdit ? 'Edit Role' : 'Tambah Role'"
      :max-width="600"
      @update:modelValue="
        (v) => {
          if (!v) closeDialog();
        }
      "
    >
      <form @submit.prevent="saveRole">
        <div class="form-group">
          <label>Nama Role <span class="required">*</span></label>
          <input
            v-model="form.name"
            type="text"
            required
            maxlength="20"
            placeholder="Misal: admin, manager, staff"
            :disabled="isEdit"
          />
          <small class="form-hint">
            Nama role harus unik dan tidak bisa diubah setelah dibuat
          </small>
        </div>

        <div class="form-group">
          <label>Deskripsi</label>
          <textarea
            v-model="form.description"
            rows="3"
            maxlength="200"
            placeholder="Deskripsi role dan akses yang dimiliki"
          ></textarea>
        </div>

        <div v-if="formError" class="error-message">
          {{ formError }}
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn" @click="closeDialog">Batal</button>
          <button type="submit" class="btn primary" :disabled="loading">
            {{ isEdit ? "Simpan" : "Tambah" }}
          </button>
        </div>
      </form>
    </Dialog>

    <!-- Dialog Manage Permissions -->
    <Dialog
      v-model="showPermissionsDialog"
      :title="`Kelola Permission: ${selectedRole?.name || ''}`"
      :max-width="800"
      @update:modelValue="
        (v) => {
          if (!v) closePermissionsDialog();
        }
      "
    >
      <div v-if="loadingPermissions" class="loading-state">
        Memuat permissions...
      </div>
      <div v-else>
        <div class="permissions-header">
          <p class="permissions-description">
            Pilih permission yang akan diberikan kepada role ini. Permission
            dikelompokkan berdasarkan modul.
          </p>
          <div class="permissions-actions">
            <button
              type="button"
              class="btn-link"
              @click="selectAllPermissions"
            >
              Pilih Semua
            </button>
            <button
              type="button"
              class="btn-link"
              @click="deselectAllPermissions"
            >
              Hapus Semua
            </button>
          </div>
        </div>

        <div class="permissions-container">
          <div
            v-for="module in permissionModules"
            :key="module"
            class="permission-module"
          >
            <div class="module-header">
              <h4>{{ getModuleLabel(module) }}</h4>
              <button
                type="button"
                class="btn-link-small"
                @click="toggleModule(module)"
              >
                {{ isModuleSelected(module) ? "Hapus" : "Pilih" }} Semua
              </button>
            </div>
            <div class="permission-list">
              <label
                v-for="permission in getPermissionsByModule(module)"
                :key="permission.id"
                class="permission-item"
              >
                <input
                  type="checkbox"
                  :value="permission.id"
                  v-model="selectedPermissionIds"
                />
                <div class="permission-info">
                  <span class="permission-name">{{ permission.name }}</span>
                  <span class="permission-slug">{{ permission.slug }}</span>
                  <span
                    v-if="permission.description"
                    class="permission-description"
                  >
                    {{ permission.description }}
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div v-if="permissionsError" class="error-message">
          {{ permissionsError }}
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn" @click="closePermissionsDialog">
            Batal
          </button>
          <button
            type="button"
            class="btn primary"
            @click="savePermissions"
            :disabled="loading"
          >
            Simpan Permission
          </button>
        </div>
      </div>
    </Dialog>

    <!-- Dialog Konfirmasi Hapus -->
    <Dialog
      v-model="showDeleteDialog"
      title="Hapus Role"
      @update:modelValue="
        (v) => {
          if (!v) closeDeleteDialog();
        }
      "
    >
      <p>Yakin ingin menghapus role ini?</p>
      <p class="warning-text">
        Role yang sedang digunakan oleh user tidak dapat dihapus.
      </p>
      <div class="dialog-footer">
        <button class="btn" @click="closeDeleteDialog">Batal</button>
        <button class="btn danger" @click="handleDeleteRole">Hapus</button>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import Dialog from "@/components/ui/Dialog.vue";
import AppTable from "@/components/ui/AppTable.vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import { usePermissions } from "@/composables/usePermissions";
import {
  fetchRoles,
  fetchRoleById,
  createRole,
  updateRole,
  deleteRole,
  fetchPermissions,
  fetchRolePermissions,
  updateRolePermissions,
} from "@/services/masterData";

const { hasPermissionSync } = usePermissions();

const roles = ref([]);
const allPermissions = ref([]);
const loading = ref(false);
const loadingPermissions = ref(false);
const error = ref("");
const formError = ref("");
const permissionsError = ref("");

const columns = ref([
  { key: "name", label: "Nama Role", sortable: true },
  { key: "description", label: "Deskripsi" },
  {
    key: "permission_count",
    label: "Permission",
    sortable: true,
    align: "center",
  },
  { key: "user_count", label: "User", sortable: true, align: "center" },
]);

const showDialog = ref(false);
const showDeleteDialog = ref(false);
const showPermissionsDialog = ref(false);
const selectedRole = ref(null);
const isEdit = ref(false);
const selectedPermissionIds = ref([]);

const form = ref({
  name: "",
  description: "",
});

// Permission modules
const permissionModules = computed(() => {
  const modules = new Set();
  allPermissions.value.forEach((perm) => {
    if (perm.module) modules.add(perm.module);
  });
  return Array.from(modules).sort();
});

// Load data
async function loadRoles() {
  try {
    loading.value = true;
    error.value = "";
    roles.value = await fetchRoles();
  } catch (err) {
    error.value = err.message || "Gagal memuat data role.";
    console.error(err);
  } finally {
    loading.value = false;
  }
}

async function loadPermissions() {
  try {
    loadingPermissions.value = true;
    allPermissions.value = await fetchPermissions();
  } catch (err) {
    console.error("Error loading permissions:", err);
  } finally {
    loadingPermissions.value = false;
  }
}

// Dialog handlers
function openCreateDialog() {
  form.value = {
    name: "",
    description: "",
  };
  formError.value = "";
  isEdit.value = false;
  showDialog.value = true;
}

async function editRole(role) {
  try {
    loading.value = true;
    const roleData = await fetchRoleById(role.id);
    selectedRole.value = roleData;
    form.value = {
      name: roleData.name || "",
      description: roleData.description || "",
    };
    formError.value = "";
    isEdit.value = true;
    showDialog.value = true;
  } catch (err) {
    error.value = err.message || "Gagal memuat data role.";
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function closeDialog() {
  showDialog.value = false;
  form.value = {
    name: "",
    description: "",
  };
  formError.value = "";
  selectedRole.value = null;
  isEdit.value = false;
}

async function openPermissionsDialog(role) {
  try {
    loadingPermissions.value = true;
    selectedRole.value = role;
    selectedPermissionIds.value = [];

    // Load all permissions if not loaded
    if (allPermissions.value.length === 0) {
      await loadPermissions();
    }

    // Load role permissions
    const rolePermissions = await fetchRolePermissions(role.id);
    selectedPermissionIds.value = rolePermissions.map((p) => p.id);

    showPermissionsDialog.value = true;
  } catch (err) {
    permissionsError.value = err.message || "Gagal memuat permissions.";
    console.error(err);
  } finally {
    loadingPermissions.value = false;
  }
}

function closePermissionsDialog() {
  showPermissionsDialog.value = false;
  selectedRole.value = null;
  selectedPermissionIds.value = [];
  permissionsError.value = "";
}

function confirmDelete(role) {
  selectedRole.value = role;
  showDeleteDialog.value = true;
}

function closeDeleteDialog() {
  showDeleteDialog.value = false;
  selectedRole.value = null;
}

// Permission management
function getPermissionsByModule(module) {
  return allPermissions.value.filter((p) => p.module === module);
}

function getModuleLabel(module) {
  const labels = {
    dashboard: "Dashboard",
    master: "Data Master",
    transactions: "Transaksi",
    settings: "Pengaturan",
    users: "Manajemen User",
    roles: "Manajemen Role",
  };
  return labels[module] || module;
}

function isModuleSelected(module) {
  const modulePermissions = getPermissionsByModule(module);
  return modulePermissions.every((p) =>
    selectedPermissionIds.value.includes(p.id),
  );
}

function toggleModule(module) {
  const modulePermissions = getPermissionsByModule(module);
  const allSelected = isModuleSelected(module);

  if (allSelected) {
    // Deselect all
    selectedPermissionIds.value = selectedPermissionIds.value.filter(
      (id) => !modulePermissions.some((p) => p.id === id),
    );
  } else {
    // Select all
    modulePermissions.forEach((p) => {
      if (!selectedPermissionIds.value.includes(p.id)) {
        selectedPermissionIds.value.push(p.id);
      }
    });
  }
}

function selectAllPermissions() {
  selectedPermissionIds.value = allPermissions.value.map((p) => p.id);
}

function deselectAllPermissions() {
  selectedPermissionIds.value = [];
}

// CRUD operations
async function saveRole() {
  try {
    formError.value = "";
    loading.value = true;

    const payload = {
      name: String(form.value.name || "")
        .trim()
        .toLowerCase(),
      description: String(form.value.description || "").trim(),
    };

    if (isEdit.value) {
      await updateRole(selectedRole.value.id, payload);
    } else {
      await createRole(payload);
    }

    closeDialog();
    await loadRoles();
  } catch (error) {
    formError.value = error?.message || "Gagal menyimpan role.";
    console.error(error);
  } finally {
    loading.value = false;
  }
}

async function handleDeleteRole() {
  try {
    loading.value = true;
    await deleteRole(selectedRole.value.id);
    closeDeleteDialog();
    await loadRoles();
  } catch (error) {
    error.value = error?.message || "Gagal menghapus role.";
    alert(error?.message || "Gagal menghapus role.");
    console.error(error);
  } finally {
    loading.value = false;
  }
}

async function savePermissions() {
  try {
    permissionsError.value = "";
    loading.value = true;

    await updateRolePermissions(
      selectedRole.value.id,
      selectedPermissionIds.value,
    );

    closePermissionsDialog();
    await loadRoles();
  } catch (error) {
    permissionsError.value = error?.message || "Gagal menyimpan permissions.";
    console.error(error);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadRoles();
  await loadPermissions();
});
</script>

<style scoped>
.title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-wrap h1 {
  margin: 0;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
}

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

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

.role-name strong {
  text-transform: capitalize;
  color: #111827;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.badge-info {
  background: #dbeafe;
  color: #1e40af;
}

.badge-secondary {
  background: #e5e7eb;
  color: #374151;
}

.form-group label .required {
  color: #dc2626;
}

.form-hint {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 0.85rem;
}

/* Permissions Dialog */
.loading-state {
  padding: 40px;
  text-align: center;
  color: #6b7280;
}

.permissions-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e5e7eb;
}

.permissions-description {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 10px;
}

.permissions-actions {
  display: flex;
  gap: 15px;
}


.permissions-container {
  max-height: 500px;
  overflow-y: auto;
  padding-right: 10px;
}

.permission-module {
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.module-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.btn-link-small {
  background: none;
  border: none;
  color: #6366f1;
  cursor: pointer;
  font-size: 0.85rem;
  text-decoration: underline;
  padding: 0;
}

.btn-link-small:hover {
  color: #4f46e5;
}

.permission-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.permission-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.permission-item:hover {
  background: #f9fafb;
}

.permission-item input[type="checkbox"] {
  margin-top: 4px;
  cursor: pointer;
}

.permission-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.permission-name {
  font-weight: 500;
  color: #111827;
  font-size: 0.9rem;
}

.permission-slug {
  font-size: 0.8rem;
  color: #6b7280;
  font-family: monospace;
}

.permission-description {
  font-size: 0.85rem;
  color: #9ca3af;
}
</style>
