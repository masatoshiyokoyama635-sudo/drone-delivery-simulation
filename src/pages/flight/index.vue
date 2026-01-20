<template>
  <div class="flight-container">
    <!-- 主 3D Canvas -->
    <canvas ref="canvasRef" class="flight-canvas"></canvas>
    
    <!-- 顶部状态栏 -->
    <div class="top-status-bar">
      <div class="status-left">
        <div class="signal-group">
          <div class="signal-item" :class="{ good: gpsCount >= 10, warn: gpsCount >= 6 && gpsCount < 10, bad: gpsCount < 6 }">
            <span class="signal-icon">GPS</span>
            <span class="signal-value">{{ gpsCount }}</span>
          </div>
          <div class="signal-item" :class="{ good: rcSignal > 70, warn: rcSignal > 30, bad: rcSignal <= 30 }">
            <span class="signal-icon">RC</span>
            <div class="signal-bars">
              <div v-for="i in 5" :key="i" class="bar" :class="{ active: rcSignal >= i * 20 }"></div>
            </div>
          </div>
          <div class="signal-item" :class="{ good: videoSignal > 70, warn: videoSignal > 30, bad: videoSignal <= 30 }">
            <span class="signal-icon">HD</span>
            <div class="signal-bars">
              <div v-for="i in 5" :key="i" class="bar" :class="{ active: videoSignal >= i * 20 }"></div>
            </div>
          </div>
        </div>
        <div class="flight-mode" :class="flightMode">{{ flightMode }}</div>
      </div>
      
      <div class="status-center">
        <div class="system-status" :class="systemStatus">{{ statusMessage }}</div>
      </div>
      
      <div class="status-right">
        <div class="flight-timer">{{ formatTime(elapsedTime) }}</div>
        <div class="menu-btn" @click="toggleInfoPanel">☰</div>
        <div class="menu-btn" @click="openMenu">⚙</div>
      </div>
    </div>
    
    <!-- 左侧评分面板 -->
    <div class="left-score-panel">
      <div class="score-box">
        <div class="score-number">{{ realTimeScore }}</div>
        <div class="score-text">分</div>
      </div>
      <div class="stats-row">
        <span class="stat-label">碰撞</span>
        <span class="stat-value">{{ collisionCount }}</span>
      </div>
      <div class="stats-row">
        <span class="stat-label">距离</span>
        <span class="stat-value">{{ (distance * 1000).toFixed(0) }}m</span>
      </div>
    </div>
    
    <!-- 任务信息面板 -->
    <div class="mission-panel" v-if="currentMission">
      <div class="mission-header">
        <span class="mission-label">配送任务</span>
        <span class="mission-difficulty">
          <span v-for="i in currentMission.difficulty" :key="i" class="star">★</span>
        </span>
      </div>
      <div class="mission-name">{{ currentMission.name }}</div>
      <div class="mission-cargo">
        <span class="cargo-icon">📦</span>
        <span>{{ currentMission.cargo.name }} ({{ currentMission.cargo.weight }}kg)</span>
      </div>
      <div class="mission-stats">
        <div class="stat-item">
          <span class="stat-icon">🎯</span>
          <span class="stat-val" :class="{ urgent: distToDestination < 50 }">{{ distToDestination.toFixed(0) }}m</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">⏱</span>
          <span class="stat-val" :class="{ urgent: remainingTime < 60 }">{{ formatMissionTime(remainingTime) }}</span>
        </div>
      </div>
      <div class="mission-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: missionProgress + '%' }"></div>
        </div>
        <span class="progress-text">{{ missionProgress.toFixed(0) }}%</span>
      </div>
    </div>
    
    <!-- 碰撞提示小屏幕 -->
    <transition name="collision-fade">
      <div class="collision-toast" v-if="isCollisionWarning">
        <div class="toast-icon">⚠️</div>
        <div class="toast-content">
          <div class="toast-title">发生碰撞</div>
          <div class="toast-detail">-10分</div>
        </div>
      </div>
    </transition>
    
    <!-- 教程覆盖层 -->
    <div class="tutorial-overlay" v-if="tutorialActive && currentTutorialStep">
      <div class="tutorial-backdrop"></div>
      <div class="tutorial-panel">
        <div class="tutorial-header">
          <span class="tutorial-badge">教程</span>
          <span class="tutorial-progress">{{ tutorialStepIndex + 1 }}/{{ tutorialTotalSteps }}</span>
        </div>
        <div class="tutorial-title">{{ currentTutorialStep.title }}</div>
        <div class="tutorial-desc">{{ currentTutorialStep.description }}</div>
        <div class="tutorial-instruction">
          <span class="instruction-icon">👉</span>
          <span>{{ currentTutorialStep.instruction }}</span>
        </div>
        <div class="tutorial-actions">
          <button class="btn-skip" @click="skipTutorial">跳过</button>
          <button class="btn-next" @click="nextTutorialStep" v-if="currentTutorialStep.action === 'wait'">继续</button>
        </div>
      </div>
    </div>
    
    <!-- 右侧摄像头视图 (上下叠放) -->
    <div class="camera-panel">
      <div class="camera-view">
        <canvas ref="frontCameraRef" class="camera-canvas"></canvas>
        <div class="camera-label">前置摄像头</div>
        <div class="camera-crosshair">+</div>
      </div>
      <div class="camera-view">
        <canvas ref="downCameraRef" class="camera-canvas"></canvas>
        <div class="camera-label">下置摄像头</div>
        <div class="altitude-ruler">{{ altitude.toFixed(1) }}m</div>
      </div>
    </div>
    
    <!-- 小地图 -->
    <div class="minimap-container">
      <canvas ref="minimapRef" class="minimap-canvas"></canvas>
      <div class="minimap-compass">
        <span class="compass-n">N</span>
      </div>
      <div class="minimap-info">
        <span>{{ dronePos.x.toFixed(0) }}, {{ dronePos.z.toFixed(0) }}</span>
      </div>
    </div>
    
    <!-- 左下角仪表盘组（速度+电量） -->
    <div class="gauge-group">
      <div class="gauge-item">
        <svg viewBox="0 0 80 80" class="gauge-svg">
          <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="6"/>
          <circle cx="40" cy="40" r="35" fill="none" stroke="url(#speedGrad)" stroke-width="6"
            :stroke-dasharray="speedArc + ' 220'" stroke-linecap="round" class="gauge-arc"/>
          <defs>
            <linearGradient id="speedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#00d4ff"/>
              <stop offset="100%" style="stop-color:#00ff88"/>
            </linearGradient>
          </defs>
        </svg>
        <div class="gauge-content">
          <span class="gauge-val">{{ speed.toFixed(1) }}</span>
          <span class="gauge-unit">m/s</span>
        </div>
        <div class="gauge-title">速度</div>
      </div>
      <div class="gauge-item">
        <svg viewBox="0 0 80 80" class="gauge-svg">
          <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="6"/>
          <circle cx="40" cy="40" r="35" fill="none" :stroke="batteryColor" stroke-width="6"
            :stroke-dasharray="batteryArc + ' 220'" stroke-linecap="round" class="gauge-arc"/>
        </svg>
        <div class="gauge-content">
          <span class="gauge-val" :style="{ color: batteryColor }">{{ Math.floor(battery) }}</span>
          <span class="gauge-unit">%</span>
        </div>
        <div class="gauge-title">电量</div>
      </div>
    </div>
    
    <!-- 顶部横向罗盘条 -->
    <div class="compass-strip">
      <div class="compass-tape">
        <div v-for="tick in visibleTicks" :key="tick.value" 
             class="tick" :class="{ major: tick.isMajor }"
             :style="{ transform: `translateX(${tick.offset}px)` }">
          <span v-if="tick.isMajor" class="tick-label">
            {{ tick.label }}
          </span>
        </div>
      </div>
      <div class="compass-center-mark">▼</div>
      <div class="compass-reading">{{ Math.floor(heading) }}°</div>
    </div>
    
    <!-- 可展开信息面板 -->
    <div class="info-panel" :class="{ expanded: showInfoPanel }">
      <div class="panel-tabs">
        <div class="tab" :class="{ active: infoTab === 'order' }" @click="infoTab = 'order'">订单</div>
        <div class="tab" :class="{ active: infoTab === 'weather' }" @click="infoTab = 'weather'">天气</div>
      </div>
      <div class="panel-content" v-if="infoTab === 'order'">
        <div class="info-row"><span>订单号</span><span>#20260119-001</span></div>
        <div class="info-row"><span>收件人</span><span>张先生</span></div>
        <div class="info-row"><span>货物</span><span>快递包裹 (1.2kg)</span></div>
        <div class="info-row"><span>距离</span><span>{{ distance.toFixed(2) }}km</span></div>
        <div class="info-row"><span>预计</span><span>{{ Math.ceil(distance / 0.5) }}分钟</span></div>
      </div>
      <div class="panel-content" v-if="infoTab === 'weather'">
        <div class="info-row"><span>温度</span><span>22°C</span></div>
        <div class="info-row"><span>湿度</span><span>65%</span></div>
        <div class="info-row"><span>风速</span><span>{{ windSpeed.toFixed(1) }}m/s {{ windDir }}</span></div>
        <div class="info-row"><span>能见度</span><span>良好</span></div>
        <div class="info-row"><span>适飞</span><span>⭐⭐⭐⭐</span></div>
      </div>
    </div>
    
    <!-- 底部数据栏 -->
    <div class="bottom-data-bar">
      <div class="data-item">
        <span class="data-label">ALT</span>
        <span class="data-value">{{ altitude.toFixed(1) }}<small>m</small></span>
      </div>
      <div class="data-item">
        <span class="data-label">DST</span>
        <span class="data-value">{{ distance.toFixed(2) }}<small>km</small></span>
      </div>
      <div class="data-item">
        <span class="data-label">HDG</span>
        <span class="data-value">{{ Math.floor(heading) }}<small>°</small></span>
      </div>
      <div class="data-item">
        <span class="data-label">VS</span>
        <span class="data-value">{{ verticalSpeed.toFixed(1) }}<small>m/s</small></span>
      </div>
    </div>
    
    <!-- 底部控制区 -->
    <div class="control-area">
      <div class="control-left">
        <div class="action-btn" :class="{ active: isUnlocked }" @click="toggleUnlock">
          <span class="btn-icon">{{ isUnlocked ? '○' : '●' }}</span>
          <span class="btn-text">{{ isUnlocked ? 'LOCK' : 'ARM' }}</span>
        </div>
        <div class="action-btn" @click="returnHome">
          <span class="btn-icon">RTH</span>
          <span class="btn-text">返航</span>
        </div>
      </div>
      
      <div class="joystick-area">
        <div class="joystick-container">
          <div class="joystick-base" @mousedown="startLeftJoystick" @touchstart.prevent="startLeftJoystick">
            <div class="joystick-handle" :style="leftJoystickStyle"></div>
          </div>
          <span class="joystick-label">油门/偏航</span>
        </div>
        
        <div class="center-display">
          <div class="pos-display">
            <span>X: {{ dronePos.x.toFixed(0) }}</span>
            <span>Z: {{ dronePos.z.toFixed(0) }}</span>
          </div>
        </div>
        
        <div class="joystick-container">
          <div class="joystick-base" @mousedown="startRightJoystick" @touchstart.prevent="startRightJoystick">
            <div class="joystick-handle" :style="rightJoystickStyle"></div>
          </div>
          <span class="joystick-label">俯仰/横滚</span>
        </div>
      </div>
      
      <div class="control-right">
        <div class="action-btn" @click="resetCamera">
          <span class="btn-icon">CAM</span>
          <span class="btn-text">视角</span>
        </div>
        <div class="action-btn land-btn" @click="autoLand">
          <span class="btn-icon">▼</span>
          <span class="btn-text">降落</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DroneModel, FlightPhysics, InputController, CollisionSystem, TrafficSystem, MissionManager, TutorialManager, type ControlInput, type DeliveryTask, type TutorialStep } from '@/engine'
