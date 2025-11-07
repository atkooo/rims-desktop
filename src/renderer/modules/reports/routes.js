import SchemaPage from '../schema/SchemaPage.vue';

export const reportRoutes = [
  {
    path: '/reports/items-with-stock',
    name: 'reports-items-with-stock',
    component: SchemaPage,
    props: { schemaKey: 'v_items_with_stock' },
    meta: { title: 'Item dengan Stok', group: 'reports' }
  },
  {
    path: '/reports/active-rentals',
    name: 'reports-active-rentals',
    component: SchemaPage,
    props: { schemaKey: 'v_active_rentals' },
    meta: { title: 'Sewa Aktif', group: 'reports' }
  },
  {
    path: '/reports/daily-sales',
    name: 'reports-daily-sales',
    component: SchemaPage,
    props: { schemaKey: 'v_daily_sales' },
    meta: { title: 'Penjualan Harian', group: 'reports' }
  },
  {
    path: '/reports/stock-alerts',
    name: 'reports-stock-alerts',
    component: SchemaPage,
    props: { schemaKey: 'v_stock_alerts' },
    meta: { title: 'Peringatan Stok', group: 'reports' }
  },
  {
    path: '/reports/top-customers',
    name: 'reports-top-customers',
    component: SchemaPage,
    props: { schemaKey: 'v_top_customers' },
    meta: { title: 'Pelanggan Teratas', group: 'reports' }
  }
];

export default reportRoutes;

