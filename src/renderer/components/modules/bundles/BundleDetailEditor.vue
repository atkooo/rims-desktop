<template>
  <AppDialog
    v-model="showDialog"
    :title="bundle ? `Kelola Komposisi - ${bundle.name}` : 'Kelola Komposisi'"
    :show-footer="false"
  >
    <div v-if="bundle" class="detail-editor">
      <form class="detail-form" @submit.prevent="handleSubmit">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Jenis</label>
            <select
              v-model="form.type"
              class="form-select"
              @change="handleTypeChange"
            >
              <option value="item">Item</option>
              <option value="accessory">Aksesoris</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">
              {{ form.type === "item" ? "Pilih Item" : "Pilih Aksesoris" }}
            </label>
            <div class="picker-selector">
              <div v-if="selectedReference" class="selected-reference">
                <span class="reference-name">
                  {{ selectedReference.name }}
                  <span v-if="selectedReference.code" class="reference-code">
                    {{ selectedReference.code }}
                  </span>
                </span>
                <AppButton
                  type="button"
                  variant="secondary"
                  size="small"
                  @click="clearSelection"
                >
                  Hapus
                </AppButton>
              </div>
              <AppButton
                v-else
                type="button"
                variant="secondary"
                @click="openPicker"
              >
                <Icon name="search" :size="16" />
                <span>{{ form.type === "item" ? "Cari Item" : "Cari Aksesoris" }}</span>
              </AppButton>
            </div>
            <div v-if="errors.referenceId" class="error-message">
              {{ errors.referenceId }}
            </div>
          </div>
          <FormInput
            id="quantity"
            label="Jumlah"
            type="number"
            min="1"
            v-model="form.quantity"
            :error="errors.quantity"
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="detailNotes">Catatan</label>
          <textarea
            id="detailNotes"
            class="form-textarea"
            rows="2"
            v-model="form.notes"
          ></textarea>
        </div>
        <div class="form-actions">
          <AppButton
            type="button"
            variant="secondary"
            @click="resetForm"
            v-if="editingDetail"
          >
            Batalkan Edit
          </AppButton>
          <AppButton type="submit" :loading="formSubmitting">
            {{ editingDetail ? "Update Detail" : "Tambah Detail" }}
          </AppButton>
        </div>
        <p v-if="formError" class="submit-error">{{ formError }}</p>
      </form>

      <div class="detail-list">
        <div v-if="detailsError" class="error-banner">
          {{ detailsError }}
        </div>
        
        <!-- Tabs -->
        <div class="tabs">
          <div
            class="tab"
            :class="{ active: activeTab === 'items' }"
            @click="activeTab = 'items'"
          >
            Item ({{ itemDetails.length }})
          </div>
          <div
            class="tab"
            :class="{ active: activeTab === 'accessories' }"
            @click="activeTab = 'accessories'"
          >
            Aksesoris ({{ accessoryDetails.length }})
          </div>
        </div>

        <!-- Tab Content: Items -->
        <div v-if="activeTab === 'items'" class="tab-content">
          <table class="detail-table" v-if="itemDetails.length">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Item</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Jumlah</th>
                <th>Catatan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="detail in itemDetails" :key="detail.id">
                <td class="code-cell">
                  <span class="item-code">{{ getItemCode(detail.item_id) || "-" }}</span>
                </td>
                <td class="name-cell">{{ detail.item_name || "-" }}</td>
                <td>{{ getItemCategory(detail.item_id) || "-" }}</td>
                <td class="price-cell">{{ formatItemPrice(detail.item_id) }}</td>
                <td class="quantity-cell">{{ detail.quantity }}</td>
                <td class="notes-cell">{{ detail.notes || "-" }}</td>
                <td class="actions">
                  <AppButton variant="secondary" size="small" @click="startEdit(detail)">
                    Edit
                  </AppButton>
                  <AppButton
                    variant="danger"
                    size="small"
                    :loading="deleteLoadingId === detail.id"
                    @click="removeDetail(detail)"
                  >
                    Hapus
                  </AppButton>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="detail-state">Belum ada item dalam komposisi paket ini.</p>
        </div>

        <!-- Tab Content: Accessories -->
        <div v-if="activeTab === 'accessories'" class="tab-content">
          <table class="detail-table" v-if="accessoryDetails.length">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Aksesoris</th>
                <th>Harga</th>
                <th>Jumlah</th>
                <th>Catatan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="detail in accessoryDetails" :key="detail.id">
                <td class="code-cell">
                  <span class="item-code">{{ getAccessoryCode(detail.accessory_id) || "-" }}</span>
                </td>
                <td class="name-cell">{{ detail.accessory_name || "-" }}</td>
                <td class="price-cell">{{ formatAccessoryPrice(detail.accessory_id) }}</td>
                <td class="quantity-cell">{{ detail.quantity }}</td>
                <td class="notes-cell">{{ detail.notes || "-" }}</td>
                <td class="actions">
                  <AppButton variant="secondary" size="small" @click="startEdit(detail)">
                    Edit
                  </AppButton>
                  <AppButton
                    variant="danger"
                    size="small"
                    :loading="deleteLoadingId === detail.id"
                    @click="removeDetail(detail)"
                  >
                    Hapus
                  </AppButton>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="detail-state">Belum ada aksesoris dalam komposisi paket ini.</p>
        </div>
      </div>
    </div>
    <p v-else class="detail-state">Pilih paket terlebih dahulu.</p>

    <!-- Picker Dialogs -->
    <ItemPickerDialog
      v-model="showItemPicker"
      :excluded-ids="excludedItemIds"
      @select="handleItemSelect"
    />
    <AccessoryPickerDialog
      v-model="showAccessoryPicker"
      :excluded-ids="excludedAccessoryIds"
      @select="handleAccessorySelect"
    />
  </AppDialog>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import Icon from "@/components/ui/Icon.vue";
