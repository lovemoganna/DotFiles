// ==UserScript==
// @name         Reddit 复制助手 v3.2 美化版
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  复制 Reddit 帖子和评论（美化UI，按钮靠右）
// @match        https://www.reddit.com/*
// @match        https://old.reddit.com/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ========== 美化样式 ==========
    const css = `
        /* ===== 复制按钮基础样式 ===== */
        .rd-copy-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white !important;
            border: none !important;
            padding: 5px 12px !important;
            border-radius: 6px !important;
            cursor: pointer !important;
            font-size: 12px !important;
            font-weight: 500 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            margin: 0 6px !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 5px !important;
            vertical-align: middle !important;
            line-height: 1.2 !important;
            box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3) !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
            letter-spacing: 0.3px !important;
        }

        .rd-copy-btn:hover {
            background: linear-gradient(135deg, #764ba2 0%, #667eea 100%) !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4) !important;
        }

        .rd-copy-btn:active {
            transform: translateY(0) scale(0.98) !important;
        }

        .rd-copy-btn.success {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important;
            box-shadow: 0 2px 8px rgba(56, 239, 125, 0.4) !important;
        }

        /* ===== 帖子复制按钮（橙色主题） ===== */
        .rd-copy-btn.post-copy {
            background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%) !important;
            box-shadow: 0 2px 4px rgba(255, 107, 53, 0.3) !important;
        }

        .rd-copy-btn.post-copy:hover {
            background: linear-gradient(135deg, #f7931e 0%, #ff6b35 100%) !important;
            box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4) !important;
        }

        /* ===== 按钮靠右对齐样式 ===== */
        /* 评论操作栏 - 确保flex布局 */
        shreddit-comment-action-row {
            display: flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            width: 100% !important;
        }

        /* 评论复制按钮靠右 */
        shreddit-comment-action-row .rd-copy-btn {
            margin-left: auto !important;
            margin-right: 8px !important;
            order: 9999 !important;
            flex-shrink: 0 !important;
        }

        /* 旧版Reddit评论按钮靠右 */
        .flat-list.buttons {
            display: flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
        }

        .flat-list.buttons > li:has(.rd-copy-btn) {
            margin-left: auto !important;
            order: 9999 !important;
        }

        .flat-list.buttons .rd-copy-btn {
            margin-left: 0 !important;
        }

        /* 帖子操作栏flex布局 */
        shreddit-post [slot="credit-bar"],
        shreddit-post faceplate-tracker[source="share"],
        shreddit-post shreddit-post-overflow-menu {
            display: inline-flex !important;
            align-items: center !important;
        }

        /* 帖子按钮容器 */
        .rd-post-btn-container {
            display: flex !important;
            align-items: center !important;
            margin-left: auto !important;
            flex-shrink: 0 !important;
        }

        /* 帖子复制按钮靠右 */
        shreddit-post .rd-copy-btn.post-copy {
            margin-left: auto !important;
            margin-right: 12px !important;
            order: 9999 !important;
            flex-shrink: 0 !important;
        }

        /* ===== 浮动面板 ===== */
        #rd-float-panel {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        #rd-float-panel button {
            width: 52px;
            height: 52px;
            border-radius: 16px;
            border: none;
            cursor: pointer;
            font-size: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        #rd-float-panel button::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%);
            pointer-events: none;
        }

        #rd-float-panel button:hover {
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 8px 25px rgba(0,0,0,0.25);
        }

        #rd-float-panel button:active {
            transform: translateY(-1px) scale(1.02);
        }

        #rd-float-panel .copy-all-btn {
            background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
        }

        #rd-float-panel .copy-sel-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        /* Tooltip */
        #rd-float-panel button::after {
            content: attr(data-tooltip);
            position: absolute;
            right: 60px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(30, 30, 30, 0.95);
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s, transform 0.2s;
            backdrop-filter: blur(10px);
        }

        #rd-float-panel button:hover::after {
            opacity: 1;
        }

        /* ===== Toast 提示 ===== */
        .rd-toast {
            position: fixed;
            bottom: 100px;
            right: 24px;
            background: rgba(30, 30, 30, 0.95);
            backdrop-filter: blur(12px);
            color: white;
            padding: 14px 24px;
            border-radius: 12px;
            z-index: 999999;
            font-size: 14px;
            font-weight: 500;
            max-width: 320px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
            animation: toastIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .rd-toast::before {
            content: '✓';
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            border-radius: 50%;
            font-size: 12px;
            flex-shrink: 0;
        }

        .rd-toast.warning::before {
            content: '!';
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        @keyframes toastIn {
            from {
                opacity: 0;
                transform: translateX(20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        /* ===== 暗色模式适配 ===== */
        @media (prefers-color-scheme: dark) {
            .rd-copy-btn {
                box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
            }
        }

        /* Reddit 暗色主题适配 */
        [data-theme="dark"] .rd-copy-btn,
        .theme-dark .rd-copy-btn {
            box-shadow: 0 2px 8px rgba(0,0,0,0.4) !important;
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // ========== 工具函数 ==========
    function copyText(text, btn = null) {
        try {
            if (typeof GM_setClipboard === 'function') {
                GM_setClipboard(text, 'text');
            } else {
                navigator.clipboard.writeText(text);
            }
        } catch (e) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }

        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '✓ 已复制';
            btn.classList.add('success');
            setTimeout(() => {
                btn.innerHTML = orig;
                btn.classList.remove('success');
            }, 1500);
        }
    }

    function toast(msg, type = 'success') {
        const existing = document.querySelector('.rd-toast');
        if (existing) existing.remove();

        const t = document.createElement('div');
        t.className = 'rd-toast' + (type === 'warning' ? ' warning' : '');
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => {
            t.style.animation = 'toastIn 0.3s reverse forwards';
            setTimeout(() => t.remove(), 300);
        }, 2500);
    }

    // ========== 获取评论内容 ==========
    function getCommentData(commentEl) {
        let author = '';
        let content = '';
        let score = '';

        if (commentEl.tagName === 'SHREDDIT-COMMENT') {
            author = commentEl.getAttribute('author') || '';

            let contentEl = commentEl.querySelector('[slot="comment"]');
            if (!contentEl || !contentEl.innerText.trim()) {
                contentEl = commentEl.querySelector('[id$="-post-rtjson-content"]');
            }
            if (!contentEl || !contentEl.innerText.trim()) {
                contentEl = commentEl.querySelector('.md, .RichTextJSON-root');
            }
            if (!contentEl || !contentEl.innerText.trim()) {
                contentEl = commentEl.querySelector('p');
            }
            if (contentEl) {
                content = contentEl.innerText.trim();
            }

            const actionRow = commentEl.querySelector('shreddit-comment-action-row');
            if (actionRow) {
                score = actionRow.getAttribute('score') || '';
            }
        } else if (commentEl.classList.contains('comment') || commentEl.classList.contains('thing')) {
            author = commentEl.querySelector('.author')?.textContent?.trim() || '';
            content = commentEl.querySelector('.usertext-body .md')?.innerText?.trim() || '';
            score = commentEl.querySelector('.score.unvoted, .score')?.title || '';
        }

        return { author, content, score };
    }

    // ========== 添加评论复制按钮 ==========
    function addCommentButtons() {
        document.querySelectorAll('shreddit-comment').forEach(comment => {
            if (comment.dataset.rdCopyAdded) return;
            comment.dataset.rdCopyAdded = 'true';

            const btn = document.createElement('button');
            btn.className = 'rd-copy-btn';
            btn.innerHTML = '📋 复制';
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const data = getCommentData(comment);

                if (!data.content) {
                    const allText = comment.innerText;
                    const lines = allText.split('\n').filter(l =>
                        l.trim() &&
                        !l.includes('Reply') &&
                        !l.includes('Share') &&
                        !l.includes('复制')
                    );
                    data.content = lines.slice(1).join('\n').trim();
                }

                let text = `💬 u/${data.author}`;
                if (data.score) text += ` (${data.score} points)`;
                text += `\n\n${data.content}`;

                copyText(text, btn);
            };

            // 插入按钮到最右侧
            const insertButton = (target) => {
                if (target) {
                    // 创建一个靠右的容器
                    const container = document.createElement('span');
                    container.style.cssText = 'margin-left: auto !important; display: inline-flex !important; flex-shrink: 0 !important;';
                    container.appendChild(btn);
                    target.appendChild(container);
                    return true;
                }
                return false;
            };

            const insertTargets = [
                comment.querySelector('shreddit-comment-action-row'),
                comment.querySelector('[slot="actionRow"]'),
                comment.querySelector('footer'),
            ];

            let inserted = false;
            for (const target of insertTargets) {
                if (insertButton(target)) {
                    inserted = true;
                    break;
                }
            }

            if (!inserted) {
                const obs = new MutationObserver(() => {
                    const row = comment.querySelector('shreddit-comment-action-row');
                    if (row && !row.querySelector('.rd-copy-btn')) {
                        insertButton(row);
                        obs.disconnect();
                    }
                });
                obs.observe(comment, { childList: true, subtree: true });
            }
        });

        // 旧版 Reddit
        document.querySelectorAll('.thing.comment, .comment').forEach(comment => {
            if (comment.dataset.rdCopyAdded) return;
            comment.dataset.rdCopyAdded = 'true';

            const btn = document.createElement('button');
            btn.className = 'rd-copy-btn';
            btn.innerHTML = '📋 复制';
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const data = getCommentData(comment);
                let text = `💬 u/${data.author}`;
                if (data.score) text += ` (${data.score})`;
                text += `\n\n${data.content}`;

                copyText(text, btn);
            };

            const buttonList = comment.querySelector('.flat-list.buttons');
            if (buttonList) {
                const li = document.createElement('li');
                li.style.cssText = 'margin-left: auto !important; order: 9999 !important;';
                li.appendChild(btn);
                buttonList.appendChild(li);
            }
        });
    }

    // ========== 添加帖子复制按钮 ==========
    function addPostButtons() {
        document.querySelectorAll('shreddit-post').forEach(post => {
            if (post.dataset.rdCopyAdded) return;
            post.dataset.rdCopyAdded = 'true';

            const btn = document.createElement('button');
            btn.className = 'rd-copy-btn post-copy';
            btn.innerHTML = '📋 复制帖子';
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const title = post.getAttribute('post-title') ||
                             post.querySelector('h1, [slot="title"]')?.textContent?.trim() || '';
                const author = post.getAttribute('author') || '';
                const subreddit = post.getAttribute('subreddit-prefixed-name') || '';
                const content = post.querySelector('[slot="text-body"]')?.innerText?.trim() || '';
                const url = window.location.href;

                let text = `📌 **${title}**\n\n`;
                text += `👤 u/${author} | 📍 ${subreddit}\n\n`;
                if (content) text += `---\n${content}\n---\n\n`;
                text += `🔗 ${url}`;

                copyText(text, btn);
            };

            // 创建靠右容器
            const container = document.createElement('div');
            container.className = 'rd-post-btn-container';
            container.appendChild(btn);

            // 尝试找到合适的插入位置并插入到最右侧
            const actionBar = post.querySelector('shreddit-post-overflow-menu')?.parentElement ||
                             post.querySelector('faceplate-tracker[source="share"]')?.parentElement ||
                             post.querySelector('[slot="credit-bar"]');

            if (actionBar) {
                // 确保父容器是flex布局
                actionBar.style.cssText += 'display: flex !important; align-items: center !important; flex-wrap: nowrap !important;';
                actionBar.appendChild(container);
            } else {
                // 备选方案：查找其他可能的容器
                const altTargets = [
                    post.querySelector('footer'),
                    post.querySelector('[class*="actions"]'),
                    post.querySelector('[class*="buttons"]')
                ];
                for (const t of altTargets) {
                    if (t) {
                        t.style.cssText += 'display: flex !important; align-items: center !important;';
                        t.appendChild(container);
                        break;
                    }
                }
            }
        });
    }

    // ========== 浮动面板 ==========
    function addFloatPanel() {
        if (document.getElementById('rd-float-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'rd-float-panel';

        // 复制全部
        const copyAllBtn = document.createElement('button');
        copyAllBtn.className = 'copy-all-btn';
        copyAllBtn.innerHTML = '📄';
        copyAllBtn.setAttribute('data-tooltip', '复制帖子 + 全部评论');
        copyAllBtn.onclick = () => {
            let result = '';

            const post = document.querySelector('shreddit-post');
            if (post) {
                const title = post.getAttribute('post-title') || '';
                const author = post.getAttribute('author') || '';
                const content = post.querySelector('[slot="text-body"]')?.innerText?.trim() || '';
                result += `# ${title}\n\n**作者:** u/${author}\n\n${content}\n\n---\n\n## 评论\n\n`;
            }

            let count = 0;
            document.querySelectorAll('shreddit-comment').forEach(c => {
                const data = getCommentData(c);
                if (data.content || c.innerText.trim()) {
                    const content = data.content || c.innerText.split('\n').slice(1, -3).join('\n');
                    const depth = parseInt(c.getAttribute('depth') || '0');
                    const indent = '> '.repeat(depth);
                    result += `${indent}**u/${data.author}:** ${content}\n\n`;
                    count++;
                }
            });

            result += `\n---\n🔗 ${window.location.href}`;
            copyText(result);
            toast(`已复制帖子 + ${count} 条评论`);
        };

        // 复制选中
        const copySelBtn = document.createElement('button');
        copySelBtn.className = 'copy-sel-btn';
        copySelBtn.innerHTML = '✂️';
        copySelBtn.setAttribute('data-tooltip', '复制选中文本');
        copySelBtn.onclick = () => {
            const sel = window.getSelection().toString().trim();
            if (sel) {
                copyText(sel);
                toast('已复制选中内容');
            } else {
                toast('请先选中文本', 'warning');
            }
        };

        panel.appendChild(copyAllBtn);
        panel.appendChild(copySelBtn);
        document.body.appendChild(panel);
    }

    // ========== 初始化 ==========
    function init() {
        addPostButtons();
        addCommentButtons();
        addFloatPanel();
    }

    const observer = new MutationObserver(() => {
        requestAnimationFrame(init);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(init, 500);
    setTimeout(init, 1500);
    setTimeout(init, 3000);

    let scrollTimer;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(init, 200);
    });

    console.log('✅ Reddit 复制助手 v3.2 已加载（按钮靠右版）');
})();
