// src/composables/useSweetAlert.js
import Swal from 'sweetalert2'

export function useSweetAlert() {
  const showAlert = (title, text, icon = 'success') => {
    return Swal.fire({
      title: title,
      text: text,
      icon: icon,
      confirmButtonText: 'OK',
    })
  }

  const showConfirm = (title, text, icon = 'warning', confirmButtonText = 'Ya, Hapus!') => {
    return Swal.fire({
      title: title,
      text: text,
      icon: icon,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: confirmButtonText,
      cancelButtonText: 'Batal',
    })
  }

  return {
    showAlert,
    showConfirm,
  }
}
