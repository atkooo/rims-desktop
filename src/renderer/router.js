import { createRouter, createWebHashHistory } from "vue-router";
import Dashboard from "./views/Dashboard.vue";
import Login from "./views/Login.vue";
import Categories from "./views/master/Categories.vue";
import AccessoriesView from "./views/master/AccessoriesView.vue";
import AccessoryDetailView from "./views/master/AccessoryDetailView.vue";
import ItemsPage from "./views/master/ItemsPage.vue";
import ItemSizesView from "./views/master/ItemSizesView.vue";
import BundlesView from "./views/master/BundlesView.vue";
import BundlesDetailView from "./views/master/BundlesDetailView.vue";
import BundleDetailPageView from "./views/master/BundleDetailPageView.vue";
import ItemDetailView from "./views/master/ItemDetailView.vue";
import CustomersView from "./views/master/CustomersView.vue";
import DiscountGroupsView from "./views/master/DiscountGroupsView.vue";
import RolesView from "./views/master/RolesView.vue";
import UsersView from "./views/master/UsersView.vue";
import ReportsPage from "./views/reports/ReportsPage.vue";
import SettingsPage from "./views/settings/SettingsPage.vue";
import ReceiptSettingsPage from "./views/settings/ReceiptSettingsPage.vue";
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
import CashierView from "./views/transaction/CashierView.vue";
import RentalTransactionDetailView from "./views/transaction/RentalTransactionDetailView.vue";
import SaleTransactionDetailView from "./views/transaction/SaleTransactionDetailView.vue";
import RentalTransactionCreateView from "./views/transaction/RentalTransactionCreateView.vue";
import SalesTransactionCreateView from "./views/transaction/SalesTransactionCreateView.vue";
import { getCurrentUser } from "./services/auth.js";
import { hasPermissionSync, initPermissions } from "./composables/usePermissions.js";

