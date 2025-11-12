<template>
  <div class="data-page master-page">
    <header class="page-header">
      <div class="title-wrap">
        <h1>User & Role Management</h1>
        <p class="subtitle">
          Kelola user internal, role, dan hak akses dalam satu tempat.
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
              v-if="hasPermissionSync('users.create')"
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
            default-page-size="10"
          >
            <template #cell-is_active="{ row }">
              {{ row.is_active ? "Aktif" : "Nonaktif" }}
            </template>
            <template #cell-last_login="{ row }">
              {{
                row.last_login
                  ? new Date(row.last_login).toLocaleString("id-ID")
                  : "-"
              }}
            </template>
            <template #actions="{ row }">
              <AppButton
                v-if="hasPermissionSync('users.update')"
                variant="secondary"
                @click="editUser(row)"
                title="Edit"
              >
                <Icon name="edit" :size="14" />
                Edit
              </AppButton>
              <AppButton
                v-if="hasPermissionSync('users.delete')"
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

    <!-- Roles Tab Content -->
    <div v-if="currentTab === 'roles'" class="tab-content">
      <section class="card-section">
        <div class="section-header">
          <div>
            <h2>Role & Hak Akses</h2>
            <p class="section-subtitle">
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
        </div>

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

        <div v-if="rolesError" class="error-banner">
          {{ rolesError }}
        </div>

        <AppTable
          :columns="roleColumns"
          :rows="roles"
          :loading="rolesLoading"
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
    </div>

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
          <button type="submit" class="btn primary" :disabled="rolesLoading">
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
            :disabled="rolesLoading"
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
          <select v-model="userForm.role_id" required>
            <option value="">Pilih Role</option>
            <option
              v-for="role in selectableRoles"
              :key="role.id"
              :value="role.id"
            >
              {{ role.name }}
            </option>
          </select>
          <small class="form-hint" v-if="!isEditUser">
            Role admin tidak dapat dipilih untuk user baru
          </small>
        </div>

        <div class="form-group">
          <label>
            <input
              type="checkbox"
              v-model="userForm.is_active"
            />
            <span style="margin-left: 8px">User Aktif</span>
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
import { usePermissions } from "@/composables/usePermissions";
import {
  fetchUsers,
  fetchUserById,
  createUser,
  updateUser,
  deleteUser,
} from "@/services/masterData";
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

// Tabs - filter based on permissions
const tabs = computed(() => {
  const availableTabs = [];
  if (hasPermissionSync("users.view")) {
    availableTabs.push({ id: "users", label: "User Internal", icon: "users" });
  }
  if (hasPermissionSync("roles.view")) {
    availableTabs.push({
      id: "roles",
      label: "Role & Hak Akses",
      icon: "shield",
    });
  }
  return availableTabs;
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
const availableRoles = ref([]);
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
  role_id: "",
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
    format: (value) =>
      value ? new Date(value).toLocaleString("id-ID") : "-",
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

  const lastLogin = latest ? latest.toLocaleString("id-ID") : "-";

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

async function loadAvailableRoles() {
  try {
    availableRoles.value = await fetchRoles();
  } catch (err) {
    console.error("Error loading roles:", err);
  }
}

// Filter roles - exclude admin when creating new user or editing non-admin user
const selectableRoles = computed(() => {
  if (isEditUser.value && selectedUser.value) {
    // When editing, check if user already has admin role
    const userRole = availableRoles.value.find(r => r.id === selectedUser.value.role_id);
    if (userRole && userRole.name === "admin") {
      // If user is already admin, show all roles (can keep admin or change)
      return availableRoles.value;
    } else {
      // If user is not admin, exclude admin role (cannot change to admin)
      return availableRoles.value.filter((role) => role.name !== "admin");
    }
  } else {
    // When creating new user, exclude admin role
    return availableRoles.value.filter((role) => role.name !== "admin");
  }
});

// User dialog handlers
function openCreateUserDialog() {
  userForm.value = {
    username: "",
    password: "",
    full_name: "",
    email: "",
    role_id: "",
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
      role_id: userData.role_id || "",
      is_active: userData.is_active !== undefined ? userData.is_active : true,
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
    role_id: "",
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
      role_id: Number(userForm.value.role_id),
      is_active: userForm.value.is_active,
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

// Roles state
const roles = ref([]);
const allPermissions = ref([]);
const rolesLoading = ref(false);
const loadingPermissions = ref(false);
const rolesError = ref("");
const formError = ref("");
const permissionsError = ref("");

const roleColumns = ref([
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
    rolesLoading.value = true;
    rolesError.value = "";
    roles.value = await fetchRoles();
  } catch (err) {
    rolesError.value = err.message || "Gagal memuat data role.";
    console.error(err);
  } finally {
    rolesLoading.value = false;
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
    rolesLoading.value = true;
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
    rolesError.value = err.message || "Gagal memuat data role.";
    console.error(err);
  } finally {
    rolesLoading.value = false;
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
    reports: "Laporan",
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
    rolesLoading.value = true;

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
    rolesLoading.value = false;
  }
}

async function handleDeleteRole() {
  try {
    rolesLoading.value = true;
    await deleteRole(selectedRole.value.id);
    closeDeleteDialog();
    await loadRoles();
  } catch (error) {
    rolesError.value = error?.message || "Gagal menghapus role.";
    alert(error?.message || "Gagal menghapus role.");
    console.error(error);
  } finally {
    rolesLoading.value = false;
  }
}

async function savePermissions() {
  try {
    permissionsError.value = "";
    rolesLoading.value = true;

    // Ensure permissionIds is an array of numbers (not objects)
    const permissionIds = selectedPermissionIds.value.map((id) => Number(id));

    await updateRolePermissions(
      selectedRole.value.id,
      permissionIds,
    );

    closePermissionsDialog();
    await loadRoles();
  } catch (error) {
    permissionsError.value = error?.message || "Gagal menyimpan permissions.";
    console.error(error);
  } finally {
    rolesLoading.value = false;
  }
}

onMounted(async () => {
  initializeTab();
  await loadAvailableRoles();
  if (hasPermissionSync("users.view")) {
    await loadUsers();
  }
  if (hasPermissionSync("roles.view")) {
    await loadRoles();
    await loadPermissions();
  }
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

.form-group {
  margin-bottom: 15px;
}

.form-group label {
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

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
  background-color: white;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-group input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

.error-message {
  padding: 10px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 0.9rem;
}

.warning-text {
  color: #dc2626;
  font-size: 0.9rem;
  margin-top: 10px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.primary {
  background: #6366f1;
  color: white;
}

.btn.primary:hover:not(:disabled) {
  background: #4f46e5;
}

.btn.danger {
  background: #dc2626;
  color: white;
}

.btn.danger:hover:not(:disabled) {
  background: #b91c1c;
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

.btn-link {
  background: none;
  border: none;
  color: #6366f1;
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: underline;
  padding: 0;
}

.btn-link:hover {
  color: #4f46e5;
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

