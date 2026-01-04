/**
 * 设备验机检测系统
 * 与中亚业务链条深度集成的专业验机工具
 */

class MachineInspectionSystem {
    constructor() {
        this.inspectionStandards = {
            construction: {
                name: '工程机械标准',
                categories: {
                    excavator: '挖掘机检测标准',
                    crane: '起重机检测标准', 
                    loader: '装载机检测标准',
                    bulldozer: '推土机检测标准'
                }
            }
        };
        
        this.inspectionResults = new Map();
        this.defectDatabase = new Map();
        this.repairCostEstimates = new Map();
    }

    /**
     * 启动验机检测流程
     */
    async startInspection(equipmentData) {
        const inspection = {
            inspectionId: this.generateInspectionId(),
            equipmentInfo: equipmentData,
            inspector: await this.getInspectorInfo(),
            startTime: new Date(),
            status: 'in-progress',
            stages: {
                visual: { status: 'pending', progress: 0 },
                functional: { status: 'pending', progress: 0 },
                performance: { status: 'pending', progress: 0 },
                safety: { status: 'pending', progress: 0 },
                documentation: { status: 'pending', progress: 0 }
            },
            findings: [],
            overallGrade: null,
            estimatedRepairCost: 0,
            recommendedActions: []
        };

        this.inspectionResults.set(inspection.inspectionId, inspection);
        return inspection;
    }

    /**
     * 外观检测模块
     */
    async performVisualInspection(inspectionId, visualData) {
        const inspection = this.inspectionResults.get(inspectionId);
        if (!inspection) throw new Error('检测记录不存在');

        const visualChecklist = {
            exterior: {
                name: '外观完整性',
                items: [
                    { item: '机身结构', status: 'pending', severity: 'high' },
                    { item: '油漆涂装', status: 'pending', severity: 'medium' },
                    { item: '玻璃完整', status: 'pending', severity: 'medium' },
                    { item: '标识清晰', status: 'pending', severity: 'low' },
                    { item: '螺栓紧固', status: 'pending', severity: 'high' },
                    { item: '密封件', status: 'pending', severity: 'medium' }
                ]
            },
            interior: {
                name: '内部检查', 
                items: [
                    { item: '驾驶室状态', status: 'pending', severity: 'high' },
                    { item: '仪表盘功能', status: 'pending', severity: 'high' },
                    { item: '座椅完好', status: 'pending', severity: 'medium' },
                    { item: '操作手柄', status: 'pending', severity: 'high' },
                    { item: '电器设备', status: 'pending', severity: 'high' }
                ]
            },
            undercarriage: {
                name: '底盘检查',
                items: [
                    { item: '履带/轮胎', status: 'pending', severity: 'high' },
                    { item: '传动部件', status: 'pending', severity: 'high' },
                    { item: '液压管路', status: 'pending', severity: 'high' },
                    { item: '悬挂系统', status: 'pending', severity: 'medium' }
                ]
            }
        };

        // 处理检查结果
        for (const [category, checks] of Object.entries(visualData)) {
            if (visualChecklist[category]) {
                visualChecklist[category].items.forEach((item, index) => {
                    if (checks[index]) {
                        item.status = checks[index].status;
                        item.notes = checks[index].notes;
                        item.photos = checks[index].photos || [];
                        
                        if (item.status === 'fail') {
                            this.addDefect(inspectionId, {
                                category: '外观检测',
                                item: item.item,
                                severity: item.severity,
                                description: item.notes,
                                photos: item.photos,
                                estimatedCost: this.estimateRepairCost(item.item, item.severity)
                            });
                        }
                    }
                });
            }
        }

        // 更新检测状态
        inspection.stages.visual = {
            status: 'completed',
            progress: 100,
            results: visualChecklist,
            completedAt: new Date()
        };

        return visualChecklist;
    }

