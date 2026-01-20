/**
 * 教程系统
 * 管理新手教程和课程进度
 */

export interface TutorialStep {
    id: string
    title: string
    description: string
    instruction: string
    highlightElement?: string  // CSS 选择器
    action?: 'click' | 'joystick' | 'wait' | 'reach'
    targetValue?: any
    duration?: number  // 等待时间（秒）
    position?: { x: number, y: number, z: number }  // 目标位置
}

export interface Tutorial {
    id: string
    name: string
    description: string
    category: 'basic' | 'flight' | 'navigation' | 'mission'
    steps: TutorialStep[]
    estimatedTime: number  // 预计完成时间（分钟）
}

export interface CourseChapter {
    id: string
    title: string
    description: string
    tutorials: Tutorial[]
    unlockRequirement?: string  // 需要完成的前置章节
}

export interface CourseProgress {
    completedTutorials: string[]
    currentTutorial?: string
    currentStep?: number
    totalScore: number
    timeSpent: number  // 秒
}

// 预设教程
export const TUTORIALS: Tutorial[] = [
    {
        id: 'tut_unlock',
        name: '解锁起飞',
        description: '学习如何解锁无人机并起飞',
        category: 'basic',
        estimatedTime: 2,
        steps: [
            {
                id: 'step_1',
                title: '欢迎',
                description: '欢迎来到无人机配送仿真系统！',
                instruction: '让我们开始学习基础操作。点击"继续"按钮。',
                action: 'wait',
                duration: 3
            },
            {
                id: 'step_2',
                title: '解锁无人机',
                description: '首先需要解锁无人机',
                instruction: '点击左侧的"解锁"按钮启动无人机电机',
                highlightElement: '.panel-btn:first-child',
                action: 'click'
            },
            {
                id: 'step_3',
                title: '观察螺旋桨',
                description: '无人机已解锁',
                instruction: '观察螺旋桨开始旋转，等待 3 秒',
                action: 'wait',
                duration: 3
            }
        ]
    },
    {
        id: 'tut_altitude',
        name: '高度控制',
        description: '学习控制无人机的升降',
        category: 'flight',
        estimatedTime: 3,
        steps: [
            {
                id: 'step_1',
                title: '左摇杆介绍',
                description: '左摇杆控制油门和旋转',
                instruction: '向上推动左摇杆来升高无人机',
                highlightElement: '.joystick-container.left',
                action: 'joystick'
            },
            {
                id: 'step_2',
                title: '升高到 50 米',
                description: '尝试升高无人机',
                instruction: '继续向上推动左摇杆，直到高度达到 50 米',
                action: 'reach',
                targetValue: { altitude: 50 }
            },
            {
                id: 'step_3',
                title: '下降',
                description: '现在尝试下降',
                instruction: '向下拉动左摇杆来降低高度',
                action: 'joystick'
            },
            {
                id: 'step_4',
                title: '悬停',
                description: '保持高度',
                instruction: '松开摇杆，无人机将自动悬停在当前高度',
                action: 'wait',
                duration: 3
            }
        ]
    },
    {
        id: 'tut_movement',
        name: '移动控制',
        description: '学习控制无人机的水平移动',
        category: 'flight',
        estimatedTime: 4,
        steps: [
            {
                id: 'step_1',
                title: '右摇杆介绍',
                description: '右摇杆控制前后左右移动',
                instruction: '向上推动右摇杆来向前飞行',
                highlightElement: '.joystick-container.right',
                action: 'joystick'
            },
            {
                id: 'step_2',
                title: '向前飞行',
                description: '尝试向前飞行',
                instruction: '保持向前推动，飞行一小段距离',
                action: 'reach',
                position: { x: 0, y: 50, z: 30 }
            },
            {
                id: 'step_3',
                title: '横向移动',
                description: '尝试左右移动',
                instruction: '向左或向右推动右摇杆',
                action: 'joystick'
            },
            {
                id: 'step_4',
                title: '旋转',
                description: '使用左摇杆旋转',
                instruction: '左右推动左摇杆来改变无人机朝向',
                action: 'joystick'
            }
        ]
    },
    {
        id: 'tut_landing',
        name: '降落技巧',
        description: '学习安全降落无人机',
        category: 'flight',
        estimatedTime: 3,
        steps: [
            {
                id: 'step_1',
                title: '准备降落',
                description: '降落是重要的技能',
                instruction: '首先确保无人机在起降平台上方',
                action: 'wait',
                duration: 2
            },
            {
                id: 'step_2',
                title: '缓慢下降',
                description: '开始下降',
                instruction: '轻轻向下拉动左摇杆，缓慢降低高度',
                action: 'reach',
                targetValue: { altitude: 5 }
            },
            {
                id: 'step_3',
                title: '完成降落',
                description: '即将着陆',
                instruction: '继续缓慢下降直到着陆',
                action: 'reach',
                targetValue: { altitude: 0 }
            }
        ]
    }
]

