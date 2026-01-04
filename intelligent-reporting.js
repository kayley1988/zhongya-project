/**
 * 智能报告生成系统
 * 包含报告模板、PDF导出、智能分析等功能
 */

class IntelligentReportGenerator {
    constructor() {
        this.templates = {
            executive: '高管摘要报告',
            comprehensive: '综合分析报告', 
            technical: '技术评估报告',
            financial: '财务分析报告',
            risk: '风险评估报告'
        };
        
        this.worker = null;
        this.initializeWorker();
    }

    initializeWorker() {
        try {
            this.worker = new Worker('./calculation-worker.js');
        } catch (error) {
            console.warn('Web Worker not available, falling back to main thread');
        }
    }

    async generateReport(reportType, calculationData, options = {}) {
        const startTime = Date.now();
        
        const reportData = {
            type: reportType,
            data: calculationData,
            options: {
                includeCharts: options.includeCharts !== false,
                includeCashFlow: options.includeCashFlow !== false,
                includeRiskAnalysis: options.includeRiskAnalysis !== false,
                includeSensitivity: options.includeSensitivity !== false,
                language: options.language || 'zh-CN',
                format: options.format || 'html',
                ...options
            },
            timestamp: Date.now()
        };

        let report;
        if (this.worker) {
            report = await this.generateWithWorker(reportData);
        } else {
            report = await this.generateInMainThread(reportData);
        }

        report.metadata = {
            ...report.metadata,
            generationTime: Date.now() - startTime,
            reportType
        };

        return report;
    }

    async generateWithWorker(reportData) {
        return new Promise((resolve, reject) => {
            const taskId = Date.now().toString();
            
            const timeout = setTimeout(() => {
                reject(new Error('报告生成超时'));
            }, 30000);

            this.worker.onmessage = function(e) {
                const { taskId: responseTaskId, success, result, error } = e.data;
                
                if (responseTaskId === taskId) {
                    clearTimeout(timeout);
                    if (success) {
                        resolve(result);
                    } else {
                        reject(new Error(error));
                    }
                }
            };

            this.worker.postMessage({
                taskType: 'report_generation',
                taskId,
                data: reportData
            });
        });
    }

    async generateInMainThread(reportData) {
        // 主线程回退方案
        return this.createReport(reportData);
    }

    createReport(reportData) {
        const { type, data, options } = reportData;
        
        switch (type) {
            case 'executive':
                return this.createExecutiveReport(data, options);
            case 'comprehensive':
                return this.createComprehensiveReport(data, options);
            case 'technical':
                return this.createTechnicalReport(data, options);
            case 'financial':
                return this.createFinancialReport(data, options);
            case 'risk':
                return this.createRiskReport(data, options);
            default:
                throw new Error(`Unknown report type: ${type}`);
        }
    }

    createExecutiveReport(data, options) {
        const { financial, costs, income } = data;
        
        return {
            title: '高管摘要报告',
            sections: [
                {
                    title: '投资概要',
                    content: {
                        roi: `${financial.roi.toFixed(2)}%`,
                        recommendation: this.getInvestmentRecommendation(financial.roi),
                        paybackPeriod: `${financial.paybackPeriod.toFixed(1)}个月`,
                        totalInvestment: `$${costs.total.usd.toFixed(0)}`
                    }
                },
                {
                    title: '关键指标',
                    content: {
                        netProfit: `$${financial.netProfit.usd.toFixed(0)}`,
                        annualizedROI: `${financial.annualizedROI.toFixed(2)}%`,
                        irr: `${financial.irr.toFixed(2)}%`,
                        totalRevenue: `$${income.total.usd.toFixed(0)}`
                    }
                },
                {
                    title: '风险评估',
                    content: this.assessInvestmentRisk(financial)
                }
            ]
        };
    }

