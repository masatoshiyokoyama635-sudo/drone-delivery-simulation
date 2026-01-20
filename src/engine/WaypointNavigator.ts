/**
 * 航点导航系统
 * 管理航线规划和自动导航
 */

import * as THREE from 'three'

export interface Waypoint {
    id: string
    position: THREE.Vector3
    type: 'start' | 'waypoint' | 'destination'
    name?: string
    altitude?: number
    speed?: number
}

export interface NavigationState {
    isNavigating: boolean
    currentWaypointIndex: number
    totalWaypoints: number
    distanceToNext: number
    distanceTotal: number
    distanceRemaining: number
    eta: number // 预计到达时间（秒）
    progress: number // 0-100
}

export class WaypointNavigator {
    private waypoints: Waypoint[] = []
    private currentIndex: number = 0
    private isNavigating: boolean = false
    private defaultAltitude: number = 50
    private defaultSpeed: number = 10
    private arrivalRadius: number = 5 // 到达判定半径

    private totalDistance: number = 0
    private coveredDistance: number = 0

    constructor() { }

    /**
     * 设置航点列表
     */
    setWaypoints(waypoints: Waypoint[]): void {
        this.waypoints = waypoints.map((wp, index) => ({
            ...wp,
            id: wp.id || `wp_${index}`,
            altitude: wp.altitude ?? this.defaultAltitude,
            speed: wp.speed ?? this.defaultSpeed
        }))

        this.currentIndex = 0
        this.calculateTotalDistance()
    }

    /**
     * 添加航点
     */
    addWaypoint(position: THREE.Vector3, type: Waypoint['type'] = 'waypoint'): Waypoint {
        const waypoint: Waypoint = {
            id: `wp_${Date.now()}`,
            position: position.clone(),
            type,
            altitude: this.defaultAltitude,
            speed: this.defaultSpeed
        }

        this.waypoints.push(waypoint)
        this.calculateTotalDistance()

        return waypoint
    }

    /**
     * 移除航点
     */
    removeWaypoint(id: string): boolean {
        const index = this.waypoints.findIndex(wp => wp.id === id)
        if (index > -1) {
            this.waypoints.splice(index, 1)
            if (this.currentIndex >= this.waypoints.length) {
                this.currentIndex = Math.max(0, this.waypoints.length - 1)
            }
            this.calculateTotalDistance()
            return true
        }
        return false
    }

    /**
     * 清空所有航点
     */
    clearWaypoints(): void {
        this.waypoints = []
        this.currentIndex = 0
        this.totalDistance = 0
        this.coveredDistance = 0
    }

    /**
     * 获取所有航点
     */
    getWaypoints(): Waypoint[] {
        return [...this.waypoints]
    }

    /**
     * 获取当前目标航点
     */
    getCurrentWaypoint(): Waypoint | null {
        return this.waypoints[this.currentIndex] || null
    }

    /**
     * 获取下一个航点
     */
    getNextWaypoint(): Waypoint | null {
        return this.waypoints[this.currentIndex + 1] || null
    }

    /**
     * 开始导航
     */
    startNavigation(): boolean {
        if (this.waypoints.length === 0) return false

        this.isNavigating = true
        this.currentIndex = 0
        this.coveredDistance = 0

        return true
    }

    /**
     * 停止导航
     */
    stopNavigation(): void {
        this.isNavigating = false
    }

    /**
     * 暂停导航
     */
    pauseNavigation(): void {
        this.isNavigating = false
    }

    /**
     * 继续导航
     */
    resumeNavigation(): void {
        this.isNavigating = true
    }

