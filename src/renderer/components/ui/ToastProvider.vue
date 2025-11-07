<template>
  <div>
    <slot />
    <div class="toasts">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">{{ t.message }}</div>
    </div>
  </div>
</template>
<script>
let id = 1;
export default {
  data(){ return { toasts: [] }; },
  provide(){
    return {
      toast: (message, type='success') => this.addToast(message, type)
    };
  },
  methods: {
    addToast(message, type){
      const t = { id: id++, message, type };
      this.toasts.push(t);
      setTimeout(() => { this.toasts = this.toasts.filter(x => x.id !== t.id); }, 2500);
    }
  }
};
</script>
<style>
.toasts { position: fixed; right: 16px; bottom: 16px; display:flex; flex-direction: column; gap:8px; z-index: 50; }
.toast { background:#ffffff; border:1px solid var(--border); border-left:4px solid var(--primary); box-shadow: 0 10px 30px rgba(15,23,42,.12); padding:10px 12px; border-radius:10px; min-width: 220px; }
.toast.success { border-left-color: #16a34a; }
.toast.error { border-left-color: #ef4444; }
.toast.info { border-left-color: #3b82f6; }
</style>

