<script setup>
import { ref, onMounted, watch } from 'vue' // Added 'watch'
import { useApi } from '@/composables/useApi' // Assuming useApi is correctly configured to hit your backend
import { useSweetAlert } from '@/composables/useSweetAlert'

const { get, post, put, del } = useApi()
const { showAlert, showConfirm } = useSweetAlert()

const banks = ref([])
const stores = ref([]) // To hold fetched store data
const selectedStoreId = ref(null) // New ref to hold the currently selected store ID for filtering

const newBank = ref({
  bank_name: '',
  store_id: null, // Initialize with null for dropdown selection
})
const editingBank = ref(null)
const isLoading = ref(false)
const isSubmitting = ref(false)
const showCreateModal = ref(false)
const showEditModal = ref(false)

// --- Fetch Banks based on selectedStoreId ---
const fetchBanks = async () => {
  isLoading.value = true
  try {
    let response
    if (selectedStoreId.value) {
      // Fetch banks for a specific store
      response = await get(`/banks/store/${selectedStoreId.value}`)
    } else {
      // If no store is selected (e.g., initial load or user clears selection), fetch all banks
      // You might want to adjust this logic based on whether you always want a default store selected
      // or if showing all banks is acceptable when nothing is explicitly chosen.
      response = await get('/banks')
    }
    banks.value = response.banks || []
  } catch (error) {
    console.error('Failed to fetch banks:', error)
    // Differentiate error message if no banks are found for a store vs. a general fetch error
    if (error.response && error.response.status === 404 && selectedStoreId.value) {
      banks.value = [] // Clear banks if none found for selected store
      // showAlert('Info', 'Tidak ada bank/pembayaran untuk toko yang dipilih ini.', 'info');
    } else {
      showAlert('Error!', 'Gagal memuat data bank/pembayaran.', 'error')
    }
  } finally {
    isLoading.value = false
  }
}

// --- Fetch All Stores ---
const fetchStores = async () => {
  try {
    const response = await get('/stores')
    stores.value = response.stores || []
    // Set the first store as default if available, and if no store is currently selected
    if (stores.value.length > 0 && selectedStoreId.value === null) {
      selectedStoreId.value = stores.value[0].store_id
    }
    // Set newBank's store_id to the first store if not already set, for convenience in creation
    if (newBank.value.store_id === null && stores.value.length > 0) {
      newBank.value.store_id = stores.value[0].store_id
    }
  } catch (error) {
    console.error('Failed to fetch stores:', error)
    showAlert('Error!', 'Gagal memuat data toko. Tambah bank mungkin tidak berfungsi.', 'error')
  }
}

// --- Watcher for selectedStoreId changes ---
watch(selectedStoreId, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    fetchBanks() // Re-fetch banks whenever the selected store changes
  }
})

// --- Create Bank ---
const handleCreateBank = async () => {
  if (!newBank.value.bank_name.trim()) {
    showAlert('Error!', 'Nama bank/pembayaran harus diisi.', 'error')
    return
  }
  if (!newBank.value.store_id) {
    showAlert('Error!', 'Silakan pilih toko untuk bank/pembayaran ini.', 'error')
    return
  }

  isSubmitting.value = true
  try {
    await post('/banks', {
      bank_name: newBank.value.bank_name,
      store_id: newBank.value.store_id,
    })
    showAlert('Berhasil!', 'Bank/Pembayaran berhasil ditambahkan.', 'success')
    showCreateModal.value = false
    resetNewBankForm()
    await fetchBanks() // Refresh the list of banks based on current filter
  } catch (error) {
    console.error('Failed to create bank:', error)
    const errorMessage = error.response?.data?.message || 'Gagal menambahkan bank/pembayaran.'
    showAlert('Error!', errorMessage, 'error')
  } finally {
    isSubmitting.value = false
  }
}

// --- Edit Bank ---
const openEditModal = (bank) => {
  editingBank.value = { ...bank }
  showEditModal.value = true
}

