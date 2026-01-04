/**
 * Web Worker for complex calculations
 * 处理租赁计算、敏感性分析等计算密集型任务
 */

// 导入计算函数（如果需要）
self.importScripts = self.importScripts || function() {};

// 计算任务类型
const TASK_TYPES = {
    LEASE_CALCULATION: 'lease_calculation',
    SENSITIVITY_ANALYSIS: 'sensitivity_analysis', 
    BATCH_CALCULATION: 'batch_calculation',
    OPTIMIZATION: 'optimization',
    REPORT_GENERATION: 'report_generation'
};

// 主消息处理器
self.onmessage = function(e) {
    const { taskType, data, taskId } = e.data;
    
    try {
        let result;
        
        switch (taskType) {
            case TASK_TYPES.LEASE_CALCULATION:
                result = calculateLease(data);
                break;
            case TASK_TYPES.SENSITIVITY_ANALYSIS:
                result = runSensitivityAnalysis(data);
                break;
            case TASK_TYPES.BATCH_CALCULATION:
                result = batchCalculation(data);
                break;
            case TASK_TYPES.OPTIMIZATION:
                result = optimizeParameters(data);
                break;
            case TASK_TYPES.REPORT_GENERATION:
                result = generateReport(data);
                break;
            default:
                throw new Error(`Unknown task type: ${taskType}`);
        }
        
        // 发送成功结果
        self.postMessage({
            taskId,
            success: true,
            result,
            timestamp: Date.now()
        });
        
    } catch (error) {
        // 发送错误结果
        self.postMessage({
            taskId,
            success: false,
            error: error.message,
            timestamp: Date.now()
        });
    }
};

// 租赁计算函数
function calculateLease(params) {
    const {
        purchasePrice,
        monthlyRent,
        leaseTerm,
        exchangeRate,
        transportCost,
        insuranceRate,
        customsRate,
        vatRate,
        maintenanceRate,
        residualValueRate,
        incoterms
    } = params;

    // 1. 成本计算
    const equipmentCostUSD = purchasePrice / exchangeRate;
    let transportCostUSD = transportCost / exchangeRate;
    
    // 根据Incoterms调整运输成本分配
    if (incoterms === 'FOB' || incoterms === 'EXW') {
        transportCostUSD = transportCost / exchangeRate; // 买方承担
    } else if (incoterms === 'CIF' || incoterms === 'DDP') {
        transportCostUSD = 0; // 卖方已承担
    }
    
    const insuranceCostUSD = equipmentCostUSD * (insuranceRate / 100);
    const customsCostUSD = equipmentCostUSD * (customsRate / 100);
    const vatCostUSD = (equipmentCostUSD + customsCostUSD) * (vatRate / 100);
    
    const totalCostUSD = equipmentCostUSD + transportCostUSD + insuranceCostUSD + customsCostUSD + vatCostUSD;
    const totalCostCNY = totalCostUSD * exchangeRate;

    // 2. 收入计算
    const monthlyRentUSD = monthlyRent / exchangeRate;
    const totalRentalIncomeUSD = monthlyRentUSD * leaseTerm;
    const totalRentalIncomeCNY = monthlyRent * leaseTerm;

    // 3. 运营成本
    const maintenanceCostUSD = totalCostUSD * (maintenanceRate / 100) * (leaseTerm / 12);
    const maintenanceCostCNY = maintenanceCostUSD * exchangeRate;

    // 4. 残值计算
    const residualValueUSD = equipmentCostUSD * (residualValueRate / 100);
    const residualValueCNY = residualValueUSD * exchangeRate;

    // 5. 财务指标计算
    const netProfitUSD = totalRentalIncomeUSD + residualValueUSD - totalCostUSD - maintenanceCostUSD;
    const netProfitCNY = netProfitUSD * exchangeRate;
    
    const roiPercent = (netProfitUSD / totalCostUSD) * 100;
    const annualizedROI = roiPercent * (12 / leaseTerm);
    
    const paybackPeriod = totalCostUSD / monthlyRentUSD; // 月数
    const irr = calculateIRR([
        -totalCostUSD,
        ...Array(leaseTerm).fill(monthlyRentUSD - maintenanceCostUSD/leaseTerm),
        residualValueUSD
    ]);

    // 6. 现金流分析
    const cashFlow = [];
    let cumulativeCashFlow = -totalCostUSD;
    
    for (let month = 1; month <= leaseTerm; month++) {
        const monthlyProfit = monthlyRentUSD - (maintenanceCostUSD / leaseTerm);
        cumulativeCashFlow += monthlyProfit;
        
        cashFlow.push({
            month,
            monthlyIncome: monthlyRentUSD,
            monthlyExpense: maintenanceCostUSD / leaseTerm,
            monthlyProfit,
            cumulativeCashFlow
        });
    }
    
    // 最后一个月加上残值
    if (cashFlow.length > 0) {
        cashFlow[cashFlow.length - 1].residualValue = residualValueUSD;
        cashFlow[cashFlow.length - 1].cumulativeCashFlow += residualValueUSD;
    }

    return {
        costs: {
            equipment: { usd: equipmentCostUSD, cny: equipmentCostUSD * exchangeRate },
            transport: { usd: transportCostUSD, cny: transportCostUSD * exchangeRate },
            insurance: { usd: insuranceCostUSD, cny: insuranceCostUSD * exchangeRate },
            customs: { usd: customsCostUSD, cny: customsCostUSD * exchangeRate },
            vat: { usd: vatCostUSD, cny: vatCostUSD * exchangeRate },
            maintenance: { usd: maintenanceCostUSD, cny: maintenanceCostCNY },
            total: { usd: totalCostUSD, cny: totalCostCNY }
        },
        income: {
            rental: { usd: totalRentalIncomeUSD, cny: totalRentalIncomeCNY },
            residual: { usd: residualValueUSD, cny: residualValueCNY },
            total: { usd: totalRentalIncomeUSD + residualValueUSD, cny: totalRentalIncomeCNY + residualValueCNY }
        },
        financial: {
            netProfit: { usd: netProfitUSD, cny: netProfitCNY },
            roi: roiPercent,
            annualizedROI,
            paybackPeriod,
            irr: irr * 100
        },
        cashFlow,
        metadata: {
            calculationTime: Date.now(),
            leaseTerm,
            exchangeRate,
            incoterms
        }
    };
}

