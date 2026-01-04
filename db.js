/**
 * 中哈跨境机械设备租售系统 - IndexedDB 数据库层
 * 模拟后端数据库，支持项目管理、测算版本、汇率等
 */

const DB_NAME = 'CrossBorderLeaseDB';
const DB_VERSION = 1;

class Database {
    constructor() {
        this.db = null;
        this.ready = this.init();
    }

    /**
     * 初始化数据库
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // ========== 项目表 ==========
                if (!db.objectStoreNames.contains('projects')) {
                    const projectStore = db.createObjectStore('projects', { keyPath: 'projectId' });
                    projectStore.createIndex('status', 'status', { unique: false });
                    projectStore.createIndex('region', 'region', { unique: false });
                    projectStore.createIndex('owner', 'owner', { unique: false });
                    projectStore.createIndex('createdAt', 'createdAt', { unique: false });
                    projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }

                // ========== 测算版本表 ==========
                if (!db.objectStoreNames.contains('calcVersions')) {
                    const versionStore = db.createObjectStore('calcVersions', { keyPath: 'versionId' });
                    versionStore.createIndex('projectId', 'projectId', { unique: false });
                    versionStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // ========== 测算结果表 ==========
                if (!db.objectStoreNames.contains('calcResults')) {
                    const resultStore = db.createObjectStore('calcResults', { keyPath: 'versionId' });
                    resultStore.createIndex('projectId', 'projectId', { unique: false });
                }

                // ========== 汇率表 ==========
                if (!db.objectStoreNames.contains('fxRates')) {
                    const fxStore = db.createObjectStore('fxRates', { keyPath: 'rateId' });
                    fxStore.createIndex('rateDate', 'rateDate', { unique: false });
                    fxStore.createIndex('currencyPair', 'currencyPair', { unique: false });
                }

                // ========== 系统配置表 ==========
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * 确保数据库就绪
     */
    async ensureReady() {
        if (!this.db) {
            await this.ready;
        }
        return this.db;
    }

