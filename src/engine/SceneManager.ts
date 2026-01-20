/**
 * Three.js 场景管理器
 * 负责 3D 场景的创建、渲染和管理
 */

import * as THREE from 'three'

export interface SceneConfig {
    width: number
    height: number
    antialias?: boolean
    pixelRatio?: number
}

export class SceneManager {
    private scene: THREE.Scene
    private camera: THREE.PerspectiveCamera
    private renderer: THREE.WebGLRenderer | null = null
    private animationId: number | null = null
    private clock: THREE.Clock

    // 光照
    private ambientLight: THREE.AmbientLight
    private directionalLight: THREE.DirectionalLight

    // 配置
    private config: SceneConfig

    constructor(config: SceneConfig) {
        this.config = config
        this.clock = new THREE.Clock()

        // 创建场景
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(0x87CEEB) // 天蓝色背景
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 1000)

        // 创建相机
        this.camera = new THREE.PerspectiveCamera(
            60,
            config.width / config.height,
            0.1,
            2000
        )
        this.camera.position.set(0, 50, 100)
        this.camera.lookAt(0, 0, 0)

        // 创建光照
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        this.scene.add(this.ambientLight)

        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        this.directionalLight.position.set(100, 100, 50)
        this.directionalLight.castShadow = true
        this.directionalLight.shadow.mapSize.width = 2048
        this.directionalLight.shadow.mapSize.height = 2048
        this.scene.add(this.directionalLight)
    }

    /**
     * 初始化渲染器
     */
    initRenderer(canvas: HTMLCanvasElement | any): void {
        // 检查是否是小程序环境
        const isWeixin = typeof wx !== 'undefined'

        if (isWeixin) {
            // 小程序环境使用特殊的 WebGL 上下文
            const gl = canvas.getContext('webgl', { antialias: this.config.antialias })
            this.renderer = new THREE.WebGLRenderer({
                canvas,
                context: gl,
                antialias: this.config.antialias ?? true
            })
        } else {
            // H5/PC 环境
            this.renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: this.config.antialias ?? true
            })
        }

        this.renderer.setSize(this.config.width, this.config.height)
        this.renderer.setPixelRatio(this.config.pixelRatio || window.devicePixelRatio || 1)
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.renderer.toneMappingExposure = 1.0
    }

    /**
     * 获取场景
     */
    getScene(): THREE.Scene {
        return this.scene
    }

    /**
     * 获取相机
     */
    getCamera(): THREE.PerspectiveCamera {
        return this.camera
    }

    /**
     * 获取渲染器
     */
    getRenderer(): THREE.WebGLRenderer | null {
        return this.renderer
    }

    /**
     * 添加对象到场景
     */
    add(object: THREE.Object3D): void {
        this.scene.add(object)
    }

    /**
     * 从场景移除对象
     */
    remove(object: THREE.Object3D): void {
        this.scene.remove(object)
    }

    /**
     * 设置相机位置
     */
    setCameraPosition(x: number, y: number, z: number): void {
        this.camera.position.set(x, y, z)
    }

    /**
     * 设置相机看向目标
     */
    setCameraLookAt(x: number, y: number, z: number): void {
        this.camera.lookAt(x, y, z)
    }

    /**
     * 更新相机跟随
     */
    followTarget(target: THREE.Vector3, offset: THREE.Vector3 = new THREE.Vector3(0, 20, 50)): void {
        this.camera.position.copy(target).add(offset)
        this.camera.lookAt(target)
    }

    /**
     * 调整画布大小
     */
    resize(width: number, height: number): void {
        this.config.width = width
        this.config.height = height

        this.camera.aspect = width / height
        this.camera.updateProjectionMatrix()

        if (this.renderer) {
            this.renderer.setSize(width, height)
        }
    }

    /**
     * 渲染一帧
     */
    render(): void {
        if (this.renderer) {
            this.renderer.render(this.scene, this.camera)
        }
    }

    /**
     * 启动渲染循环
     */
    startRenderLoop(updateCallback?: (deltaTime: number) => void): void {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate)

            const deltaTime = this.clock.getDelta()

            if (updateCallback) {
                updateCallback(deltaTime)
            }

            this.render()
        }

        animate()
    }

    /**
     * 停止渲染循环
     */
    stopRenderLoop(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }
    }

    /**
     * 获取时钟增量时间
     */
    getDeltaTime(): number {
        return this.clock.getDelta()
    }

    /**
     * 销毁场景
     */
    dispose(): void {
        this.stopRenderLoop()

        // 清理场景中的所有对象
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose()
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose())
                } else {
                    object.material.dispose()
                }
            }
        })

        if (this.renderer) {
            this.renderer.dispose()
            this.renderer = null
        }
    }
}

export default SceneManager
