import { createRouter, createWebHashHistory } from "vue-router";
import Dashboard from "./views/Dashboard.vue";
import Login from "./views/Login.vue";
import Categories from "./views/master/Categories.vue";
import AccessoriesView from "./views/master/AccessoriesView.vue";
import ItemsPage from "./views/master/ItemsPage.vue";
import ItemSizesView from "./views/master/ItemSizesView.vue";
import BundlesView from "./views/master/BundlesView.vue";
import BundlesDetailView from "./views/master/BundlesDetailView.vue";
import CustomersView from "./views/master/CustomersView.vue";
import RolesView from "./views/master/RolesView.vue";
import UsersView from "./views/master/UsersView.vue";
import ReportsPage from "./views/reports/ReportsPage.vue";
import SettingsPage from "./views/settings/SettingsPage.vue";
import BackupHistoryView from "./views/settings/BackupHistoryView.vue";
import ActivityLogsView from "./views/settings/ActivityLogsView.vue";
import ItemsWithStockView from "./views/reports/ItemsWithStockView.vue";
import DailySalesView from "./views/reports/DailySalesView.vue";
import StockAlertsView from "./views/reports/StockAlertsView.vue";
import TopCustomersView from "./views/reports/TopCustomersView.vue";
import RentalTransactionsView from "./views/transaction/RentalTransactionsView.vue";
import SalesTransactionsView from "./views/transaction/SalesTransactionsView.vue";
import BookingsView from "./views/transaction/BookingsView.vue";
import StockMovementsView from "./views/transaction/StockMovementsView.vue";
import PaymentsView from "./views/transaction/PaymentsView.vue";
import { getCurrentUser } from "./services/auth.js";

const routes = [
  { path: "/", name: "dashboard", component: Dashboard },
  { path: "/login", name: "login", component: Login },
  // Master Data
  { path: "/master/categories", name: "categories", component: Categories },
  {
    path: "/master/accessories",
    name: "accessories",
    component: AccessoriesView,
  },
  { path: "/master/items", name: "items", component: ItemsPage },
  {
    path: "/master/item-sizes",
    name: "item-sizes",
    component: ItemSizesView,
  },
  { path: "/master/bundles", name: "bundles", component: BundlesView },
  {
    path: "/master/bundle-details",
    name: "bundle-details",
    component: BundlesDetailView,
  },
  { path: "/master/customers", name: "customers", component: CustomersView },
  { path: "/master/roles", name: "roles", component: RolesView },
  { path: "/master/users", name: "users", component: UsersView },
  // Transactions (read-only views)
  {
    path: "/transactions/rentals",
    name: "transactions-rentals",
    component: RentalTransactionsView,
  },
  {
    path: "/transactions/sales",
    name: "transactions-sales",
    component: SalesTransactionsView,
  },
  {
    path: "/transactions/bookings",
    name: "transactions-bookings",
    component: BookingsView,
  },
  {
    path: "/transactions/stock-movements",
    name: "transactions-stock-movements",
    component: StockMovementsView,
  },
  {
    path: "/transactions/payments",
    name: "transactions-payments",
    component: PaymentsView,
  },
  // Reports
  {
    path: "/reports",
    name: "reports",
    component: ReportsPage,
  },
  {
    path: "/reports/items-with-stock",
    name: "reports-items-stock",
    component: ItemsWithStockView,
  },
  {
    path: "/reports/daily-sales",
    name: "reports-daily-sales",
    component: DailySalesView,
  },
  {
    path: "/reports/stock-alerts",
    name: "reports-stock-alerts",
    component: StockAlertsView,
  },
  {
    path: "/reports/top-customers",
    name: "reports-top-customers",
    component: TopCustomersView,
  },
  {
    path: "/settings/system",
    name: "settings-system",
    component: SettingsPage,
  },
  {
    path: "/settings/backup-history",
    name: "settings-backup",
    component: BackupHistoryView,
  },
  {
    path: "/settings/activity-logs",
    name: "settings-activity",
    component: ActivityLogsView,
  },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  if (to.path === "/login") return next();

  try {
    const user = await getCurrentUser();
    if (!user)
      return next({ path: "/login", query: { redirect: to.fullPath } });
    return next();
  } catch (error) {
    console.error("Router guard auth error:", error);
    return next({ path: "/login", query: { redirect: to.fullPath } });
  }
});

export default router;
