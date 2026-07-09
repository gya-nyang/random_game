let audioCtx = null

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
}

export const playSound = (type) => {
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
