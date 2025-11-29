// src/composables/useAuth.js
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { watchEffect } from 'vue'

export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  watchEffect(() => {
    authStore.setAuthHeader()
  })

  const login = async (username, password) => {
    try {
      await authStore.login(username, password)
      router.push({ name: 'Dashboard' })
      return true
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    authStore.logout()
    router.push({ name: 'Login' })
  }

  return {
    isAuthenticated: authStore.isAuthenticated,
    isAdmin: authStore.isAdmin,
    isKaryawan: authStore.isKaryawan,
    user: authStore.user,
    getUserId: authStore.getUserId,
    login,
    logout,
  }
}
