<script setup>
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useSweetAlert } from '@/composables/useSweetAlert'
import FormField from '@/components/FormField.vue' // Pastikan komponen FormField.vue tersedia

const { get, post, put, del } = useApi()
const { showAlert, showConfirm } = useSweetAlert()

// Data state
const stores = ref([])
const users = ref([]) // Akan menyimpan daftar karyawan (users dengan role 'karyawan')
const isLoading = ref(false)
const isSubmitting = ref(false)

// Modal states
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDetailModal = ref(false)

// Form data for creating a new store
const newStore = ref({
  store_name: '',
  address: '',
  employees: [], // Akan menyimpan array user_id karyawan yang dipilih
})

// Form data for editing an existing store
const editStore = ref({
  store_id: null,
  store_name: '',
  address: '',
  employees: [], // Ini akan diisi dengan array user_id dari karyawan toko yang sedang diedit
})

const selectedStore = ref(null) // Untuk menampilkan detail toko

// Search and filter states
const searchTerm = ref('')
const selectedFilter = ref('all')

// Computed properties
const filteredStores = computed(() => {
  let filtered = stores.value

  // Apply search filter based on store name or address
  if (searchTerm.value) {
    filtered = filtered.filter(
      (store) =>
        store.store_name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
        store.address.toLowerCase().includes(searchTerm.value.toLowerCase()),
    )
  }

  // Apply status filter based on whether store has employees
  if (selectedFilter.value === 'with_employees') {
    filtered = filtered.filter(
      (store) => store.employee_usernames && store.employee_usernames.length > 0,
    )
  } else if (selectedFilter.value === 'without_employees') {
    filtered = filtered.filter(
      (store) => !store.employee_usernames || store.employee_usernames.length === 0,
    )
  }

  return filtered
})

// Options for employee selection in forms (for checkboxes)
const employeeOptions = computed(() => {
  return users.value.map((user) => ({
    label: user.username,
    value: user.user_id,
  }))
})

// API Functions
const fetchStores = async () => {
  isLoading.value = true
  try {
    const response = await get('/stores') // Asumsi endpoint API untuk toko
    stores.value = response.stores || []
  } catch (error) {
    console.error('Failed to fetch stores:', error)
    showAlert('Error!', 'Gagal memuat data toko.', 'error')
  } finally {
    isLoading.value = false
  }
}

const fetchKaryawan = async () => {
  try {
    const response = await get('/users') // Asumsi endpoint API untuk semua user
    // Filter hanya user dengan role 'karyawan'
    users.value = response.users?.filter((user) => user.role === 'karyawan') || []
  } catch (error) {
    console.error('Failed to fetch karyawan:', error)
    showAlert('Error!', 'Gagal memuat data karyawan.', 'error')
  }
}

// CRUD Operations
const handleCreateStore = async () => {
  // Validate form before submission
  if (!validateStoreForm(newStore.value)) return

  isSubmitting.value = true
  try {
    // Kirim data toko baru ke API
    await post('/stores', newStore.value)
    showAlert('Berhasil!', 'Toko berhasil dibuat.', 'success')
    showCreateModal.value = false // Tutup modal setelah berhasil
    resetNewStoreForm() // Reset form untuk input selanjutnya
    await fetchStores() // Muat ulang data toko untuk memperbarui tampilan
  } catch (error) {
    console.error('Failed to create store:', error)
    showAlert('Error!', 'Gagal membuat toko.', 'error')
  } finally {
    isSubmitting.value = false
  }
}

const handleEditStore = async () => {
  // Validate form before submission
  if (!validateStoreForm(editStore.value)) return

  isSubmitting.value = true
  try {
    // Kirim data toko yang diperbarui ke API
    await put(`/stores/${editStore.value.store_id}`, {
      store_name: editStore.value.store_name,
      address: editStore.value.address,
      employees: editStore.value.employees, // Pastikan ini berisi array user_id
    })
    showAlert('Berhasil!', 'Toko berhasil diperbarui.', 'success')
    showEditModal.value = false // Tutup modal setelah berhasil
    await fetchStores() // Muat ulang data toko untuk memperbarui tampilan
  } catch (error) {
    console.error('Failed to update store:', error)
    showAlert('Error!', 'Gagal memperbarui toko.', 'error')
  } finally {
    isSubmitting.value = false
  }
}