// 敏感性分析
function runSensitivityAnalysis(params) {
    const { baseParams, analyzeParam, range, steps = 11 } = params;
    const results = [];
    const stepSize = (range * 2) / (steps - 1);
    
    for (let i = 0; i < steps; i++) {
        const variation = -range + (i * stepSize);
        const testParams = { ...baseParams };
        testParams[analyzeParam] = baseParams[analyzeParam] * (1 + variation / 100);
        
        const calculation = calculateLease(testParams);
        results.push({
            variation,
            paramValue: testParams[analyzeParam],
            roi: calculation.financial.roi,
            netProfit: calculation.financial.netProfit.usd,
            paybackPeriod: calculation.financial.paybackPeriod
        });
    }
    
    return {
        parameter: analyzeParam,
        baseValue: baseParams[analyzeParam],
        range,
        results,
        analysis: analyzeSensitivity(results, analyzeParam)
    };
}

// 批量计算
function batchCalculation(paramsList) {
    const results = [];
    const startTime = Date.now();
    
    paramsList.forEach((params, index) => {
        try {
            const calculation = calculateLease(params);
            results.push({
                index,
                success: true,
                result: calculation,
                params
            });
        } catch (error) {
            results.push({
                index,
                success: false,
                error: error.message,
                params
            });
        }
    });
    
    const endTime = Date.now();
    
    return {
        results,
        summary: {
            total: paramsList.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            processingTime: endTime - startTime
        }
    };
}

// 参数优化
function optimizeParameters(params) {
    const { baseParams, targetROI, constraints } = params;
    const optimizationResults = [];
    
    // 简单的网格搜索优化算法
    const parameters = ['monthlyRent', 'leaseTerm', 'residualValueRate'];
    const variations = [-0.2, -0.1, 0, 0.1, 0.2]; // ±20%变动
    
    for (const param1 of parameters) {
        for (const var1 of variations) {
            for (const param2 of parameters) {
                if (param2 === param1) continue;
                for (const var2 of variations) {
                    const testParams = { ...baseParams };
                    testParams[param1] = baseParams[param1] * (1 + var1);
                    testParams[param2] = baseParams[param2] * (1 + var2);
                    
                    // 检查约束条件
                    if (!validateConstraints(testParams, constraints)) continue;
                    
                    const calculation = calculateLease(testParams);
                    if (calculation.financial.roi >= targetROI) {
                        optimizationResults.push({
                            params: testParams,
                            roi: calculation.financial.roi,
                            adjustments: {
                                [param1]: var1 * 100,
                                [param2]: var2 * 100
                            }
                        });
                    }
                }
            }
        }
    }
    
    // 按ROI排序
    optimizationResults.sort((a, b) => b.roi - a.roi);
    
    return {
        targetROI,
        found: optimizationResults.length,
        bestOptions: optimizationResults.slice(0, 10), // 返回前10个最佳选项
        recommendations: generateOptimizationRecommendations(optimizationResults, baseParams)
    };
}