// Route permission mapping
const routePermissions = {
  "/": "dashboard.view",
  "/master/categories": "master.categories.view",
  "/master/accessories": "master.accessories.view",
  "/master/items": "master.items.view",
  "/master/item-sizes": "master.item-sizes.view",
  "/master/bundles": "master.bundles.view",
  "/master/customers": "master.customers.view",
  "/master/discount-groups": "master.discount-groups.view",
  "/master/roles": "roles.view",
  "/master/users": "users.view",
  "/transactions/rentals": "transactions.rentals.view",
  "/transactions/rentals/new": "transactions.rentals.create",
  "/transactions/sales": "transactions.sales.view",
  "/transactions/sales/new": "transactions.sales.create",
  "/transactions/bookings": "transactions.bookings.view",
  "/transactions/stock-movements": "transactions.stock-movements.view",
  "/transactions/cashier": "transactions.cashier.manage",
  "/reports": "reports.view",
  "/reports/items-with-stock": "reports.items-stock.view",
  "/reports/daily-sales": "reports.daily-sales.view",
  "/reports/stock-alerts": "reports.stock-alerts.view",
  "/reports/top-customers": "reports.top-customers.view",
  "/settings/system": "settings.view",
  "/settings/receipt": "settings.view",
  "/settings/backup-history": "settings.backup.view",
  "/settings/activity-logs": "settings.activity-logs.view",
};

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
  {
    path: "/master/accessories/:id",
    name: "accessory-detail",
    component: AccessoryDetailView,
  },
  { path: "/master/items", name: "items", component: ItemsPage },
  {
    path: "/master/item-sizes",
    name: "item-sizes",
    component: ItemSizesView,
  },
  { path: "/master/bundles", name: "bundles", component: BundlesView },
  {
    path: "/master/bundles/:id",
    name: "bundle-detail",
    component: BundleDetailPageView,
  },
  {
    path: "/master/bundle-details",
    name: "bundle-details",
    component: BundlesDetailView,
  },
  {
    path: "/master/items/:id",
    name: "item-detail",
    component: ItemDetailView,
  },
  { path: "/master/customers", name: "customers", component: CustomersView },
  { path: "/master/discount-groups", name: "discount-groups", component: DiscountGroupsView },
  { path: "/master/roles", name: "roles", component: RolesView },
  { path: "/master/users", name: "users", component: UsersView },
  // Transactions (read-only views)
  {
    path: "/transactions/rentals",
    name: "transactions-rentals",
    component: RentalTransactionsView,
  },
  {
    path: "/transactions/rentals/new",
    name: "transaction-rental-new",
    component: RentalTransactionCreateView,
  },
  {
    path: "/transactions/rentals/:code",
    name: "transaction-rental-detail",
    component: RentalTransactionDetailView,
  },
  {
    path: "/transactions/rentals/:id/payment",
    name: "transaction-rental-payment",
    component: () => import("./views/transaction/RentalTransactionPaymentView.vue"),
  },
  {
    path: "/transactions/sales",
    name: "transactions-sales",
    component: SalesTransactionsView,
  },
  {
    path: "/transactions/sales/new",
    name: "transaction-sale-new",
    component: SalesTransactionCreateView,
  },
  {
    path: "/transactions/sales/:code",
    name: "transaction-sale-detail",
    component: SaleTransactionDetailView,
  },
  {
    path: "/transactions/sales/:id/payment",
    name: "transaction-sale-payment",
    component: () => import("./views/transaction/SaleTransactionPaymentView.vue"),
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
    path: "/transactions/cashier",
    name: "transactions-cashier",
    component: CashierView,
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
    path: "/settings/receipt",
    name: "settings-receipt",
    component: ReceiptSettingsPage,
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
    if (!user) {
      return next({ path: "/login", query: { redirect: to.fullPath } });
    }

    // Initialize permissions
    try {
      await initPermissions();
    } catch (error) {
      console.error("Error initializing permissions in router:", error);
      // Continue anyway, permissions will be checked but may allow access if check fails
    }

    // Admin has access to everything, skip permission check
    if (user.role === "admin") {
      return next();
    }

    // Dashboard is accessible to all authenticated users
    if (to.path === "/") {
      return next();
    }

    // Check route permission
    const requiredPermission = routePermissions[to.path];
    if (requiredPermission) {
      try {
        const hasAccess = hasPermissionSync(requiredPermission);
        if (!hasAccess) {
          // User doesn't have permission, redirect to dashboard
          console.warn(`Access denied: User doesn't have permission ${requiredPermission} for ${to.path}`);
          return next({ path: "/" });
        }
      } catch (error) {
        console.error("Error checking permission:", error);
        // If permission check fails, allow access (graceful degradation)
        return next();
      }
    }

    // For dynamic routes, check parent route permission
    // e.g., /transactions/rentals/:code should check transactions.rentals.view
    if (to.path.startsWith("/transactions/rentals/") && to.path !== "/transactions/rentals/new") {
      try {
        const hasAccess = hasPermissionSync("transactions.rentals.view");
        if (!hasAccess) {
          return next({ path: "/" });
        }
      } catch (error) {
        console.error("Error checking permission:", error);
        return next();
      }
    }
    if (to.path.startsWith("/transactions/sales/") && to.path !== "/transactions/sales/new") {
      try {
        const hasAccess = hasPermissionSync("transactions.sales.view");
        if (!hasAccess) {
          return next({ path: "/" });
        }
      } catch (error) {
        console.error("Error checking permission:", error);
        return next();
      }
    }
    if (to.path.startsWith("/master/accessories/")) {
      try {
        const hasAccess = hasPermissionSync("master.accessories.view");
        if (!hasAccess) {
          return next({ path: "/" });
        }
      } catch (error) {
        console.error("Error checking permission:", error);
        return next();
      }
    }
    if (to.path.startsWith("/master/bundles/") && !to.path.includes("/bundle-details")) {
      try {
        const hasAccess = hasPermissionSync("master.bundles.view");
        if (!hasAccess) {
          return next({ path: "/" });
        }
      } catch (error) {
        console.error("Error checking permission:", error);
        return next();
      }
    }
    if (to.path.startsWith("/master/items/")) {
      try {
        const hasAccess = hasPermissionSync("master.items.view");
        if (!hasAccess) {
          return next({ path: "/" });
        }
      } catch (error) {
        console.error("Error checking permission:", error);
        return next();
      }
    }

    return next();
  } catch (error) {
    console.error("Router guard auth error:", error);
    return next({ path: "/login", query: { redirect: to.fullPath } });
  }
});

export default router;
