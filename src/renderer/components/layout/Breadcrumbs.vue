<template>
  <nav class="breadcrumbs">
    <span v-for="(c, idx) in crumbs" :key="idx">
      <router-link v-if="idx < crumbs.length - 1" :to="c.to">{{
        c.label
      }}</router-link>
      <span v-else>{{ c.label }}</span>
      <span v-if="idx < crumbs.length - 1" class="sep">/</span>
    </span>
  </nav>
</template>
<script>
export default {
  computed: {
    crumbs() {
      const path = this.$route.path.split("/").filter(Boolean);
      
      // Handle root path (dashboard)
      if (path.length === 0) {
        return [{ label: "Dashboard", to: "/" }];
      }
      
      const acc = [];
      return path.map((segment, i) => {
        acc.push("/" + segment);
        let label = segment
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
        
        // Map specific route names to better labels
        const routeLabels = {
          "master": "Master Data",
          "transactions": "Transaksi",
          "reports": "Laporan",
          "settings": "Pengaturan",
        };
        
        if (routeLabels[segment]) {
          label = routeLabels[segment];
        }
        
        return { label, to: acc.join("") };
      });
    },
  },
};
</script>
<style>
.breadcrumbs {
  color: #64748b;
  font-size: 12px;
  margin-bottom: 12px;
}

.breadcrumbs a {
  color: #475569;
  text-decoration: none;
}

.breadcrumbs a:hover {
  color: var(--primary);
}

.breadcrumbs .sep {
  margin: 0 6px;
  color: #94a3b8;
}
</style>
