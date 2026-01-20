/**
 * 飞行物理引擎
 * 模拟无人机的物理行为，包括重力、推力、阻力等
 */

import * as THREE from 'three'

export interface FlightPhysicsConfig {
    mass: number              // 质量 (kg)
    maxThrust: number         // 最大推力 (N)
    dragCoefficient: number   // 阻力系数
    liftCoefficient: number   // 升力系数
    maxSpeed: number          // 最大速度 (m/s)
    maxAltitude: number       // 最大高度 (m)
    rotationSpeed: number     // 旋转速度 (rad/s)
    tiltAngle: number         // 最大倾斜角度 (rad)
    gravity: number           // 重力加速度 (m/s²)
}

export interface FlightState {
    position: THREE.Vector3
    velocity: THREE.Vector3
    acceleration: THREE.Vector3
    rotation: THREE.Euler
    angularVelocity: THREE.Vector3
    altitude: number
    speed: number
    heading: number
    isGrounded: boolean
}

export interface ControlInput {
    throttle: number    // -1 to 1 (下降/上升)
    yaw: number         // -1 to 1 (左转/右转)
    pitch: number       // -1 to 1 (后退/前进)
    roll: number        // -1 to 1 (左移/右移)
}

const DEFAULT_CONFIG: FlightPhysicsConfig = {
    mass: 5,
    maxThrust: 100,
    dragCoefficient: 0.3,
    liftCoefficient: 0.5,
    maxSpeed: 20,
    maxAltitude: 500,
    rotationSpeed: 2,
    tiltAngle: 0.5,
    gravity: 9.8
}

export class FlightPhysics {
    private config: FlightPhysicsConfig
    private state: FlightState
    private isEngineRunning: boolean = false

    constructor(config: Partial<FlightPhysicsConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config }

        this.state = {
            position: new THREE.Vector3(0, 0, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            acceleration: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Euler(0, 0, 0),
            angularVelocity: new THREE.Vector3(0, 0, 0),
            altitude: 0,
            speed: 0,
            heading: 0,
            isGrounded: true
        }
    }

    /**
     * 启动引擎
     */
    startEngine(): void {
        this.isEngineRunning = true
    }

    /**
     * 停止引擎
     */
    stopEngine(): void {
        this.isEngineRunning = false
    }

    /**
     * 获取引擎状态
     */
    isRunning(): boolean {
        return this.isEngineRunning
    }

    /**
     * 获取当前状态
     */
    getState(): FlightState {
        return { ...this.state }
    }

    /**
     * 设置位置
     */
    setPosition(x: number, y: number, z: number): void {
        this.state.position.set(x, y, z)
        this.state.altitude = y
        this.state.isGrounded = y <= 0.1
    }

    /**
     * 设置旋转
     */
    setRotation(x: number, y: number, z: number): void {
        this.state.rotation.set(x, y, z)
        this.state.heading = y
    }

    /**
     * 更新物理状态
     */
    update(deltaTime: number, input: ControlInput): void {
        if (!this.isEngineRunning) {
            // 引擎关闭时，应用重力
            this.applyGravity(deltaTime)
            this.updatePosition(deltaTime)
            return
        }

        // 计算推力
        const thrust = this.calculateThrust(input)

        // 计算阻力
        const drag = this.calculateDrag()

        // 计算合力
        const gravity = new THREE.Vector3(0, -this.config.gravity * this.config.mass, 0)
        const totalForce = thrust.clone().add(drag).add(gravity)

        // 计算加速度 (F = ma)
        this.state.acceleration = totalForce.divideScalar(this.config.mass)

        // 更新速度
        this.state.velocity.add(this.state.acceleration.clone().multiplyScalar(deltaTime))

        // 限制最大速度
        const horizontalSpeed = Math.sqrt(
            this.state.velocity.x ** 2 + this.state.velocity.z ** 2
        )
        if (horizontalSpeed > this.config.maxSpeed) {
            const scale = this.config.maxSpeed / horizontalSpeed
            this.state.velocity.x *= scale
            this.state.velocity.z *= scale
        }

        // 更新位置
        this.updatePosition(deltaTime)

        // 更新旋转
        this.updateRotation(deltaTime, input)

        // 更新倾斜角度（根据移动方向）
        this.updateTilt(input)

        // 边界检查
        this.enforceBoundaries()

        // 更新辅助数据
        this.state.altitude = this.state.position.y
        this.state.speed = this.state.velocity.length()
        this.state.heading = this.state.rotation.y
        this.state.isGrounded = this.state.position.y <= 0.1
    }

