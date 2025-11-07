<template>
  <div class="empty">
    <div class="icon">ℹ️</div>
    <div class="title">{{ title }}</div>
    <div class="desc">{{ description }}</div>
    <slot />
  </div>
</template>
<script>
export default { props: { title: { type: String, default: 'Belum ada data' }, description: { type: String, default: 'Silakan tambah data baru.' } } };
</script>
<style>
.empty {
  text-align: center;
  padding: 40px 24px;
  color: #64748b;
}

.empty .icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty .title {
  margin-top: 12px;
  color: #0f172a;
  font-weight: 600;
  font-size: 16px;
}

.empty .desc {
  margin-top: 8px;
  font-size: 14px;
}
</style>
