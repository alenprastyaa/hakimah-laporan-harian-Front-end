<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import { useAuth } from '@/composables/useAuth'
import FormField from '@/components/FormField.vue'
import { format } from 'date-fns'

const { get } = useApi()
const { isAdmin, user } = useAuth()

const analysisResults = ref([])
const stores = ref([])
const isLoading = ref(false)
const error = ref('')

const filter = ref({
  store_id: '',
  date: format(new Date(), 'yyyy-MM-dd'),
})

const fetchStores = async () => {
  try {
    error.value = ''
    const response = await get('/stores')

    if (response && response.stores) {
      if (user.value && !isAdmin.value) {
        // Filter stores for non-admin users
        stores.value = response.stores.filter(
          (store) => store.employee_ids && store.employee_ids.includes(user.value.user_id),
        )

        // Auto-select first store for employees
        if (stores.value.length > 0 && !filter.value.store_id) {
          filter.value.store_id = stores.value[0].store_id
        }
      } else {
        stores.value = response.stores
      }
    } else {
      console.warn('Invalid response structure from /stores:', response)
      stores.value = []
    }
  } catch (err) {
    console.error('Failed to fetch stores:', err)
    error.value = 'Gagal memuat data toko'
    stores.value = []
  }
}

const fetchProfitAnalysis = async () => {
  // Don't fetch if user is not loaded yet
  if (!user.value) {
    return
  }

  // For non-admin users, store_id is required
  if (!isAdmin.value && !filter.value.store_id) {
    analysisResults.value = []
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const queryParams = new URLSearchParams()
    if (filter.value.store_id) {
      queryParams.append('store_id', filter.value.store_id)
    }
    if (filter.value.date) {
      queryParams.append('date', filter.value.date)
    }

    const response = await get(`/reports/analysis/profit?${queryParams.toString()}`)

    if (response && Array.isArray(response.analysis)) {
      analysisResults.value = response.analysis
    } else {
      console.warn('Invalid response structure from profit analysis:', response)
      analysisResults.value = []
    }
  } catch (err) {
    console.error('Failed to fetch profit analysis:', err)
    error.value = 'Gagal memuat analisis profit'
    analysisResults.value = []
  } finally {
    isLoading.value = false
  }
}

// Computed property for store options
const storeOptions = computed(() => {
  const options = stores.value.map((store) => ({
    label: store.store_name,
    value: store.store_id,
  }))

  // Admin can select 'All Stores'
  if (isAdmin.value) {
    return [{ label: 'Semua Toko', value: '' }, ...options]
  }

  return options
})

// Initialize data on component mount
onMounted(async () => {
  // Wait for user data to be available
  if (user.value) {
    await fetchStores()
  }
})

// Watch for user authentication changes
watch(
  user,
  async (newUser) => {
    if (newUser) {
      await fetchStores()
    } else {
      // Clear data if user logs out
      stores.value = []
      analysisResults.value = []
      filter.value.store_id = ''
    }
  },
  { immediate: true },
)

// Watch for filter changes
watch(
  () => [filter.value.store_id, filter.value.date],
  () => {
    if (user.value) {
      fetchProfitAnalysis()
    }
  },
  { deep: true },
)

// Format currency helper
const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return 'Rp 0'
  return `Rp ${amount.toLocaleString('id-ID')}`
}

// Format date helper
const formatDate = (dateString) => {
  try {
    return new Date(dateString).toLocaleDateString('id-ID')
  } catch (err) {
    return dateString
  }
}
</script>

<template>
  <div class="container mx-auto py-8">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">Analisis Profit Toko</h1>

    <!-- Error Message -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
      {{ error }}
    </div>

    <!-- Filter Section -->
    <div class="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 class="text-xl font-semibold mb-4">Filter Analisis</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Pilih Toko"
          type="select"
          v-model="filter.store_id"
          :options="storeOptions"
          :disabled="!user || stores.length === 0"
          :required="!isAdmin"
          placeholder="Pilih toko..."
        />
        <FormField label="Tanggal Analisis" type="date" v-model="filter.date" required />
      </div>
    </div>

    <!-- Results Section -->
    <div class="bg-white p-6 rounded-lg shadow-md">
      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-8">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
        ></div>
        <p class="mt-2 text-gray-600">Memuat analisis profit...</p>
      </div>

      <!-- No Data State -->
      <div
        v-else-if="analysisResults.length === 0 && !error"
        class="text-center py-8 text-gray-500"
      >
        <p>Tidak ada data analisis profit yang ditemukan untuk filter ini.</p>
        <p v-if="!isAdmin && !filter.store_id" class="text-sm mt-2">
          Silakan pilih toko terlebih dahulu.
        </p>
      </div>

      <!-- Data Table -->
      <div v-else class="overflow-x-auto">
        <table class="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
              >
                Toko
              </th>
              <th
                class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
              >
                Tanggal
              </th>
              <th
                class="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
              >
                Saldo Hari Ini
              </th>
              <th
                class="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
              >
                Saldo Kemarin
              </th>
              <th
                class="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
              >
                Profit/Defisit
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="item in analysisResults"
              :key="`${item.store_id}-${item.date}`"
              class="hover:bg-gray-50 transition-colors duration-200"
            >
              <td class="py-3 px-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ item.store_name || 'N/A' }}
              </td>
              <td class="py-3 px-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(item.date) }}
              </td>
              <td class="py-3 px-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {{ formatCurrency(item.today_balance) }}
              </td>
              <td class="py-3 px-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {{ formatCurrency(item.yesterday_balance) }}
              </td>
              <td
                class="py-3 px-4 whitespace-nowrap text-sm text-right font-semibold"
                :class="{
                  'text-green-600': item.profit >= 0,
                  'text-red-600': item.profit < 0,
                }"
              >
                {{ formatCurrency(item.profit) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