    createComprehensiveReport(data, options) {
        const { financial, costs, income, cashFlow, metadata } = data;
        
        const report = {
            title: '综合投资分析报告',
            executiveSummary: this.createExecutiveReport(data, options),
            sections: []
        };

        // 项目概况
        report.sections.push({
            title: '项目概况',
            content: {
                leaseTerm: `${metadata.leaseTerm}个月`,
                exchangeRate: metadata.exchangeRate,
                incoterms: metadata.incoterms,
                calculationDate: new Date().toLocaleDateString('zh-CN')
            }
        });

        // 成本分析
        report.sections.push({
            title: '成本分析',
            content: this.createCostAnalysis(costs)
        });

        // 收入分析
        report.sections.push({
            title: '收入分析',
            content: this.createIncomeAnalysis(income, metadata.leaseTerm)
        });

        // 财务指标
        report.sections.push({
            title: '财务指标分析',
            content: this.createFinancialAnalysis(financial)
        });

        // 现金流分析
        if (options.includeCashFlow) {
            report.sections.push({
                title: '现金流分析',
                content: this.createCashFlowAnalysis(cashFlow)
            });
        }

        // 投资建议
        report.sections.push({
            title: '投资建议',
            content: this.generateInvestmentAdvice(data)
        });

        return report;
    }

    createTechnicalReport(data, options) {
        return {
            title: '技术评估报告',
            sections: [
                {
                    title: '设备规格评估',
                    content: this.createEquipmentAssessment(data)
                },
                {
                    title: '技术风险分析',
                    content: this.createTechnicalRiskAnalysis(data)
                },
                {
                    title: '维护成本预测',
                    content: this.createMaintenanceAnalysis(data)
                }
            ]
        };
    }

    createFinancialReport(data, options) {
        const { financial, costs, income, cashFlow } = data;
        
        return {
            title: '财务分析报告',
            sections: [
                {
                    title: '投资回报分析',
                    content: {
                        roi: financial.roi,
                        irr: financial.irr,
                        npv: this.calculateNPV(cashFlow, 0.1),
                        profitability: this.assessProfitability(financial.roi)
                    }
                },
                {
                    title: '成本效益分析',
                    content: this.createCostBenefitAnalysis(costs, income)
                },
                {
                    title: '财务风险评估',
                    content: this.createFinancialRiskAssessment(financial)
                },
                {
                    title: '现金流预测',
                    content: this.createCashFlowForecast(cashFlow)
                }
            ]
        };
    }

    createRiskReport(data, options) {
        return {
            title: '风险评估报告',
            sections: [
                {
                    title: '市场风险',
                    content: this.assessMarketRisk(data)
                },
                {
                    title: '汇率风险',
                    content: this.assessCurrencyRisk(data)
                },
                {
                    title: '操作风险',
                    content: this.assessOperationalRisk(data)
                },
                {
                    title: '风险缓解建议',
                    content: this.generateRiskMitigation(data)
                }
            ]
        };
    }

    // 辅助分析方法
    createCostAnalysis(costs) {
        const totalCost = costs.total.usd;
        
        return {
            breakdown: [
                { item: '设备采购', amount: costs.equipment.usd, percentage: (costs.equipment.usd / totalCost * 100).toFixed(1) },
                { item: '运输费用', amount: costs.transport.usd, percentage: (costs.transport.usd / totalCost * 100).toFixed(1) },
                { item: '保险费用', amount: costs.insurance.usd, percentage: (costs.insurance.usd / totalCost * 100).toFixed(1) },
                { item: '关税费用', amount: costs.customs.usd, percentage: (costs.customs.usd / totalCost * 100).toFixed(1) },
                { item: '增值税', amount: costs.vat.usd, percentage: (costs.vat.usd / totalCost * 100).toFixed(1) },
                { item: '维护费用', amount: costs.maintenance.usd, percentage: (costs.maintenance.usd / totalCost * 100).toFixed(1) }
            ],
            total: totalCost,
            majorCosts: this.identifyMajorCosts(costs)
        };
    }

    createIncomeAnalysis(income, leaseTerm) {
        return {
            breakdown: [
                { 
                    item: '租金收入', 
                    amount: income.rental.usd, 
                    percentage: (income.rental.usd / income.total.usd * 100).toFixed(1),
                    monthly: (income.rental.usd / leaseTerm).toFixed(0)
                },
                { 
                    item: '残值收入', 
                    amount: income.residual.usd, 
                    percentage: (income.residual.usd / income.total.usd * 100).toFixed(1)
                }
            ],
            total: income.total.usd,
            monthlyAverage: (income.rental.usd / leaseTerm).toFixed(0)
        };
    }

