<script setup>
import { ref, onUnmounted } from 'vue'
import { playSound, initAudio } from './utils/audio.js'
import SetupView from './components/SetupView.vue'
import PlayView from './components/PlayView.vue'

// 1. App State
const gameState = ref('setup') // 'setup' | 'play'
const items = ref(['당첨 🎉', '꽝 😢', '꽝 😢', '커피 쏘기 ☕'])
const cards = ref([])
const shuffling = ref(false)
const isCooldown = ref(false)

// 2. Shake & Sensor Detection State
const hasSensorPermission = ref(null)
const lastX = ref(0)
const lastY = ref(0)
const lastZ = ref(0)
const lastUpdate = ref(0)
let cooldownTimer = null

// 3. Sensor Debug State
const isSecure = ref(window.isSecureContext)
const hasMotionEvent = ref(typeof window.DeviceMotionEvent !== 'undefined')
const eventCount = ref(0)
const currentSpeed = ref(0)
const shakeThreshold = ref(1200)

// 4. Color Palettes (Folded Paper colors)
const colorPalettes = [
  { base: '#a78bfa', dark: '#7c3aed' }, // Purple
  { base: '#f472b6', dark: '#db2777' }, // Pink
  { base: '#60a5fa', dark: '#2563eb' }, // Blue
  { base: '#2dd4bf', dark: '#0d9488' }, // Teal
  { base: '#fbbf24', dark: '#d97706' }, // Yellow
  { base: '#fb923c', dark: '#ea580c' }, // Orange
  { base: '#4ade80', dark: '#16a34a' }, // Green
  { base: '#38bdf8', dark: '#0284c7' }  // Light Blue
]

const shuffleArray = (array) => {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// 7. Grid-Scatter Layout Generator
const generateRandomPositions = () => {
  const count = cards.value.length
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  
  const zoneWidth = 100 / cols
  const zoneHeight = 100 / rows
  
  let zones = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      zones.push({ r, c })
    }
  }
  zones = shuffleArray(zones)
  
  cards.value = cards.value.map((card, idx) => {
    const zone = zones[idx] || { r: 0, c: 0 }
    
    const baseLeft = zone.c * zoneWidth
    const baseTop = zone.r * zoneHeight
    
    const offsetLeft = Math.random() * (zoneWidth - 20)
    const offsetTop = Math.random() * (zoneHeight - 20)
    
    const finalLeft = Math.max(5, Math.min(80, baseLeft + Math.max(0, offsetLeft)))
    const finalTop = Math.max(5, Math.min(78, baseTop + Math.max(0, offsetTop)))
    const finalRotate = Math.floor(Math.random() * 70) - 35
    
    return {
      ...card,
      x: finalLeft,
      y: finalTop,
      r: finalRotate
    }
  })
}

// 8. Physics-based Bouncing Animation
const isPhysicsActive = ref(false)
let physicsFrameId = null
let lastSoundTime = 0

const playBounceSound = () => {
  const now = Date.now()
  if (now - lastSoundTime > 120) {
    playSound('shake')
    lastSoundTime = now
  }
}

const startPhysicsSimulation = () => {
  if (physicsFrameId) cancelAnimationFrame(physicsFrameId)

  // Initialize random velocities
  cards.value = cards.value.map(card => {
    const angle = Math.random() * Math.PI * 2
    const speed = 1.8 + Math.random() * 1.5 // Speed in % per frame
    return {
      ...card,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      x: card.x || (20 + Math.random() * 60),
      y: card.y || (20 + Math.random() * 60)
    }
  })

  isPhysicsActive.value = true
  const startTime = Date.now()
  const duration = 1000 // 1.0s of bouncing

  const updatePhysics = () => {
    const elapsed = Date.now() - startTime
    if (elapsed >= duration) {
      isPhysicsActive.value = false
      return
    }

    cards.value = cards.value.map(card => {
      let nextX = card.x + card.vx
      let nextY = card.y + card.vy
      let vx = card.vx
      let vy = card.vy

      const minX = 2
      const maxX = 80
      const minY = 2
      const maxY = 82
      const bounce = 0.9 // Elastic bounce factor

      // Wall X collision
      if (nextX < minX) {
        nextX = minX
        vx = -vx * bounce
        playBounceSound()
      } else if (nextX > maxX) {
        nextX = maxX
        vx = -vx * bounce
        playBounceSound()
      }

      // Wall Y collision
      if (nextY < minY) {
        nextY = minY
        vy = -vy * bounce
        playBounceSound()
      } else if (nextY > maxY) {
        nextY = maxY
        vy = -vy * bounce
        playBounceSound()
      }

      // Slow down slightly near the end
      if (elapsed > duration * 0.75) {
        vx *= 0.92
        vy *= 0.92
      }

      return {
        ...card,
        x: nextX,
        y: nextY,
        vx,
        vy
      }
    })

    physicsFrameId = requestAnimationFrame(updatePhysics)
  }

  physicsFrameId = requestAnimationFrame(updatePhysics)
}