const handleUpdateBank = async () => {
  if (!editingBank.value.bank_name.trim()) {
    showAlert('Error!', 'Nama bank/pembayaran harus diisi.', 'error')
    return
  }

  isSubmitting.value = true
  try {
    await put(`/banks/${editingBank.value.bank_id}`, { bank_name: editingBank.value.bank_name })
    showAlert('Berhasil!', 'Bank/Pembayaran berhasil diperbarui.', 'success')
    showEditModal.value = false
    editingBank.value = null
    await fetchBanks() // Refresh the list
  } catch (error) {
    console.error('Failed to update bank:', error)
    const errorMessage = error.response?.data?.message || 'Gagal memperbarui bank/pembayaran.'
    showAlert('Error!', errorMessage, 'error')
  } finally {
    isSubmitting.value = false
  }
}

// --- Delete Bank ---
const handleDeleteBank = async (bankId) => {
  const result = await showConfirm(
    'Konfirmasi Hapus',
    'Apakah Anda yakin ingin menghapus bank/pembayaran ini? Tindakan ini tidak dapat dibatalkan.',
    'warning',
    'Ya, Hapus!',
    'Batal',
  )

  if (result.isConfirmed) {
    isSubmitting.value = true
    try {
      await del(`/banks/${bankId}`)

      showAlert('Dihapus!', 'Bank/Pembayaran berhasil dihapus.', 'success')
      await fetchBanks()
    } catch (error) {
      console.error('Failed to delete bank:', error)
      const errorMessage = error.response?.data?.message || 'Gagal menghapus bank/pembayaran.'
      showAlert('Error!', errorMessage, 'error')
    } finally {
      isSubmitting.value = false
    }
  }
}

// --- Reset Forms ---
const resetNewBankForm = () => {
  newBank.value = {
    bank_name: '',
    store_id: stores.value.length > 0 ? stores.value[0].store_id : null, // Reset to first store or null
  }
}

// --- Utility Functions ---
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getBankIcon = (bankName) => {
  const name = bankName.toLowerCase()
  if (name.includes('bca')) return '🏦'
  if (name.includes('mandiri')) return '🏛️'
  if (name.includes('bri')) return '🏢'
  if (name.includes('bni')) return '🏪'
  if (name.includes('ovo')) return '💳'
  if (name.includes('gopay')) return '📱'
  if (name.includes('dana')) return '💰'
  if (name.includes('shopeepay')) return '🛒'
  return '💳' // Default icon
}

