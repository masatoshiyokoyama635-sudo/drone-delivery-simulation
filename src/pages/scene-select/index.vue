<template>
  <div class="scene-container">
    <!-- 顶部导航 -->
    <div class="nav-bar glass">
      <div class="nav-back" @click="goBack">← 返回</div>
      <span class="nav-title">选择配送场景</span>
      <div class="nav-placeholder"></div>
    </div>
    
    <!-- 机型选择 -->
    <div class="section">
      <span class="section-title">选择机型</span>
      <div class="drone-list">
        <div 
          v-for="drone in droneList" 
          :key="drone.id"
          class="drone-card"
          :class="{ active: selectedDrone === drone.id }"
          @click="selectDrone(drone.id)"
        >
          <img :src="drone.image" class="drone-img-sm" />
          <span class="drone-name">{{ drone.name }}</span>
          <span class="drone-desc">{{ drone.desc }}</span>
        </div>
      </div>
    </div>
    
    <!-- 场景选择 -->
    <div class="section">
      <span class="section-title">选择场景</span>
      <div class="scene-grid">
        <div 
          v-for="scene in sceneList" 
          :key="scene.id"
          class="scene-card glass"
          :class="{ active: selectedScene === scene.id }"
          @click="selectScene(scene.id)"
        >
          <div class="scene-preview" :style="{ backgroundImage: `url(${scene.image})` }">
            <!-- Image background -->
          </div>
          <div class="scene-info">
            <span class="scene-name">{{ scene.name }}</span>
            <span class="scene-diff">难度: {{ scene.difficulty }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 开始按钮 -->
    <div class="start-section">
      <button class="start-btn" @click="startFlight">🚀 开始配送任务</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
declare const uni: any

const droneList = ref([
  { id: 'quad', image: '/drone-quad.png', name: '四旋翼', desc: '稳定易控' },
  { id: 'hexa', image: '/drone-hexa-final.png', name: '六旋翼', desc: '载重更大' },
  { id: 'vtol', image: '/drone-vtol.png', name: '垂起固定翼', desc: '航程更远' }
])

const sceneList = ref([
  { id: 'city', image: '/scene-city.jpg', name: '城市配送', difficulty: '⭐' },
  { id: 'mountain', image: '/scene-mountain.png', name: '山区配送', difficulty: '⭐⭐⭐' },
  { id: 'emergency', image: '/scene-hospital.jpg', name: '紧急送药', difficulty: '⭐⭐' }
])

const selectedDrone = ref('quad')
const selectedScene = ref('city')

const goBack = () => uni.navigateBack()
const selectDrone = (id: string) => { selectedDrone.value = id }
const selectScene = (id: string) => { selectedScene.value = id }

const startFlight = () => {
  uni.navigateTo({
    url: `/pages/flight/index?drone=${selectedDrone.value}&scene=${selectedScene.value}`
  })
}
</script>

<style scoped>
.scene-container {
  height: 100vh; /* Fixed height to viewport */
  overflow-y: auto; /* Enable internal scrolling */
  overflow-x: hidden;
  background: linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%);
  padding-bottom: 100px;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 48px 16px 16px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-back { color: var(--primary-color); font-size: 14px; padding: 8px; cursor: pointer; }
.nav-title { font-size: 18px; font-weight: 600; }
.nav-placeholder { width: 60px; }

.section { padding: 16px; }
.section-title { font-size: 14px; color: var(--text-secondary); margin-bottom: 12px; display: block; }

.drone-list { display: flex; gap: 12px; overflow-x: auto; }

.drone-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 20px;
  background: var(--bg-card);
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;
}

.drone-card.active { border-color: var(--primary-color); background: var(--bg-hover); }
.drone-img-sm { width: 80px; height: 80px; object-fit: contain; margin-bottom: 8px; filter: drop-shadow(0 0 10px rgba(0,212,255,0.2)); }
.drone-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.drone-desc { font-size: 12px; color: var(--text-secondary); }

.scene-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }

.scene-card {
  padding: 16px;
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.scene-card.active { border-color: var(--primary-color); }

.scene-preview {
  width: 100%;
  aspect-ratio: 16/9;
  background-color: var(--bg-hover);
  background-size: cover;
  background-position: center;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.scene-name { font-size: 14px; font-weight: 600; display: block; margin-bottom: 4px; }
.scene-diff { font-size: 12px; color: var(--text-secondary); }

.start-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(transparent, var(--bg-dark));
}

.start-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 212, 255, 0.3);
}

.start-btn:active { transform: scale(0.98); }
</style>