const handleDeleteStore = async (store) => {
  // Konfirmasi penghapusan dengan SweetAlert
  const result = await showConfirm(
    'Konfirmasi Hapus',
    `Apakah Anda yakin ingin menghapus toko "${store.store_name}"?`,
    'warning',
  )

  if (result.isConfirmed) {
    try {
      await del(`stores/${store.store_id}`) // Hapus toko via API
      showAlert('Berhasil!', 'Toko berhasil dihapus.', 'success')
      await fetchStores() // Muat ulang data toko
    } catch (error) {
      console.error('Failed to delete store:', error)
      showAlert('Error!', 'Gagal menghapus toko.', 'error')
    }
  }
}

// Helper functions
const validateStoreForm = (store) => {
  // Validasi input form toko
  if (!store.store_name.trim()) {
    showAlert('Error!', 'Nama toko harus diisi.', 'error')
    return false
  }
  if (!store.address.trim()) {
    showAlert('Error!', 'Alamat toko harus diisi.', 'error')
    return false
  }
  // Validasi karyawan harus dipilih
  if (!store.employees || store.employees.length === 0) {
    showAlert('Error!', 'Pilih setidaknya satu karyawan.', 'error')
    return false
  }
  return true
}

const resetNewStoreForm = () => {
  // Reset form buat toko baru
  newStore.value = {
    store_name: '',
    address: '',
    employees: [],
  }
}

// Fungsi untuk membuka modal edit toko
const openEditModal = (store) => {
  let assignedEmployeeIds = []

  // Logic untuk mengisi 'employees' di form edit
  // Berdasarkan contoh response API "employee_usernames": "rafi"
  if (store.employee_usernames && typeof store.employee_usernames === 'string') {
    // Asumsi employee_usernames bisa satu nama "rafi" atau dipisah koma "rafi, budi"
    const usernames = store.employee_usernames.split(',').map((name) => name.trim())

    // Cari user_id yang sesuai dari daftar 'users' yang sudah di-fetch
    assignedEmployeeIds = usernames
      .map((username) => {
        const user = users.value.find((u) => u.username === username)
        return user ? user.user_id : null
      })
      .filter(Boolean) // Hapus elemen null jika username tidak ditemukan
  } else if (Array.isArray(store.employees) && store.employees.length > 0) {
    // Ini adalah fallback jika API mungkin mengembalikan store.employees sebagai array objek atau array ID
    // Jika array objek, map untuk mendapatkan user_id
    if (typeof store.employees[0] === 'object' && store.employees[0].user_id) {
      assignedEmployeeIds = store.employees.map((emp) => emp.user_id)
    } else {
      // Jika sudah array user_id
      assignedEmployeeIds = store.employees
    }
  }

  // Isi data editStore dengan data toko yang dipilih
  editStore.value = {
    store_id: store.store_id,
    store_name: store.store_name,
    address: store.address,
    employees: assignedEmployeeIds, // Ini akan mencentang checkbox yang sesuai
  }
  showEditModal.value = true
}

const openDetailModal = (store) => {
  selectedStore.value = store
  showDetailModal.value = true
}

