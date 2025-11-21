<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="dialog-overlay" @click="close">
        <div
          class="dialog"
          :style="{ maxWidth: maxWidth ? maxWidth + 'px' : undefined }"
          @click.stop
        >
          <div class="dialog-header">
            <h3 class="dialog-title">{{ title }}</h3>
            <button class="close-button" @click="close">&times;</button>
          </div>

          <div class="dialog-content">
            <slot></slot>
          </div>

          <div v-if="showFooter" class="dialog-footer">
            <AppButton v-if="showCancel" variant="secondary" @click="handleCancel">
              {{ cancelText }}
            </AppButton>
            <AppButton
              v-if="showConfirm"
              :variant="confirmVariant"
              :loading="loading"
              @click="confirm"
            >
              {{ confirmText }}
            </AppButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import AppButton from "./AppButton.vue";

export default {
  name: "AppDialog",
  components: { AppButton },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    title: {
      type: String,
      default: "",
    },
    showFooter: {
      type: Boolean,
      default: true,
    },
    showCancel: {
      type: Boolean,
      default: true,
    },
    showConfirm: {
      type: Boolean,
      default: true,
    },
    cancelText: {
      type: String,
      default: "Batal",
    },
    confirmText: {
      type: String,
      default: "OK",
    },
    confirmVariant: {
      type: String,
      default: "primary",
    },
    loading: {
      type: Boolean,
      default: false,
    },
    maxWidth: {
      type: Number,
      default: null,
    },
  },
  emits: ["update:modelValue", "confirm", "cancel"],
  methods: {
    close() {
      this.$emit("update:modelValue", false);
    },
    handleCancel() {
      this.$emit("cancel");
      this.$emit("update:modelValue", false);
    },
    confirm() {
      this.$emit("confirm");
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
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.dialog {
  background-color: white;
  border-radius: 10px;
  width: 90%;
  max-width: 720px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.2);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  color: #6b7280;
}

.dialog-content {
  padding: 1rem;
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
