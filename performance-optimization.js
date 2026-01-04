/**
 * 性能优化管理器
 * 包含数据缓存、Web Workers、资源压缩等优化功能
 */

class PerformanceManager {
    constructor() {
        this.cache = new Map();
        this.workers = new Map();
        this.compressionEnabled = true;
        this.cacheExpiry = 5 * 60 * 1000; // 5分钟缓存过期
        
        this.initializeCaching();
        this.initializeWorkerPool();
    }

    // ==================== 数据缓存策略 ====================
    
    initializeCaching() {
        // 设置缓存清理定时器
        setInterval(() => {
            this.clearExpiredCache();
        }, 60000); // 每分钟清理一次过期缓存
        
        // 监听内存压力
        if ('memory' in performance) {
            this.monitorMemoryUsage();
        }
    }

    // 缓存数据
    setCache(key, value, customExpiry = null) {
        const expiry = customExpiry || Date.now() + this.cacheExpiry;
        this.cache.set(key, {
            value: this.compressData(value),
            expiry,
            accessCount: 0,
            lastAccess: Date.now()
        });
    }

    // 获取缓存数据
    getCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() > cached.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        cached.accessCount++;
        cached.lastAccess = Date.now();
        return this.decompressData(cached.value);
    }

    // 清理过期缓存
    clearExpiredCache() {
        const now = Date.now();
        for (const [key, data] of this.cache.entries()) {
            if (now > data.expiry) {
                this.cache.delete(key);
            }
        }
    }

    // 监控内存使用情况
    monitorMemoryUsage() {
        const checkMemory = () => {
            if (performance.memory) {
                const used = performance.memory.usedJSHeapSize;
                const total = performance.memory.totalJSHeapSize;
                const limit = performance.memory.jsHeapSizeLimit;
                
                // 如果内存使用超过80%，清理缓存
                if (used / limit > 0.8) {
                    this.clearLRUCache();
                }
            }
        };
        
        setInterval(checkMemory, 30000); // 每30秒检查一次
    }

    // 清理最少使用的缓存项
    clearLRUCache() {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => {
            // 按访问频率和最后访问时间排序
            const scoreA = a[1].accessCount / (Date.now() - a[1].lastAccess + 1);
            const scoreB = b[1].accessCount / (Date.now() - b[1].lastAccess + 1);
            return scoreA - scoreB;
        });
        
        // 删除前25%的缓存项
        const toDelete = Math.floor(entries.length * 0.25);
        for (let i = 0; i < toDelete; i++) {
            this.cache.delete(entries[i][0]);
        }
    }

    // ==================== Web Workers 池管理 ====================
    
    initializeWorkerPool() {
        // 根据CPU核心数创建Worker
        const maxWorkers = Math.min(navigator.hardwareConcurrency || 4, 8);
        
        for (let i = 0; i < maxWorkers; i++) {
            try {
                const worker = new Worker('./calculation-worker.js');
                this.workers.set(`worker_${i}`, {
                    worker,
                    busy: false,
                    taskCount: 0,
                    lastUsed: Date.now()
                });
            } catch (error) {
                console.warn(`Failed to create worker ${i}:`, error);
            }
        }
    }

    // 获取可用的Worker
    getAvailableWorker() {
        for (const [id, workerData] of this.workers.entries()) {
            if (!workerData.busy) {
                return { id, ...workerData };
            }
        }
        return null;
    }

    // 使用Worker执行任务
    async executeInWorker(taskType, data, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const availableWorker = this.getAvailableWorker();
            
            if (!availableWorker) {
                reject(new Error('No available workers'));
                return;
            }

            const { id, worker } = availableWorker;
            const taskId = `${id}_${Date.now()}_${Math.random()}`;
            
            // 设置超时
            const timeoutId = setTimeout(() => {
                reject(new Error('Worker task timeout'));
            }, timeout);

            // 监听Worker响应
            const handleMessage = (e) => {
                const { taskId: responseTaskId, success, result, error } = e.data;
                
                if (responseTaskId === taskId) {
                    clearTimeout(timeoutId);
                    worker.removeEventListener('message', handleMessage);
                    
                    // 释放Worker
                    this.workers.get(id).busy = false;
                    this.workers.get(id).lastUsed = Date.now();
                    this.workers.get(id).taskCount++;
                    
                    if (success) {
                        resolve(result);
                    } else {
                        reject(new Error(error));
                    }
                }
            };

            worker.addEventListener('message', handleMessage);
            
            // 标记Worker为忙碌
            this.workers.get(id).busy = true;
            
            // 发送任务到Worker
            worker.postMessage({
                taskType,
                data,
                taskId
            });
        });
    }

    // ==================== 资源压缩 ====================
    
    compressData(data) {
        if (!this.compressionEnabled) return data;
        
        try {
            // 简单的JSON压缩（在实际应用中可以使用更强的压缩算法）
            const jsonString = JSON.stringify(data);
            return this.simpleCompress(jsonString);
        } catch (error) {
            console.warn('Data compression failed:', error);
            return data;
        }
    }

    decompressData(compressedData) {
        if (!this.compressionEnabled) return compressedData;
        
        try {
            const jsonString = this.simpleDecompress(compressedData);
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('Data decompression failed:', error);
            return compressedData;
        }
    }

    // 简单压缩算法（LZ77的简化版本）
    simpleCompress(str) {
        if (typeof str !== 'string') return str;
        
        let compressed = '';
        let i = 0;
        
        while (i < str.length) {
            let match = this.findLongestMatch(str, i);
            
            if (match.length > 3) {
                compressed += `{${match.distance},${match.length}}`;
                i += match.length;
            } else {
                compressed += str[i];
                i++;
            }
        }
        
        return compressed;
    }

    simpleDecompress(compressed) {
        if (typeof compressed !== 'string') return compressed;
        
        let decompressed = '';
        let i = 0;
        
        while (i < compressed.length) {
            if (compressed[i] === '{') {
                let j = i + 1;
                while (j < compressed.length && compressed[j] !== '}') j++;
                
                const match = compressed.slice(i + 1, j);
                const [distance, length] = match.split(',').map(Number);
                
                const start = decompressed.length - distance;
                for (let k = 0; k < length; k++) {
                    decompressed += decompressed[start + k];
                }
                
                i = j + 1;
            } else {
                decompressed += compressed[i];
                i++;
            }
        }
        
        return decompressed;
    }

    findLongestMatch(str, position) {
        let maxLength = 0;
        let maxDistance = 0;
        
        for (let i = Math.max(0, position - 1000); i < position; i++) {
            let length = 0;
            
            while (
                position + length < str.length &&
                str[i + length] === str[position + length] &&
                length < 255
            ) {
                length++;
            }
            
            if (length > maxLength) {
                maxLength = length;
                maxDistance = position - i;
            }
        }
        
        return { length: maxLength, distance: maxDistance };
    }

    // ==================== 计算引擎优化 ====================
    
    async optimizedCalculation(params, useWorker = true) {
        // 生成缓存键
        const cacheKey = this.generateCacheKey(params);
        
        // 尝试从缓存获取
        const cached = this.getCache(cacheKey);
        if (cached) {
            return { ...cached, fromCache: true };
        }
        
        let result;
        
        if (useWorker && this.workers.size > 0) {
            // 使用Worker计算
            try {
                result = await this.executeInWorker('lease_calculation', params);
            } catch (error) {
                console.warn('Worker calculation failed, falling back to main thread:', error);
                result = this.calculateInMainThread(params);
            }
        } else {
            // 主线程计算
            result = this.calculateInMainThread(params);
        }
        
        // 缓存结果
        this.setCache(cacheKey, result);
        
        return { ...result, fromCache: false };
    }

    calculateInMainThread(params) {
        // 这里应该调用现有的计算逻辑
        if (window.appState && window.appState.calculator) {
            return window.appState.calculator.calculate(params);
        }
        throw new Error('Calculator not available');
    }

    generateCacheKey(params) {
        // 生成参数的哈希键
        const sortedParams = Object.keys(params)
            .sort()
            .reduce((result, key) => {
                result[key] = params[key];
                return result;
            }, {});
        
        return this.simpleHash(JSON.stringify(sortedParams));
    }

    simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash.toString();
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        
        return hash.toString();
    }

    // ==================== 批量处理优化 ====================
    
    async batchCalculation(paramsList, options = {}) {
        const {
            useWorker = true,
            chunkSize = 10,
            maxConcurrency = 4,
            progressCallback = null
        } = options;
        
        const chunks = this.chunkArray(paramsList, chunkSize);
        const results = [];
        let completed = 0;
        
        // 限制并发数量
        const semaphore = new Array(maxConcurrency).fill(null);
        
        const processChunk = async (chunk, chunkIndex) => {
            const chunkResults = [];
            
            for (const params of chunk) {
                try {
                    const result = await this.optimizedCalculation(params, useWorker);
                    chunkResults.push({ success: true, result, params });
                } catch (error) {
                    chunkResults.push({ success: false, error: error.message, params });
                }
                
                completed++;
                if (progressCallback) {
                    progressCallback(completed, paramsList.length);
                }
            }
            
            return chunkResults;
        };
        
        // 并发处理chunks
        const promises = chunks.map(async (chunk, index) => {
            // 等待可用的并发槽
            await this.waitForSlot(semaphore);
            
            try {
                return await processChunk(chunk, index);
            } finally {
                // 释放并发槽
                this.releaseSlot(semaphore);
            }
        });
        
        const chunkResults = await Promise.all(promises);
        return chunkResults.flat();
    }

    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    async waitForSlot(semaphore) {
        return new Promise(resolve => {
            const check = () => {
                for (let i = 0; i < semaphore.length; i++) {
                    if (!semaphore[i]) {
                        semaphore[i] = true;
                        resolve(i);
                        return;
                    }
                }
                setTimeout(check, 10);
            };
            check();
        });
    }

    releaseSlot(semaphore) {
        for (let i = 0; i < semaphore.length; i++) {
            if (semaphore[i]) {
                semaphore[i] = false;
                break;
            }
        }
    }

    // ==================== 性能监控 ====================
    
    getPerformanceStats() {
        const workerStats = Array.from(this.workers.entries()).map(([id, data]) => ({
            id,
            busy: data.busy,
            taskCount: data.taskCount,
            lastUsed: new Date(data.lastUsed).toLocaleString()
        }));
        
        return {
            cache: {
                size: this.cache.size,
                hitRate: this.getCacheHitRate(),
                memoryUsage: this.estimateCacheMemoryUsage()
            },
            workers: workerStats,
            compression: {
                enabled: this.compressionEnabled
            }
        };
    }

    getCacheHitRate() {
        if (!this.cacheStats) return 'N/A';
        const { hits, misses } = this.cacheStats;
        return ((hits / (hits + misses)) * 100).toFixed(2) + '%';
    }

    estimateCacheMemoryUsage() {
        let totalSize = 0;
        for (const [key, data] of this.cache.entries()) {
            totalSize += JSON.stringify(data).length * 2; // 粗略估算
        }
        return (totalSize / 1024 / 1024).toFixed(2) + ' MB';
    }

    // ==================== 资源预加载 ====================
    
    async preloadResources() {
        const resources = [
            './calculation-worker.js',
            // 可以添加更多需要预加载的资源
        ];
        
        const promises = resources.map(resource => {
            return new Promise(resolve => {
                if (resource.endsWith('.js')) {
                    // 预加载JavaScript
                    const link = document.createElement('link');
                    link.rel = 'prefetch';
                    link.href = resource;
                    document.head.appendChild(link);
                }
                resolve();
            });
        });
        
        await Promise.all(promises);
    }

    // ==================== 清理资源 ====================
    
    cleanup() {
        // 清理缓存
        this.cache.clear();
        
        // 终止所有Workers
        for (const [id, workerData] of this.workers.entries()) {
            workerData.worker.terminate();
        }
        this.workers.clear();
    }
}