// 课程章节
export const COURSE_CHAPTERS: CourseChapter[] = [
    {
        id: 'chapter_1',
        title: '第一章：无人机基础',
        description: '学习无人机的基本知识和操作',
        tutorials: [TUTORIALS[0]] // 解锁起飞
    },
    {
        id: 'chapter_2',
        title: '第二章：飞行控制',
        description: '掌握无人机的基本飞行技巧',
        tutorials: [TUTORIALS[1], TUTORIALS[2], TUTORIALS[3]], // 高度、移动、降落
        unlockRequirement: 'chapter_1'
    }
]

export class TutorialManager {
    private progress: CourseProgress
    private currentTutorial: Tutorial | null = null
    private currentStepIndex: number = 0
    private onStepComplete?: (stepId: string) => void
    private onTutorialComplete?: (tutorialId: string) => void

    constructor() {
        this.progress = {
            completedTutorials: [],
            totalScore: 0,
            timeSpent: 0
        }

        // 尝试从本地存储加载进度
        this.loadProgress()
    }

    /**
     * 获取所有教程
     */
    getTutorials(): Tutorial[] {
        return TUTORIALS
    }

    /**
     * 获取课程章节
     */
    getChapters(): CourseChapter[] {
        return COURSE_CHAPTERS
    }

    /**
     * 获取进度
     */
    getProgress(): CourseProgress {
        return { ...this.progress }
    }

    /**
     * 检查章节是否解锁
     */
    isChapterUnlocked(chapterId: string): boolean {
        const chapter = COURSE_CHAPTERS.find(c => c.id === chapterId)
        if (!chapter) return false

        if (!chapter.unlockRequirement) return true

        // 检查前置章节的所有教程是否完成
        const reqChapter = COURSE_CHAPTERS.find(c => c.id === chapter.unlockRequirement)
        if (!reqChapter) return true

        return reqChapter.tutorials.every(t =>
            this.progress.completedTutorials.includes(t.id)
        )
    }

    /**
     * 检查教程是否完成
     */
    isTutorialCompleted(tutorialId: string): boolean {
        return this.progress.completedTutorials.includes(tutorialId)
    }

    /**
     * 开始教程
     */
    startTutorial(tutorialId: string): Tutorial | null {
        const tutorial = TUTORIALS.find(t => t.id === tutorialId)
        if (!tutorial) return null

        this.currentTutorial = tutorial
        this.currentStepIndex = 0
        this.progress.currentTutorial = tutorialId
        this.progress.currentStep = 0

        return tutorial
    }

    /**
     * 获取当前教程
     */
    getCurrentTutorial(): Tutorial | null {
        return this.currentTutorial
    }

    /**
     * 获取当前步骤
     */
    getCurrentStep(): TutorialStep | null {
        if (!this.currentTutorial) return null
        return this.currentTutorial.steps[this.currentStepIndex] || null
    }

    /**
     * 前进到下一步
     */
    nextStep(): TutorialStep | null {
        if (!this.currentTutorial) return null

        const currentStep = this.getCurrentStep()
        if (currentStep && this.onStepComplete) {
            this.onStepComplete(currentStep.id)
        }

        this.currentStepIndex++
        this.progress.currentStep = this.currentStepIndex

        // 检查是否完成教程
        if (this.currentStepIndex >= this.currentTutorial.steps.length) {
            this.completeTutorial()
            return null
        }

        return this.getCurrentStep()
    }

    /**
     * 完成教程
     */
    private completeTutorial(): void {
        if (!this.currentTutorial) return

        const tutorialId = this.currentTutorial.id

        if (!this.progress.completedTutorials.includes(tutorialId)) {
            this.progress.completedTutorials.push(tutorialId)
            this.progress.totalScore += 100
        }

        if (this.onTutorialComplete) {
            this.onTutorialComplete(tutorialId)
        }

        this.currentTutorial = null
        this.progress.currentTutorial = undefined
        this.progress.currentStep = undefined

        this.saveProgress()
    }

    /**
     * 退出教程
     */
    exitTutorial(): void {
        this.currentTutorial = null
        this.currentStepIndex = 0
        this.progress.currentTutorial = undefined
        this.progress.currentStep = undefined
    }

    /**
     * 设置回调
     */
    setCallbacks(
        onStepComplete?: (stepId: string) => void,
        onTutorialComplete?: (tutorialId: string) => void
    ): void {
        this.onStepComplete = onStepComplete
        this.onTutorialComplete = onTutorialComplete
    }

    /**
     * 保存进度
     */
    private saveProgress(): void {
        try {
            uni.setStorageSync('tutorial_progress', JSON.stringify(this.progress))
        } catch (e) {
            console.error('Failed to save progress:', e)
        }
    }

    /**
     * 加载进度
     */
    private loadProgress(): void {
        try {
            const saved = uni.getStorageSync('tutorial_progress')
            if (saved) {
                this.progress = JSON.parse(saved)
            }
        } catch (e) {
            console.error('Failed to load progress:', e)
        }
    }

    /**
     * 重置进度
     */
    resetProgress(): void {
        this.progress = {
            completedTutorials: [],
            totalScore: 0,
            timeSpent: 0
        }
        this.saveProgress()
    }

    /**
     * 获取完成百分比
     */
    getCompletionPercentage(): number {
        const total = TUTORIALS.length
        const completed = this.progress.completedTutorials.length
        return Math.round((completed / total) * 100)
    }
}

export default TutorialManager
