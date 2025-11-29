<script setup>
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useAuth } from '@/composables/useAuth'
import { useSweetAlert } from '@/composables/useSweetAlert'
import FormField from '@/components/FormField.vue'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import Swal from 'sweetalert2'

const { get, del, put, removeUangNitip } = useApi()
const { isAdmin, user } = useAuth()
const { showAlert, showConfirm } = useSweetAlert()

const reports = ref([])
const stores = ref([])
const banks = ref([])
const isLoading = ref(false)
const showModal = ref(false)
const showEditModal = ref(false)
const selectedReport = ref(null)
const editableReport = ref(null)
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalPages = ref(0)
const totalItems = ref(0)

const filter = ref({
  store_id: '',
  start_date: '',
  end_date: '',
})

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    fetchReports()
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchReports()
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchReports()
  }
}

const changeItemsPerPage = () => {
  currentPage.value = 1
  fetchReports()
}

const fetchReports = async () => {
  isLoading.value = true
  try {
    const queryParams = new URLSearchParams()

    if (filter.value.store_id) {
      queryParams.append('store_id', filter.value.store_id)
    }
    if (filter.value.start_date) {
      queryParams.append('start_date', filter.value.start_date)
    }
    if (filter.value.end_date) {
      queryParams.append('end_date', filter.value.end_date)
    }

    queryParams.append('page', currentPage.value)
    queryParams.append('limit', itemsPerPage.value)

    const apiUrl = `/reports?${queryParams.toString()}`
    console.log('Fetching reports with URL:', apiUrl)

    const response = await get(apiUrl)
    let fetchedReports = response.reports || []

    totalItems.value = response.total || fetchedReports.length
    totalPages.value = response.total_pages || Math.ceil(totalItems.value / itemsPerPage.value)

    if (fetchedReports.length > 0) {
      if (filter.value.store_id) {
        fetchedReports = fetchedReports.filter(
          (report) => report.store_id === filter.value.store_id,
        )
      }

      if (filter.value.start_date) {
        const startDate = new Date(filter.value.start_date)
        fetchedReports = fetchedReports.filter((report) => {
          const reportDate = new Date(report.report_date)
          return reportDate.setHours(0, 0, 0, 0) >= startDate.setHours(0, 0, 0, 0)
        })
      }

      if (filter.value.end_date) {
        const endDate = new Date(filter.value.end_date)
        endDate.setHours(23, 59, 59, 999)
        fetchedReports = fetchedReports.filter((report) => {
          const reportDate = new Date(report.report_date)
          return reportDate <= endDate
        })
      }
    }

    // Sorting Laporan: Urutkan berdasarkan tanggal terbaru, lalu nama toko
    fetchedReports.sort((a, b) => {
      const dateA = parseISO(a.report_date).getTime()
      const dateB = parseISO(b.report_date).getTime()

      if (dateA !== dateB) {
        return dateB - dateA // Terbaru dulu
      }

      return a.store_name.localeCompare(b.store_name)
    })

    const processedReports = []
    const lastDayBalance = {}

    const storeGroups = {}
    for (const report of fetchedReports) {
      if (!storeGroups[report.store_id]) {
        storeGroups[report.store_id] = []
      }
      storeGroups[report.store_id].push(report)
    }

    for (const storeId in storeGroups) {
      const storeReports = storeGroups[storeId].sort(
        (a, b) => parseISO(a.report_date).getTime() - parseISO(b.report_date).getTime(),
      )

      lastDayBalance[storeId] = undefined

      for (const report of storeReports) {
        const currentBalance = report.total_balance || 0
        let profit = 0

        if (lastDayBalance[storeId] !== undefined) {
          profit = currentBalance - lastDayBalance[storeId]
        }

        processedReports.push({
          ...report,
          profit_today: profit,
        })

        lastDayBalance[storeId] = currentBalance
      }
    }

    processedReports.sort((a, b) => {
      const dateA = parseISO(a.report_date).getTime()
      const dateB = parseISO(b.report_date).getTime()

      if (dateA !== dateB) {
        return dateB - dateA
      }

      return a.store_name.localeCompare(b.store_name)
    })

    reports.value = processedReports

    console.log('Processed reports:', processedReports.length)
  } catch (error) {
    console.error('Failed to fetch reports:', error)
    showAlert('Error', 'Gagal memuat laporan. Silakan coba lagi.', 'error')
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
    showAlert('Error', 'Gagal memuat daftar toko.', 'error')
  }
}

