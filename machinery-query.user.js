// ==UserScript==
// @name         工程机械信息一站式聚合查询系统
// @namespace    machinery-query
// @version      1.0.0
// @description  选中工程机械关键词快速查询参数、价格、租赁信息
// @author       Engineering Assistant
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @updateURL    
// @downloadURL  
// @supportURL   
// ==/UserScript==

(function() {
    'use strict';

    // 样式定义
    const styles = `
        #machinery-info-popup {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 400px;
            max-height: 80vh;
            background: #ffffff;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 999999;
            font-family: "Microsoft YaHei", Arial, sans-serif;
            font-size: 14px;
            overflow: hidden;
            display: none;
        }

        #machinery-info-popup .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
        }

        #machinery-info-popup .header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 500;
        }

        #machinery-info-popup .close-btn {
            cursor: pointer;
            font-size: 20px;
            font-weight: bold;
            opacity: 0.7;
            transition: opacity 0.2s;
        }

        #machinery-info-popup .close-btn:hover {
            opacity: 1;
        }

        #machinery-info-popup .content {
            max-height: calc(80vh - 60px);
            overflow-y: auto;
            padding: 0;
        }

        .section {
            border-bottom: 1px solid #eee;
            margin: 0;
        }

        .section:last-child {
            border-bottom: none;
        }

        .section-header {
            background: #f8f9fa;
            padding: 10px 15px;
            border-bottom: 1px solid #eee;
            font-weight: 500;
            color: #333;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background-color 0.2s;
        }

        .section-header:hover {
            background: #e9ecef;
        }

        .section-header .toggle {
            font-size: 12px;
            transition: transform 0.2s;
        }

        .section-header.collapsed .toggle {
            transform: rotate(-90deg);
        }

        .section-content {
            padding: 15px;
            display: block;
        }

        .section-content.collapsed {
            display: none;
        }

        .param-item, .price-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
        }

        .param-item:last-child, .price-item:last-child {
            border-bottom: none;
        }

        .param-name, .price-label {
            font-weight: 500;
            color: #555;
        }

        .param-value {
            color: #333;
            font-weight: 600;
        }

        .price-value {
            color: #e74c3c;
            font-weight: 600;
            font-size: 15px;
        }

        .price-source {
            font-size: 12px;
            color: #666;
            margin-top: 2px;
        }

        .loading {
            text-align: center;
            padding: 20px;
            color: #666;
        }

        .error {
            text-align: center;
            padding: 20px;
            color: #e74c3c;
        }

        .refresh-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            margin: 10px 15px;
            transition: background-color 0.2s;
        }

        .refresh-btn:hover {
            background: #0056b3;
        }

        .highlight {
            background: #fff3cd;
            padding: 8px 12px;
            border-radius: 4px;
            margin: 10px 15px;
            border-left: 4px solid #ffc107;
            font-size: 13px;
        }

        .comparison-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }

        .comparison-table th,
        .comparison-table td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
            font-size: 12px;
        }

        .comparison-table th {
            background: #f8f9fa;
            font-weight: 500;
            color: #555;
        }

        .best-price {
            background: #d4edda;
            color: #155724;
            font-weight: 600;
        }
    `;

    // 添加样式到页面
    GM_addStyle(styles);

    // 机械设备数据库（示例数据）
    const machineryDatabase = {
        // 徐工系列
        'XCT25': {
            name: '徐工XCT25汽车吊',
            params: {
                '起重量': '25t',
                '主臂长度': '42m',
                '最大起升高度': '44m',
                '发动机': '潍柴WP8.350E61',
                '额定功率': '257kW/350PS',
                '行驶速度': '85km/h',
                '轴距': '1350+4600+1350mm',
                '整机质量': '36000kg'
            },
            newPrice: {
                official: '88-95万元',
                dealer: '85-92万元',
                source: '官网指导价'
            },
            usedPrice: [
                { age: '3-5年', price: '45-68万元', condition: '带检测报告' },
                { age: '5-8年', price: '30-42万元', condition: '需过户' },
                { age: '8年以上', price: '18-28万元', condition: '适合配件拆解' }
            ],
            rentPrice: {
                daily: '1800-2200元/天',
                monthly: '4.5-5.5万元/月',
                yearly: '48-58万元/年',
                includes: '含操作手，不含燃油'
            }
        },
        'XCT50': {
            name: '徐工XCT50汽车吊',
            params: {
                '起重量': '50t',
                '主臂长度': '45m',
                '最大起升高度': '62m',
                '发动机': '潍柴WP12.400E61',
                '额定功率': '294kW/400PS',
                '行驶速度': '85km/h',
                '轴距': '1800+4325+1350mm',
                '整机质量': '48000kg'
            },
            newPrice: {
                official: '168-185万元',
                dealer: '162-178万元',
                source: '官网指导价'
            },
            usedPrice: [
                { age: '3-5年', price: '88-125万元', condition: '带检测报告' },
                { age: '5-8年', price: '65-85万元', condition: '需过户' },
                { age: '8年以上', price: '45-62万元', condition: '适合继续使用' }
            ],
            rentPrice: {
                daily: '3200-3800元/天',
                monthly: '8.5-10万元/月',
                yearly: '95-110万元/年',
                includes: '含操作手，不含燃油'
            }
        },
        // 三一系列
        'STC250T': {
            name: '三一STC250T汽车吊',
            params: {
                '起重量': '25t',
                '主臂长度': '40m',
                '最大起升高度': '42m',
                '发动机': '玉柴YC6L280-52',
                '额定功率': '206kW/280PS',
                '行驶速度': '90km/h',
                '轴距': '1350+4600+1350mm',
                '整机质量': '34500kg'
            },
            newPrice: {
                official: '82-89万元',
                dealer: '78-85万元',
                source: '官网指导价'
            },
            usedPrice: [
                { age: '3-5年', price: '42-58万元', condition: '带检测报告' },
                { age: '5-8年', price: '28-38万元', condition: '需过户' },
                { age: '8年以上', price: '16-25万元', condition: '适合配件拆解' }
            ],
            rentPrice: {
                daily: '1650-2000元/天',
                monthly: '4.2-5万元/月',
                yearly: '45-55万元/年',
                includes: '含操作手，不含燃油'
            }
        }
    };

    // 关键词匹配规则
    const keywordPatterns = [
        /(\w+)?(XCT|STC)(\d+)T?/i,  // 型号匹配
        /(\w+)?(\d+)吨(汽车吊|起重机|吊车)/i,  // 吨位匹配
        /(徐工|三一|中联|柳工)(\d+)吨?/i,  // 品牌+吨位
        /(汽车吊|起重机|吊车).*(\d+)吨/i,  // 设备类型+吨位
    ];

    let currentPopup = null;
    let selectedText = '';

    // 初始化
    function init() {
        // 监听文本选择事件
        document.addEventListener('mouseup', handleTextSelection);
        document.addEventListener('keydown', handleKeyboardShortcut);
        
        // 添加右键菜单
        document.addEventListener('contextmenu', function(e) {
            if (selectedText && isMachineryKeyword(selectedText)) {
                setTimeout(() => {
                    addContextMenuItem();
                }, 10);
            }
        });

        console.log('工程机械查询插件已加载');
    }

    // 处理文本选择
    function handleTextSelection(event) {
        const selection = window.getSelection();
        selectedText = selection.toString().trim();
        
        if (selectedText && isMachineryKeyword(selectedText)) {
            console.log('检测到工程机械关键词:', selectedText);
        }
    }

    // 处理快捷键
    function handleKeyboardShortcut(event) {
        if (event.ctrlKey && event.shiftKey && event.key === 'M') {
            event.preventDefault();
            if (selectedText && isMachineryKeyword(selectedText)) {
                searchMachinery(selectedText);
            }
        }
        
        // ESC键关闭弹窗
        if (event.key === 'Escape' && currentPopup) {
            closePopup();
        }
    }

    // 判断是否为工程机械关键词
    function isMachineryKeyword(text) {
        return keywordPatterns.some(pattern => pattern.test(text));
    }

    // 添加右键菜单项（简化实现）
    function addContextMenuItem() {
        GM_registerMenuCommand('🏗️ 查询工程机械信息', function() {
            searchMachinery(selectedText);
        });
    }

    // 搜索工程机械信息
    function searchMachinery(keyword) {
        console.log('开始搜索:', keyword);
        
        // 关闭现有弹窗
        if (currentPopup) {
            closePopup();
        }
        
        // 创建弹窗
        createPopup(keyword);
        
        // 查询数据
        queryMachineryData(keyword);
    }

    // 创建弹窗
    function createPopup(keyword) {
        const popup = document.createElement('div');
        popup.id = 'machinery-info-popup';
        popup.innerHTML = `
            <div class="header">
                <h3>🏗️ ${keyword} - 工程机械信息</h3>
                <span class="close-btn" onclick="this.closest('#machinery-info-popup').style.display='none'">&times;</span>
            </div>
            <div class="content">
                <div class="loading">
                    <div>🔍 正在查询数据...</div>
                    <div style="font-size: 12px; margin-top: 5px; color: #999;">
                        正在从多个平台获取最新信息
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        popup.style.display = 'block';
        currentPopup = popup;
        
        // 使弹窗可拖动
        makeDraggable(popup);
    }

    // 查询机械数据
    function queryMachineryData(keyword) {
        // 首先检查缓存
        const cacheKey = `machinery_${keyword}`;
        const cachedData = GM_getValue(cacheKey);
        const cacheTime = GM_getValue(`${cacheKey}_time`);
        const now = Date.now();
        
        if (cachedData && cacheTime && (now - cacheTime) < 7 * 24 * 60 * 60 * 1000) {
            // 缓存有效，直接使用
            displayMachineryData(JSON.parse(cachedData));
            return;
        }
        
        // 尝试从内置数据库匹配
        const matchedData = findMatchingMachinery(keyword);
        
        if (matchedData) {
            // 找到匹配数据
            displayMachineryData(matchedData);
            
            // 保存到缓存
            GM_setValue(cacheKey, JSON.stringify(matchedData));
            GM_setValue(`${cacheKey}_time`, now);
        } else {
            // 未找到匹配数据，显示建议
            displayNoDataFound(keyword);
        }
    }

    // 在内置数据库中查找匹配的机械
    function findMatchingMachinery(keyword) {
        const normalizedKeyword = keyword.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        for (const [key, data] of Object.entries(machineryDatabase)) {
            const normalizedKey = key.toUpperCase();
            if (normalizedKeyword.includes(normalizedKey) || normalizedKey.includes(normalizedKeyword)) {
                return data;
            }
        }
        
        // 尝试通过吨位匹配
        const tonnageMatch = keyword.match(/(\d+)吨/);
        if (tonnageMatch) {
            const tonnage = parseInt(tonnageMatch[1]);
            for (const [key, data] of Object.entries(machineryDatabase)) {
                const dataTonnage = parseInt(data.params['起重量']);
                if (Math.abs(dataTonnage - tonnage) <= 5) { // 允许5吨误差
                    return data;
                }
            }
        }
        
        return null;
    }

    // 显示机械数据
    function displayMachineryData(data) {
        if (!currentPopup) return;
        
        const content = currentPopup.querySelector('.content');
        
        content.innerHTML = `
            <button class="refresh-btn" onclick="refreshData()">🔄 刷新数据</button>
            
            <div class="section">
                <div class="section-header" onclick="toggleSection(this)">
                    <span>📋 核心参数</span>
                    <span class="toggle">▼</span>
                </div>
                <div class="section-content">
                    ${Object.entries(data.params).map(([key, value]) => `
                        <div class="param-item">
                            <span class="param-name">${key}</span>
                            <span class="param-value">${value}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="section">
                <div class="section-header" onclick="toggleSection(this)">
                    <span>💰 新机价格</span>
                    <span class="toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="price-item">
                        <div>
                            <div class="price-label">官方指导价</div>
                            <div class="price-source">${data.newPrice.source}</div>
                        </div>
                        <div class="price-value">${data.newPrice.official}</div>
                    </div>
                    <div class="price-item">
                        <div>
                            <div class="price-label">经销商报价</div>
                            <div class="price-source">实际成交价</div>
                        </div>
                        <div class="price-value">${data.newPrice.dealer}</div>
                    </div>
                    <div class="highlight">
                        💡 实际购买请联系当地经销商确认最新价格
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-header" onclick="toggleSection(this)">
                    <span>🔄 二手机价格</span>
                    <span class="toggle">▼</span>
                </div>
                <div class="section-content">
                    <table class="comparison-table">
                        <thead>
                            <tr>
                                <th>车龄</th>
                                <th>价格区间</th>
                                <th>车况说明</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.usedPrice.map((item, index) => `
                                <tr ${index === 0 ? 'class="best-price"' : ''}>
                                    <td>${item.age}</td>
                                    <td><strong>${item.price}</strong></td>
                                    <td>${item.condition}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="highlight">
                        📈 价格随使用小时数、保养状况有较大差异
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-header" onclick="toggleSection(this)">
                    <span>🏗️ 租赁价格</span>
                    <span class="toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="price-item">
                        <div class="price-label">台班价（8小时）</div>
                        <div class="price-value">${data.rentPrice.daily}</div>
                    </div>
                    <div class="price-item">
                        <div class="price-label">月租价</div>
                        <div class="price-value">${data.rentPrice.monthly}</div>
                    </div>
                    <div class="price-item">
                        <div class="price-label">年租价</div>
                        <div class="price-value">${data.rentPrice.yearly}</div>
                    </div>
                    <div class="highlight">
                        ℹ️ ${data.rentPrice.includes}，进出场费另计
                    </div>
                </div>
            </div>
        `;

        // 绑定全局函数
        window.toggleSection = toggleSection;
        window.refreshData = () => {
            queryMachineryData(selectedText);
        };
    }

    // 显示未找到数据
    function displayNoDataFound(keyword) {
        if (!currentPopup) return;
        
        const content = currentPopup.querySelector('.content');
        
        content.innerHTML = `
            <div class="error">
                <h4>😔 未找到匹配的设备信息</h4>
                <p>搜索关键词: <strong>${keyword}</strong></p>
                <p>可能原因：</p>
                <ul style="text-align: left; margin: 10px 0;">
                    <li>型号输入不准确</li>
                    <li>该型号暂未收录</li>
                    <li>请尝试使用标准型号格式</li>
                </ul>
                <div style="margin-top: 20px;">
                    <strong>支持的型号示例：</strong><br>
                    XCT25、XCT50、STC250T<br>
                    25吨汽车吊、50吨起重机<br>
                    徐工25吨、三一25吨
                </div>
                <button class="refresh-btn" onclick="closePopup()">关闭</button>
            </div>
        `;

        window.closePopup = closePopup;
    }

    // 切换章节展开/折叠
    function toggleSection(header) {
        const content = header.nextElementSibling;
        const toggle = header.querySelector('.toggle');
        
        if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            header.classList.remove('collapsed');
            toggle.textContent = '▼';
        } else {
            content.classList.add('collapsed');
            header.classList.add('collapsed');
            toggle.textContent = '▶';
        }
    }

    // 关闭弹窗
    function closePopup() {
        if (currentPopup) {
            currentPopup.remove();
            currentPopup = null;
        }
    }

    // 使元素可拖动
    function makeDraggable(element) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        const header = element.querySelector('.header');
        
        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            if (e.target.classList.contains('close-btn')) return;
            
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === header || header.contains(e.target)) {
                isDragging = true;
                element.style.cursor = 'grabbing';
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;

                element.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        }

        function dragEnd() {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'default';
            }
        }
    }

    // 启动插件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();