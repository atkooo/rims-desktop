<template>
  <div class="data-page transaction-form-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Kasir Transaksi Sewa</h1>
          <p class="subtitle">
            Formulir yang disederhanakan agar kasir atau admin dapat mencatat sewa baru dengan
            cepat dan langsung ke sistem.
          </p>
        </div>
        <div class="header-actions">
          <AppButton variant="secondary" @click="goBack">Kembali ke Daftar</AppButton>
          <AppButton variant="primary" :loading="loading" @click="handleSubmit">
            Simpan Transaksi
          </AppButton>
        </div>
      </div>
    </div>

    <section class="card-section form-page-grid">
      <div class="form-panel">
        <div class="status-row">
          <div v-if="submissionError" class="error-banner">
            {{ submissionError }}
          </div>
          <div v-else-if="successMessage" class="success-banner">
            {{ successMessage }}
          </div>
        </div>

        <div class="form-card">
          <header class="form-card__header">
            <div>
              <h3>Customer & Jadwal</h3>
              <p class="form-card__subtitle">
                Isi tanggal sewa dan rencana pengembalian sebelum memilih item.
              </p>
            </div>
          </header>
          <div class="form-card__body">
            <div class="field-group">
              <label for="customerId">Customer</label>
              <select
                id="customerId"
                v-model="form.customerId"
                class="form-select"
                :class="{ error: errors.customerId }"
              >
                <option value="">Pilih Customer</option>
                <option
                  v-for="customer in customers"
                  :key="customer.id"
                  :value="customer.id"
                >
                  {{ customer.name }} {{ customer.code ? `(${customer.code})` : "" }}
                </option>
              </select>
              <div v-if="errors.customerId" class="error-message">
                {{ errors.customerId }}
              </div>
            </div>
            <div class="form-grid--tight">
              <FormInput
                id="rentalDate"
                label="Tanggal Sewa"
                type="date"
                v-model="form.rentalDate"
                :error="errors.rentalDate"
              />
              <FormInput
                id="plannedReturnDate"
                label="Rencana Kembali"
                type="date"
                v-model="form.plannedReturnDate"
                :error="errors.plannedReturnDate"
              />
            </div>
          </div>
        </div>

        <div class="form-card">
          <header class="form-card__header">
            <div>
              <h3>Pembayaran & Kasir</h3>
              <p class="form-card__subtitle">
                Tetapkan metode pembayaran, status, dan nominal deposit sebelum menyimpan.
              </p>
            </div>
          </header>
          <div class="form-card__body">
            <div class="form-grid--tight two-col">
              <div class="field-group">
                <label for="paymentMethod">Metode Pembayaran</label>
                <select id="paymentMethod" v-model="form.paymentMethod" class="form-select">
                  <option
                    v-for="method in paymentMethods"
                    :key="method.value"
                    :value="method.value"
                  >
                    {{ method.label }}
                  </option>
                </select>
              </div>
              <div class="field-group">
                <label for="paymentStatus">Status Pembayaran</label>
                <select id="paymentStatus" v-model="form.paymentStatus" class="form-select">
                  <option
                    v-for="status in paymentStatusOptions"
                    :key="status.value"
                    :value="status.value"
                  >
                    {{ status.label }}
                  </option>
                </select>
              </div>
            </div>
            <div class="form-grid--tight two-col">
              <FormInput
                id="deposit"
                label="Deposit"
                type="number"
                min="0"
                v-model.number="form.deposit"
              />
              <FormInput
                id="paidAmount"
                label="Jumlah Dibayar"
                type="number"
                min="0"
                v-model.number="form.paidAmount"
              />
            </div>
          </div>
        </div>

        <div class="form-card">
          <header class="form-card__header">
            <div>
              <h3>Item yang Dipilih</h3>
              <p class="form-card__subtitle">
                Tambahkan item satu per satu agar sistem bisa menghitung durasi dan jumlah.
              </p>
            </div>
          </header>
          <div class="form-card__body">
            <ItemSelector v-model="form.items" />
            <div v-if="errors.items" class="error-message">
              {{ errors.items }}
            </div>
          </div>
        </div>

        <div class="form-card">
          <header class="form-card__header">
            <div>
              <h3>Catatan</h3>
              <p class="form-card__subtitle">
                Apa pun yang penting agar customer dan tim backend tahu penggunaan sewa.
              </p>
            </div>
          </header>
          <div class="form-card__body">
            <FormInput id="notes" label="Catatan" type="textarea" v-model="form.notes" />
          </div>
        </div>

        <div class="form-actions">
          <AppButton variant="secondary" @click="resetForm" :disabled="loading">
            Kosongkan Formulir
          </AppButton>
          <AppButton variant="primary" :loading="loading" @click="handleSubmit">
            Simpan Transaksi
          </AppButton>
        </div>
      </div>

      <aside class="summary-panel">
        <div class="summary-card highlight">
          <span>Total Estimasi Pembayaran</span>
          <strong>{{ formatCurrency(totalAmount) }}</strong>
          <p class="summary-description">
            {{ totalItems }} item • {{ totalDays }} hari sewa
          </p>
        </div>
        <div class="summary-grid summary-grid--stacked">
          <div class="summary-card">
            <span>Jumlah Item</span>
            <strong>{{ totalItems }}</strong>
          </div>
          <div class="summary-card">
            <span>Total Hari</span>
            <strong>{{ totalDays }}</strong>
          </div>
          <div class="summary-card">
            <span>Deposit</span>
            <strong>{{ formatCurrency(Number(form.deposit) || 0) }}</strong>
          </div>
          <div class="summary-card">
            <span>Status Pembayaran</span>
            <strong>{{ paymentStatusLabel }}</strong>
          </div>
        </div>
        <div class="summary-note">
          <h3>Petunjuk Kasir</h3>
          <ul>
            <li>Pastikan item tersedia sebelum menyimpan transaksi.</li>
            <li>Gunakan status pembayaran untuk menandai parsial atau lunas.</li>
            <li>Catatan akan tampil di invoice dan riwayat customer.</li>
          </ul>
          <AppButton variant="success" @click="goBack">Lihat Daftar Transaksi</AppButton>
        </div>
      </aside>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import ItemSelector from "@/components/modules/items/ItemSelector.vue";
