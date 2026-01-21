<template>
  <div class="training-container">
    <!-- 主 3D Canvas -->
    <canvas ref="canvasRef" class="training-canvas"></canvas>
    
    <!-- 顶部信息栏 -->
    <div class="top-bar">
      <div class="back-btn" @click="goBack">← 返回</div>
      <div class="tutorial-info" v-if="currentStep">
        <span class="step-badge">{{ stepIndex + 1 }}/{{ totalSteps }}</span>
        <span class="step-title">{{ currentStep.title }}</span>
      </div>
      <div class="flight-data">
        <span>高度: {{ altitude.toFixed(1) }}m</span>
        <span>速度: {{ speed.toFixed(1) }}m/s</span>
      </div>
    </div>
    
    <!-- 教程指令面板 -->
    <div class="instruction-panel" v-if="currentStep">
      <div class="instruction-icon">{{ getStepIcon(currentStep.action) }}</div>
      <div class="instruction-content">
        <div class="instruction-text">{{ currentStep.instruction }}</div>
        <div class="instruction-hint" v-if="currentStep.action === 'reach'">
          目标高度: {{ currentStep.targetValue?.altitude || 0 }}m
        </div>
      </div>
      <button 
        class="next-btn" 
        v-if="currentStep.action === 'wait'" 
        @click="nextStep"
      >继续 →</button>
    </div>
    
    <!-- 高度指示器 -->
    <div class="altitude-indicator">
      <div class="alt-bar">
        <div class="alt-fill" :style="{ height: Math.min(altitude / 100 * 100, 100) + '%' }"></div>
        <div class="alt-target" v-if="targetAltitude > 0" :style="{ bottom: (targetAltitude / 100 * 100) + '%' }"></div>
      </div>
      <div class="alt-labels">
        <span>100m</span>
        <span>50m</span>
        <span>0m</span>
      </div>
    </div>
    
    <!-- 底部控制区 -->
    <div class="control-area">
      <div class="control-btn" :class="{ active: isUnlocked }" @click="toggleUnlock">
        <span class="btn-icon">{{ isUnlocked ? '🔓' : '🔒' }}</span>
        <span class="btn-text">{{ isUnlocked ? '已解锁' : '解锁' }}</span>
      </div>
      
      <div class="joystick-group">
        <div class="joystick-container">
          <div class="joystick-base" @mousedown="startLeftJoystick" @touchstart.prevent="startLeftJoystick">
            <div class="joystick-handle" :style="leftJoystickStyle"></div>
          </div>
          <span class="joystick-label">油门/偏航</span>
        </div>
        
        <div class="joystick-container">
          <div class="joystick-base" @mousedown="startRightJoystick" @touchstart.prevent="startRightJoystick">
            <div class="joystick-handle" :style="rightJoystickStyle"></div>
          </div>
          <span class="joystick-label">俯仰/横滚</span>
        </div>
      </div>
      
      <div class="control-btn" @click="resetPosition">
        <span class="btn-icon">🔄</span>
        <span class="btn-text">重置</span>
      </div>
    </div>
    
    <!-- 完成弹窗 -->
    <div class="complete-modal" v-if="showComplete">
      <div class="modal-content">
        <div class="modal-icon">🎉</div>
        <div class="modal-title">教程完成！</div>
        <div class="modal-desc">恭喜你完成了 {{ tutorialName }} 教程</div>
        <button class="modal-btn" @click="finishTutorial">返回课程</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import * as THREE from 'three'
import { DroneModel, FlightPhysics, TutorialManager, type ControlInput, type TutorialStep } from '@/engine'
declare const uni: any

// Canvas 引用
const canvasRef = ref<HTMLCanvasElement | null>(null)

// 飞行状态
const isUnlocked = ref(false)
const altitude = ref(0)
const speed = ref(0)
const heading = ref(0)
const dronePosition = reactive({ x: 0, y: 0, z: 0 })  // 无人机位置

// 教程状态
const tutorialId = ref('')
const tutorialName = ref('')
const currentStep = ref<TutorialStep | null>(null)
const stepIndex = ref(0)
const totalSteps = ref(0)
const targetAltitude = ref(0)
const showComplete = ref(false)

// 摇杆状态
const leftJoystick = reactive({ x: 0, y: 0 })
const rightJoystick = reactive({ x: 0, y: 0 })