import { fetchBuildingsFromOSM, buildingsToMesh, createGround, fetchRoadsFromOSM, roadsToMesh, TIANYI_CENTER } from '@/utils/osmLoader'
declare const uni: any

// 城市模型加载器
const gltfLoader = new GLTFLoader()

// 摄像头 Canvas 引用
const canvasRef = ref<HTMLCanvasElement | null>(null)
const frontCameraRef = ref<HTMLCanvasElement | null>(null)
const downCameraRef = ref<HTMLCanvasElement | null>(null)
const minimapRef = ref<HTMLCanvasElement | null>(null)

// 基础飞行状态
const isUnlocked = ref(false)
const altitude = ref(0)
const speed = ref(0)
const battery = ref(100)
const elapsedTime = ref(0)
const dronePos = reactive({ x: 0, y: 0, z: 0 })

// 信号状态
const gpsCount = ref(14)
const rcSignal = ref(95)
const videoSignal = ref(88)

// 飞行参数
const heading = ref(0)          // 航向角 0-360
const pitch = ref(0)            // 俯仰角
const roll = ref(0)             // 横滚角
const verticalSpeed = ref(0)    // 垂直速度
const distance = ref(0)         // 累计里程 (km)

// 实时评分系统
const realTimeScore = ref(100)  // 当前分数
const collisionCount = ref(0)   // 碰撞次数
const isCollisionWarning = ref(false)  // 碰撞警告
const nearestObstacle = ref(999)  // 最近障碍物距离

// 任务系统状态
const currentMission = ref<DeliveryTask | null>(null)
const distToDestination = ref(0)  // 到目的地距离
const remainingTime = ref(0)      // 剩余时间
const missionProgress = ref(0)    // 任务进度百分比
let destinationMarker: THREE.Group | null = null

// 教程系统状态
const tutorialActive = ref(false)
const currentTutorialStep = ref<TutorialStep | null>(null)
const tutorialStepIndex = ref(0)
const tutorialTotalSteps = ref(0)

// 罗盘刻度计算
const visibleTicks = computed(() => {
  const ticks = []
  const currentHeading = heading.value
  
  // 遍历所有可能的刻度 (0, 5, 10 ... 355)
  for (let i = 0; i < 360; i += 5) {
    let delta = i - currentHeading
    // 处理循环衔接 (例如 355度 和 5度 距离为 10度)
    if (delta < -180) delta += 360
    if (delta > 180) delta -= 360
    
    // 计算像素偏移 (1度 = 2px)
    const offset = delta * 2
    
    // 只渲染可见区域内的刻度 (宽度300px -> ±150px，留点余量 ±180)
    if (Math.abs(offset) < 180) {
      ticks.push({
        value: i,
        label: getCompassLabel(i),
        isMajor: i % 30 === 0,
        offset
      })
    }
  }
  return ticks
})

// 飞行模式和状态
const flightMode = ref('P')     // P/S/A 模式
const systemStatus = ref('good')
const statusMessage = ref('准备就绪')

// 天气信息
const windSpeed = ref(3.2)
const windDir = ref('东北')

// UI 状态
const showInfoPanel = ref(false)
const infoTab = ref('order')

// 摇杆 UI 状态
const leftJoystick = reactive({ x: 0, y: 0 })
const rightJoystick = reactive({ x: 0, y: 0 })

const leftJoystickStyle = computed(() => ({
  transform: `translate(${leftJoystick.x * 30}px, ${-leftJoystick.y * 30}px)`
}))
const rightJoystickStyle = computed(() => ({
  transform: `translate(${rightJoystick.x * 30}px, ${-rightJoystick.y * 30}px)`
}))

// 圆形仪表盘计算属性
const speedArc = computed(() => {
  // 速度表: 0-30 m/s 映射到 0-180 度弧长
  const maxSpeed = 30
  const ratio = Math.min(speed.value / maxSpeed, 1)
  return ratio * 157  // 半圆弧长 = π * r ≈ 157
})

const batteryArc = computed(() => {
  // 电量表: 0-100% 映射到弧长
  return (battery.value / 100) * 157
})

const batteryColor = computed(() => {
  if (battery.value < 25) return '#ff3b30'
  if (battery.value < 50) return '#ff9500'
  return '#34c759'
})

// Three.js 对象
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let drone: THREE.Group
let clock: THREE.Clock
let animationId: number
let timer: number

// 引擎模块实例
let droneModel: DroneModel
let flightPhysics: FlightPhysics
let inputController: InputController
let collisionSystem: CollisionSystem
let trafficSystem: TrafficSystem
let missionManager: MissionManager
let tutorialManager: TutorialManager

// 附加摄像头和渲染器
let frontCamera: THREE.PerspectiveCamera, downCamera: THREE.PerspectiveCamera
let frontRenderer: THREE.WebGLRenderer, downRenderer: THREE.WebGLRenderer

onMounted(() => {
  // 初始化引擎模块
  inputController = new InputController()
  inputController.setScreenWidth(window.innerWidth)
  flightPhysics = new FlightPhysics({
    mass: 2.5,           // 较轻的质量
    maxThrust: 60,       // 推力
    dragCoefficient: 0.5, // 增加阻力使减速更明显
    maxSpeed: 20,        // 最大速度
    maxAltitude: 250,    // 最大高度
    rotationSpeed: 2.5,  // 旋转速度
    tiltAngle: 0.4,      // 倾斜角度
    gravity: 9.8         // 重力
  })
  
  // 初始化碰撞检测系统 - 增大无人机半径以更容易碰撞
  collisionSystem = new CollisionSystem({ droneRadius: 2.5, warningDistance: 10 })
  collisionSystem.onCollision(() => {
    collisionCount.value++
    realTimeScore.value = Math.max(0, realTimeScore.value - 10)
    isCollisionWarning.value = true
    statusMessage.value = '碰撞！-10分'
    systemStatus.value = 'bad'
    setTimeout(() => {
      isCollisionWarning.value = false
      if (realTimeScore.value > 60) {
        statusMessage.value = '正常飞行'
        systemStatus.value = 'good'
      }
    }, 2000)
  })
  collisionSystem.onWarning((dist) => {
    nearestObstacle.value = dist
    if (dist < 5) {
      statusMessage.value = '障碍物接近'
      systemStatus.value = 'warn'
    }
  })
  
  // 初始化交通系统
  trafficSystem = new TrafficSystem()
  
  // 初始化任务管理器并开始默认任务
  missionManager = new MissionManager()
  startDefaultMission()
  
  // 初始化教程系统
  initTutorial()
  
  // 初始化 Three.js
  clock = new THREE.Clock()
  initThreeJS()
  startAnimation()
  
  // 定时器：更新电量和时间
  timer = window.setInterval(() => {
    if (isUnlocked.value) {
      elapsedTime.value++
      battery.value = Math.max(0, battery.value - 0.03)
      
      // 任务倒计时
      if (currentMission.value && remainingTime.value > 0) {
        remainingTime.value--
      }
    }
  }, 1000)
  
  // 鼠标/触摸事件
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd)
  window.addEventListener('resize', onResize)
  
  // 键盘事件（新增）
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  clearInterval(timer)
  cancelAnimationFrame(animationId)
  clearInterval(timer)
  renderer?.dispose()
  frontRenderer?.dispose()
  downRenderer?.dispose()
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})