// 智能预测系统
class PredictiveAnalytics {
    constructor() {
        this.historicalData = [];
        this.models = new Map();
        this.trends = new Map();
    }

    // 添加历史数据点
    addDataPoint(params, result) {
        this.historicalData.push({
            timestamp: Date.now(),
            params,
            result,
            marketConditions: this.getCurrentMarketConditions()
        });
        
        // 限制历史数据大小
        if (this.historicalData.length > 1000) {
            this.historicalData = this.historicalData.slice(-800);
        }
        
        // 更新趋势分析
        this.updateTrendAnalysis();
    }

    // 预测投资结果
    predictOutcome(params) {
        const similarProjects = this.findSimilarProjects(params);
        
        if (similarProjects.length < 3) {
            return null; // 数据不足，无法预测
        }
        
        const prediction = this.calculatePrediction(similarProjects, params);
        return {
            predictedROI: prediction.roi,
            confidence: prediction.confidence,
            riskFactors: prediction.risks,
            recommendations: prediction.recommendations
        };
    }

    findSimilarProjects(targetParams) {
        return this.historicalData.filter(data => {
            const similarity = this.calculateSimilarity(data.params, targetParams);
            return similarity > 0.7; // 相似度阈值
        }).sort((a, b) => {
            const simA = this.calculateSimilarity(a.params, targetParams);
            const simB = this.calculateSimilarity(b.params, targetParams);
            return simB - simA;
        }).slice(0, 10); // 取最相似的10个项目
    }

