<script setup>
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useAuth } from '@/composables/useAuth'
import FormField from '@/components/FormField.vue'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import DailyBalanceChart from '@/components/DailyBalanceChart.vue' // Import the new chart component

const { get } = useApi()
const { isAdmin, user } = useAuth()

const reports = ref([])
const stores = ref([])
const isLoading = ref(false)
const expandedReport = ref(null)

const filter = ref({
  store_id: '',
  start_date: '',
  end_date: '',
})

const fetchReports = async () => {
  isLoading.value = true
  try {
    const queryParams = new URLSearchParams()

    // Add filters to query params
    if (filter.value.store_id) {
      queryParams.append('store_id', filter.value.store_id)
    }
    if (filter.value.start_date) {
      queryParams.append('start_date', filter.value.start_date)
    }
    if (filter.value.end_date) {
      queryParams.append('end_date', filter.value.end_date)
    }

    // Build the API URL with query parameters
    const apiUrl = queryParams.toString() ? `/reports?${queryParams.toString()}` : '/reports'

    console.log('Fetching reports with URL:', apiUrl) // Debug log

    const response = await get(apiUrl)
    let fetchedReports = response.reports || []

    // Apply client-side filtering if needed (in case API doesn't handle all filters)
    if (fetchedReports.length > 0) {
      // Filter by store if specified
      if (filter.value.store_id) {
        fetchedReports = fetchedReports.filter(
          (report) => report.store_id === filter.value.store_id,
        )
      }

      // Filter by date range if specified
      if (filter.value.start_date) {
        const startDate = new Date(filter.value.start_date)
        fetchedReports = fetchedReports.filter((report) => {
          const reportDate = new Date(report.report_date)
          return reportDate >= startDate
        })
      }

      if (filter.value.end_date) {
        const endDate = new Date(filter.value.end_date)
        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999)
        fetchedReports = fetchedReports.filter((report) => {
          const reportDate = new Date(report.report_date)
          return reportDate <= endDate
        })
      }
    }

    // Sort reports by report_date in descending order (newest first)
    fetchedReports.sort((a, b) => {
      const dateA = parseISO(a.report_date).getTime()
      const dateB = parseISO(b.report_date).getTime()

      // Primary sort: by date (newest first)
      if (dateA !== dateB) {
        return dateB - dateA // Descending order
      }

      // Secondary sort: by store_id (alphabetical)
      return a.store_id.localeCompare(b.store_id)
    })

    const processedReports = []
    const lastDayBalance = {} // To store the previous day's balance for each store

    // Group reports by store first
    const storeGroups = {}
    for (const report of fetchedReports) {
      if (!storeGroups[report.store_id]) {
        storeGroups[report.store_id] = []
      }
      storeGroups[report.store_id].push(report)
    }

    // Process each store's reports in chronological order for profit calculation
    for (const storeId in storeGroups) {
      const storeReports = storeGroups[storeId].sort(
        (a, b) => parseISO(a.report_date).getTime() - parseISO(b.report_date).getTime(),
      )

      for (const report of storeReports) {
        const currentBalance = report.total_balance || 0
        let profit = 0

        if (lastDayBalance[report.store_id] !== undefined) {
          profit = currentBalance - lastDayBalance[report.store_id]
        }

        processedReports.push({
          ...report,
          profit_today: profit,
        })

        lastDayBalance[report.store_id] = currentBalance
      }
    }

    // Final sort: by date (newest first) and then by store_id
    processedReports.sort((a, b) => {
      const dateA = parseISO(a.report_date).getTime()
      const dateB = parseISO(b.report_date).getTime()

      if (dateA !== dateB) {
        return dateB - dateA // Newest first
      }

      return a.store_id.localeCompare(b.store_id)
    })

    reports.value = processedReports

    console.log('Processed reports:', processedReports.length) // Debug log
  } catch (error) {
    console.error('Failed to fetch reports:', error)
  } finally {
    isLoading.value = false
  }
}

const fetchStores = async () => {
  try {
    const response = await get('/stores')
    if (!isAdmin.value && user.value?.user_id) {
      stores.value = response.stores.filter(
        (store) => store.employee_ids && store.employee_ids.includes(user.value.user_id),
      )
    } else {
      stores.value = response.stores || []
    }
  } catch (error) {
    console.error('Failed to fetch stores for filter:', error)
  }
}

onMounted(() => {
  fetchStores()
  fetchReports()
})

