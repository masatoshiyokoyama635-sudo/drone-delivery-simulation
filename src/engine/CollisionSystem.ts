/**
 * 碰撞检测系统
 * 检测无人机与建筑物、车辆的碰撞
 */

import * as THREE from 'three'

export interface CollisionResult {
    hasCollision: boolean
    collidedObject?: THREE.Object3D
    collisionPoint?: THREE.Vector3
    distance?: number
}

export interface CollisionConfig {
    droneRadius?: number
    checkInterval?: number  // 检测间隔（毫秒）
    warningDistance?: number  // 警告距离
    minAltitude?: number  // 最小检测高度（低于此高度不检测碰撞）
    exclusionCenter?: { x: number, z: number }  // 排除区域中心（起飞位置）
    exclusionRadius?: number  // 排除区域半径
}

export class CollisionSystem {
    private obstacles: THREE.Box3[] = []
    private obstacleObjects: THREE.Object3D[] = []
    private vehicleBoxes: THREE.Box3[] = []
    private vehicleObjects: THREE.Object3D[] = []

    private droneRadius: number
    private warningDistance: number
    private minAltitude: number
    private exclusionCenter: { x: number, z: number }
    private exclusionRadius: number
    private lastCollisionTime: number = 0
    private collisionCooldown: number = 1000  // 碰撞冷却时间（毫秒）

    private onCollisionCallback?: (result: CollisionResult) => void
    private onWarningCallback?: (distance: number) => void

    constructor(config: CollisionConfig = {}) {
        this.droneRadius = config.droneRadius || 1.5
        this.warningDistance = config.warningDistance || 10
        this.minAltitude = config.minAltitude || 15  // 默认15米以上才检测碰撞
        this.exclusionCenter = config.exclusionCenter || { x: 0, z: 0 }
        this.exclusionRadius = config.exclusionRadius || 20  // 起飞点20米范围内不检测
    }

    /**
     * 从场景中收集建筑物障碍物
     */
    collectBuildingsFromScene(scene: THREE.Scene): void {
        this.obstacles = []
        this.obstacleObjects = []

        scene.traverse((object) => {
            // 跳过无人机自身、地面、天空等
            if (object.name === 'drone' ||
                object.name === 'ground' ||
                object.name === 'sky' ||
                object.name === 'landingPad') {
                return
            }

            // 收集所有网格对象作为障碍物
            if (object instanceof THREE.Mesh && object.geometry) {
                // 过滤小物体（灯光、标记等）
                const box = new THREE.Box3().setFromObject(object)
                const size = new THREE.Vector3()
                box.getSize(size)

                // 只收集高度大于2米的物体作为建筑
                if (size.y > 2 && (size.x > 1 || size.z > 1)) {
                    this.obstacles.push(box)
                    this.obstacleObjects.push(object)
                }
            }
        })

        console.log(`CollisionSystem: Collected ${this.obstacles.length} building obstacles`)
    }

