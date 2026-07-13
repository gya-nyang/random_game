<script setup>
import { ref } from 'vue'
import FoldedCard from './FoldedCard.vue'
import DebugPanel from './DebugPanel.vue'

const props = defineProps({
  cards: {
    type: Array,
    required: true
  },
  shuffling: {
    type: Boolean,
    required: true
  },
  isCooldown: {
    type: Boolean,
    required: true
  },
  hasSensorPermission: {
    type: [Boolean, null],
    required: true
  },
  isSecure: {
    type: Boolean,
    required: true
  },
  hasMotionEvent: {
    type: Boolean,
    required: true
  },
  eventCount: {
    type: Number,
    required: true
  },
  currentSpeed: {
    type: Number,
    required: true
  },
  shakeThreshold: {
    type: Number,
    required: true
  },
  isPhysicsActive: {
    type: Boolean,
    required: true
  },
  isCurrentlyShaking: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggleCard', 'triggerShuffle', 'exitGame', 'update:shakeThreshold'])

const showDebug = ref(false)

const handleCardClick = (index) => {
  emit('toggleCard', index)
}

const handleTriggerShuffle = () => {
  emit('triggerShuffle')
}

const handleExitGame = () => {
  emit('exitGame')
}

const handleUpdateThreshold = (val) => {
  emit('update:shakeThreshold', val)
}
</script>

<template>
  <main class="game-area">
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
      <DebugPanel 
        v-if="showDebug"
        :is-secure="isSecure"
        :has-motion-event="hasMotionEvent"
        :has-sensor-permission="hasSensorPermission"
        :is-cooldown="isCooldown"
        :event-count="eventCount"
        :current-speed="currentSpeed"
        :shake-threshold="shakeThreshold"
        @update:shake-threshold="handleUpdateThreshold"
      />
    </div>

    <!-- TABLETOP CANVAS CONTAINER (Scatter layout) -->
    <div class="scatter-container">
      <FoldedCard 
        v-for="(card, idx) in cards"
        :key="card.id"
        :card="card"
        :idx="idx"
        :tremble="isCurrentlyShaking"
        :class="{ 'no-transition': isPhysicsActive }"
        @click="handleCardClick(idx)"
      />
    </div>

    <!-- Action buttons row -->
    <div class="action-row">
      <button 
        type="button" 
        class="btn-secondary-action" 
        @click="handleExitGame"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        <span>제비 편집</span>
      </button>
      
      <button 
        type="button" 
        class="btn-secondary-action" 
        @click="handleTriggerShuffle"
        :disabled="shuffling || isCooldown"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        <span>다시 섞기</span>
      </button>
    </div>
  </main>
</template>