function initThreeJS() {
  const canvas = canvasRef.value!
  const width = window.innerWidth
  const height = window.innerHeight
  
  // 场景
  scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x88bbdd, 300, 1200)
  
  // 创建渐变天空
  createSky()
  
  // 相机
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000)
  camera.position.set(0, 80, 120)
  camera.lookAt(0, 30, 0)
  
  // 渲染器
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  
  // 环境光（半球光 - 模拟天空和地面光照）
  const hemiLight = new THREE.HemisphereLight(0x88ccff, 0x446644, 0.6)
  hemiLight.position.set(0, 200, 0)
  scene.add(hemiLight)
  
  // 环境光补充
  const ambient = new THREE.AmbientLight(0xffffff, 0.3)
  scene.add(ambient)
  
  // 主太阳光（温暖色调）
  const sun = new THREE.DirectionalLight(0xfffaf0, 1.0)
  sun.position.set(150, 200, 100)
  sun.castShadow = true
  sun.shadow.mapSize.width = 4096
  sun.shadow.mapSize.height = 4096
  sun.shadow.camera.near = 10
  sun.shadow.camera.far = 800
  sun.shadow.camera.left = -300
  sun.shadow.camera.right = 300
  sun.shadow.camera.top = 300
  sun.shadow.camera.bottom = -300
  sun.shadow.bias = -0.0001
  scene.add(sun)
  
  // 补光（模拟天空反射）
  const fillLight = new THREE.DirectionalLight(0x88aacc, 0.3)
  fillLight.position.set(-100, 80, -100)
  scene.add(fillLight)
  
  // 地面 (使用 OSM 加载器的地面)
  const ground = createGround(2000)
  scene.add(ground)
  
  // 起降平台
  createLandingPad()
  
  // 无人机
  createDrone()
  
  // 加载宁波天一广场真实建筑
  loadRealBuildings()
  
  // 初始化附加摄像头
  setupCameras()
}

// 加载城市模型（优先使用预制GLB模型，否则用OSM数据）
async function loadRealBuildings() {
  console.log('Loading city model...')
  
  // 尝试加载预制的 GLB 城市模型
  try {
    const gltf = await new Promise<any>((resolve, reject) => {
      gltfLoader.load(
        '/models/full_gameready_city_buildings.glb',
        resolve,
        (progress) => console.log('Loading progress:', (progress.loaded / progress.total * 100).toFixed(1) + '%'),
        reject
      )
    })
    
    const cityModel = gltf.scene
    
    // 调整模型比例和位置
    cityModel.scale.set(1, 1, 1)  // 根据需要调整比例
    cityModel.position.set(0, 0, 0)
    
    // 为模型添加阴影
    cityModel.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    
    scene.add(cityModel)
    console.log('Loaded GLB city model successfully!')
    
    // 注册城市模型到碰撞检测系统
    collisionSystem.collectFromGLBModel(cityModel)
    
    // 启动交通系统
    trafficSystem.setScene(scene)
    trafficSystem.spawnVehicles(15)
    
    // 注册车辆到碰撞系统
    collisionSystem.registerVehicles(trafficSystem.getVehicles())
    
    return
  } catch (error) {
    console.warn('Failed to load GLB model, falling back to OSM:', error)
  }
  
  // 如果 GLB 加载失败，使用 OSM 数据作为备用
  const osmConfig = {
    centerLat: TIANYI_CENTER.lat,
    centerLng: TIANYI_CENTER.lng,
    radius: 600,
    defaultHeight: 20,
    levelHeight: 3.5
  }
  
  try {
    const [buildings, roads] = await Promise.all([
      fetchBuildingsFromOSM(osmConfig),
      fetchRoadsFromOSM(osmConfig)
    ])
    
    if (buildings && buildings.length > 0) {
      const buildingGroup = buildingsToMesh(buildings, osmConfig)
      scene.add(buildingGroup)
      console.log(`Loaded ${buildings.length} buildings from OSM`)
    }
    
    if (roads && roads.length > 0) {
      const roadGroup = roadsToMesh(roads, osmConfig)
      scene.add(roadGroup)
      console.log(`Loaded ${roads.length} roads from OSM`)
    }
  } catch (error) {
    console.error('OSM loading also failed:', error)
  }
}

function setupCameras() {
  // 前置摄像头
  const frontCanvas = frontCameraRef.value!
  frontRenderer = new THREE.WebGLRenderer({ canvas: frontCanvas, antialias: true })
  frontRenderer.setSize(160, 100)
  frontRenderer.setPixelRatio(1) // 小窗口无需高DPI
  
  frontCamera = new THREE.PerspectiveCamera(80, 160/100, 0.1, 1000)
  // 假设 Forward 是 +Z，Camera 默认看 -Z，旋转 180 度看 +Z
  frontCamera.rotation.y = Math.PI 
  frontCamera.position.set(0, 0.5, 2.5) // 机头位置
  drone.add(frontCamera) // 绑定到无人机
  
  // 下置摄像头
  const downCanvas = downCameraRef.value!
  downRenderer = new THREE.WebGLRenderer({ canvas: downCanvas, antialias: true })
  downRenderer.setSize(160, 100)
  downRenderer.setPixelRatio(1)
  
  downCamera = new THREE.PerspectiveCamera(80, 160/100, 0.1, 1000)
  downCamera.rotation.x = -Math.PI / 2 // 看向 -Y
  downCamera.position.set(0, -0.5, 0) // 机腹位置
  // 修正下置摄像头方向，使其顶部朝向机头 (+Z)
  // 默认看 -Y，上方向是 +Z (Standard?) 
  // 相机 Up 默认 +Y. Rotate X -90 -> Local Z aligns with World Y. Local Y aligns with World Z? 
  // 需微调，暂定
  
  drone.add(downCamera)
}

function createSky() {
  // 创建天空球
  const skyGeo = new THREE.SphereGeometry(1500, 32, 32)
  
  // 创建渐变天空纹理
  const skyCanvas = document.createElement('canvas')
  skyCanvas.width = 512
  skyCanvas.height = 512
  const skyCtx = skyCanvas.getContext('2d')!
  
  // 从地平线到天顶的渐变
  const gradient = skyCtx.createLinearGradient(0, 512, 0, 0)
  gradient.addColorStop(0, '#c8d8e8')    // 地平线 - 浅蓝灰
  gradient.addColorStop(0.2, '#a8c8e8')  // 低空
  gradient.addColorStop(0.4, '#78a8d8')  // 中低空
  gradient.addColorStop(0.6, '#5088c8')  // 中高空
  gradient.addColorStop(0.8, '#3068a8')  // 高空
  gradient.addColorStop(1, '#204888')    // 天顶 - 深蓝
  
  skyCtx.fillStyle = gradient
  skyCtx.fillRect(0, 0, 512, 512)
  
  // 添加一些云彩效果
  skyCtx.fillStyle = 'rgba(255, 255, 255, 0.1)'
  for (let i = 0; i < 20; i++) {
    const cloudX = Math.random() * 512
    const cloudY = 100 + Math.random() * 200
    const cloudW = 50 + Math.random() * 100
    const cloudH = 20 + Math.random() * 40
    
    skyCtx.beginPath()
    skyCtx.ellipse(cloudX, cloudY, cloudW, cloudH, 0, 0, Math.PI * 2)
    skyCtx.fill()
  }
  
  const skyTexture = new THREE.CanvasTexture(skyCanvas)
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTexture,
    side: THREE.BackSide
  })
  
  const sky = new THREE.Mesh(skyGeo, skyMat)
  scene.add(sky)
}

function createTerrain() {
  const geometry = new THREE.PlaneGeometry(1000, 1000, 200, 200)
  geometry.rotateX(-Math.PI / 2)
  
  // 添加柔和起伏
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const z = positions.getZ(i)
    const dist = Math.sqrt(x * x + z * z)
    
    if (dist > 120) {
      const noise = Math.sin(x * 0.015) * Math.cos(z * 0.015) + 
                    Math.sin(x * 0.03) * Math.cos(z * 0.025) * 0.5
      const height = noise * 12 * Math.min((dist - 120) / 300, 1)
      positions.setY(i, height)
    }
  }
  geometry.computeVertexNormals()
  
  // 创建程序化草地纹理
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  
  // 基础草地色
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 400)
  gradient.addColorStop(0, '#4a7c3f')
  gradient.addColorStop(0.5, '#3d6b35')
  gradient.addColorStop(1, '#2d5a28')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 512)
  
  // 添加草地纹理噪点
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const shade = Math.random() > 0.5 ? '#5a8c4f' : '#2a5020'
    ctx.fillStyle = shade
    ctx.fillRect(x, y, 2 + Math.random() * 3, 1 + Math.random() * 2)
  }
  
  const grassTexture = new THREE.CanvasTexture(canvas)
  grassTexture.wrapS = THREE.RepeatWrapping
  grassTexture.wrapT = THREE.RepeatWrapping
  grassTexture.repeat.set(40, 40)
  
  const material = new THREE.MeshStandardMaterial({
    map: grassTexture,
    roughness: 0.9,
    metalness: 0.0
  })
  
  const terrain = new THREE.Mesh(geometry, material)
  terrain.receiveShadow = true
  scene.add(terrain)
  
  // 创建城市道路网格
  createRoads()
  
  // 添加树木
  createTrees()
}

