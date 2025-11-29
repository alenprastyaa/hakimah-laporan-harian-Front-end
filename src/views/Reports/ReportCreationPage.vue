<script setup>
import { ref, computed, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import { useSweetAlert } from '@/composables/useSweetAlert'
import { useAuth } from '@/composables/useAuth'
import FormField from '@/components/FormField.vue'
import { format } from 'date-fns'

const { get, post } = useApi()
const { showAlert } = useSweetAlert()
const { isAdmin, user } = useAuth()

const stores = ref([])
const banks = ref([])
const reportForm = ref({
  store_id: '',
  report_date: format(new Date(), 'yyyy-MM-dd'),
  balances: [],
  keterangan: '',
  uang_nitip: 0,
})
const isLoading = ref(false)
const isStoreFieldDisabled = ref(false)
const currentStep = ref(1)
const totalSteps = 3
const selectedStoreId = ref(null)

const newBank = ref({
  store_id: null,
})

const fetchStores = async () => {
  try {
    const response = await get('/stores')
    stores.value = response.stores || []
    if (stores.value.length > 0 && selectedStoreId.value === null) {
      selectedStoreId.value = stores.value[0].store_id

      if (!isAdmin.value && stores.value.length === 1) {
        reportForm.value.store_id = stores.value[0].store_id
        isStoreFieldDisabled.value = true
      }
    }

    if (newBank.value.store_id === null && stores.value.length > 0) {
      newBank.value.store_id = stores.value[0].store_id
    }
  } catch (error) {
    console.error('Failed to fetch stores:', error)
    showAlert('Error', 'Gagal memuat daftar toko.', 'error')
  }
}

watch(selectedStoreId, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    fetchBanks()
  }
})

const fetchBanks = async () => {
  try {
    let response
    if (selectedStoreId.value) {
      response = await get(`/banks/store/${selectedStoreId.value}`)
    } else {
      response = await get('/banks')
    }
    banks.value = response.banks
    reportForm.value.balances = banks.value.map((bank) => ({
      bank_id: bank.bank_id,
      bank_name: bank.bank_name,
      saldo: 0,
      keterangan: bank.keterangan,
      uang_nitip: bank.uang_nitip,
    }))

    const currentBankIds = new Set(banks.value.map((b) => b.bank_id))
    reportForm.value.balances = reportForm.value.balances.filter((b) =>
      currentBankIds.has(b.bank_id),
    )
  } catch (error) {
    console.error('Failed to fetch banks:', error)
    showAlert('Error', 'Gagal memuat daftar bank.', 'error')
  }
}
watch(
  user,
  async (newUser) => {
    if (newUser) {
      await fetchStores()

      if (!isAdmin.value && stores.value.length === 1) {
        reportForm.value.store_id = stores.value[0].store_id
        isStoreFieldDisabled.value = true
        selectedStoreId.value = stores.value[0].store_id
      } else if (isAdmin.value && stores.value.length > 0) {
        selectedStoreId.value = stores.value[0].store_id
      }
      await fetchBanks()
    }
  },
  { immediate: true },
)

const storeOptions = computed(() => {
  return stores.value.map((store) => ({
    label: store.store_name,
    value: store.store_id,
  }))
})

const totalBalance = computed(() => {
  return reportForm.value.balances.reduce((sum, balance) => sum + (balance.saldo || 0), 0)
})

const filledBanks = computed(() => {
  return reportForm.value.balances.filter((b) => (b.saldo || 0) > 0).length
})

const canProceedToStep2 = computed(() => {
  return reportForm.value.store_id && reportForm.value.report_date
})

const canSubmit = computed(() => {
  const validBalances = reportForm.value.balances.filter((b) => (b.saldo || 0) > 0)
  return reportForm.value.store_id && reportForm.value.report_date && validBalances.length > 0
})

