<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/composables/useAuth'

const { user, logout } = useAuth()
const isDropdownOpen = ref(false)

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const handleLogout = async (event) => {
  // Prevent any default behavior
  event.preventDefault()
  event.stopPropagation()

  try {
    console.log('Logout button clicked') // Debug log
    isDropdownOpen.value = false

    await nextTick()

    // Call logout function
    await logout()
  } catch (error) {
    console.error('Logout error:', error)
  }
}

// Close dropdown when clicking outside
const closeDropdown = (event) => {
  if (!event.target.closest('.dropdown-container')) {
    isDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>

<template>
  <header
    class="fixed top-0 left-0 right-0 z-50 bg-white backdrop-blur-md border-b border-gray-200/50 shadow-sm"
  >
    <div class="container mx-auto px-6 py-4 flex justify-between items-center">
      <!-- Logo Section -->
      <router-link
        to="/"
        class="flex items-center space-x-3 group transition-all duration-300 hover:scale-105"
      >
        <div class="relative">
          <div
            class="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300"
          >
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              ></path>
            </svg>
          </div>
          <div
            class="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"
          ></div>
        </div>
        <div>
          <h1
            class="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent"
          >
            LAPORAN HARIAN
          </h1>
          <p class="text-xs text-gray-500 font-medium">Dashboard</p>
        </div>
      </router-link>

      <!-- User Profile Section -->
      <div class="relative dropdown-container">
        <button
          @click="toggleDropdown"
          class="flex items-center space-x-3 p-2 rounded-2xl bg-gray-50/50 hover:bg-gray-100/70 transition-all duration-300 border border-gray-200/50 hover:border-gray-300/70 group"
          type="button"
        >
          <!-- Avatar -->
          <div
            class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300"
          >
            <span class="text-white font-bold text-sm">
              {{ user?.username?.charAt(0).toUpperCase() }}
            </span>
          </div>

          <!-- User Info -->
          <div class="hidden md:block text-left">
            <p class="text-sm font-semibold text-gray-800">{{ user?.username }}</p>
            <p class="text-xs text-gray-500 capitalize">
              <span
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                :class="{
                  'bg-blue-100 text-blue-800': user?.role !== 'karyawan',
                  'bg-green-100 text-green-800': user?.role === 'karyawan',
                }"
              >
                {{ user?.role === 'karyawan' ? 'Penanggung Jawab' : user?.role }}
              </span>
            </p>
          </div>

          <!-- Dropdown Arrow -->
          <svg
            class="w-4 h-4 text-gray-500 transition-transform duration-200 group-hover:text-gray-700"
            :class="{ 'rotate-180': isDropdownOpen }"
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

        <!-- Dropdown Menu -->
        <Transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="transform opacity-0 scale-95"
          enter-to-class="transform opacity-100 scale-100"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="transform opacity-100 scale-100"
          leave-to-class="transform opacity-0 scale-95"
        >
          <div
            v-if="isDropdownOpen"
            class="absolute right-0 mt-3 w-72 bg-white backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden z-50"
          >
            <!-- User Profile Header -->
            <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
              <div class="flex items-center space-x-3">
                <div
                  class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md"
                >
                  <span class="text-white font-bold text-lg">
                    {{ user?.username?.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div>
                  <p class="font-semibold text-gray-800">{{ user?.username }}</p>
                  <p class="text-xs text-gray-500 capitalize">
                    <span
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      :class="{
                        'bg-blue-100 text-blue-800': user?.role !== 'karyawan',
                        'bg-green-100 text-green-800': user?.role === 'karyawan',
                      }"
                    >
                      {{ user?.role === 'karyawan' ? 'Penanggung Jawab' : user?.role }}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <!-- Menu Items -->
            <div class="p-2">
              <!-- Profile Link -->
              <router-link
                to="/profile"
                @click="isDropdownOpen = false"
                class="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 group"
              >
                <div
                  class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200"
                >
                  <svg
                    class="w-4 h-4 text-blue-600"
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
                <span class="text-sm font-medium text-gray-700">Profil Saya</span>
              </router-link>

              <!-- Settings Link -->
              <router-link
                to="/settings"
                @click="isDropdownOpen = false"
                class="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 group"
              >
                <div
                  class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors duration-200"
                >
                  <svg
                    class="w-4 h-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    ></path>
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    ></path>
                  </svg>
                </div>
                <span class="text-sm font-medium text-gray-700">Pengaturan</span>
              </router-link>

              <!-- Divider -->
              <div class="my-2 border-t border-gray-100"></div>

              <!-- Logout Button -->
              <button
                @click="handleLogout"
                type="button"
                class="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-red-50 transition-colors duration-200 group cursor-pointer"
                :disabled="false"
              >
                <div
                  class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors duration-200"
                >
                  <svg
                    class="w-4 h-4 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    ></path>
                  </svg>
                </div>
                <span class="text-sm font-medium text-red-600">Keluar</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* Custom scrollbar for dropdown if needed */
.dropdown-content::-webkit-scrollbar {
  width: 4px;
}

.dropdown-content::-webkit-scrollbar-track {
  background: transparent;
}

.dropdown-content::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 2px;
}

.dropdown-content::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}

/* Ensure button is clickable */
button[type='button'] {
  pointer-events: auto;
}

/* Ensure dropdown has proper stacking */
.dropdown-container {
  position: relative;
  z-index: 50;
}
</style>