const leftJoystickStyle = computed(() => ({
  transform: `translate(${leftJoystick.x * 25}px, ${-leftJoystick.y * 25}px)`
}))
const rightJoystickStyle = computed(() => ({
  transform: `translate(${rightJoystick.x * 25}px, ${-rightJoystick.y * 25}px)`
}))

// Three.js 对象
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let drone: THREE.Group
let clock: THREE.Clock
let animationId: number

// 引擎模块
let droneModel: DroneModel
let flightPhysics: FlightPhysics
let tutorialManager: TutorialManager

onMounted(() => {
  // 获取教程ID (兼容 hash 路由模式)
  // URL格式: http://localhost:3000/#/pages/training-flight/index?tutorial=tut_altitude
  let tutorialParam = 'tut_unlock'  // 默认值
  
  // 方法1: 从 hash 部分解析参数
  const hash = window.location.hash  // e.g. "#/pages/training-flight/index?tutorial=tut_altitude"
  const hashQueryIndex = hash.indexOf('?')
  if (hashQueryIndex !== -1) {
    const hashParams = new URLSearchParams(hash.slice(hashQueryIndex + 1))
    tutorialParam = hashParams.get('tutorial') || tutorialParam
  }
  
  // 方法2: 备用 - 从普通 search 解析
  if (tutorialParam === 'tut_unlock') {
    const urlParams = new URLSearchParams(window.location.search)
    tutorialParam = urlParams.get('tutorial') || tutorialParam
  }
  
  console.log('Parsed tutorial ID:', tutorialParam)
  tutorialId.value = tutorialParam
  
  // 初始化物理引擎
  flightPhysics = new FlightPhysics({
    mass: 2.5,
    maxThrust: 60,
    dragCoefficient: 0.5,
    maxSpeed: 15,
    maxAltitude: 100,
    rotationSpeed: 2.5,
    tiltAngle: 0.3,
    gravity: 9.8
  })
  
  // 初始化教程管理器
  tutorialManager = new TutorialManager()
  initTutorial()
  
  // 初始化 Three.js
  clock = new THREE.Clock()
  initThreeJS()
  startAnimation()
  
  // 事件监听
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  renderer?.dispose()
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})

function initTutorial() {
  const tutorial = tutorialManager.startTutorial(tutorialId.value)
  if (tutorial) {
    tutorialName.value = tutorial.name
    totalSteps.value = tutorial.steps.length
    currentStep.value = tutorial.steps[0]
    stepIndex.value = 0
    
    // 获取目标高度
    if (currentStep.value?.targetValue?.altitude) {
      targetAltitude.value = currentStep.value.targetValue.altitude
    }
  }
}

function initThreeJS() {
  const canvas = canvasRef.value!
  const width = window.innerWidth
  const height = window.innerHeight
  
  // 场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb) // 天蓝色背景
  scene.fog = new THREE.Fog(0x87ceeb, 200, 500)
  
  // 相机
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
  camera.position.set(0, 50, 80)
  camera.lookAt(0, 20, 0)
  
  // 渲染器
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  
  // 光照
  const ambient = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambient)
  
  const sun = new THREE.DirectionalLight(0xffffff, 0.8)
  sun.position.set(50, 100, 50)
  sun.castShadow = true
  scene.add(sun)
  
  // 创建训练场地
  createTrainingGround()
  
  // 创建无人机
  createDrone()
}

function createTrainingGround() {
  // 地面 - 草地纹理
  const groundGeo = new THREE.PlaneGeometry(300, 300)
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x4a7c3f,
    roughness: 0.9
  })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  
  // 网格线 - 帮助判断距离
  const gridHelper = new THREE.GridHelper(200, 20, 0x888888, 0xcccccc)
  gridHelper.position.y = 0.1
  scene.add(gridHelper)
  
  // 中央起降平台
  createLandingPad(0, 0)
  
  // 高度标记杆
  createHeightMarkers()
  
  // 目标点标记
  createTargetMarkers()
}

