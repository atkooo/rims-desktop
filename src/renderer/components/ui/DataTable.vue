<template>
  <div class="table-container">
    <table class="data-table">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key">
            {{ column.label }}
          </th>
          <th v-if="actions">Aksi</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading" class="loading-row">
          <td :colspan="actions ? columns.length + 1 : columns.length">
            <div class="loading-spinner"></div>
            Loading...
          </td>
        </tr>
        <tr v-else-if="!items.length" class="empty-row">
          <td :colspan="actions ? columns.length + 1 : columns.length">
            {{ emptyMessage }}
          </td>
        </tr>
        <tr v-for="item in items" :key="item.id">
          <td v-for="column in columns" :key="column.key">
            <template v-if="column.format">
              {{ column.format(item[column.key], item) }}
            </template>
            <template v-else>
              {{ item[column.key] }}
            </template>
          </td>
          <td v-if="actions" class="actions">
            <slot name="actions" :item="item">
              <AppButton v-if="showEdit" variant="secondary" class="action-button" @click="$emit('edit', item)">
                Edit
              </AppButton>
              <AppButton v-if="showDelete" variant="danger" class="action-button" @click="$emit('delete', item)">
                Hapus
              </AppButton>
            </slot>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="pagination" class="pagination">
      <span class="pagination-info">
        Showing {{ paginationInfo.from }}-{{ paginationInfo.to }} of
        {{ paginationInfo.total }}
      </span>
      <div class="pagination-buttons">
        <AppButton variant="secondary" :disabled="currentPage === 1" @click="$emit('page-change', currentPage - 1)">
          Previous
        </AppButton>
        <AppButton variant="secondary" :disabled="currentPage === totalPages"
          @click="$emit('page-change', currentPage + 1)">
          Next
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script>
import AppButton from "./AppButton.vue";

export default {
  name: "DataTable",
  components: { AppButton },
  props: {
    columns: {
      type: Array,
      required: true,
    },
    items: {
      type: Array,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    emptyMessage: {
      type: String,
      default: "Tidak ada data",
    },
    actions: {
      type: Boolean,
      default: false,
    },
    showEdit: {
      type: Boolean,
      default: true,
    },
    showDelete: {
      type: Boolean,
      default: true,
    },
    pagination: {
      type: Boolean,
      default: false,
    },
    currentPage: {
      type: Number,
      default: 1,
    },
    perPage: {
      type: Number,
      default: 10,
    },
    totalItems: {
      type: Number,
      default: 0,
    },
  },
  emits: ["edit", "delete", "page-change"],
  computed: {
    totalPages() {
      return Math.ceil(this.totalItems / this.perPage);
    },
    paginationInfo() {
      const from = (this.currentPage - 1) * this.perPage + 1;
      const to = Math.min(this.currentPage * this.perPage, this.totalItems);
      return {
        from,
        to,
        total: this.totalItems,
      };
    },
  },
};
</script>

<style scoped>
.table-container {
  width: 100%;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #e5e7eb;
}

.data-table th,
.data-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}

.data-table th {
  background-color: #f9fafb;
  font-weight: 600;
}

.data-table tbody tr:hover {
  background-color: #f9fafb;
}

.loading-row,
.empty-row {
  text-align: center;
  color: #6b7280;
}

.loading-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
}

.pagination-info {
  color: #6b7280;
}

.pagination-buttons {
  display: flex;
  gap: 0.5rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
