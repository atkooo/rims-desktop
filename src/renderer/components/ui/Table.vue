<template>
  <table class="table">
    <thead><tr><slot name="head" /></tr></thead>
    <tbody><slot /></tbody>
  </table>
</template>
<script>
export default {};
</script>
<style>
.table { width:100%; border-collapse: separate; border-spacing:0; background: var(--card); border:1px solid var(--border); border-radius:12px; overflow:hidden; margin-top: 0; }
.table th { text-align:left; font-weight:600; color:#334155; background:#f8fafc; }
.table th, .table td { padding:10px 12px; border-bottom:1px solid var(--border); }
.table tr:last-child td { border-bottom: 0; }
.table tbody tr:hover { background:#f8fafc; }
</style>