    /**
     * 计算推力
     */
    private calculateThrust(input: ControlInput): THREE.Vector3 {
        const thrust = new THREE.Vector3()

        // 垂直推力（油门）
        // 悬停需要抵消重力
        const hoverThrust = this.config.gravity * this.config.mass
        const verticalThrust = hoverThrust + input.throttle * this.config.maxThrust * 0.5
        thrust.y = Math.max(0, verticalThrust)

        // 水平推力（根据当前朝向）
        const heading = this.state.rotation.y
        const cos = Math.cos(heading)
        const sin = Math.sin(heading)

        // 前后移动
        const forwardThrust = input.pitch * this.config.maxThrust * 0.3
        thrust.x += forwardThrust * sin
        thrust.z += forwardThrust * cos

        // 左右移动
        const strafeThrust = input.roll * this.config.maxThrust * 0.3
        thrust.x += strafeThrust * cos
        thrust.z += strafeThrust * -sin

        return thrust
    }

    /**
     * 计算阻力
     */
    private calculateDrag(): THREE.Vector3 {
        // 阻力与速度的平方成正比，方向与速度相反
        const speed = this.state.velocity.length()
        if (speed < 0.01) return new THREE.Vector3()

        const dragMagnitude = this.config.dragCoefficient * speed * speed
        const drag = this.state.velocity.clone().normalize().multiplyScalar(-dragMagnitude)

        return drag
    }

    /**
     * 应用重力（引擎关闭时）
     */
    private applyGravity(deltaTime: number): void {
        if (this.state.position.y > 0) {
            this.state.velocity.y -= this.config.gravity * deltaTime
        } else {
            this.state.velocity.set(0, 0, 0)
            this.state.position.y = 0
        }
    }

    /**
     * 更新位置
     */
    private updatePosition(deltaTime: number): void {
        this.state.position.add(this.state.velocity.clone().multiplyScalar(deltaTime))
    }

    /**
     * 更新旋转
     */
    private updateRotation(deltaTime: number, input: ControlInput): void {
        // 偏航（左右转向）
        this.state.rotation.y += input.yaw * this.config.rotationSpeed * deltaTime

        // 保持偏航角在 -PI 到 PI 之间
        while (this.state.rotation.y > Math.PI) this.state.rotation.y -= Math.PI * 2
        while (this.state.rotation.y < -Math.PI) this.state.rotation.y += Math.PI * 2
    }

    /**
     * 更新倾斜角度
     */
    private updateTilt(input: ControlInput): void {
        // 根据移动输入倾斜无人机
        const targetPitch = -input.pitch * this.config.tiltAngle // 前倾/后仰
        const targetRoll = -input.roll * this.config.tiltAngle   // 左倾/右倾

        // 平滑过渡
        const lerpFactor = 0.1
        this.state.rotation.x = THREE.MathUtils.lerp(this.state.rotation.x, targetPitch, lerpFactor)
        this.state.rotation.z = THREE.MathUtils.lerp(this.state.rotation.z, targetRoll, lerpFactor)
    }

    /**
     * 边界检查
     */
    private enforceBoundaries(): void {
        // 地面碰撞
        if (this.state.position.y < 0) {
            this.state.position.y = 0
            this.state.velocity.y = 0
        }

        // 最大高度限制
        if (this.state.position.y > this.config.maxAltitude) {
            this.state.position.y = this.config.maxAltitude
            this.state.velocity.y = Math.min(0, this.state.velocity.y)
        }

        // 水平边界（可选，防止飞太远）
        const maxDistance = 1000
        const horizontalDist = Math.sqrt(
            this.state.position.x ** 2 + this.state.position.z ** 2
        )
        if (horizontalDist > maxDistance) {
            const scale = maxDistance / horizontalDist
            this.state.position.x *= scale
            this.state.position.z *= scale
        }
    }

    /**
     * 重置到初始状态
     */
    reset(): void {
        this.state.position.set(0, 0, 0)
        this.state.velocity.set(0, 0, 0)
        this.state.acceleration.set(0, 0, 0)
        this.state.rotation.set(0, 0, 0)
        this.state.angularVelocity.set(0, 0, 0)
        this.state.altitude = 0
        this.state.speed = 0
        this.state.heading = 0
        this.state.isGrounded = true
        this.isEngineRunning = false
    }

    /**
     * 获取到目标点的距离
     */
    getDistanceTo(target: THREE.Vector3): number {
        return this.state.position.distanceTo(target)
    }

    /**
     * 计算到目标的方向
     */
    getDirectionTo(target: THREE.Vector3): THREE.Vector3 {
        return target.clone().sub(this.state.position).normalize()
    }
}

export default FlightPhysics
