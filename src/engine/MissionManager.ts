/**
 * 任务管理器
 * 管理配送任务的创建、执行和完成
 */

export interface DeliveryTask {
    id: string
    name: string
    description: string
    scene: string
    difficulty: 1 | 2 | 3  // 1=简单, 2=中等, 3=困难
    cargo: {
        type: string
        name: string
        weight: number
        fragile: boolean
    }
    start: { x: number, y: number, z: number }
    destination: { x: number, y: number, z: number }
    waypoints?: Array<{ x: number, y: number, z: number }>
    timeLimit?: number  // 秒
    requirements?: {
        minAltitude?: number
        maxAltitude?: number
        maxSpeed?: number
    }
}

export interface TaskProgress {
    taskId: string
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    startTime: number
    endTime?: number
    elapsedTime: number
    distance: number
    maxAltitude: number
    avgSpeed: number
    collisions: number
    cargoStatus: 'safe' | 'damaged' | 'lost'
}

export interface TaskResult {
    taskId: string
    success: boolean
    scores: {
        height: number       // 高度保持 /10
        heading: number      // 航向保持 /10
        speed: number        // 速度控制 /15
        obstacle: number     // 避障表现 /15
        time: number         // 完成时间 /20
        landing: number      // 降落精度 /15
        cargo: number        // 货物安全 /15
    }
    totalScore: number
    starRating: 1 | 2 | 3 | 4 | 5
    stats: {
        flightTime: number
        flightDistance: number
        avgSpeed: number
        maxAltitude: number
    }
}

// 预设任务列表
export const PRESET_TASKS: DeliveryTask[] = [
    {
        id: 'task_city_easy',
        name: '城市配送入门',
        description: '在城市中完成一次简单的快递配送',
        scene: 'city',
        difficulty: 1,
        cargo: { type: 'package', name: '快递包裹', weight: 2, fragile: false },
        start: { x: 0, y: 0, z: 0 },
        destination: { x: 100, y: 0, z: 100 },
        timeLimit: 300
    },
    {
        id: 'task_city_medium',
        name: '城市多点配送',
        description: '在城市中完成多个地点的快递配送',
        scene: 'city',
        difficulty: 2,
        cargo: { type: 'package', name: '多件快递', weight: 5, fragile: false },
        start: { x: 0, y: 0, z: 0 },
        destination: { x: 200, y: 0, z: 150 },
        waypoints: [
            { x: 50, y: 50, z: 50 },
            { x: 100, y: 50, z: 100 }
        ],
        timeLimit: 420
    },
    {
        id: 'task_emergency',
        name: '紧急送药',
        description: '紧急为医院配送药品，时间紧迫',
        scene: 'emergency',
        difficulty: 3,
        cargo: { type: 'medicine', name: '急救药品', weight: 1, fragile: true },
        start: { x: 0, y: 0, z: 0 },
        destination: { x: 0, y: 0, z: 320 },  // 医院位置
        timeLimit: 180,
        requirements: { maxSpeed: 15, minAltitude: 30 }
    },
    {
        id: 'task_mountain',
        name: '山区配送',
        description: '在山区完成物资配送，注意地形',
        scene: 'mountain',
        difficulty: 3,
        cargo: { type: 'supply', name: '生活物资', weight: 8, fragile: false },
        start: { x: 0, y: 0, z: 0 },
        destination: { x: 250, y: 100, z: 250 },
        timeLimit: 600,
        requirements: { minAltitude: 80 }
    }
]

export class MissionManager {
    private currentTask: DeliveryTask | null = null
    private progress: TaskProgress | null = null
    private flightPath: Array<{ x: number, y: number, z: number, t: number }> = []

    constructor() { }

    /**
     * 获取所有预设任务
     */
    getTasks(): DeliveryTask[] {
        return PRESET_TASKS
    }

    /**
     * 获取任务详情
     */
    getTask(taskId: string): DeliveryTask | null {
        return PRESET_TASKS.find(t => t.id === taskId) || null
    }

    /**
     * 开始任务
     */
    startTask(taskId: string): boolean {
        const task = this.getTask(taskId)
        if (!task) return false

        this.currentTask = task
        this.progress = {
            taskId,
            status: 'in_progress',
            startTime: Date.now(),
            elapsedTime: 0,
            distance: 0,
            maxAltitude: 0,
            avgSpeed: 0,
            collisions: 0,
            cargoStatus: 'safe'
        }
        this.flightPath = []

        return true
    }

    /**
     * 获取当前任务
     */
    getCurrentTask(): DeliveryTask | null {
        return this.currentTask
    }

    /**
     * 获取当前进度
     */
    getProgress(): TaskProgress | null {
        return this.progress
    }

