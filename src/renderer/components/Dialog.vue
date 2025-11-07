<template>
  <div class="dialog-overlay" v-if="modelValue" @click="closeOnOverlay">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="dialog-content">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "Dialog",
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    closeOnOutsideClick: {
      type: Boolean,
      default: true,
    },
  },
  methods: {
    close() {
      this.$emit("update:modelValue", false);
    },
    closeOnOverlay() {
      if (this.closeOnOutsideClick) {
        this.close();
      }
    },
  },
};
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog {
  background: white;
  border-radius: 8px;
  min-width: 320px;
  max-width: 90vw;
  max-height: 90vh;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #64748b;
}

.close-btn:hover {
  color: #475569;
}

.dialog-content {
  padding: 20px;
  overflow-y: auto;
}
</style>
