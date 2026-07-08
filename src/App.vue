<script setup>
import { ref, nextTick, onUnmounted } from 'vue'

// 1. App State
const gameState = ref('setup') // 'setup' | 'play'
const items = ref(['당첨 🎉', '꽝 😢', '꽝 😢', '커피 쏘기 ☕'])
const cards = ref([])
const shuffling = ref(false)
const isCooldown = ref(false)
const itemInputs = ref([])

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
const shakeThreshold = ref(950) // Increased default (less sensitive)
const showDebug = ref(false)

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

// 5. Audio Sound Effects Generator (Web Audio API)
let audioCtx = null

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
}

const playSound = (type) => {
  try {
    initAudio()
    if (!audioCtx) return

    if (type === 'shuffle') {
      const bufferSize = audioCtx.sampleRate * 0.4
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
      const noise = audioCtx.createBufferSource()
      noise.buffer = buffer

      const filter = audioCtx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(1000, audioCtx.currentTime)
      filter.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.4)

      const gain = audioCtx.createGain()
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(audioCtx.destination)
      noise.start()
    } else if (type === 'flip') {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15)
      
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25)
      
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.25)
    } else if (type === 'shake') {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(200, audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.35, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.08)
    }
  } catch (e) {
    console.warn('Web Audio API error:', e)
  }
}

// 6. Setup Page Controls
const addItem = () => {
  if (items.value.length >= 16) {
    alert('제비는 최대 16개까지 생성할 수 있습니다.')
    return
  }
  items.value.push('')
  playSound('shake')
  
  nextTick(() => {
    const inputs = itemInputs.value.filter(el => el !== null)
    const lastInput = inputs[inputs.length - 1]
    if (lastInput) lastInput.focus()
  })
}

const removeLastItem = () => {
  if (items.value.length <= 2) {
    alert('최소 2개의 제비가 필요합니다.')
    return
  }
  items.value.pop()
  playSound('shake')
}

const deleteItemAt = (index) => {
  if (items.value.length <= 2) {
    alert('최소 2개의 제비가 필요합니다.')
    return
  }
  items.value.splice(index, 1)
  playSound('shake')
}

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

// 8. Shuffling Action with Cooldown Lock
const triggerShuffle = () => {
  if (shuffling.value || isCooldown.value) return
  
  shuffling.value = true
  isCooldown.value = true
  
  playSound('shake')
  if (navigator.vibrate) navigator.vibrate(80)
  
  // Fold all notes face down
  cards.value = cards.value.map(card => ({ ...card, revealed: false }))
  
  // Shuffling animation finishes in 800ms
  setTimeout(() => {
    const values = cards.value.map(c => c.value)
    const shuffledValues = shuffleArray(values)
    
    cards.value = cards.value.map((card, idx) => ({
      ...card,
      value: shuffledValues[idx]
    }))
    
    generateRandomPositions()
    shuffling.value = false
    playSound('shuffle')
  }, 800)

  // Hold sensor block for 1.8 seconds total to prevent continuous accidental triggers
  if (cooldownTimer) clearTimeout(cooldownTimer)
  cooldownTimer = setTimeout(() => {
    isCooldown.value = false
  }, 1800)
}

