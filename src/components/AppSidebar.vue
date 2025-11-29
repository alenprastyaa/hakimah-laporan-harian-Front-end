<script setup>
import { ref, onMounted, onUnmounted } from 'vue' // Import onMounted and onUnmounted
import { useAuth } from '@/composables/useAuth'

const { isAdmin } = useAuth()
const isCollapsed = ref(false)
const isMobile = ref(false) // Add mobile state

const navLinks = [
  {
    name: 'Dashboard',
    to: '/',
    icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    name: 'Laporan',
    to: '/reports',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    gradient: 'from-green-500 to-green-600',
  },
  {
    name: 'Buat Laporan',
    to: '/reports/create',
    icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
    gradient: 'from-purple-500 to-purple-600',
  },
  {
    name: 'Manajemen Bank',
    to: '/banks',
    icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
    gradient: 'from-blue-500 to-blue-600',
  },
]

const adminLinks = [
  {
    name: 'Manajemen Pengguna',
    to: '/users',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  {
    name: 'Manajemen Toko',
    to: '/stores',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    gradient: 'from-red-500 to-yellow-500',
  },
]

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

// --- Responsive logic starts here ---
const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 600
  if (isMobile.value) {
    isCollapsed.value = true // Always collapsed on mobile
  } else {
    isCollapsed.value = false // Ensure it's not collapsed when switching back to desktop
  }
}

// --- New method to close sidebar on link click in mobile ---
const closeSidebar = () => {
  if (isMobile.value) {
    isCollapsed.value = true
  }
}
// --- End of new method ---

onMounted(() => {
  checkScreenSize() // Set initial state
  window.addEventListener('resize', checkScreenSize) // Add listener for dynamic updates
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize) // Clean up listener
})
// --- Responsive logic ends here ---
</script>

<template>
  <aside
    :class="[
      'fixed top-20 left-0 bottom-0 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl transition-all duration-300 ease-in-out overflow-hidden z-40',
      isCollapsed ? 'w-20 bg-transparent border-none shadow-none' : 'w-72 bg-white',
    ]"
  >
    <div
      class="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
    >
      <div class="p-6">
        <div v-if="!isCollapsed" class="flex items-center space-x-3">
          <div
            @click="toggleSidebar"
            class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg"
          >
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              ></path>
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-800">Toko Hakimah</h2>
            <p class="text-xs text-gray-500">Main Menu</p>
          </div>
        </div>
        <div v-else class="flex justify-center">
          <div
            @click="toggleSidebar"
            class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md cursor-pointer"
          >
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </div>
        </div>
      </div>

      <nav class="p-4">
        <div class="space-y-2">
          <div v-if="!isCollapsed" class="px-3 py-2">
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Menu Utama</h3>
          </div>

          <router-link
            v-for="link in navLinks"
            :key="link.name"
            :to="link.to"
            @click="closeSidebar"
            class="group relative flex items-center rounded-xl transition-all duration-200 hover:bg-gray-50/80"
            :class="[isCollapsed ? 'p-3 justify-center' : 'p-3']"
          >
            <div
              v-if="!isMobile || !isCollapsed"
              :class="[
                'flex items-center justify-center rounded-lg shadow-sm transition-all duration-200 group-hover:shadow-md mr-3',
                `bg-gradient-to-br ${link.gradient}`,
                isCollapsed ? 'w-8 h-8' : 'w-10 h-10',
              ]"
            >
              <svg
                :class="['text-white', isCollapsed ? 'w-4 h-4' : 'w-5 h-5']"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  :d="link.icon"
                ></path>
              </svg>
            </div>

            <Transition
              enter-active-class="transition-all duration-200"
              enter-from-class="opacity-0 translate-x-2"
              enter-to-class="opacity-100 translate-x-0"
              leave-active-class="transition-all duration-200"
              leave-from-class="opacity-100 translate-x-0"
              leave-to-class="opacity-0 translate-x-2"
            >
              <div v-if="!isCollapsed" :class="[!isMobile ? 'ml-4' : '', 'flex-1']">
                <span
                  class="font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200"
                >
                  {{ link.name }}
                </span>
              </div>
            </Transition>

            <div
              class="absolute left-0 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            ></div>

            <div
              v-if="isCollapsed && !isMobile"
              class="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
            >
              {{ link.name }}
              <div
                class="absolute top-1/2 -left-1 w-2 h-2 bg-gray-900 rotate-45 transform -translate-y-1/2"
              ></div>
            </div>
          </router-link>
        </div>

        <template v-if="isAdmin">
          <div class="mt-8 space-y-2">
            <div v-if="!isCollapsed" class="px-3 py-2 border-t border-gray-100 pt-6">
              <div class="flex items-center space-x-2">
                <div
                  class="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center"
                >
                  <svg
                    class="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </div>
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Admin Panel
                </h3>
              </div>
            </div>

            <div v-else-if="!isMobile" class="border-t border-gray-200 pt-4 flex justify-center">
              <div
                class="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center"
              >
                <svg
                  class="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
              </div>
            </div>

            <div v-else-if="isMobile && isCollapsed" class="border-t border-gray-200 pt-4"></div>

            <router-link
              v-for="link in adminLinks"
              :key="link.name"
              :to="link.to"
              @click="closeSidebar"
              class="group relative flex items-center rounded-xl transition-all duration-200 hover:bg-gray-50/80"
              :class="[isCollapsed ? 'p-3 justify-center' : 'p-3']"
            >
              <div
                v-if="!isMobile || !isCollapsed"
                :class="[
                  'flex items-center justify-center rounded-lg shadow-sm transition-all duration-200 group-hover:shadow-md mr-3',
                  `bg-gradient-to-br ${link.gradient}`,
                  isCollapsed ? 'w-8 h-8' : 'w-10 h-10',
                ]"
              >
                <svg
                  :class="['text-white', isCollapsed ? 'w-4 h-4' : 'w-5 h-5']"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    :d="link.icon"
                  ></path>
                </svg>
              </div>

              <Transition
                enter-active-class="transition-all duration-200"
                enter-from-class="opacity-0 translate-x-2"
                enter-to-class="opacity-100 translate-x-0"
                leave-active-class="transition-all duration-200"
                leave-from-class="opacity-100 translate-x-0"
                leave-to-class="opacity-0 translate-x-2"
              >
                <div v-if="!isCollapsed" :class="[!isMobile ? 'ml-4' : '', 'flex-1']">
                  <span
                    class="font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200"
                  >
                    {{ link.name }}
                  </span>
                </div>
              </Transition>

              <div
                class="absolute left-0 w-1 h-8 bg-gradient-to-b from-amber-400 to-orange-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              ></div>

              <div
                v-if="isCollapsed && !isMobile"
                class="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
              >
                {{ link.name }}
                <div
                  class="absolute top-1/2 -left-1 w-2 h-2 bg-gray-900 rotate-45 transform -translate-y-1/2"
                ></div>
              </div>
            </router-link>
          </div>
        </template>
      </nav>

      <div
        class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50/80 to-transparent"
      >
        <div v-if="!isCollapsed" class="text-center">
          <p class="text-xs text-gray-400">SKEMA API Dashboard</p>
          <p class="text-xs text-gray-300">v2.0.0</p>
        </div>
        <div v-else-if="!isMobile" class="flex justify-center">
          <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* Custom scrollbar */
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 2px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}

/* Router link active state */
.router-link-active {
  @apply bg-blue-50/80;
}

.router-link-active .absolute {
  @apply opacity-100;
}

.router-link-active span {
  @apply text-blue-600 font-semibold;
}
</style>