    createFinancialAnalysis(financial) {
        return {
            profitability: {
                roi: `${financial.roi.toFixed(2)}%`,
                assessment: this.assessProfitability(financial.roi),
                benchmark: this.getROIBenchmark(financial.roi)
            },
            efficiency: {
                paybackPeriod: `${financial.paybackPeriod.toFixed(1)}个月`,
                assessment: this.assessPaybackPeriod(financial.paybackPeriod),
                irr: `${financial.irr.toFixed(2)}%`
            },
            annualized: {
                roi: `${financial.annualizedROI.toFixed(2)}%`,
                assessment: this.assessAnnualizedROI(financial.annualizedROI)
            }
        };
    }

    createCashFlowAnalysis(cashFlow) {
        const breakEvenPoint = cashFlow.findIndex(cf => cf.cumulativeCashFlow > 0);
        const maxDrawdown = Math.min(...cashFlow.map(cf => cf.cumulativeCashFlow));
        
        return {
            breakEvenMonth: breakEvenPoint !== -1 ? breakEvenPoint + 1 : '未达到',
            maxDrawdown: maxDrawdown.toFixed(0),
            finalCashFlow: cashFlow[cashFlow.length - 1]?.cumulativeCashFlow.toFixed(0),
            averageMonthlyFlow: (cashFlow.reduce((sum, cf) => sum + cf.monthlyProfit, 0) / cashFlow.length).toFixed(0),
            trends: this.analyzeCashFlowTrends(cashFlow)
        };
    }

    generateInvestmentAdvice(data) {
        const { financial } = data;
        const advice = [];
        
        if (financial.roi > 20) {
            advice.push('项目具有很高的投资价值，强烈建议投资');
        } else if (financial.roi > 15) {
            advice.push('项目投资回报良好，建议投资');
        } else if (financial.roi > 10) {
            advice.push('项目投资回报一般，需谨慎评估后决定');
        } else {
            advice.push('项目投资风险较高，不建议投资');
        }

        if (financial.paybackPeriod > 24) {
            advice.push('建议优化租金定价或缩短租期以加速资金回收');
        }

        advice.push('建议密切关注汇率变动，必要时进行风险对冲');
        advice.push('建议定期评估设备市场价值，适时调整残值预期');
        
        return advice;
    }

    // 风险评估方法
    assessInvestmentRisk(financial) {
        const risks = [];
        
        if (financial.roi < 10) {
            risks.push({ level: '高', type: '收益风险', description: '投资回报率偏低' });
        }
        
        if (financial.paybackPeriod > 24) {
            risks.push({ level: '中', type: '流动性风险', description: '资金回收期较长' });
        }
        
        if (financial.irr < 10) {
            risks.push({ level: '中', type: '效率风险', description: '内部收益率偏低' });
        }
        
        return risks.length > 0 ? risks : [{ level: '低', type: '综合风险', description: '项目风险可控' }];
    }

    assessMarketRisk(data) {
        return {
            demandRisk: '中等 - 设备租赁市场需求相对稳定',
            competitionRisk: '中等 - 同类设备供应商较多',
            priceRisk: '高 - 租金价格可能受市场波动影响',
            recommendations: [
                '建立长期客户关系以稳定需求',
                '关注竞争对手价格策略',
                '建立灵活的租金调整机制'
            ]
        };
    }

    assessCurrencyRisk(data) {
        const { metadata } = data;
        return {
            exposure: '高 - 美元/人民币汇率直接影响成本和收益',
            currentRate: metadata.exchangeRate,
            volatility: '中等 - 汇率存在一定波动性',
            hedgingOptions: [
                '考虑使用远期外汇合约锁定汇率',
                '分散外汇风险，部分收入以美元计价',
                '定期评估汇率敞口并调整策略'
            ]
        };
    }

    assessOperationalRisk(data) {
        return {
            maintenanceRisk: '中等 - 设备维护成本可能超预期',
            technicalRisk: '低 - 设备技术成熟度较高',
            managementRisk: '低 - 租赁管理流程标准化',
            recommendations: [
                '建立预防性维护计划',
                '与设备制造商签订维保协议',
                '建立完善的租赁管理系统'
            ]
        };
    }

