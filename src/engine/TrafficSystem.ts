/**
 * 城市交通系统
 * 管理道路上移动的车辆
 */

import * as THREE from 'three'

export interface VehicleConfig {
    type: 'car' | 'truck' | 'bus'
    color?: number
    speed?: number
}

export interface RoadPath {
    points: THREE.Vector3[]
    loop?: boolean
}

export class TrafficSystem {
    private vehicles: THREE.Group[] = []
    private vehicleData: {
        mesh: THREE.Group
        path: THREE.Vector3[]
        pathIndex: number
        progress: number  // 0-1 在当前路段的进度
        speed: number
        direction: 1 | -1
    }[] = []

    private scene: THREE.Scene | null = null
    private roadPaths: RoadPath[] = []

    constructor() {
        this.initDefaultRoads()
    }

    /**
     * 初始化默认道路路径（匹配城市地图的道路布局）
     */
    private initDefaultRoads(): void {
        // 横向主干道（东西向）
        this.roadPaths.push({
            points: [
                new THREE.Vector3(-150, 0.5, 0),
                new THREE.Vector3(150, 0.5, 0)
            ]
        })

        // 纵向主干道（南北向）
        this.roadPaths.push({
            points: [
                new THREE.Vector3(0, 0.5, -150),
                new THREE.Vector3(0, 0.5, 150)
            ]
        })

        // 环形路（简化为4段直线）
        const ringRadius = 80
        const ringPoints: THREE.Vector3[] = []
        for (let angle = 0; angle <= Math.PI * 2; angle += Math.PI / 8) {
            ringPoints.push(new THREE.Vector3(
                Math.cos(angle) * ringRadius,
                0.5,
                Math.sin(angle) * ringRadius
            ))
        }
        this.roadPaths.push({ points: ringPoints, loop: true })
    }

    /**
     * 设置场景
     */
    setScene(scene: THREE.Scene): void {
        this.scene = scene
    }

