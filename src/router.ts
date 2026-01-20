import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

// 导入页面组件
import Home from './pages/index/index.vue'
import SceneSelect from './pages/scene-select/index.vue'
import Flight from './pages/flight/index.vue'
import Result from './pages/result/index.vue'
import Training from './pages/training/index.vue'
import TrainingFlight from './pages/training-flight/index.vue'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'home',
        component: Home
    },
    {
        path: '/pages/scene-select/index',
        name: 'scene-select',
        component: SceneSelect
    },
    {
        path: '/pages/flight/index',
        name: 'flight',
        component: Flight
    },
    {
        path: '/pages/result/index',
        name: 'result',
        component: Result
    },
    {
        path: '/pages/training/index',
        name: 'training',
        component: Training
    },
    {
        path: '/pages/training-flight/index',
        name: 'training-flight',
        component: TrainingFlight
    }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

export default router
