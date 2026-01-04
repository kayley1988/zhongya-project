// ==UserScript==
// @name         智能工程机械价格分析助手
// @namespace    http://www.jinzhe.asia/
// @version      2.0.0
// @description  选中设备型号一键获取多维度价格分析，整合新机、二手、租赁、区域、品牌对比数据
// @author       金哲工程机械
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @require      https://cdn.jsdelivr.net/npm/chart.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 样式定义
    GM_addStyle(`
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
            max-height: calc(85vh - 80px);
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

        .sync-button {
            background: linear-gradient(45deg, #28a745, #20c997);
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 12px;
            margin: 10px 0;
            transition: transform 0.2s;
        }

        .sync-button:hover {
            transform: translateY(-1px);
        }
    `);

    // 核心数据：从您的汽车起重机价格.md整合的数据
    const machineryDatabase = {
        // 徐工系列
        '徐工XCT25': {
            type: '汽车起重机',
            tonnage: 25,
            specs: {
                '起重量': '25t',
                '主臂长度': '42m',
                '最大起升高度': '44m',
                '发动机': '潍柴WP8.350E61',
                '整车自重': '33t',
                '额定功率': '257kW',
                '行驶速度': '85km/h'
            },
            prices: {
                newMachine: { min: 88, max: 95, unit: '万元', source: '官网指导价' },
                dealer: { min: 85, max: 92, unit: '万元', source: '经销商报价' },
                used3to5: { min: 45, max: 68, unit: '万元', condition: '3-5年车龄' },
                used5to8: { min: 30, max: 42, unit: '万元', condition: '5-8年车龄' },
                rental: { daily: 1800, monthly: 45000, yearly: 500000, unit: '元' }
            }
        },
        '徐工XCT50': {
            type: '汽车起重机',
            tonnage: 50,
            specs: {
                '起重量': '50t',
                '主臂长度': '45m',
                '最大起升高度': '47m',
                '发动机': '潍柴WP10.375E62',
                '整车自重': '42t',
                '额定功率': '276kW',
                '行驶速度': '80km/h'
            },
            prices: {
                newMachine: { min: 145, max: 158, unit: '万元', source: '官网指导价' },
                dealer: { min: 142, max: 155, unit: '万元', source: '经销商报价' },
                used3to5: { min: 80, max: 110, unit: '万元', condition: '3-5年车龄' },
                used5to8: { min: 65, max: 85, unit: '万元', condition: '5-8年车龄' },
                rental: { daily: 3200, monthly: 85000, yearly: 950000, unit: '元' }
            }
        },
        // 三一系列 (整合验机系统中的数据)
        '三一STC250T': {
            type: '汽车起重机',
            tonnage: 25,
            specs: {
                '起重量': '25t',
                '主臂长度': '41m',
                '最大起升高度': '43m',
                '发动机': '玉柴YC6JA245-60',
                '整车自重': '32t',
                '额定功率': '180kW',
                '行驶速度': '85km/h'
            },
            prices: {
                newMachine: { min: 85, max: 92, unit: '万元', source: '官网指导价' },
                dealer: { min: 82, max: 89, unit: '万元', source: '经销商报价' },
                used3to5: { min: 42, max: 65, unit: '万元', condition: '3-5年车龄' },
                used5to8: { min: 28, max: 38, unit: '万元', condition: '5-8年车龄' },
                rental: { daily: 1650, monthly: 42000, yearly: 460000, unit: '元' }
            }
        },
        // 通用型号匹配
        '25吨汽车起重机': {
            type: '汽车起重机',
            tonnage: 25,
            specs: {
                '起重量': '25t',
                '主臂长度': '40-42m',
                '最大起升高度': '42-44m',
                '整车自重': '31-33t',
                '额定功率': '180-257kW',
                '行驶速度': '85km/h'
            },
            prices: {
                newMachine: { min: 80, max: 95, unit: '万元', source: '市场均价' },
                dealer: { min: 78, max: 92, unit: '万元', source: '经销商报价' },
                used3to5: { min: 40, max: 68, unit: '万元', condition: '3-5年车龄' },
                rental: { daily: 1600, monthly: 40000, yearly: 450000, unit: '元' }
            }
        },
        '50吨汽车起重机': {
            type: '汽车起重机',
            tonnage: 50,
            specs: {
                '起重量': '50t',
                '主臂长度': '45-46m',
                '最大起升高度': '47-48m',
                '整车自重': '42-43t',
                '额定功率': '247-276kW',
                '行驶速度': '80km/h'
            },
            prices: {
                newMachine: { min: 140, max: 158, unit: '万元', source: '市场均价' },
                dealer: { min: 138, max: 155, unit: '万元', source: '经销商报价' },
                used3to5: { min: 78, max: 110, unit: '万元', condition: '3-5年车龄' },
                rental: { daily: 3000, monthly: 80000, yearly: 900000, unit: '元' }
            }
        }
    };

    let currentKeyword = '';
    let analysisData = null;

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
                
                <div class="dimension-content" id="newprice-content">
                    <div class="loading-spinner">正在获取新机价格...</div>
                </div>
                
                <div class="dimension-content" id="usedprice-content">
                    <div class="loading-spinner">正在分析二手市场...</div>
                </div>
                
                <div class="dimension-content" id="rental-content">
                    <div class="loading-spinner">正在分析租赁市场...</div>
                </div>
                
                <div class="dimension-content" id="decision-content">
                    <div class="loading-spinner">正在生成决策建议...</div>
                </div>
            </div>
        `;

        document.body.appendChild(analyzer);

        // 绑定事件
        analyzer.querySelector('.close-analyzer').addEventListener('click', () => {
            analyzer.style.display = 'none';
        });

        // 标签页切换
        analyzer.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                
                // 更新标签状态
                analyzer.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // 更新内容显示
                analyzer.querySelectorAll('.dimension-content').forEach(c => c.classList.remove('active'));
                analyzer.querySelector(`#${tabId}-content`).classList.add('active');
            });
        });

        return analyzer;
    }

    // 开始价格分析
    async function startPriceAnalysis(keyword) {
        currentKeyword = keyword;
        const analyzer = document.getElementById('machinery-price-analyzer') || createAnalyzerInterface();
        
        // 显示分析界面
        analyzer.style.display = 'block';
        analyzer.querySelector('.analyzer-header h2').textContent = `🏗️ ${keyword} - 多维度价格分析`;

        try {
            // 获取设备数据
            const equipmentData = findEquipmentData(keyword);
            
            if (!equipmentData) {
                showNoDataMessage(analyzer);
                return;
            }

            // 模拟爬取和分析过程
            analysisData = {
                keyword: keyword,
                equipment: equipmentData,
                timestamp: new Date().toISOString()
            };

            // 逐步更新各个维度的内容
            await updateOverviewContent(analyzer, analysisData);
            await updateNewPriceContent(analyzer, analysisData);
            await updateUsedPriceContent(analyzer, analysisData);
            await updateRentalContent(analyzer, analysisData);
            await updateDecisionContent(analyzer, analysisData);

            // 上传数据到服务器
            await uploadAnalysisData(analysisData);

        } catch (error) {
            console.error('价格分析失败:', error);
            showErrorMessage(analyzer, error.message);
        }
    }

    // 查找设备数据
    function findEquipmentData(keyword) {
        // 直接匹配
        if (machineryDatabase[keyword]) {
            return machineryDatabase[keyword];
        }

        // 模糊匹配
        for (const [key, data] of Object.entries(machineryDatabase)) {
            if (keyword.includes(key) || key.includes(keyword)) {
                return data;
            }
        }

        // 按吨位和类型匹配
        const tonnageMatch = keyword.match(/(\d+)吨/);
        const typeMatch = keyword.match(/(汽车起重机|起重机|汽车吊|吊车)/);
        
        if (tonnageMatch && typeMatch) {
            const tonnage = parseInt(tonnageMatch[1]);
            for (const [key, data] of Object.entries(machineryDatabase)) {
                if (data.tonnage === tonnage && data.type.includes('起重机')) {
                    return data;
                }
            }
        }

        return null;
    }

    // 更新综合分析内容
    async function updateOverviewContent(analyzer, data) {
        const content = analyzer.querySelector('#overview-content');
        const equipment = data.equipment;
        
        content.innerHTML = `
            <div class="analysis-summary">
                <div class="summary-title">📊 ${data.keyword} 综合分析摘要</div>
                <div class="summary-item"><strong>设备类型:</strong> ${equipment.type}</div>
                <div class="summary-item"><strong>吨位规格:</strong> ${equipment.tonnage}吨</div>
                <div class="summary-item"><strong>新机价格区间:</strong> ${equipment.prices.newMachine.min}-${equipment.prices.newMachine.max}${equipment.prices.newMachine.unit}</div>
                <div class="summary-item"><strong>建议购买时机:</strong> ${getBuyingAdvice(equipment)}</div>
                <div class="summary-item"><strong>投资回报周期:</strong> ${calculatePaybackPeriod(equipment)}</div>
            </div>

            <div class="price-card">
                <div class="price-source">🔧 核心技术参数</div>
                ${Object.entries(equipment.specs).map(([key, value]) => `
                    <div class="price-item">
                        <span class="price-label">${key}</span>
                        <span class="price-value">${value}</span>
                    </div>
                `).join('')}
            </div>

            <button class="sync-button" onclick="syncWithWebsite('${data.keyword}')">
                🔄 同步数据到 jinzhe.asia
            </button>
        `;
    }

    // 更新新机价格内容
    async function updateNewPriceContent(analyzer, data) {
        const content = analyzer.querySelector('#newprice-content');
        const equipment = data.equipment;
        
        content.innerHTML = `
            <div class="price-card">
                <div class="price-source">🏭 官方指导价</div>
                <div class="price-item">
                    <span class="price-label">价格区间</span>
                    <span class="price-value">${equipment.prices.newMachine.min}-${equipment.prices.newMachine.max}${equipment.prices.newMachine.unit}</span>
                </div>
                <div class="price-item">
                    <span class="price-label">数据来源</span>
                    <span class="price-value">${equipment.prices.newMachine.source}</span>
                </div>
            </div>

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
                <div class="summary-item">• 当前价格处于${getPriceLevel(equipment)}水平</div>
                <div class="summary-item">• 建议关注${getRecommendedBrands(equipment)}品牌</div>
                <div class="summary-item">• 最佳购买时机：${getBestBuyingTime(equipment)}</div>
            </div>
        `;
    }

    // 更新二手价格内容
    async function updateUsedPriceContent(analyzer, data) {
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
                <div class="price-item">
                    <span class="price-label">年折旧率</span>
                    <span class="price-value">${calculateDepreciationRate(equipment)}%/年</span>
                </div>
            </div>
            ` : ''}

            <div class="analysis-summary">
                <div class="summary-title">🎯 二手设备建议</div>
                <div class="summary-item">• ${getUsedEquipmentAdvice(equipment)}</div>
                <div class="summary-item">• 重点检查：${getInspectionPoints(equipment)}</div>
                <div class="summary-item">• 风险评估：${getRiskAssessment(equipment)}</div>
            </div>
        `;
    }

    // 更新租赁内容
    async function updateRentalContent(analyzer, data) {
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
                <div class="summary-item">• 租赁适用期：${getRentalSuitablePeriod(equipment)}</div>
                <div class="summary-item">• 购买回本期：${calculateBreakevenPeriod(equipment)}个月</div>
                <div class="summary-item">• ROI对比：${compareRentalROI(equipment)}</div>
            </div>

            <div class="chart-container">
                <canvas id="rental-chart" width="400" height="200"></canvas>
            </div>
        `;

        // 绘制租赁对比图表
        setTimeout(() => drawRentalChart(equipment), 100);
    }

    // 更新决策建议内容
    async function updateDecisionContent(analyzer, data) {
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
                <div class="recommendation">
                    <div class="recommendation-label">风险提示</div>
                    ${decision.riskWarning}
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

    // 上传分析数据到服务器
    async function uploadAnalysisData(data) {
        try {
            const response = await fetch('http://www.jinzhe.asia/api/machinery/price-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer your-api-key'
                },
                body: JSON.stringify({
                    type: 'price_analysis',
                    keyword: data.keyword,
                    equipment: data.equipment,
                    timestamp: data.timestamp,
                    source: 'tampermonkey_analyzer'
                })
            });

            if (response.ok) {
                console.log('价格分析数据已同步到 jinzhe.asia');
                showSyncSuccess();
            }
        } catch (error) {
            console.warn('数据同步失败，将缓存到本地:', error);
            GM_setValue('cached_analysis_' + Date.now(), JSON.stringify(data));
        }
    }

    // 工具函数
    function getBuyingAdvice(equipment) {
        const avgPrice = (equipment.prices.newMachine.min + equipment.prices.newMachine.max) / 2;
        if (avgPrice < 50) return '当前为价格低谷，建议购买';
        if (avgPrice > 100) return '价格偏高，建议等待降价';
        return '价格适中，可择机购买';
    }

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

    function getPriceLevel(equipment) {
        const avgPrice = (equipment.prices.newMachine.min + equipment.prices.newMachine.max) / 2;
        if (equipment.tonnage === 25 && avgPrice < 85) return '偏低';
        if (equipment.tonnage === 50 && avgPrice < 145) return '偏低';
        return '正常';
    }

    function getRecommendedBrands(equipment) {
        return equipment.tonnage <= 30 ? '徐工、三一、中联' : '徐工、三一';
    }

    function getBestBuyingTime(equipment) {
        const month = new Date().getMonth() + 1;
        if (month >= 11 || month <= 2) return '年底年初优惠力度大';
        if (month >= 6 && month <= 8) return '淡季价格相对较低';
        return '当前时期价格平稳';
    }

    function calculateRetentionRate(equipment, ageRange) {
        const newPrice = (equipment.prices.newMachine.min + equipment.prices.newMachine.max) / 2;
        const usedPrice = ageRange === '3-5' ? 
            (equipment.prices.used3to5.min + equipment.prices.used3to5.max) / 2 :
            (equipment.prices.used5to8.min + equipment.prices.used5to8.max) / 2;
        return (usedPrice / newPrice * 100).toFixed(0);
    }

    function calculateDepreciationRate(equipment) {
        const newPrice = (equipment.prices.newMachine.min + equipment.prices.newMachine.max) / 2;
        const usedPrice = (equipment.prices.used5to8.min + equipment.prices.used5to8.max) / 2;
        const depreciationRate = (newPrice - usedPrice) / newPrice / 6.5 * 100;
        return depreciationRate.toFixed(1);
    }

    function getUsedEquipmentAdvice(equipment) {
        const retentionRate = parseInt(calculateRetentionRate(equipment, '3-5'));
        if (retentionRate > 65) return '保值率较高，二手设备性价比好';
        if (retentionRate > 50) return '保值率一般，需仔细检查设备状况';
        return '保值率较低，建议谨慎购买或大幅砍价';
    }

    function getInspectionPoints(equipment) {
        return '发动机、液压系统、起重臂、电气系统';
    }

    function getRiskAssessment(equipment) {
        if (equipment.tonnage >= 50) return '大型设备维修成本高，风险中等';
        return '常规设备，风险较低';
    }

    function getRentalSuitablePeriod(equipment) {
        const breakeven = parseInt(calculatePaybackPeriod(equipment));
        return `短期使用(<${breakeven}个月)建议租赁`;
    }

    function calculateBreakevenPeriod(equipment) {
        const avgPrice = (equipment.prices.newMachine.min + equipment.prices.newMachine.max) / 2 * 10000;
        const monthlyRental = equipment.prices.rental.monthly;
        return Math.round(avgPrice / monthlyRental);
    }

    function compareRentalROI(equipment) {
        const breakeven = calculateBreakevenPeriod(equipment);
        return `${breakeven}个月后购买比租赁划算`;
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
                
            riskWarning: '注意汇率波动对中亚出口成本的影响',
            
            kazakhstanDemand: equipment.tonnage <= 30 ? '需求旺盛' : '需求一般',
            uzbekistanMarket: '基建项目多，市场前景好',
            logisticsCost: `预估运输成本${(avgPrice * 0.08).toFixed(1)}万元`,
            investmentAdvice: '建议分批采购，降低单次投资风险'
        };
    }

    function drawRentalChart(equipment) {
        const canvas = document.getElementById('rental-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // 简化的图表绘制
        ctx.fillStyle = '#667eea';
        ctx.fillRect(50, 50, 100, 100);
        ctx.fillStyle = '#764ba2';
        ctx.fillRect(200, 80, 100, 70);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(350, 20, 100, 130);
        
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.fillText('月租', 75, 170);
        ctx.fillText('年租', 225, 170);
        ctx.fillText('购买', 375, 170);
    }

    function showSyncSuccess() {
        const message = document.createElement('div');
        message.style.cssText = `
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
        `;
        message.textContent = '✅ 数据已成功同步到 jinzhe.asia';
        document.body.appendChild(message);
        
        setTimeout(() => message.remove(), 3000);
    }

    function showNoDataMessage(analyzer) {
        const content = analyzer.querySelector('#overview-content');
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <h3>😔 暂未收录该设备</h3>
                <p>当前系统暂未收录"${currentKeyword}"的价格数据</p>
                <p>支持的设备型号：徐工XCT25/50、三一STC250T、25吨/50吨汽车起重机等</p>
            </div>
        `;
    }

    function showErrorMessage(analyzer, error) {
        const content = analyzer.querySelector('#overview-content');
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <h3>❌ 分析失败</h3>
                <p>错误信息：${error}</p>
                <button onclick="location.reload()" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">重新尝试</button>
            </div>
        `;
    }

    // 全局函数
    window.syncWithWebsite = function(keyword) {
        if (analysisData) {
            uploadAnalysisData(analysisData);
        }
    };

    // 监听文本选择
    document.addEventListener('mouseup', function() {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText && selectedText.length > 2 && selectedText.length < 50) {
            // 检查是否包含机械设备关键词
            const machineKeywords = ['起重机', '汽车吊', '吊车', '徐工', '三一', '中联', '吨', 'XCT', 'STC', 'QY'];
            const hasMachineKeyword = machineKeywords.some(keyword => selectedText.includes(keyword));
            
            if (hasMachineKeyword) {
                // 添加右键菜单
                setTimeout(() => {
                    GM_registerMenuCommand('🏗️ 分析工程机械价格', function() {
                        startPriceAnalysis(selectedText);
                    });
                }, 100);
            }
        }
    });

    // 快捷键支持
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'M') {
            const selectedText = window.getSelection().toString().trim();
            if (selectedText) {
                e.preventDefault();
                startPriceAnalysis(selectedText);
            }
        }
    });

    console.log('🏗️ 智能工程机械价格分析助手已加载');
    console.log('📋 使用方法：选中设备型号 → 右键菜单 → 选择"分析工程机械价格"');
    console.log('⌨️  快捷键：选中文本后按 Ctrl+Shift+M');

})();