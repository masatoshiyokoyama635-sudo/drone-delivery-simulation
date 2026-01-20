/**
 * 无人机 3D 模型
 * 创建无人机的 3D 表示，包含螺旋桨动画
 */

import * as THREE from 'three'

export interface DroneConfig {
    bodyColor?: number
    propellerColor?: number
    scale?: number
}

export class DroneModel {
    private group: THREE.Group
    private propellers: THREE.Mesh[] = []
    private propellerSpeed: number = 0
    private maxPropellerSpeed: number = 50

    // 状态
    private isRunning: boolean = false
    private targetPosition: THREE.Vector3
    private velocity: THREE.Vector3

    constructor(config: DroneConfig = {}) {
        this.group = new THREE.Group()
        this.group.name = 'drone'
        this.targetPosition = new THREE.Vector3()
        this.velocity = new THREE.Vector3()

        this.createDrone(config)
    }

    /**
     * 创建无人机模型
     */
    private createDrone(config: DroneConfig): void {
        const bodyColor = config.bodyColor || 0x2a2a2a
        const propellerColor = config.propellerColor || 0x333333
        const scale = config.scale || 1

        // 机身中心
        const bodyGeometry = new THREE.BoxGeometry(1.5, 0.4, 1.5)
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: bodyColor,
            metalness: 0.8,
            roughness: 0.2
        })
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
        body.castShadow = true
        this.group.add(body)

        // 摄像头（前方）
        const cameraGeometry = new THREE.SphereGeometry(0.2, 16, 16)
        const cameraMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.9,
            roughness: 0.1
        })
        const camera = new THREE.Mesh(cameraGeometry, cameraMaterial)
        camera.position.set(0, -0.1, 0.8)
        this.group.add(camera)

        // LED 指示灯
        const ledGeometry = new THREE.SphereGeometry(0.08, 8, 8)
        const ledMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00
        })
        const led = new THREE.Mesh(ledGeometry, ledMaterial)
        led.position.set(0, 0.25, 0)
        this.group.add(led)

        // 四个机臂和螺旋桨
        const armPositions = [
            { x: 1, z: 1 },
            { x: -1, z: 1 },
            { x: 1, z: -1 },
            { x: -1, z: -1 }
        ]

        armPositions.forEach((pos, index) => {
            // 机臂
            const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8)
            armGeometry.rotateZ(Math.PI / 2)
            const armMaterial = new THREE.MeshStandardMaterial({
                color: bodyColor,
                metalness: 0.7,
                roughness: 0.3
            })
            const arm = new THREE.Mesh(armGeometry, armMaterial)

            // 计算机臂角度
            const angle = Math.atan2(pos.z, pos.x)
            arm.rotation.y = -angle
            arm.position.set(pos.x * 0.5, 0, pos.z * 0.5)
            arm.castShadow = true
            this.group.add(arm)

            // 电机座
            const motorGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.2, 16)
            const motorMaterial = new THREE.MeshStandardMaterial({
                color: 0x444444,
                metalness: 0.8,
                roughness: 0.2
            })
            const motor = new THREE.Mesh(motorGeometry, motorMaterial)
            motor.position.set(pos.x * 1.2, 0.15, pos.z * 1.2)
            motor.castShadow = true
            this.group.add(motor)

            // 螺旋桨
            const propellerGroup = new THREE.Group()
            propellerGroup.position.set(pos.x * 1.2, 0.3, pos.z * 1.2)

            // 两片桨叶
            for (let i = 0; i < 2; i++) {
                const bladeGeometry = new THREE.BoxGeometry(1.2, 0.02, 0.12)
                const bladeMaterial = new THREE.MeshStandardMaterial({
                    color: propellerColor,
                    metalness: 0.3,
                    roughness: 0.6,
                    transparent: true,
                    opacity: 0.9
                })
                const blade = new THREE.Mesh(bladeGeometry, bladeMaterial)
                blade.rotation.y = (i * Math.PI) / 2
                propellerGroup.add(blade)
            }

            this.group.add(propellerGroup)
            this.propellers.push(propellerGroup as any)
        })

        // 脚架
        const legPositions = [
            { x: 0.6, z: 0.6 },
            { x: -0.6, z: 0.6 },
            { x: 0.6, z: -0.6 },
            { x: -0.6, z: -0.6 }
        ]

        legPositions.forEach(pos => {
            const legGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8)
            const legMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666,
                metalness: 0.5,
                roughness: 0.5
            })
            const leg = new THREE.Mesh(legGeometry, legMaterial)
            leg.position.set(pos.x, -0.4, pos.z)
            leg.castShadow = true
            this.group.add(leg)

            // 脚垫
            const footGeometry = new THREE.SphereGeometry(0.08, 8, 8)
            const foot = new THREE.Mesh(footGeometry, legMaterial)
            foot.position.set(pos.x, -0.65, pos.z)
            this.group.add(foot)
        })

        // 应用缩放
        this.group.scale.setScalar(scale)
    }

    /**
     * 获取 3D 组
     */
    getObject3D(): THREE.Group {
        return this.group
    }

    /**
     * 启动螺旋桨
     */
    startPropellers(): void {
        this.isRunning = true
    }

    /**
     * 停止螺旋桨
     */
    stopPropellers(): void {
        this.isRunning = false
    }

    /**
     * 更新动画
     */
    update(deltaTime: number): void {
        // 更新螺旋桨速度
        if (this.isRunning) {
            this.propellerSpeed = Math.min(this.maxPropellerSpeed, this.propellerSpeed + deltaTime * 30)
        } else {
            this.propellerSpeed = Math.max(0, this.propellerSpeed - deltaTime * 20)
        }

        // 旋转螺旋桨
        this.propellers.forEach((propeller, index) => {
            const direction = index % 2 === 0 ? 1 : -1
            propeller.rotation.y += this.propellerSpeed * deltaTime * direction
        })

        // 悬停抖动效果
        if (this.isRunning && this.propellerSpeed > 10) {
            const hoverOffset = Math.sin(Date.now() * 0.003) * 0.02
            this.group.position.y += hoverOffset * deltaTime
        }
    }

    /**
     * 设置位置
     */
    setPosition(x: number, y: number, z: number): void {
        this.group.position.set(x, y, z)
    }

    /**
     * 获取位置
     */
    getPosition(): THREE.Vector3 {
        return this.group.position.clone()
    }

    /**
     * 设置旋转
     */
    setRotation(x: number, y: number, z: number): void {
        this.group.rotation.set(x, y, z)
    }

    /**
     * 获取旋转
     */
    getRotation(): THREE.Euler {
        return this.group.rotation.clone()
    }

    /**
     * 朝向目标
     */
    lookAt(target: THREE.Vector3): void {
        const direction = new THREE.Vector3().subVectors(target, this.group.position)
        direction.y = 0 // 只在水平面旋转

        if (direction.length() > 0.01) {
            const angle = Math.atan2(direction.x, direction.z)
            this.group.rotation.y = angle
        }
    }

    /**
     * 根据速度倾斜
     */
    applyTilt(velocityX: number, velocityZ: number, maxTilt: number = 0.3): void {
        // 根据速度方向倾斜
        this.group.rotation.z = -velocityX * maxTilt
        this.group.rotation.x = velocityZ * maxTilt
    }
}

export default DroneModel