const fetchBanks = async () => {
  try {
    const response = await get('/banks')
    banks.value = response.banks || []
  } catch (error) {
    console.error('Failed to fetch banks:', error)
    showAlert('Error', 'Gagal memuat daftar bank.', 'error')
  }
}

const deleteReport = async (reportId) => {
  // Validate input
  if (!reportId || typeof reportId !== 'string') {
    console.error('Invalid report ID:', reportId)
    await showAlert('Error', 'ID laporan tidak valid.', 'error')
    return
  }

  // Show confirmation dialog
  const result = await showConfirm(
    'Konfirmasi Hapus',
    'Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.',
    'warning',
    'Ya, Hapus',
    'Batal',
  )

  if (!result.isConfirmed) {
    return // Exit if user cancels
  }

  try {
    isLoading.value = true

    await del(`/reports/${reportId}`)

    reports.value = reports.value.filter((report) => report.report_id !== reportId)

    if (selectedReport.value?.report_id === reportId) {
      selectedReport.value = null
    }

    if (showModal.value && selectedReport.value?.report_id === reportId) {
      closeModal()
    }

    await showAlert('Berhasil', 'Laporan berhasil dihapus.', 'success')

    await fetchReports()
  } catch (error) {
    console.error('Failed to delete report:', error)

    let errorMessage = 'Gagal menghapus laporan. Silakan coba lagi.'

    if (error.response) {
      const { status, data } = error.response
      if (status === 404) {
        errorMessage = 'Laporan tidak ditemukan.'
      } else if (status === 403) {
        errorMessage = 'Anda tidak memiliki izin untuk menghapus laporan ini.'
      } else if (status >= 500) {
        errorMessage = 'Terjadi kesalahan server. Silakan coba lagi nanti.'
      } else if (data?.message) {
        errorMessage = data.message
      }
    } else if (error.request) {
      errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
    } else {
      errorMessage = 'Terjadi kesalahan tidak terduga.'
    }

    await showAlert('Error', errorMessage, 'error')
  } finally {
    isLoading.value = false
  }
}
const openEditModal = (report) => {
  editableReport.value = JSON.parse(JSON.stringify(report))

  if (editableReport.value.report_date) {
    editableReport.value.report_date = format(parseISO(report.report_date), 'yyyy-MM-dd')
  } else {
    editableReport.value.report_date = ''
  }

  if (!editableReport.value.balances && editableReport.value.balances_detail) {
    editableReport.value.balances = editableReport.value.balances_detail.map((detail) => ({
      bank_id: detail.bank_id,
      saldo: detail.saldo,
    }))
  }

  if (typeof editableReport.value.uang_nitip === 'undefined') {
    editableReport.value.uang_nitip = 0
  }

  if (!editableReport.value.balances) {
    editableReport.value.balances = []
  }

  showEditModal.value = true
  closeModal()
}

const closeEditModal = () => {
  showEditModal.value = false
  editableReport.value = null
}

const updateReport = async () => {
  if (!editableReport.value) return

  if (
    !editableReport.value.store_id ||
    !editableReport.value.report_date ||
    editableReport.value.balances.length === 0 ||
    typeof editableReport.value.uang_nitip === 'undefined'
  ) {
    showAlert(
      'Peringatan',
      'Harap lengkapi semua kolom wajib (Toko, Tanggal, Saldo Bank, dan Uang Nitip).',
      'warning',
    )
    return
  }

  for (const balance of editableReport.value.balances) {
    if (!balance.bank_id || balance.saldo === null || balance.saldo === undefined) {
      showAlert(
        'Peringatan',
        'Harap lengkapi semua detail bank (Bank dan Saldo harus diisi).',
        'warning',
      )
      return
    }
  }

  const result = await showConfirm(
    'Konfirmasi Perubahan',
    'Apakah Anda yakin ingin menyimpan perubahan ini?',
    'info',
    'Ya, Simpan!',
    'Batal',
  )

  if (result.isConfirmed) {
    isLoading.value = true
    try {
      const payload = {
        store_id: editableReport.value.store_id,
        report_date: editableReport.value.report_date,
        balances: editableReport.value.balances.map((balance) => ({
          bank_id: balance.bank_id,
          saldo: parseFloat(balance.saldo) || 0,
        })),
        keterangan: editableReport.value.keterangan || '',
        uang_nitip: parseFloat(editableReport.value.uang_nitip) || 0,
      }

      console.log('Updating report with payload:', payload)

      const response = await put(`/reports/${editableReport.value.report_id}`, payload)

      const index = reports.value.findIndex((r) => r.report_id === editableReport.value.report_id)
      if (index !== -1) {
        reports.value[index] = {
          ...reports.value[index],
          ...response,
          profit_today: reports.value[index].profit_today,
        }
      }

      await showAlert('Berhasil!', 'Laporan berhasil diperbarui.', 'success')
      closeEditModal()

      await fetchReports()
    } catch (error) {
      console.error('Failed to update report:', error)

      let errorMessage = 'Gagal memperbarui laporan. Silakan coba lagi.'

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      showAlert('Error', errorMessage, 'error')
    } finally {
      isLoading.value = false
    }
  }
}

