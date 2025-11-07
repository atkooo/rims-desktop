import { defineStore } from "pinia";
import { ipcRenderer } from "electron";

export const useItemStore = defineStore("items", {
  state: () => ({
    items: [],
    loading: false,
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
        const newItem = await ipcRenderer.invoke("items:add", itemData);
        this.items.push(newItem);
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
        await ipcRenderer.invoke("items:update", id, updates);
        const index = this.items.findIndex((item) => item.id === id);
        if (index !== -1) {
          this.items[index] = { ...this.items[index], ...updates };
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
  },
});