function createRoads() {
  const roadMat = new THREE.MeshStandardMaterial({ 
    color: 0x333340, 
    roughness: 0.7,
    metalness: 0.1
  })
  
  // 主干道（十字形）
  const mainRoadGeo = new THREE.PlaneGeometry(800, 20)
  mainRoadGeo.rotateX(-Math.PI / 2)
  const roadH = new THREE.Mesh(mainRoadGeo, roadMat)
  roadH.position.y = 0.1
  roadH.receiveShadow = true
  scene.add(roadH)
  
  const roadV = new THREE.Mesh(mainRoadGeo, roadMat)
  roadV.rotation.y = Math.PI / 2
  roadV.position.y = 0.1
  roadV.receiveShadow = true
  scene.add(roadV)
  
  // 道路标线
  const lineGeo = new THREE.PlaneGeometry(15, 0.5)
  lineGeo.rotateX(-Math.PI / 2)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  
  for (let i = -350; i < 350; i += 25) {
    const lineH = new THREE.Mesh(lineGeo, lineMat)
    lineH.position.set(i, 0.15, 0)
    scene.add(lineH)
    
    const lineV = new THREE.Mesh(lineGeo, lineMat)
    lineV.position.set(0, 0.15, i)
    lineV.rotation.y = Math.PI / 2
    scene.add(lineV)
  }
  
  // 环形道路
  const ringRadius = 200
  for (let angle = 0; angle < Math.PI * 2; angle += 0.08) {
    const segGeo = new THREE.PlaneGeometry(14, 18)
    segGeo.rotateX(-Math.PI / 2)
    const seg = new THREE.Mesh(segGeo, roadMat)
    seg.position.set(
      Math.cos(angle) * ringRadius,
      0.08,
      Math.sin(angle) * ringRadius
    )
    seg.rotation.y = angle + Math.PI / 2
    seg.receiveShadow = true
    scene.add(seg)
  }
}

function createTrees() {
  const treePositions: {x: number, z: number}[] = []
  
  // 生成随机树木位置（避开道路和建筑区域）
  for (let i = 0; i < 100; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = 50 + Math.random() * 400
    const x = Math.cos(angle) * dist
    const z = Math.sin(angle) * dist
    
    // 避开道路
    if (Math.abs(x) < 15 || Math.abs(z) < 15) continue
    if (Math.abs(Math.sqrt(x*x + z*z) - 200) < 15) continue
    
    treePositions.push({ x, z })
  }
  
  treePositions.forEach(pos => {
    const treeGroup = new THREE.Group()
    
    // 树干
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 4 + Math.random() * 2, 8)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 })
    const trunk = new THREE.Mesh(trunkGeo, trunkMat)
    trunk.castShadow = true
    treeGroup.add(trunk)
    
    // 树冠（多层球体）
    const foliageColor = Math.random() > 0.3 ? 0x228b22 : 0x2d6b2d
    const foliageMat = new THREE.MeshStandardMaterial({ 
      color: foliageColor, 
      roughness: 0.8 
    })
    
    const sizes = [2.5, 2, 1.5]
    const heights = [3, 4.5, 5.8]
    sizes.forEach((size, i) => {
      const foliageGeo = new THREE.SphereGeometry(size + Math.random() * 0.5, 8, 6)
      const foliage = new THREE.Mesh(foliageGeo, foliageMat)
      foliage.position.y = heights[i]
      foliage.castShadow = true
      treeGroup.add(foliage)
    })
    
    treeGroup.position.set(pos.x, 0, pos.z)
    treeGroup.scale.setScalar(0.8 + Math.random() * 0.6)
    scene.add(treeGroup)
  })
}

function createLandingPad() {
  // 停机坪基座 (缩小约3倍，与城市模型比例协调)
  const baseGeo = new THREE.CylinderGeometry(5, 5.5, 0.3, 32)
  const baseMat = new THREE.MeshStandardMaterial({ 
    color: 0x555555, 
    roughness: 0.6,
    metalness: 0.2
  })
  const base = new THREE.Mesh(baseGeo, baseMat)
  base.position.y = 0.15
  base.receiveShadow = true
  base.castShadow = true
  scene.add(base)
  
  // 平台表面
  const padGeo = new THREE.CylinderGeometry(4, 4, 0.15, 32)
  const padMat = new THREE.MeshStandardMaterial({ 
    color: 0x2a2a2a,
    roughness: 0.5,
    metalness: 0.3
  })
  const pad = new THREE.Mesh(padGeo, padMat)
  pad.position.y = 0.38
  pad.receiveShadow = true
  scene.add(pad)
  
  // H 标记
  const hCanvas = document.createElement('canvas')
  hCanvas.width = 256
  hCanvas.height = 256
  const hCtx = hCanvas.getContext('2d')!
  
  // 圆形边框
  hCtx.strokeStyle = '#ffcc00'
  hCtx.lineWidth = 12
  hCtx.beginPath()
  hCtx.arc(128, 128, 110, 0, Math.PI * 2)
  hCtx.stroke()
  
  // H 字母
  hCtx.fillStyle = '#ffcc00'
  hCtx.font = 'bold 140px Arial'
  hCtx.textAlign = 'center'
  hCtx.textBaseline = 'middle'
  hCtx.fillText('H', 128, 128)
  
  const hTexture = new THREE.CanvasTexture(hCanvas)
  const hGeo = new THREE.PlaneGeometry(5, 5)
  const hMat = new THREE.MeshBasicMaterial({ 
    map: hTexture, 
    transparent: true,
    side: THREE.DoubleSide
  })
  const hMark = new THREE.Mesh(hGeo, hMat)
  hMark.rotation.x = -Math.PI / 2
  hMark.position.y = 0.47
  scene.add(hMark)
  
  // 灯光标记
  const lightPositions = [
    { angle: 0 }, { angle: Math.PI / 2 }, 
    { angle: Math.PI }, { angle: Math.PI * 1.5 }
  ]
  lightPositions.forEach(({ angle }) => {
    const lightGeo = new THREE.SphereGeometry(0.1, 8, 8)
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    const light = new THREE.Mesh(lightGeo, lightMat)
    light.position.set(
      Math.cos(angle) * 3.8,
      0.5,
      Math.sin(angle) * 3.8
    )
    scene.add(light)
  })
}

function createDrone() {
  // 使用 DroneModel 引擎模块创建无人机（缩小以适应城市模型比例）
  droneModel = new DroneModel({ scale: 0.5 })
  drone = droneModel.getObject3D()
  drone.position.set(0, 1, 0)
  scene.add(drone)
  
  // 初始化物理引擎位置
  flightPhysics.setPosition(0, 1, 0)
}

function createBuildings() {
  // 建筑物分布在四个象限，避开道路
  const buildingConfigs = [
    // 商业区 - 高层建筑
    ...generateBuildingPositions(80, 180, 8, 'commercial'),
    // 住宅区 - 中低层建筑  
    ...generateBuildingPositions(100, 350, 20, 'residential'),
    // 办公区 - 现代建筑
    ...generateBuildingPositions(220, 380, 12, 'office')
  ]
  
  buildingConfigs.forEach(config => {
    const building = createSingleBuilding(config)
    scene.add(building)
  })
}

function generateBuildingPositions(minDist: number, maxDist: number, count: number, type: string) {
  const positions: any[] = []
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3
    const dist = minDist + Math.random() * (maxDist - minDist)
    const x = Math.cos(angle) * dist
    const z = Math.sin(angle) * dist
    
    // 避开主干道
    if (Math.abs(x) < 25 || Math.abs(z) < 25) continue
    
    positions.push({
      x, z, type,
      width: type === 'commercial' ? 18 + Math.random() * 15 : 12 + Math.random() * 12,
      height: type === 'commercial' ? 50 + Math.random() * 80 :
              type === 'office' ? 35 + Math.random() * 45 : 15 + Math.random() * 30,
      depth: type === 'commercial' ? 18 + Math.random() * 15 : 12 + Math.random() * 12
    })
  }
  
  return positions
}

