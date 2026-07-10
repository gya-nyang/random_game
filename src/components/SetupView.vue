<script setup>
import { ref, nextTick, computed } from 'vue'
import { playSound } from '../utils/audio.js'
import { useSpeechRecognition } from '../composables/useSpeechRecognition.js'
import { useGeminiAI } from '../composables/useGeminiAI.js'
import { useToast } from '../composables/useToast.js'

const props = defineProps({
  modelValue: {
    type: Array,
    required: true
  },
  isSecure: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'start'])

const itemInputs = ref([])
const aiPrompt = ref('')
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''

// Composables
const { toast, triggerToast } = useToast()
const { isListening, listeningTarget, toggleSpeech } = useSpeechRecognition()
const { isGeneratingAI, aiStatusMessage, aiStatusType, generateWithAI: apiGenerate } = useGeminiAI()

const localItems = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const addItem = () => {
  if (localItems.value.length >= 16) {
    alert('제비는 최대 16개까지 생성할 수 있습니다.')
    return
  }
  const updated = [...localItems.value, '']
  emit('update:modelValue', updated)
  playSound('shake')
  
  nextTick(() => {
    const inputs = itemInputs.value.filter(el => el !== null)
    const lastInput = inputs[inputs.length - 1]
    if (lastInput) lastInput.focus()
  })
}

const removeLastItem = () => {
  if (localItems.value.length <= 2) {
    alert('최소 2개의 제비가 필요합니다.')
    return
  }
  const updated = [...localItems.value]
  updated.pop()
  emit('update:modelValue', updated)
  playSound('shake')
}

const deleteItemAt = (index) => {
  if (localItems.value.length <= 2) {
    alert('최소 2개의 제비가 필요합니다.')
    return
  }
  const updated = [...localItems.value]
  updated.splice(index, 1)
  emit('update:modelValue', updated)
  playSound('shake')
}

const handleInput = (index, value) => {
  const updated = [...localItems.value]
  updated[index] = value
  emit('update:modelValue', updated)
}

const onStart = () => {
  emit('start')
}

// Speech recognition callback mapping
const handleSpeechResult = (target, transcript) => {
  if (target === 'prompt') {
    aiPrompt.value = transcript
  } else if (typeof target === 'number') {
    handleInput(target, transcript)
  }
}

const onToggleSpeech = (target) => {
  toggleSpeech(target, handleSpeechResult)
}

const generateWithAI = () => {
  apiGenerate(aiPrompt.value, apiKey, (generated) => {
    emit('update:modelValue', generated)
    aiPrompt.value = ''
  })
}
</script>

<template>
  <main class="setup-area">
    <div v-if="!isSecure" class="glass-panel" style="border-color: #fb7185; background: rgba(251, 113, 133, 0.05); margin-bottom: 12px; padding: 12px 16px;">
      <p style="font-size: 0.8rem; color: #fecdd3; line-height: 1.45;">
        ⚠️ <strong>HTTP 접속 알림</strong>: 모바일 브라우저의 보안 정책으로 인해 HTTP 접속 환경에서는 흔들기 센서 및 음성 인식 기능이 제한될 수 있습니다. <strong>HTTPS</strong> 또는 <strong>localhost</strong>를 통해 연결해 주시기 바랍니다.
      </p>
    </div>

    <!-- AI & Voice Helper Panel -->
    <div class="glass-panel ai-panel">
      <div class="ai-header">
        <div class="ai-title-wrap">
          <span class="ai-sparkle">🪄</span>
          <h3>AI 제비 자동 생성</h3>
        </div>
      </div>

      <div class="ai-input-wrapper">
        <textarea 
          v-model="aiPrompt" 
          class="ai-textarea" 
          placeholder="예: 당첨 1명, 꽝 3명 만들어줘 / 커피 1개, 통과 4개 / 오늘 저녁 메뉴 정하기 제비 5개"
          rows="2"
          maxlength="100"
        ></textarea>
        
        <div class="ai-actions">
          <button 
            type="button" 
            class="btn-ai-mic" 
            :class="{ listening: isListening && listeningTarget === 'prompt' }"
            @click="onToggleSpeech('prompt')"
            title="음성으로 입력하기"
          >
            <span class="mic-icon">🎙️</span>
            <span class="mic-text" v-if="isListening && listeningTarget === 'prompt'">듣는 중...</span>
          </button>

          <button 
            type="button" 
            class="btn-ai-generate" 
            :disabled="isGeneratingAI || !aiPrompt.trim()"
            @click="generateWithAI"
          >
            <span v-if="isGeneratingAI" class="loading-spinner">🌀</span>
            <span>{{ isGeneratingAI ? '생성 중...' : '제비 자동 생성 ✨' }}</span>
          </button>
        </div>
      </div>

      <div v-if="aiStatusMessage" class="ai-status-message" :class="aiStatusType">
        {{ aiStatusMessage }}
      </div>
    </div>

    <!-- Manual Inputs Panel -->
    <div class="glass-panel">
      <div class="setup-controls">
        <span class="item-count">제비 개수: {{ localItems.length }}개</span>
        <div class="count-adjusters">
          <!-- Minus -->
          <button 
            type="button" 
            class="btn-adjust" 
            :disabled="localItems.length <= 2" 
            @click="removeLastItem"
            title="제비 제거"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <!-- Plus -->
          <button 
            type="button" 
            class="btn-adjust" 
            :disabled="localItems.length >= 16" 
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
            v-for="(item, idx) in localItems" 
            :key="idx" 
            class="item-row"
          >
            <div class="item-badge">{{ idx + 1 }}</div>
            <input 
              :ref="el => { if (el) itemInputs[idx] = el }"
              :value="item"
              @input="handleInput(idx, $event.target.value)"
              type="text" 
              class="item-input" 
              :placeholder="`제비 ${idx + 1} 내용을 입력하세요`"
              maxlength="20"
            />
            <button 
              type="button" 
              class="btn-row-mic"
              :class="{ listening: isListening && listeningTarget === idx }"
              @click="onToggleSpeech(idx)"
              title="음성 입력"
            >
              🎙️
            </button>
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
        @click="onStart"
      >
        <span>게임 시작하기 🚀</span>
      </button>
    </div>

    <!-- Toast Notification -->
    <Transition name="toast-fade">
      <div v-if="toast.show" class="custom-toast" :class="toast.type">
        <div class="toast-icon">
          <span v-if="toast.type === 'error'">🚨</span>
          <span v-else-if="toast.type === 'warning'">⚠️</span>
          <span v-else-if="toast.type === 'success'">✅</span>
          <span v-else>ℹ️</span>
        </div>
        <div class="toast-content">
          <h4 class="toast-title">
            <template v-if="toast.type === 'error'">API 오류</template>
            <template v-else-if="toast.type === 'warning'">경고</template>
            <template v-else-if="toast.type === 'success'">성공</template>
            <template v-else>알림</template>
          </h4>
          <p class="toast-desc">{{ toast.message }}</p>
        </div>
        <button type="button" class="btn-toast-close" @click="toast.show = false">×</button>
      </div>
    </Transition>
  </main>
</template>
