<template>
    <div class="login-card">
        <h1>Masuk ke RIMS Desktop</h1>
        <p>Gunakan kredensial yang terdaftar di database untuk melanjutkan.</p>

        <form class="login-form" @submit.prevent="handleSubmit">
            <label>
                <span>Username</span>
                <input v-model.trim="username" type="text" autocomplete="username" placeholder="admin" required />
            </label>
            <label>
                <span>Password</span>
                <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password"
                    placeholder="••••••" required />
            </label>
            <label class="checkbox">
                <input type="checkbox" v-model="showPassword" />
                <span>Tampilkan password</span>
            </label>

            <button type="submit" :disabled="loading">
                <span v-if="loading">Memproses...</span>
                <span v-else>Masuk</span>
            </button>
        </form>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        <small>Default admin: <code>admin / admin123</code> (ubah via modul pengguna).</small>
    </div>
</template>

<script>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { login } from "@/services/auth.js";

export default {
    name: "LoginPage",
    setup() {
        const router = useRouter();
        const route = useRoute();

        const username = ref("");
        const password = ref("");
        const showPassword = ref(false);
        const loading = ref(false);
        const errorMessage = ref("");

        const handleSubmit = async () => {
            if (loading.value) return;
            loading.value = true;
            errorMessage.value = "";
            try {
                await login(username.value, password.value);
                const redirect = route.query.redirect || "/";
                router.push(redirect);
            } catch (error) {
                console.error("Login gagal", error);
                errorMessage.value = error?.message || "Login gagal. Periksa username / password.";
            } finally {
                loading.value = false;
            }
        };

        return {
            username,
            password,
            showPassword,
            loading,
            errorMessage,
            handleSubmit,
        };
    },
};
</script>

<style scoped>
.login-card {
    max-width: 360px;
    width: 100%;
    border-radius: 12px;
    border: 1px solid var(--border);
    padding: 24px;
    background: #fff;
    text-align: center;
}

.login-card h1 {
    font-size: 24px;
    margin-top: 0;
    margin-bottom: 8px;
}

.login-card p {
    color: #475569;
    margin-bottom: 24px;
}

.login-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    text-align: left;
}

label {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

label span {
    font-size: 14px;
    font-weight: 500;
}

input {
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: 6px;
}

.checkbox {
    flex-direction: row;
    align-items: center;
    gap: 8px;
}

button {
    background: var(--primary);
    color: white;
    border: none;
    padding: 10px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
}

button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.error {
    color: var(--danger);
    margin-top: 16px;
}

small {
    display: block;
    margin-top: 24px;
    color: #64748b;
}

code {
    background: #f1f5f9;
    padding: 2px 4px;
    border-radius: 4px;
    font-size: 12px;
}
</style>