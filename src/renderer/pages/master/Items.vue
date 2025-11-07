<template>
  <div class="page">
    <h1>Barang</h1>
    <div class="toolbar">
      <input v-model="q" placeholder="Cari nama/kode..." />
      <select v-model="category">
        <option value="">Semua Kategori</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <label><input type="checkbox" v-model="onlyAvailable" /> Hanya tersedia</label>
      <Button @click="openNew">Tambah Barang</Button>
    </div>

    <Table>
      <template #head>
        <th>Kode</th>
        <th>Nama</th>
        <th>Kategori</th>
        <th>Stok</th>
        <th>Tersedia</th>
        <th>Sewa/Hari</th>
        <th>Jual</th>
        <th>Aksi</th>
      </template>
      <tr v-for="item in filteredItems" :key="item.id">
        <td>{{ item.code }}</td>
        <td>{{ item.name }}</td>
        <td>{{ item.category_name }}</td>
        <td>{{ item.stock_quantity }}</td>
        <td>{{ item.available_quantity }}</td>
        <td>{{ formatCurrency(item.rental_price_per_day) }}</td>
        <td>{{ formatCurrency(item.sale_price) }}</td>
        <td>
          <Button variant="secondary" @click="edit(item)">Edit</Button>
        </td>
      </tr>
    </Table>
    <div v-if="filteredItems.length===0" class="mt-16">
      <EmptyState title="Belum ada barang" description="Tambah barang baru untuk memulai." />
    </div>
    <Pagination class="mt-12" v-model:page="page" :total="filteredCount" v-model:pageSize="pageSize" />

    <Modal :show="showForm" @close="showForm=false">
      <h3>{{ form.id ? 'Edit Barang' : 'Tambah Barang' }}</h3>
      <div class="form-grid">
        <input v-model="form.code" placeholder="Kode" />
        <input v-model="form.name" placeholder="Nama" />
        <select v-model="form.category_id">
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <input v-model.number="form.stock_quantity" type="number" placeholder="Stok" />
        <input v-model.number="form.available_quantity" type="number" placeholder="Tersedia" />
        <input v-model.number="form.rental_price_per_day" type="number" step="0.01" placeholder="Harga sewa/hari" />
        <input v-model.number="form.sale_price" type="number" step="0.01" placeholder="Harga jual" />
      </div>
      <div class="actions">
        <Button variant="secondary" @click="showForm=false">Batal</Button>
        <Button @click="save">Simpan</Button>
      </div>
    </Modal>
  </div>
  
</template>

<script>
import Table from '@ui/Table.vue';
import Button from '@ui/Button.vue';
import Modal from '@ui/Modal.vue';
import Pagination from '@ui/Pagination.vue';
import EmptyState from '@ui/EmptyState.vue';
import { formatCurrency } from '@utils/format';

export default {
  components: { Table, Button, Modal, Pagination, EmptyState },
  data() {
    return {
      page: 1,
      pageSize: 10,
      q: '',
      category: '',
      onlyAvailable: false,
      categories: [
        { id: 1, name: 'Baju Adat' },
        { id: 2, name: 'Aksesoris' },
        { id: 3, name: 'Pernikahan' }
      ],
      items: [
        { id:1, code:'BA-001', name:'Kebaya Bali', category_id:1, category_name:'Baju Adat', stock_quantity:10, available_quantity:8, rental_price_per_day:75000, sale_price:450000 },
        { id:2, code:'AK-010', name:'Siger Sunda', category_id:2, category_name:'Aksesoris', stock_quantity:5, available_quantity:2, rental_price_per_day:50000, sale_price:250000 }
      ],
      showForm: false,
      form: { id:null, code:'', name:'', category_id:null, stock_quantity:0, available_quantity:0, rental_price_per_day:0, sale_price:0 }
    };
  },
  computed: {
    filteredList() {
      return this.items
        .filter(x => (this.category ? x.category_id === this.category : true))
        .filter(x => (this.onlyAvailable ? x.available_quantity > 0 : true))
        .filter(x => (this.q ? (x.name.toLowerCase().includes(this.q.toLowerCase()) || x.code.toLowerCase().includes(this.q.toLowerCase())) : true));
    },
    filteredCount(){ return this.filteredList.length; },
    filteredItems(){
      const start = (this.page-1)*this.pageSize;
      return this.filteredList.slice(start, start+this.pageSize);
    }
  },
  methods: {
    formatCurrency,
    openNew() { this.form = { id:null, code:'', name:'', category_id:null, stock_quantity:0, available_quantity:0, rental_price_per_day:0, sale_price:0 }; this.showForm = true; },
    edit(item) { this.form = { ...item }; this.showForm = true; },
    save() { this.showForm = false; }
  }
};
</script>

<style>
.toolbar { display:flex; gap:8px; align-items:center; margin-bottom: 16px; flex-wrap: wrap; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:16px 0; }
.actions { display:flex; justify-content:flex-end; gap:8px; margin-top: 16px; }
</style>