    /**
     * 更新任务进度
     */
    updateProgress(position: { x: number, y: number, z: number }, speed: number): void {
        if (!this.progress || this.progress.status !== 'in_progress') return

        // 记录飞行路径
        this.flightPath.push({
            ...position,
            t: Date.now() - this.progress.startTime
        })

        // 更新统计数据
        this.progress.elapsedTime = (Date.now() - this.progress.startTime) / 1000
        this.progress.maxAltitude = Math.max(this.progress.maxAltitude, position.y)

        // 计算飞行距离
        if (this.flightPath.length > 1) {
            const prev = this.flightPath[this.flightPath.length - 2]
            const dx = position.x - prev.x
            const dy = position.y - prev.y
            const dz = position.z - prev.z
            this.progress.distance += Math.sqrt(dx * dx + dy * dy + dz * dz)
        }

        // 更新平均速度
        if (this.progress.elapsedTime > 0) {
            this.progress.avgSpeed = this.progress.distance / this.progress.elapsedTime
        }

        // 检查时间限制
        if (this.currentTask?.timeLimit && this.progress.elapsedTime > this.currentTask.timeLimit) {
            this.failTask('超出时间限制')
        }
    }

    /**
     * 记录碰撞
     */
    recordCollision(): void {
        if (this.progress) {
            this.progress.collisions++

            // 碰撞可能损坏货物
            if (this.currentTask?.cargo.fragile) {
                this.progress.cargoStatus = 'damaged'
            }
        }
    }

    /**
     * 完成任务
     */
    completeTask(landingAccuracy: number): TaskResult {
        if (!this.currentTask || !this.progress) {
            throw new Error('No active task')
        }

        this.progress.status = 'completed'
        this.progress.endTime = Date.now()

        // 计算评分
        const result = this.calculateScore(landingAccuracy)

        // 清理
        this.currentTask = null
        this.progress = null

        return result
    }

    /**
     * 失败任务
     */
    failTask(reason: string): TaskResult {
        if (!this.currentTask || !this.progress) {
            throw new Error('No active task')
        }

        this.progress.status = 'failed'
        this.progress.endTime = Date.now()

        // 返回失败结果
        const result: TaskResult = {
            taskId: this.currentTask.id,
            success: false,
            scores: { height: 0, heading: 0, speed: 0, obstacle: 0, time: 0, landing: 0, cargo: 0 },
            totalScore: 0,
            starRating: 1,
            stats: {
                flightTime: this.progress.elapsedTime,
                flightDistance: this.progress.distance / 1000,
                avgSpeed: this.progress.avgSpeed,
                maxAltitude: this.progress.maxAltitude
            }
        }

        this.currentTask = null
        this.progress = null

        return result
    }

    /**
     * 取消任务
     */
    cancelTask(): void {
        this.currentTask = null
        this.progress = null
        this.flightPath = []
    }

    /**
     * 计算评分
     */
    private calculateScore(landingAccuracy: number): TaskResult {
        const task = this.currentTask!
        const progress = this.progress!

        const scores = {
            height: this.calculateHeightScore(),
            heading: this.calculateHeadingScore(),
            speed: this.calculateSpeedScore(),
            obstacle: this.calculateObstacleScore(),
            time: this.calculateTimeScore(),
            landing: this.calculateLandingScore(landingAccuracy),
            cargo: this.calculateCargoScore()
        }

        const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)

        let starRating: 1 | 2 | 3 | 4 | 5 = 1
        if (totalScore >= 90) starRating = 5
        else if (totalScore >= 80) starRating = 4
        else if (totalScore >= 70) starRating = 3
        else if (totalScore >= 60) starRating = 2

        return {
            taskId: task.id,
            success: totalScore >= 60,
            scores,
            totalScore,
            starRating,
            stats: {
                flightTime: progress.elapsedTime,
                flightDistance: progress.distance / 1000,
                avgSpeed: progress.avgSpeed,
                maxAltitude: progress.maxAltitude
            }
        }
    }

    // 评分子函数
    private calculateHeightScore(): number {
        // 简化计算：基于高度保持稳定性
        return 8 + Math.random() * 2
    }

    private calculateHeadingScore(): number {
        return 8 + Math.random() * 2
    }

    private calculateSpeedScore(): number {
        return 12 + Math.random() * 3
    }

    private calculateObstacleScore(): number {
        const collisions = this.progress?.collisions || 0
        return Math.max(0, 15 - collisions * 5)
    }

    private calculateTimeScore(): number {
        const task = this.currentTask!
        const elapsed = this.progress!.elapsedTime
        const limit = task.timeLimit || 300

        if (elapsed <= limit * 0.6) return 20
        if (elapsed <= limit * 0.8) return 16
        if (elapsed <= limit) return 12
        return 5
    }

    private calculateLandingScore(accuracy: number): number {
        // accuracy: 0-1, 1 = 完美
        return Math.round(accuracy * 15)
    }

    private calculateCargoScore(): number {
        const status = this.progress?.cargoStatus
        if (status === 'safe') return 15
        if (status === 'damaged') return 8
        return 0
    }
}

export default MissionManager
