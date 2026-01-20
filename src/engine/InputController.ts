/**
 * 输入控制器
 * 处理触摸屏、键盘、游戏手柄等输入设备
 */

export interface JoystickState {
    x: number  // -1 to 1
    y: number  // -1 to 1
    active: boolean
}

export interface InputState {
    leftJoystick: JoystickState
    rightJoystick: JoystickState
    buttons: {
        unlock: boolean
        returnHome: boolean
        land: boolean
        modeS: boolean
        modeP: boolean
        modeT: boolean
    }
}

export type InputCallback = (input: InputState) => void

export class InputController {
    private inputState: InputState
    private callbacks: InputCallback[] = []

    // 触摸相关
    private leftTouchId: number | null = null
    private rightTouchId: number | null = null
    private leftTouchStart: { x: number, y: number } = { x: 0, y: 0 }
    private rightTouchStart: { x: number, y: number } = { x: 0, y: 0 }

    // 配置
    private joystickSensitivity: number = 1
    private joystickDeadzone: number = 0.1
    private screenWidth: number = 375

    constructor() {
        this.inputState = {
            leftJoystick: { x: 0, y: 0, active: false },
            rightJoystick: { x: 0, y: 0, active: false },
            buttons: {
                unlock: false,
                returnHome: false,
                land: false,
                modeS: false,
                modeP: false,
                modeT: false
            }
        }
    }

    /**
     * 设置屏幕宽度（用于判断左右摇杆）
     */
    setScreenWidth(width: number): void {
        this.screenWidth = width
    }

    /**
     * 设置摇杆灵敏度
     */
    setSensitivity(sensitivity: number): void {
        this.joystickSensitivity = sensitivity
    }

    /**
     * 设置摇杆死区
     */
    setDeadzone(deadzone: number): void {
        this.joystickDeadzone = deadzone
    }

    /**
     * 获取当前输入状态
     */
    getState(): InputState {
        return { ...this.inputState }
    }

    /**
     * 注册输入回调
     */
    onInput(callback: InputCallback): () => void {
        this.callbacks.push(callback)
        return () => {
            const index = this.callbacks.indexOf(callback)
            if (index > -1) this.callbacks.splice(index, 1)
        }
    }

    /**
     * 触发回调
     */
    private emitInput(): void {
        this.callbacks.forEach(cb => cb(this.inputState))
    }

    /**
     * 处理触摸开始
     */
    handleTouchStart(touches: Array<{ identifier: number, clientX: number, clientY: number }>): void {
        for (const touch of touches) {
            const isLeft = touch.clientX < this.screenWidth / 2

            if (isLeft && this.leftTouchId === null) {
                this.leftTouchId = touch.identifier
                this.leftTouchStart = { x: touch.clientX, y: touch.clientY }
                this.inputState.leftJoystick.active = true
            } else if (!isLeft && this.rightTouchId === null) {
                this.rightTouchId = touch.identifier
                this.rightTouchStart = { x: touch.clientX, y: touch.clientY }
                this.inputState.rightJoystick.active = true
            }
        }

        this.emitInput()
    }

    /**
     * 处理触摸移动
     */
    handleTouchMove(touches: Array<{ identifier: number, clientX: number, clientY: number }>): void {
        for (const touch of touches) {
            if (touch.identifier === this.leftTouchId) {
                this.updateJoystick('left', touch.clientX, touch.clientY)
            } else if (touch.identifier === this.rightTouchId) {
                this.updateJoystick('right', touch.clientX, touch.clientY)
            }
        }

        this.emitInput()
    }

    /**
     * 处理触摸结束
     */
    handleTouchEnd(changedTouches: Array<{ identifier: number }>): void {
        for (const touch of changedTouches) {
            if (touch.identifier === this.leftTouchId) {
                this.leftTouchId = null
                this.inputState.leftJoystick = { x: 0, y: 0, active: false }
            } else if (touch.identifier === this.rightTouchId) {
                this.rightTouchId = null
                this.inputState.rightJoystick = { x: 0, y: 0, active: false }
            }
        }

        this.emitInput()
    }

