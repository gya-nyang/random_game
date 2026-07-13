import { ref, onUnmounted } from 'vue'
import { playSound } from '../utils/audio.js'

export function usePhysicsSimulation(cardsRef, isCurrentlyShakingRef = ref(false)) {
  const isPhysicsActive = ref(false)
  let physicsFrameId = null
  let lastSoundTime = 0

  const playBounceSound = () => {
    const now = Date.now()
    if (now - lastSoundTime > 120) {
      playSound('shake')
      lastSoundTime = now
    }
  }

  const startPhysicsSimulation = () => {
    if (physicsFrameId) cancelAnimationFrame(physicsFrameId)

    // Initialize random velocities
    cardsRef.value = cardsRef.value.map(card => {
      const angle = Math.random() * Math.PI * 2
      const speed = (1.8 + Math.random() * 1.5) * 2
      return {
        ...card,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        x: card.x || (20 + Math.random() * 60),
        y: card.y || (20 + Math.random() * 60)
      }
    })

    isPhysicsActive.value = true
    let isDecelerating = false
    let decelerationStartTime = 0
    const decelerationDuration = 600

    const updatePhysics = () => {
      const activeShaking = isCurrentlyShakingRef.value
      const localCards = cardsRef.value.map(c => ({ ...c }))
      const minDist = 18 // Capsule diameter

      if (activeShaking) {
        isDecelerating = false
        // Inject energy to cards that slow down while shaking
        localCards.forEach(card => {
          const speed = Math.sqrt(card.vx * card.vx + card.vy * card.vy)
          if (speed < 3.0) {
            const angle = Math.random() * Math.PI * 2
            const push = (1.8 + Math.random() * 1.5) * 2
            card.vx = Math.cos(angle) * push
            card.vy = Math.sin(angle) * push
          }
        })
      } else {
        if (!isDecelerating) {
          isDecelerating = true
          decelerationStartTime = Date.now()
        }

        const elapsed = Date.now() - decelerationStartTime
        if (elapsed >= decelerationDuration) {
          isPhysicsActive.value = false
          return
        }

        // Apply slowdown near the end of deceleration
        if (elapsed > decelerationDuration * 0.4) {
          localCards.forEach(card => {
            card.vx *= 0.88
            card.vy *= 0.88
          })
        }
      }

      // 1. Move
      localCards.forEach(card => {
        card.x += card.vx
        card.y += card.vy
      })

      // 2. Resolve Collisions
      for (let i = 0; i < localCards.length; i++) {
        for (let j = i + 1; j < localCards.length; j++) {
          const c1 = localCards[i]
          const c2 = localCards[j]

          let dx = c2.x - c1.x
          let dy = c2.y - c1.y
          let dist = Math.sqrt(dx * dx + dy * dy)

          if (dist === 0) {
            c2.x += 0.1
            c2.y += 0.1
            dx = c2.x - c1.x
            dy = c2.y - c1.y
            dist = Math.sqrt(dx * dx + dy * dy)
          }

          if (dist < minDist) {
            const nx = dx / dist
            const ny = dy / dist
            const overlap = minDist - dist

            c1.x -= nx * overlap * 0.5
            c1.y -= ny * overlap * 0.5
            c2.x += nx * overlap * 0.5
            c2.y += ny * overlap * 0.5

            const rvx = c2.vx - c1.vx
            const rvy = c2.vy - c1.vy
            const velAlongNormal = rvx * nx + rvy * ny

            if (velAlongNormal < 0) {
              const restitution = 0.85
              const impulse = -(1 + restitution) * velAlongNormal / 2

              c1.vx -= impulse * nx
              c1.vy -= impulse * ny
              c2.vx += impulse * nx
              c2.vy += impulse * ny

              playBounceSound()
            }
          }
        }
      }

      // 3. Resolve Wall Collisions
      localCards.forEach(card => {
        const minX = 2
        const maxX = 80
        const minY = 2
        const maxY = 82
        const bounce = 0.9

        if (card.x < minX) {
          card.x = minX
          card.vx = -card.vx * bounce
          playBounceSound()
        } else if (card.x > maxX) {
          card.x = maxX
          card.vx = -card.vx * bounce
          playBounceSound()
        }

        if (card.y < minY) {
          card.y = minY
          card.vy = -card.vy * bounce
          playBounceSound()
        } else if (card.y > maxY) {
          card.y = maxY
          card.vy = -card.vy * bounce
          playBounceSound()
        }
      })

      cardsRef.value = localCards
      physicsFrameId = requestAnimationFrame(updatePhysics)
    }

    physicsFrameId = requestAnimationFrame(updatePhysics)
  }

  const stopPhysics = () => {
    if (physicsFrameId) cancelAnimationFrame(physicsFrameId)
    isPhysicsActive.value = false
  }

  onUnmounted(() => {
    stopPhysics()
  })

  return {
    isPhysicsActive,
    startPhysicsSimulation,
    stopPhysics
  }
}