function createLandingPad(x: number, z: number) {
  // 平台底座
  const padGeo = new THREE.CylinderGeometry(8, 8, 0.3, 32)
  const padMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
  const pad = new THREE.Mesh(padGeo, padMat)
  pad.position.set(x, 0.15, z)
  pad.receiveShadow = true
  scene.add(pad)
  
  // H 标记
  const hShape = new THREE.Shape()
  hShape.moveTo(-3, -4)
  hShape.lineTo(-1.5, -4)
  hShape.lineTo(-1.5, -0.5)
  hShape.lineTo(1.5, -0.5)
  hShape.lineTo(1.5, -4)
  hShape.lineTo(3, -4)
  hShape.lineTo(3, 4)
  hShape.lineTo(1.5, 4)
  hShape.lineTo(1.5, 0.5)
  hShape.lineTo(-1.5, 0.5)
  hShape.lineTo(-1.5, 4)
  hShape.lineTo(-3, 4)
  hShape.lineTo(-3, -4)
  
  const hGeo = new THREE.ShapeGeometry(hShape)
  const hMat = new THREE.MeshBasicMaterial({ color: 0xffff00 })
  const hMesh = new THREE.Mesh(hGeo, hMat)
  hMesh.rotation.x = -Math.PI / 2
  hMesh.position.set(x, 0.35, z)
  scene.add(hMesh)
  
  // 圆圈标记
  const ringGeo = new THREE.RingGeometry(6, 7, 32)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.set(x, 0.32, z)
  scene.add(ring)
}

function createHeightMarkers() {
  const heights = [10, 20, 30, 50, 80]
  const positions = [
    { x: 20, z: 0 },
    { x: -20, z: 0 },
    { x: 0, z: 20 },
    { x: 0, z: -20 }
  ]
  
  positions.forEach((pos, i) => {
    heights.forEach(h => {
      // 高度标记杆
      const poleGeo = new THREE.CylinderGeometry(0.2, 0.2, h, 8)
      const poleMat = new THREE.MeshStandardMaterial({ 
        color: h <= 30 ? 0x00aa00 : (h <= 50 ? 0xffaa00 : 0xff4444)
      })
      const pole = new THREE.Mesh(poleGeo, poleMat)
      pole.position.set(pos.x, h / 2, pos.z)
      scene.add(pole)
      
      // 高度数字标牌
      if (i === 0) { // 只在一侧显示数字
        const labelGeo = new THREE.PlaneGeometry(4, 2)
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 32
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, 64, 32)
        ctx.fillStyle = '#000000'
        ctx.font = 'bold 20px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${h}m`, 32, 16)
        
        const labelTex = new THREE.CanvasTexture(canvas)
        const labelMat = new THREE.MeshBasicMaterial({ map: labelTex })
        const label = new THREE.Mesh(labelGeo, labelMat)
        label.position.set(pos.x + 3, h, pos.z)
        scene.add(label)
      }
    })
  })
}

