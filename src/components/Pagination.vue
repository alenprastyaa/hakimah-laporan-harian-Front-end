<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: {
    type: Number,
    required: true,
  },
  totalPages: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(['page-change'])

const pages = computed(() => {
  const pagesArray = []
  for (let i = 1; i <= props.totalPages; i++) {
    pagesArray.push(i)
  }
  return pagesArray
})

const goToPage = (page) => {
  if (page >= 1 && page <= props.totalPages) {
    emit('page-change', page)
  }
}
</script>

<template>
  <nav v-if="totalPages > 1" class="flex justify-center items-center space-x-2 mt-4">
    <button
      @click="goToPage(currentPage - 1)"
      :disabled="currentPage === 1"
      class="px-3 py-1 border rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
    >
      Previous
    </button>
    <button
      v-for="page in pages"
      :key="page"
      @click="goToPage(page)"
      :class="{
        'px-3 py-1 border rounded-md': true,
        'bg-blue-500 text-white': page === currentPage,
        'bg-gray-200 hover:bg-gray-300': page !== currentPage,
      }"
    >
      {{ page }}
    </button>
    <button
      @click="goToPage(currentPage + 1)"
      :disabled="currentPage === totalPages"
      class="px-3 py-1 border rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
    >
      Next
    </button>
  </nav>
</template>