import { fetchCustomers } from "@/services/masterData";
import { getStoredUser } from "@/services/auth";
import { useTransactionStore } from "@/store/transactions";
import { TRANSACTION_TYPE } from "@shared/constants";

const paymentMethods = [
  { value: "cash", label: "Tunai" },
  { value: "transfer", label: "Transfer" },
  { value: "card", label: "Kartu" },
];

const paymentStatusOptions = [
  { value: "unpaid", label: "Belum Dibayar" },
  { value: "partial", label: "Pembayaran Parsial" },
  { value: "paid", label: "Lunas" },
];

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const createDefaultForm = () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    customerId: "",
    rentalDate: toDateInput(today),
    plannedReturnDate: toDateInput(tomorrow),
    paymentMethod: "cash",
    paymentStatus: "unpaid",
    deposit: 0,
    paidAmount: 0,
    notes: "",
    items: [],
  };
};

export default {
  name: "RentalTransactionCreateView",
  components: {
    AppButton,
    FormInput,
    ItemSelector,
  },
  setup() {
    const router = useRouter();
    const transactionStore = useTransactionStore();
    const form = ref(createDefaultForm());
    const customers = ref([]);
    const loading = ref(false);
    const errors = ref({});
    const submissionError = ref("");
    const successMessage = ref("");

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value || 0);

    const totalDays = computed(() => {
      const from = new Date(form.value.rentalDate);
      const to = new Date(form.value.plannedReturnDate);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 1;
      const diffMs = to - from;
      if (diffMs < 0) return 1;
      return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    });

    const baseSubtotal = computed(() =>
      form.value.items.reduce((sum, item) => {
        const price = item.rental_price_per_day ?? item.price ?? 0;
        return sum + price * (item.quantity || 1);
      }, 0),
    );

    const subtotal = computed(() => baseSubtotal.value * totalDays.value);

    const totalAmount = computed(
      () => subtotal.value + (Number(form.value.deposit) || 0),
    );

    const totalItems = computed(() =>
      form.value.items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    );

    const normalizedItems = computed(() =>
      form.value.items.map((item) => {
        const quantity = item.quantity || 1;
        const basePrice = item.rental_price_per_day ?? item.price ?? 0;
        return {
          itemId: item.id,
          quantity,
          rentalPrice: basePrice,
          salePrice: 0,
          subtotal: basePrice * quantity * totalDays.value,
        };
      }),
    );

    const paymentStatusLabel = computed(() => {
      const match = paymentStatusOptions.find(
        (status) => status.value === form.value.paymentStatus,
      );
      return match ? match.label : "";
    });

    const loadCustomers = async () => {
      try {
        customers.value = await fetchCustomers();
      } catch (error) {
        console.error("Gagal memuat customers:", error);
      }
    };

    const resetForm = () => {
      form.value = createDefaultForm();
      errors.value = {};
      successMessage.value = "";
      submissionError.value = "";
    };

    const validateForm = () => {
      const newErrors = {};
      if (!form.value.customerId) {
        newErrors.customerId = "Customer harus dipilih";
      }
      if (!form.value.rentalDate) {
        newErrors.rentalDate = "Tanggal sewa harus diisi";
      }
      if (!form.value.plannedReturnDate) {
        newErrors.plannedReturnDate = "Tanggal kembali harus diisi";
      }
      if (
        form.value.rentalDate &&
        form.value.plannedReturnDate &&
        new Date(form.value.rentalDate) > new Date(form.value.plannedReturnDate)
      ) {
        newErrors.plannedReturnDate =
          "Tanggal kembali harus sama atau setelah tanggal sewa";
      }
      if (form.value.items.length === 0) {
        newErrors.items = "Pilih minimal 1 item";
      }
      errors.value = newErrors;
      return Object.keys(newErrors).length === 0;
    };

    const goBack = () => {
      router.push({ name: "transactions-rentals" });
    };

    const handleSubmit = async () => {
      if (!validateForm()) return;
      loading.value = true;
      submissionError.value = "";
      successMessage.value = "";
      try {
        const user = getStoredUser();
        await transactionStore.createTransaction({
          type: TRANSACTION_TYPE.RENTAL,
          customerId: form.value.customerId,
          userId: user?.id || 1,
          paymentMethod: form.value.paymentMethod,
          paymentStatus: form.value.paymentStatus,
          notes: form.value.notes,
          totalAmount: Number(totalAmount.value),
          transactionDate: form.value.rentalDate,
          rentalDate: form.value.rentalDate,
          plannedReturnDate: form.value.plannedReturnDate,
          totalDays: totalDays.value,
          subtotal: subtotal.value,
          deposit: Number(form.value.deposit) || 0,
          paidAmount: Number(form.value.paidAmount) || 0,
          items: normalizedItems.value,
        });
        successMessage.value = "Transaksi berhasil disimpan. Formulir kembali kosong.";
        form.value = createDefaultForm();
        errors.value = {};
      } catch (error) {
        console.error("Gagal menyimpan transaksi:", error);
        submissionError.value =
          error?.message || "Gagal menyimpan transaksi. Silakan coba lagi.";
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      loadCustomers();
    });

    return {
      form,
      customers,
      errors,
      loading,
      submissionError,
      successMessage,
      paymentMethods,
      paymentStatusOptions,
      formatCurrency,
      totalAmount,
      totalDays,
      totalItems,
      paymentStatusLabel,
      handleSubmit,
      resetForm,
      goBack,
    };
  },
};
</script>

