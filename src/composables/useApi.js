// src/composables/useApi.js
import axios from 'axios'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSweetAlert } from '@/composables/useSweetAlert'
import { useRouter } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export function useApi() {
  const authStore = useAuthStore()
  const { showAlert } = useSweetAlert()
  const router = useRouter()

  const isLoading = ref(false)
  const requestCount = ref(0)

  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    withCredentials: false,
    timeout: 15000,
  })

  apiClient.interceptors.request.use(
    (config) => {
      requestCount.value++
      isLoading.value = true

      if (authStore.token) {
        config.headers.Authorization = `Bearer ${authStore.token}`
      }

      return config
    },
    (error) => {
      requestCount.value--
      if (requestCount.value === 0) {
        isLoading.value = false
      }
      return Promise.reject(error)
    },
  )

  apiClient.interceptors.response.use(
    (response) => {
      requestCount.value--
      if (requestCount.value === 0) {
        isLoading.value = false
      }
      return response
    },
    async (error) => {
      // Track loading state
      requestCount.value--
      if (requestCount.value === 0) {
        isLoading.value = false
      }

      if (!error.response) {
        let errorMessage = 'Terjadi kesalahan jaringan'

        if (error.code === 'ERR_NETWORK') {
          errorMessage =
            'Tidak dapat terhubung ke server. Pastikan server berjalan dan dapat diakses.'
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          errorMessage = 'Request timeout. Server tidak merespons dalam waktu yang ditentukan.'
        } else if (error.message.includes('CORS')) {
          errorMessage = 'CORS error. Pastikan server mengizinkan akses dari domain ini.'
        }

        await showAlert('Error Koneksi!', errorMessage, 'error')
        return Promise.reject(error)
      }

      const { status, data } = error.response

      switch (status) {
        case 401:
          await handleUnauthorized()
          break
        case 403:
          await handleForbidden(data?.message)
          break
        case 404:
          await showAlert('Error!', data?.message || 'Data tidak ditemukan.', 'error')
          break
        case 409:
          await showAlert('Konflik!', data?.message || 'Data sudah ada atau konflik.', 'warning')
          break
        case 422:
          await handleValidationError(data)
          break
        case 429:
          await showAlert(
            'Rate Limit!',
            'Terlalu banyak request. Silakan coba lagi nanti.',
            'warning',
          )
          break
        case 500:
          await showAlert('Nama Sudah Tersedia', 'Buat Bank dengan nama yang berbeda !', 'error')
          break
        case 502:
        case 503:
        case 504:
          await showAlert(
            'Server Error!',
            'Terjadi kesalahan pada server. Mohon coba lagi.',
            'error',
          )
          break
        default:
          await showAlert(
            'Error!',
            data?.message || `Error ${status}: Terjadi kesalahan yang tidak diketahui.`,
            'error',
          )
      }

      return Promise.reject(error)
    },
  )

  const handleUnauthorized = async () => {
    if (authStore.isAuthenticated) {
      await showAlert('Sesi Habis', 'Sesi Anda telah berakhir, silakan login kembali.', 'warning')
      authStore.logout()
      router.push('/login')
    } else {
      await showAlert('Akses Ditolak', 'Anda harus login untuk mengakses halaman ini.', 'error')
      router.push('/login')
    }
  }

  // Handle forbidden access
  const handleForbidden = async (message) => {
    await showAlert(
      'Akses Ditolak',
      message || 'Anda tidak memiliki izin untuk melakukan aksi ini.',
      'error',
    )
  }

  const handleValidationError = async (data) => {
    let errorMessage = 'Data tidak valid.'

    if (data?.errors) {
      const errorMessages = Object.values(data.errors).flat()
      errorMessage = errorMessages.join('\n')
    } else if (data?.message) {
      errorMessage = data.message
    }

    await showAlert('Validasi Error!', errorMessage, 'error')
  }

  const request = async (method, url, data = null, config = {}) => {
    try {
      const response = await apiClient({
        method,
        url,
        data,
        ...config,
      })
      return response.data
    } catch (error) {
      throw error
    }
  }

  const get = (url, config = {}) => request('get', url, config)
  const post = (url, data, config = {}) => request('post', url, data, config)
  const put = (url, data, config = {}) => request('put', url, data, config)
  const patch = (url, data, config = {}) => request('patch', url, data, config)
  const del = (url, config = {}) => request('delete', url, config)

  // New function to remove 'uang_nitip'
  const removeUangNitip = async (reportId) => {
    try {
      // Sends a PUT request to the specific endpoint for removing uang_nitip
      const response = await apiClient.patch(`/reports/${reportId}/remove-uang-nitip`)
      return response.data
    } catch (error) {
      console.error('Error removing uang nitip:', error)
      throw error // Re-throw to be handled by the interceptors or the caller
    }
  }

  // File upload utility
  const uploadFile = (url, file, onUploadProgress = null) => {
    const formData = new FormData()
    formData.append('file', file)

    return request('post', url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    })
  }

  // Batch requests utility
  const batchRequests = async (requests) => {
    try {
      const responses = await Promise.allSettled(requests)
      return responses.map((response, index) => ({
        index,
        status: response.status,
        data: response.status === 'fulfilled' ? response.value : null,
        error: response.status === 'rejected' ? response.reason : null,
      }))
    } catch (error) {
      throw error
    }
  }

  // Retry utility for failed requests
  const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
    let lastError

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn()
      } catch (error) {
        lastError = error

        if (attempt === maxRetries) {
          break
        }

        // Don't retry on client errors (4xx) except 408, 429
        if (
          error.response?.status >= 400 &&
          error.response?.status < 500 &&
          error.response?.status !== 408 &&
          error.response?.status !== 429
        ) {
          break
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay * attempt))
      }
    }

    throw lastError
  }

  return {
    // HTTP methods
    get,
    post,
    put,
    patch,
    del,

    // Utilities
    uploadFile,
    batchRequests,
    retryRequest,
    removeUangNitip, // <-- Added the new function here

    // State
    isLoading,

    // Direct access to axios instance for advanced usage
    client: apiClient,
  }
}
