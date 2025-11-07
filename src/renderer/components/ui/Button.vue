<template>
  <button class="btn" :class="variant"><slot /></button>
</template>
<script>
export default { props: { variant: { type: String, default: 'primary' } } };
</script>
<style>
.btn { padding:10px 14px; border-radius:10px; border:1px solid transparent; color:#fff; background: var(--primary); box-shadow: 0 8px 18px rgba(79,70,229,.18); transition: .15s transform, .15s box-shadow, .15s background; }
.btn:hover { transform: translateY(-1px); box-shadow: 0 12px 26px rgba(79,70,229,.35); background: var(--primary-600); }
.btn:active { transform: translateY(0); }
.btn.secondary { background:#e2e8f0; border-color:#cbd5e1; color:#0f172a; box-shadow: none; }
.btn.secondary:hover { background:#cbd5e1; }
</style>

