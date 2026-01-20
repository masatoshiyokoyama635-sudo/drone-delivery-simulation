/**
 * OpenStreetMap 数据加载器
 * 用于获取真实城市建筑数据并转换为 Three.js 几何体
 */

import * as THREE from 'three'

// 宁波天一广场中心坐标
export const TIANYI_CENTER = {
    lat: 29.8683,
    lng: 121.5440
}

// 地球半径 (米)
const EARTH_RADIUS = 6378137

export interface BuildingData {
    id: string
    coordinates: [number, number][]  // 轮廓坐标 [lng, lat]
    height: number                    // 高度 (米)
    levels?: number                   // 楼层数
    name?: string                     // 建筑名称
    type?: string                     // 建筑类型
}

export interface OSMLoaderConfig {
    centerLat: number
    centerLng: number
    radius: number        // 范围半径 (米)
    defaultHeight: number // 默认建筑高度
    levelHeight: number   // 每层高度
}

const DEFAULT_CONFIG: OSMLoaderConfig = {
    centerLat: TIANYI_CENTER.lat,
    centerLng: TIANYI_CENTER.lng,
    radius: 500,          // 500米范围
    defaultHeight: 15,    // 默认15米
    levelHeight: 3        // 每层3米
}

/**
 * 将经纬度转换为本地坐标系 (米)
 */
function latLngToLocal(lat: number, lng: number, centerLat: number, centerLng: number): [number, number] {
    const dLat = (lat - centerLat) * Math.PI / 180
    const dLng = (lng - centerLng) * Math.PI / 180

    const x = dLng * EARTH_RADIUS * Math.cos(centerLat * Math.PI / 180)
    const z = -dLat * EARTH_RADIUS  // 负号使北方为 +Z

    return [x, z]
}

/**
 * 从 Overpass API 获取建筑数据
 */
export async function fetchBuildingsFromOSM(config: Partial<OSMLoaderConfig> = {}): Promise<BuildingData[]> {
    const cfg = { ...DEFAULT_CONFIG, ...config }

    // 计算边界框
    const latOffset = cfg.radius / EARTH_RADIUS * 180 / Math.PI
    const lngOffset = latOffset / Math.cos(cfg.centerLat * Math.PI / 180)

    const bbox = {
        south: cfg.centerLat - latOffset,
        north: cfg.centerLat + latOffset,
        west: cfg.centerLng - lngOffset,
        east: cfg.centerLng + lngOffset
    }

    // Overpass QL 查询
    const query = `
    [out:json][timeout:30];
    (
      way["building"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      relation["building"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    );
    out body;
    >;
    out skel qt;
  `

    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })

        if (!response.ok) {
            throw new Error(`Overpass API error: ${response.status}`)
        }

        const data = await response.json()
        return parseOSMData(data, cfg)
    } catch (error) {
        console.error('Failed to fetch OSM data:', error)
        // 返回模拟数据作为备用
        return generateFallbackBuildings(cfg)
    }
}

/**
 * 解析 OSM 响应数据
 */
function parseOSMData(data: any, config: OSMLoaderConfig): BuildingData[] {
    const nodes: Map<number, [number, number]> = new Map()
    const buildings: BuildingData[] = []

    // 首先收集所有节点
    for (const element of data.elements) {
        if (element.type === 'node') {
            nodes.set(element.id, [element.lon, element.lat])
        }
    }

    // 然后处理建筑
    for (const element of data.elements) {
        if (element.type === 'way' && element.tags?.building) {
            const coords: [number, number][] = []

            for (const nodeId of element.nodes) {
                const node = nodes.get(nodeId)
                if (node) {
                    coords.push(node)
                }
            }

            if (coords.length >= 3) {
                // 计算高度
                let height = config.defaultHeight
                if (element.tags['building:levels']) {
                    height = parseInt(element.tags['building:levels']) * config.levelHeight
                } else if (element.tags['height']) {
                    height = parseFloat(element.tags['height'])
                }

                // 根据建筑类型调整高度
                if (element.tags.building === 'commercial' || element.tags.building === 'office') {
                    height = Math.max(height, 30)
                } else if (element.tags.building === 'residential') {
                    height = Math.max(height, 20)
                }

                buildings.push({
                    id: `way-${element.id}`,
                    coordinates: coords,
                    height,
                    levels: element.tags['building:levels'] ? parseInt(element.tags['building:levels']) : undefined,
                    name: element.tags.name,
                    type: element.tags.building
                })
            }
        }
    }

    console.log(`Loaded ${buildings.length} buildings from OSM`)
    return buildings
}

/**
 * 生成备用建筑数据 (当 API 不可用时)
 */