// Fungsi untuk mendapatkan nama karyawan untuk tampilan
const getEmployeeNames = (store) => {
  // Prioritaskan menggunakan `employee_usernames` yang langsung dari data toko jika tersedia dan itu string.
  // Ini mencerminkan format respons API yang Anda berikan.
  if (
    store.employee_usernames &&
    typeof store.employee_usernames === 'string' &&
    store.employee_usernames.length > 0
  ) {
    return store.employee_usernames
  }

  // Fallback: Jika `employee_usernames` tidak ada atau bukan string,
  // coba petakan dari `store.employees` (yang seharusnya berisi user_id setelah diproses di openEditModal)
  const employeeUsernames = Array.isArray(store.employees)
    ? store.employees
        .map((employeeId) => {
          const user = users.value.find((u) => u.user_id === employeeId)
          return user ? user.username : null
        })
        .filter(Boolean) // Hapus null jika user_id tidak ditemukan
    : []

  if (employeeUsernames.length > 0) {
    return employeeUsernames.join(', ')
  }
  return 'Belum ada karyawan'
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Lifecycle hook: fetch data when component is mounted
onMounted(async () => {
  await Promise.all([fetchStores(), fetchKaryawan()])
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-emerald-50">
    <div class="container mx-auto py-8 px-4">
      <!-- Header Section -->
      <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 class="text-4xl font-extrabold text-gray-900 mb-2">Manajemen Toko</h1>
            <p class="text-gray-600 text-lg">Kelola semua toko dan penugasan karyawan</p>
          </div>
          <div class="mt-6 md:mt-0">
            <button
              @click="((showCreateModal = true), resetNewStoreForm())"
              class="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 transition-all duration-300 transform hover:scale-105"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                ></path>
              </svg>
              Tambah Toko Baru
            </button>
          </div>
        </div>
      </div>

      <!-- Search and Filter Section -->
      <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div class="flex-1 max-w-md">
            <div class="relative">
              <input
                v-model="searchTerm"
                type="text"
                placeholder="Cari toko berdasarkan nama atau alamat..."
                class="w-full pl-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 text-gray-900 placeholder-gray-500 transition-all duration-200"
              />
              <!-- Search Icon -->
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <select
              v-model="selectedFilter"
              class="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 text-gray-700 bg-white shadow-sm transition-all duration-200"
            >
              <option value="all">Semua Toko</option>
              <option value="with_employees">Dengan Karyawan</option>
              <option value="without_employees">Tanpa Karyawan</option>
            </select>
            <span class="text-md font-medium text-gray-700 bg-indigo-100 px-4 py-2 rounded-full">
              Total: {{ filteredStores.length }} dari {{ stores.length }} toko
            </span>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-16">
        <div
          class="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-600"
        ></div>
        <p class="mt-4 text-gray-600 font-medium">Memuat data toko...</p>
      </div>

      <!-- No Stores Found State -->
      <div v-else-if="filteredStores.length === 0" class="text-center py-16">
        <svg
          class="mx-auto h-20 w-20 text-gray-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          ></path>
        </svg>
        <h3 class="mt-2 text-xl font-semibold text-gray-900">Tidak ada toko ditemukan</h3>
        <p class="mt-2 text-md text-gray-500">
          {{
            searchTerm
              ? 'Coba ubah kata kunci pencarian Anda.'
              : 'Mulai dengan menambahkan toko pertama Anda sekarang!'
          }}
        </p>
        <button
          v-if="!searchTerm"
          @click="((showCreateModal = true), resetNewStoreForm())"
          class="mt-6 inline-flex items-center px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 transition-all duration-300 transform hover:scale-105"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
          Buat Toko Baru
        </button>
      </div>

      <!-- Stores Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div
          v-for="store in filteredStores"
          :key="store.store_id"
          class="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200"
        >
          <div class="p-6">
            <div class="flex flex-col h-full">
              <div class="flex-1">
                <h3 class="text-xl font-bold text-gray-900 mb-2">{{ store.store_name }}</h3>
                <p class="text-gray-600 text-sm mb-3 line-clamp-2">{{ store.address }}</p>

                <div class="flex items-center text-sm text-gray-500 mb-3">
                  <svg class="w-4 h-4 mr-1 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clip-rule="evenodd"
                      fill-rule="evenodd"
                    ></path>
                  </svg>
                  <span class="font-medium">{{ getEmployeeNames(store) }}</span>
                </div>

                <div class="flex items-center text-sm text-gray-800">
                  <svg class="w-4 h-4 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                  Dibuat: {{ formatDate(store.created_at) }}
                </div>
              </div>

              <div class="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  @click="openDetailModal(store)"
                  class="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50 transition-colors"
                  title="Lihat Detail"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    ></path>
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    ></path>
                  </svg>
                </button>
                <button
                  @click="openEditModal(store)"
                  class="p-2 text-emerald-600 hover:text-emerald-800 rounded-full hover:bg-emerald-50 transition-colors"
                  title="Edit"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    ></path>
                  </svg>
                </button>
                <button
                  @click="handleDeleteStore(store)"
                  class="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50 transition-colors"
                  title="Hapus"
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
      </div>

      <!-- Create Store Modal -->
      <div
        v-if="showCreateModal"
        class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-95 opacity-0 animate-scale-in"
        >
          <div class="flex items-center justify-between p-6 border-b border-gray-100">
            <h3 class="text-2xl font-bold text-gray-900">Tambah Toko Baru</h3>
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

          <form @submit.prevent="handleCreateStore" class="p-6">
            <FormField
              label="Nama Toko"
              type="text"
              v-model="newStore.store_name"
              placeholder="Contoh: Toko Maju Jaya"
              required
            />
            <FormField
              label="Alamat"
              type="textarea"
              v-model="newStore.address"
              placeholder="Alamat lengkap toko"
              required
            />

            <div class="mb-6">
              <label class="block text-gray-700 text-sm font-bold mb-3">
                Penanggung Jawab Ditugaskan <span class="text-red-500">*</span>
              </label>
              <div
                class="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50"
              >
                <label
                  v-for="user in users"
                  :key="user.user_id"
                  class="flex items-center cursor-pointer hover:bg-blue-50 p-2 rounded-md transition-colors"
                >
                  <input
                    type="checkbox"
                    :value="user.user_id"
                    v-model="newStore.employees"
                    class="h-5 w-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span class="ml-3 text-gray-800 font-medium">{{ user.username }}</span>
                </label>
              </div>
              <p v-if="newStore.employees.length === 0" class="text-red-500 text-xs mt-2">
                Pilih setidaknya satu karyawan.
              </p>
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="showCreateModal = false"
                class="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500/50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="isSubmitting || newStore.employees.length === 0"
                class="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 transition-all duration-300 transform hover:scale-105"
              >
                {{ isSubmitting ? 'Menyimpan...' : 'Simpan Toko' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Edit Store Modal -->
      <div
        v-if="showEditModal"
        class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-95 opacity-0 animate-scale-in"
        >
          <div class="flex items-center justify-between p-6 border-b border-gray-100">
            <h3 class="text-2xl font-bold text-gray-900">Edit Toko</h3>
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

          <form @submit.prevent="handleEditStore" class="p-6">
            <FormField
              label="Nama Toko"
              type="text"
              v-model="editStore.store_name"
              placeholder="Contoh: Toko Maju Jaya"
              required
            />
            <FormField
              label="Alamat"
              type="textarea"
              v-model="editStore.address"
              placeholder="Alamat lengkap toko"
              required
            />

            <div class="mb-6">
              <label class="block text-gray-700 text-sm font-bold mb-3">
                Penanggung Jawab Ditugaskan <span class="text-red-500">*</span>
              </label>
              <div
                class="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50"
              >
                <label
                  v-for="user in users"
                  :key="user.user_id"
                  class="flex items-center cursor-pointer hover:bg-blue-50 p-2 rounded-md transition-colors"
                >
                  <input
                    type="checkbox"
                    :value="user.user_id"
                    v-model="editStore.employees"
                    class="h-5 w-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span class="ml-3 text-gray-800 font-medium">{{ user.username }}</span>
                </label>
              </div>
              <p v-if="editStore.employees.length === 0" class="text-red-500 text-xs mt-2">
                Pilih setidaknya satu karyawan.
              </p>
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="showEditModal = false"
                class="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500/50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="isSubmitting || editStore.employees.length === 0"
                class="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 transition-all duration-300 transform hover:scale-105"
              >
                {{ isSubmitting ? 'Memperbarui...' : 'Perbarui Toko' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Detail Store Modal -->
      <div
        v-if="showDetailModal && selectedStore"
        class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-95 opacity-0 animate-scale-in"
        >
          <div class="flex items-center justify-between p-6 border-b border-gray-100">
            <h3 class="text-2xl font-bold text-gray-900">Detail Toko</h3>
            <button
              @click="showDetailModal = false"
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

          <div class="p-6">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nama Toko</label>
                <p class="text-gray-900 text-lg font-semibold">{{ selectedStore.store_name }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                <p class="text-gray-900">{{ selectedStore.address }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Karyawan</label>
                <p class="text-gray-900">{{ getEmployeeNames(selectedStore) }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Dibuat Pada</label>
                <p class="text-gray-900">{{ formatDate(selectedStore.created_at) }}</p>
              </div>
            </div>

            <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100">
              <button
                @click="((showDetailModal = false), openEditModal(selectedStore))"
                class="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors duration-300 transform hover:scale-105"
              >
                Edit Toko
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modal animation */
@keyframes scaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-scale-in {
  animation: scaleIn 0.3s ease-out forwards;
}

/* Custom scrollbar for employee list */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9; /* slate-100 */
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #a5b4fc; /* indigo-300 */
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #818cf8; /* indigo-400 */
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