import ItemPickerDialog from "@/components/modules/items/ItemPickerDialog.vue";
import AccessoryPickerDialog from "@/components/modules/accessories/AccessoryPickerDialog.vue";
import {
  fetchBundleDetailsByBundle,
  createBundleDetail,
  updateBundleDetail,
  deleteBundleDetail,
  fetchAccessories,
} from "@/services/masterData";
import { useItemStore } from "@/store/items";
import { formatCurrency } from "@/composables/useCurrency";

const defaultForm = () => ({
  type: "item",
  referenceId: "",
  quantity: 1,
  notes: "",
});

export default {
  name: "BundleDetailEditor",
  components: {
    AppDialog,
    AppButton,
    FormInput,
    Icon,
    ItemPickerDialog,
    AccessoryPickerDialog,
  },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    bundle: {
      type: Object,
      default: null,
    },
  },
  emits: ["update:modelValue", "updated"],
  setup(props, { emit }) {
    const itemStore = useItemStore();
    const bundle = computed(() => props.bundle);
    const accessories = ref([]);
    const accessoriesLoading = ref(false);
    const accessoriesError = ref("");

    const details = ref([]);
    const detailsLoading = ref(false);
    const detailsError = ref("");

    const form = ref(defaultForm());
    const errors = ref({});
    const formError = ref("");
    const formSubmitting = ref(false);
    const editingDetail = ref(null);
    const deleteLoadingId = ref(null);
    const showItemPicker = ref(false);
    const showAccessoryPicker = ref(false);
    const selectedReference = ref(null);
    const activeTab = ref("items");

    const showDialog = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const excludedItemIds = computed(() => {
      return details.value
        .filter((d) => d.item_id && d.id !== editingDetail.value?.id)
        .map((d) => d.item_id);
    });

    const excludedAccessoryIds = computed(() => {
      return details.value
        .filter((d) => d.accessory_id && d.id !== editingDetail.value?.id)
        .map((d) => d.accessory_id);
    });

    const itemDetails = computed(() => {
      return details.value.filter((d) => d.item_id);
    });

    const accessoryDetails = computed(() => {
      return details.value.filter((d) => d.accessory_id);
    });

    const getItemCode = (itemId) => {
      if (!itemId) return null;
      const item = itemStore.items.find((i) => i.id === itemId);
      return item?.code || null;
    };

    const getItemCategory = (itemId) => {
      if (!itemId) return null;
      const item = itemStore.items.find((i) => i.id === itemId);
      return item?.category_name || null;
    };

    const formatItemPrice = (itemId) => {
      if (!itemId) return "-";
      const item = itemStore.items.find((i) => i.id === itemId);
      if (!item) return "-";
      return formatCurrency(item.sale_price ?? item.price ?? 0);
    };

    const getAccessoryCode = (accessoryId) => {
      if (!accessoryId) return null;
      const accessory = accessories.value.find((a) => a.id === accessoryId);
      return accessory?.code || null;
    };

    const formatAccessoryPrice = (accessoryId) => {
      if (!accessoryId) return "-";
      const accessory = accessories.value.find((a) => a.id === accessoryId);
      if (!accessory) return "-";
      return formatCurrency(accessory.sale_price ?? accessory.price ?? 0);
    };

    const openPicker = () => {
      if (form.value.type === "item") {
        showItemPicker.value = true;
      } else {
        showAccessoryPicker.value = true;
      }
    };

    const handleItemSelect = (item) => {
      form.value.referenceId = item.id;
      selectedReference.value = {
        id: item.id,
        name: item.name,
        code: item.code,
      };
      errors.value.referenceId = "";
    };

    const handleAccessorySelect = (accessory) => {
      form.value.referenceId = accessory.id;
      selectedReference.value = {
        id: accessory.id,
        name: accessory.name,
        code: accessory.code,
      };
      errors.value.referenceId = "";
    };

    const clearSelection = () => {
      form.value.referenceId = "";
      selectedReference.value = null;
      errors.value.referenceId = "";
    };

    const loadAccessories = async () => {
      accessoriesLoading.value = true;
      accessoriesError.value = "";
      try {
        accessories.value = await fetchAccessories();
      } catch (error) {
        accessoriesError.value = error.message || "Gagal memuat aksesoris.";
      } finally {
        accessoriesLoading.value = false;
      }
    };

    const ensureDependencies = async () => {
      if (!itemStore.items.length) {
        await itemStore.fetchItems().catch(() => {});
      }
      if (!accessories.value.length && !accessoriesLoading.value) {
        await loadAccessories();
      }
    };

    const loadDetails = async () => {
      if (!bundle.value?.id) {
        details.value = [];
        return;
      }
      detailsLoading.value = true;
      detailsError.value = "";
      try {
        details.value = await fetchBundleDetailsByBundle(bundle.value.id);
      } catch (error) {
        detailsError.value = error.message || "Gagal memuat detail paket.";
      } finally {
        detailsLoading.value = false;
      }
    };

    const resetForm = () => {
      form.value = defaultForm();
      errors.value = {};
      formError.value = "";
      editingDetail.value = null;
      selectedReference.value = null;
    };

    const validateForm = () => {
      const validationErrors = {};
      if (!form.value.referenceId) {
        validationErrors.referenceId = "Pilih data terlebih dahulu";
      }
      const quantity = Number(form.value.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        validationErrors.quantity = "Jumlah harus lebih dari 0";
      }
      errors.value = validationErrors;
      return Object.keys(validationErrors).length === 0;
    };

    const buildDetailPayload = () => {
      const payload = {
        bundle_id: bundle.value.id,
        quantity: Number(form.value.quantity),
        notes: form.value.notes?.trim() ?? "",
      };
      if (form.value.type === "item") {
        payload.item_id = form.value.referenceId;
        payload.accessory_id = null;
      } else {
        payload.item_id = null;
        payload.accessory_id = form.value.referenceId;
      }
      return payload;
    };

    const handleSubmit = async () => {
      if (!bundle.value) return;
      if (!validateForm()) return;
      formSubmitting.value = true;
      formError.value = "";
      try {
        const payload = buildDetailPayload();
        if (editingDetail.value) {
          await updateBundleDetail(editingDetail.value.id, payload);
        } else {
          await createBundleDetail(payload);
        }
        await loadDetails();
        emit("updated");
        resetForm();
      } catch (error) {
        formError.value = error.message || "Gagal menyimpan detail paket.";
      } finally {
        formSubmitting.value = false;
      }
    };

    const startEdit = async (detail) => {
      editingDetail.value = detail;
      form.value = {
        type: detail.item_id ? "item" : "accessory",
        referenceId: detail.item_id || detail.accessory_id || "",
        quantity: detail.quantity,
        notes: detail.notes || "",
      };
      
      // Set active tab sesuai jenis detail
      activeTab.value = detail.item_id ? "items" : "accessories";
      
      // Load selected reference untuk ditampilkan
      if (detail.item_id) {
        const item = itemStore.items.find((i) => i.id === detail.item_id);
        if (item) {
          selectedReference.value = {
            id: item.id,
            name: item.name,
            code: item.code,
          };
        } else {
          // Jika item tidak ada di store, fetch dulu
          await itemStore.fetchItems();
          const foundItem = itemStore.items.find((i) => i.id === detail.item_id);
          if (foundItem) {
            selectedReference.value = {
              id: foundItem.id,
              name: foundItem.name,
              code: foundItem.code,
            };
          }
        }
      } else if (detail.accessory_id) {
        const accessory = accessories.value.find((a) => a.id === detail.accessory_id);
        if (accessory) {
          selectedReference.value = {
            id: accessory.id,
            name: accessory.name,
            code: accessory.code,
          };
        } else {
          // Jika accessory tidak ada, load dulu
          await loadAccessories();
          const foundAccessory = accessories.value.find((a) => a.id === detail.accessory_id);
          if (foundAccessory) {
            selectedReference.value = {
              id: foundAccessory.id,
              name: foundAccessory.name,
              code: foundAccessory.code,
            };
          }
        }
      }
      
      errors.value = {};
      formError.value = "";
    };

    const handleTypeChange = () => {
      form.value.referenceId = "";
      selectedReference.value = null;
      errors.value.referenceId = "";
    };

    const removeDetail = async (detail) => {
      deleteLoadingId.value = detail.id;
      detailsError.value = "";
      try {
        await deleteBundleDetail(detail.id);
        await loadDetails();
        emit("updated");
        if (editingDetail.value && editingDetail.value.id === detail.id) {
          resetForm();
        }
      } catch (error) {
        detailsError.value = error.message || "Gagal menghapus detail.";
      } finally {
        deleteLoadingId.value = null;
      }
    };

    watch(
      [() => showDialog.value, () => bundle.value?.id],
      async ([visible, bundleId]) => {
        if (visible && bundleId) {
          await ensureDependencies();
          await loadDetails();
          resetForm();
          // Set tab default ke items jika ada, jika tidak ke accessories
          if (itemDetails.value.length > 0) {
            activeTab.value = "items";
          } else if (accessoryDetails.value.length > 0) {
            activeTab.value = "accessories";
          } else {
            activeTab.value = "items";
          }
        } else if (!visible) {
          details.value = [];
          resetForm();
          activeTab.value = "items";
        }
      },
    );

    // Watch untuk auto-switch tab jika tab aktif kosong
    watch(
      () => [itemDetails.value.length, accessoryDetails.value.length],
      ([itemCount, accessoryCount]) => {
        if (activeTab.value === "items" && itemCount === 0 && accessoryCount > 0) {
          activeTab.value = "accessories";
        } else if (activeTab.value === "accessories" && accessoryCount === 0 && itemCount > 0) {
          activeTab.value = "items";
        }
      },
    );

    watch(
      () => bundle.value,
      (bundle) => {
        if (!bundle && showDialog.value) {
          showDialog.value = false;
        }
      },
    );

    onMounted(() => {
      ensureDependencies();
    });

    return {
      showDialog,
      bundle,
      details,
      detailsLoading,
      detailsError,
      form,
      errors,
      formError,
      formSubmitting,
      editingDetail,
      deleteLoadingId,
      showItemPicker,
      showAccessoryPicker,
      selectedReference,
      excludedItemIds,
      excludedAccessoryIds,
      activeTab,
      itemDetails,
      accessoryDetails,
      getItemCode,
      getItemCategory,
      formatItemPrice,
      getAccessoryCode,
      formatAccessoryPrice,
      openPicker,
      handleItemSelect,
      handleAccessorySelect,
      clearSelection,
      handleSubmit,
      startEdit,
      removeDetail,
      resetForm,
      handleTypeChange,
    };
  },
};
</script>