// 8. Shuffling Action with Cooldown Lock
const triggerShuffle = () => {
  if (shuffling.value || isCooldown.value) return
  
  shuffling.value = true
  isCooldown.value = true
  
  if (navigator.vibrate) navigator.vibrate(80)
  
  // Fold all notes face down
  cards.value = cards.value.map(card => ({ ...card, revealed: false }))
  
  // Start physics bouncing simulation
  startPhysicsSimulation()
  
  // Shuffling finishes in 1000ms
  setTimeout(() => {
    const values = cards.value.map(c => c.value)
    const shuffledValues = shuffleArray(values)
    
    cards.value = cards.value.map((card, idx) => ({
      ...card,
      value: shuffledValues[idx]
    }))
    
    shuffling.value = false
    playSound('shuffle')
  }, 1000)

  // Hold sensor block for 1.5 seconds total
  if (cooldownTimer) clearTimeout(cooldownTimer)
  cooldownTimer = setTimeout(() => {
    isCooldown.value = false
  }, 1500)
}

// 9. Motion Sensor Events
const handleMotion = (event) => {
  if (gameState.value !== 'play' || shuffling.value || isCooldown.value) return
  eventCount.value++

  const acc = event.accelerationIncludingGravity || event.acceleration
  if (!acc) return

  const { x, y, z } = acc
  if (x === null || y === null || z === null) return

  const currentTime = Date.now()
  const diffTime = currentTime - lastUpdate.value

  // Check every 80ms to accumulate change correctly
  if (diffTime > 80) {
    if (lastUpdate.value !== 0) {
      const deltaX = Math.abs(x - lastX.value)
      const deltaY = Math.abs(y - lastY.value)
      const deltaZ = Math.abs(z - lastZ.value)
      
      const speed = (deltaX + deltaY + deltaZ) / diffTime * 10000
      currentSpeed.value = Math.round(speed)

      // Trigger shake when speed exceeds threshold
      if (speed > shakeThreshold.value) {
        triggerShuffle()
      }
    }

    lastUpdate.value = currentTime
    lastX.value = x
    lastY.value = y
    lastZ.value = z
  }
}

// 10. Sensor Permission request
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

// 11. Start Game Handler
const startGame = async () => {
  initAudio()
  if (physicsFrameId) cancelAnimationFrame(physicsFrameId)
  isPhysicsActive.value = false
  
  const cleanedItems = items.value.map((item, idx) => {
    const val = item.trim()
    return val === '' ? `제비 ${idx + 1}` : val
  })

  cards.value = cleanedItems.map((val, idx) => {
    const color = colorPalettes[idx % colorPalettes.length]
    return {
      id: idx,
      value: val,
      revealed: false,
      color: color,
      zIndex: 10,
      x: 0,
      y: 0,
      r: 0
    }
  })

  gameState.value = 'play'
  eventCount.value = 0
  currentSpeed.value = 0
  lastUpdate.value = 0
  isCooldown.value = false
  
  generateRandomPositions()
  await requestSensorPermission()
  triggerShuffle()
}

// 12. Stop Sensors
const stopShake = () => {
  window.removeEventListener('devicemotion', handleMotion)
  if (cooldownTimer) clearTimeout(cooldownTimer)
  lastX.value = 0
  lastY.value = 0
  lastZ.value = 0
  lastUpdate.value = 0
}

const exitGame = () => {
  stopShake()
  gameState.value = 'setup'
}

// 13. Card Toggle
const maxZIndex = ref(20)
const toggleCard = (index) => {
  if (shuffling.value) return
  
  const wasRevealed = cards.value[index].revealed
  cards.value[index].revealed = !wasRevealed
  
  maxZIndex.value += 1
  cards.value[index].zIndex = maxZIndex.value
  
  if (!wasRevealed) {
    playSound('flip')
  } else {
    playSound('shake')
  }
}

onUnmounted(() => {
  stopShake()
  if (physicsFrameId) cancelAnimationFrame(physicsFrameId)
})
</script>

<template>
  <!-- Header -->
  <header class="app-header">
    <div class="logo-glow">🎟️</div>
    <h1 class="app-title">흔들흔들 제비뽑기</h1>
    <p class="app-subtitle">접힌 쪽지를 흔들어서 섞어보세요!</p>
  </header>

  <!-- SETUP SCREEN -->
  <SetupView
    v-if="gameState === 'setup'"
    v-model="items"
    :is-secure="isSecure"
    @start="startGame"
  />

  <!-- PLAY SCREEN -->
  <PlayView
    v-else
    :cards="cards"
    :shuffling="shuffling"
    :is-cooldown="isCooldown"
    :is-physics-active="isPhysicsActive"
    :has-sensor-permission="hasSensorPermission"
    :is-secure="isSecure"
    :has-motion-event="hasMotionEvent"
    :event-count="eventCount"
    :current-speed="currentSpeed"
    v-model:shake-threshold="shakeThreshold"
    @toggle-card="toggleCard"
    @trigger-shuffle="triggerShuffle"
    @exit-game="exitGame"
  />
</template>
