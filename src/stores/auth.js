import { defineStore } from 'pinia'
import axios from 'axios'
import Swal from 'sweetalert2' // Import SweetAlert2

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://tokohakimah.my.id/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    isKaryawan: (state) => state.user?.role === 'karyawan',
    getUserId: (state) => state.user?.user_id,
    getToken: (state) => state.token,
  },
  actions: {
    async login(username, password) {
      try {
        const response = await axios.post(`${API_URL}/users/login`, { username, password })
        this.token = response.data.token
        this.user = response.data.user
        localStorage.setItem('token', this.token)
        localStorage.setItem('user', JSON.stringify(this.user))
        Swal.fire({
          icon: 'success',
          title: 'Login Successful!',
          text: 'Welcome back!',
          showConfirmButton: false,
          timer: 1500,
        })
        return true
      } catch (error) {
        console.error('Login failed:', error)
        this.clearAuth()
        let errorMessage = 'An unexpected error occurred during login.'
        if (error.response && error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message
        } else if (error.message) {
          errorMessage = error.message
        }

        Swal.fire({
          icon: 'error',
          title: 'Login Failed!',
          text: errorMessage,
          confirmButtonText: 'Try Again',
        })

        throw error
      }
    },
    logout() {
      this.clearAuth()

      Swal.fire({
        icon: 'info',
        title: 'Logged Out',
        text: 'You have been successfully logged out.',
        showConfirmButton: false,
        timer: 1500,
      })
    },
    clearAuth() {
      this.user = null
      this.token = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
    setAuthHeader() {
      if (this.token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
      } else {
        delete axios.defaults.headers.common['Authorization']
      }
    },
  },
})
