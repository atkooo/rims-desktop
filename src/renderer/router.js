import { createRouter, createWebHashHistory } from "vue-router";
import Dashboard from "./views/Dashboard.vue";
import Login from "./views/Login.vue";
import Categories from "./views/master/Categories.vue";
import { getCurrentUser } from "./services/auth.js";

const routes = [
  { path: "/", name: "dashboard", component: Dashboard },
  { path: "/login", name: "login", component: Login },
  // Master Data
  { path: "/master/categories", name: "categories", component: Categories },
  // Fallback route
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
