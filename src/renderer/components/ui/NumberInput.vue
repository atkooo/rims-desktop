<template>
  <input :value="displayValue" @input="onInput" :placeholder="placeholder" />
</template>
<script>
export default {
  props: { modelValue: { default: 0 }, currency: { type: Boolean, default: true }, placeholder: String },
  emits: ['update:modelValue'],
  computed: {
    displayValue() {
      const n = Number(this.modelValue || 0);
      return this.currency ? n.toLocaleString('id-ID') : String(this.modelValue);
    }
  },
  methods: {
    onInput(e) {
      const raw = e.target.value.replace(/\D+/g, '');
      const num = Number(raw || 0);
      this.$emit('update:modelValue', num);
      if (this.currency) { e.target.value = num.toLocaleString('id-ID'); }
    }
  }
};
</script>
<style>
/* Inherit global input styling */
</style>