<style scoped>
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.header-content > div:first-child {
  flex: 1;
  min-width: 0;
}

  .form-grid--tight {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-top: 1.25rem;
}

.form-grid--tight.two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-select {
  width: 100%;
  padding: 0.6rem;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background-color: white;
  font-size: 1rem;
}

.form-select.error {
  border-color: #dc2626;
}

.error-message {
  color: #dc2626;
  font-size: 0.85rem;
}

.status-row {
  min-height: 44px;
}

.form-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  margin-bottom: 1rem;
  background: #ffffff;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
}

.form-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.1rem 1.2rem 0;
}

.form-card__subtitle {
  margin: 0;
  color: #64748b;
  font-size: 0.85rem;
}

.form-card__body {
  padding: 0 1.2rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-page-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  gap: 1.5rem;
}

.form-panel {
  background: none;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
}

.summary-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-card {
  background: #f8fafc;
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  border: 1px solid #e5e7eb;
}

.summary-card strong {
  font-size: 1.4rem;
  color: #111827;
}

.summary-card.highlight {
  background: linear-gradient(135deg, #4338ca, #6366f1);
  color: #fff;
  border: none;
}

.summary-card.highlight strong {
  font-size: 1.75rem;
}

.summary-description {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
}

.summary-note {
  background: #fff;
  border-radius: 10px;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
}

.summary-note h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.summary-note ul {
  margin: 0 0 1rem;
  padding-left: 1.1rem;
  color: #475569;
  font-size: 0.9rem;
  line-height: 1.5;
}

.form-actions {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.payment-section .form-grid {
  margin-top: 0.7rem;
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.9rem 1rem;
  border-radius: 8px;
  margin: 0;
  font-size: 0.95rem;
}

.success-banner {
  background-color: #dcfce7;
  color: #065f46;
  padding: 0.9rem 1rem;
  border-radius: 8px;
  margin: 0;
  font-size: 0.95rem;
}

.subtitle {
  max-width: 520px;
}

.header-actions {
  display: flex;
  gap: 0.9rem;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  margin-top: 0.4rem;
}

@media (max-width: 1080px) {
  .form-page-grid {
    grid-template-columns: 1fr;
  }

  .summary-panel {
    order: -1;
  }

  .form-card,
  .summary-card,
  .summary-note {
    box-shadow: none;
  }
}
</style>




