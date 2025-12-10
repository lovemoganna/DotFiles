/* =========================================
   RayMode Ultimate v3.5 - Core JavaScript
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- [Core Logic] Code Highlighting & Restructuring ---
    const initCodeBlocks = () => {
        if (!window.Prism) {
            setTimeout(initCodeBlocks, 100); // Wait for Prism
            return;
        }
	
        const langMap = {
            'sh':'bash',
            'shell':'bash',
            'elisp':'lisp',
            'emacs-lisp':'lisp',
            'js':'javascript',
            'html':'html',
            'xml':'xml',
            'org':'org',
            'python':'python',
            'markdown':'markdown'
        };
	
        // 关键修复：处理 org-mode 导出的结构 <pre class="src src-python"><code>...</code></pre>
        document.querySelectorAll('.org-src-container pre.src').forEach(pre => {
            if (pre.dataset.processed) return; // Avoid double processing
            pre.dataset.processed = "true";
	    
            // 1. Detect Language from class "src-python"
            let lang = 'text';
            pre.classList.forEach(cls => {
                if(cls.startsWith('src-')) {
                    lang = cls.replace('src-', '');
                }
            });
            if(langMap[lang]) lang = langMap[lang];
	    
            // 2. Extract raw code - org-mode puts code inside <code> tag
            const codeElement = pre.querySelector('code');
            const codeText = codeElement ? codeElement.textContent.trim() : pre.textContent.trim();
	    
            // 3. Clear container and restructure (Flex Column)
            const container = pre.parentNode;
            container.innerHTML = '';
	    
            // 4. Create Header
            const header = document.createElement('div');
            header.className = 'src-header';
            header.innerHTML = `
                 <div class="traffic-lights">
                     <div class="traffic-light tl-red"></div>
                     <div class="traffic-light tl-yellow"></div>
                     <div class="traffic-light tl-green"></div>
                 </div>
                 <div class="src-lang">${lang}</div>
             `;
	    
            // 5. Create Copy Button (absolute positioned in container)
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.textContent = 'Copy';
	    
            // 6. Create new Pre/Code block
            const newPre = document.createElement('pre');
            newPre.className = `language-${lang}`;
	    
            const newCode = document.createElement('code');
            newCode.className = `language-${lang}`;
            newCode.textContent = codeText;
	    
            newPre.appendChild(newCode);
            container.appendChild(header);
            container.appendChild(newPre);
            container.appendChild(copyBtn); // Add copy button to container
	    
            // 7. Highlight (Prism will apply highlighting)
            Prism.highlightElement(newCode);
	    
            // 8. Copy Event
            copyBtn.addEventListener('click', (e) => {
                navigator.clipboard.writeText(codeText).then(() => {
                    e.target.textContent = 'Copied!';
                    setTimeout(() => e.target.textContent = 'Copy', 2000);
                }).catch(err => {
                    console.error('Failed to copy:', err);
                });
            });
        });
    };
    
    // Check periodically for Prism load (since it might be deferred)
    const checkPrism = setInterval(() => {
        if (window.Prism) {
            clearInterval(checkPrism);
            initCodeBlocks();
        }
    }, 50);
    
    // --- Mermaid ---
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: false, theme: 'dark', darkMode: true });
        document.querySelectorAll('.src-mermaid').forEach((el, index) => {
            const code = el.textContent;
            const container = el.closest('.org-src-container');
            const newDiv = document.createElement('div');
            newDiv.className = 'mermaid-container';
            newDiv.style.textAlign = 'center';
            newDiv.style.background = 'white';
            newDiv.style.padding = '20px';
            newDiv.style.borderRadius = '8px';
            newDiv.id = 'mermaid-' + index;
            newDiv.textContent = code;
            if(container) container.replaceWith(newDiv);
        });
        mermaid.run({ querySelector: '.mermaid-container' });
    }
    
    // --- Smart Tables ---
    document.querySelectorAll('table').forEach(table => {
        if(table.closest('.table-wrapper')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
	
        const search = document.createElement('input');
        search.className = 'table-search';
        search.placeholder = 'Filter...';
        wrapper.appendChild(search);
	
        search.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            table.querySelectorAll('tbody tr').forEach(row => {
                row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
        });
	
        table.querySelectorAll('thead th').forEach((th, idx) => {
            th.addEventListener('click', () => {
                const tbody = table.querySelector('tbody');
                const rows = Array.from(tbody.querySelectorAll('tr'));
                const asc = !th.classList.contains('asc');
                rows.sort((a,b) => {
                    const tA = a.children[idx].innerText, tB = b.children[idx].innerText;
                    return asc ? tA.localeCompare(tB) : tB.localeCompare(tA);
                });
                rows.forEach(r => tbody.appendChild(r));
                table.querySelectorAll('th').forEach(h => h.classList.remove('asc', 'desc'));
                th.classList.add(asc ? 'asc' : 'desc');
            });
        });
    });
    
    // --- UI Enhancements ---
    document.querySelectorAll('h2, h3, h4').forEach(h => {
        if(h.id) {
            const a = document.createElement('a');
            a.className = 'header-anchor';
            a.innerText = '🔗';
            a.onclick = (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(location.href.split('#')[0]+'#'+h.id);
            };
            h.appendChild(a);
        }
        // Folding click
        h.addEventListener('click', () => h.parentElement.classList.toggle('collapsed'));
    });
    
    // --- Interactivity (Cmd+K, Lightbox, Nav, TOC) ---
    const cmdK = document.getElementById('cmd-k-overlay');
    const input = document.getElementById('cmd-k-input');
    const results = document.getElementById('cmd-k-results');
    const toast = document.getElementById('toast');
    const lightbox = document.getElementById('lightbox');
    const tocList = document.getElementById('toc-list');
    const tocBtn = document.getElementById('toc-btn');
    
    // Populate TOC (修复：动态生成目录)
    if(tocList) {
        // 修复：使用正确的选择器，适配 org-mode 导出的 HTML
        const contentDiv = document.getElementById('content') || document.querySelector('.content') || document.body;
        const headings = contentDiv.querySelectorAll('h2, h3');
        headings.forEach(h => {
            const link = document.createElement('a');
            const headingText = h.innerText.replace('🔗', '').trim();
            link.textContent = headingText;
            link.href = '#' + (h.id || h.closest('div').id || '');
            link.className = h.tagName === 'H2' ? 'toc-h2' : 'toc-h3';
            link.onclick = (e) => {
                e.preventDefault();
                const targetId = link.href.split('#')[1];
                const target = document.getElementById(targetId);
                if(target) {
                    target.scrollIntoView({behavior:'smooth', block:'center'});
                    tocList.classList.remove('show');
                }
            };
            tocList.appendChild(link);
        });
    }
    
    // TOC Button Click
    if(tocBtn && tocList) {
        tocBtn.onclick = () => tocList.classList.toggle('show');
    }
    
    // Lightbox
    const contentDiv = document.getElementById('content') || document.querySelector('.content') || document.body;
    contentDiv.querySelectorAll('img').forEach(img => {
        img.onclick = () => {
            lightbox.style.display='flex';
            lightbox.querySelector('img').src=img.src;
        };
    });
    if(lightbox) {
        lightbox.onclick = () => lightbox.style.display='none';
    }
    
    // Search Index
    let searchItems = [];
    document.querySelectorAll('h1, h2, h3').forEach(h => {
        if(h.offsetParent !== null) {
            searchItems.push({
                id: h.id || h.closest('div').id,
                text: h.innerText.replace('🔗',''),
                tag: h.tagName
            });
        }
    });
    
    function openCmdK() {
        if(cmdK) {
            cmdK.style.display='flex';
            if(input) {
                input.value='';
                input.focus();
            }
            renderSearch(searchItems);
        }
    }
    
    function renderSearch(items) {
        if(!results) return;
        results.innerHTML = '';
        items.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'cmd-k-item' + (idx===0 ? ' selected' : '');
            div.innerHTML = `<span>${item.text}</span><small>${item.tag}</small>`;
            div.onclick = () => {
                const target = document.getElementById(item.id);
                if(target) {
                    target.scrollIntoView({behavior:'smooth', block:'center'});
                }
                cmdK.style.display='none';
            };
            results.appendChild(div);
        });
    }
    
    if(input) {
        input.oninput = (e) => {
            const v = e.target.value.toLowerCase();
            renderSearch(searchItems.filter(i => i.text.toLowerCase().includes(v)));
        };
    }
    
    // Toast
    function showToast(msg) {
        if(!toast) return;
        toast.innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1500);
    }
    
    // Keyboard Navigation
    let blocks = Array.from(document.querySelectorAll('.outline-2'));
    let curIdx = -1;
    let lastG = 0;
    
    document.addEventListener('keydown', (e) => {
        if(e.target.tagName === 'INPUT') {
            if(e.key === 'Escape' && cmdK) cmdK.style.display='none';
            return;
        }
        if((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            openCmdK();
            return;
        }
	
        switch(e.key) {
        case 'j':
            window.scrollBy({top:150, behavior:'smooth'});
            break;
        case 'k':
            window.scrollBy({top:-150, behavior:'smooth'});
            break;
        case 'n':
            if(curIdx < blocks.length-1) {
                if(curIdx>=0) blocks[curIdx].classList.remove('active-block');
                curIdx++;
                blocks[curIdx].classList.add('active-block');
                blocks[curIdx].scrollIntoView({behavior:'smooth', block:'center'});
                showToast('Next');
            }
            break;
        case 'p':
            if(curIdx > 0) {
                if(curIdx>=0) blocks[curIdx].classList.remove('active-block');
                curIdx--;
                blocks[curIdx].classList.add('active-block');
                blocks[curIdx].scrollIntoView({behavior:'smooth', block:'center'});
                showToast('Prev');
            }
            break;
        case 'g':
            if(Date.now() - lastG < 400) {
                window.scrollTo({top:0,behavior:'smooth'});
                showToast('Top');
            }
            lastG = Date.now();
            break;
        case 'G':
            window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
            showToast('Bottom');
            break;
        case 'Tab':
            e.preventDefault();
            if(curIdx>=0) blocks[curIdx].classList.toggle('collapsed');
            break;
        case 'f':
        case 'F':
            const all = document.querySelectorAll('.outline-2');
            const anyExpanded = Array.from(all).some(el => !el.classList.contains('collapsed'));
            all.forEach(el => {
                if(anyExpanded) el.classList.add('collapsed');
                else el.classList.remove('collapsed');
            });
            showToast(anyExpanded ? 'Collapse All' : 'Expand All');
            break;
        case 't':
            if(tocList) {
                tocList.classList.toggle('show');
                showToast('Toggle TOC');
            }
            break;
        }
    });
});
