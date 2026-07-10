<script setup>
import { ref, nextTick, computed } from 'vue'
import { playSound } from '../utils/audio.js'

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

// ==========================================
// 🎙️ Speech Recognition & 🪄 Gemini AI State
// ==========================================
const aiPrompt = ref('')
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''
const isGeneratingAI = ref(false)
const aiStatusMessage = ref('')
const aiStatusType = ref('') // 'success' | 'error' | 'info'

// Toast State
const toast = ref({
  show: false,
  message: '',
  type: 'info' // 'info' | 'success' | 'error' | 'warning'
})

let toastTimeout = null
const triggerToast = (message, type = 'info') => {
  if (toastTimeout) clearTimeout(toastTimeout)
  toast.value.message = message
  toast.value.type = type
  toast.value.show = true
  toastTimeout = setTimeout(() => {
    toast.value.show = false
  }, 4000)
}


const isListening = ref(false)
const listeningTarget = ref(null) // 'prompt' | number (row index)
let recognition = null

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
if (SpeechRecognition) {
  recognition = new SpeechRecognition()
  recognition.continuous = false
  recognition.lang = 'ko-KR'
  recognition.interimResults = false
  
  recognition.onstart = () => {
    isListening.value = true
    playSound('shake')
  }
  
  recognition.onend = () => {
    isListening.value = false
    listeningTarget.value = null
  }
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript
    if (listeningTarget.value === 'prompt') {
      aiPrompt.value = transcript
    } else if (typeof listeningTarget.value === 'number') {
      handleInput(listeningTarget.value, transcript)
    }
    playSound('flip')
  }
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error)
    isListening.value = false
    listeningTarget.value = null
    alert(`음성 인식 오류: ${event.error}`)
  }
}

const toggleSpeech = (target) => {
  if (!SpeechRecognition) {
    alert('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Safari 브라우저를 사용해 주세요.')
    return
  }
  
  if (isListening.value) {
    recognition.stop()
    if (listeningTarget.value === target) {
      return
    }
  }
  
  listeningTarget.value = target
  try {
    recognition.start()
  } catch (err) {
    console.error('Speech recognition start failed:', err)
  }
}

// Local Parse Fallback (Heuristic Analyzer)
const parseHeuristically = (prompt) => {
  const parts = prompt.split(/[,+]/)
  const result = []
  
  for (let part of parts) {
    part = part.trim()
    if (!part) continue
    
    const matchNumber = part.match(/\d+/)
    if (matchNumber) {
      const count = parseInt(matchNumber[0], 10)
      let name = part.replace(/\d+/, '').replace(/[명개번등]/g, '').trim()
      if (!name) name = '제비'
      
      name = name.replace(/(만들어줘|생성|제비)/g, '').trim()
      
      const emojiMap = {
        '당첨': '🎉',
        '꽝': '😢',
        '커피': '☕',
        '통과': '🟢',
        '벌칙': '😈',
        '맥주': '🍺',
        '치킨': '🍗',
        '피자': '🍕',
        '식사': '🍚',
        '선물': '🎁',
        '돈': '💵',
        '스타벅스': '☕'
      }
      
      let emojiAdded = name
      for (const [key, val] of Object.entries(emojiMap)) {
        if (name.includes(key) && !name.includes(val)) {
          emojiAdded = `${name} ${val}`
          break
        }
      }
      
      for (let i = 0; i < count; i++) {
        result.push(emojiAdded)
      }
    }
  }
  
  if (result.length < 2) {
    const words = prompt.split(/[\s,]+/).map(w => w.trim()).filter(w => w.length > 0)
    if (words.length >= 2) {
      return words.map(word => {
        const emojiMap = {
          '당첨': '🎉',
          '꽝': '😢',
          '커피': '☕',
          '통과': '🟢',
          '벌칙': '😈'
        }
        let emojiAdded = word
        for (const [key, val] of Object.entries(emojiMap)) {
          if (word.includes(key) && !word.includes(val)) {
            emojiAdded = `${word} ${val}`
            break
          }
        }
        return emojiAdded
      })
    }
  }
  
  return result
}

