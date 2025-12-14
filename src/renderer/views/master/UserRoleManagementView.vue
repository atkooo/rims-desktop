<template>
  <div class="data-page master-page">
    <header class="page-header">
      <div class="title-wrap">
        <h1>User Management</h1>
        <p class="subtitle">
          Kelola user internal aplikasi.
        </p>
      </div>
    </header>

    <!-- Tabs Navigation -->
    <div class="tabs-container">
      <div class="tabs">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ active: currentTab === tab.id }"
          @click="currentTab = tab.id"
        >
          <Icon :name="tab.icon" :size="16" />
          <span>{{ tab.label }}</span>
        </div>
      </div>
    </div>

    <!-- Users Tab Content -->
    <div v-if="currentTab === 'users'" class="tab-content">
      <section class="card-section">
        <div class="section-header">
          <div>
            <h2>User Internal</h2>
            <p class="section-subtitle">
              Monitoring pengguna aplikasi beserta perannya.
            </p>
          </div>
          <div style="display: flex; gap: 8px">
            <AppButton
              variant="primary"
              @click="openCreateUserDialog"
            >
              <Icon name="plus" :size="16" />
              <span>Tambah User</span>
            </AppButton>
            <AppButton variant="secondary" :loading="usersLoading" @click="loadUsers">
              Refresh Data
            </AppButton>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <span>Total Pengguna</span>
            <strong>{{ userStats.totalUsers }}</strong>
          </div>
          <div class="summary-card">
            <span>Aktif</span>
            <strong>{{ userStats.activeUsers }}</strong>
          </div>
          <div class="summary-card">
            <span>Terakhir Login</span>
            <strong>{{ userStats.lastLogin }}</strong>
          </div>
        </div>

        <div v-if="usersError" class="error-banner">
          {{ usersError }}
        </div>

        <div class="table-container">
          <AppTable
            :columns="userColumns"
            :rows="users"
            :loading="usersLoading"
            :searchable-keys="['username', 'full_name', 'email', 'role_name']"
            row-key="id"
            :default-page-size="10"
          >
            <template #cell-is_active="{ row }">
              {{ row.is_active ? "Aktif" : "Nonaktif" }}
            </template>
            <template #cell-last_login="{ row }">
              {{
                row.last_login
                  ? formatDateTime(row.last_login)
                  : "-"
              }}
            </template>
            <template #actions="{ row }">
              <AppButton
                variant="secondary"
                @click="editUser(row)"
                title="Edit"
              >
                <Icon name="edit" :size="14" />
                Edit
              </AppButton>
              <AppButton
                variant="danger"
                @click="confirmDeleteUser(row)"
                title="Hapus"
              >
                <Icon name="trash" :size="14" />
                Hapus
              </AppButton>
            </template>
          </AppTable>
        </div>
      </section>
    </div>

    <!-- Dialog Form User -->
    <Dialog
      v-model="showUserDialog"
      :title="isEditUser ? 'Edit User' : 'Tambah User'"
      :max-width="600"
      @update:modelValue="
        (v) => {
          if (!v) closeUserDialog();
        }
      "
    >
      <form @submit.prevent="saveUser">
        <div class="form-group">
          <label>Username <span class="required">*</span></label>
          <input
            v-model="userForm.username"
            type="text"
            required
            :disabled="isEditUser"
            placeholder="Masukkan username"
          />
          <small class="form-hint" v-if="!isEditUser">
            Username harus unik dan tidak bisa diubah setelah dibuat
          </small>
        </div>

        <div class="form-group">
          <label>Password <span class="required">*</span></label>
          <input
            v-model="userForm.password"
            type="password"
            :required="!isEditUser"
            :placeholder="isEditUser ? 'Kosongkan jika tidak ingin mengubah password' : 'Minimal 6 karakter'"
            minlength="6"
          />
          <small class="form-hint">
            {{ isEditUser ? 'Kosongkan jika tidak ingin mengubah password' : 'Password minimal 6 karakter' }}
          </small>
        </div>

        <div class="form-group">
          <label>Nama Lengkap <span class="required">*</span></label>
          <input
            v-model="userForm.full_name"
            type="text"
            required
            placeholder="Masukkan nama lengkap"
          />
        </div>

        <div class="form-group">
          <label>Email</label>
          <input
            v-model="userForm.email"
            type="email"
            placeholder="Masukkan email (opsional)"
          />
        </div>

        <div class="form-group">
          <label>Role <span class="required">*</span></label>
          <select v-model="userForm.role" required>
            <option value="">Pilih Role</option>
            <option
              v-for="role in selectableRoles"
              :key="role"
              :value="role"
            >
              {{ role === 'admin' ? 'Admin' : 'Kasir' }}
            </option>
          </select>
          <small class="form-hint" v-if="!isEditUser">
            Role admin tidak dapat dipilih untuk user baru
          </small>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="userForm.is_active"
              class="checkbox-input"
            />
            <span>User Aktif</span>
          </label>
        </div>

        <div v-if="userFormError" class="error-message">
          {{ userFormError }}
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn" @click="closeUserDialog">Batal</button>
          <button type="submit" class="btn primary" :disabled="usersLoading">
            {{ isEditUser ? "Simpan" : "Tambah" }}
          </button>
        </div>
      </form>
    </Dialog>

    <!-- Dialog Konfirmasi Hapus User -->
    <Dialog
      v-model="showDeleteUserDialog"
      title="Hapus User"
      @update:modelValue="
        (v) => {
          if (!v) closeDeleteUserDialog();
        }
      "
    >
      <p>Yakin ingin menghapus user ini?</p>
      <p class="warning-text">
        User yang sedang login tidak dapat dihapus.
      </p>
      <div class="dialog-footer">
        <button class="btn" @click="closeDeleteUserDialog">Batal</button>
        <button class="btn danger" @click="handleDeleteUser">Hapus</button>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import Dialog from "@/components/ui/Dialog.vue";
