<template>
  <div v-if="show" class="modal">
    <div class="modal-content">
      <slot />
      <button @click="$emit('close')">Tutup</button>
    </div>
  </div>
</template>
<script>
export default { props: { show: { type: Boolean, default: false } } };
</script>
<style>
.modal { position: fixed; inset: 0; backdrop-filter: blur(2px); background: rgba(15,23,42,.25); display:flex; align-items:center; justify-content:center; padding: 20px; z-index: 1000; }
.modal-content { background:#ffffff; color: var(--text); border:1px solid var(--border); box-shadow: 0 30px 80px rgba(15, 23, 42, .18); padding:20px; border-radius:14px; min-width:380px; max-width: 90vw; max-height: 90vh; overflow-y: auto; }
.modal-content h3 { margin: 0 0 16px; font-size: 18px; }
.modal-content button { margin-top: 16px; }
</style>