function generateFallbackBuildings(config: OSMLoaderConfig): BuildingData[] {
    const buildings: BuildingData[] = []

    // 生成网格化的建筑
    const gridSize = 80
    const buildingSize = 30

    for (let x = -config.radius; x < config.radius; x += gridSize) {
        for (let z = -config.radius; z < config.radius; z += gridSize) {
            // 跳过中心区域 (模拟广场)
            if (Math.abs(x) < 100 && Math.abs(z) < 100) continue

            // 随机决定是否放置建筑
            if (Math.random() > 0.7) continue

            const height = 15 + Math.random() * 80
            const halfSize = buildingSize / 2 + Math.random() * 10

            buildings.push({
                id: `fallback-${x}-${z}`,
                coordinates: [
                    [config.centerLng + x / EARTH_RADIUS * 180 / Math.PI, config.centerLat + (z - halfSize) / EARTH_RADIUS * 180 / Math.PI],
                    [config.centerLng + (x + halfSize) / EARTH_RADIUS * 180 / Math.PI, config.centerLat + (z - halfSize) / EARTH_RADIUS * 180 / Math.PI],
                    [config.centerLng + (x + halfSize) / EARTH_RADIUS * 180 / Math.PI, config.centerLat + (z + halfSize) / EARTH_RADIUS * 180 / Math.PI],
                    [config.centerLng + x / EARTH_RADIUS * 180 / Math.PI, config.centerLat + (z + halfSize) / EARTH_RADIUS * 180 / Math.PI],
                ],
                height,
                type: height > 50 ? 'commercial' : 'residential'
            })
        }
    }

    console.log(`Generated ${buildings.length} fallback buildings`)
    return buildings
}

/**
 * 创建程序化窗户纹理
 */
function createBuildingTexture(height: number, type: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = Math.min(512, Math.max(128, height * 8))
    const ctx = canvas.getContext('2d')!

    // 建筑外墙颜色
    const colors: { [key: string]: string } = {
        commercial: '#5a6a7a',
        office: '#4a5a6a',
        residential: '#8a9080',
        default: '#6a7a8a'
    }
    const baseColor = colors[type] || colors.default

    // 填充外墙
    ctx.fillStyle = baseColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 窗户参数
    const windowWidth = 12
    const windowHeight = 16
    const gapX = 6
    const gapY = 8
    const cols = Math.floor(canvas.width / (windowWidth + gapX))
    const rows = Math.floor(canvas.height / (windowHeight + gapY))

    // 绘制窗户
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * (windowWidth + gapX) + gapX / 2
            const y = row * (windowHeight + gapY) + gapY / 2

            // 随机窗户亮暗
            const isLit = Math.random() > 0.3
            if (isLit) {
                // 亮窗
                const gradient = ctx.createLinearGradient(x, y, x, y + windowHeight)
                gradient.addColorStop(0, '#a0d4e8')
                gradient.addColorStop(0.5, '#7ac4dc')
                gradient.addColorStop(1, '#5ab4d0')
                ctx.fillStyle = gradient
            } else {
                // 暗窗
                ctx.fillStyle = '#2a3a4a'
            }
            ctx.fillRect(x, y, windowWidth, windowHeight)

            // 窗框
            ctx.strokeStyle = '#3a4a5a'
            ctx.lineWidth = 1
            ctx.strokeRect(x, y, windowWidth, windowHeight)
        }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
}

/**
 * 将建筑数据转换为 Three.js 网格
 */
export function buildingsToMesh(
    buildings: BuildingData[],
    config: Partial<OSMLoaderConfig> = {}
): THREE.Group {
    const cfg = { ...DEFAULT_CONFIG, ...config }
    const group = new THREE.Group()

    // 过滤掉停机坪区域的建筑 (中心50米范围)
    const filteredBuildings = buildings.filter(b => {
        const center = b.coordinates.reduce((acc, [lng, lat]) => {
            const [x, z] = latLngToLocal(lat, lng, cfg.centerLat, cfg.centerLng)
            return { x: acc.x + x / b.coordinates.length, z: acc.z + z / b.coordinates.length }
        }, { x: 0, z: 0 })
        return Math.abs(center.x) > 50 || Math.abs(center.z) > 50
    })

    console.log(`Filtered ${buildings.length - filteredBuildings.length} buildings near landing pad`)

    for (const building of filteredBuildings) {
        try {
            // 转换坐标到本地坐标系
            const localCoords = building.coordinates.map(([lng, lat]) =>
                latLngToLocal(lat, lng, cfg.centerLat, cfg.centerLng)
            )

            // 创建 2D 形状
            const shape = new THREE.Shape()
            shape.moveTo(localCoords[0][0], localCoords[0][1])
            for (let i = 1; i < localCoords.length; i++) {
                shape.lineTo(localCoords[i][0], localCoords[i][1])
            }
            shape.closePath()

            // 挤出为 3D
            const geometry = new THREE.ExtrudeGeometry(shape, {
                depth: building.height,
                bevelEnabled: false
            })

            // 旋转使其竖直
            geometry.rotateX(-Math.PI / 2)

            // 创建带窗户纹理的材质
            const texture = createBuildingTexture(building.height, building.type || 'default')
            const material = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.7,
                metalness: 0.1
            })

            const mesh = new THREE.Mesh(geometry, material)
            mesh.castShadow = true
            mesh.receiveShadow = true
            mesh.userData = {
                id: building.id,
                name: building.name,
                height: building.height
            }

            group.add(mesh)
        } catch (error) {
            console.warn(`Failed to create mesh for building ${building.id}:`, error)
        }
    }

    console.log(`Created ${group.children.length} building meshes`)
    return group
}