// --- Lifecycle Hook ---
onMounted(async () => {
  await fetchStores() // Fetch stores first
  await fetchBanks() // Then fetch banks based on initial selected store (if any)
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-inter">
    <div class="container mx-auto py-8 px-4 max-w-7xl">
      <!-- Header Section -->
      <div
        class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8"
      >
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center space-x-4">
            <div class="p-3 bg-green-500 rounded-xl shadow-lg">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                ></path>
              </svg>
            </div>
            <div>
              <h1
                class="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2"
              >
                Manajemen Bank & Pembayaran
              </h1>
              <p class="text-gray-600 text-lg">Kelola metode pembayaran dengan mudah dan aman</p>
            </div>
          </div>
          <div class="mt-6 lg:mt-0">
            <button
              @click="((showCreateModal = true), resetNewBankForm())"
              class="group inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg
                class="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                ></path>
              </svg>
              Tambah Bank/Pembayaran
            </button>
          </div>
        </div>
      </div>

      <!-- Store Filter & Bank List Section -->
      <div
        class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
      >
        <div
          class="p-6 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <h2 class="text-xl font-bold text-gray-900">Daftar Bank & Pembayaran</h2>
          <div class="flex items-center gap-4 w-full md:w-auto">
            <label
              for="filter-store-select"
              class="text-sm font-semibold text-gray-700 flex-shrink-0"
              >Filter Toko:</label
            >
            <div class="relative w-full">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  class="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  ></path>
                </svg>
              </div>
              <select
                id="filter-store-select"
                v-model="selectedStoreId"
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 text-gray-900"
              >
                <option :value="null">Semua Toko</option>
                <option v-for="store in stores" :key="store.store_id" :value="store.store_id">
                  {{ store.store_name }}
                </option>
              </select>
            </div>
            <div class="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full flex-shrink-0">
              Total: {{ banks.length }} metode pembayaran
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-16">
          <div class="inline-block relative">
            <div
              class="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"
            ></div>
          </div>
          <p class="mt-4 text-gray-600 font-medium">Memuat data bank & pembayaran...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="banks.length === 0" class="text-center py-16">
          <div
            class="bg-gradient-to-r from-gray-100 to-gray-200 w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center"
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
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              ></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">
            {{
              selectedStoreId
                ? 'Belum ada bank/pembayaran untuk toko ini.'
                : 'Belum ada bank/pembayaran.'
            }}
          </h3>
          <p class="text-gray-500 mb-6">Mulai dengan menambahkan metode pembayaran pertama Anda.</p>
          <button
            @click="((showCreateModal = true), resetNewBankForm())"
            class="inline-flex items-center px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              ></path>
            </svg>
            Tambah Metode Pembayaran
          </button>
        </div>

        <!-- Banks Table -->
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-100">
            <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th
                  scope="col"
                  class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                >
                  Bank/Pembayaran
                </th>

                <th
                  scope="col"
                  class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                >
                  Nama Toko
                </th>
                <th
                  scope="col"
                  class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                >
                  Tanggal Ditambahkan
                </th>
                <th
                  scope="col"
                  class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  class="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider"
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-50">
              <tr
                v-for="bank in banks"
                :key="bank.bank_id"
                class="hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all duration-200"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-12 w-12">
                      <div
                        class="h-12 w-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg"
                      >
                        <span class="text-2xl">{{ getBankIcon(bank.bank_name) }}</span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-lg font-bold text-gray-900">{{ bank.bank_name }}</div>
                      <!-- <div class="text-sm text-gray-500">ID: {{ bank.bank_id }}</div> -->
                    </div>
                  </div>
                </td>

                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                  {{ bank.store_name || '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                  {{ formatDate(bank.created_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-green-100 to-emerald-200 text-green-800 border border-green-200"
                  >
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    Aktif
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end space-x-2">
                    <button
                      @click="openEditModal(bank)"
                      class="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50 transition-colors"
                      title="Edit Bank"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"
                        ></path>
                      </svg>
                    </button>
                    <button
                      @click="handleDeleteBank(bank.bank_id)"
                      class="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition-colors"
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
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create Bank Modal -->
      <div
        v-if="showCreateModal"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
          <div class="flex items-center justify-between p-6 border-b border-gray-100">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-emerald-100 rounded-lg">
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
                    d="M12 4v16m8-8H4"
                  ></path>
                </svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900">Tambah Bank/Pembayaran</h3>
            </div>
            <button
              @click="showCreateModal = false"
              class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleCreateBank" class="p-6 space-y-4">
            <div class="mb-4">
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Nama Bank/Pembayaran
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    class="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    ></path>
                  </svg>
                </div>
                <input
                  type="text"
                  v-model="newBank.bank_name"
                  placeholder="Contoh: BCA, OVO, GoPay, DANA"
                  class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 text-gray-900 placeholder-gray-500"
                  required
                />
              </div>
              <p class="mt-2 text-sm text-gray-500">
                Masukkan nama bank atau metode pembayaran digital
              </p>
            </div>

            <!-- Store ID Selection (Dropdown) for Creation -->
            <div class="mb-4">
              <label
                for="new-bank-store-select"
                class="block text-sm font-semibold text-gray-700 mb-2"
              >
                Pilih Toko
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    class="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    ></path>
                  </svg>
                </div>
                <select
                  id="new-bank-store-select"
                  v-model="newBank.store_id"
                  class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 text-gray-900"
                  required
                >
                  <option :value="null" disabled>Pilih Toko...</option>
                  <option v-for="store in stores" :key="store.store_id" :value="store.store_id">
                    {{ store.store_name }}
                  </option>
                </select>
              </div>
              <p class="mt-2 text-sm text-gray-500">
                Pilih toko tempat bank/pembayaran ini akan digunakan.
              </p>
            </div>

            <div
              class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200"
            >
              <div class="flex items-start space-x-3">
                <svg
                  class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <div>
                  <h4 class="text-sm font-semibold text-blue-900 mb-1">Contoh Metode Pembayaran</h4>
                  <p class="text-sm text-blue-700">
                    Bank: BCA, Mandiri, BRI, BNI<br />
                    E-Wallet: OVO, GoPay, DANA, ShopeePay
                  </p>
                </div>
              </div>
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="showCreateModal = false"
                class="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500/50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
              >
                {{ isSubmitting ? 'Menyimpan...' : 'Simpan Bank/Pembayaran' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Edit Bank Modal -->
      <div
        v-if="showEditModal"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
          <div class="flex items-center justify-between p-6 border-b border-gray-100">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-blue-100 rounded-lg">
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
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"
                  ></path>
                </svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900">Edit Bank/Pembayaran</h3>
            </div>
            <button
              @click="showEditModal = false"
              class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleUpdateBank" class="p-6 space-y-4">
            <div class="mb-4">
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Nama Bank/Pembayaran
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    class="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    ></path>
                  </svg>
                </div>
                <input
                  type="text"
                  v-model="editingBank.bank_name"
                  placeholder="Contoh: BCA, OVO, GoPay, DANA"
                  class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-500"
                  required
                />
              </div>
              <p class="mt-2 text-sm text-gray-500">
                Ubah nama bank atau metode pembayaran digital
              </p>
            </div>

            <!-- Display the associated store ID (read-only) -->
            <div class="mb-4" v-if="editingBank && editingBank.store_id">
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Store ID (Read-Only)
              </label>
              <input
                type="text"
                :value="editingBank.store_id"
                class="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-700 cursor-not-allowed"
                readonly
              />
              <p class="mt-2 text-sm text-gray-500">
                ID toko tidak dapat diubah setelah bank dibuat.
              </p>
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="showEditModal = false"
                class="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500/50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
              >
                {{ isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar styling */
.overflow-x-auto::-webkit-scrollbar {
  height: 8px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 8px;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: linear-gradient(to right, #10b981, #0d9488);
  border-radius: 8px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to right, #059669, #0f766e);
}

/* Enhanced animation for loading spinner */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Smooth transitions for modal backdrop */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}

/* Enhanced gradient text */
.bg-clip-text {
  -webkit-background-clip: text;
  background-clip: text;
}

/* Custom focus styles */
button:focus {
  outline: none;
}

/* Enhanced hover effects */
.group:hover .group-hover\:rotate-90 {
  transform: rotate(90deg);
}

/* Responsive table enhancements */
@media (max-width: 768px) {
  .min-w-full {
    min-width: 600px;
  }
}

/* Enhanced gradient backgrounds */
.bg-gradient-to-br {
  background-image: linear-gradient(to bottom right, var(--tw-gradient-stops));
}

.bg-gradient-to-r {
  background-image: linear-gradient(to right, var(--tw-gradient-stops));
}

/* Enhanced shadow effects */
.shadow-xl {
  box-shadow:
    0 20px 25px -5px rgb(0 0 0 / 0.1),
    0 8px 10px -6px rgb(0 0 0 / 0.1);
}

.shadow-2xl {
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
}

/* Enhanced backdrop effects */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}

/* Custom border styles */
.border-white\/20 {
  border-color: rgb(255 255 255 / 0.2);
}

.bg-white\/80 {
  background-color: rgb(255 255 255 / 0.8);
}

/* Enhanced transition effects */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.duration-200 {
  transition-duration: 200ms;
}

/* Enhanced transform effects */
.hover\:scale-105:hover {
  transform: scale(1.05);
}

.group-hover\:rotate-90 {
  transition: transform 0.2s ease-in-out;
}

/* Inter font application */
.font-inter {
  font-family: 'Inter', sans-serif;
}
</style>
