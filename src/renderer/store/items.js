import { defineStore } from "pinia";
import { ipcRenderer } from "@/services/ipc";

export const useItemStore = defineStore("items", {
  state: () => ({
    items: [],
    sizes: [],
    loading: false,
    sizesLoading: false,
    error: null,
  }),

  getters: {
    // Get item by id
    getItemById: (state) => (id) => {
      return state.items.find((item) => item.id === id);
    },

    // Get items by type
    getItemsByType: (state) => (type) => {
      return state.items.filter((item) => item.type === type);
    },

    // Get available items
    availableItems: (state) => {
      return state.items.filter((item) => item.status === "AVAILABLE");
    },
  },

  actions: {
    // Fetch semua item
    async fetchItems() {
      this.loading = true;
      try {
        const items = await ipcRenderer.invoke("items:getAll");
        this.items = items;
        this.error = null;
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    // Tambah item baru
    async addItem(itemData) {
      this.loading = true;
      try {
        const newItem = await ipcRenderer.invoke(
          "items:add",
          JSON.parse(JSON.stringify(itemData)),
        );
        // Add new item with full data from server (includes category_name, size_name, etc.)
        this.items.unshift(newItem); // Add to beginning to match ORDER BY id DESC
        this.error = null;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Update item
    async updateItem(id, updates) {
      this.loading = true;
      try {
        const updatedItem = await ipcRenderer.invoke(
          "items:update",
          id,
          JSON.parse(JSON.stringify(updates)),
        );
        const index = this.items.findIndex((item) => item.id === id);
        if (index !== -1) {
          // Replace with full item data from server (includes category_name, size_name, etc.)
          this.items[index] = updatedItem;
        }
        this.error = null;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Hapus item
    async deleteItem(id) {
      this.loading = true;
      try {
        await ipcRenderer.invoke("items:delete", id);
        this.items = this.items.filter((item) => item.id !== id);
        this.error = null;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async fetchSizes(force = false) {
      if (!force && this.sizes.length) return;
      this.sizesLoading = true;
      try {
        const data = await ipcRenderer.invoke("itemSizes:getAll");
        this.sizes = data;
      } catch (err) {
        console.error("Gagal memuat data ukuran:", err);
      } finally {
        this.sizesLoading = false;
      }
    },
  },
});
