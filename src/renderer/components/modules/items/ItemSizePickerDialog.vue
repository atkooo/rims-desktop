<template>
  <AppDialog
    v-model="visible"
    title="Pilih Ukuran Item"
    :show-footer="false"
    :max-width="520"
  >
    <div class="size-picker-dialog">
      <FormInput
        id="sizeSearch"
        label="Cari ukuran"
        v-model="search"
        placeholder="Cari nama atau kode..."
      />

      <div class="size-list">
        <div v-if="isLoading" class="empty-state">
          Memuat daftar ukuran...
        </div>
        <div v-else-if="!filteredSizes.length" class="empty-state">
          Tidak ada ukuran yang cocok.
        </div>
        <button
          v-else
          v-for="size in filteredSizes"
          :key="size.id"
          type="button"
          class="size-row"
          @click="selectSize(size)"
        >
          <div class="size-name">
            {{ size.name }}
            <span v-if="size.code" class="size-code">{{ size.code }}</span>
          </div>
          <div class="size-meta">
            <span>{{ size.description || "Tanpa deskripsi" }}</span>
            <span class="status-pill" :class="{ inactive: !size.is_active }">
              {{ size.is_active ? "Aktif" : "Nonaktif" }}
            </span>
          </div>
        </button>
      </div>
    </div>
  </AppDialog>
</template>

<script>
import { computed, ref, watch } from "vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import { useItemStore } from "@/store/items";

export default {
  name: "ItemSizePickerDialog",
  components: {
    AppDialog,
    AppButton,
    FormInput,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue", "select"],
  setup(props, { emit }) {
    const itemStore = useItemStore();
    const search = ref("");
    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const isLoading = computed(() => itemStore.sizesLoading);

    const filteredSizes = computed(() => {
      const term = search.value.trim().toLowerCase();
      return (itemStore.sizes || [])
        .filter((size) => {
          if (!term) return true;
          const nameMatch = size.name?.toLowerCase().includes(term);
          const codeMatch = size.code?.toLowerCase().includes(term);
          const descMatch = size.description?.toLowerCase().includes(term);
          return nameMatch || codeMatch || descMatch;
        })
        .slice(0, 80);
    });

    const selectSize = (size) => {
      emit("select", { ...size });
      search.value = "";
      visible.value = false;
    };

    watch(
      () => props.modelValue,
      (value) => {
        if (value && !itemStore.sizes.length) {
          itemStore.fetchSizes();
        }
      },
    );

    return {
      search,
      visible,
      filteredSizes,
      selectSize,
      isLoading,
    };
  },
};
</script>

<style scoped>
.size-picker-dialog {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.size-list {
  max-height: 360px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.size-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.size-row:hover {
  border-color: #c7d2fe;
  background-color: #f8fafc;
}

.size-name {
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.size-code {
  font-size: 0.8rem;
  color: #4b5563;
  background: #f3f4f6;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
}

.size-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #6b7280;
  flex-wrap: wrap;
}

.status-pill {
  font-size: 0.75rem;
  padding: 0.1rem 0.65rem;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
}

.status-pill.inactive {
  background: #fef2f2;
  color: #b91c1c;
}

.empty-state {
  padding: 1.25rem;
  text-align: center;
  color: #6b7280;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  background: #f9fafb;
}
</style>

