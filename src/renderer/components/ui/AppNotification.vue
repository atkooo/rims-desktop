<template>
  <Teleport to="body">
    <Transition name="notification">
      <div
        v-if="visible"
        :class="['notification', `notification--${type}`]"
        @click="handleClose"
      >
        <div class="notification-content">
          <div class="notification-icon">
            <svg
              v-if="type === 'success'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <svg
              v-else-if="type === 'error'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <svg
              v-else-if="type === 'warning'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              ></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <div class="notification-body">
            <h4 v-if="title" class="notification-title">{{ title }}</h4>
            <p class="notification-message">{{ message }}</p>
          </div>
          <button
            v-if="closable"
            class="notification-close"
            @click.stop="handleClose"
            aria-label="Tutup"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div v-if="showProgress" class="notification-progress">
          <div
            class="notification-progress-bar"
            :style="{ animationDuration: `${duration}ms` }"
          ></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  name: "AppNotification",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: "info",
      validator: (value) =>
        ["success", "error", "warning", "info"].includes(value),
    },
    title: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      default: 3000,
    },
    closable: {
      type: Boolean,
      default: true,
    },
    showProgress: {
      type: Boolean,
      default: true,
    },
  },
  emits: ["update:modelValue", "close"],
  data() {
    return {
      visible: this.modelValue,
      timer: null,
    };
  },
  watch: {
    modelValue(newVal) {
      this.visible = newVal;
      if (newVal) {
        this.startTimer();
      } else {
        this.clearTimer();
      }
    },
    visible(newVal) {
      if (newVal) {
        this.startTimer();
      } else {
        this.clearTimer();
      }
    },
  },
  mounted() {
    if (this.visible) {
      this.startTimer();
    }
  },
  beforeUnmount() {
    this.clearTimer();
  },
  methods: {
    handleClose() {
      this.visible = false;
      this.$emit("update:modelValue", false);
      this.$emit("close");
    },
    startTimer() {
      if (this.duration > 0) {
        this.clearTimer();
        this.timer = setTimeout(() => {
          this.handleClose();
        }, this.duration);
      }
    },
    clearTimer() {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    },
  },
};
</script>

<style scoped>
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  min-width: 320px;
  max-width: 420px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow:
    0 10px 40px rgba(15, 23, 42, 0.15),
    0 4px 16px rgba(15, 23, 42, 0.1);
  z-index: 9999;
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.notification:hover {
  transform: translateY(-2px);
  box-shadow:
    0 12px 48px rgba(15, 23, 42, 0.2),
    0 6px 20px rgba(15, 23, 42, 0.15);
}

.notification-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  position: relative;
}

.notification-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}

.notification-icon svg {
  width: 100%;
  height: 100%;
}

.notification-body {
  flex: 1;
  min-width: 0;
}

.notification-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  line-height: 1.4;
}

.notification-message {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

.notification-close {
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  transition: all 0.2s ease;
  margin-top: -2px;
  margin-right: -2px;
}

.notification-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.notification-close svg {
  width: 16px;
  height: 16px;
}

.notification-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.notification-progress-bar {
  height: 100%;
  background: currentColor;
  animation: progress linear forwards;
}

/* Type variants */
.notification--success {
  border-left: 4px solid #10b981;
}

.notification--success .notification-icon {
  color: #10b981;
}

.notification--success .notification-progress-bar {
  background: #10b981;
}

.notification--error {
  border-left: 4px solid #ef4444;
}

.notification--error .notification-icon {
  color: #ef4444;
}

.notification--error .notification-progress-bar {
  background: #ef4444;
}

.notification--warning {
  border-left: 4px solid #f59e0b;
}

.notification--warning .notification-icon {
  color: #f59e0b;
}

.notification--warning .notification-progress-bar {
  background: #f59e0b;
}

.notification--info {
  border-left: 4px solid #3b82f6;
}

.notification--info .notification-icon {
  color: #3b82f6;
}

.notification--info .notification-progress-bar {
  background: #3b82f6;
}

/* Animations */
@keyframes progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.notification-enter-active {
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.notification-leave-active {
  transition: all 0.25s ease-in;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(400px) scale(0.9);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(400px) scale(0.9);
}

/* Responsive */
@media (max-width: 480px) {
  .notification {
    right: 12px;
    left: 12px;
    min-width: auto;
    max-width: none;
  }

  .notification-enter-from,
  .notification-leave-to {
    transform: translateY(-100px) scale(0.9);
  }
}
</style>
