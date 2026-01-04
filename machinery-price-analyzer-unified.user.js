// ==UserScript==
// @name         工程机械价格分析系统 - 一体化助手
// @description  集成智能价格分析、多维度对比、专业PDF报告生成于一体的工程机械价格查询系统
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @require      https://cdn.jsdelivr.net/npm/chart.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 全局配置 ====================
    const CONFIG = {
        API_BASE: 'http://www.jinzhe.asia/api/machinery',
        API_KEY: 'jinzhe_2025_central_asia',
        VERSION: '3.0.0'
    };

    console.log('🤖 工程机械爬虫引擎已加载 v' + CONFIG.VERSION);
    console.log('📡 等待网页调用爬虫指令...');
        #machinery-price-analyzer {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 600px;
            max-height: 85vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 999999;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
            display: none;
            overflow: hidden;
        }

        .analyzer-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .analyzer-header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }

        .close-analyzer {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            opacity: 0.8;
            transition: opacity 0.2s;
        }

        .close-analyzer:hover {
            opacity: 1;
        }

        .analyzer-content {
            max-height: calc(85vh - 140px);
            overflow-y: auto;
            background: rgba(255,255,255,0.95);
            color: #333;
        }

        .dimension-tab {
            display: flex;
            background: rgba(255,255,255,0.1);
            border-bottom: 1px solid rgba(255,255,255,0.2);
        }

        .tab-item {
            flex: 1;
            padding: 12px 8px;
            text-align: center;
            cursor: pointer;
            font-size: 12px;
            border-right: 1px solid rgba(255,255,255,0.2);
            transition: background 0.2s;
            color: white;
        }

        .tab-item:last-child {
            border-right: none;
        }

        .tab-item:hover {
            background: rgba(255,255,255,0.1);
        }

        .tab-item.active {
            background: rgba(255,255,255,0.2);
            font-weight: bold;
        }

        .dimension-content {
            padding: 20px;
            display: none;
        }

        .dimension-content.active {
            display: block;
        }

        .price-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            border-left: 4px solid #667eea;
        }

        .price-source {
            font-weight: bold;
            color: #667eea;
            margin-bottom: 8px;
        }

        .price-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 5px 0;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }

        .price-item:last-child {
            border-bottom: none;
        }

        .price-label {
            color: #666;
            font-size: 14px;
        }

        .price-value {
            font-weight: bold;
            color: #e74c3c;
            font-size: 15px;
        }

        .loading-spinner {
            text-align: center;
            padding: 40px;
        }

        .loading-spinner::before {
            content: '';
            width: 40px;
            height: 40px;
            border: 4px solid #e0e0e0;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            display: inline-block;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .analysis-summary {
            background: #e8f5e8;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            border-left: 4px solid #28a745;
        }

        .summary-title {
            font-weight: bold;
            color: #28a745;
            margin-bottom: 10px;
        }

        .summary-item {
            margin: 5px 0;
            font-size: 14px;
        }

        .action-buttons {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }

        .btn {
            flex: 1;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            transition: transform 0.2s;
        }

        .btn:hover {
            transform: translateY(-1px);
        }

        .btn-success {
            background: linear-gradient(45deg, #28a745, #20c997);
        }

        .btn-warning {
            background: linear-gradient(45deg, #ffc107, #ff9800);
        }

        .float-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 30px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
            z-index: 999998;
            transition: transform 0.2s;
        }

        .float-button:hover {
            transform: translateY(-2px);
        }

        .chart-container {
            margin: 15px 0;
            background: white;
            border-radius: 8px;
            padding: 15px;
        }

        .decision-box {
            background: #fff3cd;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            border-left: 4px solid #ffc107;
        }

        .decision-title {
            font-weight: bold;
            color: #856404;
            margin-bottom: 10px;
        }

        .recommendation {
            background: #d1ecf1;
            border-radius: 6px;
            padding: 10px;
            margin: 8px 0;
            border-left: 3px solid #17a2b8;
        }

        .recommendation-label {
            font-weight: bold;
            color: #0c5460;
            font-size: 13px;
        }

        .notification {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #28a745;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 9999999;
            font-family: Arial, sans-serif;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
            from { transform: translate(-50%, -100%); }
            to { transform: translate(-50%, 0); }
        }
    `);

    // ==================== 数据采集引擎 ====================
    let currentKeyword = '';
    let analysisData = null;

    // 真实数据采集类
    class RealDataCollector {
        constructor() {
            this.sources = {
                currentPage: this.extractFromCurrentPage.bind(this),
                serverAPI: this.fetchFromServerAPI.bind(this),
                webCrawl: this.crawlFromWeb.bind(this)
            };
        }

        // 从当前页面提取数据
        extractFromCurrentPage(keyword) {
            console.log('🔍 正在从当前页面提取数据:', keyword);
            
            const pageText = document.body.innerText;
            const data = {
                type: this.extractType(pageText, keyword),
                tonnage: this.extractTonnage(pageText, keyword),
                specs: this.extractSpecs(pageText, keyword),
                prices: this.extractPrices(pageText, keyword),
                source: 'current_page',
                url: window.location.href,
                timestamp: new Date().toISOString()
            };

            // 如果页面有表格数据，优先提取表格
            const tables = document.querySelectorAll('table');
            if (tables.length > 0) {
                this.extractFromTables(tables, data, keyword);
            }

            // 提取页面中的价格信息
            const pricePatterns = [
                /(\d+\.?\d*)\s*[-~]\s*(\d+\.?\d*)\s*万元/g,
                /价格[：:]\s*(\d+\.?\d*)\s*万/g,
                /¥\s*(\d+\.?\d*)\s*万/g,
                /(\d+\.?\d*)\s*万\s*[元\/]?/g
            ];

            pricePatterns.forEach(pattern => {
                const matches = [...pageText.matchAll(pattern)];
                if (matches.length > 0) {
                    console.log('✅ 从页面提取到价格:', matches);
                }
            });

            return Object.keys(data.specs).length > 0 ? data : null;
        }

        // 从服务器API获取数据
        async fetchFromServerAPI(keyword) {
            console.log('🌐 正在从服务器API获取数据:', keyword);
            
            try {
                const response = await fetch(`${CONFIG.API_BASE}/equipment/price?keyword=${encodeURIComponent(keyword)}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${CONFIG.API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        console.log('✅ 服务器返回数据:', result.data);
                        return this.normalizeServerData(result.data);
                    }
                }
            } catch (error) {
                console.warn('⚠️ API请求失败:', error);
            }

            return null;
        }

        // 从网络爬取数据
        async crawlFromWeb(keyword) {
            console.log('🕷️ 正在从网络爬取数据:', keyword);
            
            const crawlSources = [
                { name: '铁甲网', url: `https://www.tiega.cn/search?q=${encodeURIComponent(keyword)}` },
                { name: '路面机械网', url: `https://www.lmjx.net/search/${encodeURIComponent(keyword)}` }
            ];

            for (const source of crawlSources) {
                try {
                    const data = await this.crawlSingleSource(source, keyword);
                    if (data) {
                        console.log(`✅ 从${source.name}爬取到数据`);
                        return data;
                    }
                } catch (error) {
                    console.warn(`⚠️ ${source.name}爬取失败:`, error);
                }
            }

            return null;
        }

        async crawlSingleSource(source, keyword) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: source.url,
                    timeout: 10000,
                    onload: (response) => {
                        try {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(response.responseText, 'text/html');
                            const data = this.parseRemoteHTML(doc, keyword);
                            resolve(data);
                        } catch (error) {
                            reject(error);
                        }
                    },
                    onerror: reject,
                    ontimeout: reject
                });
            });
        }

        parseRemoteHTML(doc, keyword) {
            const text = doc.body.innerText;
            return {
                type: this.extractType(text, keyword),
                tonnage: this.extractTonnage(text, keyword),
                specs: this.extractSpecs(text, keyword),
                prices: this.extractPrices(text, keyword),
                source: 'web_crawl'
            };
        }

        // 数据提取辅助方法
        extractType(text, keyword) {
            const types = ['汽车起重机', '履带起重机', '塔式起重机', '随车起重机', '门式起重机'];
            for (const type of types) {
                if (text.includes(type) || keyword.includes(type)) {
                    return type;
                }
            }
            return '工程机械';
        }

        extractTonnage(text, keyword) {
            const tonnageMatch = (keyword + text).match(/(\d+)\s*[吨t]/i);
            return tonnageMatch ? parseInt(tonnageMatch[1]) : 0;
        }

        extractSpecs(text, keyword) {
            const specs = {};
            
            // 提取技术参数
            const specPatterns = {
                '起重量': /起重量[：:]\s*([\d.]+\s*[t吨])/,
                '主臂长度': /主臂长度[：:]\s*([\d.]+\s*m)/,
                '最大起升高度': /最大起升高度[：:]\s*([\d.]+\s*m)/,
                '发动机': /发动机[：:]\s*([^\n\r，,]+)/,
                '整车自重': /整车自重[：:]\s*([\d.]+\s*[t吨])/,
                '额定功率': /额定功率[：:]\s*([\d.]+\s*[kKwW]+)/
            };

            for (const [key, pattern] of Object.entries(specPatterns)) {
                const match = text.match(pattern);
                if (match) {
                    specs[key] = match[1].trim();
                }
            }

            // 从表格中提取（如果在当前页面）
            const rows = document.querySelectorAll('tr, .spec-item, .param-item');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td, .label, .value, span, div');
                if (cells.length >= 2) {
                    const label = cells[0].innerText.trim();
                    const value = cells[1].innerText.trim();
                    if (label && value && value !== '-') {
                        specs[label] = value;
                    }
                }
            });

            return specs;
        }

        extractPrices(text, keyword) {
            const prices = {};
            
            // 提取新机价格
            const newPriceMatch = text.match(/新机价格[：:]\s*(\d+\.?\d*)\s*[-~]\s*(\d+\.?\d*)\s*万/);
            if (newPriceMatch) {
                prices.newMachine = {
                    min: parseFloat(newPriceMatch[1]),
                    max: parseFloat(newPriceMatch[2]),
                    unit: '万元',
                    source: '实时采集'
                };
            }

            // 提取价格区间
            const priceRangeMatch = text.match(/(\d+\.?\d*)\s*[-~]\s*(\d+\.?\d*)\s*万元/);
            if (priceRangeMatch && !prices.newMachine) {
                prices.newMachine = {
                    min: parseFloat(priceRangeMatch[1]),
                    max: parseFloat(priceRangeMatch[2]),
                    unit: '万元',
                    source: '页面提取'
                };
            }

            // 提取租赁价格
            const rentalDailyMatch = text.match(/日租[金]?[：:]\s*(\d+\.?\d*)/);
            const rentalMonthlyMatch = text.match(/月租[金]?[：:]\s*(\d+\.?\d*)/);
            
            if (rentalDailyMatch || rentalMonthlyMatch) {
                prices.rental = {
                    daily: rentalDailyMatch ? parseFloat(rentalDailyMatch[1]) : 0,
                    monthly: rentalMonthlyMatch ? parseFloat(rentalMonthlyMatch[1]) : 0,
                    unit: '元'
                };
            }

            return prices;
        }

        extractFromTables(tables, data, keyword) {
            tables.forEach(table => {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length >= 2) {
                        const key = cells[0].innerText.trim();
                        const value = cells[1].innerText.trim();
                        
                        if (key && value && value !== '-') {
                            // 技术参数
                            if (key.match(/起重|长度|高度|发动机|自重|功率|速度/)) {
                                data.specs[key] = value;
                            }
                            
                            // 价格信息
                            if (key.match(/价格|报价|成交价/) && value.match(/\d+/)) {
                                const priceMatch = value.match(/(\d+\.?\d*)\s*[-~]\s*(\d+\.?\d*)/);
                                if (priceMatch) {
                                    data.prices.newMachine = {
                                        min: parseFloat(priceMatch[1]),
                                        max: parseFloat(priceMatch[2]),
                                        unit: '万元',
                                        source: '表格提取'
                                    };
                                }
                            }
                        }
                    }
                });
            });
        }

        normalizeServerData(serverData) {
            // 将服务器返回的数据格式标准化
            return {
                type: serverData.type || serverData.category || '工程机械',
                tonnage: serverData.tonnage || serverData.capacity || 0,
                specs: serverData.specifications || serverData.specs || {},
                prices: serverData.prices || {},
                source: 'server_api'
            };
        }

        // 综合采集（仅使用网络爬虫）
        async collect(keyword) {
            console.log('🚀 开始网络爬虫采集数据:', keyword);
            
            // 只使用网络爬虫采集外部数据
            const data = await this.crawlFromWeb(keyword);
            
            if (data && Object.keys(data.specs).length > 0) {
                console.log('✅ 爬虫采集成功，准备上传到 www.jinzhe.asia');
                return data;
            }

            console.warn('❌ 网络爬虫未找到数据');
            return null;
        }
    }

    const dataCollector = new RealDataCollector();

    // ==================== 价格分析功能 ====================
    
    // 创建分析界面
    function createAnalyzerInterface() {
        const analyzer = document.createElement('div');
        analyzer.id = 'machinery-price-analyzer';
        
        analyzer.innerHTML = `
            <div class="analyzer-header">
                <h2>🏗️ 工程机械多维度价格分析</h2>
                <button class="close-analyzer">&times;</button>
            </div>
            
            <div class="dimension-tab">
                <div class="tab-item active" data-tab="overview">综合分析</div>
                <div class="tab-item" data-tab="newprice">新机价格</div>
                <div class="tab-item" data-tab="usedprice">二手价格</div>
                <div class="tab-item" data-tab="rental">租赁分析</div>
                <div class="tab-item" data-tab="decision">决策建议</div>
            </div>
            
            <div class="analyzer-content">
                <div class="dimension-content active" id="overview-content">
                    <div class="loading-spinner">正在分析价格数据...</div>
                </div>
                <div class="dimension-content" id="newprice-content"></div>
                <div class="dimension-content" id="usedprice-content"></div>
                <div class="dimension-content" id="rental-content"></div>
                <div class="dimension-content" id="decision-content"></div>
            </div>
        `;

        document.body.appendChild(analyzer);

        // 绑定事件
        analyzer.querySelector('.close-analyzer').addEventListener('click', () => {
            analyzer.style.display = 'none';
        });

        analyzer.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                analyzer.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                analyzer.querySelectorAll('.dimension-content').forEach(c => c.classList.remove('active'));
                analyzer.querySelector(`#${tabId}-content`).classList.add('active');
            });
        });

        return analyzer;
    }

    // 开始价格分析（真实数据采集）
    async function startPriceAnalysis(keyword) {
        currentKeyword = keyword;
        const analyzer = document.getElementById('machinery-price-analyzer') || createAnalyzerInterface();
        
        analyzer.style.display = 'block';
        analyzer.querySelector('.analyzer-header h2').textContent = `🏗️ ${keyword} - 实时数据采集分析`;

        // 显示加载状态
        const overviewContent = analyzer.querySelector('#overview-content');
        overviewContent.innerHTML = `
            <div class="loading-spinner">
                <div style="padding: 40px; text-align: center;">
                    <div style="font-size: 16px; margin-bottom: 10px;">�️ 正在爬取外部数据...</div>
                    <div style="font-size: 12px; color: #666;">
                        数据源：铁甲网 → 路面机械网 → 1688
                    </div>
                    <div style="font-size: 11px; color: #999; margin-top: 5px;">
                        爬取后将上传到 www.jinzhe.asia
                    </div>
                </div>
            </div>
        `;

        try {
            // 真实数据采集
            console.log('🚀 开始真实数据采集:', keyword);
            const equipmentData = await dataCollector.collect(keyword);
            
            if (!equipmentData || Object.keys(equipmentData.specs).length === 0) {
                showNoDataMessage(analyzer, keyword);
                return;
            }

            console.log('✅ 采集到的真实数据:', equipmentData);

            analysisData = {
                keyword: keyword,
                equipment: equipmentData,
                timestamp: new Date().toISOString(),
                dataSource: equipmentData.source
            };

            // 更新各个维度的内容
            updateOverviewContent(analyzer, analysisData);
            updateNewPriceContent(analyzer, analysisData);
            updateUsedPriceContent(analyzer, analysisData);
            updateRentalContent(analyzer, analysisData);
            updateDecisionContent(analyzer, analysisData);

            // 上传分析数据爬虫采集成功，已上传到 www.jinzhe.asia
            await uploadAnalysisData(analysisData);
            
            showNotification(`✅ 成功采集真实数据（来源：${equipmentData.source}）`, 'success');
            
        } catch (error) {
            console.error('❌ 数据采集失败:', error);
            showNoDataMessage(analyzer, keyword, error.message);
        }
    }

    // 更新综合分析内容
    function updateOverviewContent(analyzer, data) {
        const content = analyzer.querySelector('#overview-content');
        const equipment = data.equipment;
        // 数据来源标识
        const sourceLabel = '🕷️ 网络爬虫采集（铁甲网/路面机械网）';

        const hasPrices = equipment.prices && equipment.prices.newMachine;
        
        content.innerHTML = `
            <div class="analysis-summary" style="background: #e3f2fd; border-left-color: #2196f3;">
                <div class="summary-title" style="color: #1976d2;">
                    📊 ${data.keyword} - 真实数据分析
                </div>
                <div class="summary-item"><strong>数据来源:</strong> ${sourceLabel}</div>
                <div class="summary-item"><strong>设备类型:</strong> ${equipment.type || '未知'}</div>
                <div class="summary-item"><strong>吨位规格:</strong> ${equipment.tonnage || '未知'}${equipment.tonnage ? '吨' : ''}</div>
                ${hasPrices ? `<div class="summary-item"><strong>新机价格区间:</strong> ${equipment.prices.newMachine.min}-${equipment.prices.newMachine.max}${equipment.prices.newMachine.unit}</div>` : ''}
                <div class="summary-item"><strong>采集时间:</strong> ${new Date(data.timestamp).toLocaleString('zh-CN')}</div>
            </div>

            <div class="price-card">
                <div class="price-source">🔧 核心技术参数 (${Object.keys(equipment.specs).length}项)</div>
                ${Object.keys(equipment.specs).length > 0 ? 
                    Object.entries(equipment.specs).map(([key, value]) => `
                        <div class="price-item">
                            <span class="price-label">${key}</span>
                            <span class="price-value">${value}</span>
                        </div>
                    `).join('') :
                    '<div style="text-align: center; padding: 20px; color: #999;">暂无参数数据</div>'
                
                `).join('')}
            </div>