    /**
     * 清除所有数据
     */
    async clearAllData() {
        await this.ensureReady();
        
        const stores = ['projects', 'calcVersions', 'calcResults', 'fxRates', 'settings'];
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(stores, 'readwrite');
            
            stores.forEach(storeName => {
                transaction.objectStore(storeName).clear();
            });
            
            transaction.oncomplete = () => {
                console.log('✅ 所有数据已清除');
                resolve(true);
            };
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * 重置数据库（清除并重新生成示例数据）
     */
    async resetDatabase() {
        await this.clearAllData();
        await this.initSampleData();
        return true;
    }

    // ==================== 项目 CRUD ====================

    /**
     * 创建项目
     */
    async createProject(project) {
        await this.ensureReady();
        const now = new Date().toISOString();
        const projectId = 'P' + Date.now().toString(36).toUpperCase();
        
        const newProject = {
            projectId,
            name: project.name || '新建项目',
            region: project.region || '哈萨克斯坦',
            country: project.country || '哈萨克斯坦',
            city: project.city || '阿拉木图',
            projectType: project.projectType || '设备租赁',
            status: project.status || 'draft',
            priority: project.priority || 'normal',
            owner: project.owner || '当前用户',
            customer: project.customer || '',
            startDate: project.startDate || '',
            endDate: project.endDate || '',
            notes: project.notes || '',
            tags: project.tags || [],
            
            // 设备配置
            equipment: project.equipment || {
                type: '推土机',
                model: 'SD32',
                quantity: 1,
                purchasePrice: 800000,
                economicLife: 10,
                residualValueRate: 0.05
            },
            
            // 收入配置
            revenue: project.revenue || {
                monthlyRent: 50000,
                installationFee: 5000,
                maintenanceServiceFee: 10000,
                leaseTerm: 12,
                rentCurrency: 'CNY'
            },
            
            // 跨境成本
            crossborderCost: project.crossborderCost || {
                domesticFreight: 15000,
                internationalFreight: 25000,
                portCharges: 8000,
                insuranceRate: 0.008,
                customsAgentFee: 3000
            },
            
            // 税费规则
            taxRules: project.taxRules || {
                taxBasis: 'CIF',
                tariffRate: 0.05,
                vatRate: 0.12,
                vatDeductible: false
            },
            
            // 资金配置
            financing: project.financing || {
                mode: 'full',
                purchaseAdvanceRate: 0.30,
                freightTaxAdvanceRate: 1.0,
                capitalCostRate: 0.08,
                advancePeriod: 6
            },
            
            // 汇率配置
            fxConfig: project.fxConfig || {
                strategy: 'single',
                baseRate: 65,
                volatility: 0.05
            },
            
            // 最新测算结果摘要（用于列表页展示）
            latestResult: null,
            latestVersionId: null,
            
            createdAt: now,
            updatedAt: now
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readwrite');
            const store = transaction.objectStore('projects');
            const request = store.add(newProject);
            request.onsuccess = () => resolve(newProject);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取项目列表
     */
    async getProjects(filters = {}) {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            const request = store.getAll();
            
            request.onsuccess = () => {
                let projects = request.result || [];
                
                // 应用筛选
                if (filters.status && filters.status !== 'all') {
                    projects = projects.filter(p => p.status === filters.status);
                }
                if (filters.region && filters.region !== 'all') {
                    projects = projects.filter(p => p.region === filters.region);
                }
                if (filters.owner && filters.owner !== 'all') {
                    projects = projects.filter(p => p.owner === filters.owner);
                }
                if (filters.search) {
                    const keyword = filters.search.toLowerCase();
                    projects = projects.filter(p => 
                        p.projectId.toLowerCase().includes(keyword) ||
                        p.name.toLowerCase().includes(keyword) ||
                        p.customer.toLowerCase().includes(keyword) ||
                        p.city.toLowerCase().includes(keyword)
                    );
                }
                if (filters.passGm1 === true) {
                    projects = projects.filter(p => p.latestResult?.gm1 >= 0.30);
                }
                if (filters.passGm1 === false) {
                    projects = projects.filter(p => !p.latestResult || p.latestResult.gm1 < 0.30);
                }
                
                // 排序
                const sortField = filters.sortField || 'updatedAt';
                const sortOrder = filters.sortOrder || 'desc';
                projects.sort((a, b) => {
                    let valA = a[sortField];
                    let valB = b[sortField];
                    
                    // 处理嵌套字段
                    if (sortField.includes('.')) {
                        const parts = sortField.split('.');
                        valA = a[parts[0]]?.[parts[1]];
                        valB = b[parts[0]]?.[parts[1]];
                    }
                    
                    if (valA === valB) return 0;
                    if (valA === null || valA === undefined) return 1;
                    if (valB === null || valB === undefined) return -1;
                    
                    const comparison = valA < valB ? -1 : 1;
                    return sortOrder === 'desc' ? -comparison : comparison;
                });
                
                resolve(projects);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取单个项目
     */
    async getProject(projectId) {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            const request = store.get(projectId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 更新项目
     */
    async updateProject(projectId, updates) {
        await this.ensureReady();
        
        const project = await this.getProject(projectId);
        if (!project) throw new Error('项目不存在');
        
        const updatedProject = {
            ...project,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readwrite');
            const store = transaction.objectStore('projects');
            const request = store.put(updatedProject);
            request.onsuccess = () => resolve(updatedProject);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 删除项目
     */
    async deleteProject(projectId) {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects', 'calcVersions', 'calcResults'], 'readwrite');
            
            // 删除项目
            transaction.objectStore('projects').delete(projectId);
            
            // 删除相关测算版本和结果
            const versionStore = transaction.objectStore('calcVersions');
            const versionIndex = versionStore.index('projectId');
            const versionRequest = versionIndex.getAllKeys(projectId);
            
            versionRequest.onsuccess = () => {
                const versionIds = versionRequest.result;
                versionIds.forEach(versionId => {
                    versionStore.delete(versionId);
                    transaction.objectStore('calcResults').delete(versionId);
                });
            };
            
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * 复制项目
     */
    async duplicateProject(projectId) {
        const original = await this.getProject(projectId);
        if (!original) throw new Error('项目不存在');
        
        const copy = { ...original };
        delete copy.projectId;
        copy.name = original.name + ' (副本)';
        copy.status = 'draft';
        copy.latestResult = null;
        copy.latestVersionId = null;
        
        return this.createProject(copy);
    }

    // ==================== 测算版本 CRUD ====================

    /**
     * 创建测算版本
     */
    async createCalcVersion(projectId, versionData) {
        await this.ensureReady();
        const now = new Date().toISOString();
        const versionId = 'V' + Date.now().toString(36).toUpperCase();
        
        const project = await this.getProject(projectId);
        if (!project) throw new Error('项目不存在');
        
        const version = {
            versionId,
            projectId,
            versionName: versionData.versionName || '基准测算',
            scenarioType: versionData.scenarioType || 'baseline',
            fxStrategy: versionData.fxStrategy || 'single',
            inputsSnapshot: versionData.inputsSnapshot || {
                equipment: project.equipment,
                revenue: project.revenue,
                crossborderCost: project.crossborderCost,
                taxRules: project.taxRules,
                financing: project.financing,
                fxConfig: project.fxConfig
            },
            createdBy: versionData.createdBy || '当前用户',
            createdAt: now
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['calcVersions'], 'readwrite');
            const store = transaction.objectStore('calcVersions');
            const request = store.add(version);
            request.onsuccess = () => resolve(version);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取项目的测算版本列表
     */
    async getCalcVersions(projectId) {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['calcVersions'], 'readonly');
            const store = transaction.objectStore('calcVersions');
            const index = store.index('projectId');
            const request = index.getAll(projectId);
            
            request.onsuccess = () => {
                const versions = request.result || [];
                versions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                resolve(versions);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取项目版本（别名）
     */
    async getProjectVersions(projectId) {
        return this.getCalcVersions(projectId);
    }

    /**
     * 保存测算结果
     * 支持两种格式：
     * 1. 嵌套格式 { grossMargins: {gm1, gm2, gm3}, paybackPeriods: {pb1, pb2}, ... }
     * 2. 扁平格式 { gm1, gm2, gm3, pb1Months, pb2Months, ... }
     */
    async saveCalcResult(versionId, projectId, results) {
        await this.ensureReady();
        const now = new Date().toISOString();
        
        // 兼容扁平格式和嵌套格式
        const gm1 = results.gm1 ?? results.grossMargins?.gm1 ?? 0;
        const gm2 = results.gm2 ?? results.grossMargins?.gm2 ?? 0;
        const gm3 = results.gm3 ?? results.grossMargins?.gm3 ?? 0;
        const pb1 = results.pb1Months ?? results.paybackPeriods?.pb1 ?? -1;
        const pb2 = results.pb2Months ?? results.paybackPeriods?.pb2 ?? -1;
        
        const resultRecord = {
            versionId,
            projectId,
            gm1,
            gm2,
            gm3,
            pb1Months: pb1,
            pb2Months: pb2,
            annualProfit: results.annualProfit ?? results.profit?.annualAccounting ?? 0,
            netCashflow: results.netCashflow ?? results.profit?.cashflow ?? 0,
            logisticsRatio: results.logisticsRatio ?? results.transport?.ratio ?? 0,
            taxRatio: results.taxRatio ?? results.tax?.ratio ?? 0,
            fxGainLoss: results.fxGainLoss ?? results.exchange?.gainLoss ?? 0,
            passGm1: gm1 >= 0.30,
            passPb1: pb1 <= 24 && pb1 > 0,
            passGm2: gm2 >= 0.30,
            passPb2: pb2 <= 24 && pb2 > 0,
            inputsSnapshot: results.inputsSnapshot || null,
            resultBreakdown: results.resultBreakdown || results,
            calculatedAt: now
        };
        
        // 保存结果
        await new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['calcResults'], 'readwrite');
            const store = transaction.objectStore('calcResults');
            const request = store.put(resultRecord);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
        // 更新项目的最新结果摘要
        await this.updateProject(projectId, {
            latestResult: {
                gm1: resultRecord.gm1,
                gm2: resultRecord.gm2,
                gm3: resultRecord.gm3,
                pb1Months: resultRecord.pb1Months,
                pb2Months: resultRecord.pb2Months,
                annualProfit: resultRecord.annualProfit,
                netCashflow: resultRecord.netCashflow,
                logisticsRatio: resultRecord.logisticsRatio,
                taxRatio: resultRecord.taxRatio,
                passGm1: resultRecord.passGm1,
                passPb1: resultRecord.passPb1,
                passGm2: resultRecord.passGm2,
                passPb2: resultRecord.passPb2,
                inputsSnapshot: resultRecord.inputsSnapshot,
                calculatedAt: now
            },
            latestVersionId: versionId
        });
        
        return resultRecord;
    }

    /**
     * 获取测算结果
     */
    async getCalcResult(versionId) {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['calcResults'], 'readonly');
            const store = transaction.objectStore('calcResults');
            const request = store.get(versionId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // ==================== 汇率 CRUD ====================

    /**
     * 添加/更新汇率
     */
    async setFxRate(rateData) {
        await this.ensureReady();
        
        const rate = {
            rateId: rateData.rateId || `FX_${rateData.baseCurrency}_${rateData.quoteCurrency}_${rateData.rateDate}`,
            baseCurrency: rateData.baseCurrency || 'CNY',
            quoteCurrency: rateData.quoteCurrency || 'KZT',
            currencyPair: `${rateData.baseCurrency || 'CNY'}/${rateData.quoteCurrency || 'KZT'}`,
            rateDate: rateData.rateDate,
            rateValue: rateData.rateValue,
            source: rateData.source || 'manual',
            isLocked: rateData.isLocked || false,
            updatedAt: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fxRates'], 'readwrite');
            const store = transaction.objectStore('fxRates');
            const request = store.put(rate);
            request.onsuccess = () => resolve(rate);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取汇率列表
     */
    async getFxRates(currencyPair = 'CNY/KZT') {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fxRates'], 'readonly');
            const store = transaction.objectStore('fxRates');
            const index = store.index('currencyPair');
            const request = index.getAll(currencyPair);
            
            request.onsuccess = () => {
                const rates = request.result || [];
                rates.sort((a, b) => new Date(b.rateDate) - new Date(a.rateDate));
                resolve(rates);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取指定日期的汇率
     */
    async getFxRateByDate(currencyPair, date) {
        const rates = await this.getFxRates(currencyPair);
        
        // 找到最接近但不超过指定日期的汇率
        const targetDate = new Date(date);
        for (const rate of rates) {
            if (new Date(rate.rateDate) <= targetDate) {
                return rate;
            }
        }
        
        // 如果没有历史汇率，返回最早的一条
        return rates[rates.length - 1] || null;
    }

    /**
     * 获取所有被跟踪的货币对（从 fxRates 表中去重获取）
     */
    async getTrackedPairs() {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fxRates'], 'readonly');
            const store = transaction.objectStore('fxRates');
            const request = store.getAll();
            request.onsuccess = () => {
                const all = request.result || [];
                const set = new Set(all.map(r => r.currencyPair));
                resolve(Array.from(set));
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取某货币对的最新一条记录
     */
    async getLatestFxRate(currencyPair) {
        const rates = await this.getFxRates(currencyPair);
        return rates.length > 0 ? rates[0] : null;
    }

    /**
     * 切换最新记录的锁定状态（isLocked）
     */
    async toggleLockRate(currencyPair) {
        await this.ensureReady();
        const latest = await this.getLatestFxRate(currencyPair);
        if (!latest) return null;
        latest.isLocked = !latest.isLocked;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fxRates'], 'readwrite');
            const store = transaction.objectStore('fxRates');
            const req = store.put(latest);
            req.onsuccess = () => resolve(latest);
            req.onerror = () => reject(req.error);
        });
    }

    // ==================== 统计 ====================

    /**
     * 获取统计摘要
     */
    async getStats() {
        const projects = await this.getProjects();
        
        const stats = {
            total: projects.length,
            byStatus: {},
            byRegion: {},
            passGm1: 0,
            failGm1: 0,
            passPb1: 0,
            failPb1: 0,
            avgGm1: 0,
            avgPb1: 0
        };
        
        let gm1Sum = 0, gm1Count = 0;
        let pb1Sum = 0, pb1Count = 0;
        
        projects.forEach(p => {
            // 按状态统计
            stats.byStatus[p.status] = (stats.byStatus[p.status] || 0) + 1;
            
            // 按地区统计
            stats.byRegion[p.region] = (stats.byRegion[p.region] || 0) + 1;
            
            // KPI 统计
            if (p.latestResult) {
                if (p.latestResult.passGm1) stats.passGm1++;
                else stats.failGm1++;
                
                if (p.latestResult.passPb1) stats.passPb1++;
                else stats.failPb1++;
                
                if (p.latestResult.gm1 != null) {
                    gm1Sum += p.latestResult.gm1;
                    gm1Count++;
                }
                
                if (p.latestResult.pb1Months > 0) {
                    pb1Sum += p.latestResult.pb1Months;
                    pb1Count++;
                }
            }
        });
        
        stats.avgGm1 = gm1Count > 0 ? gm1Sum / gm1Count : 0;
        stats.avgPb1 = pb1Count > 0 ? pb1Sum / pb1Count : 0;
        
        return stats;
    }

    // ==================== 初始化示例数据 ====================

    /**
     * 初始化示例数据
     */
    async initSampleData() {
        const projects = await this.getProjects();
        if (projects.length > 0) return; // 已有数据，不重复初始化
        
        const sampleProjects = [
            {
                name: '阿拉木图基建设备租赁',
                region: '哈萨克斯坦',
                city: '阿拉木图',
                projectType: '租赁',
                status: 'active',
                priority: 'high',
                customer: '哈萨克建筑集团',
                equipment: { type: '推土机', model: 'SD32', quantity: 3, purchasePrice: 850000, economicLife: 10, residualValueRate: 0.05 },
                revenue: { monthlyRent: 55000, installationFee: 8000, maintenanceServiceFee: 12000, leaseTerm: 24, rentCurrency: 'CNY' },
                crossborderCost: { domesticFreight: 18000, internationalFreight: 28000, portCharges: 9000, insuranceRate: 0.008, customsAgentFee: 3500 },
                taxRules: { taxBasis: 'CIF', tariffRate: 0.05, vatRate: 0.12, vatDeductible: false },
                financing: { mode: 'full', purchaseAdvanceRate: 0.30, freightTaxAdvanceRate: 1.0, capitalCostRate: 0.06, advancePeriod: 3 }
            },
            {
                name: '阿斯塔纳矿业挖机项目',
                region: '哈萨克斯坦',
                city: '阿斯塔纳',
                projectType: '租售结合',
                status: 'bidding',
                priority: 'high',
                customer: 'KazMining Ltd',
                equipment: { type: '挖掘机', model: 'CAT336', quantity: 2, purchasePrice: 1200000, economicLife: 8, residualValueRate: 0.08 },
                revenue: { monthlyRent: 85000, installationFee: 12000, maintenanceServiceFee: 18000, leaseTerm: 18, rentCurrency: 'CNY' },
                crossborderCost: { domesticFreight: 22000, internationalFreight: 35000, portCharges: 12000, insuranceRate: 0.01, customsAgentFee: 5000 },
                taxRules: { taxBasis: 'CIF', tariffRate: 0.05, vatRate: 0.12, vatDeductible: true },
                financing: { mode: 'financing', downPaymentRate: 0.30, financingRate: 0.08, financingTerm: 24 }
            },
            {
                name: '塔什干工业园装载机',
                region: '乌兹别克斯坦',
                city: '塔什干',
                projectType: '租赁',
                status: 'negotiating',
                priority: 'normal',
                customer: '乌兹工业发展局',
                equipment: { type: '装载机', model: 'ZL50CN', quantity: 5, purchasePrice: 480000, economicLife: 10, residualValueRate: 0.05 },
                revenue: { monthlyRent: 38000, installationFee: 4000, maintenanceServiceFee: 9000, leaseTerm: 12, rentCurrency: 'CNY' },
                crossborderCost: { domesticFreight: 12000, internationalFreight: 20000, portCharges: 6000, insuranceRate: 0.008, customsAgentFee: 2500 },
                taxRules: { taxBasis: 'CIF', tariffRate: 0.08, vatRate: 0.15, vatDeductible: false },
                financing: { mode: 'full', purchaseAdvanceRate: 0.50, freightTaxAdvanceRate: 1.0, capitalCostRate: 0.07, advancePeriod: 4 }
            },
            {
                name: '比什凯克道路压路机',
                region: '吉尔吉斯斯坦',
                city: '比什凯克',
                projectType: '租赁',
                status: 'completed',
                priority: 'low',
                customer: '吉尔吉斯交通部',
                equipment: { type: '压路机', model: 'XS263J', quantity: 2, purchasePrice: 420000, economicLife: 12, residualValueRate: 0.03 },
                revenue: { monthlyRent: 32000, installationFee: 3000, maintenanceServiceFee: 6000, leaseTerm: 8, rentCurrency: 'CNY' },
                crossborderCost: { domesticFreight: 10000, internationalFreight: 18000, portCharges: 5000, insuranceRate: 0.006, customsAgentFee: 2000 },
                taxRules: { taxBasis: 'FOB', tariffRate: 0.03, vatRate: 0.12, vatDeductible: false },
                financing: { mode: 'full', purchaseAdvanceRate: 0.20, freightTaxAdvanceRate: 1.0, capitalCostRate: 0.05, advancePeriod: 2 }
            },
            {
                name: '杜尚别水电站起重机',
                region: '塔吉克斯坦',
                city: '杜尚别',
                projectType: '出售',
                status: 'draft',
                priority: 'normal',
                customer: '',
                equipment: { type: '起重机', model: 'QY50K', quantity: 1, purchasePrice: 1650000, economicLife: 15, residualValueRate: 0.10 },
                revenue: { monthlyRent: 105000, installationFee: 20000, maintenanceServiceFee: 25000, leaseTerm: 36, rentCurrency: 'CNY' },
                crossborderCost: { domesticFreight: 25000, internationalFreight: 45000, portCharges: 15000, insuranceRate: 0.012, customsAgentFee: 6000 },
                taxRules: { taxBasis: 'CIF', tariffRate: 0.10, vatRate: 0.18, vatDeductible: true },
                financing: { mode: 'financing', downPaymentRate: 0.40, financingRate: 0.09, financingTerm: 36 }
            },
            {
                name: '努尔苏丹商业综合体',
                region: '哈萨克斯坦',
                city: '努尔苏丹',
                projectType: '租赁',
                status: 'active',
                priority: 'high',
                customer: 'Kazakh Development Corp',
                equipment: { type: '塔吊', model: 'TC7030', quantity: 2, purchasePrice: 980000, economicLife: 12, residualValueRate: 0.06 },
                revenue: { monthlyRent: 72000, installationFee: 15000, maintenanceServiceFee: 14000, leaseTerm: 20, rentCurrency: 'CNY' },
                crossborderCost: { domesticFreight: 20000, internationalFreight: 32000, portCharges: 10000, insuranceRate: 0.009, customsAgentFee: 4000 },
                taxRules: { taxBasis: 'CIF', tariffRate: 0.05, vatRate: 0.12, vatDeductible: false },
                financing: { mode: 'full', purchaseAdvanceRate: 0.35, freightTaxAdvanceRate: 1.0, capitalCostRate: 0.065, advancePeriod: 4 }
            },
            {
                name: '撒马尔罕古城修复',
                region: '乌兹别克斯坦',
                city: '撒马尔罕',
                projectType: '租赁',
                status: 'negotiating',
                priority: 'normal',
                customer: '乌兹文化遗产局',
                equipment: { type: '小型挖机', model: 'PC60', quantity: 4, purchasePrice: 280000, economicLife: 8, residualValueRate: 0.04 },
                revenue: { monthlyRent: 22000, installationFee: 2000, maintenanceServiceFee: 5000, leaseTerm: 10, rentCurrency: 'CNY' },
                crossborderCost: { domesticFreight: 8000, internationalFreight: 15000, portCharges: 4000, insuranceRate: 0.007, customsAgentFee: 1800 },
                taxRules: { taxBasis: 'CIF', tariffRate: 0.06, vatRate: 0.15, vatDeductible: false },
                financing: { mode: 'full', purchaseAdvanceRate: 0.25, freightTaxAdvanceRate: 1.0, capitalCostRate: 0.055, advancePeriod: 3 }
            },
            {
                name: '奇姆肯特化工厂叉车',
                region: '哈萨克斯坦',
                city: '奇姆肯特',
                projectType: '租售结合',
                status: 'archived',
                priority: 'low',
                customer: 'Shymkent Chemicals',
                equipment: { type: '叉车', model: 'CPCD50', quantity: 8, purchasePrice: 180000, economicLife: 6, residualValueRate: 0.02 },
                revenue: { monthlyRent: 12000, installationFee: 1000, maintenanceServiceFee: 3000, leaseTerm: 6, rentCurrency: 'CNY' },
                crossborderCost: { domesticFreight: 5000, internationalFreight: 10000, portCharges: 3000, insuranceRate: 0.005, customsAgentFee: 1200 },
                taxRules: { taxBasis: 'FOB', tariffRate: 0.03, vatRate: 0.12, vatDeductible: true },
                financing: { mode: 'full', purchaseAdvanceRate: 0.15, freightTaxAdvanceRate: 1.0, capitalCostRate: 0.045, advancePeriod: 2 }
            }
        ];
        
        for (const p of sampleProjects) {
            const project = await this.createProject(p);
            
            // 为非草稿项目创建测算结果
            if (p.status !== 'draft') {
                const version = await this.createCalcVersion(project.projectId, {
                    versionName: '初始测算',
                    scenarioType: 'baseline',
                    inputsSnapshot: this.buildInputsSnapshot(p)
                });
                
                // 模拟测算结果
                const mockResult = this.generateMockResult(project);
                mockResult.inputsSnapshot = this.buildInputsSnapshot(p);
                await this.saveCalcResult(version.versionId, project.projectId, mockResult);
            }
        }
        
        // 初始化示例汇率
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            await this.setFxRate({
                baseCurrency: 'CNY',
                quoteCurrency: 'KZT',
                rateDate: dateStr,
                rateValue: 65 + (Math.random() - 0.5) * 4, // 63 ~ 67
                source: 'sample'
            });
        }
        
        console.log('✅ 示例数据初始化完成（8个项目）');
    }

    /**
     * 构建输入快照
     */
    buildInputsSnapshot(projectData) {
        const eq = projectData.equipment || {};
        const rev = projectData.revenue || {};
        const cross = projectData.crossborderCost || {};
        const tax = projectData.taxRules || {};
        const fin = projectData.financing || {};
        
        return {
            equipmentModel: `${eq.type || ''} ${eq.model || ''}`.trim(),
            quantity: eq.quantity || 1,
            leaseTerm: rev.leaseTerm || 12,
            projectLocation: projectData.city || 'almaty',
            monthlyRent: rev.monthlyRent || 50000,
            installationFee: rev.installationFee || 5000,
            maintenanceServiceFee: rev.maintenanceServiceFee || 10000,
            purchasePrice: eq.purchasePrice || 800000,
            economicLife: eq.economicLife || 10,
            residualValueRate: (eq.residualValueRate || 0.05) * 100,
            domesticFreight: cross.domesticFreight || 15000,
            internationalFreight: cross.internationalFreight || 25000,
            portCharges: cross.portCharges || 8000,
            insuranceRate: (cross.insuranceRate || 0.008) * 100,
            customsAgentFee: cross.customsAgentFee || 3000,
            taxBasis: tax.taxBasis || 'CIF',
            tariffRate: (tax.tariffRate || 0.05) * 100,
            vatRate: (tax.vatRate || 0.12) * 100,
            vatDeductible: tax.vatDeductible || false,
            purchaseAdvanceRate: (fin.purchaseAdvanceRate || 0.30) * 100,
            freightTaxAdvanceRate: (fin.freightTaxAdvanceRate || 1.0) * 100,
            advancePeriod: fin.advancePeriod || 3,
            capitalCostRate: (fin.capitalCostRate || 0.06) * 100,
            exchangeRate: 65,
            exchangeVolatility: 5,
            businessMode: fin.mode === 'financing' ? 'lease' : 'lease',
            paymentMode: fin.mode || 'full',
            scenario: 'baseline'
        };
    }

    /**
     * 生成模拟测算结果
     */
    generateMockResult(project) {
        const eq = project.equipment;
        const rev = project.revenue;
        
        const totalRevenue = rev.monthlyRent * rev.leaseTerm * eq.quantity + 
                            rev.installationFee * eq.quantity + 
                            rev.maintenanceServiceFee * (rev.leaseTerm / 12) * eq.quantity;
        
        const totalCost = eq.purchasePrice * eq.quantity * 0.7; // 简化计算
        
        const gm1 = (totalRevenue - totalCost * 0.3) / totalRevenue;
        const gm2 = (totalRevenue - totalCost * 0.5) / totalRevenue;
        const gm3 = (totalRevenue - totalCost * 0.6) / totalRevenue;
        
        const pb1 = Math.ceil((eq.purchasePrice * eq.quantity) / (rev.monthlyRent * eq.quantity));
        const pb2 = pb1 + 2;
        
        return {
            grossMargins: { gm1, gm2, gm3 },
            paybackPeriods: { pb1, pb2 },
            profit: {
                annualAccounting: (totalRevenue - totalCost) / (rev.leaseTerm / 12),
                cashflow: totalRevenue - totalCost
            },
            transport: { ratio: 0.12 + Math.random() * 0.08 },
            tax: { ratio: 0.15 + Math.random() * 0.05 },
            exchange: { gainLoss: (Math.random() - 0.5) * 50000 }
        };
    }

    // ==================== 系统设置 ====================

    /**
     * 获取系统设置
     */
    async getSettings() {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get('systemSettings');
            
            request.onsuccess = () => {
                resolve(request.result?.value || null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 保存系统设置
     */
    async saveSettings(settings) {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({
                key: 'systemSettings',
                value: settings,
                updatedAt: new Date().toISOString()
            });
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
}

// 导出单例
window.db = new Database();
