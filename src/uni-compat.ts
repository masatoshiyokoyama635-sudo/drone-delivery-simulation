/**
 * uni-app API 兼容层
 * 在 H5 环境下模拟 uni-app API
 */

import router from './router'

// 模拟 uni 对象
const uni = {
    // 页面导航
    navigateTo(options: { url: string }) {
        router.push(options.url)
    },

    redirectTo(options: { url: string }) {
        router.replace(options.url)
    },

    navigateBack() {
        router.back()
    },

    reLaunch(options: { url: string }) {
        router.replace(options.url)
    },

    // Toast 提示
    showToast(options: { title: string, icon?: string, duration?: number }) {
        const toast = document.createElement('div')
        toast.className = 'uni-toast'
        toast.innerHTML = `
      <div class="uni-toast-content">
        ${options.icon === 'success' ? '<span class="toast-icon">✓</span>' : ''}
        <span class="toast-text">${options.title}</span>
      </div>
    `

        // 添加样式
        toast.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
    `

        document.body.appendChild(toast)

        setTimeout(() => {
            toast.remove()
        }, options.duration || 1500)
    },

    // ActionSheet
    showActionSheet(options: { itemList: string[], success?: (res: { tapIndex: number }) => void }) {
        const overlay = document.createElement('div')
        overlay.className = 'uni-action-sheet-overlay'
        overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    `

        const sheet = document.createElement('div')
        sheet.style.cssText = `
      background: #1a1a2e;
      width: 100%;
      max-width: 400px;
      border-radius: 12px 12px 0 0;
      padding: 12px;
    `

        options.itemList.forEach((item, index) => {
            const btn = document.createElement('button')
            btn.textContent = item
            btn.style.cssText = `
        width: 100%;
        padding: 16px;
        margin-bottom: 8px;
        background: #252545;
        border: none;
        border-radius: 8px;
        color: white;
        font-size: 16px;
        cursor: pointer;
      `
            btn.onclick = () => {
                overlay.remove()
                options.success?.({ tapIndex: index })
            }
            sheet.appendChild(btn)
        })

        // 取消按钮
        const cancelBtn = document.createElement('button')
        cancelBtn.textContent = '取消'
        cancelBtn.style.cssText = `
      width: 100%;
      padding: 16px;
      background: #333;
      border: none;
      border-radius: 8px;
      color: #999;
      font-size: 16px;
      cursor: pointer;
    `
        cancelBtn.onclick = () => overlay.remove()
        sheet.appendChild(cancelBtn)

        overlay.appendChild(sheet)
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove()
        }
        document.body.appendChild(overlay)
    },

    // 获取系统信息
    getSystemInfoSync() {
        return {
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            platform: 'h5',
            system: navigator.userAgent
        }
    },

    // 选择器查询
    createSelectorQuery() {
        return {
            select(selector: string) {
                return {
                    node() {
                        return {
                            exec(callback: (res: any[]) => void) {
                                const el = document.querySelector(selector)
                                callback([{ node: el }])
                            }
                        }
                    }
                }
            }
        }
    },

    // 本地存储
    setStorageSync(key: string, data: string) {
        localStorage.setItem(key, data)
    },

    getStorageSync(key: string) {
        return localStorage.getItem(key) || ''
    }
}

    // 挂载到全局
    ; (window as any).uni = uni

export default uni
