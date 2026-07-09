<script setup>
const props = defineProps({
  isSecure: {
    type: Boolean,
    required: true
  },
  hasMotionEvent: {
    type: Boolean,
    required: true
  },
  hasSensorPermission: {
    type: [Boolean, null],
    required: true
  },
  isCooldown: {
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
  }
})

const emit = defineEmits(['update:shakeThreshold'])

const onThresholdInput = (event) => {
  emit('update:shakeThreshold', Number(event.target.value))
}
</script>

<template>
  <div class="debug-panel">
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
        :value="shakeThreshold" 
        @input="onThresholdInput"
        type="range" 
        min="300" 
        max="2500" 
        step="50" 
        class="sensitivity-slider"
      />
    </div>
  </div>
</template>