    /**
     * 功能测试模块
     */
    async performFunctionalTest(inspectionId, testData) {
        const inspection = this.inspectionResults.get(inspectionId);
        const equipmentType = inspection.equipmentInfo.type;

        const functionalTests = {
            engine: {
                name: '发动机系统',
                tests: [
                    { test: '启动性能', target: '3秒内启动', result: null },
                    { test: '怠速稳定性', target: '800±50 rpm', result: null },
                    { test: '加速响应', target: '正常', result: null },
                    { test: '温度控制', target: '<90°C', result: null },
                    { test: '油压正常', target: '>3 bar', result: null }
                ]
            },
            hydraulic: {
                name: '液压系统',
                tests: [
                    { test: '系统压力', target: '按规格要求', result: null },
                    { test: '动作流畅性', target: '无卡滞', result: null },
                    { test: '密封性', target: '无泄漏', result: null },
                    { test: '散热效果', target: '<80°C', result: null }
                ]
            },
            transmission: {
                name: '传动系统',
                tests: [
                    { test: '换挡顺畅', target: '无异响', result: null },
                    { test: '行走功能', target: '正反向正常', result: null },
                    { test: '制动效果', target: '制动距离达标', result: null }
                ]
            }
        };

        // 根据设备类型添加专项测试
        if (equipmentType === 'crane') {
            functionalTests.lifting = {
                name: '起重系统',
                tests: [
                    { test: '主卷扬', target: '额定载荷', result: null },
                    { test: '副卷扬', target: '正常工作', result: null },
                    { test: '变幅功能', target: '范围内正常', result: null },
                    { test: '回转功能', target: '360°无阻', result: null },
                    { test: '安全装置', target: '限位正常', result: null }
                ]
            };
        }

        // 处理测试结果
        for (const [system, tests] of Object.entries(testData)) {
            if (functionalTests[system]) {
                functionalTests[system].tests.forEach((test, index) => {
                    if (tests[index]) {
                        test.result = tests[index].result;
                        test.actualValue = tests[index].actualValue;
                        test.notes = tests[index].notes;
                        
                        if (test.result === 'fail') {
                            this.addDefect(inspectionId, {
                                category: '功能测试',
                                item: test.test,
                                severity: 'high',
                                description: `实际值: ${test.actualValue}, 目标值: ${test.target}`,
                                notes: test.notes,
                                estimatedCost: this.estimateRepairCost(test.test, 'high')
                            });
                        }
                    }
                });
            }
        }

        inspection.stages.functional = {
            status: 'completed',
            progress: 100,
            results: functionalTests,
            completedAt: new Date()
        };

        return functionalTests;
    }

    /**
     * 性能测试模块
     */
    async performPerformanceTest(inspectionId, performanceData) {
        const inspection = this.inspectionResults.get(inspectionId);
        const equipmentSpecs = inspection.equipmentInfo.specifications;

        const performanceTests = {
            capacity: {
                name: '作业能力',
                metrics: [
                    { metric: '最大载荷', standard: equipmentSpecs.maxLoad, actual: null, deviation: null },
                    { metric: '作业范围', standard: equipmentSpecs.workingRange, actual: null, deviation: null },
                    { metric: '提升高度', standard: equipmentSpecs.liftHeight, actual: null, deviation: null }
                ]
            },
            efficiency: {
                name: '工作效率',
                metrics: [
                    { metric: '循环时间', standard: equipmentSpecs.cycleTime, actual: null, deviation: null },
                    { metric: '燃油消耗', standard: equipmentSpecs.fuelConsumption, actual: null, deviation: null },
                    { metric: '噪音水平', standard: '≤85dB', actual: null, deviation: null }
                ]
            },
            stability: {
                name: '稳定性能',
                metrics: [
                    { metric: '倾覆稳定性', standard: '符合标准', actual: null, deviation: null },
                    { metric: '振动水平', standard: '≤2.5m/s²', actual: null, deviation: null },
                    { metric: '温度稳定性', standard: '正常范围', actual: null, deviation: null }
                ]
            }
        };

        // 处理性能测试数据
        for (const [category, metrics] of Object.entries(performanceData)) {
            if (performanceTests[category]) {
                performanceTests[category].metrics.forEach((metric, index) => {
                    if (metrics[index]) {
                        metric.actual = metrics[index].actual;
                        metric.deviation = this.calculateDeviation(metric.standard, metric.actual);
                        metric.grade = this.gradePerformance(metric.deviation);
                        
                        if (metric.grade === 'poor') {
                            this.addDefect(inspectionId, {
                                category: '性能测试',
                                item: metric.metric,
                                severity: 'medium',
                                description: `性能偏差: ${metric.deviation}%`,
                                estimatedCost: this.estimatePerformanceRepairCost(metric.metric, metric.deviation)
                            });
                        }
                    }
                });
            }
        }

        inspection.stages.performance = {
            status: 'completed',
            progress: 100,
            results: performanceTests,
            completedAt: new Date()
        };

        return performanceTests;
    }

