<template>
  <router-view />
</template>

<script setup lang="ts">
// uni-compat已在main.ts中导入
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  background: #0f0f1a;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* CSS 变量 - 设计系统 */
:root {
  --primary-color: #00d4ff;
  --secondary-color: #7b2cbf;
  --success-color: #00ff88;
  --warning-color: #ffaa00;
  --danger-color: #ff4757;
  
  --bg-dark: #0f0f1a;
  --bg-card: #1a1a2e;
  --bg-hover: #252545;
  
  --text-primary: #ffffff;
  --text-secondary: #a0a0b0;
  --text-muted: #666680;
  
  --border-radius: 12px;
  --border-radius-lg: 20px;
  
  --shadow: 0 8px 32px rgba(0, 212, 255, 0.1);
  --shadow-hover: 0 12px 40px rgba(0, 212, 255, 0.2);
}

/* 玻璃态效果 */
.glass {
  background: rgba(26, 26, 46, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* 渐变按钮 */
.btn-primary {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: var(--border-radius);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

/* 工具类 */
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-gradient {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* view 标签模拟 */
view {
  display: block;
}

text {
  display: inline;
}
</style>
