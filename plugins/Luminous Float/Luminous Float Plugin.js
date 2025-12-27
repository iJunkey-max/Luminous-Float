/*
  Luminous Float Plugin
  Features: Time Display + Dynamic Capsule Width + Collapsed State Handling
*/

const { Plugin } = require("obsidian");

module.exports = class LuminousFloatPlugin extends Plugin {
    async onload() {
        console.log("Luminous Float Plugin Loaded");
        
        // 1. 初始化时间 (延迟确保 UI 渲染完毕)
        this.app.workspace.onLayoutReady(() => {
            this.initTimeWidget();
            this.initSidebarObserver();
        });
        
        // 注册定时器检查注入状态 (防止被 Obsidian 重新渲染清除)
        this.registerInterval(window.setInterval(() => this.checkAndInject(), 2000));
    }

    onunload() {
        const existingTime = document.querySelector('.titlebar-time');
        if (existingTime) existingTime.remove();
        
        // 移除 CSS 变量
        if (document.body) {
            document.body.style.removeProperty('--sidebar-width');
            document.body.classList.remove('is-right-collapsed');
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    // --- Core Functions ---

    checkAndInject() {
        const titlebar = document.querySelector('.titlebar');
        const existingTime = document.querySelector('.titlebar-time');
        
        // 如果胶囊存在但时间组件不存在，则重新注入
        if (titlebar && !existingTime) {
            this.initTimeWidget();
        }
        
        // 偶尔重新检查侧边栏状态，防止 Observer 失效
        // 增加节流或防抖逻辑（此处简化为每次检查）
        this.updateSidebarState();
    }

    // 1. 时间模块
    initTimeWidget() {
        const titlebar = document.querySelector('.titlebar');
        if (!titlebar) return;

        // 防止重复添加
        if (titlebar.querySelector('.titlebar-time')) return;

        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'titlebar-time';
        
        // 样式 (辅助，核心样式应由 CSS 控制)
        timeDisplay.style.order = '1';
        timeDisplay.style.marginRight = 'auto';
        timeDisplay.style.paddingLeft = '8px';
        timeDisplay.style.fontWeight = '600';
        timeDisplay.style.fontSize = '13px';
        timeDisplay.style.fontFamily = 'monospace';
        timeDisplay.style.pointerEvents = 'auto'; 
        
        titlebar.insertBefore(timeDisplay, titlebar.firstChild);

        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false 
            });
            // 检查元素是否还在 DOM 中
            if (timeDisplay.isConnected) {
                timeDisplay.innerText = timeString;
            }
        };

        updateTime();
        this.registerInterval(window.setInterval(updateTime, 1000));
    }

    // 2. 侧边栏同步模块
    initSidebarObserver() {
        // 获取右侧边栏容器
        const rightSplit = document.querySelector('.workspace-split.mod-right-split');
        
        if (!rightSplit) {
            // 如果一开始没找到，尝试监听工作区布局变化，再次尝试初始化
            this.registerEvent(this.app.workspace.on('layout-change', () => {
                // 防止重复初始化 Observer
                if (!this.resizeObserver) {
                    this.initSidebarObserver();
                }
                this.updateSidebarState();
            }));
            return;
        }

        // 如果已经有 Observer，先断开
        if (this.resizeObserver) this.resizeObserver.disconnect();

        // 监听宽度变化
        this.resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const width = entry.contentRect.width;
                if (width > 0) {
                    // 更新 CSS 变量，让 CSS 中的 width: var(--sidebar-width) 生效
                    document.body.style.setProperty('--sidebar-width', `${width}px`);
                }
            }
            this.updateSidebarState(); // 每次变化都检查折叠状态
        });
        
        this.resizeObserver.observe(rightSplit);
        this.updateSidebarState(); // 初始执行
        
        // 监听 Obsidian 内部的折叠事件 (补充手段)
        this.registerEvent(this.app.workspace.on('resize', () => this.updateSidebarState()));
    }

    updateSidebarState() {
        // 安全检查
        if (!this.app || !this.app.workspace) return;

        const rightSplit = this.app.workspace.rightSplit;
        
        // 检查右侧边栏是否折叠
        const isCollapsed = rightSplit && rightSplit.collapsed;
        
        if (isCollapsed) {
            document.body.classList.add('is-right-collapsed');
        } else {
            document.body.classList.remove('is-right-collapsed');
            
            // 确保更新宽度 (有时候展开瞬间宽度可能未及时获取)
            const rightDom = document.querySelector('.workspace-split.mod-right-split');
            if (rightDom) {
                const width = rightDom.offsetWidth;
                if (width > 0) {
                    document.body.style.setProperty('--sidebar-width', `${width}px`);
                }
            }
        }
    }
};