function createSingleBuilding(config: any) {
  const { x, z, type, width, height, depth } = config
  const buildingGroup = new THREE.Group()
  
  // 创建建筑物墙面纹理（带窗户）
  const wallTexture = createBuildingTexture(type, width, height)
  
  // 主体建筑
  const bodyGeo = new THREE.BoxGeometry(width, height, depth)
  const materials = [
    new THREE.MeshStandardMaterial({ map: wallTexture.clone(), roughness: 0.7 }), // 右
    new THREE.MeshStandardMaterial({ map: wallTexture.clone(), roughness: 0.7 }), // 左
    new THREE.MeshStandardMaterial({ color: getBaseColor(type), roughness: 0.5, metalness: 0.3 }), // 上
    new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 }), // 下
    new THREE.MeshStandardMaterial({ map: wallTexture.clone(), roughness: 0.7 }), // 前
    new THREE.MeshStandardMaterial({ map: wallTexture.clone(), roughness: 0.7 })  // 后
  ]
  
  const body = new THREE.Mesh(bodyGeo, materials)
  body.position.y = height / 2
  body.castShadow = true
  body.receiveShadow = true
  buildingGroup.add(body)
  
  // 屋顶设施（商业/办公楼）
  if (type !== 'residential' && Math.random() > 0.3) {
    // 空调外机/设备
    const equipGeo = new THREE.BoxGeometry(width * 0.3, 3, depth * 0.3)
    const equipMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.8 })
    const equip = new THREE.Mesh(equipGeo, equipMat)
    equip.position.set(
      (Math.random() - 0.5) * width * 0.5,
      height + 1.5,
      (Math.random() - 0.5) * depth * 0.5
    )
    equip.castShadow = true
    buildingGroup.add(equip)
  }
  
  // 住宅楼阳台
  if (type === 'residential' && Math.random() > 0.5) {
    const floors = Math.floor(height / 4)
    for (let floor = 1; floor < floors; floor++) {
      if (Math.random() > 0.4) {
        const balconyGeo = new THREE.BoxGeometry(width * 0.15, 0.3, 2)
        const balconyMat = new THREE.MeshStandardMaterial({ color: 0x888888 })
        const balcony = new THREE.Mesh(balconyGeo, balconyMat)
        balcony.position.set(
          width / 2 + 1,
          floor * 4,
          (Math.random() - 0.5) * depth * 0.6
        )
        balcony.castShadow = true
        buildingGroup.add(balcony)
      }
    }
  }
  
  buildingGroup.position.set(x, 0, z)
  buildingGroup.rotation.y = Math.random() * Math.PI * 0.1
  
  return buildingGroup
}

function createBuildingTexture(type: string, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  
  // 基础墙面颜色
  const baseColor = getBaseColorHex(type)
  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, 256, 512)
  
  // 添加墙面纹理变化
  ctx.fillStyle = 'rgba(0,0,0,0.05)'
  for (let y = 0; y < 512; y += 32) {
    ctx.fillRect(0, y, 256, 2)
  }
  
  // 绘制窗户
  const windowColor = type === 'commercial' ? '#1a3a5c' : 
                      type === 'office' ? '#2a4a6a' : '#3a4a5a'
  const windowGlowColor = type === 'commercial' ? 'rgba(100,180,255,0.3)' :
                          'rgba(255,220,150,0.2)'
  
  const cols = Math.floor(width / 4)
  const rows = Math.floor(height / 4)
  const windowWidth = 200 / cols
  const windowHeight = 400 / rows
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const wx = 20 + col * (236 / cols)
      const wy = 30 + row * (450 / rows)
      
      // 窗框
      ctx.fillStyle = '#222'
      ctx.fillRect(wx - 1, wy - 1, windowWidth * 0.7 + 2, windowHeight * 0.6 + 2)
      
      // 窗户玻璃
      ctx.fillStyle = windowColor
      ctx.fillRect(wx, wy, windowWidth * 0.7, windowHeight * 0.6)
      
      // 随机点亮窗户
      if (Math.random() > 0.6) {
        ctx.fillStyle = windowGlowColor
        ctx.fillRect(wx, wy, windowWidth * 0.7, windowHeight * 0.6)
      }
      
      // 窗户反光
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      ctx.fillRect(wx, wy, windowWidth * 0.3, windowHeight * 0.2)
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  
  return texture
}

function getBaseColor(type: string): number {
  const colors: {[key: string]: number[]} = {
    commercial: [0x4a5568, 0x2d3748, 0x1a202c, 0x5a6978],
    office: [0x718096, 0x4a5568, 0x63707e, 0x5a6a7a],
    residential: [0xc8a882, 0xd4b896, 0xe8d8c0, 0xb89878]
  }
  const typeColors = colors[type] || colors.commercial
  return typeColors[Math.floor(Math.random() * typeColors.length)]
}

function getBaseColorHex(type: string): string {
  const colors: {[key: string]: string[]} = {
    commercial: ['#4a5568', '#2d3748', '#1a202c', '#5a6978'],
    office: ['#718096', '#4a5568', '#63707e', '#5a6a7a'],
    residential: ['#c8a882', '#d4b896', '#e8d8c0', '#b89878']
  }
  const typeColors = colors[type] || colors.commercial
  return typeColors[Math.floor(Math.random() * typeColors.length)]
}

function startAnimation() {
  const animate = () => {
    animationId = requestAnimationFrame(animate)
    
    // 获取时间增量
    const deltaTime = clock.getDelta()
    
    // 获取键盘输入（与摇杆 UI 合并）
    const keyboardInput = inputController.getState()
    
    // 合并输入：摇杆 UI + 键盘
    const mergedLeft = {
      x: leftJoystick.x || keyboardInput.leftJoystick.x,
      y: leftJoystick.y || keyboardInput.leftJoystick.y
    }
    const mergedRight = {
      x: rightJoystick.x || keyboardInput.rightJoystick.x,
      y: rightJoystick.y || keyboardInput.rightJoystick.y
    }
    
    // 如果引擎运行中，更新物理和模型
    if (flightPhysics.isRunning()) {
      // 构造控制输入
      const controlInput: ControlInput = {
        throttle: mergedLeft.y,
        yaw: mergedLeft.x,
        pitch: mergedRight.y,
        roll: mergedRight.x
      }
      
      // 更新物理引擎
      flightPhysics.update(deltaTime, controlInput)
      
      // 获取物理状态
      const state = flightPhysics.getState()
      
      // 同步到 3D 模型
      droneModel.setPosition(state.position.x, state.position.y, state.position.z)
      droneModel.setRotation(state.rotation.x, state.rotation.y, state.rotation.z)
      
      // 更新基础 UI 状态
      altitude.value = state.altitude
      speed.value = state.speed
      dronePos.x = state.position.x
      dronePos.z = state.position.z
      
      // 更新专业 HUD 数据
      // 航向角 (rotation.y 是弧度，转为 0-360 度)
      // state.heading 就是 rotation.y (弧度)
      let hdg = (state.heading * 180 / Math.PI)  // 弧度转度数
      hdg = ((hdg % 360) + 360) % 360  // 确保在 0-360 范围
      heading.value = hdg
      console.log('Heading updated:', hdg.toFixed(1), 'state.heading:', state.heading.toFixed(3))
      
      // 俯仰和横滚角 (弧度转度数)
      pitch.value = state.rotation.x * 180 / Math.PI
      roll.value = state.rotation.z * 180 / Math.PI
      
      // 垂直速度
      verticalSpeed.value = state.velocity.y
      
      // 累计里程
      distance.value += state.speed * deltaTime / 1000  // 转换为 km
      
      // 碰撞检测
      const dronePosition = new THREE.Vector3(state.position.x, state.position.y, state.position.z)
      collisionSystem.update(dronePosition)
      
      // 更新状态消息（仅在非碰撞警告时）
      if (!isCollisionWarning.value) {
        if (state.altitude < 5) {
          statusMessage.value = '低空飞行'
          systemStatus.value = 'warn'
        } else if (state.speed > 15) {
          statusMessage.value = '高速飞行'
          systemStatus.value = 'warn'
        } else if (nearestObstacle.value > 8) {
          statusMessage.value = '正常飞行'
          systemStatus.value = 'good'
        }
      }
    }
    
    // 更新交通系统（车辆移动）
    trafficSystem.update(deltaTime)
    
    // 更新任务进度
    if (flightPhysics.isRunning()) {
      updateMissionProgress()
    }
    
    // 更新无人机动画（螺旋桨等）
    if (droneModel) {
      droneModel.update(deltaTime)
    }
    
    // 相机跟随
    if (drone) {
      const targetCamPos = new THREE.Vector3(
        drone.position.x - Math.sin(drone.rotation.y) * 50,
        drone.position.y + 30,
        drone.position.z - Math.cos(drone.rotation.y) * 50
      )
      camera.position.lerp(targetCamPos, 0.05)
      camera.lookAt(drone.position)
    }
    
    renderer.render(scene, camera)
    
    // 渲染附加摄像头
    if (frontRenderer && frontCamera) frontRenderer.render(scene, frontCamera)
    if (downRenderer && downCamera) downRenderer.render(scene, downCamera)
    
    // 检测教程步骤条件
    checkTutorialCondition()
    
    // 更新小地图
    updateMinimap()
  }
  animate()
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
  let dx = (x - joystickCenter.x) / 40
  let dy = -(y - joystickCenter.y) / 40
  const mag = Math.sqrt(dx * dx + dy * dy)
  if (mag > 1) { dx /= mag; dy /= mag }
  
  // 更新 UI 状态（直接用于物理引擎输入）
  if (activeJoystick === 'left') { 
    leftJoystick.x = dx
    leftJoystick.y = dy
  } else { 
    rightJoystick.x = dx
    rightJoystick.y = dy
  }
}

function onMouseUp() { resetJoystick() }
function onTouchEnd() { resetJoystick() }

function resetJoystick() {
  if (activeJoystick === 'left') { 
    leftJoystick.x = 0
    leftJoystick.y = 0
  } else if (activeJoystick === 'right') { 
    rightJoystick.x = 0
    rightJoystick.y = 0
  }
  activeJoystick = null
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  inputController?.setScreenWidth(window.innerWidth)
}

// 键盘事件处理
function onKeyDown(e: KeyboardEvent) {
  inputController.handleKeyDown(e.key)
  
  // 空格键切换解锁
  if (e.key === ' ') {
    toggleUnlock()
  }
}

