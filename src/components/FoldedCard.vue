<script setup>
defineProps({
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
    <!-- Shaker overlay -->
    <div class="folded-paper-shaker">
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
</template>