const nextStep = () => {
  if (currentStep.value === 1) {
    if (!canProceedToStep2.value) {
      showAlert(
        'Peringatan!',
        'Harap lengkapi semua informasi dasar (toko dan tanggal).',
        'warning',
      )
      return
    }

    reportForm.value.store_id = selectedStoreId.value
  }
  if (currentStep.value === 2 && filledBanks.value === 0 && banks.value.length > 0) {
    showAlert('Peringatan!', 'Setidaknya satu saldo bank harus diisi.', 'warning')
    return
  }
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const handleSubmitReport = async () => {
  isLoading.value = true
  try {
    const validBalances = reportForm.value.balances
      .filter((b) => (b.saldo || 0) > 0)
      .map((b) => {
        let saldoToSend = parseFloat(b.saldo) || 0
        let adminFee = 0
        if (b.bank_name === 'EDC BCA' && saldoToSend > 0) {
          adminFee = saldoToSend * 0.01
          saldoToSend -= adminFee
        } else if (b.bank_name === 'EDC DKI' && saldoToSend > 0) {
          adminFee = saldoToSend * 0.0014
          saldoToSend -= adminFee
        } else if (b.bank_name === 'QRIS' && saldoToSend > 0) {
          adminFee = saldoToSend * 0.007
          saldoToSend -= adminFee
        }
        return {
          bank_id: b.bank_id,
          bank_name: b.bank_name,
          saldo: saldoToSend,
          admin_fee_applied: adminFee,
        }
      })
    if (validBalances.length === 0) {
      showAlert('Peringatan!', 'Setidaknya satu saldo bank harus diisi.', 'warning')
      isLoading.value = false
      return
    }
    if (!reportForm.value.store_id) {
      showAlert('Peringatan!', 'Toko harus dipilih.', 'warning')
      isLoading.value = false
      return
    }
    const payload = {
      store_id: reportForm.value.store_id,
      report_date: reportForm.value.report_date,
      balances: validBalances,
      keterangan: reportForm.value.keterangan,
      uang_nitip: parseFloat(reportForm.value.uang_nitip) || 0,
    }
    await post('/reports', payload)
    showAlert(
      'Laporan Berhasil di Buat!',
      'Selamat Beristirahat & Jangan lupa matikan Komputer',
      'success',
    )
    resetForm()
    currentStep.value = 1
    if (!isAdmin.value && stores.value.length === 1) {
      reportForm.value.store_id = stores.value[0].store_id
      selectedStoreId.value = stores.value[0].store_id
      isStoreFieldDisabled.value = true
    } else if (isAdmin.value && stores.value.length > 0) {
      selectedStoreId.value = stores.value[0].store_id
    } else {
      selectedStoreId.value = null
    }
    fetchBanks()
  } catch (error) {
    console.error('Failed to create report:', error)
    const errorMessage = error.response?.data?.message || 'Terjadi kesalahan saat membuat laporan.'
    showAlert('Error', errorMessage, 'error')
  } finally {
    isLoading.value = false
  }
}

const resetForm = () => {
  reportForm.value = {
    store_id: '',
    report_date: format(new Date(), 'yyyy-MM-dd'),
    keterangan: '',
    uang_nitip: 0,
    balances: banks.value.map((bank) => ({
      bank_id: bank.bank_id,
      bank_name: bank.bank_name,
      saldo: 0,
    })),
  }
}

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount) || amount === '') {
    return 'Rp 0'
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
    <div class="container mx-auto px-4 py-8">
      <div class="text-center mb-8">
        <div
          class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4"
        >
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h1
          class="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2"
        >
          Laporan Harian
        </h1>
        <p class="text-gray-600 text-lg">Buat laporan keuangan harian dengan mudah</p>
      </div>

      <div class="mb-8">
        <div class="flex justify-center">
          <div class="flex items-center space-x-4">
            <div v-for="step in totalSteps" :key="step" class="flex items-center">
              <div
                class="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300"
                :class="
                  step <= currentStep
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-400'
                "
              >
                <span class="text-sm font-semibold">{{ step }}</span>
              </div>
              <div
                v-if="step < totalSteps"
                class="w-16 h-1 mx-2 transition-all duration-300"
                :class="
                  step < currentStep
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                    : 'bg-gray-200'
                "
              ></div>
            </div>
          </div>
        </div>
        <div class="flex justify-center mt-4">
          <div class="text-sm text-gray-600 text-center">
            <span v-if="currentStep === 1">Informasi Dasar</span>
            <span v-else-if="currentStep === 2">Saldo Bank & Pembayaran</span>
            <span v-else>Konfirmasi</span>
          </div>
        </div>
      </div>

      <div class="max-w-4xl mx-auto">
        <div
          class="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden"
        >
          <form @submit.prevent="handleSubmitReport">
            <div v-show="currentStep === 1" class="p-8">
              <div class="mb-6">
                <h2 class="text-2xl font-semibold text-gray-800 mb-2">Informasi Dasar</h2>
                <p class="text-gray-600">Pilih toko dan tanggal untuk laporan Anda</p>
              </div>

              <div
                v-if="!isAdmin && stores.length === 0"
                class="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4 mb-6"
              >
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <svg
                      class="w-6 h-6 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <div class="ml-3">
                    <p class="text-red-800 font-medium">Tidak ada toko terhubung</p>
                    <p class="text-red-700 text-sm">
                      Silakan hubungi administrator untuk penugasan toko.
                    </p>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <FormField
                    label="Pilih Toko"
                    type="select"
                    v-model="selectedStoreId"
                    :options="storeOptions"
                    placeholder="Pilih Toko"
                    required
                    :disabled="isStoreFieldDisabled || stores.length === 0"
                  />
                </div>
                <div class="space-y-2">
                  <FormField
                    label="Tanggal Laporan"
                    type="date"
                    v-model="reportForm.report_date"
                    required
                  />
                </div>
              </div>

              <div class="flex justify-end mt-8">
                <button
                  type="button"
                  @click="nextStep"
                  :disabled="!canProceedToStep2 || stores.length === 0"
                  class="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  Lanjutkan
                  <svg
                    class="w-5 h-5 ml-2 inline"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div v-show="currentStep === 2" class="p-8">
              <div class="mb-6">
                <h2 class="text-2xl font-semibold text-gray-800 mb-2">Saldo Bank & Pembayaran</h2>
                <p class="text-gray-600">Masukkan saldo untuk setiap metode pembayaran</p>
              </div>

              <div
                v-if="banks.length === 0"
                class="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 mb-6"
              >
                <div class="flex items-center">
                  <svg
                    class="w-6 h-6 text-yellow-600 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p class="text-yellow-800">
                    Belum ada bank/pembayaran yang terdaftar untuk toko ini. Harap tambahkan di
                    Manajemen Bank.
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div
                  v-for="(bankBalance, index) in reportForm.balances"
                  :key="bankBalance.bank_id"
                  class="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200"
                >
                  <div class="flex items-center mb-4">
                    <div
                      class="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mr-4"
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
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      </svg>
                    </div>
                    <h3 class="font-semibold text-gray-800">{{ bankBalance.bank_name }}</h3>
                  </div>
                  <FormField
                    :label="`Saldo ${bankBalance.bank_name}`"
                    type="text"
                    v-model.number="bankBalance.saldo"
                    :placeholder="`Masukkan saldo ${bankBalance.bank_name}`"
                    :min="0"
                    isCurrency
                  />
                </div>
              </div>

              <div class="mb-6">
                <FormField
                  label="Jumlah Uang Nitip (Jika ada)"
                  type="text"
                  v-model.number="reportForm.uang_nitip"
                  placeholder="Masukkan jumlah uang nitip dan jangan tulis pada Keterangan"
                  isCurrency
                  :min="0"
                />
              </div>

              <div class="mb-10">
                <label for="keterangan" class="block text-sm font-medium text-gray-700 mb-1"
                  >Keterangan</label
                >
                <textarea
                  v-model="reportForm.keterangan"
                  id="keterangan"
                  name="keterangan"
                  rows="4"
                  class="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 p-2 text-sm text-gray-700"
                  placeholder="Tulis keterangan di sini..."
                ></textarea>
              </div>

              <div
                class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6"
              >
                <h3 class="text-lg font-semibold text-blue-900 mb-4">Ringkasan</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="text-center">
                    <p class="text-sm text-blue-700 mb-1">Total Saldo</p>
                    <p class="text-2xl font-bold text-blue-900">
                      {{ formatCurrency(totalBalance) }}
                    </p>
                  </div>
                  <div class="text-center">
                    <p class="text-sm text-blue-700 mb-1">Bank Terisi</p>
                    <p class="text-2xl font-bold text-blue-900">
                      {{ filledBanks }} / {{ banks.length }}
                    </p>
                  </div>
                  <div class="text-center sm:col-span-2">
                    <p class="text-sm text-blue-700 mb-1">Uang Nitip</p>
                    <p class="text-2xl font-bold text-blue-900">
                      {{ formatCurrency(reportForm.uang_nitip) }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="flex justify-between">
                <button
                  type="button"
                  @click="prevStep"
                  class="px-6 py-3 bg-gray-500 text-white font-semibold rounded-xl hover:bg-gray-600 transition-colors duration-200"
                >
                  <svg
                    class="w-5 h-5 mr-2 inline"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Kembali
                </button>
                <button
                  type="button"
                  @click="nextStep"
                  :disabled="(filledBanks === 0 && banks.length > 0) || banks.length === 0"
                  class="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  Lanjutkan
                  <svg
                    class="w-5 h-5 ml-2 inline"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div v-show="currentStep === 3" class="p-8">
              <div class="mb-6">
                <h2 class="text-2xl font-semibold text-gray-800 mb-2">Konfirmasi Laporan</h2>
                <p class="text-gray-600">Periksa kembali data laporan sebelum menyimpan</p>
              </div>

              <div class="space-y-6">
                <div
                  class="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-6"
                >
                  <h3 class="text-lg font-semibold text-gray-800 mb-4">Informasi Dasar</h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p class="text-sm text-gray-600">Toko</p>
                      <p class="font-semibold text-gray-800">
                        {{
                          storeOptions.find((s) => s.value === reportForm.store_id)?.label ||
                          'Tidak dipilih'
                        }}
                      </p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">Tanggal</p>
                      <p class="font-semibold text-gray-800">{{ reportForm.report_date }}</p>
                    </div>
                  </div>
                </div>

                <div
                  class="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6"
                >
                  <h3 class="text-lg font-semibold text-gray-800 mb-4">Detail Saldo</h3>
                  <div class="space-y-3">
                    <div
                      v-for="balance in reportForm.balances.filter((b) => (b.saldo || 0) > 0)"
                      :key="balance.bank_id"
                      class="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
                    >
                      <span class="text-gray-700">{{ balance.bank_name }}</span>
                      <span class="font-semibold text-gray-900">{{
                        formatCurrency(balance.saldo)
                      }}</span>
                    </div>
                  </div>
                  <div class="mt-4 pt-4 border-t border-gray-300">
                    <div class="flex justify-between items-center mb-2">
                      <span class="text-lg font-semibold text-gray-800">Total Saldo Bank</span>
                      <span class="text-xl font-bold text-green-600">{{
                        formatCurrency(totalBalance)
                      }}</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-lg font-semibold text-gray-800">Jumlah Uang Nitip</span>
                      <span class="text-xl font-bold text-green-600">{{
                        formatCurrency(reportForm.uang_nitip)
                      }}</span>
                    </div>
                  </div>
                  <div class="mt-10">
                    <label for="keterangan" class="block text-sm font-medium text-gray-700 mb-3"
                      >Keterangan</label
                    >
                    <div
                      class="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-3 text-sm text-gray-700 bg-gray-50 min-h-[100px]"
                    >
                      {{ reportForm.keterangan || 'Tidak ada keterangan.' }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex justify-between mt-8">
                <button
                  type="button"
                  @click="prevStep"
                  class="px-6 py-3 bg-gray-500 text-white font-semibold rounded-xl hover:bg-gray-600 transition-colors duration-200"
                >
                  <svg
                    class="w-5 h-5 mr-2 inline"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Kembali
                </button>
                <button
                  type="submit"
                  :disabled="!canSubmit || isLoading"
                  class="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center"
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
                  <svg
                    v-else
                    class="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {{ isLoading ? 'Menyimpan Laporan...' : 'Simpan Laporan' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.container > * {
  animation: slideIn 0.6s ease-out;
}

.bg-white\/80 {
  background: rgba(255, 255, 255, 0.8);
}

.backdrop-blur-sm {
  backdrop-filter: blur(8px);
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, #3b82f6, #6366f1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to bottom, #2563eb, #4f46e5);
}
</style>
