<template>
  <div class="result-container">
    <div class="content">
      <div class="result-icon" :class="{ success: isSuccess }">{{ isSuccess ? '🎉' : '😢' }}</div>
      
      <span class="result-title">{{ isSuccess ? '配送成功！' : '任务失败' }}</span>
      <span class="result-subtitle">{{ isSuccess ? '您已成功完成配送任务' : '请再接再厉' }}</span>
      
      <div class="score-section glass">
        <span class="score-label">综合评分</span>
        <span class="score-value text-gradient">{{ totalScore }}</span>
        <div class="stars">
          <span v-for="i in 5" :key="i" class="star" :class="{ active: i <= starCount }">⭐</span>
        </div>
      </div>
      
      <div class="stats-section glass">
        <span class="section-title">飞行统计</span>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">05:32</span>
            <span class="stat-label">飞行时间</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">2.4km</span>
            <span class="stat-label">飞行距离</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">7.2m/s</span>
            <span class="stat-label">平均速度</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">85m</span>
            <span class="stat-label">最高高度</span>
          </div>
        </div>
      </div>
      
      <div class="action-section">
        <button class="action-btn primary" @click="tryAgain">🔄 再试一次</button>
        <button class="action-btn secondary" @click="backHome">🏠 返回首页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
declare const uni: any

const totalScore = 87
const isSuccess = computed(() => totalScore >= 60)
const starCount = computed(() => {
  if (totalScore >= 90) return 5
  if (totalScore >= 80) return 4
  if (totalScore >= 70) return 3
  if (totalScore >= 60) return 2
  return 1
})

const tryAgain = () => uni.redirectTo({ url: '/pages/scene-select/index' })
const backHome = () => uni.reLaunch({ url: '/' })
</script>

<style scoped>
.result-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
}

.content {
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.result-icon {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  margin-bottom: 16px;
}

.result-icon.success { box-shadow: 0 0 40px rgba(0, 255, 136, 0.3); }

.result-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; display: block; }
.result-subtitle { font-size: 14px; color: var(--text-secondary); margin-bottom: 24px; display: block; }

.score-section {
  width: 100%;
  max-width: 320px;
  padding: 24px;
  border-radius: 20px;
  text-align: center;
  margin-bottom: 16px;
}

.score-label { font-size: 14px; color: var(--text-secondary); display: block; }
.score-value { font-size: 64px; font-weight: 700; display: block; margin: 8px 0; }

.stars { display: flex; justify-content: center; gap: 4px; }
.star { font-size: 24px; opacity: 0.3; }
.star.active { opacity: 1; }

.stats-section {
  width: 100%;
  max-width: 320px;
  padding: 20px;
  border-radius: 20px;
  margin-bottom: 24px;
}

.section-title { font-size: 14px; color: var(--text-secondary); margin-bottom: 16px; display: block; }

.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }

.stat-item { text-align: center; }
.stat-value { font-size: 20px; font-weight: 600; color: var(--primary-color); display: block; }
.stat-label { font-size: 12px; color: var(--text-secondary); }

.action-section {
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  width: 100%;
  padding: 16px;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
}

.action-btn.secondary { background: var(--bg-card); color: var(--text-primary); }
</style>
