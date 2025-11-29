<script setup>
import { computed } from 'vue'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

const props = defineProps({
  report: {
    type: Object,
    required: true,
  },
  show: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['close'])

// Currency formatter
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

// Date formatter
const formatDate = (dateString) => {
  return format(new Date(dateString), 'dd MMMM yyyy', { locale: id })
}

const getProfitColorClass = computed(() => {
  if (!props.report || props.report.profit_today === undefined) return 'text-gray-600'
  return props.report.profit_today > 0 ? 'text-green-600' : 'text-red-500'
})
</script>

<template>
  <Transition name="modal">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div
        class="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 opacity-0 modal-enter-active:scale-100 modal-enter-active:opacity-100 modal-leave-active:scale-95 modal-leave-active:opacity-0"
      >
        <div
          class="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl flex justify-between items-center z-10"
        >
          <div>
            <h3 class="text-2xl font-bold mb-1">{{ report.store_name }}</h3>
            <p class="text-blue-100 text-sm">Laporan Saldo Harian</p>
          </div>
          <button
            @click="emit('close')"
            class="text-white hover:text-blue-100 transition-colors duration-200"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
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

        <div class="p-6 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p class="text-sm text-gray-500">Tanggal Laporan</p>
              <p class="text-lg font-semibold text-gray-800">
                {{ formatDate(report.report_date) }}
              </p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p class="text-sm text-gray-500">Pelapor</p>
              <p class="text-lg font-semibold text-gray-800">{{ report.creator_username }}</p>
            </div>
          </div>

          <div class="bg-blue-50 p-5 rounded-lg border border-blue-200">
            <p class="text-sm text-blue-600 font-medium mb-1">Total Saldo Keseluruhan</p>
            <p class="text-3xl font-bold text-blue-800">
              {{ formatCurrency(report.total_balance) }}
            </p>
          </div>

          <div class="bg-green-50 p-5 rounded-lg border border-green-200">
            <p class="text-sm text-green-600 font-medium mb-1">Profit Hari Ini</p>
            <p class="text-3xl font-bold" :class="getProfitColorClass">
              {{ formatCurrency(report.profit_today) }}
            </p>
          </div>

          <div>
            <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <svg class="w-5 h-5 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M4 4a2 2 0 00-2 2v6a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2zm5 5a1 1 0 110 2 1 1 0 010-2z"
                ></path>
              </svg>
              Detail Saldo Bank ({{ report.balances_detail?.length || 0 }})
            </h4>
            <div class="space-y-3">
              <div
                v-for="(balance, index) in report.balances_detail"
                :key="balance.bank_id"
                class="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200"
              >
                <div class="flex items-center space-x-3">
                  <span
                    class="w-6 h-6 flex items-center justify-center text-sm font-bold bg-blue-100 text-blue-700 rounded-full"
                    >{{ index + 1 }}</span
                  >
                  <span class="text-gray-700">{{ balance.bank_name }}</span>
                </div>
                <span class="font-semibold text-gray-900">
                  {{ formatCurrency(balance.saldo) }}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label for="keterangan" class="block text-sm font-medium text-gray-700 mb-2"
              >Keterangan</label
            >
            <textarea
              disabled
              :value="report.keterangan || 'Tidak ada keterangan.'"
              id="keterangan"
              name="keterangan"
              rows="4"
              class="block w-full rounded-md border border-gray-300 shadow-sm bg-gray-50 p-3 text-sm text-gray-700 resize-none"
            ></textarea>
          </div>
        </div>

        <div class="p-6 bg-gray-50 rounded-b-2xl border-t border-gray-200 text-right">
          <button
            @click="emit('close')"
            class="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
