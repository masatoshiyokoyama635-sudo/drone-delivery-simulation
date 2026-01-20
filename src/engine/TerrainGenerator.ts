/**
 * 地形生成器
 * 创建程序化生成的 3D 地形
 */

import * as THREE from 'three'

export interface TerrainConfig {
    width: number
    depth: number
    segments: number
    maxHeight: number
    seed?: number
}

export class TerrainGenerator {
    private config: TerrainConfig

    constructor(config: TerrainConfig) {
        this.config = config
    }

    /**
     * 简单的噪声函数（伪随机）
     */
    private noise(x: number, z: number, seed: number = 12345): number {
        const n = Math.sin(x * 12.9898 + z * 78.233 + seed) * 43758.5453
        return n - Math.floor(n)
    }

    /**
     * 平滑插值
     */
    private smoothNoise(x: number, z: number, seed: number): number {
        const corners = (
            this.noise(x - 1, z - 1, seed) +
            this.noise(x + 1, z - 1, seed) +
            this.noise(x - 1, z + 1, seed) +
            this.noise(x + 1, z + 1, seed)
        ) / 16

        const sides = (
            this.noise(x - 1, z, seed) +
            this.noise(x + 1, z, seed) +
            this.noise(x, z - 1, seed) +
            this.noise(x, z + 1, seed)
        ) / 8

        const center = this.noise(x, z, seed) / 4

        return corners + sides + center
    }

    /**
     * 余弦插值
     */
    private interpolate(a: number, b: number, t: number): number {
        const ft = t * Math.PI
        const f = (1 - Math.cos(ft)) * 0.5
        return a * (1 - f) + b * f
    }

    /**
     * 分形噪声
     */
    private fractalNoise(x: number, z: number, octaves: number = 4): number {
        let total = 0
        let frequency = 0.02
        let amplitude = 1
        let maxValue = 0
        const seed = this.config.seed || 12345

        for (let i = 0; i < octaves; i++) {
            total += this.smoothNoise(x * frequency, z * frequency, seed + i * 100) * amplitude
            maxValue += amplitude
            amplitude *= 0.5
            frequency *= 2
        }

        return total / maxValue
    }

    /**
     * 生成地形网格
     */
    createTerrain(): THREE.Mesh {
        const { width, depth, segments, maxHeight } = this.config

        // 创建平面几何体
        const geometry = new THREE.PlaneGeometry(width, depth, segments, segments)
        geometry.rotateX(-Math.PI / 2)

        // 获取顶点位置
        const positions = geometry.attributes.position

        // 修改顶点高度
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i)
            const z = positions.getZ(i)

            // 使用分形噪声生成高度
            let height = this.fractalNoise(x, z, 4) * maxHeight

            // 在边缘降低高度，创建平坦区域（起飞/降落区）
            const distFromCenter = Math.sqrt(x * x + z * z)
            const edgeFactor = Math.min(1, distFromCenter / (width * 0.4))
            height *= edgeFactor

            positions.setY(i, height)
        }

        // 计算法线
        geometry.computeVertexNormals()

        // 创建材质 - 渐变色地形
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            flatShading: false,
            side: THREE.DoubleSide
        })

        // 添加顶点颜色（根据高度着色）
        const colors = new Float32Array(positions.count * 3)
        const lowColor = new THREE.Color(0x3d9140) // 深绿
        const midColor = new THREE.Color(0x7cba38) // 浅绿
        const highColor = new THREE.Color(0x8b7355) // 棕色（山顶）

        for (let i = 0; i < positions.count; i++) {
            const y = positions.getY(i)
            const normalizedHeight = y / maxHeight

            let color: THREE.Color
            if (normalizedHeight < 0.3) {
                color = lowColor.clone().lerp(midColor, normalizedHeight / 0.3)
            } else {
                color = midColor.clone().lerp(highColor, (normalizedHeight - 0.3) / 0.7)
            }

            colors[i * 3] = color.r
            colors[i * 3 + 1] = color.g
            colors[i * 3 + 2] = color.b
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

        // 创建网格
        const terrain = new THREE.Mesh(geometry, material)
        terrain.receiveShadow = true
        terrain.name = 'terrain'

        return terrain
    }

    /**
     * 创建简单的城市建筑群
     */
    createBuildings(count: number = 20, areaSize: number = 400): THREE.Group {
        const buildings = new THREE.Group()
        buildings.name = 'buildings'

        for (let i = 0; i < count; i++) {
            // 随机位置
            const x = (Math.random() - 0.5) * areaSize
            const z = (Math.random() - 0.5) * areaSize

            // 随机大小
            const width = 10 + Math.random() * 20
            const depth = 10 + Math.random() * 20
            const height = 20 + Math.random() * 60

            // 创建建筑
            const geometry = new THREE.BoxGeometry(width, height, depth)
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.6, 0.1, 0.3 + Math.random() * 0.3),
                roughness: 0.8,
                metalness: 0.2
            })

            const building = new THREE.Mesh(geometry, material)
            building.position.set(x, height / 2, z)
            building.castShadow = true
            building.receiveShadow = true

            buildings.add(building)
        }

        return buildings
    }

    /**
     * 创建天空盒
     */
    createSkybox(): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(1000, 32, 32)

        // 创建渐变天空材质
        const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

        const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `

        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0xffffff) },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            side: THREE.BackSide
        })

        const sky = new THREE.Mesh(geometry, material)
        sky.name = 'sky'

        return sky
    }

    /**
     * 创建起降平台
     */
    createLandingPad(position: THREE.Vector3 = new THREE.Vector3(0, 0.1, 0)): THREE.Group {
        const pad = new THREE.Group()
        pad.name = 'landingPad'

        // 平台基座
        const baseGeometry = new THREE.CylinderGeometry(8, 8, 0.5, 32)
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.5
        })
        const base = new THREE.Mesh(baseGeometry, baseMaterial)
        base.receiveShadow = true
        pad.add(base)

        // H 标记
        const hGeometry = new THREE.PlaneGeometry(6, 6)
        const hMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        })
        const hMark = new THREE.Mesh(hGeometry, hMaterial)
        hMark.rotation.x = -Math.PI / 2
        hMark.position.y = 0.3
        pad.add(hMark)

        // 边缘灯光效果
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2
            const lightGeometry = new THREE.SphereGeometry(0.3, 8, 8)
            const lightMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                emissive: 0x00ff00,
                emissiveIntensity: 1
            })
            const light = new THREE.Mesh(lightGeometry, lightMaterial)
            light.position.set(Math.cos(angle) * 7, 0.4, Math.sin(angle) * 7)
            pad.add(light)
        }

        pad.position.copy(position)

        return pad
    }
}

export default TerrainGenerator