import AppTable from "@/components/ui/AppTable.vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import {
  fetchUsers,
  fetchUserById,
  createUser,
  updateUser,
  deleteUser,
} from "@/services/masterData";
import { formatDateTime } from "@/utils/dateUtils";

// Tabs - only users tab now
const tabs = computed(() => {
  return [
    { id: "users", label: "User Internal", icon: "users" },
  ];
});

const currentTab = ref("users");

// Set default tab based on available permissions
const initializeTab = () => {
  if (tabs.value.length > 0) {
    // If current tab is not available, switch to first available tab
    const isCurrentTabAvailable = tabs.value.some(
      (tab) => tab.id === currentTab.value,
    );
    if (!isCurrentTabAvailable) {
      currentTab.value = tabs.value[0].id;
    }
  }
};

// Watch for tab changes when permissions are loaded
watch(
  tabs,
  () => {
    initializeTab();
  },
  { immediate: true },
);

// Users state
const users = ref([]);
const usersLoading = ref(false);
const usersError = ref("");
const showUserDialog = ref(false);
const showDeleteUserDialog = ref(false);
const isEditUser = ref(false);
const selectedUser = ref(null);
const userFormError = ref("");

const userForm = ref({
  username: "",
  password: "",
  full_name: "",
  email: "",
  role: "",
  is_active: true,
});

