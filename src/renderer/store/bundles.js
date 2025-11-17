import { defineStore } from "pinia";
import { fetchBundles } from "@/services/masterData";

export const useBundleStore = defineStore("bundles", {
  state: () => ({
    bundles: [],
    loading: false,
    error: null,
  }),

  getters: {
    saleBundles: (state) =>
      state.bundles.filter(
        (bundle) =>
          (bundle.bundle_type === "sale" || bundle.bundle_type === "both") && bundle.is_active,
      ),
    rentalBundles: (state) =>
      state.bundles.filter(
        (bundle) =>
          (bundle.bundle_type === "rental" || bundle.bundle_type === "both") && bundle.is_active,
      ),
  },

  actions: {
    async fetchBundles(force = false) {
      if (!force && this.bundles.length) return;
      this.loading = true;
      try {
        const bundles = await fetchBundles();
        this.bundles = bundles;
        this.error = null;
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
  },
});
