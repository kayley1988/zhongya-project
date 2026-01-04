/**
 * 工程机械多维度价格分析系统
 * 整合爬虫、数据分析、决策支持于一体
 */

class MachineryPriceAnalyzer {
    constructor() {
        this.dataSources = {
            tieba: 'https://www.tieba.com', // 铁甲网
            lmjx: 'https://www.lmjx.net',   // 路面机械网
            alibaba: 'https://www.1688.com', // 阿里巴巴
            xcmg: 'https://www.xcmg.com',    // 徐工官网
            sany: 'https://www.sanygroup.com' // 三一官网
        };
        
        this.priceDatabase = new Map();
        this.analysisResults = new Map();
        this.dimensions = [
            'newMachinePrice',    // 新机价格
            'usedMachinePrice',   // 二手价格
            'rentalPrice',        // 租赁价格
            'regionPrice',        // 区域价格
            'brandComparison',    // 品牌对比
            'timeSeriesPrice',    // 时间序列
            'costBenefit'         // 成本效益
        ];
    }

    /**
     * 多维度价格爬取引擎
     */
    async crawlMultiDimensionPrices(equipmentKeyword) {
        console.log(`开始爬取 ${equipmentKeyword} 的多维度价格数据...`);
        
        const priceData = {
            keyword: equipmentKeyword,
            timestamp: new Date().toISOString(),
            dimensions: {}
        };

        // 并发爬取多个数据源
        const crawlTasks = [
            this.crawlNewMachinePrices(equipmentKeyword),
            this.crawlUsedMachinePrices(equipmentKeyword), 
            this.crawlRentalPrices(equipmentKeyword),
            this.crawlRegionalPrices(equipmentKeyword),
            this.crawlBrandComparison(equipmentKeyword),
            this.crawlHistoricalPrices(equipmentKeyword)
        ];

        try {
            const results = await Promise.allSettled(crawlTasks);
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    const dimensionName = this.dimensions[index];
                    priceData.dimensions[dimensionName] = result.value;
                }
            });

            // 存储到数据库
            this.priceDatabase.set(equipmentKeyword, priceData);
            
            // 上传到服务器
            await this.uploadToServer(priceData);
            
            return priceData;
        } catch (error) {
            console.error('价格爬取失败:', error);
            throw error;
        }
    }

    /**
     * 维度1: 新机价格爬取
     */
    async crawlNewMachinePrices(keyword) {
        const sources = [
            {
                name: '徐工官网',
                url: `https://www.xcmg.com/search?q=${keyword}`,
                parser: this.parseXcmgPrice
            },
            {
                name: '三一官网', 
                url: `https://www.sanygroup.com/search?keyword=${keyword}`,
                parser: this.parseSanyPrice
            },
            {
                name: '路面机械网',
                url: `https://www.lmjx.net/search?q=${keyword}`,
                parser: this.parseLmjxPrice
            }
        ];

        const newMachinePrices = [];
        
        for (const source of sources) {
            try {
                const priceData = await this.fetchPriceData(source.url, source.parser);
                if (priceData) {
                    newMachinePrices.push({
                        source: source.name,
                        prices: priceData,
                        reliability: this.calculateReliability(source.name),
                        lastUpdated: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.warn(`${source.name} 价格获取失败:`, error);
            }
        }

        return {
            category: '新机价格',
            data: newMachinePrices,
            summary: this.summarizeNewMachinePrices(newMachinePrices)
        };
    }

    /**
     * 维度2: 二手机价格爬取
     */
    async crawlUsedMachinePrices(keyword) {
        const sources = [
            {
                name: '铁甲二手机',
                url: `https://www.tieba.com/ershou/search?q=${keyword}`,
                parser: this.parseTiebaPrice
            },
            {
                name: '1688二手设备',
                url: `https://s.1688.com/selloffer/offer_search.htm?keywords=${keyword}+二手`,
                parser: this.parse1688Price
            }
        ];

        const usedMachinePrices = [];
        
        for (const source of sources) {
            try {
                const priceData = await this.fetchPriceData(source.url, source.parser);
                if (priceData) {
                    usedMachinePrices.push({
                        source: source.name,
                        prices: priceData.map(item => ({
                            ...item,
                            ageCategory: this.categorizeByAge(item.age),
                            conditionScore: this.evaluateCondition(item.condition),
                            depreciationRate: this.calculateDepreciation(item.originalPrice, item.currentPrice, item.age)
                        })),
                        lastUpdated: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.warn(`${source.name} 二手价格获取失败:`, error);
            }
        }

        return {
            category: '二手价格',
            data: usedMachinePrices,
            analysis: this.analyzeUsedPrices(usedMachinePrices)
        };
    }

    /**
     * 维度3: 租赁价格分析
     */
    async crawlRentalPrices(keyword) {
        const rentalSources = [
            {
                name: '铁甲租赁',
                url: `https://www.tieba.com/zulin/search?q=${keyword}`,
                parser: this.parseTiebaRental
            },
            {
                name: '工程机械租赁网',
                url: `https://www.21-sun.com/rent/search?keyword=${keyword}`,
                parser: this.parseRentalPrice
            }
        ];

        const rentalData = [];
        
        for (const source of rentalSources) {
            try {
                const data = await this.fetchPriceData(source.url, source.parser);
                if (data) {
                    rentalData.push({
                        source: source.name,
                        rentals: data.map(item => ({
                            ...item,
                            dailyRate: item.price / 30, // 日租金
                            monthlyRate: item.price,    // 月租金
                            yearlyRate: item.price * 12, // 年租金
                            roi: this.calculateRentalROI(item.price, item.originalPrice)
                        }))
                    });
                }
            } catch (error) {
                console.warn(`${source.name} 租赁价格获取失败:`, error);
            }
        }

        return {
            category: '租赁价格',
            data: rentalData,
            analysis: this.analyzeRentalMarket(rentalData)
        };
    }

    /**
     * 维度4: 区域价格差异分析
     */
    async crawlRegionalPrices(keyword) {
        const regions = [
            { name: '华东', cities: ['上海', '杭州', '南京', '苏州'] },
            { name: '华南', cities: ['深圳', '广州', '佛山', '东莞'] },
            { name: '华北', cities: ['北京', '天津', '石家庄', '太原'] },
            { name: '西南', cities: ['成都', '重庆', '昆明', '贵阳'] },
            { name: '东北', cities: ['沈阳', '大连', '哈尔滨', '长春'] }
        ];

        const regionalData = [];
        
        for (const region of regions) {
            const regionPrices = [];
            
            for (const city of region.cities) {
                try {
                    const cityPrices = await this.fetchCityPrice(keyword, city);
                    if (cityPrices) {
                        regionPrices.push({
                            city: city,
                            prices: cityPrices,
                            priceLevel: this.categorizePriceLevel(cityPrices.averagePrice),
                            marketActivity: this.assessMarketActivity(cityPrices.listingCount)
                        });
                    }
                } catch (error) {
                    console.warn(`${city} 价格获取失败:`, error);
                }
            }
            
            if (regionPrices.length > 0) {
                regionalData.push({
                    region: region.name,
                    cities: regionPrices,
                    averagePrice: this.calculateRegionalAverage(regionPrices),
                    priceRange: this.calculatePriceRange(regionPrices)
                });
            }
        }

        return {
            category: '区域价格',
            data: regionalData,
            analysis: this.analyzeRegionalDifferences(regionalData)
        };
    }

    /**
     * 维度5: 品牌对比分析
     */
    async crawlBrandComparison(keyword) {
        const brands = ['徐工', '三一', '中联重科', '柳工', '临工', '卡特彼勒', '小松'];
        const tonnageMatch = keyword.match(/(\d+)吨/);
        const tonnage = tonnageMatch ? tonnageMatch[1] : null;

        const brandComparison = [];
        
        for (const brand of brands) {
            try {
                const searchKeyword = tonnage ? `${brand} ${tonnage}吨汽车起重机` : `${brand} ${keyword}`;
                const brandData = await this.fetchBrandData(searchKeyword, brand);
                
                if (brandData) {
                    brandComparison.push({
                        brand: brand,
                        models: brandData.models,
                        priceRange: brandData.priceRange,
                        marketShare: this.getMarketShare(brand),
                        qualityRating: this.getQualityRating(brand),
                        serviceRating: this.getServiceRating(brand),
                        costEfficiency: this.calculateCostEfficiency(brandData)
                    });
                }
            } catch (error) {
                console.warn(`${brand} 品牌数据获取失败:`, error);
            }
        }

        return {
            category: '品牌对比',
            data: brandComparison,
            analysis: this.analyzeBrandCompetition(brandComparison)
        };
    }

    /**
     * 维度6: 历史价格趋势分析
     */
    async crawlHistoricalPrices(keyword) {
        const timeRanges = [
            '2024年12月', '2024年11月', '2024年10月', 
            '2024年9月', '2024年8月', '2024年7月'
        ];

        const historicalData = [];
        
        for (const timeRange of timeRanges) {
            try {
                const periodData = await this.fetchHistoricalData(keyword, timeRange);
                if (periodData) {
                    historicalData.push({
                        period: timeRange,
                        averagePrice: periodData.averagePrice,
                        listingCount: periodData.listingCount,
                        priceChange: this.calculatePriceChange(periodData, historicalData),
                        marketTrend: this.identifyMarketTrend(periodData)
                    });
                }
            } catch (error) {
                console.warn(`${timeRange} 历史数据获取失败:`, error);
            }
        }

        return {
            category: '历史价格',
            data: historicalData,
            analysis: this.analyzePriceTrends(historicalData)
        };
    }

    /**
     * 多维度价格决策分析
     */
    generatePriceDecision(equipmentKeyword) {
        const priceData = this.priceDatabase.get(equipmentKeyword);
        if (!priceData) {
            throw new Error('价格数据不存在，请先爬取数据');
        }

        const decision = {
            equipment: equipmentKeyword,
            analysisDate: new Date().toISOString(),
            
            // 价格建议
            priceRecommendation: {
                newMachine: this.recommendNewMachinePrice(priceData),
                usedMachine: this.recommendUsedMachinePrice(priceData),
                rental: this.recommendRentalStrategy(priceData)
            },
            
            // 购买建议
            purchaseAdvice: {
                bestTimeToBuy: this.identifyBestPurchaseTiming(priceData),
                bestRegion: this.recommendBestRegion(priceData),
                bestBrand: this.recommendBestBrand(priceData),
                riskAssessment: this.assessPurchaseRisk(priceData)
            },
            
            // 投资分析
            investmentAnalysis: {
                roi: this.calculateInvestmentROI(priceData),
                paybackPeriod: this.calculatePaybackPeriod(priceData),
                riskLevel: this.assessInvestmentRisk(priceData),
                marketOutlook: this.predictMarketOutlook(priceData)
            },
            
            // 竞争分析
            competitiveAnalysis: {
                marketPosition: this.analyzeMarketPosition(priceData),
                pricingStrategy: this.recommendPricingStrategy(priceData),
                differentiationOpportunities: this.identifyDifferentiation(priceData)
            }
        };

        // 保存分析结果
        this.analysisResults.set(equipmentKeyword, decision);
        
        return decision;
    }

    /**
     * 上传数据到服务器
     */
    async uploadToServer(data) {
        const serverUrl = 'http://www.jinzhe.asia/api/machinery/price-data';
        
        try {
            const response = await fetch(serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer your-api-key'
                },
                body: JSON.stringify({
                    type: 'price_analysis',
                    data: data,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                console.log('数据上传成功');
                return await response.json();
            } else {
                throw new Error(`上传失败: ${response.status}`);
            }
        } catch (error) {
            console.error('数据上传失败:', error);
            // 本地缓存，稍后重试
            this.cacheForRetry(data);
        }
    }

    /**
     * 生成可视化报告
     */
    generateVisualizationReport(equipmentKeyword) {
        const data = this.priceDatabase.get(equipmentKeyword);
        const decision = this.analysisResults.get(equipmentKeyword);
        
        if (!data || !decision) {
            throw new Error('分析数据不完整');
        }

        return {
            charts: {
                priceComparison: this.createPriceComparisonChart(data),
                trendAnalysis: this.createTrendChart(data),
                regionalMap: this.createRegionalMap(data),
                brandComparison: this.createBrandChart(data)
            },
            
            tables: {
                priceMatrix: this.createPriceMatrix(data),
                costBenefit: this.createCostBenefitTable(data),
                riskAssessment: this.createRiskTable(decision)
            },
            
            summary: {
                keyFindings: this.extractKeyFindings(data, decision),
                recommendations: this.formatRecommendations(decision),
                nextActions: this.suggestNextActions(decision)
            }
        };
    }

    // 数据解析器方法
    parseXcmgPrice(html) {
        // 解析徐工官网价格的具体实现
        const pricePattern = /价格[：:]\s*(\d+(?:\.\d+)?)[万元]/gi;
        const matches = html.match(pricePattern);
        return matches ? matches.map(m => parseFloat(m.replace(/[^\d.]/g, ''))) : null;
    }

    parseSanyPrice(html) {
        // 解析三一官网价格的具体实现
        const pricePattern = /售价[：:]\s*(\d+(?:\.\d+)?)[万元]/gi;
        const matches = html.match(pricePattern);
        return matches ? matches.map(m => parseFloat(m.replace(/[^\d.]/g, ''))) : null;
    }

    parseLmjxPrice(html) {
        // 解析路面机械网价格的具体实现
        const pricePattern = /报价[：:]\s*(\d+(?:\.\d+)?)[万元]/gi;
        const matches = html.match(pricePattern);
        return matches ? matches.map(m => parseFloat(m.replace(/[^\d.]/g, ''))) : null;
    }

    parseTiebaPrice(html) {
        // 解析铁甲网价格的具体实现
        const pricePattern = /\d+(?:\.\d+)?万/g;
        const matches = html.match(pricePattern);
        return matches ? matches.map(m => parseFloat(m.replace(/[^\d.]/g, ''))) : null;
    }

    parse1688Price(html) {
        // 解析1688价格的具体实现
        const pricePattern = /¥\s*(\d+(?:,\d+)*(?:\.\d+)?)/g;
        const matches = html.match(pricePattern);
        return matches ? matches.map(m => parseFloat(m.replace(/[^\d.]/g, ''))) : null;
    }

    // 工具方法
    async fetchPriceData(url, parser) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            return parser(html);
        } catch (error) {
            console.error('获取价格数据失败:', error);
            return null;
        }
    }

    calculateReliability(source) {
        const reliabilityMap = {
            '徐工官网': 0.95,
            '三一官网': 0.95,
            '路面机械网': 0.85,
            '铁甲网': 0.80,
            '1688': 0.70
        };
        return reliabilityMap[source] || 0.60;
    }

    categorizeByAge(age) {
        if (age <= 2) return '准新机';
        if (age <= 5) return '成色良好';
        if (age <= 8) return '正常使用';
        return '高龄设备';
    }

    evaluateCondition(condition) {
        const conditionMap = {
            '全新': 10, '95成新': 9, '9成新': 8,
            '8成新': 7, '7成新': 6, '6成新': 5,
            '5成新': 4, '待修': 3, '报废': 1
        };
        return conditionMap[condition] || 5;
    }

    calculateDepreciation(originalPrice, currentPrice, age) {
        const totalDepreciation = (originalPrice - currentPrice) / originalPrice;
        return (totalDepreciation / age * 100).toFixed(2) + '%/年';
    }

    // 更多工具方法...
    generateEquipmentId() {
        return 'EQ_' + Date.now().toString(36).toUpperCase();
    }
}

// 全局实例
window.priceAnalyzer = new MachineryPriceAnalyzer();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MachineryPriceAnalyzer;
}