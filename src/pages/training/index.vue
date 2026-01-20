<template>
  <div class="training-container">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <div class="nav-back" @click="goBack">← 返回</div>
      <span class="nav-title">培训课程</span>
      <div class="nav-progress">{{ completionPercent }}%</div>
    </div>
    
    <!-- 课程章节列表 -->
    <div class="chapters">
      <div 
        v-for="chapter in chapters" 
        :key="chapter.id" 
        class="chapter-card"
        :class="{ locked: !isChapterUnlocked(chapter.id) }"
      >
        <div class="chapter-header">
          <span class="chapter-icon">{{ isChapterUnlocked(chapter.id) ? '📖' : '🔒' }}</span>
          <div class="chapter-info">
            <span class="chapter-title">{{ chapter.title }}</span>
            <span class="chapter-desc">{{ chapter.description }}</span>
          </div>
        </div>
        
        <!-- 教程列表 -->
        <div class="tutorial-list" v-if="isChapterUnlocked(chapter.id)">
          <div 
            v-for="tutorial in chapter.tutorials" 
            :key="tutorial.id"
            class="tutorial-item"
            :class="{ completed: isTutorialCompleted(tutorial.id) }"
            @click="startTutorial(tutorial)"
          >
            <span class="tutorial-status">
              {{ isTutorialCompleted(tutorial.id) ? '✅' : '○' }}
            </span>
            <div class="tutorial-info">
              <span class="tutorial-name">{{ tutorial.name }}</span>
              <span class="tutorial-meta">
                <span class="meta-time">⏱ {{ tutorial.estimatedTime }}分钟</span>
                <span class="meta-steps">{{ tutorial.steps.length }}步骤</span>
              </span>
            </div>
            <span class="tutorial-arrow">→</span>
          </div>
        </div>
        
        <!-- 锁定提示 -->
        <div class="locked-hint" v-else>
          完成上一章节解锁
        </div>
      </div>
    </div>
    
    <!-- 底部统计 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ completedCount }}</span>
        <span class="stat-label">已完成</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ totalTutorials }}</span>
        <span class="stat-label">总课程</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ totalScore }}</span>
        <span class="stat-label">总积分</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { TutorialManager, type Tutorial, type CourseChapter } from '@/engine'
declare const uni: any

const tutorialManager = new TutorialManager()

const chapters = ref<CourseChapter[]>([])
const completedCount = ref(0)
const totalTutorials = ref(0)
const totalScore = ref(0)

const completionPercent = computed(() => {
  if (totalTutorials.value === 0) return 0
  return Math.round((completedCount.value / totalTutorials.value) * 100)
})

onMounted(() => {
  // 加载课程章节
  chapters.value = tutorialManager.getChapters()
  
  // 计算统计数据
  const progress = tutorialManager.getProgress()
  completedCount.value = progress.completedTutorials.length
  totalScore.value = progress.totalScore
  
  // 计算总教程数
  let total = 0
  chapters.value.forEach(chapter => {
    total += chapter.tutorials.length
  })
  totalTutorials.value = total
})

function goBack() {
  uni.navigateBack()
}

function isChapterUnlocked(chapterId: string): boolean {
  return tutorialManager.isChapterUnlocked(chapterId)
}

function isTutorialCompleted(tutorialId: string): boolean {
  return tutorialManager.isTutorialCompleted(tutorialId)
}

function startTutorial(tutorial: Tutorial) {
  // 跳转到培训飞行页面（专用训练场地）
  uni.navigateTo({
    url: `/pages/training-flight/index?tutorial=${tutorial.id}`
  })
}
</script>

<style scoped>
.training-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a14 0%, #1a1a2e 100%);
  padding-bottom: 100px;
  color: white;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 48px 16px 16px;
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(180deg, rgba(10,10,20,1) 0%, rgba(10,10,20,0) 100%);
}

.nav-back {
  color: #00d4ff;
  font-size: 14px;
  padding: 8px;
  cursor: pointer;
}

.nav-title {
  font-size: 18px;
  font-weight: 600;
}

.nav-progress {
  background: linear-gradient(90deg, #00d4ff, #00ff88);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 700;
  font-size: 16px;
}

.chapters {
  padding: 16px;
}

.chapter-card {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  margin-bottom: 16px;
  overflow: hidden;
}

.chapter-card.locked {
  opacity: 0.6;
}

.chapter-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(0,212,255,0.05);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.chapter-icon {
  font-size: 28px;
}

.chapter-info {
  flex: 1;
}

.chapter-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.chapter-desc {
  display: block;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
}

.tutorial-list {
  padding: 8px;
}

.tutorial-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.tutorial-item:hover {
  background: rgba(255,255,255,0.05);
}

.tutorial-item.completed {
  opacity: 0.7;
}

.tutorial-status {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.tutorial-info {
  flex: 1;
}

.tutorial-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.tutorial-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: rgba(255,255,255,0.4);
}

.tutorial-arrow {
  color: rgba(255,255,255,0.3);
  font-size: 16px;
}

.locked-hint {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: rgba(255,255,255,0.4);
}

.stats-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  padding: 16px;
  background: rgba(10,10,20,0.95);
  border-top: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(90deg, #00d4ff, #00ff88);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.stat-label {
  font-size: 11px;
  color: rgba(255,255,255,0.5);
}
</style>
