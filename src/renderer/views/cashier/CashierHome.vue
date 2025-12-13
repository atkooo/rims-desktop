<template>
  <div class="cashier-home">
    <div class="home-container">
      <h2 class="home-title">Pilih Menu</h2>
      <p class="home-subtitle">Pilih transaksi yang ingin Anda lakukan</p>

      <div class="menu-grid">
        <div
          v-for="menu in menuItems"
          :key="menu.path"
          class="menu-card"
          @click="navigateTo(menu.path)"
        >
          <div class="menu-icon">{{ menu.icon }}</div>
          <h3 class="menu-title">{{ menu.title }}</h3>
          <p class="menu-description">{{ menu.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useRouter } from "vue-router";

export default {
  name: "CashierHome",
  setup() {
    const router = useRouter();

    const menuItems = [
      {
        path: "/cashier/sale",
        icon: "💰",
        title: "Penjualan",
        description: "Buat transaksi penjualan baru",
      },
      {
        path: "/cashier/rental",
        icon: "📦",
        title: "Rental",
        description: "Buat transaksi rental baru",
      },
      {
        path: "/cashier/session",
        icon: "💳",
        title: "Sesi Kasir",
        description: "Kelola sesi kasir",
      },
    ];

    const navigateTo = (path) => {
      router.push(path);
    };

    return {
      menuItems,
      navigateTo,
    };
  },
};
</script>

<style scoped>
.cashier-home {
  padding: 2rem;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-container {
  width: 100%;
  max-width: 1200px;
}

.home-title {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
  text-align: center;
}

.home-subtitle {
  font-size: 1rem;
  color: #6b7280;
  margin: 0 0 3rem 0;
  text-align: center;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.menu-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.menu-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  border-color: #4f46e5;
}

.menu-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.menu-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.menu-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}
</style>

