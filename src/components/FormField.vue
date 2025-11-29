<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: String,
  type: {
    type: String,
    default: 'text', // Default type
  },
  modelValue: [String, Number, null], // Gunakan modelValue untuk v-model, tambahkan null
  options: Array, // Untuk type='select'
  placeholder: String,
  required: Boolean,
  disabled: Boolean,
  min: Number, // Untuk number input
  // Prop baru untuk mengaktifkan fitur mata uang
  isCurrency: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

// Fungsi untuk format mata uang (akan digunakan di dalam FormField)
const formatCurrencyInternal = (amount) => {
  // Jika nilai null/undefined/NaN, atau 0, kembalikan string kosong atau 'Rp 0'
  if (amount === null || amount === undefined || isNaN(amount) || amount === 0) {
    return '' // Mengembalikan string kosong untuk input yang belum diisi
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Fungsi untuk parse mata uang dari string (akan digunakan di dalam FormField)
const parseCurrencyInternal = (value) => {
  if (value === null || value === undefined || typeof value !== 'string' || value.trim() === '') {
    return 0 // Mengembalikan 0 jika string kosong atau tidak valid
  }
  // Hapus semua karakter non-digit kecuali tanda minus di awal
  const numericValue = value.replace(/[^0-9-]/g, '')

  // Pastikan hanya satu tanda minus di awal
  const sanitizedValue = numericValue.startsWith('-')
    ? '-' + numericValue.replace(/-/g, '').substring(1)
    : numericValue.replace(/-/g, '')

  const number = parseFloat(sanitizedValue)
  return isNaN(number) ? 0 : number
}

// Computed property untuk mengelola nilai input dengan v-model
const internalValue = computed({
  get() {
    // Jika ini adalah input mata uang, tampilkan nilai yang sudah terformat
    if (props.isCurrency) {
      return formatCurrencyInternal(props.modelValue)
    }
    // Untuk tipe input lainnya, kembalikan modelValue asli
    return props.modelValue
  },
  set(newValue) {
    // Jika ini adalah input mata uang, parse nilai sebelum di-emit
    if (props.isCurrency) {
      emit('update:modelValue', parseCurrencyInternal(newValue))
    } else if (props.type === 'number') {
      // Untuk number input biasa, pastikan nilainya angka
      emit('update:modelValue', parseFloat(newValue) || 0)
    } else {
      // Untuk tipe input lainnya, emit nilai asli
      emit('update:modelValue', newValue)
    }
  },
})

// Event handler untuk fokus pada input mata uang
const handleInputFocus = (event) => {
  if (props.isCurrency) {
    // Saat fokus, tampilkan nilai angka murni (tanpa format Rp)
    event.target.value = props.modelValue === 0 ? '' : String(props.modelValue)
  }
}

// Event handler untuk blur pada input mata uang
const handleInputBlur = (event) => {
  if (props.isCurrency) {
    // Saat blur, format kembali ke Rupiah
    event.target.value = formatCurrencyInternal(props.modelValue)
  }
}
</script>

<template>
  <div class="mb-4">
    <label v-if="label" class="block text-gray-700 text-sm font-bold mb-2">{{ label }}</label>

    <select
      v-if="type === 'select'"
      v-model="internalValue"
      :disabled="disabled"
      :required="required"
      class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
    >
      <option value="" disabled selected>{{ placeholder || 'Pilih...' }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <input
      v-else
      :type="isCurrency ? 'text' : type"
      v-model="internalValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :min="type === 'number' ? min : undefined"
      class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      @focus="handleInputFocus"
      @blur="handleInputBlur"
    />

    <p
      v-if="required && !modelValue && !isCurrency && type !== 'select'"
      class="text-red-500 text-xs italic mt-1"
    >
      {{ label }} wajib diisi.
    </p>
  </div>
</template>

<style scoped>
/* Tambahkan gaya khusus jika diperlukan, misal untuk disabled state yang lebih jelas */
input:disabled,
select:disabled {
  background-color: #e2e8f0; /* bg-gray-200 */
  cursor: not-allowed;
}
</style>
