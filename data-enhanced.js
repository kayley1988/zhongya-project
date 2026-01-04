/**
 * 智能数据驱动中心 - 增强版JavaScript
 * 支持多视图切换、实时数据更新、AI智能分析
 */

// 全局配置
const CONFIG = {
    updateInterval: 5000, // 更新间隔（毫秒）
    chartColors: {
        primary: '#4f46e5',
        secondary: '#7c3aed',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#06b6d4'
    },
    animations: {
        duration: 800,
        easing: 'easeInOutQuart'
    }
};

// 全局状态管理
class StateManager {
    constructor() {
        this.state = {
            currentView: 'dashboard',
            isRealTimeActive: true,
            dashboardData: {},
            projects: [],
            aiMetrics: {},
            systemHealth: {},
            customEquipments: [] // 新增：自定义设备数组
        };
        this.listeners = {};
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notifyListeners();
    }

    getState() {
        return this.state;
    }

    subscribe(listener) {
        const id = Date.now().toString();
        this.listeners[id] = listener;
        return () => delete this.listeners[id];
    }

    notifyListeners() {
        Object.values(this.listeners).forEach(listener => listener(this.state));
    }
}

// 全局状态实例
const stateManager = new StateManager();

// 真实汇率管理器
class RealExchangeRateManager {
    constructor() {
        this.cache = new Map();
        this.lastUpdateTime = null;
        this.updateInterval = 30 * 60 * 1000; // 30分钟更新一次
        this.supportedPairs = [
            'CNY/KZT',  // 人民币/哈萨克坚戈
            'CNY/UZS',  // 人民币/乌兹别克苏姆
            'USD/CNY',  // 美元/人民币
            'USD/KZT',  // 美元/哈萨克坚戈
            'EUR/CNY',  // 欧元/人民币
            'JPY/CNY'   // 日元/人民币
        ];
    }
    /**
     * 获取指定货币对的汇率（优先通过本地代理）
     */
    async fetchRateForPair(pair) {
        const FX_PROXY_BASE = 'http://localhost:4000';
        // 先尝试代理
        try {
            const url = `${FX_PROXY_BASE}/api/fx?pairs=${encodeURIComponent(pair)}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const resp = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (resp.ok) {
                const json = await resp.json();
                if (json && json.ok && json.rates && json.rates[pair]) {
                    const data = { ...json.rates[pair], source: json.rates[pair].source || 'proxy' };
                    this.cache.set(pair, data);
                    return data;
                }
            }
        } catch (err) {
            console.warn('本地代理获取失败，回退到前端多源抓取:', err.message);
        }

        // 代理不可用则回退到原始抓取逻辑
        return await this.fetchRateForPairFallback(pair);
    }

    // 原有的前端抓取逻辑作为回退函数
    async fetchRateForPairFallback(pair) {
        const [base, quote] = pair.split('/');
        
        // 优先级列表：多个数据源确保可用性
        const sources = [
            {
                name: 'CDN汇率API',
                url: `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base.toLowerCase()}/${quote.toLowerCase()}.json`,
                parser: this.parseCdnApiRate.bind(this)
            },
            {
                name: '新浪财经',
                url: this.getSinaUrl(base, quote),
                parser: this.parseSinaRate.bind(this)
            },
            {
                name: 'ExchangeRate-API',
                url: `https://api.exchangerate-api.com/v4/latest/${base}`,
                parser: (data) => this.parseExchangeApiRate(data, quote)
            }
        ];

        // 尝试每个数据源
        for (const source of sources) {
            try {
                if (!source.url) continue;
                
                console.log(`正在从${source.name}获取${pair}汇率...`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
                
                const response = await fetch(source.url, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) continue;
                
                const contentType = response.headers.get('content-type');
                const data = contentType && contentType.includes('application/json') 
                    ? await response.json() 
                    : await response.text();
                
                const result = source.parser(data, base, quote);
                if (result && result.rate > 0) {
                    const rateData = {
                        rate: result.rate,
                        date: new Date().toISOString().split('T')[0],
                        time: new Date().toISOString(),
                        source: source.name,
                        pair: pair
                    };
                    
                    // 缓存结果
                    this.cache.set(pair, rateData);
                    
                    return rateData;
                }
            } catch (err) {
                if (err.name === 'AbortError') {
                    console.warn(`${source.name}请求超时`);
                } else {
                    console.warn(`${source.name}获取失败:`, err.message);
                }
                continue;
            }
        }
        
        // 如果所有API都失败，返回缓存的数据
        if (this.cache.has(pair)) {
            const cached = this.cache.get(pair);
            console.warn(`使用缓存的汇率数据: ${pair} = ${cached.rate}`);
            return { ...cached, isStale: true };
        }
        
        throw new Error(`无法获取${pair}汇率数据`);
    }

    /**
     * 获取新浪财经汇率URL
     */
    getSinaUrl(base, quote) {
        const pairMap = {
            'CNY/KZT': 'https://hq.sinajs.cn/list=CNYKZT',
            'CNY/UZS': 'https://hq.sinajs.cn/list=CNYUZS', 
            'USD/CNY': 'https://hq.sinajs.cn/list=USDCNY',
            'USD/KZT': 'https://hq.sinajs.cn/list=USDKZT',
            'EUR/CNY': 'https://hq.sinajs.cn/list=EURCNY',
            'JPY/CNY': 'https://hq.sinajs.cn/list=JPYCNY'
        };
        return pairMap[`${base}/${quote}`];
    }

    /**
     * 解析新浪财经汇率数据
     */
    parseSinaRate(data, base, quote) {
        try {
            // 新浪返回格式: var hq_str_CNYKZT="65.5000,65.3000,..."
            const match = data.match(/hq_str_[^=]+"([^"]+)"/);
            if (match && match[1]) {
                const values = match[1].split(',');
                const rate = parseFloat(values[0]); // 第一个值通常是最新价
                if (rate && rate > 0) {
                    return { rate };
                }
            }
        } catch (err) {
            console.warn('新浪汇率解析失败:', err);
        }
        return null;
    }

    /**
     * 解析CDN API汇率数据  
     */
    parseCdnApiRate(data, base, quote) {
        try {
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            const rate = data[quote.toLowerCase()];
            if (rate && rate > 0) {
                return { rate };
            }
        } catch (err) {
            console.warn('CDN API解析失败:', err);
        }
        return null;
    }

    /**
     * 解析ExchangeRate-API数据
     */
    parseExchangeApiRate(data, quote) {
        try {
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            if (data.rates && data.rates[quote]) {
                return { rate: data.rates[quote] };
            }
        } catch (err) {
            console.warn('ExchangeRate-API解析失败:', err);
        }
        return null;
    }

    /**
     * 批量获取多个货币对汇率
     */
    async fetchMultipleRates(pairs = this.supportedPairs) {
        const results = {};

        // First try local proxy if available
        try {
            const proxyUrl = `/api/fx?pairs=${pairs.join(',')}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const resp = await fetch(proxyUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (resp.ok) {
                const json = await resp.json();
                if (json && json.ok && json.rates) {
                    for (const p of pairs) {
                        if (json.rates[p]) {
                            results[p] = { ...json.rates[p], source: json.rates[p].source || 'proxy' };
                        }
                    }
                    this.lastUpdateTime = new Date().toISOString();
                    console.log('使用本地代理获取汇率数据');
                    return results;
                }
            }
        } catch (err) {
            console.warn('本地代理获取失败，回退到前端多源抓取:', err.message);
        }

        // Fallback to original multi-source approach
        const promises = pairs.map(async (pair) => {
            try {
                const result = await this.fetchRateForPair(pair);
                results[pair] = result;
            } catch (err) {
                console.warn(`获取${pair}汇率失败:`, err.message);
                results[pair] = null;
            }
        });

        await Promise.allSettled(promises);
        this.lastUpdateTime = new Date().toISOString();
        return results;
    }

    /**
     * 获取缓存的汇率数据
     */
    getCachedRates() {
        const cached = {};
        for (const [pair, data] of this.cache.entries()) {
            cached[pair] = data;
        }
        return cached;
    }

    /**
     * 检查是否需要更新汇率
     */
    shouldUpdateRates() {
        if (!this.lastUpdateTime) return true;
        const lastUpdate = new Date(this.lastUpdateTime).getTime();
        const now = Date.now();
        return (now - lastUpdate) > this.updateInterval;
    }

    /**
     * 获取汇率趋势数据（模拟）
     */
    generateTrendData(pair, days = 30) {
        const current = this.cache.get(pair);
        if (!current) return [];

        const trend = [];
        const baseRate = current.rate;
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            // 模拟汇率波动（±2%）
            const fluctuation = (Math.random() - 0.5) * 0.04;
            const rate = baseRate * (1 + fluctuation);
            
            trend.push({
                date: date.toISOString().split('T')[0],
                rate: parseFloat(rate.toFixed(4))
            });
        }
        
        return trend;
    }

    // 清除缓存
    clearCache() {
        this.cache.clear();
        // 清除localStorage中的汇率历史数据
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('fx_cache_') || key.startsWith('fx_history_')) {
                localStorage.removeItem(key);
            }
        });
        console.log('汇率缓存已清除');
    }
}

// 全局汇率管理器实例
const exchangeRateManager = new RealExchangeRateManager();

// 数据生成器
class DataGenerator {
    static async generateRealExchangeRates() {
        try {
            if (exchangeRateManager.shouldUpdateRates()) {
                console.log('正在获取最新汇率数据...');
                const rates = await exchangeRateManager.fetchMultipleRates();
                return rates;
            } else {
                console.log('使用缓存的汇率数据');
                return exchangeRateManager.getCachedRates();
            }
        } catch (err) {
            console.warn('获取实时汇率失败，使用模拟数据:', err.message);
            return this.generateMockExchangeRates();
        }
    }

    static generateMockExchangeRates() {
        const baseRates = {
            'CNY/KZT': 65.5 + (Math.random() - 0.5) * 2,
            'CNY/UZS': 1450 + (Math.random() - 0.5) * 50,
            'USD/CNY': 7.15 + (Math.random() - 0.5) * 0.2,
            'USD/KZT': 468 + (Math.random() - 0.5) * 10,
            'EUR/CNY': 7.85 + (Math.random() - 0.5) * 0.3,
            'JPY/CNY': 0.048 + (Math.random() - 0.5) * 0.002
        };

        const result = {};
        for (const [pair, rate] of Object.entries(baseRates)) {
            result[pair] = {
                rate: parseFloat(rate.toFixed(4)),
                date: new Date().toISOString().split('T')[0],
                time: new Date().toISOString(),
                source: '模拟数据',
                pair: pair
            };
        }
        return result;
    }
    static generateProjects(count = 5) {
        const projectNames = [
            '哈萨克斯坦基建项目A', '乌兹别克斯坦矿业开发', '吉尔吉斯斯坦水利工程',
            '塔吉克斯坦电力建设', '土库曼斯坦天然气管道', '阿富汗道路建设'
        ];
        
        const statuses = ['进行中', '已完成', '待开始', '暂停'];
        const statusClasses = ['active', 'completed', 'pending', 'paused'];
        
        return Array.from({ length: count }, (_, i) => ({
            id: `P${String(i + 1).padStart(3, '0')}`,
            name: projectNames[i % projectNames.length],
            description: `${['大型', '中型', '小型'][Math.floor(Math.random() * 3)]}设备租赁项目，预计工期${Math.floor(Math.random() * 12 + 1)}个月`,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            statusClass: statusClasses[Math.floor(Math.random() * statusClasses.length)],
            progress: Math.floor(Math.random() * 100),
            revenue: (Math.random() * 500000 + 50000).toFixed(0),
            deadline: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            teamSize: Math.floor(Math.random() * 8 + 3),
            equipment: ['挖掘机', '起重机', '推土机', '装载机'][Math.floor(Math.random() * 4)]
        }));
    }

    static generateAIMetrics() {
        return {
            successRate: (85 + Math.random() * 10).toFixed(1) + '%',
            revenuePredict: '$' + (1000000 + Math.random() * 500000).toLocaleString(),
            riskLevel: ['低', '中', '高'][Math.floor(Math.random() * 3)],
            confidence: (90 + Math.random() * 8).toFixed(1) + '%'
        };
    }

    static generateSystemHealth() {
        return {
            overall: Math.floor(95 + Math.random() * 5),
            dataQuality: Math.floor(90 + Math.random() * 8),
            stability: Math.floor(97 + Math.random() * 3),
            performance: Math.floor(85 + Math.random() * 10)
        };
    }

    static generateRealTimeMetrics() {
        return {
            dataProcessed: Math.floor(Math.random() * 10000) + 45000,
            systemLoad: Math.floor(Math.random() * 40) + 10,
            syncStatus: ['正常', '同步中', '等待'][Math.floor(Math.random() * 3)],
            accuracy: (99.2 + Math.random() * 0.6).toFixed(1),
            processingSpeed: Math.floor(Math.random() * 80) + 120
        };
    }

    static generateSuggestions() {
        const suggestions = [
            {
                priority: 'high',
                icon: '🚨',
                title: '高优先级建议',
                text: '检测到项目P001的设备租金存在异常波动，建议立即审查',
                action: '立即处理'
            },
            {
                priority: 'medium',
                icon: '⚠️',
                title: '中优先级建议',
                text: '汇率数据更新频率可以优化，建议调整至每小时同步',
                action: '查看详情'
            },
            {
                priority: 'low',
                icon: '💡',
                title: '优化建议',
                text: '系统性能良好，可考虑启用高级预测模式',
                action: '了解更多'
            }
        ];
        
        return suggestions.slice(0, Math.floor(Math.random() * 3) + 1);
    }
}

// 图表管理器
class ChartManager {
    constructor() {
        this.charts = {};
        this.colors = CONFIG.chartColors;
    }

    createGauge(canvasId, value, max = 100, label = '') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;
        
        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 背景圆环
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 8;
        ctx.stroke();
        
        // 进度圆环
        const angle = (value / max) * 2 * Math.PI - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, angle);
        ctx.strokeStyle = this.colors.success;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // 中心文字
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${value}%`, centerX, centerY + 5);
    }

    createLineChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 简单的折线图实现
        const padding = 20;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;
        
        if (data.length === 0) return;
        
        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const range = maxValue - minValue || 1;
        
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = padding + (index / (data.length - 1)) * chartWidth;
            const y = padding + (1 - (value - minValue) / range) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    }

    updateAllCharts() {
        // 更新所有仪表盘图表
        this.createGauge('projectGauge', 73, 100, '项目进度');
        this.createGauge('revenueGauge', 89, 100, '收益率');
        this.createGauge('efficiencyGauge', 91, 100, '效率指标');
        
        // 更新AI趋势图
        const trendData = Array.from({ length: 20 }, () => Math.random() * 100 + 50);
        this.createLineChart('aiTrendChart', trendData);
        
        // 更新其他分析图表
        this.updateAnalyticsCharts();
    }

    updateAnalyticsCharts() {
        // 收益趋势分析
        const revenueData = Array.from({ length: 12 }, () => Math.random() * 500000 + 100000);
        this.createLineChart('revenueChart', revenueData);
        
        // 设备使用率
        const utilizationData = Array.from({ length: 30 }, () => Math.random() * 100);
        this.createLineChart('utilizationChart', utilizationData);
        
        // 区域分布 - 简单饼图
        this.createPieChart('regionChart', [30, 25, 20, 15, 10]);
        
        // 成本结构
        const costData = Array.from({ length: 8 }, () => Math.random() * 200000 + 50000);
        this.createLineChart('costChart', costData);
    }

    createPieChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;
        
        const total = data.reduce((sum, value) => sum + value, 0);
        let currentAngle = 0;
        
        const colors = Object.values(this.colors);
        
        data.forEach((value, index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.lineTo(centerX, centerY);
            ctx.fillStyle = colors[index % colors.length];
            ctx.fill();
            
            currentAngle += sliceAngle;
        });
    }
}