    calculateSimilarity(params1, params2) {
        const keys = ['purchasePrice', 'monthlyRent', 'leaseTerm', 'exchangeRate'];
        let totalSimilarity = 0;
        
        for (const key of keys) {
            if (params1[key] && params2[key]) {
                const diff = Math.abs(params1[key] - params2[key]);
                const avg = (params1[key] + params2[key]) / 2;
                const similarity = 1 - (diff / avg);
                totalSimilarity += Math.max(0, similarity);
            }
        }
        
        return totalSimilarity / keys.length;
    }

    calculatePrediction(similarProjects, targetParams) {
        const results = similarProjects.map(p => p.result.financial.roi);
        const weights = similarProjects.map(p => 
            this.calculateSimilarity(p.params, targetParams)
        );
        
        // 加权平均预测
        const weightedSum = results.reduce((sum, roi, index) => 
            sum + (roi * weights[index]), 0);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        
        const predictedROI = weightedSum / totalWeight;
        
        // 计算置信度
        const variance = results.reduce((sum, roi) => 
            sum + Math.pow(roi - predictedROI, 2), 0) / results.length;
        const confidence = Math.max(0, 1 - (Math.sqrt(variance) / predictedROI));
        
        return {
            roi: predictedROI,
            confidence: confidence * 100,
            risks: this.identifyRiskFactors(similarProjects),
            recommendations: this.generatePredictiveRecommendations(similarProjects, targetParams)
        };
    }

