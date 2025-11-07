<template>
  <div class="select-search">
    <input v-model="query" :placeholder="placeholder" @focus="open = true" @blur="onBlur" />
    <ul v-if="open" class="dropdown">
      <li v-for="opt in filtered" :key="opt[valueKey]" @mousedown.prevent="pick(opt)">
        {{ opt[labelKey] }}
      </li>
      <li v-if="filtered.length === 0" class="empty">Tidak ada data</li>
    </ul>
  </div>
</template>
<script>
export default {
  props: { options: { type: Array, default: () => [] }, modelValue: null, placeholder: { type: String, default: 'Cari...' }, labelKey: { type: String, default: 'name' }, valueKey: { type: String, default: 'id' } },
  emits: ['update:modelValue', 'change'],
  data() { return { query: '', open: false }; },
  computed: {
    filtered() {
      const q = this.query.toLowerCase();
      return this.options.filter(o => String(o[this.labelKey]).toLowerCase().includes(q));
    }
  },
  methods: {
    pick(opt) { this.$emit('update:modelValue', opt[this.valueKey]); this.$emit('change', opt); this.open = false; this.query = ''; },
    onBlur() { setTimeout(() => this.open = false, 120); }
  }
};
</script>
<style>
.select-search {
  position: relative;
}

.dropdown {
  position: absolute;
  z-index: 20;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-top: 6px;
  width: 100%;
  max-height: 220px;
  overflow: auto;
  box-shadow: 0 10px 30px rgba(15, 23, 42, .12);
}

.dropdown li {
  padding: 8px 10px;
  cursor: pointer;
}

.dropdown li:hover {
  background: #f1f5f9;
}

.dropdown .empty {
  color: #94a3b8;
  cursor: default;
}
</style>
