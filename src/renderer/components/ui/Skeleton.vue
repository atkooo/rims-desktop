<template>
  <div class="skeleton" :style="{ width, height }"></div>
</template>
<script>
export default { props: { width: { type: String, default: '100%' }, height: { type: String, default: '14px' } } };
</script>
<style>
.skeleton {
  background: linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9);
  background-size: 200% 100%;
  border-radius: 8px;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>