function onKeyUp(e: KeyboardEvent) {
  inputController.handleKeyUp(e.key)
}

// 罗盘方向标签
function getCompassLabel(deg: number): string {
  const directions: { [key: number]: string } = {
    0: 'N', 30: '30', 60: '60',
    90: 'E', 120: '120', 150: '150',
    180: 'S', 210: '210', 240: '240',
    270: 'W', 300: '300', 330: '330'
  }
  return directions[deg] || ''
}

// 功能按钮
const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

function toggleUnlock() {
  if (flightPhysics.isRunning()) {
    // 关闭引擎 - 降落
    flightPhysics.stopEngine()
    droneModel.stopPropellers()
    isUnlocked.value = false
    
    // 重置位置
    flightPhysics.setPosition(0, 3, 0)
    flightPhysics.setRotation(0, 0, 0)
    droneModel.setPosition(0, 3, 0)
    droneModel.setRotation(0, 0, 0)
    
    altitude.value = 3
    speed.value = 0
    inputController.reset()
    
    uni.showToast({ title: '已降落', icon: 'none' })
  } else {
    // 启动引擎 - 起飞
    flightPhysics.startEngine()
    droneModel.startPropellers()
    isUnlocked.value = true
    
    // 设置起飞高度
    flightPhysics.setPosition(0, 10, 0)
    droneModel.setPosition(0, 10, 0)
    
    uni.showToast({ title: '无人机已解锁', icon: 'success' })
  }
}

function resetCamera() {
  const pos = droneModel.getPosition()
  camera.position.set(pos.x, pos.y + 50, pos.z + 80)
}

function openMenu() {
  uni.showActionSheet({
    itemList: ['重置位置', '完成任务', '切换模式', '退出'],
    success: (res: { tapIndex: number }) => {
      if (res.tapIndex === 0) {
        // 重置位置
        flightPhysics.setPosition(0, 10, 0)
        flightPhysics.setRotation(0, 0, 0)
        droneModel.setPosition(0, 10, 0)
        droneModel.setRotation(0, 0, 0)
        distance.value = 0
      }
      else if (res.tapIndex === 1) uni.navigateTo({ url: '/pages/result/index' })
      else if (res.tapIndex === 2) {
        // 切换飞行模式
        const modes = ['P', 'S', 'A']
        const idx = modes.indexOf(flightMode.value)
        flightMode.value = modes[(idx + 1) % 3]
        uni.showToast({ title: `切换到 ${flightMode.value} 模式`, icon: 'none' })
      }
      else if (res.tapIndex === 3) uni.navigateBack()
    }
  })
}

function toggleInfoPanel() {
  showInfoPanel.value = !showInfoPanel.value
}

function returnHome() {
  if (!flightPhysics.isRunning()) {
    uni.showToast({ title: '请先解锁无人机', icon: 'none' })
    return
  }
  uni.showToast({ title: '返航中...', icon: 'loading' })
  statusMessage.value = '返航中'
  systemStatus.value = 'warn'
  // 实际实现中会有自动导航逻辑
}

function autoLand() {
  if (!flightPhysics.isRunning()) {
    uni.showToast({ title: '无人机未起飞', icon: 'none' })
    return
  }
  uni.showToast({ title: '自动降落中...', icon: 'loading' })
  statusMessage.value = '降落中'
  systemStatus.value = 'warn'
  // 实际实现中会有自动降落逻辑
}

// ======== 任务系统函数 ========

function startDefaultMission() {
  // 默认开始第一个任务
  const tasks = missionManager.getTasks()
  if (tasks.length > 0) {
    missionManager.startTask(tasks[0].id)
    currentMission.value = tasks[0]
    remainingTime.value = tasks[0].timeLimit || 300
    
    // 计算初始距离并创建目的地标记
    const dest = tasks[0].destination
    distToDestination.value = Math.sqrt(dest.x * dest.x + dest.z * dest.z)
    
    // 延迟创建目的地标记（等待场景初始化完成）
    setTimeout(() => {
      createDestinationMarker(dest)
    }, 1000)
  }
}

function createDestinationMarker(dest: { x: number, y: number, z: number }) {
  if (destinationMarker) {
    scene.remove(destinationMarker)
  }
  
  destinationMarker = new THREE.Group()
  
  // 光柱（垂直圆柱体）
  const pillarGeo = new THREE.CylinderGeometry(2, 2, 150, 16, 1, true)
  const pillarMat = new THREE.MeshBasicMaterial({
    color: 0x00ff88,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  })
  const pillar = new THREE.Mesh(pillarGeo, pillarMat)
  pillar.position.y = 75
  destinationMarker.add(pillar)
  
  // 底部光环
  const ringGeo = new THREE.RingGeometry(8, 12, 32)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00ff88,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.5
  destinationMarker.add(ring)
  
  // 内圈脉冲环
  const innerRingGeo = new THREE.RingGeometry(4, 6, 32)
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: 0x00ffaa,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  })
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat)
  innerRing.rotation.x = -Math.PI / 2
  innerRing.position.y = 0.6
  innerRing.name = 'pulseRing'
  destinationMarker.add(innerRing)
  
  // 目标点发光球
  const sphereGeo = new THREE.SphereGeometry(3, 16, 16)
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0x00ff88,
    transparent: true,
    opacity: 0.7
  })
  const sphere = new THREE.Mesh(sphereGeo, sphereMat)
  sphere.position.y = 5
  destinationMarker.add(sphere)
  
  destinationMarker.position.set(dest.x, 0, dest.z)
  scene.add(destinationMarker)
}

function formatMissionTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function updateMissionProgress() {
  if (!currentMission.value) return
  
  const dest = currentMission.value.destination
  const destVec = new THREE.Vector3(dest.x, 0, dest.z)
  const droneVec = new THREE.Vector3(dronePos.x, 0, dronePos.z)
  
  // 更新到目的地距离
  distToDestination.value = destVec.distanceTo(droneVec)
  
  // 更新剩余时间
  if (remainingTime.value > 0) {
    // 每秒在定时器中减少
  }
  
  // 计算任务进度 (已飞距离 / 总距离)
  const totalDist = Math.sqrt(dest.x * dest.x + dest.z * dest.z)
  const flownDist = totalDist - distToDestination.value
  missionProgress.value = Math.min(100, Math.max(0, (flownDist / totalDist) * 100))
  
  // 更新 MissionManager 进度
  missionManager.updateProgress(
    { x: dronePos.x, y: altitude.value, z: dronePos.z },
    speed.value
  )
  
  // 检测是否到达目的地
  if (distToDestination.value < 15 && altitude.value < 10) {
    completeMission()
  }
}

function completeMission() {
  if (!currentMission.value) return
  
  // 计算降落精度 (距离越近精度越高)
  const landingAccuracy = Math.max(0, 1 - (distToDestination.value / 15))
  
  // 完成任务并获取结果
  const result = missionManager.completeTask(landingAccuracy)
  
  uni.showToast({ title: '任务完成！', icon: 'success' })
  
  // 1.5秒后跳转结果页
  setTimeout(() => {
    uni.navigateTo({
      url: `/pages/result/index?score=${result.totalScore}&stars=${result.starRating}&time=${result.stats.flightTime.toFixed(0)}&distance=${(result.stats.flightDistance).toFixed(2)}`
    })
  }, 1500)
  
  currentMission.value = null
}

// ======== 教程系统函数 ========

function initTutorial() {
  tutorialManager = new TutorialManager()
  
  // 检查URL参数是否需要启动教程
  const urlParams = new URLSearchParams(window.location.search)
  const tutorialId = urlParams.get('tutorial')
  
  if (tutorialId) {
    startTutorial(tutorialId)
  }
}

function startTutorial(tutorialId: string) {
  const tutorial = tutorialManager.startTutorial(tutorialId)
  if (!tutorial) return
  
  tutorialActive.value = true
  tutorialTotalSteps.value = tutorial.steps.length
  tutorialStepIndex.value = 0
  currentTutorialStep.value = tutorial.steps[0]
  
  // 设置回调
  tutorialManager.setCallbacks(
    (stepId) => console.log('Step completed:', stepId),
    (tutId) => {
      uni.showToast({ title: '教程完成！', icon: 'success' })
      tutorialActive.value = false
    }
  )
}

function nextTutorialStep() {
  const nextStep = tutorialManager.nextStep()
  if (nextStep) {
    tutorialStepIndex.value++
    currentTutorialStep.value = nextStep
    
    // 如果是等待类型，启动自动计时器
    if (nextStep.action === 'wait' && nextStep.duration) {
      setTimeout(() => {
        if (tutorialActive.value && currentTutorialStep.value?.id === nextStep.id) {
          nextTutorialStep()
        }
      }, nextStep.duration * 1000)
    }
  } else {
    // 教程完成
    tutorialActive.value = false
    currentTutorialStep.value = null
  }
}

function skipTutorial() {
  tutorialManager.exitTutorial()
  tutorialActive.value = false
  currentTutorialStep.value = null
  uni.showToast({ title: '已跳过教程', icon: 'none' })
}