    getCurrentMarketConditions() {
        // 这里应该集成实时市场数据
        return {
            usdCnyRate: parseFloat(document.getElementById('exchangeRate')?.value) || 7.2,
            oilPrice: 75, // 模拟数据
            gdpGrowth: 3.2, // 模拟数据
            timestamp: Date.now()
        };
    }

    updateTrendAnalysis() {
        if (this.historicalData.length < 10) return;
        
        // 分析ROI趋势
        const recentData = this.historicalData.slice(-20);
        const roiTrend = this.calculateTrend(
            recentData.map(d => d.result.financial.roi)
        );
        
        this.trends.set('roi', {
            direction: roiTrend.direction,
            strength: roiTrend.strength,
            lastUpdated: Date.now()
        });
    }

    calculateTrend(values) {
        if (values.length < 3) return { direction: 'stable', strength: 0 };
        
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
        const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        
        let direction;
        if (Math.abs(slope) < 0.1) direction = 'stable';
        else if (slope > 0) direction = 'increasing';
        else direction = 'decreasing';
        
        return {
            direction,
            strength: Math.abs(slope)
        };
    }

    identifyRiskFactors(projects) {
        const risks = [];
        const roiValues = projects.map(p => p.result.financial.roi);
        const variance = roiValues.reduce((sum, roi) => 
            sum + Math.pow(roi - (roiValues.reduce((s, r) => s + r, 0) / roiValues.length), 2), 0) / roiValues.length;
        
        if (variance > 100) {
            risks.push('高ROI波动性风险');
        }
        
        return risks;
    }

    generatePredictiveRecommendations(projects, targetParams) {
        const recommendations = [];
        
        // 基于历史数据的建议
        const successfulProjects = projects.filter(p => p.result.financial.roi > 15);
        if (successfulProjects.length > 0) {
            const avgSuccessfulRent = successfulProjects.reduce((sum, p) => 
                sum + p.params.monthlyRent, 0) / successfulProjects.length;
            
            if (targetParams.monthlyRent < avgSuccessfulRent * 0.9) {
                recommendations.push(`建议将月租金提高至${Math.round(avgSuccessfulRent)}元以上`);
            }
        }
        
        return recommendations;
    }
}

// 全局实例
const performanceManager = new PerformanceManager();
const predictiveAnalytics = new PredictiveAnalytics();

// 导出到全局
window.PerformanceOptimization = {
    performanceManager,
    predictiveAnalytics,
    
    // 便捷方法
    async optimizedCalculate(params) {
        return await performanceManager.optimizedCalculation(params);
    },
    
    async batchCalculate(paramsList, options) {
        return await performanceManager.batchCalculation(paramsList, options);
    },
    
    predict(params) {
        return predictiveAnalytics.predictOutcome(params);
    },
    
    getStats() {
        return performanceManager.getPerformanceStats();
    }
};

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    performanceManager.cleanup();
});