// 报告生成
function generateReport(params) {
    const { calculation, analysisData, reportType = 'comprehensive' } = params;
    const startTime = Date.now();
    
    const report = {
        header: {
            title: '租赁项目投资分析报告',
            generatedAt: new Date().toISOString(),
            reportType
        },
        executive: {
            roi: calculation.financial.roi,
            netProfit: calculation.financial.netProfit.usd,
            paybackPeriod: calculation.financial.paybackPeriod,
            recommendation: getInvestmentRecommendation(calculation.financial.roi)
        },
        financial: calculation.financial,
        costs: calculation.costs,
        income: calculation.income,
        cashFlow: calculation.cashFlow,
        risks: assessRisks(calculation),
        sensitivity: analysisData?.sensitivity || null,
        recommendations: generateRecommendations(calculation),
        metadata: {
            generationTime: Date.now() - startTime,
            calculationVersion: '2.0'
        }
    };
    
    return report;
}

// 辅助函数
function calculateIRR(cashFlows, guess = 0.1) {
    const maxIterations = 100;
    const precision = 0.000001;
    
    let rate = guess;
    
    for (let i = 0; i < maxIterations; i++) {
        let npv = 0;
        let dnpv = 0;
        
        for (let j = 0; j < cashFlows.length; j++) {
            npv += cashFlows[j] / Math.pow(1 + rate, j);
            dnpv -= j * cashFlows[j] / Math.pow(1 + rate, j + 1);
        }
        
        const newRate = rate - npv / dnpv;
        
        if (Math.abs(newRate - rate) < precision) {
            return newRate;
        }
        
        rate = newRate;
    }
    
    return rate;
}

function analyzeSensitivity(results, parameter) {
    const baseResult = results.find(r => Math.abs(r.variation) < 1);
    const maxROI = Math.max(...results.map(r => r.roi));
    const minROI = Math.min(...results.map(r => r.roi));
    const roiRange = maxROI - minROI;
    
    let riskLevel = 'LOW';
    if (roiRange > 20) riskLevel = 'HIGH';
    else if (roiRange > 10) riskLevel = 'MEDIUM';
    
    return {
        baseROI: baseResult?.roi || 0,
        maxROI,
        minROI,
        roiRange,
        riskLevel,
        coefficient: roiRange / 100, // 敏感性系数
        interpretation: getSensitivityInterpretation(riskLevel, parameter)
    };
}

function validateConstraints(params, constraints) {
    if (!constraints) return true;
    
    for (const [key, constraint] of Object.entries(constraints)) {
        const value = params[key];
        if (constraint.min !== undefined && value < constraint.min) return false;
        if (constraint.max !== undefined && value > constraint.max) return false;
    }
    return true;
}

function generateOptimizationRecommendations(results, baseParams) {
    if (results.length === 0) {
        return ['未找到满足目标ROI的参数组合，建议降低目标或调整约束条件'];
    }
    
    const recommendations = [];
    const bestResult = results[0];
    
    for (const [param, change] of Object.entries(bestResult.adjustments)) {
        if (Math.abs(change) > 1) {
            const direction = change > 0 ? '提高' : '降低';
            recommendations.push(`建议${direction}${param} ${Math.abs(change).toFixed(1)}%`);
        }
    }
    
    return recommendations;
}

function assessRisks(calculation) {
    const risks = [];
    const roi = calculation.financial.roi;
    const payback = calculation.financial.paybackPeriod;
    
    if (roi < 10) risks.push({ level: 'HIGH', message: '投资回报率偏低，存在投资风险' });
    if (payback > 24) risks.push({ level: 'MEDIUM', message: '回收期较长，资金占用时间久' });
    if (calculation.financial.irr < 0.1) risks.push({ level: 'MEDIUM', message: '内部收益率偏低' });
    
    return risks;
}

function getInvestmentRecommendation(roi) {
    if (roi > 20) return '强烈推荐';
    if (roi > 15) return '推荐';
    if (roi > 10) return '谨慎推荐';
    return '不推荐';
}

function generateRecommendations(calculation) {
    const recommendations = [];
    const roi = calculation.financial.roi;
    const payback = calculation.financial.paybackPeriod;
    
    if (payback > 18) {
        recommendations.push('建议提高月租金或延长租期以缩短投资回收期');
    }
    
    if (roi < 15) {
        recommendations.push('建议优化采购价格或提高租金水平以改善投资回报');
    }
    
    recommendations.push('定期关注汇率变动，必要时采用汇率对冲策略');
    recommendations.push('建议购买设备保险以降低意外损失风险');
    
    return recommendations;
}

function getSensitivityInterpretation(riskLevel, parameter) {
    const paramNames = {
        monthlyRent: '月租金',
        purchasePrice: '采购价格',
        exchangeRate: '汇率',
        leaseTerm: '租赁期限'
    };
    
    const name = paramNames[parameter] || parameter;
    
    switch (riskLevel) {
        case 'HIGH':
            return `${name}对项目收益影响很大，需要严格控制`;
        case 'MEDIUM':
            return `${name}对项目收益有一定影响，需要关注变动`;
        case 'LOW':
        default:
            return `${name}对项目收益影响相对较小，风险可控`;
    }
}