    generateRiskMitigation(data) {
        return [
            {
                risk: '汇率风险',
                strategy: '使用金融衍生工具进行汇率对冲',
                priority: '高'
            },
            {
                risk: '设备贬值风险',
                strategy: '购买设备保险，定期评估市场价值',
                priority: '中'
            },
            {
                risk: '租客违约风险',
                strategy: '严格审核租客资质，要求保证金',
                priority: '中'
            },
            {
                risk: '维护成本超支',
                strategy: '签订固定价格维保合同',
                priority: '中'
            }
        ];
    }

    // 实用工具方法
    getInvestmentRecommendation(roi) {
        if (roi > 20) return '强烈推荐';
        if (roi > 15) return '推荐';
        if (roi > 10) return '谨慎推荐';
        return '不推荐';
    }

    assessProfitability(roi) {
        if (roi > 20) return '优秀';
        if (roi > 15) return '良好';
        if (roi > 10) return '一般';
        return '较差';
    }

    getROIBenchmark(roi) {
        return {
            current: roi,
            industry: 15, // 行业平均水平
            risk_free: 3,  // 无风险收益率
            premium: roi - 15
        };
    }

    assessPaybackPeriod(months) {
        if (months <= 12) return '很快';
        if (months <= 18) return '较快';
        if (months <= 24) return '正常';
        return '较慢';
    }

    assessAnnualizedROI(roi) {
        if (roi > 25) return '非常优秀';
        if (roi > 20) return '优秀';
        if (roi > 15) return '良好';
        return '需要改进';
    }

    identifyMajorCosts(costs) {
        const items = [
            { name: '设备采购', value: costs.equipment.usd },
            { name: '运输费用', value: costs.transport.usd },
            { name: '保险费用', value: costs.insurance.usd },
            { name: '关税费用', value: costs.customs.usd },
            { name: '增值税', value: costs.vat.usd },
            { name: '维护费用', value: costs.maintenance.usd }
        ];
        
        return items
            .sort((a, b) => b.value - a.value)
            .slice(0, 3)
            .map(item => ({ name: item.name, percentage: (item.value / costs.total.usd * 100).toFixed(1) }));
    }

    analyzeCashFlowTrends(cashFlow) {
        const trends = [];
        
        // 分析是否存在明显的季节性或趋势
        const monthlyProfits = cashFlow.map(cf => cf.monthlyProfit);
        const avgProfit = monthlyProfits.reduce((sum, p) => sum + p, 0) / monthlyProfits.length;
        const volatility = this.calculateStandardDeviation(monthlyProfits);
        
        trends.push(`平均月利润: $${avgProfit.toFixed(0)}`);
        trends.push(`利润波动性: ${volatility < avgProfit * 0.1 ? '低' : volatility < avgProfit * 0.3 ? '中' : '高'}`);
        
        return trends;
    }

    calculateNPV(cashFlow, discountRate) {
        let npv = 0;
        cashFlow.forEach((cf, index) => {
            npv += cf.monthlyProfit / Math.pow(1 + discountRate / 12, index);
        });
        return npv;
    }

    calculateStandardDeviation(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
        return Math.sqrt(avgSquaredDiff);
    }

    // 导出功能
    async exportToPDF(report, filename) {
        // 这里需要集成 PDF 生成库，如 jsPDF
        console.log('PDF export functionality would be implemented here');
        return this.generatePDFContent(report);
    }

    async exportToExcel(report, filename) {
        // 这里需要集成 Excel 导出库，如 XLSX
        console.log('Excel export functionality would be implemented here');
        return this.generateExcelContent(report);
    }

    generatePDFContent(report) {
        // PDF 内容生成逻辑
        return {
            format: 'pdf',
            content: report,
            pages: Math.ceil(JSON.stringify(report).length / 3000) // 估算页数
        };
    }

    generateExcelContent(report) {
        // Excel 内容生成逻辑
        return {
            format: 'excel',
            sheets: this.convertReportToSheets(report)
        };
    }

    convertReportToSheets(report) {
        const sheets = {};
        
        sheets['概要'] = {
            title: report.title,
            data: report.executiveSummary || report.sections[0]
        };
        
        report.sections?.forEach((section, index) => {
            sheets[section.title] = {
                title: section.title,
                data: section.content
            };
        });
        
        return sheets;
    }
}

