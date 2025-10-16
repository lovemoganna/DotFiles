/**
 * ============================================
 * Palantir Wiki 增强脚本 - v2.5.0 完整优化版
 * ✅ 彻底修复TOC点击跳转Bug
 * ✅ 修复Z-index层级冲突
 * ✅ 新增vim风格导航快捷键（Alt+hjkl）
 * ✅ 新增平滑滚动快捷键（Alt+b/f）
 * ✅ 新增全局搜索功能（Alt+o）
 * ✅ 修复第一个H2与其他H2间距不一致
 * ✅ 修复定位居中而非顶部的问题
 * ✅ 优化所有动态元素的层级控制
 * ============================================
 */

(function() {
    'use strict';
    
    // ======== 配置项 ========
    const CONFIG = {
        tocSelector: '#table-of-contents',
        tocLinkSelector: '#table-of-contents a',
        activeClass: 'active',
        scrollOffset: 100,
        debounceDelay: 100,
        defaultSectionLevel: 2,
        enableSectionToggle: true,
        codeBlockDelay: 100,
        transitionDuration: 220,
        scrollBehavior: 'smooth',
        forceTopAlign: true,
        smoothScrollStep: 100,
        
        // ✅ Z-index 配置（与CSS保持一致）
        zIndex: {
            base: 0,
            content: 1,
            elements: 2,
            headings: 10,
            headingsSpecial: 15,
            interactive: 50,
            dropdown: 1000,
            sticky: 1020,
            fixed: 1030,
            modal: 1040,
            popover: 1050,
            tooltip: 1060
        }
    };
    
    // ======== 工具函数 ========
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // ✅ 强制滚动到顶部对齐
    function scrollToTopAlign(element, offset = CONFIG.scrollOffset) {
        const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
        const targetScrollTop = elementTop - offset;
        
        window.scrollTo({
            top: targetScrollTop,
            behavior: CONFIG.scrollBehavior
        });
    }
    
    // ✅ 新增：强制重绘元素
    function forceReflow(element) {
        if (element) {
            void element.offsetHeight;
        }
    }
    
    // ✅ 新增：平滑滚动指定距离
    function smoothScrollBy(distance) {
        window.scrollBy({
            top: distance,
            behavior: 'smooth'
        });
    }
    
    // ✅ 新增：设置元素z-index
    function setZIndex(element, level) {
        if (element && CONFIG.zIndex[level] !== undefined) {
            element.style.zIndex = CONFIG.zIndex[level];
        }
    }
    
    // ======== 层级控制初始化 ========
    function initSectionLevelControl() {
        let levelAttr = parseInt(document.body.getAttribute('data-section-level') || '', 10);
        const stored = parseInt(localStorage.getItem('org.sectionLevel') || '', 10);
        let cssVar = NaN;
        try {
            const val = getComputedStyle(document.documentElement)
                .getPropertyValue('--default-section-level').trim();
            cssVar = parseInt(val || '', 10);
        } catch (e) {}
        const level = [levelAttr, stored, cssVar, CONFIG.defaultSectionLevel]
            .find(v => Number.isFinite(v) && v >= 2 && v <= 6);

        if (!document.body.hasAttribute('data-section-level')) {
            document.body.setAttribute('data-section-level', String(level));
        }

        const hasHasSupport = !!(window.CSS && CSS.supports && 
            CSS.supports('selector(:has(*))'));
        if (!hasHasSupport) {
            document.body.classList.add('no-has');
            updateActivePath();
            window.addEventListener('hashchange', updateActivePath, { passive: true });
        }

        console.log(`📊 默认显示层级: H${level}${hasHasSupport ? '' : '（JS回退模式）'}`);
    }
    
    // ======== TOC 智能高亮 ========
    function initTOCHighlight() {
        const tocLinks = document.querySelectorAll(CONFIG.tocLinkSelector);
        if (tocLinks.length === 0) return;
        
        function updateActiveLink() {
            const hash = window.location.hash;
            const currentLevel = parseInt(
                document.body.getAttribute('data-section-level') || 
                CONFIG.defaultSectionLevel, 10
            );

            tocLinks.forEach(link => {
                link.classList.remove(CONFIG.activeClass);
                link.removeAttribute('aria-current');
            });

            let targetHref = hash;
            const targetEl = hash ? document.querySelector(hash) : null;
            if (targetEl) {
                const tag = targetEl.tagName || '';
                const lvl = tag.startsWith('H') ? parseInt(tag.slice(1), 10) : NaN;
                if (Number.isFinite(lvl) && lvl !== currentLevel) {
                    const container = getContainerForLevelFromHeading(targetEl, currentLevel);
                    if (container) {
                        const heading = container.querySelector(`h${currentLevel}`);
                        if (heading && heading.id) targetHref = `#${heading.id}`;
                    }
                }
            }

            if (targetHref) {
                const match = Array.from(tocLinks).find(a => 
                    a.getAttribute('href') === targetHref
                );
                if (match) {
                    match.classList.add(CONFIG.activeClass);
                    match.setAttribute('aria-current', 'true');
                    const toc = document.querySelector(CONFIG.tocSelector);
                    if (toc && match.offsetParent) {
                        match.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }
                }
            } else {
                const firstLink = tocLinks[0];
                if (firstLink) {
                    firstLink.classList.add(CONFIG.activeClass);
                    firstLink.setAttribute('aria-current', 'true');
                }
            }
        }
        
        window.addEventListener('hashchange', updateActiveLink);
        updateActiveLink();
        
        console.log('✅ TOC高亮已启用（基于URL hash）');
    }
    
    // ======== ✅ 彻底修复版平滑滚动 ========
    function initSmoothScroll() {
        if (!CONFIG.enableSectionToggle) {
            // 传统模式
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    const targetId = this.getAttribute('href');
                    if (!targetId || targetId === '#') return;
                    
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        e.preventDefault();
                        scrollToTopAlign(targetElement, CONFIG.scrollOffset);
                        
                        if (history.pushState) {
                            history.pushState(null, null, targetId);
                        }
                        
                        targetElement.setAttribute('tabindex', '-1');
                        targetElement.focus();
                    }
                });
            });
        } else {
            // ✅ CSS切换模式（彻底修复版）
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', async function(e) {
                    const targetId = this.getAttribute('href');
                    if (!targetId || targetId === '#') return;
                    
                    const targetElement = document.querySelector(targetId);
                    if (!targetElement) return;
                    
                    // ✅ 阻止浏览器默认行为
                    e.preventDefault();
                    
                    // ✅ 关键修复1：先清空hash（解除之前的:target状态）
                    if (window.location.hash) {
                        history.replaceState(null, null, window.location.pathname + window.location.search);
                        // 等待一帧让CSS重置
                        await new Promise(resolve => requestAnimationFrame(resolve));
                    }
                    
                    // ✅ 关键修复2：使用location.hash而不是history.pushState（确保触发:target）
                    window.location.hash = targetId;
                    
                    // ✅ 强制重绘
                    forceReflow(document.body);
                    
                    // ✅ 等待CSS过渡完成（增加到350ms更保险）
                    await new Promise(resolve => setTimeout(resolve, CONFIG.transitionDuration + 130));
                    
                    // ✅ 再等待两帧确保布局稳定
                    await new Promise(resolve => requestAnimationFrame(() => {
                        requestAnimationFrame(resolve);
                    }));
                    
                    // ✅ 强制顶部对齐滚动
                    scrollToTopAlign(targetElement, CONFIG.scrollOffset);
                    
                    // ✅ 设置焦点
                    setTimeout(() => {
                        targetElement.setAttribute('tabindex', '-1');
                        targetElement.focus({ preventScroll: true });
                    }, 400);
                });
            });
        }
        
        console.log(`✅ 平滑滚动已启用（${CONFIG.enableSectionToggle ? 'CSS切换优化模式' : '传统模式'}）`);
    }
    
    // ======== 返回顶部按钮（优化层级） ========
    function initBackToTop() {
        const button = document.createElement('button');
        button.innerHTML = '↑';
        button.className = 'back-to-top';
        button.setAttribute('aria-label', '返回顶部');
        button.setAttribute('title', '返回顶部');
        document.body.appendChild(button);
        
        // ✅ 设置正确的z-index
        setZIndex(button, 'dropdown');
        
        const style = document.createElement('style');
        style.textContent = `
            .back-to-top {
                position: fixed;
                bottom: 1rem;
                right: 1rem;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: linear-gradient(135deg, #66D9EF 0%, #AE81FF 100%);
                color: #272822;
                border: none;
                font-size: 1.5rem;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                opacity: 0;
                transform: translateY(100px);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: ${CONFIG.zIndex.dropdown};  /* ✅ 明确层级 */
                pointer-events: none;
            }
            .back-to-top.visible {
                opacity: 1;
                transform: translateY(0);
                pointer-events: all;
            }
            .back-to-top:hover {
                transform: translateY(-4px) scale(1.05);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.6);
                z-index: ${CONFIG.zIndex.dropdown + 1};  /* ✅ 悬停时提升 */
            }
            .back-to-top:active {
                transform: translateY(-2px) scale(0.95);
            }
            @media screen and (max-width: 768px) {
                .back-to-top {
                    bottom: 1rem;
                    right: 1rem;
                    width: 40px;
                    height: 40px;
                    font-size: 1.25rem;
                }
            }
        `;
        document.head.appendChild(style);
        
        const toggleButton = throttle(() => {
            if (window.scrollY > 300) {
                button.classList.add('visible');
            } else {
                button.classList.remove('visible');
            }
        }, 100);
        
        window.addEventListener('scroll', toggleButton, { passive: true });
        toggleButton();
        
        button.addEventListener('click', () => {
            if (CONFIG.enableSectionToggle) {
                history.pushState("", document.title, 
                    window.location.pathname + window.location.search);
                window.dispatchEvent(new HashChangeEvent('hashchange'));
            }
            
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            
            const title = document.querySelector('h1, .title');
            if (title) {
                title.setAttribute('tabindex', '-1');
                title.focus();
            }
        });
        
        console.log('✅ 返回顶部按钮已加载');
    }
    
    // ======== 代码块复制（优化层级） ========
    function initCodeCopy() {
        function processCodeBlock(pre) {
            if (pre.querySelector('.copy-code-btn')) return;
            
            const button = document.createElement('button');
            button.innerHTML = '📋';
            button.className = 'copy-code-btn';
            button.setAttribute('aria-label', '复制代码');
            button.setAttribute('title', '复制代码');
            
            const computed = getComputedStyle(pre);
            if (computed.position === 'static') {
                pre.style.position = 'relative';
            }
            
            pre.appendChild(button);
            
            button.addEventListener('click', async () => {
                const codeEl = pre.querySelector('code') || pre;
                const code = codeEl.textContent || codeEl.innerText || '';
                
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(code);
                        showCopyFeedback(button, '✅', '复制成功');
                    } else {
                        const textarea = document.createElement('textarea');
                        textarea.value = code;
                        textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;';
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        showCopyFeedback(button, '✅', '复制成功');
                    }
                } catch (err) {
                    console.error('复制失败:', err);
                    showCopyFeedback(button, '❌', '复制失败');
                }
            });
        }
        
        function initAllCodeBlocks() {
            const selectors = [
                'pre.src',
                'pre:has(> code)',
                '.org-src-container pre',
                'div[class^="src-"] pre',
                'pre code'
            ];
            
            const codeBlocks = new Set();
            
            selectors.forEach(selector => {
                try {
                    if (selector === 'pre code') {
                        document.querySelectorAll(selector).forEach(code => {
                            const pre = code.closest('pre');
                            if (pre) codeBlocks.add(pre);
                        });
                    } else {
                        document.querySelectorAll(selector).forEach(el => {
                            const pre = el.tagName === 'PRE' ? el : el.querySelector('pre');
                            if (pre) codeBlocks.add(pre);
                        });
                    }
                } catch (e) {
                    if (selector !== 'pre:has(> code)') {
                        console.warn(`选择器 "${selector}" 不支持:`, e);
                    }
                }
            });
            
            if (codeBlocks.size === 0) {
                document.querySelectorAll('pre').forEach(pre => {
                    if (!pre.classList.contains('example') && 
                        !pre.classList.contains('verse') &&
                        (pre.querySelector('code') || pre.classList.length > 0)) {
                        codeBlocks.add(pre);
                    }
                });
            }
            
            codeBlocks.forEach(processCodeBlock);
            
            console.log(`✅ 代码复制功能已加载（处理 ${codeBlocks.size} 个代码块）`);
        }
        
        const hasHighlightLib = document.querySelector('script[src*="highlight"]') || 
                                document.querySelector('link[href*="highlight"]') ||
                                window.hljs;
        
        const delay = hasHighlightLib ? CONFIG.codeBlockDelay : 0;
        
        setTimeout(initAllCodeBlocks, delay);
        
        if (window.MutationObserver) {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'PRE') {
                                setTimeout(() => processCodeBlock(node), delay);
                            } else if (node.querySelectorAll) {
                                node.querySelectorAll('pre').forEach(pre => {
                                    setTimeout(() => processCodeBlock(pre), delay);
                                });
                            }
                        }
                    });
                });
            });
            
            observer.observe(document.body, { 
                childList: true, 
                subtree: true 
            });
        }
        
        if (!document.getElementById('copy-code-styles')) {
            const style = document.createElement('style');
            style.id = 'copy-code-styles';
            style.textContent = `
                .copy-code-btn {
                    position: absolute;
                    bottom: 0.5rem;
                    right: 0.5rem;
                    padding: 0.25rem 0.5rem;
                    background-color: rgba(117, 113, 94, 0.5);
                    border: 1px solid rgba(117, 113, 94, 0.7);
                    border-radius: 4px;
                    color: #F8F8F2;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.2s ease-in-out;
                    z-index: ${CONFIG.zIndex.interactive};  /* ✅ 明确层级 */
                    backdrop-filter: blur(4px);
                }
                .copy-code-btn:hover {
                    background-color: rgba(102, 217, 239, 0.3);
                    border-color: #66D9EF;
                    transform: scale(1.05);
                    z-index: ${CONFIG.zIndex.interactive + 1};  /* ✅ 悬停提升 */
                }
                .copy-code-btn:active {
                    transform: scale(0.95);
                }
                @media screen and (max-width: 768px) {
                    .copy-code-btn {
                        padding: 0.2rem 0.4rem;
                        font-size: 0.75rem;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    function showCopyFeedback(button, icon, title) {
        const originalHTML = button.innerHTML;
        const originalTitle = button.getAttribute('title');
        
        button.innerHTML = icon;
        button.setAttribute('title', title);
        button.style.pointerEvents = 'none';
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.setAttribute('title', originalTitle);
            button.style.pointerEvents = '';
        }, 2000);
    }
    
    // ======== TOC 移动端折叠功能 ========
    function initTOCToggle() {
        if (window.innerWidth > 768) return;
        
        const toc = document.querySelector(CONFIG.tocSelector);
        if (!toc) return;
        
        const title = toc.querySelector('h2, .title');
        if (!title) return;
        
        const content = toc.querySelector('div, nav');
        if (!content) return;
        
        title.style.cursor = 'pointer';
        title.style.userSelect = 'none';
        title.setAttribute('aria-expanded', 'true');
        title.setAttribute('role', 'button');
        title.setAttribute('tabindex', '0');
        
        const icon = document.createElement('span');
        icon.textContent = ' ▼';
        icon.style.fontSize = '0.8em';
        icon.style.marginLeft = '0.5rem';
        icon.style.transition = 'transform 0.3s ease';
        title.appendChild(icon);
        
        function toggleTOC() {
            const isExpanded = title.getAttribute('aria-expanded') === 'true';
            title.setAttribute('aria-expanded', !isExpanded);
            
            if (isExpanded) {
                content.style.display = 'none';
                icon.style.transform = 'rotate(-90deg)';
            } else {
                content.style.display = 'block';
                icon.style.transform = 'rotate(0deg)';
            }
        }
        
        title.addEventListener('click', toggleTOC);
        title.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTOC();
            }
        });
        
        console.log('✅ TOC移动端折叠已启用');
    }
    
    // ======== 外部链接新窗口打开 ========
    function initExternalLinks() {
        document.querySelectorAll('a[href^="http"]').forEach(link => {
            try {
                const url = new URL(link.href);
                if (url.hostname !== window.location.hostname) {
                    link.setAttribute('target', '_blank');
                    link.setAttribute('rel', 'noopener noreferrer');
                    
                    if (!link.querySelector('.external-icon')) {
                        const icon = document.createElement('span');
                        icon.className = 'external-icon';
                        icon.innerHTML = ' ↗';
                        icon.style.fontSize = '0.8em';
                        icon.style.opacity = '0.6';
                        link.appendChild(icon);
                    }
                }
            } catch (e) {
                // 忽略无效 URL
            }
        });
    }
    
    // ======== 图片懒加载 ========
    function initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                        }
                        observer.unobserve(img);
                    }
                });
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }
    
    // ======== 表格响应式包装 ========
    function initResponsiveTables() {
        document.querySelectorAll('table').forEach(table => {
            if (!table.parentElement.classList.contains('table-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-wrapper';
                wrapper.style.overflowX = 'auto';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
        });
    }
    
    // ======== ✅ 导航辅助函数 ========
    
    // 获取所有可见的标题（当前层级）
    function getVisibleHeadings() {
        const level = parseInt(document.body.getAttribute('data-section-level') || '2', 10);
        return Array.from(document.querySelectorAll(`h${level}[id]`));
    }
    
    // 获取当前激活的标题
    function getCurrentHeading() {
        const hash = window.location.hash;
        if (!hash) return null;
        return document.querySelector(hash);
    }
    
    // 获取同级的下一个/上一个标题
    function getSiblingHeading(direction) {
        const headings = getVisibleHeadings();
        if (headings.length === 0) return null;
        
        const current = getCurrentHeading();
        if (!current) {
            return direction === 'next' ? headings[0] : headings[headings.length - 1];
        }
        
        const currentIndex = headings.findIndex(h => h === current);
        if (currentIndex === -1) return null;
        
        if (direction === 'next') {
            return currentIndex < headings.length - 1 ? headings[currentIndex + 1] : null;
        } else {
            return currentIndex > 0 ? headings[currentIndex - 1] : null;
        }
    }
    
    // 获取父级章节的下一个/上一个
    function getParentSiblingHeading(direction) {
        const level = parseInt(document.body.getAttribute('data-section-level') || '2', 10);
        if (level <= 2) {
            // 如果已经是H2级别，就查找H2的兄弟
            return getSiblingHeading(direction);
        }
        
        const current = getCurrentHeading();
        if (!current) return null;
        
        // 找到父级容器
        const parentLevel = level - 1;
        const parentContainer = current.closest(`.outline-${parentLevel}`);
        if (!parentContainer) return getSiblingHeading(direction);
        
        const parentHeading = parentContainer.querySelector(`h${parentLevel}[id]`);
        if (!parentHeading) return null;
        
        // 获取所有父级的兄弟
        const allParentHeadings = Array.from(document.querySelectorAll(`h${parentLevel}[id]`));
        const parentIndex = allParentHeadings.findIndex(h => h === parentHeading);
        
        if (parentIndex === -1) return null;
        
        if (direction === 'next') {
            return parentIndex < allParentHeadings.length - 1 ? 
                allParentHeadings[parentIndex + 1] : null;
        } else {
            return parentIndex > 0 ? allParentHeadings[parentIndex - 1] : null;
        }
    }
    
    // ======== ✅ 全局搜索功能（优化层级） ========
    function initGlobalSearch() {
        // 创建搜索界面
        const searchOverlay = document.createElement('div');
        searchOverlay.id = 'global-search-overlay';
        searchOverlay.innerHTML = `
            <div class="search-container">
                <div class="search-header">
                    <input type="text" id="search-input" placeholder="搜索内容..." autocomplete="off">
                    <button id="search-close" aria-label="关闭搜索">✕</button>
                </div>
                <div id="search-results"></div>
                <div class="search-footer">
                    <kbd>↑↓</kbd> 导航 | <kbd>Enter</kbd> 跳转 | <kbd>Esc</kbd> 关闭
                </div>
            </div>
        `;
        document.body.appendChild(searchOverlay);
        
        // ✅ 设置正确的z-index
        setZIndex(searchOverlay, 'modal');
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #global-search-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(39, 40, 34, 0.95);
                z-index: ${CONFIG.zIndex.modal};  /* ✅ 明确层级 */
                backdrop-filter: blur(8px);
            }
            #global-search-overlay.active {
                display: flex;
                align-items: flex-start;
                justify-content: center;
                padding-top: 10vh;
            }
            .search-container {
                background: #1e1f1c;
                border: 1px solid #75715e;
                border-radius: 8px;
                width: 90%;
                max-width: 600px;
                max-height: 70vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
                position: relative;
                z-index: ${CONFIG.zIndex.modal + 1};  /* ✅ 容器层级 */
            }
            .search-header {
                display: flex;
                padding: 1rem;
                border-bottom: 1px solid #75715e;
            }
            #search-input {
                flex: 1;
                background: #272822;
                border: 1px solid #75715e;
                border-radius: 4px;
                color: #f8f8f2;
                padding: 0.5rem 1rem;
                font-size: 1rem;
                outline: none;
            }
            #search-input:focus {
                border-color: #66d9ef;
                box-shadow: 0 0 0 2px rgba(102, 217, 239, 0.2);
            }
            #search-close {
                background: transparent;
                border: none;
                color: #f8f8f2;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0 0.5rem;
                margin-left: 0.5rem;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            #search-close:hover {
                opacity: 1;
            }
            #search-results {
                flex: 1;
                overflow-y: auto;
                padding: 0.5rem;
            }
            .search-result-item {
                padding: 0.75rem 1rem;
                margin: 0.25rem 0;
                background: #272822;
                border: 1px solid transparent;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .search-result-item:hover,
            .search-result-item.selected {
                border-color: #66d9ef;
                background: #2d2e27;
                z-index: 1;  /* ✅ 悬停项提升 */
            }
            .search-result-title {
                color: #66d9ef;
                font-weight: bold;
                margin-bottom: 0.25rem;
            }
            .search-result-excerpt {
                color: #f8f8f2;
                font-size: 0.875rem;
                line-height: 1.5;
            }
            .search-result-excerpt mark {
                background: #f92672;
                color: #f8f8f2;
                padding: 0 2px;
                border-radius: 2px;
            }
            .search-footer {
                padding: 0.75rem 1rem;
                border-top: 1px solid #75715e;
                color: #75715e;
                font-size: 0.875rem;
                text-align: center;
            }
            .search-footer kbd {
                background: #272822;
                border: 1px solid #75715e;
                border-radius: 3px;
                padding: 2px 6px;
                font-size: 0.75rem;
                margin: 0 2px;
            }
            .no-results {
                text-align: center;
                padding: 2rem;
                color: #75715e;
            }
        `;
        document.head.appendChild(style);
        
        const input = document.getElementById('search-input');
        const results = document.getElementById('search-results');
        const closeBtn = document.getElementById('search-close');
        
        let selectedIndex = -1;
        let searchResults = [];
        
        // 执行搜索
        function performSearch(query) {
            if (!query.trim()) {
                results.innerHTML = '';
                return;
            }
            
            searchResults = [];
            const lowerQuery = query.toLowerCase();
            
            // 搜索所有标题和段落
            document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li').forEach(el => {
                const text = el.textContent || '';
                const lowerText = text.toLowerCase();
                
                if (lowerText.includes(lowerQuery)) {
                    // 查找包含该元素的最近的标题
                    let heading = el;
                    if (!el.tagName.match(/^H[1-6]$/)) {
                        heading = el.closest('[id]') || el.previousElementSibling;
                        while (heading && !heading.tagName.match(/^H[1-6]$/)) {
                            heading = heading.previousElementSibling;
                        }
                    }
                    
                    if (heading && heading.id) {
                        // 提取摘录（高亮匹配部分）
                        const index = lowerText.indexOf(lowerQuery);
                        const start = Math.max(0, index - 50);
                        const end = Math.min(text.length, index + query.length + 50);
                        let excerpt = text.substring(start, end);
                        
                        if (start > 0) excerpt = '...' + excerpt;
                        if (end < text.length) excerpt = excerpt + '...';
                        
                        // 高亮匹配文本
                        const regex = new RegExp(`(${query})`, 'gi');
                        excerpt = excerpt.replace(regex, '<mark>$1</mark>');
                        
                        searchResults.push({
                            id: heading.id,
                            title: heading.textContent,
                            excerpt: excerpt
                        });
                    }
                }
            });
            
            // 去重
            const uniqueResults = [];
            const seen = new Set();
            searchResults.forEach(result => {
                if (!seen.has(result.id)) {
                    seen.add(result.id);
                    uniqueResults.push(result);
                }
            });
            searchResults = uniqueResults;
            
            // 显示结果
            if (searchResults.length === 0) {
                results.innerHTML = '<div class="no-results">未找到匹配结果</div>';
            } else {
                results.innerHTML = searchResults.map((result, index) => `
                    <div class="search-result-item" data-index="${index}">
                        <div class="search-result-title">${result.title}</div>
                        <div class="search-result-excerpt">${result.excerpt}</div>
                    </div>
                `).join('');
                
                // 绑定点击事件
                results.querySelectorAll('.search-result-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const index = parseInt(item.dataset.index);
                        jumpToResult(index);
                    });
                });
            }
            
            selectedIndex = -1;
        }
        
        // 跳转到结果
        function jumpToResult(index) {
            if (index >= 0 && index < searchResults.length) {
                const result = searchResults[index];
                closeSearch();
                
                // 使用API跳转
                setTimeout(() => {
                    window.PalantirWiki.scrollToElement(`#${result.id}`);
                }, 100);
            }
        }
        
        // 更新选中项
        function updateSelection() {
            results.querySelectorAll('.search-result-item').forEach((item, index) => {
                if (index === selectedIndex) {
                    item.classList.add('selected');
                    item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                } else {
                    item.classList.remove('selected');
                }
            });
        }
        
        // 打开搜索
        function openSearch() {
            searchOverlay.classList.add('active');
            input.value = '';
            input.focus();
            results.innerHTML = '';
            selectedIndex = -1;
            searchResults = [];
        }
        
        // 关闭搜索
        function closeSearch() {
            searchOverlay.classList.remove('active');
        }
        
        // 事件监听
        input.addEventListener('input', debounce((e) => {
            performSearch(e.target.value);
        }, 300));
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (selectedIndex < searchResults.length - 1) {
                    selectedIndex++;
                    updateSelection();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (selectedIndex > 0) {
                    selectedIndex--;
                    updateSelection();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex >= 0) {
                    jumpToResult(selectedIndex);
                } else if (searchResults.length > 0) {
                    jumpToResult(0);
                }
            } else if (e.key === 'Escape') {
                closeSearch();
            }
        });
        
        closeBtn.addEventListener('click', closeSearch);
        searchOverlay.addEventListener('click', (e) => {
            if (e.target === searchOverlay) {
                closeSearch();
            }
        });
        
        // 导出API
        window.PalantirWiki.openSearch = openSearch;
        window.PalantirWiki.closeSearch = closeSearch;
        
        console.log('✅ 全局搜索已启用（Alt+O）');
    }
    
    // ======== ✅ 增强版键盘快捷键 ========
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Alt+T: 返回顶部
            if (e.altKey && e.key === 't') {
                e.preventDefault();
                if (CONFIG.enableSectionToggle) {
                    history.pushState("", document.title, window.location.pathname);
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            
            // ✅ Alt+B: 缓慢向上滚动
            if (e.altKey && e.key === 'b') {
                e.preventDefault();
                smoothScrollBy(-CONFIG.smoothScrollStep);
            }
            
            // ✅ Alt+F: 缓慢向下滚动
            if (e.altKey && e.key === 'f') {
                e.preventDefault();
                smoothScrollBy(CONFIG.smoothScrollStep);
            }
            
            // ✅ Alt+J: 下一个同级节点
            if (e.altKey && e.key === 'j') {
                e.preventDefault();
                const next = getSiblingHeading('next');
                if (next && next.id) {
                    window.PalantirWiki.scrollToElement(`#${next.id}`);
                } else {
                    console.log('💡 已经是最后一个同级节点');
                }
            }
            
            // ✅ Alt+K: 上一个同级节点
            if (e.altKey && e.key === 'k') {
                e.preventDefault();
                const prev = getSiblingHeading('prev');
                if (prev && prev.id) {
                    window.PalantirWiki.scrollToElement(`#${prev.id}`);
                } else {
                    console.log('💡 已经是第一个同级节点');
                }
            }
            
            // ✅ Alt+H: 上一个父级兄弟节点
            if (e.altKey && e.key === 'h') {
                e.preventDefault();
                const prev = getParentSiblingHeading('prev');
                if (prev && prev.id) {
                    window.PalantirWiki.scrollToElement(`#${prev.id}`);
                } else {
                    console.log('💡 已经是第一个父级节点');
                }
            }
            
            // ✅ Alt+L: 下一个父级兄弟节点
            if (e.altKey && e.key === 'l') {
                e.preventDefault();
                const next = getParentSiblingHeading('next');
                if (next && next.id) {
                    window.PalantirWiki.scrollToElement(`#${next.id}`);
                } else {
                    console.log('💡 已经是最后一个父级节点');
                }
            }
            
            // ✅ Alt+O: 全局搜索
            if (e.altKey && e.key === 'o') {
                e.preventDefault();
                window.PalantirWiki.openSearch();
            }
            
            // Alt+C: TOC折叠/展开
            if (e.altKey && e.key === 'c') {
                e.preventDefault();
                const tocTitle = document.querySelector('#table-of-contents h2, #table-of-contents .title');
                if (tocTitle) {
                    tocTitle.click();
                }
            }
            
            // Alt+2-6: 切换层级
            if (e.altKey && /^[2-6]$/.test(e.key)) {
                e.preventDefault();
                const level = parseInt(e.key, 10);
                if (level >= 2 && level <= 6) {
                    window.PalantirWiki?.setSectionLevel(level);
                }
            }
        });
        
        console.log('✅ 键盘快捷键已启用');
        console.log('   Alt+T: 返回顶部');
        console.log('   Alt+B/F: 缓慢向上/下滚动');
        console.log('   Alt+J/K: 下/上同级节点');
        console.log('   Alt+H/L: 上/下父级节点');
        console.log('   Alt+O: 全局搜索');
        console.log('   Alt+C: TOC折叠');
        console.log('   Alt+2-6: 切换层级');
    }
    
    // ======== 打印优化 ========
    function initPrintOptimization() {
        window.addEventListener('beforeprint', () => {
            const toc = document.querySelector('#table-of-contents');
            if (toc) {
                const content = toc.querySelector('div, nav');
                if (content) {
                    content.style.display = 'block';
                }
            }
        });
    }
    
    // ======== 性能监控 ========
    function initPerformanceMonitoring() {
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) {
                            console.warn('⚠️ 长任务检测:', entry);
                        }
                    }
                });
                observer.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                // 某些浏览器可能不支持
            }
        }
    }
    
    // ======== ✅ Z-index 检查与修复 ========
    function validateZIndexes() {
        // 检查关键元素的z-index是否正确
        const checks = [
            { selector: '#table-of-contents', expected: CONFIG.zIndex.fixed, name: 'TOC' },
            { selector: '.back-to-top', expected: CONFIG.zIndex.dropdown, name: '返回顶部按钮' },
            { selector: '#global-search-overlay', expected: CONFIG.zIndex.modal, name: '搜索覆盖层' }
        ];
        
        checks.forEach(({ selector, expected, name }) => {
            const element = document.querySelector(selector);
            if (element) {
                const computed = window.getComputedStyle(element).zIndex;
                const actual = parseInt(computed, 10);
                if (actual !== expected && computed !== 'auto') {
                    console.warn(`⚠️ ${name} z-index 不匹配: 期望 ${expected}, 实际 ${actual}`);
                }
            }
        });
        
        console.log('✅ Z-index 层级检查完成');
    }
    
    // ======== 工具：层级与路径 ========
    function getHeadingLevel(el) {
        if (!el || !el.tagName) return NaN;
        const t = el.tagName.toUpperCase();
        return t[0] === 'H' ? parseInt(t.slice(1), 10) : NaN;
    }
    
    function getContainerForLevelFromHeading(heading, level) {
        if (!heading || !Number.isFinite(level)) return null;
        const currentLevel = getHeadingLevel(heading);
        if (!Number.isFinite(currentLevel)) return null;
        if (currentLevel === level) {
            return heading.closest(`.outline-${level}`);
        } else if (currentLevel > level) {
            return heading.closest(`.outline-${level}`);
        } else {
            const base = heading.closest(`.outline-${currentLevel}`);
            if (!base) return null;
            return base.querySelector(`.outline-${level}`);
        }
    }
    
    function updateActivePath() {
        const outlines = document.querySelectorAll('.outline-2, .outline-3, .outline-4, .outline-5, .outline-6');
        outlines.forEach(el => el.removeAttribute('data-active'));

        const level = parseInt(document.body.getAttribute('data-section-level') || '2', 10);
        const hash = window.location.hash;
        let heading = hash ? document.querySelector(hash) : null;

        if (!heading) {
            let c2 = document.querySelector('.outline-2:first-of-type');
            if (!c2) return;
            let targetContainer = c2;
            if (level >= 3) {
                const c3 = c2.querySelector('.outline-3:first-of-type');
                if (c3) targetContainer = c3;
                if (level >= 4) {
                    const c4 = c3 ? c3.querySelector('.outline-4:first-of-type') : null;
                    if (c4) targetContainer = c4;
                    if (level >= 5) {
                        const c5 = c4 ? c4.querySelector('.outline-5:first-of-type') : null;
                        if (c5) targetContainer = c5;
                        if (level >= 6) {
                            const c6 = c5 ? c5.querySelector('.outline-6:first-of-type') : null;
                            if (c6) targetContainer = c6;
                        }
                    }
                }
            }
            const root2 = targetContainer.closest('.outline-2') || targetContainer;
            if (root2) root2.setAttribute('data-active', 'true');
            for (let l = 3; l <= level; l++) {
                const anc = targetContainer.closest(`.outline-${l}`);
                if (anc) anc.setAttribute('data-active', 'true');
            }
            targetContainer.setAttribute('data-active', 'true');
            targetContainer.querySelectorAll('.outline-3, .outline-4, .outline-5, .outline-6').forEach(el => el.setAttribute('data-active', 'true'));
            return;
        }

        const container = getContainerForLevelFromHeading(heading, level);
        if (!container) return;
        const root = container.closest('.outline-2') || container;
        if (root) root.setAttribute('data-active', 'true');
        for (let l = 3; l <= level; l++) {
            const anc = container.closest(`.outline-${l}`);
            if (anc) anc.setAttribute('data-active', 'true');
        }
        container.setAttribute('data-active', 'true');
        container.querySelectorAll('.outline-3, .outline-4, .outline-5, .outline-6').forEach(el => el.setAttribute('data-active', 'true'));
    }

    // ======== 初始化所有功能 ========
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        console.log('🚀 Palantir Wiki v2.5.0 初始化中...');
        
        try {
            initSectionLevelControl();
            
            const toc = document.querySelector(CONFIG.tocSelector);
            if (toc) {
                initTOCHighlight();
                initTOCToggle();
            }
            
            initSmoothScroll();
            initBackToTop();
            initCodeCopy();
            initGlobalSearch();
            
            initExternalLinks();
            initResponsiveTables();
            initLazyLoading();
            initKeyboardShortcuts();
            initPrintOptimization();
            
            // ✅ 延迟执行z-index检查
            setTimeout(validateZIndexes, 500);
            
            if (window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1') {
                initPerformanceMonitoring();
            }
            
            console.log('✨ Palantir Wiki v2.5.0 初始化完成');
            
            const event = new CustomEvent('palantir-wiki-ready', {
                detail: { 
                    version: '2.5.0',
                    sectionLevel: document.body.getAttribute('data-section-level'),
                    enableSectionToggle: CONFIG.enableSectionToggle,
                    zIndexConfig: CONFIG.zIndex
                }
            });
            document.dispatchEvent(event);
            
        } catch (error) {
            console.error('❌ Palantir Wiki 初始化失败:', error);
        }
    }
    
    // ======== 启动 ========
    init();
    
    // ======== 导出增强API ========
    window.PalantirWiki = {
        version: '2.5.0',
        
        // ✅ 配置访问
        config: CONFIG,
        
        // ✅ Z-index工具
        setZIndex: setZIndex,
        getZIndex: (level) => CONFIG.zIndex[level],
        
        refreshTOC: initTOCHighlight,
        
        scrollToTop: () => {
            if (CONFIG.enableSectionToggle) {
                history.pushState("", document.title, window.location.pathname);
                window.dispatchEvent(new HashChangeEvent('hashchange'));
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        
        scrollToBottom: () => window.scrollTo({ 
            top: document.documentElement.scrollHeight, 
            behavior: 'smooth' 
        }),
        
        // ✅ 优化后的滚动到指定元素
        scrollToElement: async (selector) => {
            const element = typeof selector === 'string' ? 
                document.querySelector(selector) : selector;
            if (!element) {
                console.error('❌ 元素不存在:', selector);
                return false;
            }
            
            // 如果是标题，更新hash
            if (element.id && /^H[2-6]$/i.test(element.tagName)) {
                // ✅ 先清空hash
                if (window.location.hash) {
                    history.replaceState(null, null, window.location.pathname + window.location.search);
                    await new Promise(resolve => requestAnimationFrame(resolve));
                }
                
                // ✅ 设置新hash
                window.location.hash = element.id;
                forceReflow(document.body);
                
                // ✅ 等待CSS过渡
                await new Promise(resolve => setTimeout(resolve, CONFIG.transitionDuration + 130));
                
                // ✅ 等待布局稳定
                await new Promise(resolve => requestAnimationFrame(() => {
                    requestAnimationFrame(resolve);
                }));
            }
            
            // 强制顶部对齐
            scrollToTopAlign(element, CONFIG.scrollOffset);
            
            setTimeout(() => {
                element.setAttribute('tabindex', '-1');
                element.focus({ preventScroll: true });
            }, 400);
            
            return true;
        },
        
        setSectionLevel: (level) => {
            if (!(level >= 2 && level <= 6)) {
                console.error('❌ 层级必须在2-6之间');
                return false;
            }
            document.body.setAttribute('data-section-level', String(level));
            try { localStorage.setItem('org.sectionLevel', String(level)); } catch (e) {}

            const hash = window.location.hash;
            if (hash) {
                const target = document.querySelector(hash);
                if (target) {
                    const container = getContainerForLevelFromHeading(target, level);
                    if (container) {
                        const heading = container.querySelector(`h${level}`);
                        if (heading && heading.id) {
                            if (heading.id !== target.id) {
                                location.hash = `#${heading.id}`;
                            }
                        }
                    }
                }
            }

            if (document.body.classList.contains('no-has')) {
                updateActivePath();
            }

            console.log(`📊 层级已设置为: H${level}`);
            return true;
        },
        
        getSectionLevel: () => {
            const attr = parseInt(document.body.getAttribute('data-section-level') || '', 10);
            if (Number.isFinite(attr)) return attr;
            try { 
                const stored = parseInt(localStorage.getItem('org.sectionLevel') || '', 10); 
                if (Number.isFinite(stored)) return stored; 
            } catch (e) {}
            return CONFIG.defaultSectionLevel;
        },
        
        toggleSectionMode: (enable) => {
            CONFIG.enableSectionToggle = enable;
            console.log(`${enable ? '✅' : '❌'} 单页章节切换已${enable ? '启用' : '禁用'}`);
        },
        
        setScrollOffset: (offset) => {
            if (typeof offset === 'number' && offset >= 0) {
                CONFIG.scrollOffset = offset;
                console.log(`📏 滚动偏移量已设置为: ${offset}px`);
                return true;
            }
            console.error('❌ 偏移量必须为非负数');
            return false;
        },
        
        // ✅ 设置平滑滚动步长
        setScrollStep: (step) => {
            if (typeof step === 'number' && step > 0) {
                CONFIG.smoothScrollStep = step;
                console.log(`📏 平滑滚动步长已设置为: ${step}px`);
                return true;
            }
            console.error('❌ 步长必须为正数');
            return false;
        },
        
        // ✅ 强制重新定位当前章节
        repositionCurrent: async () => {
            const hash = window.location.hash;
            if (!hash) return false;
            
            const element = document.querySelector(hash);
            if (!element) return false;
            
            await new Promise(resolve => setTimeout(resolve, CONFIG.transitionDuration + 130));
            await new Promise(resolve => requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            }));
            
            scrollToTopAlign(element, CONFIG.scrollOffset);
            return true;
        },
        
        // ✅ 导航API
        nextSibling: () => {
            const next = getSiblingHeading('next');
            if (next && next.id) {
                window.PalantirWiki.scrollToElement(`#${next.id}`);
                return true;
            }
            return false;
        },
        
        prevSibling: () => {
            const prev = getSiblingHeading('prev');
            if (prev && prev.id) {
                window.PalantirWiki.scrollToElement(`#${prev.id}`);
                return true;
            }
            return false;
        },
        
        nextParent: () => {
            const next = getParentSiblingHeading('next');
            if (next && next.id) {
                window.PalantirWiki.scrollToElement(`#${next.id}`);
                return true;
            }
            return false;
        },
        
        prevParent: () => {
            const prev = getParentSiblingHeading('prev');
            if (prev && prev.id) {
                window.PalantirWiki.scrollToElement(`#${prev.id}`);
                return true;
            }
            return false;
        },
        
        // ✅ 平滑滚动API
        scrollUp: (step) => {
            smoothScrollBy(-(step || CONFIG.smoothScrollStep));
        },
        
        scrollDown: (step) => {
            smoothScrollBy(step || CONFIG.smoothScrollStep);
        },
        
        // 搜索API（在initGlobalSearch中定义）
        openSearch: null,
        closeSearch: null,
        
        // ✅ 调试工具
        debug: {
            validateZIndexes: validateZIndexes,
            inspectElement: (selector) => {
                const el = document.querySelector(selector);
                if (!el) {
                    console.error('❌ 元素不存在:', selector);
                    return null;
                }
                const style = window.getComputedStyle(el);
                return {
                    element: el,
                    zIndex: style.zIndex,
                    position: style.position,
                    display: style.display,
                    visibility: style.visibility,
                    opacity: style.opacity
                };
            }
        }
    };
    
})();
