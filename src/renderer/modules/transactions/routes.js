import SchemaPage from '../schema/SchemaPage.vue';

export const transactionRoutes = [
  {
    path: '/transactions/rentals',
    name: 'transactions-rentals',
    component: SchemaPage,
    props: { schemaKey: 'rental_transactions' },
    meta: { title: 'Transaksi Sewa', group: 'transactions' }
  },
  {
    path: '/transactions/rental-details',
    name: 'transactions-rental-details',
    component: SchemaPage,
    props: { schemaKey: 'rental_transaction_details' },
    meta: { title: 'Detail Sewa', group: 'transactions' }
  },
  {
    path: '/transactions/sales',
    name: 'transactions-sales',
    component: SchemaPage,
    props: { schemaKey: 'sales_transactions' },
    meta: { title: 'Transaksi Penjualan', group: 'transactions' }
  },
  {
    path: '/transactions/sales-details',
    name: 'transactions-sales-details',
    component: SchemaPage,
    props: { schemaKey: 'sales_transaction_details' },
    meta: { title: 'Detail Penjualan', group: 'transactions' }
  },
  {
    path: '/transactions/bookings',
    name: 'transactions-bookings',
    component: SchemaPage,
    props: { schemaKey: 'bookings' },
    meta: { title: 'Booking Barang', group: 'transactions' }
  },
  {
    path: '/transactions/stock-movements',
    name: 'transactions-stock-movements',
    component: SchemaPage,
    props: { schemaKey: 'stock_movements' },
    meta: { title: 'Pergerakan Stok', group: 'transactions' }
  },
  {
    path: '/transactions/payments',
    name: 'transactions-payments',
    component: SchemaPage,
    props: { schemaKey: 'payments' },
    meta: { title: 'Pembayaran', group: 'transactions' }
  }
];

export default transactionRoutes;