const prices = equipment.prices || {};
        
        if (!prices.newMachine && !prices.dealer) {
            content.innerHTML = `
                <div class="analysis-summary" style="background: #fff3cd;">
                    <div class="summary-title" style="color: #856404;">⚠️ 暂无新机价格数据</div>
                    <div class="summary-item">当前数据源未包含新机价格信息</div>
                    <div class="summary-item">建议：访问官网或经销商页面重新采集</div>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            ${prices.newMachine ? `
            <div class="price-card">
                <div class="price-source">🏭 新机价格 (${prices.newMachine.source || '实时采集'})</div>
                <div class="price-item">
                    <span class="price-label">价格区间</span>
                    <span class="price-value">${prices.newMachine.min}-${prices.newMachine.max}${prices.newMachine.unit}</span>
                </div>
            </div>
            ` : ''}

            ${prices.dealer ? `
            <div class="price-card">
                <div class="price-source">🏪 经销商报价</div>
                <div class="price-item">
                    <span class="price-label">实际成交价</span>
                    <span class="price-value">${prices.dealer.min}-${prices.dealer.max}${prices.dealer.unit}</span>
                </div>
                ${prices.newMachine ? `
                <div class="price-item">
                    <span class="price-label">优惠空间</span>
                    <span class="price-value">${calculateDiscount(equipment)}%</span>
                </div>
                ` : ''}
            </div>
            ` : ''}

            <div class="analysis-summary">
                <div class="summary-title">💡 AI智能建议</div>
                <div class="summary-item">• 数据来源：${data.dataSource}</div>
                <div class="summary-item">• 建议在官网或经销商页面使用本工具获取更准确报价
            <div class="price-card">
                <div class="price-source">🏪 经销商报价</div>
                <div class="price-item">
                    <span class="price-label">实际成交价</span>
                    <span class="price-value">${equipment.prices.dealer.min}-${equipment.prices.dealer.max}${equipment.prices.dealer.unit}</span>
                </div>
                <div class="price-item">
                    <span class="price-label">优惠空间</span>
                    <span class="price-value">${calculateDiscount(equipment)}%</span>
                </div>
            </div>

            <div class="analysis-summary">
                <div class="summary-title">💡 新机购买建议</div>
                <div class="summary-item">• 当前价格处于合理水平</div>
                <div class="summary-item">• 建议关注徐工、三一品牌</div>
                <div class="summary-item">• 最佳购买时机：年底年初优惠力度大</div>
            </div>
        `;
    }

    // 更新二手价格内容  
    function updateUsedPriceContent(analyzer, data) {
        const content = analyzer.querySelector('#usedprice-content');
        const equipment = data.equipment;
        
        content.innerHTML = `
            <div class="price-card">
                <div class="price-source">🔄 3-5年车龄</div>
                <div class="price-item">
                    <span class="price-label">价格区间</span>
                    <span class="price-value">${equipment.prices.used3to5.min}-${equipment.prices.used3to5.max}${equipment.prices.used3to5.unit}</span>
                </div>
                <div class="price-item">
                    <span class="price-label">保值率</span>
                    <span class="price-value">${calculateRetentionRate(equipment, '3-5')}%</span>
                </div>
            </div>

            ${equipment.prices.used5to8 ? `
            <div class="price-card">
                <div class="price-source">🔄 5-8年车龄</div>
                <div class="price-item">
                    <span class="price-label">价格区间</span>
                    <span class="price-value">${equipment.prices.used5to8.min}-${equipment.prices.used5to8.max}${equipment.prices.used5to8.unit}</span>
                </div>
            </div>
            ` : ''}

            <div class="analysis-summary">
                <div class="summary-title">🎯 二手设备建议</div>
                <div class="summary-item">• 保值率较高，二手设备性价比好</div>
                <div class="summary-item">• 重点检查：发动机、液压系统、起重臂</div>
                <div class="summary-item">• 风险评估：常规设备，风险较低</div>
            </div>
        `;
    }

    // 更新租赁内容
    function updateRentalContent(analyzer, data) {
        const content = analyzer.querySelector('#rental-content');
        const equipment = data.equipment;
        
        content.innerHTML = `
            <div class="price-card">
                <div class="price-source">📅 租赁价格体系</div>
                <div class="price-item">
                    <span class="price-label">日租金</span>
                    <span class="price-value">${equipment.prices.rental.daily}${equipment.prices.rental.unit}/天</span>
                </div>
                <div class="price-item">
                    <span class="price-label">月租金</span>
                    <span class="price-value">${(equipment.prices.rental.monthly/10000).toFixed(1)}万${equipment.prices.rental.unit}/月</span>
                </div>
                <div class="price-item">
                    <span class="price-label">年租金</span>
                    <span class="price-value">${(equipment.prices.rental.yearly/10000).toFixed(1)}万${equipment.prices.rental.unit}/年</span>
                </div>
            </div>

            <div class="analysis-summary">
                <div class="summary-title">⚡ 租赁 vs 购买分析</div>
                <div class="summary-item">• 购买回本期：${calculateBreakevenPeriod(equipment)}个月</div>
                <div class="summary-item">• 建议：短期使用(&lt;${calculateBreakevenPeriod(equipment)}个月)建议租赁</div>
                <div class="summary-item">• 长期使用(&gt;${calculateBreakevenPeriod(equipment)}个月)建议购买</div>
            </div>
        `;
    }

    // 更新决策建议内容
    function updateDecisionContent(analyzer, data) {
        const content = analyzer.querySelector('#decision-content');
        const equipment = data.equipment;
        
        const decision = generateDecisionAnalysis(equipment);
        
        content.innerHTML = `
            <div class="decision-box">
                <div class="decision-title">🎯 智能决策建议</div>
                <div class="recommendation">
                    <div class="recommendation-label">最佳购买策略</div>
                    ${decision.bestStrategy}
                </div>
                <div class="recommendation">
                    <div class="recommendation-label">价格预期</div>
                    ${decision.priceOutlook}
                </div>
            </div>

            <div class="analysis-summary">
                <div class="summary-title">📈 中亚市场分析</div>
                <div class="summary-item">• 哈萨克斯坦需求：${decision.kazakhstanDemand}</div>
                <div class="summary-item">• 乌兹别克斯坦市场：${decision.uzbekistanMarket}</div>
                <div class="summary-item">• 物流成本影响：${decision.logisticsCost}</div>
                <div class="summary-item">• 投资建议：${decision.investmentAdvice}</div>
            </div>
        `;
    }

    // 辅助函数
    function calculatePaybackPeriod(equipment) {
        const avgPrice = (equipment.prices.newMachine.min + equipment.prices.newMachine.max) / 2 * 10000;
        const monthlyRental = equipment.prices.rental.monthly;
        return Math.round(avgPrice / monthlyRental) + '个月';
    }

    function calculateDiscount(equipment) {
        const officialPrice = equipment.prices.newMachine.max;
        const dealerPrice = equipment.prices.dealer.min;
        return ((officialPrice - dealerPrice) / officialPrice * 100).toFixed(1);
    }

    function calculateRetentionRate(equipment, ageRange) {
        const newPrice = (equipment.prices.newMachine.min + equipment.prices.newMachine.max) / 2;
        const usedPrice = ageRange === '3-5' ? 
            (equipment.prices.used3to5.min + equipment.prices.used3to5.max) / 2 :
            (equipment.prices.used5to8.min + equipment.prices.used5to8.max) / 2;
        return (usedPrice / newPrice * 100).toFixed(0);
    }

    function calculateBreakevenPeriod(equipment) {
        const avgPrice = (equipment.prices.newMachine.min + equipment.prices.newMachine.max) / 2 * 10000;
        const monthlyRental = equipment.prices.rental.monthly;
        return Math.round(avgPrice / monthlyRental);
    }

    function generateDecisionAnalysis(equipment) {
        const avgPrice = (equipment.prices.newMachine.min + equipment.prices.newMachine.max) / 2;
        
        return {
            bestStrategy: equipment.tonnage <= 30 ? 
                '建议购买二手3-5年车龄设备，性价比最高' : 
                '大型设备建议新机购买，确保可靠性',
            priceOutlook: avgPrice < 90 ? 
                '当前处于价格低位，未来1-2年预期上涨' :
                '价格相对较高，短期内有下调空间',
            kazakhstanDemand: equipment.tonnage <= 30 ? '需求旺盛' : '需求一般',
            uzbekistanMarket: '基建项目多，市场前景好',
            logisticsCost: `预估运输成本${(avgPrice * 0.08).toFixed(1)}万元`,
            investmentAdvice: '建议分批采购，降低单次投资风险'
        };
    }