// 决策支持系统
class DecisionSupportSystem {
    constructor() {
        this.criteria = {
            roi: { weight: 0.4, min: 10, target: 20 },
            payback: { weight: 0.25, max: 24, target: 12 },
            risk: { weight: 0.2, max: 0.7, target: 0.3 },
            irr: { weight: 0.15, min: 0.1, target: 0.25 }
        };
    }

    evaluateInvestment(calculation, sensitivityData = null) {
        const scores = this.calculateCriteriaScores(calculation);
        const overallScore = this.calculateOverallScore(scores);
        const recommendation = this.generateRecommendation(overallScore, calculation);
        
        return {
            overallScore,
            criteriaScores: scores,
            recommendation,
            riskAssessment: this.assessOverallRisk(calculation, sensitivityData),
            actionItems: this.generateActionItems(scores, calculation)
        };
    }

    calculateCriteriaScores(calculation) {
        const { financial } = calculation;
        
        const roiScore = this.scoreROI(financial.roi);
        const paybackScore = this.scorePayback(financial.paybackPeriod);
        const irrScore = this.scoreIRR(financial.irr);
        const riskScore = this.scoreRisk(calculation);
        
        return {
            roi: { value: financial.roi, score: roiScore, weight: this.criteria.roi.weight },
            payback: { value: financial.paybackPeriod, score: paybackScore, weight: this.criteria.payback.weight },
            irr: { value: financial.irr, score: irrScore, weight: this.criteria.irr.weight },
            risk: { value: 'calculated', score: riskScore, weight: this.criteria.risk.weight }
        };
    }

    scoreROI(roi) {
        const { min, target } = this.criteria.roi;
        if (roi < min) return 0;
        if (roi >= target) return 100;
        return ((roi - min) / (target - min)) * 100;
    }

    scorePayback(payback) {
        const { max, target } = this.criteria.payback;
        if (payback > max) return 0;
        if (payback <= target) return 100;
        return ((max - payback) / (max - target)) * 100;
    }

    scoreIRR(irr) {
        const { min, target } = this.criteria.irr;
        const irrPercent = irr * 100;
        if (irrPercent < min * 100) return 0;
        if (irrPercent >= target * 100) return 100;
        return ((irrPercent - min * 100) / (target * 100 - min * 100)) * 100;
    }

    scoreRisk(calculation) {
        // 综合风险评分（数值越小风险越低，得分越高）
        const { financial } = calculation;
        
        let riskFactors = 0;
        if (financial.roi < 15) riskFactors += 0.3;
        if (financial.paybackPeriod > 18) riskFactors += 0.2;
        if (financial.irr < 0.15) riskFactors += 0.2;
        
        return Math.max(0, (1 - riskFactors) * 100);
    }

    calculateOverallScore(scores) {
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const criterion of Object.values(scores)) {
            totalScore += criterion.score * criterion.weight;
            totalWeight += criterion.weight;
        }
        