    /**
     * 从 GLB 模型中提取建筑物
     */
    collectFromGLBModel(model: THREE.Object3D): void {
        this.obstacles = []
        this.obstacleObjects = []

        // 确保模型的变换矩阵已更新
        model.updateMatrixWorld(true)

        model.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                // 强制更新子对象的世界矩阵
                child.updateMatrixWorld(true)

                // 使用世界坐标计算包围盒
                const box = new THREE.Box3().setFromObject(child)
                const size = new THREE.Vector3()
                box.getSize(size)

                // 建筑物筛选：高度>3m，水平尺寸>2m
                if (size.y > 3 && (size.x > 2 || size.z > 2)) {
                    this.obstacles.push(box)
                    this.obstacleObjects.push(child)
                }
            }
        })

        console.log(`CollisionSystem: Collected ${this.obstacles.length} obstacles from GLB`)

        // 调试输出前几个障碍物的位置
        if (this.obstacles.length > 0) {
            const sample = this.obstacles[0]
            console.log('First obstacle bounds:', sample.min.toArray(), sample.max.toArray())
        }
    }

    /**
     * 注册车辆用于碰撞检测
     */
    registerVehicles(vehicles: THREE.Object3D[]): void {
        this.vehicleObjects = vehicles
        this.updateVehicleBounds()
    }

    /**
     * 更新车辆包围盒（车辆移动后调用）
     */
    updateVehicleBounds(): void {
        this.vehicleBoxes = this.vehicleObjects.map(v => new THREE.Box3().setFromObject(v))
    }

    /**
     * 检测碰撞
     */
    checkCollision(dronePosition: THREE.Vector3): CollisionResult {
        // 如果无人机高度低于最小检测高度，不检测碰撞（避免地面/起飞台误检测）
        if (dronePosition.y < this.minAltitude) {
            return { hasCollision: false }
        }

        // 检查是否在排除区域内（起飞点附近）
        const dx = dronePosition.x - this.exclusionCenter.x
        const dz = dronePosition.z - this.exclusionCenter.z
        const horizontalDistance = Math.sqrt(dx * dx + dz * dz)
        if (horizontalDistance < this.exclusionRadius) {
            return { hasCollision: false }
        }

        // 创建无人机包围球
        const droneSphere = new THREE.Sphere(dronePosition, this.droneRadius)

        // 检测建筑物碰撞
        for (let i = 0; i < this.obstacles.length; i++) {
            if (this.obstacles[i].intersectsSphere(droneSphere)) {
                return {
                    hasCollision: true,
                    collidedObject: this.obstacleObjects[i],
                    collisionPoint: dronePosition.clone()
                }
            }
        }

        // 检测车辆碰撞
        for (let i = 0; i < this.vehicleBoxes.length; i++) {
            if (this.vehicleBoxes[i].intersectsSphere(droneSphere)) {
                return {
                    hasCollision: true,
                    collidedObject: this.vehicleObjects[i],
                    collisionPoint: dronePosition.clone()
                }
            }
        }

        return { hasCollision: false }
    }

    /**
     * 获取最近障碍物距离
     */
    getNearestObstacleDistance(dronePosition: THREE.Vector3): number {
        let minDistance = Infinity

        for (const box of this.obstacles) {
            const closest = new THREE.Vector3()
            box.clampPoint(dronePosition, closest)
            const distance = dronePosition.distanceTo(closest)
            minDistance = Math.min(minDistance, distance)
        }

        for (const box of this.vehicleBoxes) {
            const closest = new THREE.Vector3()
            box.clampPoint(dronePosition, closest)
            const distance = dronePosition.distanceTo(closest)
            minDistance = Math.min(minDistance, distance)
        }

        return minDistance
    }

    /**
     * 主更新循环（每帧调用）
     */
    update(dronePosition: THREE.Vector3): CollisionResult {
        const now = Date.now()

        // 更新车辆包围盒
        this.updateVehicleBounds()

        // 检测碰撞
        const result = this.checkCollision(dronePosition)

        // 碰撞冷却检查
        if (result.hasCollision && now - this.lastCollisionTime > this.collisionCooldown) {
            this.lastCollisionTime = now
            if (this.onCollisionCallback) {
                this.onCollisionCallback(result)
            }
        }

        // 距离警告
        if (!result.hasCollision) {
            const distance = this.getNearestObstacleDistance(dronePosition)
            if (distance < this.warningDistance && this.onWarningCallback) {
                this.onWarningCallback(distance)
            }
        }

        return result
    }

    /**
     * 设置碰撞回调
     */
    onCollision(callback: (result: CollisionResult) => void): void {
        this.onCollisionCallback = callback
    }

    /**
     * 设置警告回调
     */
    onWarning(callback: (distance: number) => void): void {
        this.onWarningCallback = callback
    }

    /**
     * 获取障碍物数量
     */
    getObstacleCount(): number {
        return this.obstacles.length + this.vehicleBoxes.length
    }

    /**
     * 清除所有障碍物
     */
    clear(): void {
        this.obstacles = []
        this.obstacleObjects = []
        this.vehicleBoxes = []
        this.vehicleObjects = []
    }
}

export default CollisionSystem
