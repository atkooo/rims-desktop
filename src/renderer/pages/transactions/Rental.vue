<template>
  <div class="page">
    <h1>Rental Baru</h1>
    <div class="grid">
      <div>
        <label>Pelanggan</label>
        <SelectSearch :options="customers" label-key="name" value-key="id" v-model="customerId"
          placeholder="Cari pelanggan" @change="onPickCustomer" />
        <div v-if="selectedCustomer" class="selected">Terpilih: {{ selectedCustomer.name }} ({{ selectedCustomer.phone
          }})</div>
      </div>
      <div class="dates">
        <label>Tgl. Sewa</label>
        <input type="date" v-model="rentalDate" />
        <label>Rencana Kembali</label>
        <input type="date" v-model="plannedReturnDate" />
        <div>Total Hari: <strong>{{ totalDays }}</strong></div>
      </div>
    </div>

    <div class="picker">
      <SelectSearch :options="items" :placeholder="'Cari barang'" label-key="name" value-key="id" @change="addItem" />
    </div>

    <Table>
      <template #head>
        <th>Kode</th>
        <th>Nama</th>
        <th>Qty</th>
        <th>Harga/Hari</th>
        <th>Subtotal</th>
        <th></th>
      </template>
      <tr v-for="row in cart" :key="row.id">
        <td>{{ row.code }}</td>
        <td>{{ row.name }}</td>
        <td><input type="number" min="1" v-model.number="row.quantity" /></td>
        <td>{{ formatCurrency(row.rental_price_per_day) }}</td>
        <td>{{ formatCurrency(row.rental_price_per_day * row.quantity * totalDays) }}</td>
        <td><Button variant="secondary" @click="remove(row.id)">Hapus</Button></td>
      </tr>
    </Table>

    <div class="totals">
      <div>Subtotal: <strong>{{ formatCurrency(subtotal) }}</strong></div>
      <div>Deposit:
        <NumberInput v-model="deposit" />
      </div>
      <div>Diskon:
        <NumberInput v-model="discount" />
      </div>
      <div>Total: <strong>{{ formatCurrency(total) }}</strong></div>
    </div>

    <div class="actions">
      <Button variant="secondary">Batal</Button>
      <Button @click="submit">Simpan Rental</Button>
    </div>
  </div>
</template>

<script>
import Table from '@ui/Table.vue';
import Button from '@ui/Button.vue';
import SelectSearch from '@ui/SelectSearch.vue';
import NumberInput from '@ui/NumberInput.vue';
import { formatCurrency } from '@utils/format';

export default {
  components: { Table, Button, SelectSearch, NumberInput },
  data() {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    return {
      customerId: null,
      selectedCustomer: null,
      customers: [{ id: 1, code: 'C-001', name: 'Sinta', phone: '0812-xxx' }, { id: 2, code: 'C-002', name: 'Budi', phone: '0813-yyy' }],
      rentalDate: today,
      plannedReturnDate: tomorrow,
      itemQuery: '',
      items: [
        { id: 1, code: 'BA-001', name: 'Kebaya Bali', available_quantity: 8, rental_price_per_day: 75000 },
        { id: 2, code: 'AK-010', name: 'Siger Sunda', available_quantity: 2, rental_price_per_day: 50000 }
      ],
      cart: [],
      deposit: 0,
      discount: 0
    };
  },
  computed: {

    totalDays() {
      const d1 = new Date(this.rentalDate);
      const d2 = new Date(this.plannedReturnDate);
      const diff = Math.ceil((d2 - d1) / (24 * 3600 * 1000));
      return diff > 0 ? diff : 1;
    },
    subtotal() {
      return this.cart.reduce((s, r) => s + r.rental_price_per_day * r.quantity * this.totalDays, 0);
    },
    total() { return Math.max(0, this.subtotal - this.discount + 0); }
  },
  methods: {
    formatCurrency,
    onPickCustomer(c) { this.selectedCustomer = c; this.customerId = c?.id ?? null; },
    addItem(i) {
      const exist = this.cart.find(r => r.id === i.id);
      if (exist) { exist.quantity += 1; } else { this.cart.push({ ...i, quantity: 1 }); }
      this.itemQuery = '';
    },
    remove(id) { this.cart = this.cart.filter(r => r.id !== id); },
    submit() { alert('Draft tersimpan (UI)'); }
  }
};
</script>

<style>
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.results {
  background: #fff;
  border: 1px solid #ddd;
  max-height: 160px;
  overflow: auto;
  margin-top: 4px;
}

.results li {
  padding: 6px 8px;
  cursor: pointer;
}

.results li:hover {
  background: #f3f4f6;
}

.selected {
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
}

.picker {
  margin: 16px 0;
}

.totals {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: flex-end;
  padding: 16px 0;
  margin-top: 16px;
  border-top: 1px solid var(--border);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

input,
select {
  padding: 6px 8px;
}
</style>
