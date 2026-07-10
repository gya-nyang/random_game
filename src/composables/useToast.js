import { ref } from 'vue'

const toast = ref({
  show: false,
  message: '',
  type: 'info' // 'info' | 'success' | 'error' | 'warning'
})

let toastTimeout = null

export function useToast() {
  const triggerToast = (message, type = 'info') => {
    if (toastTimeout) clearTimeout(toastTimeout)
    toast.value.message = message
    toast.value.type = type
    toast.value.show = true
    toastTimeout = setTimeout(() => {
      toast.value.show = false
    }, 4000)
  }

  const hideToast = () => {
    toast.value.show = false
  }

  return {
    toast,
    triggerToast,
    hideToast
  }
}