const generateWithAI = async () => {
  if (!aiPrompt.value.trim()) return
  
  isGeneratingAI.value = true
  aiStatusMessage.value = '제비를 생성하는 중입니다...'
  aiStatusType.value = 'info'
  
  const key = apiKey.trim()
  
  if (!key) {
    // Local Fallback Heuristic
    setTimeout(() => {
      try {
        const generated = parseHeuristically(aiPrompt.value)
        if (generated.length < 2) {
          throw new Error('의미 있는 제비 항목을 추출하지 못했습니다. 형식을 맞춰 다시 입력해주세요. (예: 당첨 1, 꽝 3)')
        }
        
        const limited = generated.slice(0, 16)
        emit('update:modelValue', limited)
        playSound('shuffle')
        
        aiStatusMessage.value = `로컬 분석기로 ${limited.length}개의 제비를 생성했습니다! (환경변수에 API 키를 설정하면 Gemini AI 생성이 가능합니다)`
        aiStatusType.value = 'success'
        aiPrompt.value = ''
      } catch (e) {
        aiStatusMessage.value = e.message
        aiStatusType.value = 'error'
        triggerToast(e.message, 'error')
      } finally {
        isGeneratingAI.value = false
      }
    }, 800)
    return
  }
  
  // Gemini API call
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `사용자의 요청: "${aiPrompt.value}"
이 요청을 바탕으로 제비뽑기 게임에 사용할 제비 목록을 한국어로 생성해주세요.
제비 개수는 최소 2개, 최대 16개여야 합니다.
결과는 추가 설명 없이 오직 JSON string array 형식으로만 반환해 주세요. 마크다운(\`\`\`) 형식도 붙이지 말고 순수 배열 텍스트로만 반환해주세요.
이모지를 적절하게 추가하여 예쁘게 만들어 주세요.
예시 반환 형태: ["당첨 🎉", "꽝 😢", "꽝 😢", "커피 쏘기 ☕"]`
          }]
        }]
      })
    })
    
    if (!response.ok) {
      if (response.status === 429) {
        triggerToast('⚠️ Gemini API 무료 등급 호출 한도(Rate Limit)를 초과했습니다. 잠시 후 다시 시도해 주세요.', 'error')
        throw new Error('API 호출 한도 초과')
      }
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.error?.message || `API 요청 실패 (상태 코드: ${response.status})`)
    }
    
    const data = await response.json()
    const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!contentText) {
      throw new Error('API 응답에 텍스트 데이터가 없습니다.')
    }
    
    const cleanedText = contentText.replace(/```json/g, '').replace(/```/g, '').trim()
    const generated = JSON.parse(cleanedText)
    
    if (!Array.isArray(generated) || generated.length < 2) {
      throw new Error('배열 형식을 분석할 수 없습니다.')
    }
    
    const limited = generated.slice(0, 16).map(item => String(item).slice(0, 20))
    emit('update:modelValue', limited)
    playSound('shuffle')
    
    aiStatusMessage.value = `Gemini AI가 ${limited.length}개의 제비를 생성했습니다! 🪄`
    aiStatusType.value = 'success'
    aiPrompt.value = ''
  } catch (e) {
    console.error('Gemini error:', e)
    if (e.message !== 'API 호출 한도 초과') {
      triggerToast(`❌ Gemini 호출 실패: ${e.message}`, 'error')
    }
    aiStatusMessage.value = `Gemini 호출 실패: ${e.message}. 로컬 패턴 분석기로 시도합니다.`
    aiStatusType.value = 'error'
    
    setTimeout(() => {
      try {
        const generated = parseHeuristically(aiPrompt.value)
        if (generated.length < 2) {
          throw new Error('로컬 분석기로도 제비를 파싱하지 못했습니다.')
        }
        const limited = generated.slice(0, 16)
        emit('update:modelValue', limited)
        playSound('shuffle')
        aiStatusMessage.value = `로컬 파서가 대신 ${limited.length}개의 제비를 생성했습니다.`
        aiStatusType.value = 'success'
        aiPrompt.value = ''
      } catch (err) {
        aiStatusMessage.value = `오류: ${err.message}`
        aiStatusType.value = 'error'
        triggerToast(`❌ 오류: ${err.message}`, 'error')
      }
    }, 1500)
  } finally {
    isGeneratingAI.value = false
  }
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
            @click="toggleSpeech('prompt')"
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
              @click="toggleSpeech(idx)"
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