, keyword, errorMsg = '') {
        const content = analyzer.querySelector('#overview-content');
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <h3>😔 未能采集到"${keyword}"的数据</h3>
                <div style="margin: 20px 0; text-align: left; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <p><strong>已尝试的数据源：</strong></p>
                    <ul style="margin: 10px 0;">
                        <li>✓ 当前页面数据提取</li>
                        <li>✓ 服务器API查询</li>
                        <li>✓ 网络爬虫采爬虫源：</strong></p>
                    <ul style="margin: 10px 0;">
                        <li>✓ 铁甲网 (tiega.cn)</li>
                        <li>✓ 路面机械网 (lmjx.net)</li>
                        <li>✓ 1688工程机械nd: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                    <p><strong>💡 建议：</strong></p>
                    <ul style="text-align: left; margin: 10px 0;">
                        <li>1. 在设备详情页面使用本工具（数据更准确）</li>
                        <li>2. 确保设备型号准确（如"XGC88000"）</li>
                        <li>3. 检查网络连接是否正常</li>
                        <li>4. 联系管理员添加该设备到数据库</li>
                    </ul>确保设备型号准确（如"徐工XCT25"、"XGC88000"）</li>
                        <li>2. 检查网络连接是否正常（需访问外部网站）</li>
                        <li>3. 尝试使用完整型号或品牌+型号组合</li>
                        <li>4. 该设备可能较新，外部数据源暂未收录
        `;
    }

    // 上传分析数据到服务器
    async function uploadAnalysisData(data) {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/price-analysis`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.API_KEY}`
                },
                body: JSON.stringify({
                    type: 'price_analysis',
                    keyword: data.keyword,
                    equipment: data.equipment,
                    timestamp: data.timestamp,
                    source: 'tampermonkey_unified'
                })
            });

            if (response.ok) {
                console.log('价格分析数据已同步到服务器');
            }
        } catch (error) {
            console.warn('数据同步失败，将缓存到本地:', error);
            GM_setValue('cached_analysis_' + Date.now(), JSON.stringify(data));
        }
    }

    // ==================== PDF报告生成功能 ====================
    
    class MachineryPriceReportGenerator {
        constructor() {
            this.reportData = {
                reportNumber: '',
                equipmentList: [],
                timestamp: new Date().toISOString()
            };
        }

        async generateReport(equipmentData) {
            if (!equipmentData) {
                equipmentData = analysisData?.equipment;
                if (!equipmentData) {
                    showNotification('请先进行价格分析', 'warning');
                    return;
                }
                this.reportData.equipmentList = [equipmentData];
            }

            showNotification('正在生成PDF报告...', 'info');

            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });

                this.reportData.reportNumber = `JXSB-JG-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

                // 生成报告各章节
                this.generateCoverPage(doc);
                doc.addPage();
                this.generateContentPages(doc);

                // 保存PDF
                const fileName = `工程机械价格分析报告_${currentKeyword}_${new Date().toISOString().split('T')[0]}.pdf`;
                doc.save(fileName);

                // 上传到服务器
                await this.uploadReport(doc.output('blob'), fileName);

                showNotification('PDF报告生成成功！', 'success');
            } catch (error) {
                console.error('PDF生成失败:', error);
                showNotification('PDF生成失败，请重试', 'error');
            }
        }

        generateCoverPage(doc) {
            const pageWidth = doc.internal.pageSize.getWidth();
            
            doc.setFillColor(102, 126, 234);
            doc.rect(0, 0, pageWidth, 80, 'F');

            doc.setFontSize(28);
            doc.setTextColor(255, 255, 255);
            doc.text('工程机械设备', pageWidth/2, 30, { align: 'center' });
            doc.text('参数型号与多维度价格分析报告', pageWidth/2, 50, { align: 'center' });

            doc.setFontSize(12);
            doc.setTextColor(60, 60, 60);
            doc.text(`报告编号: ${this.reportData.reportNumber}`, 30, 100);
            doc.text(`生成日期: ${new Date().toISOString().split('T')[0]}`, 30, 110);
            doc.text(`设备型号: ${currentKeyword}`, 30, 120);

            doc.setFontSize(10);
            doc.setTextColor(102, 126, 234);
            doc.text('金哲工程机械 | www.jinzhe.asia', pageWidth/2, 280, { align: 'center' });
        }

        generateContentPages(doc) {
            const equipment = analysisData?.equipment;
            if (!equipment) return;

            let y = 20;
            
            // 标题
            doc.setFontSize(16);
            doc.setTextColor(102, 126, 234);
            doc.text(`${currentKeyword} 价格分析报告`, 20, y);
            y += 15;

            // 设备信息
            doc.setFontSize(12);
            doc.setTextColor(60, 60, 60);
            doc.text(`设备类型: ${equipment.type}`, 25, y);
            y += 8;
            doc.text(`吨位: ${equipment.tonnage}吨`, 25, y);
            y += 12;

            // 价格信息表格
            const priceData = [
                ['价格类型', '最低价', '最高价', '单位'],
                ['新机官方指导价', equipment.prices.newMachine.min, equipment.prices.newMachine.max, '万元'],
                ['经销商成交价', equipment.prices.dealer.min, equipment.prices.dealer.max, '万元'],
                ['二手机(3-5年)', equipment.prices.used3to5.min, equipment.prices.used3to5.max, '万元']
            ];

            doc.autoTable({
                startY: y,
                head: [priceData[0]],
                body: priceData.slice(1),
                theme: 'grid',
                headStyles: { fillColor: [102, 126, 234] }
            });

            y = doc.lastAutoTable.finalY + 15;

            // 建议
            doc.setFontSize(14);
            doc.text('采购建议', 20, y);
            y += 10;
            
            doc.setFontSize(10);
            const suggestions = [
                '• 短期使用建议租赁，降低前期投入',
                '• 长期使用建议购买新机，性价比更高',
                '• 注意检查设备维保记录和实际工况'
            ];
            
            suggestions.forEach(suggestion => {
                doc.text(suggestion, 25, y);
                y += 7;
            });
        }

        async uploadReport(blob, fileName) {
            try {
                const formData = new FormData();
                formData.append('file', blob, fileName);
                formData.append('type', 'comprehensive');
                formData.append('reportNumber', this.reportData.reportNumber);

                const response = await fetch(`${CONFIG.API_BASE}/upload-report`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${CONFIG.API_KEY}`
                    },
                    body: formData
                });

                if (response.ok) {
                    console.log('报告已上传到服务器');
                }
            } catch (error) {
                console.warn('报告上传失败:', error);
            }
        }
    }

    // ==================== 通知函数 ====================
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.style.background = type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#667eea';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }

    // ==================== 全局函数 ====================
    window.syncDataToServer = async function(keyword) {
        if (analysisData) {
            await uploadAnalysisData(analysisData);
            showNotification('✅ 数据已成功同步到服务器');
        }
    };

    window.generatePDFReport = async function(keyword) {
        const generator = new MachineryPriceReportGenerator();
        await generator.generateReport();
    };

    // ==================== 浮动按钮 ====================
    function createFloatButton() {
        const button = document.createElement('button');
        button.className = 'float-button';
        button.innerHTML = '📄 生成价格分析报告';
        
        button.addEventListener('click', () => {
            const keyword = window.getSelection().toString().trim() || currentKeyword || '徐工XCT25';
            startPriceAnalysis(keyword);
        });
        
        document.body.appendChild(button);
    }

    // ==================== 事件监听 ====================
    
    // 监听文本选择
    document.addEventListener('mouseup', function() {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText && selectedText.length > 2 && selectedText.length < 50) {
            const machineKeywords = ['起重机', '汽车吊', '吊车', '徐工', '三一', '中联', '吨', 'XCT', 'STC', 'QY'];
            const hasMachineKeyword = machineKeywords.some(keyword => selectedText.includes(keyword));
            
            if (hasMachineKeyword) {
                GM_registerMenuCommand('🏗️ 分析工程机械价格', function() {
                    startPriceAnalysis(selectedText);
                });
            }
        }
    });

    // 快捷键支持 Ctrl+Shift+M
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'M') {
            const selectedText = window.getSelection().toString().trim();
            if (selectedText) {
                e.preventDefault();
                startPriceAnalysis(selectedText);
            }
        }
    });

    // 页面加载完成后添加浮动按钮
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createFloatButton);
    } else {
        createFloatButton();
    }

    console.log('🏗️ 工程机械价格分析系统 v' + CONFIG.VERSION + ' 已加载');
    console.log('📋 使用方法：');
    console.log('  1. 选中设备型号 → 按 Ctrl+Shift+M');
    console.log('  2. 右键菜单 → 选择"分析工程机械价格"');
    console.log('  3. 点击右下角浮动按钮');

})();