// 9. Motion Sensor Events
const handleMotion = (event) => {
  // Lock events immediately during shuffle or cooldown to save calculation cost
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
  <main v-if="gameState === 'setup'" class="setup-area">
    <div v-if="!isSecure" class="glass-panel" style="border-color: #fb7185; background: rgba(251, 113, 133, 0.05); margin-bottom: 12px; padding: 12px 16px;">
      <p style="font-size: 0.8rem; color: #fecdd3; line-height: 1.45;">
        ⚠️ <strong>HTTP 접속 알림</strong>: 모바일 브라우저의 보안 정책으로 인해 HTTP 접속 환경에서는 흔들기 센서 기능이 차단될 수 있습니다. 센서 작동을 위해서는 <strong>HTTPS</strong> 또는 로컬 <strong>localhost</strong>를 통해 연결해 주시기 바랍니다.
      </p>
    </div>

    <div class="glass-panel">
      <div class="setup-controls">
        <span class="item-count">제비 개수: {{ items.length }}개</span>
        <div class="count-adjusters">
          <!-- Minus -->
          <button 
            type="button" 
            class="btn-adjust" 
            :disabled="items.length <= 2" 
            @click="removeLastItem"
            title="제비 제거"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <!-- Plus -->
          <button 
            type="button" 
            class="btn-adjust" 
            :disabled="items.length >= 16" 
            @click="addItem"
            title="제비 추가"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
      </div>

      <!-- Items List -->
      <div class="items-list">
        <TransitionGroup name="list">
          <div 
            v-for="(item, idx) in items" 
            :key="idx" 
            class="item-row"
          >
            <div class="item-badge">{{ idx + 1 }}</div>
            <input 
              :ref="el => { if (el) itemInputs[idx] = el }"
              v-model="items[idx]"
              type="text" 
              class="item-input" 
              :placeholder="`제비 ${idx + 1} 내용을 입력하세요`"
              maxlength="20"
            />
            <button 
              type="button" 
              class="btn-delete-row" 
              @click="deleteItemAt(idx)"
              title="이 항목 삭제"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        </TransitionGroup>
      </div>

      <!-- Start Action -->
      <button 
        type="button" 
        class="btn-primary-action" 
        @click="startGame"
      >
        <span>게임 시작하기 🚀</span>
      </button>
    </div>
  </main>

  <!-- PLAY SCREEN -->
  <main v-else class="game-area">
    <!-- Status & Guidance Panel -->
    <div class="status-card">
      <p class="status-text">
        <span class="status-highlight">접힌 쪽지</span>를 터치하여 열어보세요!
      </p>
      
      <!-- Sensor Status Banner -->
      <div 
        class="sensor-indicator" 
        :class="{ inactive: hasSensorPermission === false, cooldown: isCooldown }"
      >
        <span class="sensor-dot" :class="{ pulse: !isCooldown && hasSensorPermission === true }"></span>
        <span v-if="hasSensorPermission === true">
          <span v-if="isCooldown">⏳ 셔플 완료! 정렬 대기 중...</span>
          <span v-else><span class="shaking-phone-icon">📱</span> 흔들면 제비가 섞입니다</span>
        </span>
        <span v-else>
          ⚠️ 흔들기 센서 비활성 (우측 섞기 버튼 사용)
        </span>
      </div>

      <!-- Sensor Details Debug Toggle -->
      <div>
        <button 
          type="button" 
          class="btn-debug-toggle" 
          @click="showDebug = !showDebug"
        >
          {{ showDebug ? '상세 센서 진단 닫기' : '상세 센서 진단 보기' }}
        </button>
      </div>

      <!-- Real-time Diagnostic Panel -->
      <div v-if="showDebug" class="debug-panel">
        <div class="debug-row">
          <span class="debug-label">안전 보안 연결 (HTTPS/localhost):</span>
          <span class="debug-val" :class="isSecure ? 'success' : 'danger'">
            {{ isSecure ? 'Yes' : 'No (센서 차단 위험)' }}
          </span>
        </div>
        <div class="debug-row">
          <span class="debug-label">브라우저 가속도 센서 지원:</span>
          <span class="debug-val" :class="hasMotionEvent ? 'success' : 'danger'">
            {{ hasMotionEvent ? 'Yes' : 'No' }}
          </span>
        </div>
        <div class="debug-row">
          <span class="debug-label">센서 권한 획득 상태:</span>
          <span class="debug-val" :class="hasSensorPermission ? 'success' : 'danger'">
            {{ hasSensorPermission === true ? '허용됨' : (hasSensorPermission === false ? '거부/오류' : '확인중') }}
          </span>
        </div>
        <div class="debug-row">
          <span class="debug-label">셔플 잠금 상태 (쿨다운):</span>
          <span class="debug-val" :class="isCooldown ? 'danger' : 'success'">
            {{ isCooldown ? '대기 중 (차단)' : '흔들기 가능 (대기)' }}
          </span>
        </div>
        <div class="debug-row">
          <span class="debug-label">실시간 수신된 센서 패킷:</span>
          <span class="debug-val">{{ eventCount }}회 수신</span>
        </div>
        <div class="debug-row">
          <span class="debug-label">실시간 흔들기 강도 (가속도 속도):</span>
          <span class="debug-val" :class="currentSpeed > shakeThreshold ? 'success' : ''">
            {{ currentSpeed }} / 임계값 {{ shakeThreshold }}
          </span>
        </div>
        <!-- Sensitivity Slider -->
        <div class="slider-container">
          <div class="slider-label">
            <span>흔들기 감지 감도 조절:</span>
            <span>{{ shakeThreshold }} (높을수록 무덤덤함)</span>
          </div>
          <input 
            v-model.number="shakeThreshold" 
            type="range" 
            min="300" 
            max="2500" 
            step="50" 
            class="sensitivity-slider"
          />
        </div>
      </div>
    </div>

    <!-- TABLETOP CANVAS CONTAINER (Scatter layout) -->
    <div class="scatter-container">
      <div 
        v-for="(card, idx) in cards" 
        :key="card.id" 
        class="folded-paper-wrapper"
        :style="{ 
          left: card.x + '%', 
          top: card.y + '%', 
          transform: `rotate(${card.r}deg)`,
          zIndex: card.zIndex
        }"
        @click="toggleCard(idx)"
      >
        <!-- Shaker overlay -->
        <div 
          class="folded-paper-shaker" 
          :class="{ 'shaking-active': shuffling }"
          :style="{ animationDelay: (idx * 0.04) + 's' }"
        >
          <!-- 3D Card flip -->
          <div class="paper-inner" :class="{ flipped: card.revealed }">
            <!-- Front: Folded paper style -->
            <div 
              class="paper-front" 
              :style="{ 
                '--color-base': card.color.base, 
                '--color-dark': card.color.dark 
              }"
            >
              <span class="paper-fold-icon">✉️</span>
              <span class="paper-label">제비 {{ idx + 1 }}</span>
            </div>

            <!-- Back: Unfolded paper -->
            <div 
              class="paper-back"
              :class="{ 'revealed-win': card.value.includes('당첨') || card.value.includes('🎉') || card.value.includes('1등') }"
            >
              <span class="paper-back-value">{{ card.value }}</span>
              <span class="paper-back-index">#{{ idx + 1 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action buttons row -->
    <div class="action-row">
      <button 
        type="button" 
        class="btn-secondary-action" 
        @click="exitGame"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        <span>제비 편집</span>
      </button>
      
      <button 
        type="button" 
        class="btn-secondary-action" 
        @click="triggerShuffle"
        :disabled="shuffling || isCooldown"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        <span>다시 섞기</span>
      </button>
    </div>
  </main>
</template>
