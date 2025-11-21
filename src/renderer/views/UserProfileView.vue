<template>
  <div class="data-page settings-page admin-page">
    <div class="page-header">
      <div>
        <h1>Profil Saya</h1>
        <p class="subtitle">
          Kelola informasi profil dan keamanan akun Anda.
        </p>
      </div>
    </div>

    <section class="card-section">
      <!-- Profile Information Section -->
      <div class="settings-section">
        <header class="section-header">
          <div class="section-icon">
            <Icon name="user" :size="24" />
          </div>
          <div>
            <h2>Informasi Profil</h2>
            <p class="section-subtitle">
              Perbarui informasi profil Anda yang akan ditampilkan di aplikasi.
            </p>
          </div>
        </header>

        <div class="form-grid">
          <FormInput
            id="username"
            label="Username"
            v-model="profile.username"
            disabled
            hint="Username tidak dapat diubah"
          />
          <FormInput
            id="full_name"
            label="Nama Lengkap"
            v-model="profile.full_name"
            :error="errors.full_name"
            placeholder="Masukkan nama lengkap"
            required
          />
          <FormInput
            id="email"
            label="Email"
            type="email"
            v-model="profile.email"
            :error="errors.email"
            placeholder="Masukkan email (opsional)"
          />
          <FormInput
            id="role"
            label="Role"
            v-model="profile.role_name"
            disabled
            hint="Role ditentukan oleh administrator"
          />
        </div>

        <div class="card-actions">
          <AppButton
            variant="primary"
            :loading="loading"
            @click="saveProfile"
          >
            <Icon name="save" :size="16" /> Simpan Perubahan
          </AppButton>
        </div>
      </div>

      <!-- Change Password Section -->
      <div class="settings-section">
        <header class="section-header">
          <div class="section-icon">
            <Icon name="lock" :size="24" />
          </div>
          <div>
            <h2>Ubah Password</h2>
            <p class="section-subtitle">
              Gunakan password yang kuat dan jangan bagikan kepada siapapun.
            </p>
          </div>
        </header>

        <div class="form-grid">
          <FormInput
            id="currentPassword"
            label="Password Lama"
            type="password"
            v-model="passwordForm.currentPassword"
            :error="errors.currentPassword"
            placeholder="Masukkan password lama"
          />
          <FormInput
            id="newPassword"
            label="Password Baru"
            type="password"
            v-model="passwordForm.newPassword"
            :error="errors.newPassword"
            placeholder="Masukkan password baru (min. 6 karakter)"
          />
          <FormInput
            id="confirmPassword"
            label="Konfirmasi Password Baru"
            type="password"
            v-model="passwordForm.confirmPassword"
            :error="errors.confirmPassword"
            placeholder="Masukkan ulang password baru"
          />
        </div>

        <div class="card-actions">
          <AppButton
            variant="primary"
            :loading="passwordLoading"
            @click="changePassword"
          >
            <Icon name="lock" :size="16" /> Ubah Password
          </AppButton>
          <AppButton
            variant="secondary"
            @click="resetPasswordForm"
          >
            Batal
          </AppButton>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import Icon from "@/components/ui/Icon.vue";
import { getCurrentUser } from "@/services/auth";
import { updateOwnProfile } from "@/services/masterData";
import { useNotification } from "@/composables/useNotification";
import { eventBus } from "@/utils/eventBus";

