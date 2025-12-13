<template>
  <div class="cashier-session-page">
    <CashierView />
  </div>
</template>

<script>
import CashierView from "@/views/transaction/CashierView.vue";

export default {
  name: "CashierSessionPage",
  components: {
    CashierView,
  },
};
</script>

<style scoped>
.cashier-session-page {
  padding: 1.5rem 2rem;
}
</style>

