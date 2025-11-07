import { createRouter, createWebHashHistory } from 'vue-router';
import Dashboard from './modules/common/Dashboard.vue';
import Login from './modules/common/Login.vue';
import masterRoutes from './modules/master/routes.js';
import transactionRoutes from './modules/transactions/routes.js';
import reportRoutes from './modules/reports/routes.js';
import settingsRoutes from './modules/settings/routes.js';

const routes = [
  { path: '/', name: 'dashboard', component: Dashboard },
  { path: '/login', name: 'login', component: Login },
  ...masterRoutes,
  ...transactionRoutes,
  ...reportRoutes,
  ...settingsRoutes,
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  if (to.path === '/login') return next();
  const raw = localStorage.getItem('currentUser');
  const user = raw ? JSON.parse(raw) : null;
  if (!user) return next({ path: '/login', query: { redirect: to.fullPath } });
  return next();
});

export default router;