        return totalScore / totalWeight;
    }

    generateRecommendation(overallScore, calculation) {
        const { financial } = calculation;
        
        let level, action, reasoning;
        
        if (overallScore >= 80) {
            level = '强烈推荐';
            action = '立即投资';
            reasoning = '项目各项指标均表现优异，投资风险低，收益稳定';
        } else if (overallScore >= 60) {
            level = '推荐';
            action = '建议投资';
            reasoning = '项目整体指标良好，具备投资价值，建议适度风险控制';
        } else if (overallScore >= 40) {
            level = '谨慎推荐';
            action = '谨慎考虑';
            reasoning = '项目存在一定风险，需要进一步优化参数或增强风险控制';
        } else {
            level = '不推荐';
            action = '暂缓投资';
            reasoning = '项目风险较高或收益不足，建议重新评估或寻找更好机会';
        }
        
        return {
            level,
            action,
            reasoning,
            confidence: this.calculateConfidence(overallScore),
            keyFactors: this.identifyKeyFactors(calculation)
        };
    }

    calculateConfidence(overallScore) {
        // 置信度基于得分的分布情况
        if (overallScore >= 80 || overallScore <= 20) return '高';
        if (overallScore >= 60 || overallScore <= 40) return '中';
        return '低';
    }

    identifyKeyFactors(calculation) {
        const factors = [];
        const { financial } = calculation;
        
        if (financial.roi > 20) factors.push('投资回报率优异');
        else if (financial.roi < 10) factors.push('投资回报率偏低');
        
        if (financial.paybackPeriod <= 12) factors.push('投资回收期短');
        else if (financial.paybackPeriod > 24) factors.push('投资回收期长');
        
        if (financial.irr > 0.2) factors.push('内部收益率高');
        else if (financial.irr < 0.1) factors.push('内部收益率低');
        
        return factors;
    }

    assessOverallRisk(calculation, sensitivityData) {
        let riskLevel = 0; // 0-1 scale
        
        // 基于财务指标的风险
        const { financial } = calculation;
        if (financial.roi < 15) riskLevel += 0.2;
        if (financial.paybackPeriod > 18) riskLevel += 0.15;
        if (financial.irr < 0.12) riskLevel += 0.15;
        
        // 基于敏感性分析的风险（如果有数据）
        if (sensitivityData && sensitivityData.analysis) {
            const sensitivity = sensitivityData.analysis;
            if (sensitivity.riskLevel === 'HIGH') riskLevel += 0.3;
            else if (sensitivity.riskLevel === 'MEDIUM') riskLevel += 0.15;
        }
        
        riskLevel = Math.min(1, riskLevel); // 确保不超过1
        
        let assessment;
        if (riskLevel <= 0.3) assessment = '低风险';
        else if (riskLevel <= 0.6) assessment = '中等风险';
        else assessment = '高风险';
        
        return {
            level: assessment,
            score: riskLevel,
            factors: this.identifyRiskFactors(calculation, sensitivityData)
        };
    }

    identifyRiskFactors(calculation, sensitivityData) {
        const factors = [];
        const { financial } = calculation;
        
        if (financial.roi < 12) factors.push('收益率风险：低于行业平均水平');
        if (financial.paybackPeriod > 20) factors.push('流动性风险：回收期较长');
        if (sensitivityData?.analysis?.riskLevel === 'HIGH') {
            factors.push('敏感性风险：关键参数变动影响大');
        }
        
        // 汇率风险（基于汇率敏感性）
        factors.push('汇率风险：美元/人民币汇率波动影响');
        
        return factors;
    }

    generateActionItems(scores, calculation) {
        const items = [];
        
        // 基于各项得分生成改进建议
        if (scores.roi.score < 60) {
            items.push({
                priority: '高',
                action: '优化租金定价策略',
                description: '提高月租金或延长租期以改善投资回报率'
            });
        }
        
        if (scores.payback.score < 60) {
            items.push({
                priority: '高',
                action: '加速回收投资',
                description: '考虑提高月租金或寻求更低的采购价格'
            });
        }
        
        if (scores.risk.score < 60) {
            items.push({
                priority: '中',
                action: '制定风险控制计划',
                description: '实施汇率对冲策略，购买设备保险'
            });
        }
        
        // 通用建议
        items.push({
            priority: '中',
            action: '市场调研',
            description: '验证租金定价是否符合市场水平'
        });
        
        items.push({
            priority: '低',
            action: '定期评估',
            description: '建立季度评估机制，及时调整策略'
        });
        
        return items;
    }
}

// 全局实例
const reportGenerator = new IntelligentReportGenerator();
const decisionSupport = new DecisionSupportSystem();

// 导出功能供外部使用
window.IntelligentReporting = {
    reportGenerator,
    decisionSupport,
    
    // 便捷方法
    async generateExecutiveReport(calculationData) {
        return await reportGenerator.generateReport('executive', calculationData);
    },
    
    async generateComprehensiveReport(calculationData, options = {}) {
        return await reportGenerator.generateReport('comprehensive', calculationData, options);
    },
    
    evaluateInvestment(calculationData, sensitivityData = null) {
        return decisionSupport.evaluateInvestment(calculationData, sensitivityData);
    },
    
    async exportReport(report, format = 'pdf', filename = 'investment-report') {
        if (format === 'pdf') {
            return await reportGenerator.exportToPDF(report, filename);
        } else if (format === 'excel') {
            return await reportGenerator.exportToExcel(report, filename);
        }
        throw new Error(`Unsupported format: ${format}`);
    }
};