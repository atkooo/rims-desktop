import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    isAuthenticated: false,
  }),

  actions: {
    setUser(userData) {
      this.user = userData;
      this.isAuthenticated = true;
      localStorage.setItem("user", JSON.stringify(userData));
    },

    logout() {
      this.user = null;
      this.isAuthenticated = false;
      localStorage.removeItem("user");
    },

    checkAuth() {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        this.user = JSON.parse(savedUser);
        this.isAuthenticated = true;
      }
    },
  },
});