/**
 * 创建地面平面
 */
export function createGround(size: number = 2000): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(size, size)
    geometry.rotateX(-Math.PI / 2)

    // 创建带纹理的地面
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    // 灰色沥青道路基础
    ctx.fillStyle = '#3a3a3a'
    ctx.fillRect(0, 0, 512, 512)

    // 添加一些纹理变化
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 512
        const y = Math.random() * 512
        ctx.fillStyle = Math.random() > 0.5 ? '#404040' : '#353535'
        ctx.fillRect(x, y, 2, 2)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(50, 50)

    const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.9,
        metalness: 0
    })

    const ground = new THREE.Mesh(geometry, material)
    ground.receiveShadow = true
    ground.position.y = -0.1

    return ground
}

/**
 * 从 OSM 获取道路数据
 */
export async function fetchRoadsFromOSM(config: Partial<OSMLoaderConfig> = {}): Promise<any[]> {
    const cfg = { ...DEFAULT_CONFIG, ...config }

    const latOffset = cfg.radius / EARTH_RADIUS * 180 / Math.PI
    const lngOffset = latOffset / Math.cos(cfg.centerLat * Math.PI / 180)

    const bbox = {
        south: cfg.centerLat - latOffset,
        north: cfg.centerLat + latOffset,
        west: cfg.centerLng - lngOffset,
        east: cfg.centerLng + lngOffset
    }

    const query = `
    [out:json][timeout:30];
    (
      way["highway"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    );
    out body;
    >;
    out skel qt;
  `

    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })

        if (!response.ok) throw new Error(`Overpass API error: ${response.status}`)

        const data = await response.json()
        return parseRoadData(data, cfg)
    } catch (error) {
        console.error('Failed to fetch road data:', error)
        return []
    }
}

function parseRoadData(data: any, config: OSMLoaderConfig): any[] {
    const nodes: Map<number, [number, number]> = new Map()
    const roads: any[] = []

    for (const element of data.elements) {
        if (element.type === 'node') {
            nodes.set(element.id, [element.lon, element.lat])
        }
    }

    for (const element of data.elements) {
        if (element.type === 'way' && element.tags?.highway) {
            const coords: [number, number][] = []
            for (const nodeId of element.nodes) {
                const node = nodes.get(nodeId)
                if (node) coords.push(node)
            }

            if (coords.length >= 2) {
                let width = 6  // 默认宽度
                if (['primary', 'secondary'].includes(element.tags.highway)) width = 12
                else if (['tertiary', 'residential'].includes(element.tags.highway)) width = 8
                else if (['footway', 'path'].includes(element.tags.highway)) width = 2

                roads.push({ coords, width, type: element.tags.highway })
            }
        }
    }

    console.log(`Loaded ${roads.length} roads from OSM`)
    return roads
}

/**
 * 将道路数据转换为 Three.js 网格
 */
export function roadsToMesh(roads: any[], config: Partial<OSMLoaderConfig> = {}): THREE.Group {
    const cfg = { ...DEFAULT_CONFIG, ...config }
    const group = new THREE.Group()

    const roadMaterial = new THREE.MeshStandardMaterial({
        color: 0x333340,
        roughness: 0.8,
        metalness: 0.1
    })

    for (const road of roads) {
        try {
            const points: THREE.Vector3[] = road.coords.map(([lng, lat]: [number, number]) => {
                const [x, z] = latLngToLocal(lat, lng, cfg.centerLat, cfg.centerLng)
                return new THREE.Vector3(x, 0.05, z)
            })

            if (points.length < 2) continue

            // 创建道路几何体 (使用简化的方块)
            for (let i = 0; i < points.length - 1; i++) {
                const start = points[i]
                const end = points[i + 1]
                const length = start.distanceTo(end)
                const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)

                const geometry = new THREE.BoxGeometry(length, 0.1, road.width)
                const mesh = new THREE.Mesh(geometry, roadMaterial)
                mesh.position.copy(midpoint)
                mesh.lookAt(end)
                mesh.rotateY(Math.PI / 2)
                mesh.receiveShadow = true

                group.add(mesh)
            }
        } catch (error) {
            console.warn('Failed to create road mesh:', error)
        }
    }

    console.log(`Created ${group.children.length} road segments`)
    return group
}

export default {
    fetchBuildingsFromOSM,
    buildingsToMesh,
    createGround,
    fetchRoadsFromOSM,
    roadsToMesh,
    TIANYI_CENTER
}
