<template>
  <div class="page">
    <h1>Penjualan Baru</h1>
    <div class="grid">
      <div>
        <label>Pelanggan (opsional)</label>
        <SelectSearch :options="customers" label-key="name" value-key="id" v-model="customerId" placeholder="Cari pelanggan" @change="onPickCustomer" />
        <div v-if="selectedCustomer" class="selected">Terpilih: {{ selectedCustomer.name }} ({{ selectedCustomer.phone }})</div>
      </div>
      <div class="dates">
        <label>Tanggal</label>
        <input type="date" v-model="saleDate" />
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
        <th>Harga</th>
        <th>Subtotal</th>
        <th></th>
      </template>
      <tr v-for="row in cart" :key="row.id">
        <td>{{ row.code }}</td>
        <td>{{ row.name }}</td>
        <td><input type="number" min="1" v-model.number="row.quantity" /></td>
        <td>{{ formatCurrency(row.sale_price) }}</td>
        <td>{{ formatCurrency(row.sale_price * row.quantity) }}</td>
        <td><Button variant="secondary" @click="remove(row.id)">Hapus</Button></td>
      </tr>
    </Table>

    <div class="totals">
      <div>Subtotal: <strong>{{ formatCurrency(subtotal) }}</strong></div>
      <div>Diskon: <NumberInput v-model="discount" /></div>
      <div>Bayar: <NumberInput v-model="paid" /></div>
      <div>Total: <strong>{{ formatCurrency(total) }}</strong></div>
      <div>Kembali: <strong>{{ formatCurrency(changeAmount) }}</strong></div>
    </div>

    <div class="actions">
      <Button variant="secondary">Batal</Button>
      <Button @click="submit">Simpan Penjualan</Button>
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
    const today = new Date().toISOString().slice(0,10);
    return {
      customerId: null,
      selectedCustomer: null,
      customers: [ { id:1, code:'C-001', name:'Sinta', phone:'0812-xxx' }, { id:2, code:'C-002', name:'Budi', phone:'0813-yyy' } ],
      saleDate: today,
      itemQuery: '',
      items: [
        { id:1, code:'BA-001', name:'Kebaya Bali', available_quantity:8, sale_price:450000 },
        { id:2, code:'AK-010', name:'Siger Sunda', available_quantity:2, sale_price:250000 }
      ],
      cart: [],
      discount: 0,
      paid: 0
    };
  },
  computed: {
    
    subtotal() { return this.cart.reduce((s, r) => s + r.sale_price * r.quantity, 0); },
    total() { return Math.max(0, this.subtotal - this.discount); },
    changeAmount() { return Math.max(0, this.paid - this.total); }
  },
  methods: {
    formatCurrency,
    onPickCustomer(c) { this.selectedCustomer = c; this.customerId = c?.id ?? null; },
    addItem(i) {
      const exist = this.cart.find(r => r.id === i.id);
      if (exist) { exist.quantity += 1; } else { this.cart.push({ ...i, quantity:1 }); }
      this.itemQuery = '';
    },
    remove(id) { this.cart = this.cart.filter(r => r.id !== id); },
    submit() { alert('Draft tersimpan (UI)'); }
  }
};
</script>

<style>
.grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom: 16px; }
.results { background:#fff; border:1px solid #ddd; max-height:160px; overflow:auto; margin-top:4px; }
.results li { padding:6px 8px; cursor:pointer; }
.results li:hover { background:#f3f4f6; }
.selected { margin-top:8px; color: var(--muted); font-size: 13px; }
.picker { margin:16px 0; }
.totals { display:flex; gap:16px; align-items:center; justify-content:flex-end; padding:16px 0; margin-top: 16px; border-top: 1px solid var(--border); flex-wrap: wrap; }
.actions { display:flex; justify-content:flex-end; gap:8px; margin-top: 16px; }
input, select { padding:6px 8px; }
</style>