function checkTutorialCondition() {
  if (!tutorialActive.value || !currentTutorialStep.value) return
  
  const step = currentTutorialStep.value
  
  // 检测 reach 类型的目标
  if (step.action === 'reach') {
    if (step.targetValue?.altitude !== undefined) {
      // 检测是否达到目标高度
      const targetAlt = step.targetValue.altitude
      if (Math.abs(altitude.value - targetAlt) < 5) {
        nextTutorialStep()
      }
    }
    if (step.position) {
      // 检测是否到达目标位置
      const dist = Math.sqrt(
        Math.pow(dronePos.x - step.position.x, 2) +
        Math.pow(dronePos.z - step.position.z, 2)
      )
      if (dist < 20) {
        nextTutorialStep()
      }
    }
  }
  
  // joystick 类型在操作摇杆后自动推进
  if (step.action === 'joystick') {
    const hasInput = Math.abs(leftJoystick.x) > 0.3 || Math.abs(leftJoystick.y) > 0.3 ||
                     Math.abs(rightJoystick.x) > 0.3 || Math.abs(rightJoystick.y) > 0.3
    if (hasInput) {
      // 延迟推进，让用户有时间操作
      setTimeout(() => nextTutorialStep(), 2000)
    }
  }
}

// ======== 小地图函数 ========

