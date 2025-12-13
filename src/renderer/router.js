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
import UsersView from "./views/master/UsersView.vue";
import UserRoleManagementView from "./views/master/UserRoleManagementView.vue";
import SettingsPage from "./views/settings/SettingsPage.vue";
import ReceiptSettingsPage from "./views/settings/ReceiptSettingsPage.vue";
import BackupHistoryView from "./views/settings/BackupHistoryView.vue";
import ActivityLogsView from "./views/settings/ActivityLogsView.vue";
import SyncServiceView from "./views/settings/SyncServiceView.vue";
import UserProfileView from "./views/UserProfileView.vue";
import StockMovementsView from "./views/transaction/StockMovementsView.vue";
import ReportExportView from "./views/reports/ReportExportView.vue";
import StockAlertManagementView from "./views/stock/StockAlertManagementView.vue";
import BulkLabelGeneratorView from "./views/master/BulkLabelGeneratorView.vue";
import SearchResultsView from "./views/SearchResultsView.vue";
import CashierLayout from "./components/cashier/CashierLayout.vue";
import CashierHome from "./views/cashier/CashierHome.vue";
import CashierTransactionPage from "./views/cashier/CashierTransactionPage.vue";
import CashierTransactionsHistoryPage from "./views/cashier/CashierTransactionsHistoryPage.vue";
import CashierSalePage from "./views/cashier/CashierSalePage.vue";
import CashierRentalPage from "./views/cashier/CashierRentalPage.vue";
import CashierSessionPage from "./views/cashier/CashierSessionPage.vue";
import CashierCustomersPage from "./views/cashier/CashierCustomersPage.vue";
import CashierSalesTransactionsView from "./views/cashier/CashierSalesTransactionsView.vue";
import CashierRentalsTransactionsView from "./views/cashier/CashierRentalsTransactionsView.vue";
import SalesTransactionsView from "./views/transaction/SalesTransactionsView.vue";
import SalesTransactionCreateView from "./views/transaction/SalesTransactionCreateView.vue";
import SalesTransactionEditView from "./views/transaction/SalesTransactionEditView.vue";
import SaleTransactionDetailView from "./views/transaction/SaleTransactionDetailView.vue";
import SaleTransactionPaymentView from "./views/transaction/SaleTransactionPaymentView.vue";
import RentalTransactionsView from "./views/transaction/RentalTransactionsView.vue";
import RentalTransactionCreateView from "./views/transaction/RentalTransactionCreateView.vue";
import RentalTransactionEditView from "./views/transaction/RentalTransactionEditView.vue";
import RentalTransactionDetailView from "./views/transaction/RentalTransactionDetailView.vue";
import RentalTransactionPaymentView from "./views/transaction/RentalTransactionPaymentView.vue";
import { getCurrentUser } from "./services/auth.js";
import { checkActivationStatus } from "./services/activation.js";

const routes = [
  { path: "/", name: "dashboard", component: Dashboard },
  { path: "/login", name: "login", component: Login },
  { path: "/activation", name: "activation", component: Activation },
  {
    path: "/cashier",
    component: CashierLayout,
    children: [
      { path: "", name: "cashier-home", component: CashierHome },
      {
        path: "transaction",
        name: "cashier-transaction",
        component: CashierTransactionPage,
      },
      {
        path: "transactions",
        name: "cashier-transactions-history",
        component: CashierTransactionsHistoryPage,
      },
      { path: "sale", name: "cashier-sale", component: CashierSalePage },
      { path: "rental", name: "cashier-rental", component: CashierRentalPage },
      {
        path: "transactions/sales",
        name: "cashier-transactions-sales",
        component: CashierSalesTransactionsView,
      },
      {
        path: "transactions/rentals",
        name: "cashier-transactions-rentals",
        component: CashierRentalsTransactionsView,
      },
      {
        path: "transactions/sales/:code",
        name: "cashier-transaction-sale-detail",
        component: SaleTransactionDetailView,
      },
      {
        path: "transactions/rentals/:code",
        name: "cashier-transaction-rental-detail",
        component: RentalTransactionDetailView,
      },
      {
        path: "customers",
        name: "cashier-customers",
        component: CashierCustomersPage,
      },
      {
        path: "session",
        name: "cashier-session",
        component: CashierSessionPage,
      },
    ],
  },
  { path: "/search", name: "search-results", component: SearchResultsView },
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
  {
    path: "/master/bulk-labels",
    name: "bulk-labels",
    component: BulkLabelGeneratorView,
  },
  { path: "/master/customers", name: "customers", component: CustomersView },
  {
    path: "/master/discount-groups",
    name: "discount-groups",
    component: DiscountGroupsView,
  },
  { path: "/master/users", name: "users", component: UsersView },
  {
    path: "/master/user-role-management",
    name: "user-role-management",
    component: UserRoleManagementView,
  },
  // Stock & Warehouse
  {
    path: "/transactions/stock-movements",
    name: "transactions-stock-movements",
    component: StockMovementsView,
  },
  // Sales Transactions
  {
    path: "/transactions/sales",
    name: "transactions-sales",
    component: SalesTransactionsView,
  },
  {
    path: "/transactions/sales/create",
    name: "transaction-sale-create",
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
    path: "/transactions/sales/:code/payment",
    name: "transaction-sale-payment",
    component: SaleTransactionPaymentView,
  },
  // Rental Transactions
  {
    path: "/transactions/rentals",
    name: "transactions-rentals",
    component: RentalTransactionsView,
  },
  {
    path: "/transactions/rentals/create",
    name: "transaction-rental-create",
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
    path: "/transactions/rentals/:code/payment",
    name: "transaction-rental-payment",
    component: RentalTransactionPaymentView,
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
  {
    path: "/settings/sync-service",
    name: "settings-sync-service",
    component: SyncServiceView,
  },
  {
    path: "/profile",
    name: "user-profile",
    component: UserProfileView,
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
        console.warn(
          "Application not activated, redirecting to activation page",
          activationStatus
        );
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

    // Simple role-based access control
    // Cashier users can ONLY access cashier pages
    if (user.role === "kasir") {
      if (to.path.startsWith("/cashier")) {
        return next();
      }
      // Redirect cashier to cashier page if trying to access any other page
      return next({ path: "/cashier" });
    }

    // Admin has access to everything except cashier pages
    if (user.role === "admin") {
      // Admin cannot access cashier pages
      if (to.path.startsWith("/cashier")) {
        return next({ path: "/" });
      }
      return next();
    }

    // If role is neither kasir nor admin, redirect to login
    console.warn("Unknown role:", user.role);
    return next({ path: "/login", query: { redirect: to.fullPath } });
  } catch (error) {
    console.error("Router guard auth error:", error);
    return next({ path: "/login", query: { redirect: to.fullPath } });
  }
});

export default router;
