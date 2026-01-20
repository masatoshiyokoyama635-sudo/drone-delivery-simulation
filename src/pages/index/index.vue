<template>
  <div class="home-container">
    <!-- 背景动画 -->
    <div class="bg-animation">
      <div class="particle" v-for="i in 20" :key="i"></div>
    </div>
    
    <!-- 主要内容 -->
    <div class="content">
      <!-- Logo 区域 -->
      <div class="logo-section">
        <img src="/drone-model-transparent.png" class="drone-img" alt="Drone Model" />
        <span class="title text-gradient">无人机配送仿真</span>
        <span class="subtitle">专业飞行培训系统</span>
      </div>
      
      <!-- 功能按钮 -->
      <div class="action-section">
        <button class="action-btn primary" @click="startTraining">
          <span class="btn-text">开始训练</span>
        </button>
        
        <button class="action-btn secondary" @click="viewCourses">
          <span class="btn-text">培训课程</span>
        </button>
        
        <button class="action-btn secondary" @click="viewHistory">
          <span class="btn-text">历史记录</span>
        </button>
      </div>
      
      <!-- 快速入口 -->
      <div class="quick-section glass">
        <span class="section-title">快速开始</span>
        <div class="quick-items">
          <div class="quick-item" @click="quickStart('tutorial')">
            <span class="quick-icon">🎓</span>
            <span class="quick-label">新手教程</span>
          </div>
          <div class="quick-item" @click="quickStart('easy')">
            <span class="quick-icon">⭐</span>
            <span class="quick-label">简单配送</span>
          </div>
          <div class="quick-item" @click="quickStart('medium')">
            <span class="quick-icon">⭐⭐</span>
            <span class="quick-label">进阶任务</span>
          </div>
          <div class="quick-item" @click="quickStart('hard')">
            <span class="quick-icon">⭐⭐⭐</span>
            <span class="quick-label">挑战模式</span>
          </div>
        </div>
      </div>
      
      <!-- 版本信息 -->
      <div class="footer">
        <span class="version">v1.0.0 | 培训专用版</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
declare const uni: any

// 开始训练
const startTraining = () => {
  uni.navigateTo({ url: '/pages/scene-select/index' })
}

// 查看课程
const viewCourses = () => {
  uni.navigateTo({ url: '/pages/training/index' })
}

// 查看历史
const viewHistory = () => {
  uni.showToast({ title: '历史记录开发中', icon: 'none' })
}

// 快速开始
const quickStart = (mode: string) => {
  if (mode === 'tutorial') {
    uni.navigateTo({ url: '/pages/training/index' })
    return
  }
  uni.navigateTo({ url: `/pages/scene-select/index?mode=${mode}` })
}
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  /* Use the user-provided reference image */
  background: url('/home-bg.png') no-repeat center center fixed;
  background-size: cover;
  position: relative;
  overflow: hidden;
}

/* Add a dark overlay so text remains readable */
.home-container::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4); /* 40% dark overlay */
  z-index: 0;
}

.bg-animation {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: var(--primary-color);
  border-radius: 50%;
  opacity: 0.3;
  animation: float 15s infinite;
}

.particle:nth-child(odd) { background: var(--secondary-color); }

@keyframes float {
  0%, 100% { transform: translateY(100vh); opacity: 0; }
  10%, 90% { opacity: 0.3; }
}

.particle:nth-child(1) { left: 10%; animation-delay: 0s; }
.particle:nth-child(2) { left: 20%; animation-delay: 1s; }
.particle:nth-child(3) { left: 30%; animation-delay: 2s; }
.particle:nth-child(4) { left: 40%; animation-delay: 3s; }
.particle:nth-child(5) { left: 50%; animation-delay: 4s; }
.particle:nth-child(6) { left: 60%; animation-delay: 5s; }
.particle:nth-child(7) { left: 70%; animation-delay: 6s; }
.particle:nth-child(8) { left: 80%; animation-delay: 7s; }
.particle:nth-child(9) { left: 90%; animation-delay: 8s; }
.particle:nth-child(10) { left: 15%; animation-delay: 9s; }
.particle:nth-child(11) { left: 25%; animation-delay: 0.5s; }
.particle:nth-child(12) { left: 35%; animation-delay: 1.5s; }
.particle:nth-child(13) { left: 45%; animation-delay: 2.5s; }
.particle:nth-child(14) { left: 55%; animation-delay: 3.5s; }
.particle:nth-child(15) { left: 65%; animation-delay: 4.5s; }
.particle:nth-child(16) { left: 75%; animation-delay: 5.5s; }
.particle:nth-child(17) { left: 85%; animation-delay: 6.5s; }
.particle:nth-child(18) { left: 95%; animation-delay: 7.5s; }
.particle:nth-child(19) { left: 5%; animation-delay: 8.5s; }
.particle:nth-child(20) { left: 50%; animation-delay: 9.5s; }

.content {
  position: relative;
  z-index: 1;
  padding: 60px 24px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
}

.logo-section {
  text-align: center;
  margin-bottom: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.drone-img {
  width: 250px; /* Slightly larger for better detail */
  height: auto;
  margin-bottom: 0;
  animation: hover 3s ease-in-out infinite;
  filter: drop-shadow(0 0 20px rgba(0, 243, 255, 0.4));
}

@keyframes hover {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.title {
  font-size: 32px;
  font-weight: 700;
  display: block;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  display: block;
}

.action-section {
  width: 100%;
  max-width: 320px;
  margin-bottom: 32px;
}

.action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 24px;
  border-radius: 20px;
  margin-bottom: 12px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  box-shadow: 0 8px 24px rgba(0, 212, 255, 0.3);
}

.action-btn.secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.action-btn:hover { transform: translateY(-2px); }
.action-btn:active { transform: scale(0.98); }

.btn-icon { margin-right: 8px; font-size: 20px; }
.btn-text { font-size: 16px; }

.quick-section {
  width: 100%;
  max-width: 320px;
  padding: 20px;
  border-radius: 20px;
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  display: block;
}

.quick-items {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  background: var(--bg-hover);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.quick-item:hover { background: var(--primary-color); transform: scale(1.02); }
.quick-item:active { transform: scale(0.95); }

.quick-icon { font-size: 24px; margin-bottom: 8px; }
.quick-label { font-size: 12px; color: var(--text-secondary); }

.footer { margin-top: auto; padding-top: 24px; }
.version { font-size: 12px; color: var(--text-muted); }
</style>