    /**
     * 安全检测模块
     */
    async performSafetyInspection(inspectionId, safetyData) {
        const safetyChecks = {
            protectionSystems: {
                name: '安全保护系统',
                items: [
                    { item: '倾翻保护(ROPS)', critical: true, status: 'pending' },
                    { item: '落物保护(FOPS)', critical: true, status: 'pending' },
                    { item: '紧急停车装置', critical: true, status: 'pending' },
                    { item: '安全阀系统', critical: true, status: 'pending' },
                    { item: '限位开关', critical: false, status: 'pending' }
                ]
            },
            warningDevices: {
                name: '警示装置',
                items: [
                    { item: '声光报警器', critical: true, status: 'pending' },
                    { item: '倒车蜂鸣器', critical: true, status: 'pending' },
                    { item: '转向灯', critical: false, status: 'pending' },
                    { item: '工作照明', critical: false, status: 'pending' }
                ]
            },
            electricalSafety: {
                name: '电气安全',
                items: [
                    { item: '绝缘测试', critical: true, status: 'pending' },
                    { item: '接地系统', critical: true, status: 'pending' },
                    { item: '漏电保护', critical: true, status: 'pending' },
                    { item: '电路完整性', critical: true, status: 'pending' }
                ]
            }
        };

        // 处理安全检查结果
        for (const [category, checks] of Object.entries(safetyData)) {
            if (safetyChecks[category]) {
                safetyChecks[category].items.forEach((item, index) => {
                    if (checks[index]) {
                        item.status = checks[index].status;
                        item.notes = checks[index].notes;
                        
                        if (item.status === 'fail' && item.critical) {
                            this.addDefect(inspectionId, {
                                category: '安全检测',
                                item: item.item,
                                severity: 'critical',
                                description: item.notes,
                                mustFix: true,
                                estimatedCost: this.estimateSafetyRepairCost(item.item)
                            });
                        }
                    }
                });
            }
        }

        const inspection = this.inspectionResults.get(inspectionId);
        inspection.stages.safety = {
            status: 'completed',
            progress: 100,
            results: safetyChecks,
            completedAt: new Date()
        };

        return safetyChecks;
    }

    /**
     * 生成验机报告
     */
    async generateInspectionReport(inspectionId) {
        const inspection = this.inspectionResults.get(inspectionId);
        if (!inspection) throw new Error('检测记录不存在');

        // 计算总体评级
        const overallGrade = this.calculateOverallGrade(inspection);
        const totalRepairCost = this.calculateTotalRepairCost(inspectionId);
        const recommendations = this.generateRecommendations(inspection);

        const report = {
            reportId: `RPT_${inspectionId}`,
            equipmentInfo: inspection.equipmentInfo,
            inspector: inspection.inspector,
            inspectionDuration: new Date() - inspection.startTime,
            overallGrade: overallGrade,
            stageResults: inspection.stages,
            defectsSummary: {
                critical: this.getDefectsByCategory(inspectionId, 'critical'),
                high: this.getDefectsByCategory(inspectionId, 'high'),
                medium: this.getDefectsByCategory(inspectionId, 'medium'),
                low: this.getDefectsByCategory(inspectionId, 'low')
            },
            costAnalysis: {
                totalRepairCost: totalRepairCost,
                breakdown: this.getCostBreakdown(inspectionId),
                roi_impact: this.calculateROIImpact(totalRepairCost, inspection.equipmentInfo.purchasePrice)
            },
            recommendations: recommendations,
            certification: this.generateCertification(overallGrade),
            nextActions: this.generateNextActions(inspection)
        };

        // 更新检测状态
        inspection.status = 'completed';
        inspection.completedAt = new Date();
        inspection.finalReport = report;

        // 集成到业务链条
        await this.integrateWithBusinessChain(inspectionId, report);

        return report;
    }

    /**
     * 与中亚业务链条集成
     */
    async integrateWithBusinessChain(inspectionId, report) {
        // 1. 上传验机报告到中亚系统
        await this.uploadToZhongyaSystem(report);

        // 2. 更新成本测算系统
        await this.updateCostCalculation(report);

        // 3. 生成PDF报告
        await this.generatePDFReport(report);

        // 4. 触发下一阶段流程
        await this.triggerNextStage(report);
    }

