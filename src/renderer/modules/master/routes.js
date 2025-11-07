import SchemaPage from '../schema/SchemaPage.vue';
import BundlesPage from './BundlesPage.vue';

export const masterRoutes = [
  {
    path: '/master/categories',
    name: 'master-categories',
    component: SchemaPage,
    props: { schemaKey: 'categories' },
    meta: { title: 'Kategori', group: 'master' }
  },
  {
    path: '/master/accessories',
    name: 'master-accessories',
    component: SchemaPage,
    props: { schemaKey: 'accessories' },
    meta: { title: 'Aksesoris', group: 'master' }
  },
  {
    path: '/master/items',
    name: 'master-items',
    component: SchemaPage,
    props: { schemaKey: 'items' },
    meta: { title: 'Barang', group: 'master' }
  },
  {
    path: '/master/bundles',
    name: 'master-bundles',
    component: BundlesPage,
    meta: { title: 'Paket', group: 'master' }
  },
  {
    path: '/master/bundle-details',
    name: 'master-bundle-details',
    component: SchemaPage,
    props: { schemaKey: 'bundle_details' },
    meta: { title: 'Detail Paket', group: 'master' }
  },
  {
    path: '/master/customers',
    name: 'master-customers',
    component: SchemaPage,
    props: { schemaKey: 'customers' },
    meta: { title: 'Pelanggan', group: 'master' }
  },
  {
    path: '/master/roles',
    name: 'master-roles',
    component: SchemaPage,
    props: { schemaKey: 'roles' },
    meta: { title: 'Peran', group: 'master' }
  },
  {
    path: '/master/users',
    name: 'master-users',
    component: SchemaPage,
    props: { schemaKey: 'users' },
    meta: { title: 'Pengguna', group: 'master' }
  }
];

export default masterRoutes;

