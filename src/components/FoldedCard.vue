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
    <div class="unfold-paper" :class="{ 'is-revealed': card.revealed }">
      <!-- 1. The Main Message Body (revealed underneath) -->
      <div 
        class="paper-body"
        :class="{ 'revealed-win': isWin }"
      >
        <span class="paper-back-value">{{ card.value }}</span>
        <span class="paper-back-index">#{{ idx + 1 }}</span>
      </div>

      <!-- 2. The Flaps (Folding paper folds) -->
      <!-- Top Flap (flips UPwards) -->
      <div 
        class="paper-flap top-flap"
        :style="{ 
          '--color-base': card.color.base, 
          '--color-dark': card.color.dark 
        }"
      >
        <div class="flap-face flap-front">
          <span class="paper-fold-icon">✉️</span>
        </div>
        <div class="flap-face flap-back"></div>
      </div>

      <!-- Bottom Flap (flips DOWNwards) -->
      <div 
        class="paper-flap bottom-flap"
        :style="{ 
          '--color-base': card.color.base, 
          '--color-dark': card.color.dark 
        }"
      >
        <div class="flap-face flap-front"></div>
        <div class="flap-face flap-back"></div>
      </div>

      <!-- 3. Sticker Seal & Label (Overlays in the center, disappears when clicked) -->
      <div 
        class="paper-seal"
        :style="{ '--color-dark': card.color.dark }"
      >
        ★
      </div>
      <div class="paper-label">
        제비 {{ idx + 1 }}
      </div>
    </div>
  </div>
</template>
