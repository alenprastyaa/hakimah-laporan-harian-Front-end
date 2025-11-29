<script setup>
import { ref, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { useSweetAlert } from '@/composables/useSweetAlert'
import FormField from '@/components/FormField.vue'

const { get, post, put, del } = useApi()
const { showAlert, showConfirm } = useSweetAlert()

// Data state
const users = ref([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const isDeleting = ref(false)

// Modal states
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDetailModal = ref(false)

// Form data
const newUser = ref({
  username: '',
  password: '',
  role: 'karyawan',
})

// MODIFICATION: Added 'password' field to editUser state
const editUser = ref({
  user_id: null,
  username: '',
  password: '', // For the new optional password
  role: '',
})

const selectedUser = ref(null)

// Role options
const roles = [
  { label: 'Admin', value: 'admin' },
  { label: 'Karyawan', value: 'karyawan' },
]

// API Functions
const fetchUsers = async () => {
  isLoading.value = true
  try {
    const response = await get('/users')
    users.value = response.users || []
  } catch (error) {
    console.error('Failed to fetch users:', error)
    showAlert('Error!', 'Gagal memuat data pengguna.', 'error')
  } finally {
    isLoading.value = false
  }
}

// CRUD Operations
const handleCreateUser = async () => {
  if (!validateUserForm(newUser.value, true)) return

  isSubmitting.value = true
  try {
    await post('/users/register', newUser.value)
    showAlert('Berhasil!', 'Pengguna berhasil dibuat.', 'success')
    showCreateModal.value = false
    resetNewUserForm()
    await fetchUsers()
  } catch (error) {
    console.error('Failed to create user:', error)
    const errorMessage = error.response?.data?.message || 'Gagal membuat pengguna.'
    showAlert('Error!', errorMessage, 'error')
  } finally {
    isSubmitting.value = false
  }
}

// MODIFICATION: Updated handleEditUser to conditionally include the password
const handleEditUser = async () => {
  if (!validateUserForm(editUser.value)) return

  isSubmitting.value = true
  try {
    // Build the payload dynamically
    const payload = {
      username: editUser.value.username,
      role: editUser.value.role,
    }

    // Only include the password in the payload if a new one is provided
    if (editUser.value.password && editUser.value.password.trim() !== '') {
      payload.password = editUser.value.password
    }

    await put(`/users/${editUser.value.user_id}`, payload)
    showAlert('Berhasil!', 'Pengguna berhasil diperbarui.', 'success')
    showEditModal.value = false
    await fetchUsers()
  } catch (error) {
    console.error('Failed to update user:', error)
    const errorMessage = error.response?.data?.message || 'Gagal memperbarui pengguna.'
    showAlert('Error!', errorMessage, 'error')
  } finally {
    isSubmitting.value = false
  }
}

const handleDeleteUser = async (user) => {
  try {
    const result = await showConfirm(
      'Hapus Pengguna',
      `Apakah Anda yakin ingin menghapus pengguna "${user.username}"? Tindakan ini tidak dapat dibatalkan.`,
      'warning',
    )

    if (result.isConfirmed) {
      isDeleting.value = true

      // Make the delete request
      await del(`/users/${user.user_id}`)

      showAlert('Berhasil!', 'Pengguna berhasil dihapus.', 'success')
      await fetchUsers() // Refresh the user list
    }
  } catch (error) {
    console.error('Failed to delete user:', error)
    const errorMessage = error.response?.data?.message || 'Gagal menghapus pengguna.'
    showAlert('Error!', errorMessage, 'error')
  } finally {
    isDeleting.value = false
  }
}

// Helper functions
const validateUserForm = (user, isCreate = false) => {
  if (!user.username.trim()) {
    showAlert('Error!', 'Username harus diisi.', 'error')
    return false
  }
  // Password is only required on creation
  if (isCreate && !user.password.trim()) {
    showAlert('Error!', 'Password harus diisi.', 'error')
    return false
  }
  if (!user.role) {
    showAlert('Error!', 'Role harus dipilih.', 'error')
    return false
  }
  return true
}

const resetNewUserForm = () => {
  newUser.value = {
    username: '',
    password: '',
    role: 'karyawan',
  }
}

// MODIFICATION: Reset password field when opening the edit modal
const openEditModal = (user) => {
  editUser.value = {
    user_id: user.user_id,
    username: user.username,
    role: user.role,
    password: '', // Always start with an empty password field
  }
  showEditModal.value = true
}

const openDetailModal = (user) => {
  selectedUser.value = user
  showDetailModal.value = true
}

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

const getRoleBadgeClass = (role) => {
  return role === 'admin'
    ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-200'
    : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-200'
}

// Lifecycle
onMounted(fetchUsers)
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
    <div class="container mx-auto py-8 px-4 max-w-7xl">
      <div
        class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8"
      >
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center space-x-4">
            <div class="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <div>
              <h1
                class="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2"
              >
                Manajemen Pengguna
              </h1>
              <p class="text-gray-600 text-lg">Kelola akun pengguna dengan mudah dan aman</p>
            </div>
          </div>
          <div class="mt-6 lg:mt-0">
            <button
              @click="((showCreateModal = true), resetNewUserForm())"
              class="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
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
              Tambah Pengguna
            </button>
          </div>
        </div>
      </div>

      <div
        class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
      >
        <div class="p-6 border-b border-gray-100">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-gray-900">Daftar Pengguna</h2>
            <div class="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Total: {{ users.length }} pengguna
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="text-center py-16">
          <div class="inline-block relative">
            <div
              class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"
            ></div>
          </div>
          <p class="mt-4 text-gray-600 font-medium">Memuat data pengguna...</p>
        </div>

        <div v-else-if="users.length === 0" class="text-center py-16">
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              ></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Belum ada pengguna</h3>
          <p class="text-gray-500 mb-6">Mulai dengan menambahkan pengguna pertama Anda.</p>
          <button
            @click="((showCreateModal = true), resetNewUserForm())"
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              ></path>
            </svg>
            Tambah Pengguna Pertama
          </button>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-100">
            <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th
                  scope="col"
                  class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                >
                  Pengguna
                </th>
                <th
                  scope="col"
                  class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                >
                  Role
                </th>
                <th
                  scope="col"
                  class="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                >
                  Tanggal Dibuat
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
                v-for="user in users"
                :key="user.user_id"
                class="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-12 w-12">
                      <div
                        class="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg"
                      >
                        <svg
                          class="w-6 h-6 text-white"
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
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-lg font-bold text-gray-900">{{ user.username }}</div>
                      <div class="text-sm text-gray-500">ID: {{ user.user_id }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold capitalize"
                    :class="getRoleBadgeClass(user.role)"
                  >
                    <svg
                      v-if="user.role === 'admin'"
                      class="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714-2.143L13 3l-2.286 5.857L5 12l5.714 2.143L13 21l2.286-5.857L21 12l-5.714-2.143z"
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      ></path>
                    </svg>
                    <p class="text-xs text-gray-500 capitalize">
                      <span
                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        :class="{
                          '': user?.role !== 'karyawan',
                          ' ': user?.role === 'karyawan',
                        }"
                      >
                        {{ user?.role === 'karyawan' ? 'Penanggung Jawab' : user?.role }}
                      </span>
                    </p>
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                  {{ formatDate(user.created_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <div class="flex items-center justify-end space-x-2">
                    <button
                      @click="openDetailModal(user)"
                      class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                      title="Lihat Detail"
                    >
                      <svg
                        class="w-5 h-5 group-hover:scale-110 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
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
                      @click="openEditModal(user)"
                      class="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 group"
                      title="Edit"
                    >
                      <svg
                        class="w-5 h-5 group-hover:scale-110 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        ></path>
                      </svg>
                    </button>
                    <button
                      @click="handleDeleteUser(user)"
                      :disabled="isDeleting"
                      class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Hapus"
                    >
                      <svg
                        v-if="isDeleting"
                        class="w-5 h-5 animate-spin"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        ></path>
                      </svg>
                      <svg
                        v-else
                        class="w-5 h-5 group-hover:scale-110 transition-transform"
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
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        v-if="showCreateModal"
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
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  ></path>
                </svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900">Tambah Pengguna Baru</h3>
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

          <form @submit.prevent="handleCreateUser" class="p-6 space-y-4">
            <FormField
              label="Username"
              type="text"
              v-model="newUser.username"
              placeholder="Masukkan username"
              required
            />
            <FormField
              label="Password"
              type="password"
              v-model="newUser.password"
              placeholder="Masukkan password"
              required
            />
            <FormField
              label="Role"
              type="select"
              v-model="newUser.role"
              :options="roles"
              placeholder="Pilih peran"
              required
            />
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
                class="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
              >
                {{ isSubmitting ? 'Menyimpan...' : 'Simpan Pengguna' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div
        v-if="showEditModal"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
          <div class="flex items-center justify-between p-6 border-b border-gray-100">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-green-100 rounded-lg">
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  ></path>
                </svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900">Edit Pengguna</h3>
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

          <form @submit.prevent="handleEditUser" class="p-6 space-y-4">
            <FormField
              label="Username"
              type="text"
              v-model="editUser.username"
              placeholder="Masukkan username"
              required
            />
            <FormField
              label="Password Baru (Opsional)"
              type="password"
              v-model="editUser.password"
              placeholder="Kosongkan jika tidak ingin diubah"
            />
            <FormField
              label="Role"
              type="select"
              v-model="editUser.role"
              :options="roles"
              placeholder="Pilih peran"
              required
            />
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
                class="px-6 py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
              >
                {{ isSubmitting ? 'Memperbarui...' : 'Perbarui Pengguna' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div
        v-if="showDetailModal && selectedUser"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all">
          <div class="flex items-center justify-between p-6 border-b border-gray-100">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-indigo-100 rounded-lg">
                <svg
                  class="w-6 h-6 text-indigo-600"
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
              </div>
              <h3 class="text-xl font-bold text-gray-900">Detail Pengguna</h3>
            </div>
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
            <div class="text-center mb-6">
              <div
                class="mx-auto w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-4"
              >
                <svg
                  class="w-10 h-10 text-white"
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
              </div>
              <h4 class="text-2xl font-bold text-gray-900">{{ selectedUser.username }}</h4>
            </div>

            <div class="space-y-4">
              <div class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium text-gray-600">ID Pengguna</span>
                  <span class="text-sm font-bold text-gray-900">{{ selectedUser.user_id }}</span>
                </div>
              </div>

              <div class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium text-gray-600">Username</span>
                  <span class="text-sm font-bold text-gray-900">{{ selectedUser.username }}</span>
                </div>
              </div>

              <div class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium text-gray-600">Role</span>
                  <span
                    class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold capitalize"
                    :class="getRoleBadgeClass(selectedUser.role)"
                  >
                    <svg
                      v-if="selectedUser.role === 'admin'"
                      class="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714-2.143L13 3l-2.286 5.857L5 12l5.714 2.143L13 21l2.286-5.857L21 12l-5.714-2.143z"
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      ></path>
                    </svg>
                    {{ selectedUser.role }}
                  </span>
                </div>
              </div>

              <div class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium text-gray-600">Tanggal Dibuat</span>
                  <span class="text-sm font-bold text-gray-900">{{
                    formatDate(selectedUser.created_at)
                  }}</span>
                </div>
              </div>

              <div
                v-if="selectedUser.updated_at"
                class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4"
              >
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium text-gray-600">Terakhir Diperbarui</span>
                  <span class="text-sm font-bold text-gray-900">{{
                    formatDate(selectedUser.updated_at)
                  }}</span>
                </div>
              </div>
            </div>

            <div class="flex justify-end space-x-3 pt-6 border-t border-gray-100 mt-6">
              <button
                @click="showDetailModal = false"
                class="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500/50 transition-colors"
              >
                Tutup
              </button>
              <button
                @click="((showDetailModal = false), openEditModal(selectedUser))"
                class="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-200 transform hover:scale-105"
              >
                Edit Pengguna
              </button>
            </div>
          </div>
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
  background: linear-gradient(to right, #3b82f6, #6366f1);
  border-radius: 8px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to right, #2563eb, #4f46e5);
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

.group:hover .group-hover\:scale-110 {
  transform: scale(1.1);
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

.group-hover\:scale-110 {
  transition: transform 0.2s ease-in-out;
}
</style>