function updateMinimap() {
  const canvas = minimapRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const size = 120
  canvas.width = size
  canvas.height = size
  
  const centerX = size / 2
  const centerY = size / 2
  const scale = 0.3 // 1米 = 0.3像素
  
  // 清空画布
  ctx.clearRect(0, 0, size, size)
  
  // 绘制背景
  ctx.fillStyle = 'rgba(0, 20, 40, 0.8)'
  ctx.beginPath()
  ctx.arc(centerX, centerY, size / 2 - 2, 0, Math.PI * 2)
  ctx.fill()
  
  // 绘制距离圈
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)'
  ctx.lineWidth = 1
  for (let r = 20; r <= 50; r += 15) {
    ctx.beginPath()
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  
  // 绘制十字准线
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.beginPath()
  ctx.moveTo(centerX, 5)
  ctx.lineTo(centerX, size - 5)
  ctx.moveTo(5, centerY)
  ctx.lineTo(size - 5, centerY)
  ctx.stroke()
  
  // 绘制目的地标记
  if (currentMission.value) {
    const dest = currentMission.value.destination
    const destX = centerX + (dest.x - dronePos.x) * scale
    const destZ = centerY + (dest.z - dronePos.z) * scale
    
    // 限制在圆形范围内
    const distFromCenter = Math.sqrt(Math.pow(destX - centerX, 2) + Math.pow(destZ - centerY, 2))
    const maxDist = size / 2 - 10
    
    let drawX = destX, drawZ = destZ
    if (distFromCenter > maxDist) {
      const angle = Math.atan2(destZ - centerY, destX - centerX)
      drawX = centerX + Math.cos(angle) * maxDist
      drawZ = centerY + Math.sin(angle) * maxDist
    }
    
    // 目的地图标
    ctx.fillStyle = '#00ff88'
    ctx.beginPath()
    ctx.arc(drawX, drawZ, 6, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.fillStyle = '#000'
    ctx.font = 'bold 10px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('D', drawX, drawZ)
  }
  
  // 绘制无人机图标 (带方向三角形)
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(heading.value * Math.PI / 180)
  
  // 无人机三角形
  ctx.fillStyle = '#00d4ff'
  ctx.beginPath()
  ctx.moveTo(0, -10)
  ctx.lineTo(-6, 8)
  ctx.lineTo(6, 8)
  ctx.closePath()
  ctx.fill()
  
  // 中心点
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(0, 0, 3, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.restore()
  
  // 绘制边框
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(centerX, centerY, size / 2 - 2, 0, Math.PI * 2)
  ctx.stroke()
}
</script>

<style scoped>
/* === DJI 专业风格 CSS Variables === */
:root {
  --dji-bg-dark: #0d0d0d;
  --dji-bg-panel: rgba(20, 20, 20, 0.9);
  --dji-border: rgba(80, 80, 80, 0.5);
  --dji-accent: #00a8e8;
  --dji-green: #00d26a;
  --dji-yellow: #f5a623;
  --dji-red: #e74c3c;
  --dji-text: #ffffff;
  --dji-text-dim: #888888;
}

/* 基础布局 */
.flight-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: var(--dji-bg-dark, #0d0d0d);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: var(--dji-text, #fff);
  -webkit-font-smoothing: antialiased;
}

.flight-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* 顶部状态栏 - DJI 风格 */
.top-status-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
  background: linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 80%, transparent 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  z-index: 100;
}

.status-left, .status-right { display: flex; align-items: center; gap: 10px; }
.status-center { flex: 1; text-align: center; }

.signal-group { display: flex; gap: 8px; }

.signal-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 500;
}
.signal-item.good { color: #00d26a; }
.signal-item.warn { color: #f5a623; }
.signal-item.bad { color: #e74c3c; }

.signal-icon { font-size: 12px; opacity: 0.9; }
.signal-value { font-weight: 600; font-family: 'SF Mono', 'Courier New', monospace; }

.signal-bars {
  display: flex;
  gap: 1px;
  align-items: flex-end;
  height: 12px;
}
.signal-bars .bar {
  width: 3px;
  background: rgba(255,255,255,0.25);
  border-radius: 1px;
}
.signal-bars .bar:nth-child(1) { height: 3px; }
.signal-bars .bar:nth-child(2) { height: 5px; }
.signal-bars .bar:nth-child(3) { height: 7px; }
.signal-bars .bar:nth-child(4) { height: 9px; }
.signal-bars .bar:nth-child(5) { height: 11px; }
.signal-bars .bar.active { background: currentColor; }

/* 飞行模式标签 - DJI 风格 */
.flight-mode {
  padding: 3px 10px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
}

.system-status {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 3px;
  font-weight: 500;
}
.system-status.good { background: rgba(0,210,106,0.15); color: #00d26a; }
.system-status.warn { background: rgba(245,166,35,0.15); color: #f5a623; }
.system-status.bad { background: rgba(231,76,60,0.15); color: #e74c3c; }

.battery-indicator {
  width: 50px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.5);
  border-radius: 3px;
  position: relative;
  padding: 2px;
}
.battery-indicator::after {
  content: '';
  position: absolute;
  right: -5px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 8px;
  background: rgba(255,255,255,0.5);
  border-radius: 0 2px 2px 0;
}
.battery-bar {
  height: 100%;
  background: #34c759;
  border-radius: 1px;
  transition: width 0.3s;
}
.battery-bar.mid { background: #ff9500; }
.battery-bar.low { background: #ff3b30; }
.battery-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}

.flight-timer {
  font-size: 13px;
  font-weight: 500;
  font-family: 'SF Mono', 'Courier New', monospace;
  color: #fff;
  opacity: 0.9;
}

.menu-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  background: rgba(255,255,255,0.08);
  border-radius: 4px;
  transition: background 0.15s;
}
.menu-btn:hover { background: rgba(255,255,255,0.15); }

/* 摄像头面板 - DJI 风格 */
.camera-panel {
  position: absolute;
  right: 12px;
  top: 52px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 50;
}

.camera-view {
  width: 140px;
  height: 90px;
  background: rgba(0,0,0,0.8);
  border: 1px solid rgba(100,100,100,0.4);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.camera-canvas {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.camera-label {
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: 10px;
  color: rgba(255,255,255,0.7);
  background: rgba(0,0,0,0.5);
  padding: 2px 6px;
  border-radius: 3px;
}

.camera-crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  color: rgba(255,255,255,0.5);
  font-weight: 300;
}

.altitude-ruler {
  position: absolute;
  bottom: 3px;
  right: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: rgba(0,0,0,0.6);
  padding: 1px 4px;
  border-radius: 2px;
  font-family: 'SF Mono', 'Courier New', monospace;
}

/* 仪表盘组 - DJI 风格 (左下角) */
.gauge-group {
  position: absolute;
  left: 12px;
  bottom: 150px;
  display: flex;
  gap: 8px;
  z-index: 50;
}

.gauge-item {
  width: 60px;
  height: 60px;
  position: relative;
  background: rgba(0,0,0,0.5);
  border-radius: 50%;
  border: 1px solid rgba(100,100,100,0.3);
}

.gauge-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.gauge-arc {
  transition: stroke-dasharray 0.2s;
}

.gauge-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.gauge-val {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  line-height: 1;
  font-family: 'SF Mono', 'Courier New', monospace;
}

.gauge-item .gauge-unit {
  display: block;
  font-size: 8px;
  color: rgba(255,255,255,0.5);
  margin-top: 1px;
}

.gauge-title {
  position: absolute;
  bottom: -14px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  color: rgba(255,255,255,0.4);
  white-space: nowrap;
}

/* 横向罗盘条 */
.compass-strip {
  position: absolute;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  height: 40px;
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(0,212,255,0.3);
  border-radius: 6px;
  overflow: hidden;
  z-index: 50;
}

.compass-tape {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.tick {
  position: absolute;
  left: 50%;
  top: 10px;
  width: 2px;
  height: 12px;
  background: rgba(255,255,255,0.3);
  transition: transform 0.05s linear;
}

.tick.major {
  top: 5px;
  height: 20px;
  background: rgba(255,255,255,0.7);
  width: 2px;
}

.tick-label {
  position: absolute;
  top: 22px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: rgba(255,255,255,0.8);
  white-space: nowrap;
}

.tick-label:contains('N') { color: #ff4444; }

.compass-center-mark {
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  color: #ff4444;
  font-size: 12px;
  z-index: 2;
}

.compass-reading {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  font-weight: 700;
  color: #00d4ff;
  font-family: 'Courier New', monospace;
  background: rgba(0,0,0,0.5);
  padding: 1px 6px;
  border-radius: 3px;
}

/* 人工地平仪 */
.attitude-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 160px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  z-index: 20;
  opacity: 0.8;
}

.horizon {
  position: absolute;
  inset: -50%;
  transition: transform 0.1s;
}

.sky {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, #1a4a7a 0%, #4a8ac4 100%);
}

.ground {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, #8b6914 0%, #5a4510 100%);
}

.horizon-line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background: #fff;
  transform: translateY(-50%);
}

.attitude-frame {
  position: absolute;
  inset: 0;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  pointer-events: none;
}

.pitch-marks {
  position: absolute;
  right: 4px;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 8px;
  color: rgba(255,255,255,0.5);
  padding: 4px 0;
}

.aircraft-symbol {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 18px;
  color: #ffcc00;
  font-weight: 700;
}

/* 信息面板 */
.info-panel {
  position: absolute;
  left: 16px;
  top: 60px;
  width: 200px;
  background: rgba(0,0,0,0.85);
  border: 1px solid rgba(0,212,255,0.3);
  border-radius: 8px;
  z-index: 100;
  transform: translateX(-220px);
  transition: transform 0.3s ease;
}
.info-panel.expanded { transform: translateX(0); }

.panel-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.tab {
  flex: 1;
  padding: 10px;
  text-align: center;
  font-size: 12px;
  cursor: pointer;
  color: rgba(255,255,255,0.6);
  transition: all 0.2s;
}
.tab.active {
  color: #00d4ff;
  background: rgba(0,212,255,0.1);
}

.panel-content { padding: 12px; }

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
}
.info-row:last-child { margin-bottom: 0; }
.info-row span:first-child { color: rgba(255,255,255,0.6); }
.info-row span:last-child { color: #fff; font-weight: 500; }

/* 底部数据栏 */
.bottom-data-bar {
  position: absolute;
  bottom: 160px;
  left: 130px;
  right: 130px;
  display: flex;
  justify-content: space-around;
  background: rgba(0,0,0,0.5);
  border-radius: 8px;
  padding: 8px 16px;
  z-index: 50;
}

.data-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bottom-data-bar .data-label {
  font-size: 10px;
  color: rgba(255,255,255,0.5);
  margin-bottom: 2px;
}

.bottom-data-bar .data-value {
  font-size: 16px;
  font-weight: 700;
  color: #00d4ff;
  font-family: 'Courier New', monospace;
}

.bottom-data-bar .data-value small {
  font-size: 10px;
  color: rgba(255,255,255,0.6);
}

/* 控制区 - DJI 风格 */
.control-area {
  position: absolute;
  bottom: 12px;
  left: 0;
  right: 0;
  padding: 0 12px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  z-index: 100;
}

.control-left, .control-right {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-btn {
  width: 48px;
  height: 48px;
  background: rgba(30,30,30,0.85);
  border: 1px solid rgba(80,80,80,0.5);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}
.action-btn:hover { background: rgba(50,50,50,0.9); }
.action-btn.active { 
  background: rgba(0,168,232,0.2); 
  border-color: #00a8e8; 
}
.action-btn.land-btn { border-color: #f5a623; }

.btn-icon { font-size: 18px; }
.btn-text { font-size: 8px; color: rgba(255,255,255,0.6); margin-top: 2px; }

.joystick-area {
  display: flex;
  align-items: flex-end;
  gap: 16px;
}

.joystick-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.joystick-base {
  width: 90px;
  height: 90px;
  background: rgba(20,20,20,0.85);
  border: 1px solid rgba(80,80,80,0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
  cursor: pointer;
}

.joystick-handle {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, #4a4a4a 0%, #2a2a2a 100%);
  border: 2px solid rgba(150,150,150,0.5);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  transition: transform 0.05s;
  pointer-events: none;
}

.joystick-label {
  font-size: 10px;
  color: rgba(255,255,255,0.5);
  margin-top: 6px;
}

.center-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.pos-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 10px;
  color: rgba(255,255,255,0.5);
  font-family: 'Courier New', monospace;
}

/* 左侧评分面板 */
.left-score-panel {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0,0,0,0.75);
  border: 1px solid rgba(0,212,255,0.3);
  border-radius: 12px;
  padding: 16px 12px;
  z-index: 100;
  min-width: 80px;
  backdrop-filter: blur(8px);
}
.score-box {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.score-number {
  font-size: 32px;
  font-weight: 700;
  color: #00d4ff;
  font-family: 'Courier New', monospace;
  line-height: 1;
}
.score-text {
  font-size: 12px;
  color: rgba(255,255,255,0.6);
  margin-left: 4px;
}
.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 11px;
}
.stats-row:last-child { margin-bottom: 0; }
.stat-label { color: rgba(255,255,255,0.5); }
.stat-value { color: #fff; font-weight: 600; font-family: 'Courier New', monospace; }

/* 碰撞提示小屏幕 */
.collision-toast {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, rgba(255,100,100,0.9) 0%, rgba(200,50,50,0.9) 100%);
  border: 1px solid rgba(255,150,150,0.5);
  border-radius: 8px;
  padding: 10px 16px;
  box-shadow: 0 4px 20px rgba(255,0,0,0.4);
  z-index: 200;
}
.toast-icon {
  font-size: 24px;
}
.toast-content {
  display: flex;
  flex-direction: column;
}
.toast-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}
.toast-detail {
  font-size: 12px;
  color: rgba(255,255,255,0.8);
}

/* 碰撞提示动画 */
.collision-fade-enter-active { animation: collision-in 0.3s ease-out; }
.collision-fade-leave-active { animation: collision-out 0.3s ease-in; }
@keyframes collision-in {
  0% { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.9); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes collision-out {
  0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.95); }
}

/* 任务信息面板 */
.mission-panel {
  position: absolute;
  top: 140px;
  left: 12px;
  background: rgba(0,0,0,0.75);
  border: 1px solid rgba(0,255,136,0.3);
  border-radius: 12px;
  padding: 14px;
  z-index: 100;
  min-width: 160px;
  backdrop-filter: blur(8px);
}
.mission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.mission-label {
  font-size: 10px;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.mission-difficulty .star {
  color: #ffd700;
  font-size: 10px;
}
.mission-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
}
.mission-cargo {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255,255,255,0.7);
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.cargo-icon {
  font-size: 14px;
}
.mission-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.mission-stats .stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.mission-stats .stat-icon {
  font-size: 12px;
}
.mission-stats .stat-val {
  font-size: 13px;
  font-weight: 600;
  color: #00ff88;
  font-family: 'Courier New', monospace;
}
.mission-stats .stat-val.urgent {
  color: #ff6b6b;
  animation: pulse-urgent 0.5s ease-in-out infinite alternate;
}
@keyframes pulse-urgent {
  from { opacity: 1; }
  to { opacity: 0.6; }
}
.mission-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}
.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00ff88, #00d4ff);
  border-radius: 3px;
  transition: width 0.3s ease;
}
.progress-text {
  font-size: 11px;
  color: rgba(255,255,255,0.6);
  min-width: 35px;
  text-align: right;
}

/* 教程覆盖层 */
.tutorial-overlay {
  position: absolute;
  inset: 0;
  z-index: 500;
  pointer-events: none;
}
.tutorial-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  pointer-events: auto;
}
.tutorial-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, rgba(20,30,50,0.95) 0%, rgba(10,20,40,0.95) 100%);
  border: 1px solid rgba(0,212,255,0.4);
  border-radius: 16px;
  padding: 24px 28px;
  min-width: 320px;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 40px rgba(0,212,255,0.1);
  pointer-events: auto;
  animation: tutorial-pop 0.3s ease-out;
}
@keyframes tutorial-pop {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
.tutorial-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.tutorial-badge {
  background: linear-gradient(90deg, #00d4ff, #00ff88);
  color: #000;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.tutorial-progress {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  font-family: 'Courier New', monospace;
}
.tutorial-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}
.tutorial-desc {
  font-size: 14px;
  color: rgba(255,255,255,0.7);
  margin-bottom: 16px;
  line-height: 1.5;
}
.tutorial-instruction {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(0,212,255,0.1);
  border: 1px solid rgba(0,212,255,0.3);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 20px;
}
.instruction-icon {
  font-size: 18px;
  flex-shrink: 0;
}
.tutorial-instruction span:last-child {
  font-size: 14px;
  color: #00d4ff;
  line-height: 1.5;
}
.tutorial-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.btn-skip {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.3);
  color: rgba(255,255,255,0.6);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-skip:hover {
  border-color: rgba(255,255,255,0.6);
  color: #fff;
}
.btn-next {
  background: linear-gradient(90deg, #00d4ff, #00ff88);
  border: none;
  color: #000;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-next:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,212,255,0.4);
}

/* 小地图 */
.minimap-container {
  position: absolute;
  bottom: 180px;
  right: 12px;
  width: 120px;
  height: 120px;
  z-index: 100;
}
.minimap-canvas {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
.minimap-compass {
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
}
.compass-n {
  font-size: 10px;
  font-weight: 700;
  color: #ff4444;
  text-shadow: 0 0 4px rgba(0,0,0,0.8);
}
.minimap-info {
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  color: rgba(255,255,255,0.5);
  font-family: 'Courier New', monospace;
  white-space: nowrap;
}
</style>

