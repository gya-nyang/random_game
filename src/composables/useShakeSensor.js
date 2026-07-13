import { ref, onUnmounted } from 'vue'
import { playSound } from '../utils/audio.js'

export function useShakeSensor(onShakeCallback) {
  const hasSensorPermission = ref(null)
  const isSecure = ref(window.isSecureContext)
  const hasMotionEvent = ref(typeof window.DeviceMotionEvent !== 'undefined')
  const eventCount = ref(0)
  const currentSpeed = ref(0)
  const shakeThreshold = ref(2400)
  const isCurrentlyShaking = ref(false)
  let stopTimeout = null
  let lastRattleTime = 0

  const lastX = ref(0)
  const lastY = ref(0)
  const lastZ = ref(0)
  const lastUpdate = ref(0)

  const handleMotion = (event) => {
    eventCount.value++
    const acc = event.accelerationIncludingGravity || event.acceleration
    if (!acc) return

    const { x, y, z } = acc
    if (x === null || y === null || z === null) return

    const currentTime = Date.now()
    const diffTime = currentTime - lastUpdate.value

    if (diffTime > 80) {
      if (lastUpdate.value !== 0) {
        const deltaX = Math.abs(x - lastX.value)
        const deltaY = Math.abs(y - lastY.value)
        const deltaZ = Math.abs(z - lastZ.value)
        
        const speed = (deltaX + deltaY + deltaZ) / diffTime * 10000
        currentSpeed.value = Math.round(speed)

        if (speed > shakeThreshold.value) {
          if (!isCurrentlyShaking.value) {
            isCurrentlyShaking.value = true
          }
          if (stopTimeout) clearTimeout(stopTimeout)

          const now = Date.now()
          if (now - lastRattleTime > 150) {
            playSound('shake')
            lastRattleTime = now
          }

          stopTimeout = setTimeout(() => {
            isCurrentlyShaking.value = false
            onShakeCallback()
          }, 150)
        }
      }

      lastUpdate.value = currentTime
      lastX.value = x
      lastY.value = y
      lastZ.value = z
    }
  }

  const requestSensorPermission = async () => {
    isSecure.value = window.isSecureContext
    hasMotionEvent.value = typeof window.DeviceMotionEvent !== 'undefined'

    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function'
    ) {
      try {
        const permissionState = await DeviceMotionEvent.requestPermission()
        if (permissionState === 'granted') {
          window.addEventListener('devicemotion', handleMotion)
          hasSensorPermission.value = true
        } else {
          hasSensorPermission.value = false
        }
      } catch (e) {
        console.error('Sensor Permission request error:', e)
        hasSensorPermission.value = false
      }
    } else if (typeof DeviceMotionEvent !== 'undefined') {
      window.addEventListener('devicemotion', handleMotion)
      hasSensorPermission.value = true
    } else {
      hasSensorPermission.value = false
    }
  }

  const stopShake = () => {
    window.removeEventListener('devicemotion', handleMotion)
    if (stopTimeout) {
      clearTimeout(stopTimeout)
      stopTimeout = null
    }
    isCurrentlyShaking.value = false
    lastX.value = 0
    lastY.value = 0
    lastZ.value = 0
    lastUpdate.value = 0
  }

  onUnmounted(() => {
    stopShake()
  })

  return {
    hasSensorPermission,
    isSecure,
    hasMotionEvent,
    eventCount,
    currentSpeed,
    shakeThreshold,
    isCurrentlyShaking,
    requestSensorPermission,
    stopShake
  }
}