const addBankDetail = () => {
  if (editableReport.value) {
    editableReport.value.balances.push({
      bank_id: '',
      saldo: 0,
    })
  }
}

const removeBankDetail = (index) => {
  Swal.fire({
    title: 'Hapus Detail Bank?',
    text: 'Apakah Anda yakin ingin menghapus detail bank ini?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, hapus',
    cancelButtonText: 'Batal',
  }).then((result) => {
    if (result.isConfirmed) {
      if (editableReport.value && editableReport.value.balances.length > 1) {
        editableReport.value.balances.splice(index, 1)
        Swal.fire('Dihapus!', 'Detail bank telah dihapus.', 'success')
      } else {
        Swal.fire('Peringatan', 'Minimal harus ada satu detail bank.', 'warning')
      }
    }
  })
}

const getBankName = (bankId) => {
  const selectedBank = banks.value.find((bank) => bank.bank_id === bankId)
  return selectedBank ? selectedBank.bank_name : ''
}

onMounted(() => {
  fetchStores()
  fetchBanks()
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

const bankOptions = computed(() => {
  return banks.value.map((bank) => ({
    label: bank.bank_name,
    value: bank.bank_id,
  }))
})

const totalOverallProfit = computed(() => {
  return reports.value.reduce((sum, report) => sum + (report.profit_today || 0), 0)
})
const reportStats = computed(() => {
  if (reports.value.length === 0) return null

  const profits = reports.value.map((r) => r.profit_today || 0)

  return {
    totalReports: reports.value.length,
    totalProfit: totalOverallProfit.value,
    averageProfit: totalOverallProfit.value / reports.value.length,
    highestProfit: Math.max(...profits),
    lowestProfit: Math.min(...profits),
  }
})

const calculatedTotalBalance = computed(() => {
  if (!editableReport.value) return 0
  const balancesSum = editableReport.value.balances.reduce(
    (sum, balance) => sum + (parseFloat(balance.saldo) || 0),
    0,
  )
  const uangNitipValue = parseFloat(editableReport.value.uang_nitip) || 0
  return balancesSum + uangNitipValue
})

const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'Rp0'
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    return format(parseISO(dateString), 'dd MMMM yyyy', { locale: id })
  } catch (e) {
    console.error('Error formatting date:', dateString, e)
    return dateString
  }
}

const openModal = (report) => {
  selectedReport.value = report
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedReport.value = null
}

const getBalanceColor = (balance) => {
  if (balance >= 10000000) return 'text-green-600'
  if (balance >= 5000000) return 'text-blue-600'
  if (balance >= 1000000) return 'text-yellow-600'
  return 'text-red-600'
}

const formatCurrencyForInput = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return ''
  }
  return new Intl.NumberFormat('id-ID').format(amount)
}

const updateBalance = (balance, event) => {
  const value = event.target.value

  const numericValue = value.replace(/[^\d]/g, '')
  balance.saldo = parseFloat(numericValue) || 0
}

const formatBalanceOnBlur = (balance) => {
  const input = event.target
  input.value = formatCurrencyForInput(balance.saldo)
}

