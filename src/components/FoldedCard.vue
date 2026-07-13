<script setup>
import { computed } from 'vue'

const props = defineProps({
  card: {
    type: Object,
    required: true
  },
  idx: {
    type: Number,
    required: true
  },
  tremble: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

const isWin = computed(() => {
  const val = props.card.value
  return val.includes('당첨') || val.includes('🎉') || val.includes('1등')
})
</script>

<template>
  <div 
    class="folded-paper-wrapper"
    :style="{ 
      left: card.x + '%', 
      top: card.y + '%', 
      transform: `rotate(${card.r}deg)`,
      zIndex: card.zIndex
    }"
    @click="$emit('click')"
  >
    <div class="capsule-container" :class="{ 'is-opened': card.revealed, 'tremble': tremble }">
      <!-- 1. The Result Note (Inside capsule, rises up when opened) -->
      <div 
        class="capsule-paper"
        :class="{ 'revealed-win': isWin }"
      >
        <span class="capsule-paper-value">{{ card.value }}</span>
        <span class="capsule-paper-index">#{{ idx + 1 }}</span>
      </div>

      <!-- 2. Top Half (Transparent plastic with question mark) -->
      <div 
        class="capsule-half top-half"
        :style="{ '--color-base': card.color.base }"
      >
        <span class="capsule-question-mark">?</span>
      </div>

      <!-- 3. Bottom Half (Opaque colored plastic with index label) -->
      <div 
        class="capsule-half bottom-half"
        :style="{ 
          '--color-base': card.color.base,
          '--color-dark': card.color.dark
        }"
      >
        <span class="capsule-label">#{{ idx + 1 }}</span>
      </div>
    </div>
  </div>
</template>
