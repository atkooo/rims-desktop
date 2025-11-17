import { createRouter, createWebHashHistory } from "vue-router";
import Dashboard from "./views/Dashboard.vue";
import Login from "./views/Login.vue";
import Activation from "./views/Activation.vue";
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
import UserRoleManagementView from "./views/master/UserRoleManagementView.vue";
import SettingsPage from "./views/settings/SettingsPage.vue";
import ReceiptSettingsPage from "./views/settings/ReceiptSettingsPage.vue";
import BackupHistoryView from "./views/settings/BackupHistoryView.vue";
import ActivityLogsView from "./views/settings/ActivityLogsView.vue";
import RentalTransactionsView from "./views/transaction/RentalTransactionsView.vue";
import SalesTransactionsView from "./views/transaction/SalesTransactionsView.vue";
import StockMovementsView from "./views/transaction/StockMovementsView.vue";
import CashierView from "./views/transaction/CashierView.vue";
import RentalTransactionDetailView from "./views/transaction/RentalTransactionDetailView.vue";
import SaleTransactionDetailView from "./views/transaction/SaleTransactionDetailView.vue";
import RentalTransactionCreateView from "./views/transaction/RentalTransactionCreateView.vue";
import SalesTransactionCreateView from "./views/transaction/SalesTransactionCreateView.vue";
import SalesTransactionEditView from "./views/transaction/SalesTransactionEditView.vue";
import RentalTransactionEditView from "./views/transaction/RentalTransactionEditView.vue";
import ReportExportView from "./views/reports/ReportExportView.vue";
import StockAlertManagementView from "./views/stock/StockAlertManagementView.vue";
import { getCurrentUser } from "./services/auth.js";
import {
  hasPermissionSync,
  hasAnyPermissionSync,
  initPermissions,
} from "./composables/usePermissions.js";
import { checkActivationStatus } from "./services/activation.js";

// Route permission mapping
const routePermissions = {
  "/": "dashboard.view",
  // Master Data
  "/master/categories": "master.categories.view",
  "/master/accessories": "master.accessories.view",
  "/master/items": "master.items.view",
  "/master/item-sizes": "master.item-sizes.view",
  "/master/bundles": "master.bundles.view",
  "/master/bundle-details": "master.bundles.view",
  "/master/customers": "master.customers.view",
  "/master/discount-groups": "master.discount-groups.view",
  "/master/roles": "roles.view",
  "/master/users": "users.view",
  "/master/user-role-management": ["users.view", "roles.view"],
  // Transactions
  "/transactions/rentals": "transactions.rentals.view",
  "/transactions/rentals/new": "transactions.rentals.create",
  "/transactions/sales": "transactions.sales.view",
  "/transactions/sales/new": "transactions.sales.create",
  "/transactions/stock-movements": "transactions.stock-movements.view",
  "/transactions/cashier": "transactions.cashier.manage",
  "/stock/alerts": "transactions.stock-movements.view",
  // Settings
  "/settings/system": "settings.view",
  "/settings/receipt": "settings.view",
  "/settings/backup-history": "settings.backup.view",
  "/settings/activity-logs": "settings.activity-logs.view",
  // Reports
  "/reports/executive": "reports.transactions.view",
  "/reports/finance": "reports.transactions.view",
  "/reports/stock": "reports.stock.view",
};

const routes = [
  { path: "/", name: "dashboard", component: Dashboard },
  { path: "/login", name: "login", component: Login },
  { path: "/activation", name: "activation", component: Activation },
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
  {
    path: "/master/discount-groups",
    name: "discount-groups",
    component: DiscountGroupsView,
  },
  { path: "/master/roles", name: "roles", component: RolesView },
  { path: "/master/users", name: "users", component: UsersView },
  {
    path: "/master/user-role-management",
    name: "user-role-management",
    component: UserRoleManagementView,
  },
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
    path: "/transactions/rentals/:code/edit",
    name: "transaction-rental-edit",
    component: RentalTransactionEditView,
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
    path: "/transactions/sales/:code/edit",
    name: "transaction-sale-edit",
    component: SalesTransactionEditView,
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
  {
    path: "/stock/alerts",
    name: "stock-alerts",
    component: StockAlertManagementView,
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
  // Reports
  {
    path: "/reports/executive",
    name: "reports-executive",
    component: ReportExportView,
    props: {
      reportType: "executive",
      reportTitle: "Laporan Eksekutif",
      reportDescription: "Laporan ringkasan eksekutif untuk manajemen",
    },
  },
  {
    path: "/reports/finance",
    name: "reports-finance",
    component: ReportExportView,
    props: {
      reportType: "finance",
      reportTitle: "Laporan Finance",
      reportDescription: "Laporan keuangan dan pembayaran",
    },
  },
  {
    path: "/reports/stock",
    name: "reports-stock",
    component: ReportExportView,
    props: {
      reportType: "stock",
      reportTitle: "Laporan Stok",
      reportDescription: "Laporan stok barang dan mutasi",
    },
  },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  // Allow access to activation and login pages without activation check
  if (to.path === "/activation" || to.path === "/login") {
    return next();
  }

  // Check activation status first (except for activation and login pages)
  try {
    const activationStatus = await checkActivationStatus();
    
    // If not active, redirect to activation page
    // Allow offline mode only if explicitly marked as active before going offline
    if (!activationStatus.isActive) {
      // Only redirect if not already on activation page
      if (to.path !== "/activation") {
        console.warn("Application not activated, redirecting to activation page", activationStatus);
        return next({ path: "/activation", query: { redirect: to.fullPath } });
      }
    }
  } catch (error) {
    console.error("Error checking activation status:", error);
    // On error checking activation, redirect to activation page to be safe
    if (to.path !== "/activation") {
      console.warn("Error checking activation, redirecting to activation page");
      return next({ path: "/activation", query: { redirect: to.fullPath } });
    }
  }

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
        let hasAccess;
        // Support both single permission string and array of permissions
        if (Array.isArray(requiredPermission)) {
          hasAccess = hasAnyPermissionSync(requiredPermission);
        } else {
          hasAccess = hasPermissionSync(requiredPermission);
        }
        if (!hasAccess) {
          // User doesn't have permission, redirect to dashboard
          console.warn(
            `Access denied: User doesn't have permission ${JSON.stringify(requiredPermission)} for ${to.path}`,
          );
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
    // Edit routes require update permission
    if (
      to.path.startsWith("/transactions/rentals/") &&
      to.path !== "/transactions/rentals/new"
    ) {
      try {
        // Edit route requires update permission
        if (to.path.endsWith("/edit")) {
          const hasAccess = hasPermissionSync("transactions.rentals.update");
          if (!hasAccess) {
            return next({ path: "/" });
          }
        } else {
          // Detail/view route requires view permission
          const hasAccess = hasPermissionSync("transactions.rentals.view");
          if (!hasAccess) {
            return next({ path: "/" });
          }
        }
      } catch (error) {
        console.error("Error checking permission:", error);
        return next();
      }
    }
    if (
      to.path.startsWith("/transactions/sales/") &&
      to.path !== "/transactions/sales/new"
    ) {
      try {
        // Edit route requires update permission
        if (to.path.endsWith("/edit")) {
          const hasAccess = hasPermissionSync("transactions.sales.update");
          if (!hasAccess) {
            return next({ path: "/" });
          }
        } else {
          // Detail/view route requires view permission
          const hasAccess = hasPermissionSync("transactions.sales.view");
          if (!hasAccess) {
            return next({ path: "/" });
          }
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
    if (
      to.path.startsWith("/master/bundles/") &&
      !to.path.includes("/bundle-details")
    ) {
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