const removeFormattingOnFocus = (balance) => {
  const input = event.target
  input.value = balance.saldo || ''
}
const resetFilter = () => {
  filter.value = {
    store_id: '',
    start_date: '',
    end_date: '',
  }
  currentPage.value = 1
  fetchReports()
}
const handleRemoveUangNitip = async (reportId) => {
  if (!reportId || typeof reportId !== 'string') {
    console.error('Invalid report ID:', reportId)
    await showAlert('Error', 'ID laporan tidak valid.', 'error')
    return
  }
  const result = await showConfirm(
    'Konfirmasi Hapus Uang Nitip',
    'Apakah Anda yakin ingin menghapus nilai "Uang Nitip" dari laporan ini (mengatur ulang ke Rp0)?',
    'warning',
    'Ya, Hapus Uang Nitip',
    'Batal',
  )

  if (!result.isConfirmed) {
    return
  }

  try {
    isLoading.value = true
    console.log(`Attempting to remove uang_nitip for report ID: ${reportId}`)
    const response = await removeUangNitip(reportId)
    const index = reports.value.findIndex((r) => r.report_id === reportId)
    if (index !== -1) {
      reports.value[index].uang_nitip = response.new_uang_nitip
      reports.value[index].total_balance = response.new_total_balance
    }
    await showAlert('Berhasil', 'Uang Nitip berhasil diatur ulang ke Rp0.', 'success')
    await fetchReports()
    if (showModal.value && selectedReport.value?.report_id === reportId) {
      closeModal()
    }
  } catch (error) {
    console.error('Failed to remove uang nitip from report:', error)

    let errorMessage = 'Gagal menghapus uang nitip dari laporan. Silakan coba lagi.'

    if (error.response) {
      const { status, data } = error.response
      if (status === 404) {
        errorMessage = 'Laporan tidak ditemukan.'
      } else if (status === 403) {
        errorMessage = 'Anda tidak memiliki izin untuk mengubah laporan ini.'
      } else if (status >= 500) {
        errorMessage = 'Terjadi kesalahan server. Silakan coba lagi nanti.'
      } else if (data?.message) {
        errorMessage = data.message
      }
    } else if (error.request) {
      errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
    } else {
      errorMessage = 'Terjadi kesalahan tidak terduga.'
    }

    await showAlert('Error', errorMessage, 'error')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="container mx-auto py-8 px-4">
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-gray-800 mb-2">Laporan Harian</h1>
      <p class="text-gray-600">Kelola dan pantau laporan saldo harian dari semua toko</p>
    </div>

    <div class="p-6 rounded-xl shadow-lg mb-8 border border-gray-100">
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

    <div class="rounded-xl shadow-lg border border-gray-100 bg-transparant">
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

      <div class="bg-gray-50">
        <div class="max-w-7xl mx-auto">
          <div class="mb-8">
            <div class="backdrop-blur-sm rounded-2xl border border-white/20 p-6">
              <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1
                    class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2"
                  >
                    Dashboard Laporan Keuangan
                  </h1>
                  <p class="text-gray-600">Analisis real-time saldo dan performa toko</p>
                </div>
                <div class="mt-4 lg:mt-0 flex items-center space-x-4">
                  <div
                    class="bg-gradient-to-r from-green-400 to-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    {{ reports.length }} Laporan Aktif
                  </div>
                  <div class="text-sm text-gray-500">
                    Update terakhir: {{ new Date().toLocaleString('id-ID') }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="isLoading" class="flex justify-center items-center py-24">
            <div
              class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20"
            >
              <div class="flex flex-col items-center space-y-4">
                <div class="relative">
                  <div
                    class="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"
                  ></div>
                  <div
                    class="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-pulse border-t-purple-400"
                  ></div>
                </div>
                <div class="text-center">
                  <h3 class="text-lg font-semibold text-gray-800 mb-1">Memuat Data</h3>
                  <p class="text-gray-600">Sedang mengambil laporan terbaru...</p>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="reports.length === 0" class="flex justify-center items-center py-24">
            <div
              class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-12 border border-white/20 text-center max-w-md"
            >
              <div
                class="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center"
              >
                <svg
                  class="w-10 h-10 text-gray-400"
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
              <h3 class="text-xl font-bold text-gray-800 mb-3">Belum Ada Laporan</h3>
              <p class="text-gray-600 leading-relaxed">
                Tidak ada laporan yang sesuai dengan filter yang dipilih. Silakan ubah kriteria
                pencarian atau tambah laporan baru.
              </p>
            </div>
          </div>

          <div v-else>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div
                class="bg-white p-6 rounded-lg shadow border-l-4"
                :class="totalOverallProfit >= 0 ? 'border-green-500' : 'border-red-500'"
              >
                <h3 class="text-sm font-medium text-gray-600">Total Profit (Semua Laporan)</h3>
                <p
                  class="text-2xl font-bold"
                  :class="totalOverallProfit >= 0 ? 'text-green-600' : 'text-red-600'"
                >
                  {{ formatCurrency(totalOverallProfit) }}
                </p>
              </div>

              <div class="bg-white p-4 rounded-lg shadow-md mb-6">
                <div class="border border-gray-200 rounded-md overflow-hidden">
                  <div class="bg-gray-50 px-3 py-2 border-b">
                    <div class="flex items-center">
                      <i class="fas fa-percentage text-gray-500 mr-1 text-sm"></i>
                      <span class="font-medium text-gray-800 text-sm">Tarif Potongan</span>
                    </div>
                  </div>
                  <div class="divide-y divide-gray-100">
                    <div
                      class="px-3 py-2 flex justify-between items-center hover:bg-gray-50 transition-colors"
                    >
                      <div class="flex items-center">
                        <div class="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                        <span class="text-xs font-medium text-gray-700">EDC BCA</span>
                      </div>
                      <span class="text-xs font-bold text-gray-900">1%</span>
                    </div>
                    <div
                      class="px-3 py-2 flex justify-between items-center hover:bg-gray-50 transition-colors"
                    >
                      <div class="flex items-center">
                        <div class="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                        <span class="text-xs font-medium text-gray-700">EDC DKI</span>
                      </div>
                      <span class="text-xs font-bold text-gray-900">0.14%</span>
                    </div>
                    <div
                      class="px-3 py-2 flex justify-between items-center hover:bg-gray-50 transition-colors"
                    >
                      <div class="flex items-center">
                        <div class="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></div>
                        <span class="text-xs font-medium text-gray-700">QRIS</span>
                      </div>
                      <span class="text-xs font-bold text-gray-900">0.70%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div
                v-for="report in reports"
                :key="report.report_id"
                class="group bg-white/90 backdrop-blur-sm rounded-2xl duration-500 overflow-hidden border border-gray-300 shadow-xl hover:scale-105"
              >
                <div class="bg-gradient-to-r from-slate-50 to-blue-50 p-4 border-b border-gray-100">
                  <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                      <div class="flex items-center space-x-2 mb-1">
                        <h3 class="text-lg font-bold text-gray-800">{{ report.store_name }}</h3>
                      </div>
                      <div class="flex items-center text-xs text-gray-500 space-x-3">
                        <span class="flex items-center">
                          <svg
                            class="w-3 h-3 mr-1 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            ></path>
                          </svg>
                          {{ formatDate(report.report_date) }}
                        </span>
                        <span class="flex items-center">
                          <svg
                            class="w-3 h-3 mr-1 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            ></path>
                          </svg>
                          {{ report.creator_username }}
                        </span>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="text-xs text-gray-500 mb-0.5 uppercase tracking-wide font-medium">
                        Total Saldo
                      </p>
                      <p
                        class="text-lg font-bold"
                        :class="getBalanceColor(report.total_balance + (report.uang_nitip || 0))"
                      >
                        {{ formatCurrency(report.total_balance + (report.uang_nitip || 0)) }}
                      </p>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div class="bg-white/70 rounded-lg p-3 border border-white/40">
                      <div class="flex items-center justify-between">
                        <div>
                          <p
                            class="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5"
                          >
                            Profit Hari Ini
                          </p>
                          <p
                            class="text-base font-bold"
                            :class="{
                              'text-green-600': report.profit_today > 0,
                              'text-red-500': report.profit_today < 0,
                              'text-gray-600': report.profit_today === 0,
                            }"
                          >
                            {{ formatCurrency(report.profit_today) }}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div class="bg-white/70 rounded-lg p-3 border border-white/40">
                      <div class="flex items-center justify-between">
                        <div>
                          <p
                            class="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5"
                          >
                            Jumlah Bank
                          </p>
                          <p class="text-base font-bold text-blue-600">
                            {{ report.balances_detail?.length || 0 }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="flex gap-2 items-end mt-4">
                    <div class="relative flex-1">
                      <input
                        type="text"
                        :value="formatCurrency(report.uang_nitip)"
                        readonly
                        class="peer w-full px-3 py-2.5 border-2 border-gray-200 rounded-md bg-gray-100 cursor-not-allowed text-xs"
                        placeholder="Jumlah Uang Nitip"
                      />
                      <label
                        for="amount1"
                        class="absolute left-3 -top-2 bg-white px-1.5 text-xs text-gray-600 transition-all font-medium"
                      >
                        Jumlah Uang Nitip
                      </label>
                    </div>
                    <button
                      @click="handleRemoveUangNitip(report.report_id)"
                      class="bg-red-500 hover:bg-red-600 px-3 py-2.5 rounded-md text-white font-medium text-xs transition-colors duration-200 shadow-sm hover:shadow-md"
                    >
                      Hapus Uang Nitip
                    </button>
                  </div>
                </div>
                <div class="px-6 py-4 mb-5">
                  <div class="space-y-2 mb-4">
                    <div
                      v-for="(balance, index) in report.balances_detail?.slice(0, 3)"
                      :key="balance.bank_id"
                      class="flex justify-between items-center p-2 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100 transition-colors"
                    >
                      <div class="flex items-center space-x-2">
                        <div
                          class="w-6 h-6 bg-blue-100 text-blue-700 rounded-md flex items-center justify-center font-bold text-xs"
                        >
                          {{ index + 1 }}
                        </div>
                        <span class="text-sm text-gray-800">{{ balance.bank_name }}</span>
                      </div>
                      <span class="text-md font-semibold text-gray-900">
                        {{ formatCurrency(balance.saldo) }}
                      </span>
                    </div>
                    <p
                      v-if="report.balances_detail?.length > 3"
                      class="text-center text-xs text-gray-500 mt-1"
                    >
                      +{{ report.balances_detail.length - 3 }} bank lainnya
                    </p>
                  </div>

                  <div class="border-t border-gray-100 pt-4">
                    <div class="flex flex-col space-y-2 sm:hidden">
                      <button
                        @click="openModal(report)"
                        class="w-full flex items-center justify-center px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <svg
                          class="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        Lihat Detail
                      </button>

                      <div v-if="isAdmin" class="grid grid-cols-2 gap-2">
                        <button
                          @click="openEditModal(report)"
                          class="flex items-center justify-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                        >
                          <svg
                            class="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit
                        </button>

                        <button
                          @click="deleteReport(report.report_id)"
                          :disabled="isLoading || !report.report_id"
                          class="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          <svg
                            v-if="isLoading"
                            class="animate-spin h-4 w-4 mr-1"
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
                          <svg
                            v-else
                            class="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          {{ isLoading ? 'Hapus...' : 'Hapus' }}
                        </button>
                      </div>
                    </div>

                    <div class="hidden sm:flex sm:items-center sm:justify-between space-x-2">
                      <button
                        @click="openModal(report)"
                        class="flex items-center px-3 py-1.5 bg-blue-900 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <svg
                          class="w-3.5 h-3.5 mr-1.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        Lihat Detail
                      </button>

                      <div v-if="isAdmin" class="flex items-center space-x-1.5">
                        <button
                          @click="openEditModal(report)"
                          class="flex items-center px-3 py-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors text-sm font-medium"
                        >
                          <svg
                            class="w-3.5 h-3.5 mr-1.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit
                        </button>

                        <button
                          @click="deleteReport(report.report_id)"
                          :disabled="isLoading || !report.report_id"
                          class="flex items-center px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          <svg
                            v-if="isLoading"
                            class="animate-spin h-3.5 w-3.5 mr-1.5"
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
                          <svg
                            v-else
                            class="w-3.5 h-3.5 mr-1.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          {{ isLoading ? 'Menghapus...' : 'Hapus' }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      @click.self="closeModal"
    >
      <div
        class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col"
        @click.stop
      >
        <!-- Header -->
        <div class="bg-blue-900 text-white p-4 sm:p-6 flex-shrink-0">
          <!-- Header Section -->
          <div class="flex justify-between items-start mb-4">
            <div class="flex-1 min-w-0 pr-3">
              <h3 class="text-lg sm:text-xl font-bold truncate mb-1">
                {{ selectedReport?.store_name }}
              </h3>
              <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-blue-100">
                <span class="text-xs sm:text-sm font-medium">
                  {{ formatDate(selectedReport?.report_date) }}
                </span>
                <span class="hidden sm:inline text-blue-200">•</span>
                <span class="text-xs sm:text-sm">
                  {{ selectedReport?.creator_username }}
                </span>
              </div>
            </div>

            <button
              @click="closeModal"
              class="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/20 rounded-lg flex-shrink-0"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>

          <!-- Cards Summary -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div class="bg-white/20 rounded-lg p-3 sm:p-4">
              <p class="text-xs text-blue-100 uppercase tracking-wider font-semibold mb-2">
                Total Saldo
              </p>
              <p class="text-lg sm:text-xl font-bold">
                {{ formatCurrency(selectedReport?.total_balance) }}
              </p>
            </div>

            <div class="bg-white/20 rounded-lg p-3 sm:p-4">
              <p class="text-xs text-blue-100 uppercase tracking-wider font-semibold mb-2">
                Profit Hari Ini
              </p>
              <p class="text-lg sm:text-xl font-bold">
                {{ formatCurrency(selectedReport?.profit_today) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Content Area dengan Scroll -->
        <div class="flex-1 overflow-y-auto">
          <div class="p-3 sm:p-6">
            <!-- Detail Saldo per Bank -->
            <div class="mb-4 sm:mb-6">
              <h4 class="text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4">
                Detail Saldo per Bank
              </h4>

              <!-- Container dengan Scroll untuk Tabel/Cards -->
              <div class="border border-gray-200 rounded-lg overflow-hidden">
                <!-- Mobile Layout: Card-based dengan Scroll -->
                <div class="block sm:hidden">
                  <div class="max-h-64 overflow-y-auto p-2 space-y-2 bg-gray-50">
                    <div
                      v-for="(balance, index) in selectedReport?.balances_detail"
                      :key="balance.bank_id"
                      class="bg-white rounded-lg border border-gray-200 p-3"
                    >
                      <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center">
                          <span
                            class="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 rounded-full text-xs font-medium mr-2"
                          >
                            {{ index + 1 }}
                          </span>
                          <span class="text-sm font-medium text-gray-800">{{
                            balance.bank_name
                          }}</span>
                        </div>
                      </div>
                      <div class="text-right">
                        <span class="text-sm font-semibold text-gray-900">
                          {{ formatCurrency(balance.saldo) }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Total Mobile - Fixed di bawah -->
                  <div class="bg-blue-900 text-white p-3 border-t">
                    <div class="flex justify-between items-center">
                      <div class="flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                          ></path>
                        </svg>
                        <span class="text-sm font-semibold">Total Keseluruhan</span>
                      </div>
                      <span class="text-lg font-bold">
                        {{ formatCurrency(selectedReport?.total_balance) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Desktop Layout: Table dengan Scroll -->
                <div class="hidden sm:block">
                  <div class="overflow-x-auto max-h-80 overflow-y-auto">
                    <table class="w-full bg-white">
                      <thead class="sticky top-0 z-10">
                        <tr class="bg-gray-50 border-b border-gray-200">
                          <th class="text-left py-3 px-4 text-gray-700 font-semibold text-sm">
                            No
                          </th>
                          <th class="text-left py-3 px-4 text-gray-700 font-semibold text-sm">
                            Nama Bank
                          </th>
                          <th class="text-right py-3 px-4 text-gray-700 font-semibold text-sm">
                            Saldo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(balance, index) in selectedReport?.balances_detail"
                          :key="balance.bank_id"
                          class="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td class="py-3 px-4 text-sm">
                            {{ index + 1 }}
                          </td>
                          <td class="py-3 px-4">
                            <span class="text-gray-800 font-medium text-sm">{{
                              balance.bank_name
                            }}</span>
                          </td>
                          <td class="py-3 px-4 text-right">
                            <span class="text-gray-800 text-sm">
                              {{ formatCurrency(balance.saldo) }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div class="bg-blue-900 text-white border-t">
                    <div class="flex justify-between items-center py-3 px-4">
                      <div class="flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                          ></path>
                        </svg>
                        <span class="font-semibold text-sm">Total Keseluruhan Saldo</span>
                      </div>
                      <span class="text-base font-bold">
                        {{ formatCurrency(selectedReport?.total_balance) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Keterangan -->
            <div v-if="selectedReport?.keterangan">
              <label class="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
              <div
                class="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 text-gray-700 text-sm"
              >
                {{ selectedReport.keterangan }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showEditModal"
      class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
      @click.self="closeEditModal"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col"
        @click.stop
      >
        <!-- Header Modal -->
        <div class="text-black p-3 sm:p-6 flex-shrink-0">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-xl mt-5">Edit Laporan</h3>
              <p class="text-orange-100 mt-1 text-xs sm:text-base">
                Ubah detail laporan harian ini
              </p>
            </div>
            <button
              @click="closeEditModal"
              class="text-white hover:text-gray-200 transition-colors p-1 sm:p-2 hover:bg-white/10 rounded-lg"
            >
              <svg
                class="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Content Area dengan Scroll -->
        <div class="flex-1 overflow-y-auto">
          <div class="px-3">
            <form @submit.prevent="updateReport">
              <!-- Form Fields Toko dan Tanggal -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6">
                <FormField
                  label="Toko"
                  type="select"
                  v-model="editableReport.store_id"
                  :options="storeOptions.filter((opt) => opt.value !== '')"
                  required
                />
                <FormField
                  label="Tanggal Laporan"
                  type="date"
                  v-model="editableReport.report_date"
                  required
                />
              </div>

              <!-- Detail Saldo Bank dengan Container Scroll -->
              <div class="mb-4 sm:mb-6">
                <!-- Container untuk Bank Details dengan Max Height dan Scroll -->
                <div
                  class="max-h-48 sm:max-h-60 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 p-2 sm:p-3 space-y-3"
                >
                  <div
                    v-for="(balance, index) in editableReport.balances"
                    :key="index"
                    class="bg-white rounded-lg border border-gray-200 p-3 sm:p-4"
                  >
                    <!-- Layout Mobile: Stack Vertical -->
                    <div class="flex flex-col space-y-3 sm:hidden">
                      <div class="flex justify-between items-center">
                        <label class="text-sm font-medium text-gray-700">
                          Bank {{ index + 1 }}
                        </label>
                        <button
                          type="button"
                          @click="removeBankDetail(index)"
                          class="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200"
                          title="Hapus Bank"
                        >
                          <svg
                            class="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            ></path>
                          </svg>
                        </button>
                      </div>
                      <select
                        v-model="balance.bank_id"
                        class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="" disabled>Pilih Bank</option>
                        <option v-for="bank in bankOptions" :key="bank.value" :value="bank.value">
                          {{ bank.label }}
                        </option>
                      </select>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Saldo</label>
                        <input
                          type="number"
                          v-model.number="balance.saldo"
                          placeholder="Masukkan Saldo"
                          class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>

                    <!-- Layout Desktop: Horizontal -->
                    <div class="hidden sm:flex items-end gap-4">
                      <div class="flex-1">
                        <select
                          v-model="balance.bank_id"
                          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="" disabled>Pilih Bank</option>
                          <option v-for="bank in bankOptions" :key="bank.value" :value="bank.value">
                            {{ bank.label }}
                          </option>
                        </select>
                      </div>
                      <div class="flex-1">
                        <input
                          type="text"
                          :value="formatCurrencyForInput(balance.saldo)"
                          @input="updateBalance(balance, $event)"
                          @blur="formatBalanceOnBlur(balance)"
                          @focus="removeFormattingOnFocus(balance)"
                          placeholder="Masukkan Saldo"
                          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        @click="removeBankDetail(index)"
                        class="p-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200"
                        title="Hapus Bank"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          ></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mb-4 sm:mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Total Saldo (Dihitung Otomatis)
                </label>
                <input
                  type="text"
                  :value="formatCurrency(calculatedTotalBalance)"
                  readonly
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 cursor-not-allowed text-sm"
                />
                <p class="text-xs sm:text-sm text-gray-500 mt-1">
                  Total saldo akan dihitung otomatis dari detail saldo bank.
                </p>
              </div>

              <!-- Keterangan -->
              <div class="mb-4 sm:mb-6">
                <FormField
                  label="Keterangan (Opsional)"
                  type="textarea"
                  v-model="editableReport.keterangan"
                  rows="3"
                  placeholder="Tambahkan keterangan tambahan jika ada..."
                />
              </div>
            </form>
          </div>
        </div>

        <!-- Footer dengan Tombol Aksi -->
        <div class="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-3 sm:p-6">
          <div class="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
            <button
              type="button"
              @click="closeEditModal"
              class="w-full sm:w-auto bg-gray-300 text-gray-800 py-2.5 sm:py-3 px-4 sm:px-8 rounded-lg hover:bg-gray-400 transition-colors duration-200 font-semibold shadow-md text-sm sm:text-base"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 sm:py-3 px-4 sm:px-8 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md disabled:opacity-50 flex items-center justify-center text-sm sm:text-base"
              @click="updateReport"
            >
              <svg
                v-if="isLoading"
                class="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white"
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
              {{ isLoading ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Pagination Controls -->
    <div
      v-if="reports.length > 0"
      class="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg shadow"
    >
      <!-- Items Per Page -->
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-600">Tampilkan:</label>
        <select
          v-model="itemsPerPage"
          @change="changeItemsPerPage"
          class="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>
        <span class="text-sm text-gray-600">per halaman</span>
      </div>

      <!-- Page Info -->
      <div class="text-sm text-gray-600">
        Menampilkan {{ (currentPage - 1) * itemsPerPage + 1 }} -
        {{ Math.min(currentPage * itemsPerPage, totalItems) }} dari {{ totalItems }} laporan
      </div>

      <!-- Page Navigation -->
      <div class="flex items-center gap-2">
        <button
          @click="prevPage"
          :disabled="currentPage === 1"
          class="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            ></path>
          </svg>
        </button>

        <!-- Page Numbers -->
        <div class="flex gap-1">
          <button
            v-for="page in totalPages"
            :key="page"
            v-show="Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages"
            @click="goToPage(page)"
            :class="[
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              page === currentPage
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50',
            ]"
          >
            {{ page }}
          </button>
        </div>

        <button
          @click="nextPage"
          :disabled="currentPage === totalPages"
          class="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            ></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