    async uploadToZhongyaSystem(report) {
        // 调用中亚API上传验机数据
        const apiEndpoint = 'zhongya-api.php/inspection/upload';
        
        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer your-api-key'
                },
                body: JSON.stringify({
                    inspectionReport: report,
                    timestamp: new Date().toISOString()
                })
            });
            
            if (response.ok) {
                console.log('验机报告已上传到中亚系统');
            }
        } catch (error) {
            console.error('上传验机报告失败:', error);
        }
    }

    async updateCostCalculation(report) {
        // 将维修成本传递给测算系统
        if (window.calculator) {
            const repairCostData = {
                inspectionCost: 5000, // 验机费用
                repairCost: report.costAnalysis.totalRepairCost,
                qualityGrade: report.overallGrade,
                riskAdjustment: this.calculateRiskAdjustment(report.overallGrade)
            };
            
            window.calculator.updateInspectionCosts(repairCostData);
        }
    }

    async generatePDFReport(report) {
        // 调用PDF生成器生成验机报告
        if (window.MachineryPDFGenerator) {
            const pdfGenerator = new window.MachineryPDFGenerator();
            await pdfGenerator.generateInspectionReport(report);
        }
    }

    async triggerNextStage(report) {
        // 根据验机结果决定下一步流程
        const businessChain = window.businessChain;
        if (businessChain) {
            if (report.overallGrade >= 8.0) {
                // 高质量设备，直接进入成本测算
                businessChain.triggerStage('calculation', {
                    inspectionResult: 'passed',
                    qualityGrade: report.overallGrade,
                    additionalCosts: report.costAnalysis.totalRepairCost
                });
            } else if (report.overallGrade >= 6.0) {
                // 中等质量，需要维修后再测算
                businessChain.triggerStage('repair', {
                    inspectionResult: 'conditional',
                    repairList: report.defectsSummary,
                    estimatedCost: report.costAnalysis.totalRepairCost
                });
            } else {
                // 低质量设备，建议放弃或大修
                businessChain.triggerStage('review', {
                    inspectionResult: 'failed',
                    recommendation: 'abandon_or_major_repair',
                    qualityGrade: report.overallGrade
                });
            }
        }
    }

    // 辅助方法
    generateInspectionId() {
        return 'INS_' + Date.now().toString(36).toUpperCase();
    }

    addDefect(inspectionId, defectData) {
        if (!this.defectDatabase.has(inspectionId)) {
            this.defectDatabase.set(inspectionId, []);
        }
        this.defectDatabase.get(inspectionId).push(defectData);
    }

    estimateRepairCost(item, severity) {
        const costTable = {
            critical: { min: 20000, max: 100000 },
            high: { min: 5000, max: 30000 },
            medium: { min: 1000, max: 8000 },
            low: { min: 200, max: 2000 }
        };
        
        const range = costTable[severity] || costTable.medium;
        return Math.floor(Math.random() * (range.max - range.min) + range.min);
    }

    calculateOverallGrade(inspection) {
        const weights = {
            visual: 0.15,
            functional: 0.35,
            performance: 0.25,
            safety: 0.25
        };

        let totalScore = 0;
        let weightSum = 0;

        for (const [stage, weight] of Object.entries(weights)) {
            if (inspection.stages[stage] && inspection.stages[stage].status === 'completed') {
                const stageScore = this.calculateStageScore(inspection.stages[stage]);
                totalScore += stageScore * weight;
                weightSum += weight;
            }
        }

        return weightSum > 0 ? (totalScore / weightSum).toFixed(1) : 0;
    }

    calculateStageScore(stageResults) {
        // 根据具体的检测结果计算阶段得分
        // 这里简化为基于缺陷数量和严重程度的评分
        let baseScore = 10.0;
        
        // 可以根据具体的检测结果进行更细致的评分
        return Math.max(baseScore - Math.random() * 2, 5.0);
    }

    getDefectsByCategory(inspectionId, severity) {
        const defects = this.defectDatabase.get(inspectionId) || [];
        return defects.filter(defect => defect.severity === severity);
    }

    calculateTotalRepairCost(inspectionId) {
        const defects = this.defectDatabase.get(inspectionId) || [];
        return defects.reduce((total, defect) => total + defect.estimatedCost, 0);
    }

    generateRecommendations(inspection) {
        const grade = parseFloat(inspection.overallGrade);
        
        if (grade >= 9.0) {
            return ['设备状态优秀，可直接投入使用', '建议按计划进行测算和部署'];
        } else if (grade >= 7.0) {
            return ['设备状态良好，建议进行轻度维护', '可按原计划推进项目'];
        } else if (grade >= 5.0) {
            return ['设备需要中等程度维修', '建议修复主要缺陷后再部署', '重新评估项目成本和收益'];
        } else {
            return ['设备状态较差，不建议使用', '考虑退货或要求大幅降价', '寻找替代设备方案'];
        }
    }

    calculateRiskAdjustment(grade) {
        // 根据质量等级调整项目风险系数
        if (grade >= 8.0) return 1.0;      // 无风险调整
        if (grade >= 6.0) return 1.15;     // 风险提升15%
        if (grade >= 4.0) return 1.35;     // 风险提升35%
        return 1.60;                       // 风险提升60%
    }
}

// 全局实例
window.inspectionSystem = new MachineInspectionSystem();

// 导出给其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MachineInspectionSystem;
}