    /**
     * 创建程序化汽车模型
     */
    private createVehicle(config: VehicleConfig): THREE.Group {
        const group = new THREE.Group()
        group.name = 'vehicle'

        let bodyWidth: number, bodyLength: number, bodyHeight: number
        let color = config.color || this.getRandomCarColor()

        switch (config.type) {
            case 'truck':
                bodyWidth = 1.2
                bodyLength = 3.5
                bodyHeight = 1.5
                break
            case 'bus':
                bodyWidth = 1.4
                bodyLength = 5
                bodyHeight = 1.8
                color = 0x2255aa  // 公交车蓝色
                break
            case 'car':
            default:
                bodyWidth = 1
                bodyLength = 2.2
                bodyHeight = 0.8
        }

        // 车身主体
        const bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength)
        const bodyMat = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.6,
            roughness: 0.4
        })
        const body = new THREE.Mesh(bodyGeo, bodyMat)
        body.position.y = bodyHeight / 2 + 0.2
        body.castShadow = true
        group.add(body)

        // 车顶（轿车）
        if (config.type === 'car') {
            const roofGeo = new THREE.BoxGeometry(bodyWidth * 0.9, 0.5, bodyLength * 0.5)
            const roofMat = new THREE.MeshStandardMaterial({
                color: color,
                metalness: 0.6,
                roughness: 0.4
            })
            const roof = new THREE.Mesh(roofGeo, roofMat)
            roof.position.y = bodyHeight + 0.45
            roof.position.z = -0.2
            roof.castShadow = true
            group.add(roof)
        }

        // 车窗（玻璃效果）
        const windowMat = new THREE.MeshStandardMaterial({
            color: 0x88ccff,
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.6
        })

        // 前挡风玻璃
        const frontWindowGeo = new THREE.PlaneGeometry(bodyWidth * 0.8, bodyHeight * 0.5)
        const frontWindow = new THREE.Mesh(frontWindowGeo, windowMat)
        frontWindow.position.set(0, bodyHeight * 0.7 + 0.2, bodyLength / 2 - 0.01)
        group.add(frontWindow)

        // 轮子
        const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 12)
        wheelGeo.rotateZ(Math.PI / 2)
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.8
        })

        const wheelPositions = [
            { x: bodyWidth / 2 + 0.05, z: bodyLength / 3 },
            { x: -bodyWidth / 2 - 0.05, z: bodyLength / 3 },
            { x: bodyWidth / 2 + 0.05, z: -bodyLength / 3 },
            { x: -bodyWidth / 2 - 0.05, z: -bodyLength / 3 }
        ]

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat)
            wheel.position.set(pos.x, 0.2, pos.z)
            group.add(wheel)
        })

        // 前灯
        const lightGeo = new THREE.SphereGeometry(0.08, 8, 8)
        const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffee })
        const leftLight = new THREE.Mesh(lightGeo, headlightMat)
        leftLight.position.set(bodyWidth * 0.35, bodyHeight * 0.4 + 0.2, bodyLength / 2)
        group.add(leftLight)

        const rightLight = new THREE.Mesh(lightGeo, headlightMat)
        rightLight.position.set(-bodyWidth * 0.35, bodyHeight * 0.4 + 0.2, bodyLength / 2)
        group.add(rightLight)

        // 尾灯
        const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff2200 })
        const leftTail = new THREE.Mesh(lightGeo, taillightMat)
        leftTail.position.set(bodyWidth * 0.35, bodyHeight * 0.4 + 0.2, -bodyLength / 2)
        group.add(leftTail)

        const rightTail = new THREE.Mesh(lightGeo, taillightMat)
        rightTail.position.set(-bodyWidth * 0.35, bodyHeight * 0.4 + 0.2, -bodyLength / 2)
        group.add(rightTail)

        return group
    }

    /**
     * 随机汽车颜色
     */
    private getRandomCarColor(): number {
        const colors = [
            0xeeeeee,  // 白色
            0x222222,  // 黑色
            0x444444,  // 灰色
            0x884422,  // 棕色
            0xcc2222,  // 红色
            0x2244aa,  // 蓝色
            0x228844,  // 绿色
            0xccaa22,  // 金色
        ]
        return colors[Math.floor(Math.random() * colors.length)]
    }

    /**
     * 生成车辆
     */
    spawnVehicles(count: number = 12): void {
        if (!this.scene) {
            console.warn('TrafficSystem: Scene not set')
            return
        }

        // 清除现有车辆
        this.clearVehicles()

        const types: VehicleConfig['type'][] = ['car', 'car', 'car', 'truck', 'bus']

        for (let i = 0; i < count; i++) {
            const type = types[Math.floor(Math.random() * types.length)]
            const vehicle = this.createVehicle({ type })

            // 随机选择一条路径
            const pathIndex = Math.floor(Math.random() * this.roadPaths.length)
            const path = this.roadPaths[pathIndex].points

            // 随机起始位置
            const startSegment = Math.floor(Math.random() * (path.length - 1))
            const startProgress = Math.random()

            // 计算初始位置
            const start = path[startSegment]
            const end = path[startSegment + 1] || path[0]
            const pos = new THREE.Vector3().lerpVectors(start, end, startProgress)
            vehicle.position.copy(pos)

            // 设置朝向
            const direction = new THREE.Vector3().subVectors(end, start).normalize()
            vehicle.lookAt(vehicle.position.clone().add(direction))

            // 随机速度 (3-8 m/s)
            const speed = 3 + Math.random() * 5

            this.vehicles.push(vehicle)
            this.vehicleData.push({
                mesh: vehicle,
                path: path,
                pathIndex: startSegment,
                progress: startProgress,
                speed: speed,
                direction: Math.random() > 0.5 ? 1 : -1
            })

            this.scene.add(vehicle)
        }

        console.log(`TrafficSystem: Spawned ${count} vehicles`)
    }

    /**
     * 更新车辆位置（每帧调用）
     */
    update(deltaTime: number): void {
        for (const data of this.vehicleData) {
            // 计算移动距离
            const path = data.path
            if (path.length < 2) continue

            const currentIndex = data.pathIndex
            const nextIndex = (currentIndex + 1) % path.length

            const start = path[currentIndex]
            const end = path[nextIndex]
            const segmentLength = start.distanceTo(end)

            // 更新进度
            const moveAmount = (data.speed * deltaTime) / segmentLength
            data.progress += moveAmount

            // 检查是否到达路段终点 - 循环到下一段
            if (data.progress >= 1) {
                data.progress = data.progress - 1  // 保留溢出部分
                data.pathIndex = nextIndex

                // 如果到达路径末尾，循环回起点
                if (data.pathIndex >= path.length - 1) {
                    data.pathIndex = 0
                }
            }

            // 更新位置
            const newStart = path[data.pathIndex]
            const newEnd = path[(data.pathIndex + 1) % path.length]
            const newPos = new THREE.Vector3().lerpVectors(newStart, newEnd, Math.min(data.progress, 1))
            data.mesh.position.copy(newPos)

            // 更新朝向
            const dir = new THREE.Vector3().subVectors(newEnd, newStart).normalize()
            if (dir.length() > 0.01) {
                data.mesh.lookAt(data.mesh.position.clone().add(dir))
            }
        }
    }

    /**
     * 获取所有车辆对象（供碰撞检测）
     */
    getVehicles(): THREE.Group[] {
        return this.vehicles
    }

    /**
     * 清除所有车辆
     */
    clearVehicles(): void {
        for (const vehicle of this.vehicles) {
            if (this.scene) {
                this.scene.remove(vehicle)
            }
        }
        this.vehicles = []
        this.vehicleData = []
    }

    /**
     * 设置自定义道路路径
     */
    setRoadPaths(paths: RoadPath[]): void {
        this.roadPaths = paths
    }
}

export default TrafficSystem