    /**
     * 更新摇杆值
     */
    private updateJoystick(side: 'left' | 'right', currentX: number, currentY: number): void {
        const start = side === 'left' ? this.leftTouchStart : this.rightTouchStart
        const joystick = side === 'left' ? this.inputState.leftJoystick : this.inputState.rightJoystick

        // 计算偏移量
        const maxRadius = 60 // 摇杆最大半径
        let dx = (currentX - start.x) / maxRadius
        let dy = -(currentY - start.y) / maxRadius // 注意Y轴方向

        // 应用灵敏度
        dx *= this.joystickSensitivity
        dy *= this.joystickSensitivity

        // 限制范围
        const magnitude = Math.sqrt(dx * dx + dy * dy)
        if (magnitude > 1) {
            dx /= magnitude
            dy /= magnitude
        }

        // 应用死区
        if (magnitude < this.joystickDeadzone) {
            dx = 0
            dy = 0
        }

        joystick.x = dx
        joystick.y = dy
    }

    /**
     * 处理键盘按下
     */
    handleKeyDown(key: string): void {
        switch (key.toLowerCase()) {
            case 'w':
                this.inputState.rightJoystick.y = 1
                this.inputState.rightJoystick.active = true
                break
            case 's':
                this.inputState.rightJoystick.y = -1
                this.inputState.rightJoystick.active = true
                break
            case 'a':
                this.inputState.rightJoystick.x = -1
                this.inputState.rightJoystick.active = true
                break
            case 'd':
                this.inputState.rightJoystick.x = 1
                this.inputState.rightJoystick.active = true
                break
            case 'q':
                this.inputState.leftJoystick.x = -1
                this.inputState.leftJoystick.active = true
                break
            case 'e':
                this.inputState.leftJoystick.x = 1
                this.inputState.leftJoystick.active = true
                break
            case 'shift':
                this.inputState.leftJoystick.y = 1
                this.inputState.leftJoystick.active = true
                break
            case 'control':
                this.inputState.leftJoystick.y = -1
                this.inputState.leftJoystick.active = true
                break
            case '1':
                this.inputState.buttons.modeS = true
                break
            case '2':
                this.inputState.buttons.modeP = true
                break
            case '3':
                this.inputState.buttons.modeT = true
                break
            case 'r':
                this.inputState.buttons.returnHome = true
                break
            case ' ':
                this.inputState.buttons.unlock = true
                break
        }

        this.emitInput()
    }

    /**
     * 处理键盘释放
     */
    handleKeyUp(key: string): void {
        switch (key.toLowerCase()) {
            case 'w':
            case 's':
                this.inputState.rightJoystick.y = 0
                if (this.inputState.rightJoystick.x === 0) {
                    this.inputState.rightJoystick.active = false
                }
                break
            case 'a':
            case 'd':
                this.inputState.rightJoystick.x = 0
                if (this.inputState.rightJoystick.y === 0) {
                    this.inputState.rightJoystick.active = false
                }
                break
            case 'q':
            case 'e':
                this.inputState.leftJoystick.x = 0
                if (this.inputState.leftJoystick.y === 0) {
                    this.inputState.leftJoystick.active = false
                }
                break
            case 'shift':
            case 'control':
                this.inputState.leftJoystick.y = 0
                if (this.inputState.leftJoystick.x === 0) {
                    this.inputState.leftJoystick.active = false
                }
                break
            case '1':
                this.inputState.buttons.modeS = false
                break
            case '2':
                this.inputState.buttons.modeP = false
                break
            case '3':
                this.inputState.buttons.modeT = false
                break
            case 'r':
                this.inputState.buttons.returnHome = false
                break
            case ' ':
                this.inputState.buttons.unlock = false
                break
        }

        this.emitInput()
    }

    /**
     * 获取控制输入（用于物理引擎）
     */
    getControlInput(): { throttle: number, yaw: number, pitch: number, roll: number } {
        return {
            throttle: this.inputState.leftJoystick.y,
            yaw: this.inputState.leftJoystick.x,
            pitch: this.inputState.rightJoystick.y,
            roll: this.inputState.rightJoystick.x
        }
    }

    /**
     * 重置输入状态
     */
    reset(): void {
        this.inputState.leftJoystick = { x: 0, y: 0, active: false }
        this.inputState.rightJoystick = { x: 0, y: 0, active: false }
        this.inputState.buttons = {
            unlock: false,
            returnHome: false,
            land: false,
            modeS: false,
            modeP: false,
            modeT: false
        }
        this.leftTouchId = null
        this.rightTouchId = null

        this.emitInput()
    }
}

export default InputController
