<template>
  <div class="form-group">
    <label v-if="label" :for="id" class="form-label">{{ label }}</label>
    <input
      :id="id"
      type="date"
      :value="modelValue"
      @input="handleInput"
      :min="computedMinDate"
      :max="computedMaxDate"
      class="form-input date-input"
      :class="{ 'is-invalid': !!error }"
      v-bind="$attrs"
    />
    <div v-if="hint" class="form-hint">
      {{ hint }}
    </div>
    <div v-if="error" class="invalid-feedback">
      {{ error }}
    </div>
  </div>
</template>

<script>
import { computed } from "vue";

export default {
  name: "DatePicker",
  props: {
    id: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      default: "",
    },
    modelValue: {
      type: String,
      default: "",
    },
    mode: {
      type: String,
      default: "custom",
      validator: (value) =>
        ["rental", "plannedReturn", "actualReturn", "sale", "custom"].includes(
          value,
        ),
    },
    minDate: {
      type: String,
      default: null,
    },
    maxDate: {
      type: String,
      default: null,
    },
    error: {
      type: String,
      default: "",
    },
    hint: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    // Get today's date in YYYY-MM-DD format
    const getToday = () => {
      return new Date().toISOString().split("T")[0];
    };

    // Compute min date based on mode
    const computedMinDate = computed(() => {
      // If minDate prop is provided, use it (overrides mode)
      if (props.minDate) {
        return props.minDate;
      }

      switch (props.mode) {
        case "rental":
          // Rental date: tidak bisa kemarin, minimal hari ini
          return getToday();
        case "plannedReturn":
          // Planned return: minimal hari ini atau rental date (jika ada)
          // Jika ada modelValue (rental date), gunakan yang lebih besar antara today atau rental date
          if (props.modelValue) {
            const rentalDate = new Date(props.modelValue);
            const today = new Date();
            return rentalDate >= today ? props.modelValue : getToday();
          }
          return getToday();
        case "actualReturn":
          // Actual return: bisa masa lalu, tidak ada min (atau bisa di-set min jika perlu)
          return null;
        case "sale":
          // Sale date: tidak bisa masa depan, minimal tidak ada batasan (bisa masa lalu)
          return null;
        default:
          // Custom mode: no automatic min
          return null;
      }
    });

    // Compute max date based on mode
    const computedMaxDate = computed(() => {
      // If maxDate prop is provided, use it (overrides mode)
      if (props.maxDate) {
        return props.maxDate;
      }

      switch (props.mode) {
        case "rental":
          // Rental date: tidak ada max (bisa masa depan)
          return null;
        case "plannedReturn":
          // Planned return: tidak ada max (bisa masa depan)
          return null;
        case "actualReturn":
          // Actual return: tidak bisa masa depan, maksimal hari ini
          return getToday();
        case "sale":
          // Sale date: tidak bisa masa depan, maksimal hari ini
          return getToday();
        default:
          // Custom mode: no automatic max
          return null;
      }
    });

    const handleInput = (event) => {
      const value = event.target.value;
      
      // Validate based on mode if needed
      if (value) {
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Additional validation for actualReturn and sale
        if (props.mode === "actualReturn" || props.mode === "sale") {
          if (selectedDate > today) {
            // Don't emit if date is in the future
            event.target.value = props.modelValue;
            return;
          }
        }
        
        // Additional validation for rental
        if (props.mode === "rental") {
          selectedDate.setHours(0, 0, 0, 0);
          if (selectedDate < today) {
            // Don't emit if date is in the past
            event.target.value = props.modelValue;
            return;
          }
        }
      }
      
      emit("update:modelValue", value);
    };

    return {
      computedMinDate,
      computedMaxDate,
      handleInput,
    };
  },
};
</script>

<style scoped>
.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-input {
  width: 100%;
  max-width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #1f2937;
  background-color: white;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input.date-input {
  cursor: pointer;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input[readonly] {
  background-color: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
  border-color: #d1d5db;
}

.form-input[readonly]:focus {
  border-color: #d1d5db;
  box-shadow: none;
}

.is-invalid {
  border-color: #dc2626;
}

.form-hint {
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.invalid-feedback {
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

/* Date input specific styling */
input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.6;
  filter: invert(0.5);
}

input[type="date"]::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
}
</style>