const userColumns = [
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

const userStats = computed(() => {
  const totalUsers = users.value.length;
  const activeUsers = users.value.filter((user) => user.is_active).length;
  const latest = users.value
    .map((user) => (user.last_login ? new Date(user.last_login) : null))
    .filter(Boolean)
    .sort((a, b) => b - a)[0];

  const lastLogin = latest ? formatDateTime(latest) : "-";

  return { totalUsers, activeUsers, lastLogin };
});

async function loadUsers() {
  usersLoading.value = true;
  usersError.value = "";
  try {
    users.value = await fetchUsers();
  } catch (err) {
    usersError.value = err.message || "Gagal memuat data pengguna.";
  } finally {
    usersLoading.value = false;
  }
}

// Available roles - hardcoded since we only have 2 roles
const availableRoles = ['admin', 'kasir'];

// Filter roles - exclude admin when creating new user or editing non-admin user
const selectableRoles = computed(() => {
  if (isEditUser.value && selectedUser.value) {
    // When editing, check if user already has admin role
    if (selectedUser.value.role_name === "admin" || selectedUser.value.role === "admin") {
      // If user is already admin, show all roles (can keep admin or change)
      return availableRoles;
    } else {
      // If user is not admin, exclude admin role (cannot change to admin)
      return availableRoles.filter((role) => role !== "admin");
    }
  } else {
    // When creating new user, exclude admin role
    return availableRoles.filter((role) => role !== "admin");
  }
});

// User dialog handlers
function openCreateUserDialog() {
  userForm.value = {
    username: "",
    password: "",
    full_name: "",
    email: "",
    role: "",
    is_active: true,
  };
  userFormError.value = "";
  isEditUser.value = false;
  showUserDialog.value = true;
}

async function editUser(user) {
  try {
    usersLoading.value = true;
    const userData = await fetchUserById(user.id);
    selectedUser.value = userData;
    userForm.value = {
      username: userData.username || "",
      password: "",
      full_name: userData.full_name || "",
      email: userData.email || "",
      role: userData.role_name || userData.role || "",
      is_active: userData.is_active !== undefined ? Boolean(userData.is_active) : true,
    };
    userFormError.value = "";
    isEditUser.value = true;
    showUserDialog.value = true;
  } catch (err) {
    usersError.value = err.message || "Gagal memuat data user.";
    console.error(err);
  } finally {
    usersLoading.value = false;
  }
}

function closeUserDialog() {
  showUserDialog.value = false;
  userForm.value = {
    username: "",
    password: "",
    full_name: "",
    email: "",
    role: "",
    is_active: true,
  };
  userFormError.value = "";
  selectedUser.value = null;
  isEditUser.value = false;
}

function confirmDeleteUser(user) {
  selectedUser.value = user;
  showDeleteUserDialog.value = true;
}

function closeDeleteUserDialog() {
  showDeleteUserDialog.value = false;
  selectedUser.value = null;
}

// User CRUD operations
async function saveUser() {
  try {
    userFormError.value = "";
    usersLoading.value = true;

    const payload = {
      full_name: String(userForm.value.full_name || "").trim(),
      email: String(userForm.value.email || "").trim() || null,
      role: String(userForm.value.role || "").trim(),
      is_active: Boolean(userForm.value.is_active),
    };

    if (isEditUser.value) {
      if (userForm.value.password) {
        payload.password = userForm.value.password;
      }
      await updateUser(selectedUser.value.id, payload);
    } else {
      payload.username = String(userForm.value.username || "").trim().toLowerCase();
      payload.password = String(userForm.value.password || "").trim();
      await createUser(payload);
    }

    closeUserDialog();
    await loadUsers();
  } catch (error) {
    userFormError.value = error?.message || "Gagal menyimpan user.";
    console.error(error);
  } finally {
    usersLoading.value = false;
  }
}

async function handleDeleteUser() {
  try {
    usersLoading.value = true;
    await deleteUser(selectedUser.value.id);
    closeDeleteUserDialog();
    await loadUsers();
  } catch (error) {
    usersError.value = error?.message || "Gagal menghapus user.";
    alert(error?.message || "Gagal menghapus user.");
    console.error(error);
  } finally {
    usersLoading.value = false;
  }
}


onMounted(async () => {
  initializeTab();
  await loadUsers();
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

/* Tabs */
.tabs-container {
  margin-bottom: 1.5rem;
}

.tabs {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  color: #6b7280;
  font-weight: 500;
  transition: all 0.2s;
}

.tab:hover {
  color: #111827;
  background-color: #f9fafb;
}

.tab.active {
  color: #6366f1;
  border-bottom-color: #6366f1;
}

.tab-content {
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0 0 4px 0;
  font-size: 1.25rem;
  color: #111827;
}

.section-subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
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

.role-name strong {
  text-transform: capitalize;
  color: #111827;
}


.form-group label:not(.checkbox-label) {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #111827;
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

.form-group input[type="checkbox"] {
  width: auto;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 0;
  background-color: transparent;
  cursor: pointer;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-bottom: 0;
  font-weight: 500;
  color: #111827;
}

.checkbox-label:hover {
  color: #6366f1;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #6366f1;
  flex-shrink: 0;
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
