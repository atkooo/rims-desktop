<template>
  <button
    :type="type"
    class="button"
    :class="[variant, { 'is-loading': loading }]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="spinner"></span>
    <slot></slot>
  </button>
</template>

<script>
export default {
  name: "AppButton",
  props: {
    type: {
      type: String,
      default: "button",
    },
    variant: {
      type: String,
      default: "primary",
      validator: (value) =>
        ["primary", "secondary", "danger", "success"].includes(value),
    },
    loading: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["click"],
};
</script>

<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.primary {
  background-color: #4f46e5;
  color: white;
  border: none;
}

.primary:hover:not(:disabled) {
  background-color: #4338ca;
}

.secondary {
  background-color: #f3f4f6;
  color: #111827;
  border: 1px solid #d1d5db;
}

.secondary:hover:not(:disabled) {
  background-color: #e5e7eb;
}

.danger {
  background-color: #dc2626;
  color: white;
  border: none;
}

.danger:hover:not(:disabled) {
  background-color: #b91c1c;
}

.success {
  background-color: #059669;
  color: white;
  border: none;
}

.success:hover:not(:disabled) {
  background-color: #047857;
}

.spinner {
  width: 1rem;
  height: 1rem;
  margin-right: 0.5rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

/* spacing between optional icon and text */
.button i + span {
  margin-left: 0.5rem;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
