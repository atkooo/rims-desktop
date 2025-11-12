<template>
  <div class="app-table" :class="{ dense }">
    <div class="toolbar">
      <input
        v-if="showSearch"
        v-model.trim="search"
        type="text"
        class="search-input"
        placeholder="Cari..."
      />
      <div class="spacer"></div>
      <label class="page-size">
        Tampil
        <select v-model.number="pageSize" class="page-size-select">
          <option v-for="n in pageSizes" :key="n" :value="n">{{ n }}</option>
        </select>
        per halaman
      </label>
    </div>

    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th v-if="showIndex" class="index-header">{{ indexLabel }}</th>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[
                { sortable: col.sortable },
                col.align ? `align-${col.align}` : '',
              ]"
              @click="col.sortable ? toggleSort(col) : null"
            >
              {{ col.label }}
              <span
                v-if="col.sortable && sortKey === col.key"
                class="sort-indicator"
              >
                {{ sortDir === "asc" ? "▲" : "▼" }}
              </span>
            </th>
            <th v-if="$slots.actions" class="actions-header">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading || pagedRows.length === 0">
            <td
              :colspan="
                columns.length + ($slots.actions ? 1 : 0) + (showIndex ? 1 : 0)
              "
              class="empty"
            >
              <span v-if="loading">Memuat...</span>
              <span v-else>Tidak ada data</span>
            </td>
          </tr>
          <tr
            v-for="(row, i) in pagedRows"
            :key="row[rowKey] ?? JSON.stringify(row)"
            class="data-row"
          >
            <td v-if="showIndex" class="index-cell">
              {{ (page - 1) * pageSize + i + 1 }}
            </td>
            <td
              v-for="col in columns"
              :key="col.key"
              :class="[col.align ? `align-${col.align}` : '']"
            >
              <slot :name="'cell-' + col.key" :row="row">
                {{ col.format ? col.format(row[col.key], row) : row[col.key] }}
              </slot>
            </td>
            <td v-if="$slots.actions" class="actions-cell">
              <slot name="actions" :row="row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination" v-if="totalPages > 1">
      <button class="page-btn" :disabled="page === 1" @click="prevPage">
        Sebelumnya
      </button>
      <span class="page-info">Halaman {{ page }} dari {{ totalPages }}</span>
      <button
        class="page-btn"
        :disabled="page === totalPages"
        @click="nextPage"
      >
        Berikutnya
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "AppTable",
  props: {
    columns: {
      type: Array,
      required: true, // [{ key, label, sortable?, align? }]
    },
    rows: {
      type: Array,
      default: () => [],
    },
    rowKey: {
      type: String,
      default: "id",
    },
    showIndex: {
      type: Boolean,
      default: false,
    },
    indexLabel: {
      type: String,
      default: "No",
    },
    showSearch: {
      type: Boolean,
      default: true,
    },
    searchableKeys: {
      type: Array,
      default: () => [],
    },
    pageSizes: {
      type: Array,
      default: () => [5, 10, 20, 50],
    },
    defaultPageSize: {
      type: Number,
      default: 10,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    dense: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      search: "",
      page: 1,
      pageSize: this.defaultPageSize,
      sortKey: null,
      sortDir: "asc", // or 'desc'
    };
  },
  computed: {
    filteredRows() {
      if (!this.showSearch || !this.search.trim()) return this.rows;
      const q = this.search.trim().toLowerCase();
      const keys = this.searchableKeys.length
        ? this.searchableKeys
        : this.columns.map((c) => c.key);
      return this.rows.filter((row) =>
        keys.some((k) =>
          String(row?.[k] ?? "")
            .toLowerCase()
            .includes(q),
        ),
      );
    },
    sortedRows() {
      if (!this.sortKey) return this.filteredRows;
      const dir = this.sortDir === "asc" ? 1 : -1;
      return [...this.filteredRows].sort((a, b) => {
        const av = a?.[this.sortKey];
        const bv = b?.[this.sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return -1 * dir;
        if (bv == null) return 1 * dir;
        if (typeof av === "number" && typeof bv === "number")
          return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.sortedRows.length / this.pageSize));
    },
    pagedRows() {
      // keep page within bounds
      if (this.page > this.totalPages) this.page = this.totalPages;
      const start = (this.page - 1) * this.pageSize;
      return this.sortedRows.slice(start, start + this.pageSize);
    },
  },
  watch: {
    search() {
      this.page = 1;
    },
    pageSize() {
      this.page = 1;
    },
    rows() {
      // data changed, keep page in range
      if (this.page > this.totalPages) this.page = this.totalPages;
    },
  },
  methods: {
    toggleSort(col) {
      if (this.sortKey === col.key) {
        this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
      } else {
        this.sortKey = col.key;
        this.sortDir = "asc";
      }
    },
    prevPage() {
      if (this.page > 1) this.page--;
    },
    nextPage() {
      if (this.page < this.totalPages) this.page++;
    },
  },
};
</script>

<style scoped>
.app-table {
  width: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.spacer {
  flex: 1 1 auto;
}

.search-input {
  width: 260px;
  max-width: 100%;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

/* Dense mode for compact table appearance */
.app-table.dense .toolbar {
  gap: 8px;
  margin-bottom: 6px;
}
.app-table.dense .search-input {
  width: 220px;
  padding: 6px;
}
.app-table.dense th,
.app-table.dense td {
  padding: 8px;
}
.app-table.dense .page-size-select {
  padding: 4px;
}
.app-table.dense .page-btn {
  padding: 4px 8px;
}
.app-table.dense .pagination {
  gap: 8px;
  padding-top: 6px;
}

.page-size {
  font-size: 14px;
  color: #374151;
}

.page-size-select {
  margin: 0 6px;
  padding: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.table-wrapper {
  overflow: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.index-header,
.index-cell {
  width: 64px;
  text-align: center;
}

th,
td {
  padding: 12px;
  border-bottom: 1px solid #eee;
  text-align: left;
}

th.sortable {
  cursor: pointer;
  user-select: none;
}

.sort-indicator {
  margin-left: 6px;
  font-size: 12px;
  color: #6b7280;
}

.align-right {
  text-align: right;
}
.align-center {
  text-align: center;
}

.actions-header,
.actions-cell {
  white-space: nowrap;
}

.actions-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty {
  text-align: center;
  color: #6b7280;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 10px;
}

.page-btn {
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
  color: #111827;
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #374151;
}
</style>