// 视图管理器
class ViewManager {
    constructor() {
        this.currentView = 'dashboard';
        this.chartManager = new ChartManager();
        this.updateInterval = null;
    }

    switchView(viewName) {
        // 更新按钮状态
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // 切换内容
        document.querySelectorAll('.view-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(viewName + 'View');
        if (activeContent) {
            activeContent.classList.add('active');
        }

        this.currentView = viewName;
        stateManager.setState({ currentView: viewName });

        // 根据视图加载相应数据
        this.loadViewData(viewName);
    }

    loadViewData(viewName) {
        switch(viewName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'gantt':
                this.loadGanttChart();
                break;
            case 'cards':
                this.loadProjectCards();
                break;
            case 'analytics':
                this.loadAnalyticsCharts();
                break;
            case 'table':
                this.loadDataTable();
                break;
        }
    }

    async loadDashboard() {
        // 更新AI指标
        const aiMetrics = DataGenerator.generateAIMetrics();
        document.getElementById('successRate').textContent = aiMetrics.successRate;
        document.getElementById('revenuePredict').textContent = aiMetrics.revenuePredict;
        document.getElementById('riskLevel').textContent = aiMetrics.riskLevel;

        // 更新系统健康度
        const health = DataGenerator.generateSystemHealth();
        document.getElementById('healthScore').textContent = health.overall;
        
        // 更新健康度进度条
        const healthItems = document.querySelectorAll('.health-item');
        if (healthItems.length >= 3) {
            healthItems[0].querySelector('.health-progress').style.width = health.dataQuality + '%';
            healthItems[0].querySelector('.health-value').textContent = health.dataQuality + '%';
            
            healthItems[1].querySelector('.health-progress').style.width = health.stability + '%';
            healthItems[1].querySelector('.health-value').textContent = health.stability + '%';
            
            healthItems[2].querySelector('.health-progress').style.width = health.performance + '%';
            healthItems[2].querySelector('.health-value').textContent = health.performance + '%';
        }

        // 更新智能建议
        this.updateSuggestions();

        // 加载真实汇率数据
        await this.loadRealExchangeRates();

        // 更新图表
        setTimeout(() => {
            this.chartManager.updateAllCharts();
        }, 100);
    }

    async loadRealExchangeRates() {
        try {
            // 显示加载状态
            this.showExchangeRateLoading(true);
            
            // 获取真实汇率数据
            const exchangeRates = await DataGenerator.generateRealExchangeRates();
            
            // 更新汇率显示卡片
            this.updateExchangeRateCards(exchangeRates);
            
            // 保存到状态
            stateManager.setState({ exchangeRates });
            
            console.log('汇率数据加载完成:', exchangeRates);
        } catch (err) {
            console.error('加载汇率数据失败:', err);
            showToast('汇率数据加载失败，已切换到模拟模式', 'error');
        } finally {
            this.showExchangeRateLoading(false);
        }
    }

    updateExchangeRateCards(exchangeRates) {
        // 如果汇率卡片容器不存在，创建它
        let rateContainer = document.getElementById('exchangeRateContainer');
        if (!rateContainer) {
            rateContainer = this.createExchangeRateContainer();
        }

        // 清空现有内容
        rateContainer.innerHTML = '';

        // 添加标题
        const header = document.createElement('div');
        header.className = 'card-header';
        header.innerHTML = `
            <h3>💱 实时汇率监控</h3>
            <span class="last-updated">最后更新: ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}</span>
        `;
        rateContainer.appendChild(header);

        // 创建汇率网格
        const rateGrid = document.createElement('div');
        rateGrid.className = 'exchange-rate-grid';

        // 重点关注的货币对
        const priorityPairs = ['CNY/KZT', 'CNY/UZS', 'USD/CNY', 'USD/KZT'];
        
        priorityPairs.forEach(pair => {
            const rateData = exchangeRates[pair];
            if (rateData) {
                const rateItem = document.createElement('div');
                rateItem.className = 'exchange-rate-item';
                
                const trend = this.calculateRateTrend(pair, rateData.rate);
                const trendIcon = trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
                const trendClass = trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : 'trend-stable';
                
                rateItem.innerHTML = `
                    <div class="rate-pair">${pair}</div>
                    <div class="rate-value ${trendClass}">
                        ${trendIcon} ${rateData.rate}
                        ${rateData.isStale ? ' <span class="stale-indicator">⚠️</span>' : ''}
                    </div>
                    <div class="rate-source">${rateData.source}</div>
                    <div class="rate-time">${rateData.date}</div>
                `;
                rateGrid.appendChild(rateItem);
            }
        });

        rateContainer.appendChild(rateGrid);

        // 添加操作按钮
        const actions = document.createElement('div');
        actions.className = 'rate-actions';
        actions.innerHTML = `
            <button class="btn btn-outline" onclick="viewManager.refreshExchangeRates()" style="font-size: 0.8em;">
                🔄 刷新汇率
            </button>
            <button class="btn btn-outline" onclick="viewManager.showRateHistory()" style="font-size: 0.8em;">
                📊 查看历史
            </button>
        `;
        rateContainer.appendChild(actions);
    }

    createExchangeRateContainer() {
        // 找到仪表盘网格
        const dashboardGrid = document.querySelector('.dashboard-grid');
        if (!dashboardGrid) return null;

        // 创建汇率监控卡片
        const rateCard = document.createElement('div');
        rateCard.className = 'dashboard-card exchange-rate-monitor';
        rateCard.id = 'exchangeRateContainer';
        
        // 插入到仪表盘网格中（第二个位置）
        const cards = dashboardGrid.querySelectorAll('.dashboard-card');
        if (cards.length > 1) {
            dashboardGrid.insertBefore(rateCard, cards[2]);
        } else {
            dashboardGrid.appendChild(rateCard);
        }

        return rateCard;
    }

    calculateRateTrend(pair, currentRate) {
        // 简单的趋势计算（与之前的值比较）
        const stored = localStorage.getItem(`lastRate_${pair}`);
        if (stored) {
            const lastRate = parseFloat(stored);
            const change = ((currentRate - lastRate) / lastRate) * 100;
            localStorage.setItem(`lastRate_${pair}`, currentRate.toString());
            return change;
        } else {
            localStorage.setItem(`lastRate_${pair}`, currentRate.toString());
            return 0;
        }
    }

    showExchangeRateLoading(show) {
        const container = document.getElementById('exchangeRateContainer');
        if (!container) return;

        if (show) {
            container.innerHTML = `
                <div class="card-header">
                    <h3>💱 实时汇率监控</h3>
                    <span class="loading-spinner">⏳</span>
                </div>
                <div class="loading-content">
                    <div class="loading-text">正在获取最新汇率数据...</div>
                </div>
            `;
        }
    }

    async refreshExchangeRates() {
        showToast('正在刷新汇率数据...', 'info');
        await this.loadRealExchangeRates();
    }

    showRateHistory() {
        showToast('汇率历史功能开发中...', 'info');
    }

    updateSuggestions() {
        const suggestions = DataGenerator.generateSuggestions();
        const container = document.getElementById('suggestionsList');
        if (!container) return;

        container.innerHTML = '';
        
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = `suggestion-item priority-${suggestion.priority}`;
            item.innerHTML = `
                <div class="suggestion-icon">${suggestion.icon}</div>
                <div class="suggestion-content">
                    <div class="suggestion-title">${suggestion.title}</div>
                    <div class="suggestion-text">${suggestion.text}</div>
                </div>
                <button class="suggestion-action" onclick="handleSuggestion('${suggestion.priority}')">${suggestion.action}</button>
            `;
            container.appendChild(item);
        });
    }

    loadProjectCards() {
        const projects = DataGenerator.generateProjects(6);
        const container = document.getElementById('cardsGrid');
        if (!container) return;

        container.innerHTML = '';
        
        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = `project-card ${project.statusClass}`;
            card.innerHTML = `
                <div class="card-status">${project.status}</div>
                <div class="card-content">
                    <h3 class="card-title">${project.name}</h3>
                    <p class="card-description">${project.description}</p>
                    <div class="card-metrics">
                        <div class="card-metric">
                            <span class="metric-label">进度</span>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${project.progress}%"></div>
                            </div>
                            <span class="metric-value">${project.progress}%</span>
                        </div>
                        <div class="card-metric">
                            <span class="metric-label">收益</span>
                            <span class="metric-value text-success">+$${project.revenue}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="card-team">
                            ${Array.from({ length: project.teamSize }, () => '<span class="team-member">👤</span>').join('')}
                        </div>
                        <div class="card-deadline">截止: ${project.deadline}</div>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="action-btn" onclick="viewProjectDetails('${project.id}')">📊 详情</button>
                    <button class="action-btn" onclick="editProject('${project.id}')">✏️ 编辑</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    loadGanttChart() {
        const container = document.getElementById('ganttChart');
        if (!container) return;

        // 简单的甘特图实现
        const projects = DataGenerator.generateProjects(8);
        const timelineHeader = document.getElementById('timelineHeader');
        const timelineBody = document.getElementById('timelineBody');
        
        if (timelineHeader && timelineBody) {
            // 生成时间轴
            const months = ['一月', '二月', '三月', '四月', '五月', '六月'];
            timelineHeader.innerHTML = months.map(month => `<div class="timeline-month">${month}</div>`).join('');
            
            // 生成项目条
            timelineBody.innerHTML = projects.map(project => {
                const startPos = Math.random() * 30;
                const duration = Math.random() * 40 + 10;
                return `
                    <div class="gantt-row">
                        <div class="gantt-label">${project.name}</div>
                        <div class="gantt-bar" style="left: ${startPos}%; width: ${duration}%;">
                            <span class="gantt-progress" style="width: ${project.progress}%"></span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    loadAnalyticsCharts() {
        setTimeout(() => {
            this.chartManager.updateAnalyticsCharts();
        }, 100);
    }

    loadDataTable() {
        const currentTable = document.querySelector('select[onchange="switchDataTable(this.value)"]').value;
        
        if (currentTable === 'customEquipments') {
            this.loadCustomEquipmentTable();
            return;
        }
        
        if (currentTable === 'fxRates') {
            this.loadExchangeRatesTable();
            return;
        }
        
        const projects = DataGenerator.generateProjects(20);
        const tableHead = document.getElementById('tableHead');
        const tableBody = document.getElementById('tableBody');
        
        if (tableHead && tableBody) {
            // 表头
            tableHead.innerHTML = `
                <tr>
                    <th>项目ID</th>
                    <th>项目名称</th>
                    <th>状态</th>
                    <th>进度</th>
                    <th>预计收益</th>
                    <th>截止日期</th>
                    <th>操作</th>
                </tr>
            `;
            
            // 表体
            tableBody.innerHTML = projects.map(project => `
                <tr>
                    <td>${project.id}</td>
                    <td>${project.name}</td>
                    <td><span class="status-badge ${project.statusClass}">${project.status}</span></td>
                    <td>
                        <div class="table-progress">
                            <div class="table-progress-bar" style="width: ${project.progress}%"></div>
                            <span>${project.progress}%</span>
                        </div>
                    </td>
                    <td>$${project.revenue}</td>
                    <td>${project.deadline}</td>
                    <td>
                        <button class="table-action-btn" onclick="viewProjectDetails('${project.id}')">查看</button>
                        <button class="table-action-btn" onclick="editProject('${project.id}')">编辑</button>
                    </td>
                </tr>
            `).join('');
        }
    }

    async loadExchangeRatesTable() {
        const tableHead = document.getElementById('tableHead');
        const tableBody = document.getElementById('tableBody');
        
        if (tableHead && tableBody) {
            // 汇率数据表头
            tableHead.innerHTML = `
                <tr>
                    <th>货币对</th>
                    <th>当前汇率</th>
                    <th>数据来源</th>
                    <th>更新时间</th>
                    <th>趋势</th>
                    <th>状态</th>
                    <th>操作</th>
                </tr>
            `;
            
            try {
                // 显示加载状态
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center; padding:40px;">
                            <div>⏳ 正在获取最新汇率数据...</div>
                        </td>
                    </tr>
                `;
                
                // 获取汇率数据
                const exchangeRates = await DataGenerator.generateRealExchangeRates();
                
                // 生成表格内容
                const rows = [];
                for (const [pair, data] of Object.entries(exchangeRates)) {
                    if (!data) continue;
                    
                    const trend = this.calculateRateTrend(pair, data.rate);
                    const trendIcon = trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
                    const trendText = trend > 0 ? `+${trend.toFixed(2)}%` : 
                                     trend < 0 ? `${trend.toFixed(2)}%` : '持平';
                    const trendClass = trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : 'trend-stable';
                    
                    const statusIcon = data.isStale ? '⚠️ 缓存' : '✅ 最新';
                    const statusClass = data.isStale ? 'status-warning' : 'status-success';
                    
                    rows.push(`
                        <tr>
                            <td>
                                <div class="currency-pair">
                                    <span class="pair-name">${pair}</span>
                                    <span class="pair-description">${this.getCurrencyPairDescription(pair)}</span>
                                </div>
                            </td>
                            <td>
                                <div class="rate-display">
                                    <span class="rate-value">${data.rate}</span>
                                </div>
                            </td>
                            <td>
                                <span class="rate-source">${data.source}</span>
                            </td>
                            <td>
                                <div class="update-time">
                                    <div>${data.date}</div>
                                    <div style="font-size:0.8em;color:#9ca3af;">${new Date(data.time).toLocaleTimeString('zh-CN', { hour12: false })}</div>
                                </div>
                            </td>
                            <td>
                                <div class="trend-info ${trendClass}">
                                    <span>${trendIcon}</span>
                                    <span>${trendText}</span>
                                </div>
                            </td>
                            <td>
                                <span class="status-badge ${statusClass}">${statusIcon}</span>
                            </td>
                            <td>
                                <button class="table-action-btn" onclick="viewManager.refreshSingleRate('${pair}')">刷新</button>
                                <button class="table-action-btn" onclick="viewManager.showRateChart('${pair}')" style="background:#6366f1;">图表</button>
                            </td>
                        </tr>
                    `);
                }
                
                if (rows.length > 0) {
                    tableBody.innerHTML = rows.join('');
                } else {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="7" style="text-align:center; padding:40px; color:#9ca3af;">
                                <div>
                                    <div style="font-size: 2em; margin-bottom: 10px;">📊</div>
                                    <div>暂无汇率数据</div>
                                    <div style="font-size: 0.9em; margin-top: 5px;">请检查网络连接或稍后重试</div>
                                </div>
                            </td>
                        </tr>
                    `;
                }
                
            } catch (err) {
                console.error('加载汇率表格失败:', err);
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center; padding:40px; color:#ef4444;">
                            <div>
                                <div style="font-size: 2em; margin-bottom: 10px;">❌</div>
                                <div>汇率数据加载失败</div>
                                <div style="font-size: 0.9em; margin-top: 5px;">${err.message}</div>
                                <button class="btn btn-primary" onclick="viewManager.loadDataTable()" style="margin-top: 10px;">重试</button>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
    }

    getCurrencyPairDescription(pair) {
        const descriptions = {
            'CNY/KZT': '人民币兑哈萨克坚戈',
            'CNY/UZS': '人民币兑乌兹别克苏姆',
            'USD/CNY': '美元兑人民币',
            'USD/KZT': '美元兑哈萨克坚戈',
            'EUR/CNY': '欧元兑人民币',
            'JPY/CNY': '日元兑人民币'
        };
        return descriptions[pair] || pair;
    }

    async refreshSingleRate(pair) {
        showToast(`正在刷新${pair}汇率...`, 'info');
        try {
            const rateData = await exchangeRateManager.fetchRateForPair(pair);
            if (rateData) {
                showToast(`${pair}汇率已更新: ${rateData.rate}`, 'success');
                this.loadDataTable(); // 重新加载表格
            }
        } catch (err) {
            showToast(`刷新${pair}汇率失败: ${err.message}`, 'error');
        }
    }

    showRateChart(pair) {
        showToast(`${pair}汇率图表功能开发中...`, 'info');
        // 这里可以添加汇率图表显示功能
    }

    calculateRateTrend(pair, currentRate) {
        // 获取缓存中的历史汇率数据
        const historyKey = `fx_history_${pair}`;
        let history = JSON.parse(localStorage.getItem(historyKey)) || [];
        
        // 添加当前汇率到历史记录
        const now = Date.now();
        history.push({ rate: parseFloat(currentRate), time: now });
        
        // 保留最近24小时的数据
        const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
        history = history.filter(h => h.time > twentyFourHoursAgo);
        
        // 保存更新后的历史
        localStorage.setItem(historyKey, JSON.stringify(history));
        
        // 计算趋势 (如果有足够的历史数据)
        if (history.length < 2) return 0;
        
        const oldestRate = history[0].rate;
        const latestRate = history[history.length - 1].rate;
        
        return ((latestRate - oldestRate) / oldestRate) * 100;
    }

    loadCustomEquipmentTable() {
        const tableHead = document.getElementById('tableHead');
        const tableBody = document.getElementById('tableBody');
        
        if (tableHead && tableBody) {
            // 自定义设备表头
            tableHead.innerHTML = `
                <tr>
                    <th>设备ID</th>
                    <th>设备名称</th>
                    <th>设备型号</th>
                    <th>品牌</th>
                    <th>日租金</th>
                    <th>月租金</th>
                    <th>可用区域</th>
                    <th>添加日期</th>
                    <th>操作</th>
                </tr>
            `;
            
            // 获取自定义设备数据
            const customEquipments = stateManager.getState().customEquipments;
            
            // 表体
            tableBody.innerHTML = customEquipments.length ? customEquipments.map(equipment => `
                <tr>
                    <td>${equipment.id}</td>
                    <td>
                        <div class="equipment-info">
                            <span class="equipment-type">${equipment.type}</span>
                            ${equipment.customName ? `<span class="custom-name">${equipment.customName}</span>` : ''}
                        </div>
                    </td>
                    <td>${equipment.model || '-'}</td>
                    <td>${equipment.brand || '-'}</td>
                    <td>¥${equipment.dailyRate || 0}</td>
                    <td>¥${equipment.monthlyRate || 0}</td>
                    <td>
                        <div class="region-tags">
                            ${equipment.regions?.map(region => `<span class="region-tag">${region}</span>`).join('') || '-'}
                        </div>
                    </td>
                    <td>${equipment.addDate}</td>
                    <td>
                        <button class="table-action-btn" onclick="editCustomEquipment('${equipment.id}')">编辑</button>
                        <button class="table-action-btn" onclick="deleteCustomEquipment('${equipment.id}')" style="background:#ef4444;">删除</button>
                    </td>
                </tr>
            `).join('') : `
                <tr>
                    <td colspan="9" style="text-align:center; padding:40px; color:#9ca3af;">
                        <div>
                            <div style="font-size: 2em; margin-bottom: 10px;">🔧</div>
                            <div>暂无自定义设备</div>
                            <div style="font-size: 0.9em; margin-top: 5px;">点击上方"添加设备"按钮开始添加</div>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    startRealTimeUpdates() {
        this.updateInterval = setInterval(() => {
            this.updateRealTimeData();
        }, CONFIG.updateInterval);
    }

    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    updateRealTimeData() {
        // 更新AI状态栏
        const now = new Date();
        const timeElement = document.getElementById('lastUpdateTime');
        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
        }

        // 更新实时指标
        const metrics = DataGenerator.generateRealTimeMetrics();
        
        const elements = {
            processingSpeed: document.getElementById('processingSpeed'),
            dataProcessed: document.getElementById('dataProcessed'),
            systemLoad: document.getElementById('systemLoad'),
            syncStatus: document.getElementById('syncStatus'),
            accuracy: document.getElementById('accuracy')
        };

        Object.entries(metrics).forEach(([key, value]) => {
            if (elements[key]) {
                elements[key].textContent = key === 'systemLoad' ? value + '%' : 
                                          key === 'accuracy' ? value + '%' :
                                          key === 'processingSpeed' ? value :
                                          value;
            }
        });

        // 如果当前在仪表盘视图，更新相关数据
        if (this.currentView === 'dashboard') {
            this.updateDashboardMetrics();
        }
    }

    updateDashboardMetrics() {
        // 更新AI预测数据
        const aiMetrics = DataGenerator.generateAIMetrics();
        const successElement = document.getElementById('successRate');
        const revenueElement = document.getElementById('revenuePredict');
        
        if (successElement && revenueElement) {
            successElement.textContent = aiMetrics.successRate;
            revenueElement.textContent = aiMetrics.revenuePredict;
        }

        // 重新生成建议
        if (Math.random() < 0.3) { // 30%概率更新建议
            this.updateSuggestions();
        }
    }
}

// 全局实例
const viewManager = new ViewManager();

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('智能数据驱动中心正在初始化...');
    
    // 加载本地存储的设备数据
    loadStoredEquipments();
    
    // 初始化视图管理器
    viewManager.switchView('dashboard');
    
    // 开始实时更新
    viewManager.startRealTimeUpdates();
    
    // 添加页面可见性监听
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            viewManager.stopRealTimeUpdates();
        } else {
            viewManager.startRealTimeUpdates();
        }
    });
    
    console.log('初始化完成！');
});

// 全局函数定义
window.switchView = function(viewName) {
    viewManager.switchView(viewName);
};

window.refreshDashboard = function() {
    if (viewManager.currentView === 'dashboard') {
        viewManager.loadDashboard();
    }
    showToast('仪表盘数据已刷新', 'success');
};

window.exportAnalytics = function() {
    showToast('正在导出分析报告...', 'info');
    // 这里可以实现具体的导出逻辑
};

window.toggleFabMenu = function() {
    const fabMenu = document.getElementById('fabMenu');
    if (fabMenu) {
        fabMenu.classList.toggle('active');
    }
};

window.triggerAIAnalysis = function() {
    showToast('正在启动AI智能分析...', 'info');
    // 关闭FAB菜单
    const fabMenu = document.getElementById('fabMenu');
    if (fabMenu) {
        fabMenu.classList.remove('active');
    }
};

window.refreshAllData = function() {
    showToast('正在刷新所有数据...', 'info');
    viewManager.loadViewData(viewManager.currentView);
    const fabMenu = document.getElementById('fabMenu');
    if (fabMenu) {
        fabMenu.classList.remove('active');
    }
};

window.openSettings = function() {
    window.location.href = 'settings.html';
};

window.handleSuggestion = function(priority) {
    showToast(`正在处理${priority}优先级建议...`, 'info');
};

window.viewProjectDetails = function(projectId) {
    showToast(`正在查看项目 ${projectId} 详情...`, 'info');
};

window.editProject = function(projectId) {
    showToast(`正在编辑项目 ${projectId}...`, 'info');
};

window.filterCards = function(filter) {
    const cards = document.querySelectorAll('.project-card');
    cards.forEach(card => {
        const status = card.querySelector('.card-status').textContent;
        if (filter === 'all' || 
            (filter === 'active' && status === '进行中') ||
            (filter === 'completed' && status === '已完成') ||
            (filter === 'pending' && status === '待开始')) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
};

window.addNewCard = function() {
    showToast('正在创建新项目...', 'info');
};

window.adjustTimeScale = function(scale) {
    document.querySelectorAll('.gantt-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    showToast(`已切换到${scale}视图`, 'success');
};

window.exportGantt = function() {
    showToast('正在导出甘特图...', 'info');
};

window.refreshTable = function() {
    // 检查当前表格类型
    const currentTable = document.querySelector('select[onchange="switchDataTable(this.value)"]')?.value || 'projects';
    
    if (currentTable === 'fxRates') {
        showToast('正在刷新汇率数据...', 'info');
        // 清除汇率缓存，强制重新获取
        if (window.exchangeRateManager) {
            exchangeRateManager.clearCache();
        }
    } else {
        showToast('正在刷新数据...', 'info');
    }
    
    viewManager.loadDataTable();
};

window.exportTable = function() {
    showToast('正在导出表格数据...', 'info');
};

window.switchDataTable = function(tableName) {
    // 显示/隐藏添加设备按钮
    const addEquipmentBtn = document.getElementById('addEquipmentBtn');
    if (addEquipmentBtn) {
        if (tableName === 'customEquipments') {
            addEquipmentBtn.style.display = 'inline-block';
        } else {
            addEquipmentBtn.style.display = 'none';
        }
    }
    
    // 重新加载表格数据
    viewManager.loadDataTable();
    showToast(`已切换到${getTableDisplayName(tableName)}`, 'success');
};

// 设备管理相关函数
window.openAddEquipmentModal = function() {
    const modal = document.getElementById('addEquipmentModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

window.closeAddEquipmentModal = function() {
    const modal = document.getElementById('addEquipmentModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        resetEquipmentForm();
    }
};

window.handleEquipmentTypeChange = function() {
    const equipmentType = document.getElementById('equipmentType');
    const customNameGroup = document.getElementById('customEquipmentName');
    
    if (equipmentType && customNameGroup) {
        if (equipmentType.value === '其他设备') {
            customNameGroup.style.display = 'block';
            document.getElementById('customName').setAttribute('required', 'required');
        } else {
            customNameGroup.style.display = 'none';
            document.getElementById('customName').removeAttribute('required');
            document.getElementById('customName').value = '';
        }
    }
};

window.saveCustomEquipment = function() {
    // 收集表单数据
    const formData = {
        id: 'EQ' + String(Date.now()).substr(-6), // 生成设备ID
        type: document.getElementById('equipmentType').value,
        customName: document.getElementById('customName').value,
        model: document.getElementById('equipmentModel').value,
        brand: document.getElementById('equipmentBrand').value,
        dailyRate: parseFloat(document.getElementById('dailyRate').value) || 0,
        monthlyRate: parseFloat(document.getElementById('monthlyRate').value) || 0,
        operatorCost: parseFloat(document.getElementById('operatorCost').value) || 0,
        fuelCost: parseFloat(document.getElementById('fuelCost').value) || 0,
        enginePower: parseFloat(document.getElementById('enginePower').value) || 0,
        operatingWeight: parseFloat(document.getElementById('operatingWeight').value) || 0,
        maxDiggingDepth: parseFloat(document.getElementById('maxDiggingDepth').value) || 0,
        bucketCapacity: parseFloat(document.getElementById('bucketCapacity').value) || 0,
        regions: Array.from(document.querySelectorAll('input[name="region"]:checked')).map(cb => cb.value),
        notes: document.getElementById('equipmentNotes').value,
        addDate: new Date().toLocaleDateString('zh-CN'),
        addTime: new Date().toLocaleTimeString('zh-CN', { hour12: false })
    };

    // 验证必填项
    if (formData.type === '其他设备' && !formData.customName.trim()) {
        showToast('请输入自定义设备名称！', 'error');
        return;
    }

    // 保存到状态管理
    const currentState = stateManager.getState();
    const updatedEquipments = [...currentState.customEquipments, formData];
    stateManager.setState({ customEquipments: updatedEquipments });

    // 保存到本地存储
    try {
        localStorage.setItem('customEquipments', JSON.stringify(updatedEquipments));
        showToast(`设备"${formData.type}${formData.customName ? ': ' + formData.customName : ''}"已成功添加！`, 'success');
        
        // 关闭弹窗
        closeAddEquipmentModal();
        
        // 如果当前显示的是自定义设备表格，则刷新
        const currentTable = document.querySelector('select[onchange="switchDataTable(this.value)"]').value;
        if (currentTable === 'customEquipments') {
            viewManager.loadDataTable();
        }
    } catch (error) {
        console.error('保存设备数据失败:', error);
        showToast('保存失败，请重试！', 'error');
    }
};

window.editCustomEquipment = function(equipmentId) {
    const currentState = stateManager.getState();
    const equipment = currentState.customEquipments.find(eq => eq.id === equipmentId);
    
    if (equipment) {
        // 填充表单数据
        populateEquipmentForm(equipment);
        // 修改保存按钮行为
        const saveBtn = document.querySelector('#addEquipmentModal .btn-primary');
        if (saveBtn) {
            saveBtn.textContent = '💾 更新设备';
            saveBtn.onclick = function() { updateCustomEquipment(equipmentId); };
        }
        // 修改标题
        const modalTitle = document.querySelector('#addEquipmentModal h3');
        if (modalTitle) {
            modalTitle.textContent = '✏️ 编辑设备信息';
        }
        // 打开弹窗
        openAddEquipmentModal();
    }
};

window.deleteCustomEquipment = function(equipmentId) {
    const currentState = stateManager.getState();
    const equipment = currentState.customEquipments.find(eq => eq.id === equipmentId);
    
    if (equipment && confirm(`确定要删除设备"${equipment.type}${equipment.customName ? ': ' + equipment.customName : ''}"吗？`)) {
        const updatedEquipments = currentState.customEquipments.filter(eq => eq.id !== equipmentId);
        stateManager.setState({ customEquipments: updatedEquipments });
        
        // 更新本地存储
        try {
            localStorage.setItem('customEquipments', JSON.stringify(updatedEquipments));
            showToast('设备已删除', 'success');
            viewManager.loadDataTable();
        } catch (error) {
            console.error('删除设备失败:', error);
            showToast('删除失败，请重试！', 'error');
        }
    }
};

// 辅助函数
function getTableDisplayName(tableName) {
    const tableNames = {
        'projects': '项目数据',
        'customers': '客户数据',
        'equipments': '设备库',
        'customEquipments': '自定义设备',
        'fxRates': '汇率数据'
    };
    return tableNames[tableName] || tableName;
}

function resetEquipmentForm() {
    const form = document.getElementById('equipmentForm');
    if (form) {
        form.reset();
        // 重置自定义名称显示
        document.getElementById('customEquipmentName').style.display = 'none';
        // 重置按钮文本
        const saveBtn = document.querySelector('#addEquipmentModal .btn-primary');
        if (saveBtn) {
            saveBtn.textContent = '💾 保存设备';
            saveBtn.onclick = saveCustomEquipment;
        }
        // 重置标题
        const modalTitle = document.querySelector('#addEquipmentModal h3');
        if (modalTitle) {
            modalTitle.textContent = '🔧 添加自定义设备';
        }
    }
}

function populateEquipmentForm(equipment) {
    // 填充基本信息
    document.getElementById('equipmentType').value = equipment.type;
    document.getElementById('customName').value = equipment.customName || '';
    document.getElementById('equipmentModel').value = equipment.model || '';
    document.getElementById('equipmentBrand').value = equipment.brand || '';
    
    // 填充租赁信息
    document.getElementById('dailyRate').value = equipment.dailyRate || '';
    document.getElementById('monthlyRate').value = equipment.monthlyRate || '';
    document.getElementById('operatorCost').value = equipment.operatorCost || '';
    document.getElementById('fuelCost').value = equipment.fuelCost || '';
    
    // 填充技术参数
    document.getElementById('enginePower').value = equipment.enginePower || '';
    document.getElementById('operatingWeight').value = equipment.operatingWeight || '';
    document.getElementById('maxDiggingDepth').value = equipment.maxDiggingDepth || '';
    document.getElementById('bucketCapacity').value = equipment.bucketCapacity || '';
    
    // 填充区域选择
    document.querySelectorAll('input[name="region"]').forEach(cb => {
        cb.checked = equipment.regions?.includes(cb.value) || false;
    });
    
    // 填充备注
    document.getElementById('equipmentNotes').value = equipment.notes || '';
    
    // 处理自定义名称显示
    handleEquipmentTypeChange();
}

function updateCustomEquipment(equipmentId) {
    // 获取更新后的数据
    const formData = {
        id: equipmentId, // 保持原ID
        type: document.getElementById('equipmentType').value,
        customName: document.getElementById('customName').value,
        model: document.getElementById('equipmentModel').value,
        brand: document.getElementById('equipmentBrand').value,
        dailyRate: parseFloat(document.getElementById('dailyRate').value) || 0,
        monthlyRate: parseFloat(document.getElementById('monthlyRate').value) || 0,
        operatorCost: parseFloat(document.getElementById('operatorCost').value) || 0,
        fuelCost: parseFloat(document.getElementById('fuelCost').value) || 0,
        enginePower: parseFloat(document.getElementById('enginePower').value) || 0,
        operatingWeight: parseFloat(document.getElementById('operatingWeight').value) || 0,
        maxDiggingDepth: parseFloat(document.getElementById('maxDiggingDepth').value) || 0,
        bucketCapacity: parseFloat(document.getElementById('bucketCapacity').value) || 0,
        regions: Array.from(document.querySelectorAll('input[name="region"]:checked')).map(cb => cb.value),
        notes: document.getElementById('equipmentNotes').value,
        updateDate: new Date().toLocaleDateString('zh-CN'),
        updateTime: new Date().toLocaleTimeString('zh-CN', { hour12: false })
    };

    // 验证
    if (formData.type === '其他设备' && !formData.customName.trim()) {
        showToast('请输入自定义设备名称！', 'error');
        return;
    }

    // 更新状态
    const currentState = stateManager.getState();
    const updatedEquipments = currentState.customEquipments.map(eq => 
        eq.id === equipmentId ? { ...eq, ...formData } : eq
    );
    stateManager.setState({ customEquipments: updatedEquipments });

    // 保存到本地存储
    try {
        localStorage.setItem('customEquipments', JSON.stringify(updatedEquipments));
        showToast('设备信息已更新！', 'success');
        closeAddEquipmentModal();
        viewManager.loadDataTable();
    } catch (error) {
        console.error('更新设备失败:', error);
        showToast('更新失败，请重试！', 'error');
    }
}

// 初始化时加载本地存储的设备数据
function loadStoredEquipments() {
    try {
        const stored = localStorage.getItem('customEquipments');
        if (stored) {
            const equipments = JSON.parse(stored);
            stateManager.setState({ customEquipments: equipments });
        }
    } catch (error) {
        console.error('加载设备数据失败:', error);
    }
}

// 修改原有的switchDataTable函数

// 工具函数
function showToast(message, type = 'info') {
    // 创建toast容器（如果不存在）
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }

    // 创建toast元素
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 
                   type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 
                   'rgba(255, 255, 255, 0.95)';
    const textColor = type === 'success' || type === 'error' ? 'white' : '#1f2937';
    const borderColor = type === 'success' ? '#10b981' : 
                       type === 'error' ? '#ef4444' : 
                       '#06b6d4';
    
    toast.style.cssText = `
        background: ${bgColor};
        color: ${textColor};
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        animation: slideInFromRight 0.3s ease;
        max-width: 300px;
        font-size: 0.9em;
        border-left: 4px solid ${borderColor};
    `;
    toast.textContent = message;

    // 添加到容器
    container.appendChild(toast);

    // 3秒后自动移除
    setTimeout(() => {
        toast.style.animation = 'slideOutToRight 0.3s ease';
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 页面卸载时的清理
window.addEventListener('beforeunload', function() {
    viewManager.stopRealTimeUpdates();
    console.log('智能数据驱动中心已清理资源');
});

// 添加CSS动画（如果不存在）
if (!document.querySelector('#dynamic-styles')) {
    const style = document.createElement('style');
    style.id = 'dynamic-styles';
    style.textContent = `
        @keyframes slideInFromRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutToRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 600;
        }
        .status-badge.active { background: #10b981; color: white; }
        .status-badge.completed { background: #6b7280; color: white; }
        .status-badge.pending { background: #f59e0b; color: white; }
        .table-progress {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .table-progress-bar {
            height: 4px;
            background: #10b981;
            border-radius: 2px;
            min-width: 50px;
        }
        .table-action-btn {
            padding: 4px 8px;
            margin: 0 2px;
            background: #4f46e5;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8em;
        }
        .table-action-btn:hover {
            background: #4338ca;
        }
        .timeline-month {
            flex: 1;
            text-align: center;
            padding: 10px;
            border-right: 1px solid rgba(255,255,255,0.1);
            color: #9ca3af;
        }
        .gantt-row {
            display: flex;
            align-items: center;
            height: 40px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            position: relative;
        }
        .gantt-label {
            width: 200px;
            padding: 0 15px;
            color: white;
            font-size: 0.9em;
            border-right: 1px solid rgba(255,255,255,0.1);
        }
        .gantt-bar {
            height: 20px;
            background: rgba(79, 70, 229, 0.6);
            border-radius: 10px;
            position: absolute;
            right: 0;
            display: flex;
            align-items: center;
            overflow: hidden;
        }
        .gantt-progress {
            height: 100%;
            background: #4f46e5;
            border-radius: 10px;
        }
    `;
    document.head.appendChild(style);
}

// 导出主要类供外部使用
window.StateManager = StateManager;
window.DataGenerator = DataGenerator;
window.ChartManager = ChartManager;
window.ViewManager = ViewManager;