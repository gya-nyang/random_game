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
</script>

<template>
  <main class="setup-area">
    <div v-if="!isSecure" class="glass-panel" style="border-color: #fb7185; background: rgba(251, 113, 133, 0.05); margin-bottom: 12px; padding: 12px 16px;">
      <p style="font-size: 0.8rem; color: #fecdd3; line-height: 1.45;">
        ⚠️ <strong>HTTP 접속 알림</strong>: 모바일 브라우저의 보안 정책으로 인해 HTTP 접속 환경에서는 흔들기 센서 기능이 차단될 수 있습니다. 센서 작동을 위해서는 <strong>HTTPS</strong> 또는 로컬 <strong>localhost</strong>를 통해 연결해 주시기 바랍니다.
      </p>
    </div>

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
  </main>
</template>
