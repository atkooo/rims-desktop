<template>
  <span :class="['icon', extraClass]" :style="{ width: size + 'px', height: size + 'px' }" aria-hidden>
    <svg v-if="name === 'dashboard'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"
      stroke-linejoin="round">
      <path d="M3 13h8V3H3v10z" />
      <path d="M21 21h-8v-6h8v6z" />
      <path d="M21 13h-8V3h8v10z" />
      <path d="M3 21h8v-4H3v4z" />
    </svg>

    <svg v-else-if="name === 'box'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"
      stroke-linejoin="round">
      <path
        d="M21 16V8a2 2 0 0 0-1-1.73L13 3a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73L11 21a2 2 0 0 0 2 0l7-3.27A2 2 0 0 0 21 16z" />
      <path d="M12 7v10" />
      <path d="M7 4.5l10 4" />
    </svg>

    <svg v-else-if="name === 'layers'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"
      stroke-linejoin="round">
      <path d="M12 2l9 4-9 4-9-4 9-4z" />
      <path d="M3 10l9 4 9-4" />
      <path d="M3 14l9 4 9-4" />
    </svg>

    <svg v-else-if="name === 'tag'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"
      stroke-linejoin="round">
      <path
        d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.59 9.59a2 2 0 0 0 2.82 0l4.59-4.59a2 2 0 0 0 0-2.82z" />
      <circle cx="7.5" cy="7.5" r="1" />
    </svg>

    <svg v-else-if="name === 'users'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"
      stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M7 21v-2a4 4 0 0 1 3-3.87" />
      <circle cx="12" cy="7" r="4" />
    </svg>

    <svg v-else-if="name === 'user'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"
      stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>

    <svg v-else-if="name === 'key'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"
      stroke-linejoin="round">
      <path d="M21 2l-2 2" />
      <path d="M7 14a5 5 0 1 0 7.07-7.07L9 3" />
      <path d="M16 8l5 5" />
    </svg>

    <svg v-else-if="name === 'clipboard'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"
      stroke-linejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>

    <svg v-else-if="name === 'money'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"
      stroke-linejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <path d="M10 10h4v4h-4z" />
    </svg>

    <svg v-else-if="name === 'file'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"
      stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>

    <svg v-else-if="name === 'chart-line'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"
      stroke-linejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 13l4-4 4 4 6-6" />
    </svg>

    <svg v-else-if="name === 'chart-bar'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"
      stroke-linejoin="round">
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-6" />
    </svg>

    <svg v-else-if="name === 'settings'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"
      stroke-linejoin="round">
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 2.28 17.7l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82L4.31 4.28A2 2 0 0 1 7.14 1.45l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 10 1.5V1a2 2 0 0 1 4 0v.09c.22.08.43.2.61.34h0a1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 0 1 19.72 4.3l-.06.06a1.65 1.65 0 0 0-.33 1.82v0c.14.29.26.6.34.91h0A1.65 1.65 0 0 0 19.4 9z" />
    </svg>

    <svg v-else-if="name === 'save'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"
      stroke-linejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8" />
    </svg>

    <svg v-else :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  </span>
</template>

<script>
export default {
  props: {
    name: { type: String, required: true },
    size: { type: Number, default: 16 },
    strokeWidth: { type: [Number, String], default: 1.5 },
    extraClass: { type: String, default: '' }
  }
};
</script>

<style scoped>
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  line-height: 0;
}

.icon svg {
  display: block;
}
</style>

