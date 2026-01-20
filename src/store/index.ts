import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 无人机状态管理
export const useDroneStore = defineStore('drone', () => {
    // 无人机状态
    const isUnlocked = ref(false)
    const position = ref({ x: 0, y: 0, z: 0 })
    const rotation = ref({ x: 0, y: 0, z: 0 })
    const velocity = ref({ x: 0, y: 0, z: 0 })

    // 飞行参数
    const altitude = ref(0)
    const speed = ref(0)
    const heading = ref(0)
    const battery = ref(100)

    // 飞行模式 S=姿态, P=定点, T=航点
    const flightMode = ref<'S' | 'P' | 'T'>('P')

    // 目标航点
    const waypoints = ref<Array<{ x: number, y: number, z: number }>>([])
    const currentWaypointIndex = ref(0)

    // 计算属性
    const isLowBattery = computed(() => battery.value < 20)
    const canTakeoff = computed(() => battery.value > 10 && !isUnlocked.value)

    // 解锁/锁定
    function unlock() {
        if (battery.value > 10) {
            isUnlocked.value = true
            return true
        }
        return false
    }

    function lock() {
        isUnlocked.value = false
        velocity.value = { x: 0, y: 0, z: 0 }
    }

    // 起飞
    function takeoff(targetAltitude: number = 50) {
        if (unlock()) {
            altitude.value = targetAltitude
        }
    }

    // 降落
    function land() {
        altitude.value = 0
        lock()
    }

    // 设置飞行模式
    function setFlightMode(mode: 'S' | 'P' | 'T') {
        flightMode.value = mode
    }

    // 更新位置
    function updatePosition(newPos: { x: number, y: number, z: number }) {
        position.value = newPos
        altitude.value = newPos.y
    }

    // 消耗电量
    function consumeBattery(amount: number = 0.1) {
        battery.value = Math.max(0, battery.value - amount)
        if (battery.value <= 0) {
            land()
        }
    }

    // 充电
    function recharge() {
        if (!isUnlocked.value) {
            battery.value = 100
        }
    }

    // 设置航点
    function setWaypoints(points: Array<{ x: number, y: number, z: number }>) {
        waypoints.value = points
        currentWaypointIndex.value = 0
    }

    // 重置
    function reset() {
        isUnlocked.value = false
        position.value = { x: 0, y: 0, z: 0 }
        rotation.value = { x: 0, y: 0, z: 0 }
        velocity.value = { x: 0, y: 0, z: 0 }
        altitude.value = 0
        speed.value = 0
        heading.value = 0
        battery.value = 100
        flightMode.value = 'P'
        waypoints.value = []
        currentWaypointIndex.value = 0
    }

    return {
        // 状态
        isUnlocked,
        position,
        rotation,
        velocity,
        altitude,
        speed,
        heading,
        battery,
        flightMode,
        waypoints,
        currentWaypointIndex,

        // 计算属性
        isLowBattery,
        canTakeoff,

        // 方法
        unlock,
        lock,
        takeoff,
        land,
        setFlightMode,
        updatePosition,
        consumeBattery,
        recharge,
        setWaypoints,
        reset
    }
})

// 任务状态管理
export const useMissionStore = defineStore('mission', () => {
    // 任务信息
    const currentMission = ref<{
        id: string
        name: string
        scene: string
        difficulty: number
        cargo: string
    } | null>(null)

    // 任务进度
    const startTime = ref<number | null>(null)
    const elapsedTime = ref(0)
    const isCompleted = ref(false)

    // 评分
    const scores = ref({
        height: 0,
        heading: 0,
        speed: 0,
        obstacle: 0,
        time: 0,
        landing: 0,
        cargo: 0
    })

    // 飞行记录
    const flightPath = ref<Array<{ x: number, y: number, z: number, t: number }>>([])
    const totalDistance = ref(0)
    const maxAltitude = ref(0)

    // 总分
    const totalScore = computed(() => {
        return Object.values(scores.value).reduce((a, b) => a + b, 0)
    })

    // 星级
    const starRating = computed(() => {
        const score = totalScore.value
        if (score >= 90) return 5
        if (score >= 80) return 4
        if (score >= 70) return 3
        if (score >= 60) return 2
        return 1
    })

    // 开始任务
    function startMission(mission: typeof currentMission.value) {
        currentMission.value = mission
        startTime.value = Date.now()
        elapsedTime.value = 0
        isCompleted.value = false
        flightPath.value = []
        totalDistance.value = 0
        maxAltitude.value = 0
        scores.value = { height: 0, heading: 0, speed: 0, obstacle: 0, time: 0, landing: 0, cargo: 0 }
    }

    // 记录飞行点
    function recordFlightPoint(point: { x: number, y: number, z: number }) {
        const t = Date.now() - (startTime.value || Date.now())
        flightPath.value.push({ ...point, t })

        if (point.y > maxAltitude.value) {
            maxAltitude.value = point.y
        }

        // 计算距离
        if (flightPath.value.length > 1) {
            const prev = flightPath.value[flightPath.value.length - 2]
            const dx = point.x - prev.x
            const dy = point.y - prev.y
            const dz = point.z - prev.z
            totalDistance.value += Math.sqrt(dx * dx + dy * dy + dz * dz)
        }
    }

    // 完成任务
    function completeMission(finalScores: typeof scores.value) {
        elapsedTime.value = Date.now() - (startTime.value || Date.now())
        scores.value = finalScores
        isCompleted.value = true
    }

    // 重置
    function reset() {
        currentMission.value = null
        startTime.value = null
        elapsedTime.value = 0
        isCompleted.value = false
        flightPath.value = []
        totalDistance.value = 0
        maxAltitude.value = 0
        scores.value = { height: 0, heading: 0, speed: 0, obstacle: 0, time: 0, landing: 0, cargo: 0 }
    }

    return {
        currentMission,
        startTime,
        elapsedTime,
        isCompleted,
        scores,
        flightPath,
        totalDistance,
        maxAltitude,
        totalScore,
        starRating,
        startMission,
        recordFlightPoint,
        completeMission,
        reset
    }
})