<style scoped>
.detail-editor {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.detail-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
}

.form-select,
.form-textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.55rem 0.65rem;
  font-size: 0.95rem;
}

.form-textarea {
  min-height: 70px;
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.detail-list {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.75rem;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
}

.detail-table th,
.detail-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.detail-table th {
  background: #f3f4f6;
  font-weight: 600;
}

.detail-table tr:last-child td {
  border-bottom: none;
}

.actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.detail-state {
  text-align: center;
  color: #6b7280;
  padding: 1rem 0;
}

.submit-error {
  color: #b91c1c;
  font-size: 0.9rem;
  margin: 0;
}

.picker-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selected-reference {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  gap: 0.75rem;
}

.reference-name {
  flex: 1;
  font-weight: 500;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.reference-code {
  font-size: 0.75rem;
  font-weight: 400;
  color: #6b7280;
  background-color: #e5e7eb;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
}

.error-message {
  color: #b91c1c;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.tab {
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  color: #6b7280;
  font-weight: 500;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tab:hover {
  color: #111827;
  background: #f3f4f6;
}

.tab.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
  background: white;
}

.tab-content {
  padding: 1rem;
  background: white;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.detail-table th {
  background: #f3f4f6;
  font-weight: 600;
  text-align: left;
  padding: 0.75rem;
  border-bottom: 2px solid #e5e7eb;
  color: #374151;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  color: #111827;
}

.detail-table tr:last-child td {
  border-bottom: none;
}

.detail-table tr:hover {
  background: #f9fafb;
}

.code-cell {
  font-family: monospace;
}

.item-code {
  font-size: 0.8rem;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.name-cell {
  font-weight: 500;
  color: #111827;
}

.price-cell {
  font-weight: 500;
  color: #059669;
}

.quantity-cell {
  text-align: center;
  font-weight: 600;
  color: #111827;
}

.notes-cell {
  color: #6b7280;
  font-size: 0.85rem;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
