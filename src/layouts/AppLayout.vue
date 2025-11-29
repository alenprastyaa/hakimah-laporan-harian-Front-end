<script setup>
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
</script>

<
<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <AppHeader />
    <div class="flex flex-1 pt-16">
      <AppSidebar />
      <main class="flex-1 main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Default margin-left for larger screens */
.main-content {
  margin-left: 300px;
}

/* Remove margin-left when screen width is less than 600px */
@media (max-width: 599px) {
  .main-content {
    margin-left: 0 !important; /* Use !important to override inline style */
  }
}
</style>