const storeOptions = computed(() => {
  return [
    { label: 'Semua Toko', value: '' },
    ...stores.value.map((store) => ({
      label: store.store_name,
      value: store.store_id,
    })),
  ]
})

// Computed untuk total saldo keseluruhan
const totalOverallBalance = computed(() => {
  return reports.value.reduce((sum, report) => sum + (report.total_balance || 0), 0)
})

// Computed untuk statistik
const reportStats = computed(() => {
  if (reports.value.length === 0) return null

  const balances = reports.value.map((r) => r.total_balance || 0)

  const stats = {
    totalReports: reports.value.length,
    totalBalance: totalOverallBalance.value,
    averageBalance: totalOverallBalance.value / reports.value.length,
    highestBalance: Math.max(...balances),
    lowestBalance: Math.min(...balances),
  }

  return stats
})

// Fungsi untuk format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

// Fungsi untuk format tanggal
const formatDate = (dateString) => {
  return format(new Date(dateString), 'dd MMMM yyyy', { locale: id })
}

// Fungsi untuk toggle expand detail
const toggleExpand = (reportId) => {
  expandedReport.value = expandedReport.value === reportId ? null : reportId
}

// Fungsi untuk mendapatkan warna berdasarkan saldo
const getBalanceColor = (balance) => {
  if (balance >= 10000000) return 'text-green-600'
  if (balance >= 5000000) return 'text-blue-600'
  if (balance >= 1000000) return 'text-yellow-600'
  return 'text-red-600'
}

// Fungsi untuk reset filter
const resetFilter = () => {
  filter.value = {
    store_id: '',
    start_date: '',
    end_date: '',
  }
  fetchReports()
}

// Watch for filter changes (optional - auto-apply filters)
// import { watch } from 'vue'
// watch(filter, () => {
//   fetchReports()
// }, { deep: true })
</script>