    /**
     * 更新导航状态
     */
    update(currentPosition: THREE.Vector3): NavigationState {
        const state: NavigationState = {
            isNavigating: this.isNavigating,
            currentWaypointIndex: this.currentIndex,
            totalWaypoints: this.waypoints.length,
            distanceToNext: 0,
            distanceTotal: this.totalDistance,
            distanceRemaining: 0,
            eta: 0,
            progress: 0
        }

        if (!this.isNavigating || this.waypoints.length === 0) {
            return state
        }

        const currentWaypoint = this.getCurrentWaypoint()
        if (!currentWaypoint) {
            this.isNavigating = false
            return state
        }

        // 计算到当前航点的距离
        const distance = currentPosition.distanceTo(currentWaypoint.position)
        state.distanceToNext = distance

        // 检查是否到达当前航点
        if (distance < this.arrivalRadius) {
            // 更新已覆盖距离
            if (this.currentIndex > 0) {
                const prevWaypoint = this.waypoints[this.currentIndex - 1]
                this.coveredDistance += prevWaypoint.position.distanceTo(currentWaypoint.position)
            }

            // 前进到下一个航点
            this.currentIndex++

            // 检查是否到达终点
            if (this.currentIndex >= this.waypoints.length) {
                this.isNavigating = false
                state.progress = 100
                return state
            }
        }

        // 计算剩余距离
        state.distanceRemaining = this.calculateRemainingDistance(currentPosition)

        // 计算进度
        if (this.totalDistance > 0) {
            state.progress = Math.min(100, (1 - state.distanceRemaining / this.totalDistance) * 100)
        }

        // 计算预计到达时间
        const speed = currentWaypoint.speed || this.defaultSpeed
        state.eta = state.distanceRemaining / speed

        return state
    }

    /**
     * 获取导航控制输入
     * 返回应该施加的控制力，用于自动驾驶
     */
    getNavigationInput(currentPosition: THREE.Vector3, currentHeading: number): { pitch: number, roll: number, yaw: number } {
        const result = { pitch: 0, roll: 0, yaw: 0 }

        if (!this.isNavigating) return result

        const currentWaypoint = this.getCurrentWaypoint()
        if (!currentWaypoint) return result

        // 计算到目标的方向
        const direction = new THREE.Vector3()
            .subVectors(currentWaypoint.position, currentPosition)

        // 计算目标航向
        const targetHeading = Math.atan2(direction.x, direction.z)

        // 计算航向差
        let headingDiff = targetHeading - currentHeading

        // 归一化到 -PI 到 PI
        while (headingDiff > Math.PI) headingDiff -= Math.PI * 2
        while (headingDiff < -Math.PI) headingDiff += Math.PI * 2

        // 设置偏航控制
        result.yaw = Math.max(-1, Math.min(1, headingDiff))

        // 计算水平距离
        const horizontalDist = Math.sqrt(direction.x ** 2 + direction.z ** 2)

        // 如果航向大致正确，向前移动
        if (Math.abs(headingDiff) < Math.PI / 4) {
            result.pitch = Math.min(1, horizontalDist / 20)
        }

        return result
    }

    /**
     * 获取目标高度
     */
    getTargetAltitude(): number {
        const currentWaypoint = this.getCurrentWaypoint()
        return currentWaypoint?.altitude ?? this.defaultAltitude
    }

    /**
     * 计算总距离
     */
    private calculateTotalDistance(): void {
        this.totalDistance = 0

        for (let i = 1; i < this.waypoints.length; i++) {
            this.totalDistance += this.waypoints[i - 1].position.distanceTo(
                this.waypoints[i].position
            )
        }
    }

    /**
     * 计算剩余距离
     */
    private calculateRemainingDistance(currentPosition: THREE.Vector3): number {
        if (this.waypoints.length === 0) return 0

        let remaining = 0

        // 到当前航点的距离
        const currentWaypoint = this.getCurrentWaypoint()
        if (currentWaypoint) {
            remaining += currentPosition.distanceTo(currentWaypoint.position)
        }

        // 后续航点之间的距离
        for (let i = this.currentIndex + 1; i < this.waypoints.length; i++) {
            remaining += this.waypoints[i - 1].position.distanceTo(
                this.waypoints[i].position
            )
        }

        return remaining
    }

    /**
     * 生成返航航点
     */
    generateReturnPath(currentPosition: THREE.Vector3, homePosition: THREE.Vector3): void {
        this.clearWaypoints()

        // 添加当前位置作为起点
        this.addWaypoint(currentPosition.clone(), 'start')

        // 添加返航点（保持当前高度）
        const returnWaypoint = new THREE.Vector3(
            homePosition.x,
            Math.max(currentPosition.y, 30), // 至少30米高度
            homePosition.z
        )
        this.addWaypoint(returnWaypoint, 'waypoint')

        // 添加降落点
        this.addWaypoint(homePosition.clone(), 'destination')
    }
}

export default WaypointNavigator