export default {
  name: "UserProfileView",
  components: {
    AppButton,
    FormInput,
    Icon,
  },
  setup() {
    const router = useRouter();
    const { showSuccess, showError } = useNotification();
    const loading = ref(false);
    const passwordLoading = ref(false);
    const errors = ref({});
    
    const profile = ref({
      id: null,
      username: "",
      full_name: "",
      email: "",
      role_name: "",
    });

    const passwordForm = ref({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    const loadProfile = async () => {
      try {
        const user = await getCurrentUser(true);
        if (user) {
          profile.value = {
            id: user.id,
            username: user.username || "",
            full_name: user.full_name || "",
            email: user.email || "",
            role_name: user.role || user.role_name || "",
          };
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        showError("Gagal memuat profil");
      }
    };

    const validateProfile = () => {
      const newErrors = {};
      
      if (!profile.value.full_name || !profile.value.full_name.trim()) {
        newErrors.full_name = "Nama lengkap wajib diisi";
      }

      if (profile.value.email && profile.value.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(profile.value.email.trim())) {
          newErrors.email = "Format email tidak valid";
        }
      }

      errors.value = newErrors;
      return Object.keys(newErrors).length === 0;
    };

    const saveProfile = async () => {
      if (!validateProfile()) return;

      loading.value = true;
      errors.value = {};

      try {
        const updatedUser = await updateOwnProfile({
          full_name: profile.value.full_name.trim(),
          email: profile.value.email ? profile.value.email.trim() : null,
        });

        // Update stored user
        if (updatedUser) {
          profile.value = {
            id: updatedUser.id,
            username: updatedUser.username || profile.value.username,
            full_name: updatedUser.full_name || "",
            email: updatedUser.email || "",
            role_name: updatedUser.role_name || profile.value.role_name,
          };
          
          // Refresh current user in storage
          await getCurrentUser(true);
          
          // Emit event to notify other components (like Topbar) to refresh
          eventBus.emit("user:profileUpdated", updatedUser);
        }

        showSuccess("Profil berhasil diperbarui");
      } catch (error) {
        console.error("Error updating profile:", error);
        showError(error.message || "Gagal memperbarui profil");
      } finally {
        loading.value = false;
      }
    };

    const validatePassword = () => {
      const newErrors = {};

      if (!passwordForm.value.currentPassword) {
        newErrors.currentPassword = "Password lama wajib diisi";
      }

      if (!passwordForm.value.newPassword) {
        newErrors.newPassword = "Password baru wajib diisi";
      } else if (passwordForm.value.newPassword.length < 6) {
        newErrors.newPassword = "Password baru minimal 6 karakter";
      }

      if (!passwordForm.value.confirmPassword) {
        newErrors.confirmPassword = "Konfirmasi password wajib diisi";
      } else if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
        newErrors.confirmPassword = "Password baru dan konfirmasi tidak sama";
      }

      errors.value = newErrors;
      return Object.keys(newErrors).length === 0;
    };

    const changePassword = async () => {
      if (!validatePassword()) return;

      passwordLoading.value = true;
      errors.value = {};

      try {
        const updatedUser = await updateOwnProfile({
          password: passwordForm.value.newPassword,
          currentPassword: passwordForm.value.currentPassword,
        });

        // Refresh current user in storage
        if (updatedUser) {
          await getCurrentUser(true);
          // Emit event to notify other components (like Topbar) to refresh
          eventBus.emit("user:profileUpdated", updatedUser);
        }

        showSuccess("Password berhasil diubah");
        resetPasswordForm();
      } catch (error) {
        console.error("Error changing password:", error);
        showError(error.message || "Gagal mengubah password");
      } finally {
        passwordLoading.value = false;
      }
    };

    const resetPasswordForm = () => {
      passwordForm.value = {
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      };
      errors.value = {};
    };

    onMounted(() => {
      loadProfile();
    });

    return {
      profile,
      passwordForm,
      errors,
      loading,
      passwordLoading,
      saveProfile,
      changePassword,
      resetPasswordForm,
    };
  },
};
</script>

<style scoped>
.settings-page {
  width: 100%;
}

.settings-section {
  padding: 1.75rem 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-section:first-child {
  padding-top: 0;
}

.settings-section:not(:last-child) {
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1.5rem;
  padding-bottom: 1.75rem;
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.section-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.section-icon .icon {
  color: white;
}

.section-icon .icon svg {
  color: white;
  stroke: white;
}

.section-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.section-subtitle {
  margin: 0.5rem 0 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.5;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.card-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-start;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>

