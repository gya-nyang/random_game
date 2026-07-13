<script setup>
import { ref, onUnmounted, watch } from 'vue'
import { playSound, initAudio } from './utils/audio.js'
import SetupView from './components/SetupView.vue'
import PlayView from './components/PlayView.vue'
import { useShakeSensor } from './composables/useShakeSensor.js'
import { usePhysicsSimulation } from './composables/usePhysicsSimulation.js'

// 1. App State
const gameState = ref('setup') // 'setup' | 'play'
const items = ref(['당첨 🎉', '꽝 😢', '꽝 😢', '커피 쏘기 ☕'])
const cards = ref([])
const shuffling = ref(false)
const isCooldown = ref(false)
let cooldownTimer = null

// 2. Composables
const activeShakingState = ref(false)

const { 
  isPhysicsActive, 
  startPhysicsSimulation, 
  stopPhysics 
} = usePhysicsSimulation(cards, activeShakingState)

const triggerShuffle = () => {
  if (shuffling.value || isCooldown.value) return
  
  shuffling.value = true
  if (navigator.vibrate) navigator.vibrate(80)
  
  // Fold all notes face down
  cards.value = cards.value.map(card => ({ ...card, revealed: false }))
  
  // Start physics simulation
  startPhysicsSimulation()
}

const {
  hasSensorPermission,
  isSecure,
  hasMotionEvent,
  eventCount,
  currentSpeed,
  shakeThreshold,
  isCurrentlyShaking,
  requestSensorPermission,
  stopShake
} = useShakeSensor(triggerShuffle)

// Watch shake sensor active state
watch(isCurrentlyShaking, (shaking) => {
  activeShakingState.value = shaking
  if (shaking) {
    if (shuffling.value || isCooldown.value) return
    shuffling.value = true
    if (navigator.vibrate) navigator.vibrate(80)
    cards.value = cards.value.map(card => ({ ...card, revealed: false }))
    startPhysicsSimulation()
  }
})

// Watch physics active state to handle shuffle completion
watch(isPhysicsActive, (active) => {
  if (!active && shuffling.value) {
    shuffling.value = false
    playSound('shuffle')
    isCooldown.value = true
    if (cooldownTimer) clearTimeout(cooldownTimer)
    cooldownTimer = setTimeout(() => {
      isCooldown.value = false
    }, 800)
  }
})

// 3. Color Palettes (Folded Paper colors)
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

// Grid-Scatter Layout Generator
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

// Start Game Handler
const startGame = async () => {
  initAudio()
  stopPhysics()
  
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
  
  generateRandomPositions()
  await requestSensorPermission()
  triggerShuffle()
}

const exitGame = () => {
  stopShake()
  gameState.value = 'setup'
}

// Card Toggle
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
  stopPhysics()
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
    :is-currently-shaking="isCurrentlyShaking"
    v-model:shake-threshold="shakeThreshold"
    @toggle-card="toggleCard"
    @trigger-shuffle="triggerShuffle"
    @exit-game="exitGame"
  />
</template>
