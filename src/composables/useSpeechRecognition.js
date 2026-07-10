import { ref } from 'vue'
import { playSound } from '../utils/audio.js'

export function useSpeechRecognition() {
  const isListening = ref(false)
  const listeningTarget = ref(null)
  let recognition = null

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

  const initRecognition = (onResultCallback) => {
    if (!SpeechRecognition) return null

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
      if (onResultCallback) {
        onResultCallback(listeningTarget.value, transcript)
      }
      playSound('flip')
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      isListening.value = false
      listeningTarget.value = null
      alert(`음성 인식 오류: ${event.error}`)
    }

    return recognition
  }

  const toggleSpeech = (target, onResultCallback) => {
    if (!SpeechRecognition) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Safari 브라우저를 사용해 주세요.')
      return
    }

    if (!recognition) {
      initRecognition(onResultCallback)
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

  return {
    isListening,
    listeningTarget,
    toggleSpeech
  }
}
