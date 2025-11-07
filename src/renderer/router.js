import { createRouter, createWebHashHistory } from "vue-router";

const Dashboard = () => import("./pages/Dashboard.vue");
const Items = () => import("./pages/master/Items.vue");
const Accessories = () => import("./pages/master/Accessories.vue");
const Bundles = () => import("./pages/master/Bundles.vue");
const Customers = () => import("./pages/master/Customers.vue");
const Categories = () => import("./pages/master/Categories.vue");
const Users = () => import("./pages/master/Users.vue");
const Rental = () => import("./pages/transactions/Rental.vue");
const RentalList = () => import("./pages/transactions/RentalList.vue");
const Sale = () => import("./pages/transactions/Sale.vue");
const SaleList = () => import("./pages/transactions/SaleList.vue");
const DailyReport = () => import("./pages/reports/Daily.vue");
const StockReport = () => import("./pages/reports/Stock.vue");
const StockBundle = () => import("./pages/reports/StockBundle.vue");
const BundleReport = () => import("./pages/reports/BundleReport.vue");
const SystemSettings = () => import("./pages/settings/System.vue");
const BackupSettings = () => import("./pages/settings/Backup.vue");

const routes = [
  {
    path: "/login",
    name: "login",
    component: () => import("./pages/Login.vue"),
  },
  { path: "/", name: "dashboard", component: Dashboard },
  { path: "/master/items", name: "items", component: Items },
  { path: "/master/accessories", name: "accessories", component: Accessories },
  { path: "/master/bundles", name: "bundles", component: Bundles },
  { path: "/master/customers", name: "customers", component: Customers },
  { path: "/master/categories", name: "categories", component: Categories },
  {
    path: "/master/users",
    name: "users",
    component: Users,
    meta: { roles: ["admin", "manager"] },
  },
  { path: "/transactions/rental", name: "rental", component: Rental },
  { path: "/transactions/rentals", name: "rental-list", component: RentalList },
  { path: "/transactions/sale", name: "sale", component: Sale },
  { path: "/transactions/sales", name: "sale-list", component: SaleList },
  { path: "/reports/daily", name: "report-daily", component: DailyReport },
  { path: "/reports/stock", name: "report-stock", component: StockReport },
  { path: "/reports/bundles", name: "report-bundles", component: BundleReport },
  { path: "/stock/bundles", name: "stock-bundles", component: StockBundle },
  {
    path: "/settings/system",
    name: "settings-system",
    component: SystemSettings,
    meta: { roles: ["admin"] },
  },
  {
    path: "/settings/backup",
    name: "settings-backup",
    component: BackupSettings,
    meta: { roles: ["admin", "manager"] },
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// Auth + role guard
router.beforeEach((to, from, next) => {
  if (to.path === "/login") return next();
  const userRaw = localStorage.getItem("currentUser");
  const user = userRaw ? JSON.parse(userRaw) : null;
  if (!user) return next({ path: "/login", query: { redirect: to.fullPath } });
  const required = to.meta?.roles;
  if (required && !required.includes(user.role)) return next("/");
  return next();
});

export default router;