<template>
  <div class="container mx-auto py-8 px-4">
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-gray-800 mb-2">Dashboard Laporan Harian</h1>
      <p class="text-gray-600">Ringkasan visual dan detail laporan saldo harian dari semua toko</p>
    </div>

    <div class="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-100">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-gray-800 flex items-center">
          <svg
            class="w-5 h-5 mr-2 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            ></path>
          </svg>
          Filter Laporan
        </h2>
        <button @click="resetFilter" class="text-sm text-gray-500 hover:text-gray-700 underline">
          Reset Filter
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField
          label="Pilih Toko"
          type="select"
          v-model="filter.store_id"
          :options="storeOptions"
        />
        <FormField label="Dari Tanggal" type="date" v-model="filter.start_date" />
        <FormField label="Sampai Tanggal" type="date" v-model="filter.end_date" />
      </div>

      <div class="flex justify-end mt-6">
        <button
          @click="fetchReports"
          :disabled="isLoading"
          class="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-8 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md disabled:opacity-50 flex items-center"
        >
          <svg
            v-if="isLoading"
            class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {{ isLoading ? 'Memuat...' : 'Terapkan Filter' }}
        </button>
      </div>
    </div>

    <div v-if="reportStats" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div class="flex items-center">
          <div class="p-3 bg-blue-100 rounded-full">
            <svg
              class="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Laporan</p>
            <p class="text-2xl font-bold text-gray-900">{{ reportStats.totalReports }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div class="flex items-center">
          <div class="p-3 bg-green-100 rounded-full">
            <svg
              class="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              ></path>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Saldo</p>
            <p class="text-xl font-bold text-green-600">
              {{ formatCurrency(reportStats.totalBalance) }}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div class="flex items-center">
          <div class="p-3 bg-purple-100 rounded-full">
            <svg
              class="w-6 h-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              ></path>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Rata-rata</p>
            <p class="text-lg font-bold text-purple-600">
              {{ formatCurrency(reportStats.averageBalance) }}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div class="flex items-center">
          <div class="p-3 bg-emerald-100 rounded-full">
            <svg
              class="w-6 h-6 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 11l5-5m0 0l5 5m-5-5v12"
              ></path>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Tertinggi</p>
            <p class="text-lg font-bold text-emerald-600">
              {{ formatCurrency(reportStats.highestBalance) }}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div class="flex items-center">
          <div class="p-3 bg-red-100 rounded-full">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 13l-5 5m0 0l-5-5m5 5V6"
              ></path>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Terendah</p>
            <p class="text-lg font-bold text-red-600">
              {{ formatCurrency(reportStats.lowestBalance) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- <div class="bg-white rounded-xl shadow-lg border border-gray-100">
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-2xl font-semibold text-gray-800 flex items-center">
          <svg
            class="w-6 h-6 mr-3 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            ></path>
          </svg>
          Daftar Laporan
          <span class="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {{ reports.length }}
          </span>
        </h2>
      </div>

      <div class="p-6">
        <div v-if="isLoading" class="text-center py-12">
          <div
            class="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100"
          >
            <svg
              class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Memuat laporan...
          </div>
        </div>

        <div v-else-if="reports.length === 0" class="text-center py-12">
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            ></path>
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900">Tidak ada laporan</h3>
          <p class="mt-2 text-gray-500">
            Belum ada laporan yang sesuai dengan filter yang dipilih.
          </p>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            v-for="report in reports"
            :key="report.report_id"
            class="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
          >
            <div class="p-6 border-b border-gray-100">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h3 class="text-xl font-bold text-gray-800 mb-1">{{ report.store_name }}</h3>
                  <p class="text-sm text-gray-500 flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z"
                      ></path>
                    </svg>
                    {{ formatDate(report.report_date) }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-sm text-gray-500 mb-1">Total Saldo</p>
                  <p class="text-2xl font-bold" :class="getBalanceColor(report.total_balance)">
                    {{ formatCurrency(report.total_balance) }}
                  </p>
                </div>
              </div>

              <div class="flex justify-between items-center text-sm mb-4">
                <span class="text-gray-600 flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    ></path>
                  </svg>
                  Keuntungan Hari Ini:
                </span>
                <span
                  class="font-bold text-lg"
                  :class="{
                    'text-green-600': report.profit_today > 0,
                    'text-red-600': report.profit_today < 0,
                    'text-gray-600': report.profit_today === 0,
                  }"
                >
                  {{ formatCurrency(report.profit_today) }}
                </span>
              </div>
              <div class="flex justify-between items-center text-sm text-gray-600">
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    ></path>
                  </svg>
                  {{ report.creator_username }}
                </span>
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    ></path>
                  </svg>
                  {{ report.balances_detail?.length || 0 }} Bank
                </span>
              </div>
            </div>

            <div class="p-6">
              <div class="flex justify-between items-center mb-4">
                <h4 class="font-semibold text-gray-700">Detail Saldo per Bank</h4>
                <button
                  @click="toggleExpand(report.report_id)"
                  class="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {{ expandedReport === report.report_id ? 'Sembunyikan' : 'Lihat Detail' }}
                  <svg
                    class="w-4 h-4 ml-1 transform transition-transform duration-200"
                    :class="{ 'rotate-180': expandedReport === report.report_id }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </button>
              </div>

              <div v-if="expandedReport !== report.report_id" class="space-y-2">
                <div
                  v-for="(balance, index) in report.balances_detail?.slice(0, 3)"
                  :key="balance.bank_id"
                  class="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg"
                >
                  <span class="font-medium text-gray-700">{{ balance.bank_name }}</span>
                  <span class="font-semibold text-gray-800">{{
                    formatCurrency(balance.saldo)
                  }}</span>
                </div>
                <div
                  v-if="report.balances_detail?.length > 3"
                  class="text-center text-sm text-gray-500 py-2"
                >
                  +{{ report.balances_detail.length - 3 }} bank lainnya
                </div>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="balance in report.balances_detail"
                  :key="balance.bank_id"
                  class="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-l-4 border-blue-500"
                >
                  <div>
                    <span class="font-semibold text-gray-800">{{ balance.bank_name }}</span>
                    <p class="text-xs text-gray-500 mt-1">Bank ID: {{ balance.bank_id }}</p>
                  </div>
                  <div class="text-right">
                    <span class="font-bold text-lg" :class="getBalanceColor(balance.saldo)">
                      {{ formatCurrency(balance.saldo) }}
                    </span>
                  </div>
                </div>

                <div class="mt-4 pt-4 border-t border-gray-200">
                  <div
                    class="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-l-4 border-blue-600"
                  >
                    <span class="font-bold text-gray-800">Total Keseluruhan</span>
                    <span class="font-bold text-xl text-blue-600">
                      {{ formatCurrency(report.total_balance) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div> -->
  </div>
</template>

<style scoped>
.container {
  max-width: 1400px;
}
</style>