function createTargetMarkers() {
  // 目标点 - 用于导航练习
  const targets = [
    { x: 30, z: 30 },
    { x: -30, z: 30 },
    { x: -30, z: -30 },
    { x: 30, z: -30 }
  ]
  
  targets.forEach((t, i) => {
    // 目标圆环
    const ringGeo = new THREE.RingGeometry(3, 4, 32)
    const ringMat = new THREE.MeshBasicMaterial({ 
      color: 0x00ffff, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.set(t.x, 0.2, t.z)
    scene.add(ring)
    
    // 编号
    const numGeo = new THREE.PlaneGeometry(3, 3)
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#00ffff'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${i + 1}`, 32, 32)
    
    const numTex = new THREE.CanvasTexture(canvas)
    const numMat = new THREE.MeshBasicMaterial({ map: numTex, transparent: true })
    const numMesh = new THREE.Mesh(numGeo, numMat)
    numMesh.rotation.x = -Math.PI / 2
    numMesh.position.set(t.x, 0.3, t.z)
    scene.add(numMesh)
  })
}

function createDrone() {
  droneModel = new DroneModel()
  drone = droneModel.getObject3D()
  drone.position.set(0, 3, 0)
  scene.add(drone)
}

function startAnimation() {
  const animate = () => {
    animationId = requestAnimationFrame(animate)
    const deltaTime = clock.getDelta()
    
    if (flightPhysics.isRunning()) {
      // 合并摇杆输入
      const controlInput: ControlInput = {
        throttle: leftJoystick.y,
        yaw: leftJoystick.x,
        pitch: rightJoystick.y,
        roll: rightJoystick.x
      }
      
      flightPhysics.update(deltaTime, controlInput)
      const state = flightPhysics.getState()
      
      droneModel.setPosition(state.position.x, state.position.y, state.position.z)
      droneModel.setRotation(state.rotation.x, state.rotation.y, state.rotation.z)
      
      altitude.value = state.altitude
      speed.value = state.speed
      heading.value = state.heading * 180 / Math.PI
      dronePosition.x = state.position.x
      dronePosition.y = state.position.y
      dronePosition.z = state.position.z
      
      // 检测教程条件
      checkTutorialCondition()
    }
    
    droneModel?.update(deltaTime)
    
    // 相机跟随
    if (drone) {
      camera.position.x = drone.position.x
      camera.position.y = drone.position.y + 30
      camera.position.z = drone.position.z + 50
      camera.lookAt(drone.position)
    }
    
    renderer.render(scene, camera)
  }
  animate()
}

function checkTutorialCondition() {
  if (!currentStep.value) return
  
  const step = currentStep.value
  
  // 检测 reach 类型 - 高度目标
  if (step.action === 'reach' && step.targetValue?.altitude !== undefined) {
    if (Math.abs(altitude.value - step.targetValue.altitude) < 3) {
      nextStep()
    }
  }
  
  // 检测 reach 类型 - 位置目标（用于移动控制教程）
  if (step.action === 'reach' && step.position) {
    const dx = dronePosition.x - step.position.x
    const dy = dronePosition.y - step.position.y
    const dz = dronePosition.z - step.position.z
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (distance < 10) {  // 10米内算到达
      nextStep()
    }
  }
  
  // 检测 joystick 类型
  if (step.action === 'joystick') {
    const hasInput = Math.abs(leftJoystick.x) > 0.3 || Math.abs(leftJoystick.y) > 0.3 ||
                     Math.abs(rightJoystick.x) > 0.3 || Math.abs(rightJoystick.y) > 0.3
    if (hasInput) {
      setTimeout(() => nextStep(), 1500)
    }
  }
}

function nextStep() {
  const next = tutorialManager.nextStep()
  if (next) {
    stepIndex.value++
    currentStep.value = next
    
    if (next.targetValue?.altitude) {
      targetAltitude.value = next.targetValue.altitude
    } else {
      targetAltitude.value = 0
    }
    
    // 自动等待类型
    if (next.action === 'wait' && next.duration) {
      setTimeout(() => nextStep(), next.duration * 1000)
    }
  } else {
    // 教程完成
    showComplete.value = true
  }
}

function getStepIcon(action?: string): string {
  switch (action) {
    case 'click': return '👆'
    case 'joystick': return '🕹️'
    case 'wait': return '⏳'
    case 'reach': return '🎯'
    default: return '📝'
  }
}

// 摇杆控制
let activeJoystick: 'left' | 'right' | null = null
let joystickCenter = { x: 0, y: 0 }

function startLeftJoystick(e: MouseEvent | TouchEvent) {
  activeJoystick = 'left'
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function startRightJoystick(e: MouseEvent | TouchEvent) {
  activeJoystick = 'right'
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function onMouseMove(e: MouseEvent) { updateJoystick(e.clientX, e.clientY) }
function onTouchMove(e: TouchEvent) {
  e.preventDefault()
  if (e.touches.length > 0) updateJoystick(e.touches[0].clientX, e.touches[0].clientY)
}

function updateJoystick(x: number, y: number) {
  if (!activeJoystick) return
  let dx = (x - joystickCenter.x) / 35
  let dy = -(y - joystickCenter.y) / 35
  const mag = Math.sqrt(dx * dx + dy * dy)
  if (mag > 1) { dx /= mag; dy /= mag }
  
  if (activeJoystick === 'left') {
    leftJoystick.x = dx
    leftJoystick.y = dy
  } else {
    rightJoystick.x = dx
    rightJoystick.y = dy
  }
}

function onMouseUp() {
  activeJoystick = null
  leftJoystick.x = leftJoystick.y = 0
  rightJoystick.x = rightJoystick.y = 0
}

function onTouchEnd() {
  activeJoystick = null
  leftJoystick.x = leftJoystick.y = 0
  rightJoystick.x = rightJoystick.y = 0
}

// 键盘控制
const keysPressed: Record<string, boolean> = {}

function onKeyDown(e: KeyboardEvent) {
  keysPressed[e.key.toLowerCase()] = true
  updateKeyboardInput()
}

function onKeyUp(e: KeyboardEvent) {
  keysPressed[e.key.toLowerCase()] = false
  updateKeyboardInput()
}

function updateKeyboardInput() {
  leftJoystick.y = (keysPressed['w'] ? 1 : 0) - (keysPressed['s'] ? 1 : 0)
  leftJoystick.x = (keysPressed['d'] ? 1 : 0) - (keysPressed['a'] ? 1 : 0)
  rightJoystick.y = (keysPressed['arrowup'] ? 1 : 0) - (keysPressed['arrowdown'] ? 1 : 0)
  rightJoystick.x = (keysPressed['arrowright'] ? 1 : 0) - (keysPressed['arrowleft'] ? 1 : 0)
}

function toggleUnlock() {
  if (flightPhysics.isRunning()) {
    flightPhysics.stopEngine()
    droneModel.stopPropellers()
    isUnlocked.value = false
  } else {
    flightPhysics.startEngine()
    droneModel.startPropellers()
    isUnlocked.value = true
    
    // 如果当前步骤是点击解锁，自动推进
    if (currentStep.value?.action === 'click') {
      setTimeout(() => nextStep(), 500)
    }
  }
}

function resetPosition() {
  flightPhysics.setPosition(0, 3, 0)
  flightPhysics.setRotation(0, 0, 0)
  droneModel.setPosition(0, 3, 0)
  droneModel.setRotation(0, 0, 0)
  altitude.value = 3
  speed.value = 0
}

function goBack() {
  uni.navigateBack()
}

function finishTutorial() {
  uni.navigateTo({ url: '/pages/training/index' })
}
</script>

<style scoped>
.training-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: #000;
}

.training-canvas {
  width: 100%;
  height: 100%;
}

.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40px 16px 12px;
  background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%);
  z-index: 100;
}

.back-btn {
  color: #00d4ff;
  font-size: 14px;
  padding: 8px 12px;
  cursor: pointer;
}

.tutorial-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-badge {
  background: linear-gradient(90deg, #00d4ff, #00ff88);
  color: #000;
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
}

.step-title {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.flight-data {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: rgba(255,255,255,0.7);
  font-family: 'Courier New', monospace;
}

.instruction-panel {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(0,30,60,0.9);
  border: 1px solid rgba(0,212,255,0.4);
  border-radius: 16px;
  padding: 16px 24px;
  max-width: 500px;
  z-index: 100;
}

.instruction-icon {
  font-size: 32px;
}

.instruction-content {
  flex: 1;
}

.instruction-text {
  color: #fff;
  font-size: 15px;
  line-height: 1.5;
}

.instruction-hint {
  color: #00ff88;
  font-size: 13px;
  margin-top: 6px;
}

.next-btn {
  background: linear-gradient(90deg, #00d4ff, #00ff88);
  border: none;
  color: #000;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.altitude-indicator {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 100;
}

.alt-bar {
  width: 12px;
  height: 200px;
  background: rgba(0,0,0,0.5);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}

.alt-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, #00ff88 0%, #00d4ff 100%);
  border-radius: 6px;
  transition: height 0.1s;
}

.alt-target {
  position: absolute;
  left: -2px;
  right: -2px;
  height: 3px;
  background: #ff4444;
  border-radius: 2px;
}

.alt-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 200px;
  font-size: 10px;
  color: rgba(255,255,255,0.5);
}

.control-area {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 100%);
  z-index: 100;
}

.control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  cursor: pointer;
}

.control-btn.active {
  background: rgba(0,212,255,0.3);
  border: 1px solid #00d4ff;
}

.btn-icon {
  font-size: 24px;
}

.btn-text {
  font-size: 11px;
  color: rgba(255,255,255,0.7);
}

.joystick-group {
  display: flex;
  gap: 80px;
}

.joystick-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.joystick-base {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  border: 2px solid rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.joystick-handle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00d4ff, #00ff88);
  box-shadow: 0 4px 12px rgba(0,212,255,0.4);
  transition: transform 0.05s;
}

.joystick-label {
  font-size: 11px;
  color: rgba(255,255,255,0.5);
}

.complete-modal {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal-content {
  background: linear-gradient(135deg, rgba(20,40,60,0.95) 0%, rgba(10,20,40,0.95) 100%);
  border: 1px solid rgba(0,212,255,0.4);
  border-radius: 20px;
  padding: 40px;
  text-align: center;
}

.modal-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.modal-title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.modal-desc {
  font-size: 14px;
  color: rgba(255,255,255,0.6);
  margin-bottom: 24px;
}

.modal-btn {
  background: linear-gradient(90deg, #00d4ff, #00ff88);
  border: none;
  color: #000;
  padding: 14px 32px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
</style>
