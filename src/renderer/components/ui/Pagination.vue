<template>
  <div class="pagination">
    <button :disabled="page===1" @click="$emit('update:page', page-1)">Sebelumnya</button>
    <span>Hal {{ page }} / {{ totalPages }}</span>
    <button :disabled="page===totalPages" @click="$emit('update:page', page+1)">Berikutnya</button>
    <select :value="pageSize" @change="$emit('update:pageSize', Number($event.target.value))">
      <option :value="10">10</option>
      <option :value="20">20</option>
      <option :value="50">50</option>
    </select>
  </div>
</template>
<script>
export default { props: { page: {type:Number, default:1}, total: {type:Number, default:0}, pageSize: {type:Number, default:10} }, computed:{ totalPages(){ return Math.max(1, Math.ceil(this.total/this.pageSize)); } } };
</script>
<style>
.pagination { display:flex; gap:8px; align-items:center; justify-content:flex-end; padding-top:16px; margin-top: 16px; border-top: 1px solid var(--border); }
.pagination button { padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:#ffffff; color: var(--text); cursor: pointer; transition: background .15s; }
.pagination button:hover:not(:disabled) { background:#f8fafc; }
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
.pagination select { padding:6px 8px; }
</style>

