import { ref } from 'vue'
import { playSound } from '../utils/audio.js'
import { useToast } from './useToast.js'

// Local Parse Fallback (Heuristic Analyzer)
export const parseHeuristically = (prompt) => {
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

export function useGeminiAI() {
  const isGeneratingAI = ref(false)
  const aiStatusMessage = ref('')
  const aiStatusType = ref('')
  const { triggerToast } = useToast()

  const generateWithAI = async (prompt, apiKey, onGenerated) => {
    if (!prompt.trim()) return
    
    isGeneratingAI.value = true
    aiStatusMessage.value = '제비를 생성하는 중입니다...'
    aiStatusType.value = 'info'
    
    const key = apiKey.trim()
    
    if (!key) {
      // Local Fallback Heuristic
      setTimeout(() => {
        try {
          const generated = parseHeuristically(prompt)
          if (generated.length < 2) {
            throw new Error('의미 있는 제비 항목을 추출하지 못했습니다. 형식을 맞춰 다시 입력해주세요. (예: 당첨 1, 꽝 3)')
          }
          
          const limited = generated.slice(0, 20)
          onGenerated(limited)
          playSound('shuffle')
          
          aiStatusMessage.value = `로컬 분석기로 ${limited.length}개의 제비를 생성했습니다! (환경변수에 API 키를 설정하면 Gemini AI 생성이 가능합니다)`
          aiStatusType.value = 'success'
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
              text: `사용자의 요청: "${prompt}"
이 요청을 바탕으로 제비뽑기 게임에 사용할 제비 목록을 한국어로 생성해주세요.
제비 개수는 최소 2개, 최대 20개여야 합니다.
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
      
      const limited = generated.slice(0, 20).map(item => String(item).slice(0, 20))
      onGenerated(limited)
      playSound('shuffle')
      
      aiStatusMessage.value = `Gemini AI가 ${limited.length}개의 제비를 생성했습니다! 🪄`
      aiStatusType.value = 'success'
    } catch (e) {
      console.error('Gemini error:', e)
      if (e.message !== 'API 호출 한도 초과') {
        triggerToast(`❌ Gemini 호출 실패: ${e.message}`, 'error')
      }
      aiStatusMessage.value = `Gemini 호출 실패: ${e.message}. 로컬 패턴 분석기로 시도합니다.`
      aiStatusType.value = 'error'
      
      setTimeout(() => {
        try {
          const generated = parseHeuristically(prompt)
          if (generated.length < 2) {
            throw new Error('로컬 분석기로도 제비를 파싱하지 못했습니다.')
          }
          const limited = generated.slice(0, 20)
          onGenerated(limited)
          playSound('shuffle')
          aiStatusMessage.value = `로컬 파서가 대신 ${limited.length}개의 제비를 생성했습니다.`
          aiStatusType.value = 'success'
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

  return {
    isGeneratingAI,
    aiStatusMessage,
    aiStatusType,
    generateWithAI
  }
}
