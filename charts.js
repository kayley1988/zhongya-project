/**
 * 中哈跨境机械设备租售测算 - 图表模块
 */

class ChartManager {
    constructor() {
        this.charts = {};
        this.colors = {
            primary: '#2563eb',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            info: '#06b6d4',
            purple: '#8b5cf6',
            pink: '#ec4899',
            gray: '#6b7280'
        };
        this.palette = [
            '#2563eb', '#10b981', '#f59e0b', '#ef4444', 
            '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280'
        ];
    }

    /**
     * 初始化所有图表
     */
    init() {
        this.initCostChart();
        this.initCashFlowChart();
        this.initCumulativeChart();
        this.initSensitivityChart();
        this.initPaybackChart();
    }

    /**
     * 成本结构图
     */
    initCostChart(type = 'bar') {
        const ctx = document.getElementById('costChart');
        if (!ctx) return;

        if (this.charts.cost) {
            this.charts.cost.destroy();
        }

        const labels = ['采购/折旧', '运输', '税费', '运营', '资金', '处置'];
        const data = [0, 0, 0, 0, 0, 0];

        const config = type === 'bar' ? {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: '成本构成 (CNY)',
                    data,
                    backgroundColor: this.palette.slice(0, 6),
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ¥${ctx.raw.toLocaleString()}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => '¥' + (value / 10000).toFixed(0) + '万'
                        }
                    }
                }
            }
        } : {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: this.palette.slice(0, 6),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 12, padding: 8, font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = ((ctx.raw / total) * 100).toFixed(1);
                                return `${ctx.label}: ¥${ctx.raw.toLocaleString()} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        };

        this.charts.cost = new Chart(ctx, config);
    }

    /**
     * 更新成本结构图
     */
    updateCostChart(costStructure, type = null, currency = 'CNY', exchangeRate = 65) {
        if (!this.charts.cost) return;

        const multiplier = currency === 'KZT' ? exchangeRate : 1;
        const prefix = currency === 'KZT' ? '₸' : '¥';

        const data = [
            (costStructure.purchase || 0) * multiplier,
            (costStructure.transport || 0) * multiplier,
            (costStructure.tax || 0) * multiplier,
            (costStructure.operating || 0) * multiplier,
            (costStructure.financing || 0) * multiplier,
            (costStructure.disposal || 0) * multiplier
        ];

        if (type && type !== this.charts.cost.config.type) {
            this.initCostChart(type);
        }

        this.charts.cost.data.datasets[0].data = data;
        
        // 更新标签和格式
        const divisor = currency === 'KZT' ? 100000 : 10000;
        if (this.charts.cost.options.scales?.y) {
            this.charts.cost.options.scales.y.ticks.callback = (value) => prefix + (value / divisor).toFixed(0) + '万';
        }
        this.charts.cost.options.plugins.tooltip.callbacks.label = (ctx) => {
            if (this.charts.cost.config.type === 'doughnut') {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((ctx.raw / total) * 100).toFixed(1);
                return `${ctx.label}: ${prefix}${ctx.raw.toLocaleString()} (${pct}%)`;
            }
            return `${ctx.dataset.label}: ${prefix}${ctx.raw.toLocaleString()}`;
        };
        
        this.charts.cost.update();
    }

    /**
     * 月度现金流图
     */
    initCashFlowChart() {
        const ctx = document.getElementById('cashFlowChart');
        if (!ctx) return;

        if (this.charts.cashflow) {
            this.charts.cashflow.destroy();
        }

        this.charts.cashflow = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: '收入',
                        data: [],
                        borderColor: this.colors.success,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: false,
                        tension: 0.3
                    },
                    {
                        label: '支出',
                        data: [],
                        borderColor: this.colors.danger,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: false,
                        tension: 0.3
                    },
                    {
                        label: '净额',
                        data: [],
                        borderColor: this.colors.primary,
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, padding: 10, font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ¥${ctx.raw.toLocaleString()}`
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => '¥' + (value / 10000).toFixed(0) + '万'
                        }
                    }
                }
            }
        });
    }

    /**
     * 更新月度现金流图
     */
    updateCashFlowChart(monthlyCashflows, currency = 'CNY', exchangeRate = 65) {
        if (!this.charts.cashflow) return;

        const multiplier = currency === 'KZT' ? exchangeRate : 1;
        const prefix = currency === 'KZT' ? '₸' : '¥';
        
        const labels = monthlyCashflows.map((m, i) => i === 0 ? '初始' : `第${i}月`);
        const incomes = monthlyCashflows.map(m => m.income * multiplier);
        const expenses = monthlyCashflows.map(m => m.expense * multiplier);
        const nets = monthlyCashflows.map(m => m.net * multiplier);

        this.charts.cashflow.data.labels = labels;
        this.charts.cashflow.data.datasets[0].data = incomes;
        this.charts.cashflow.data.datasets[1].data = expenses;
        this.charts.cashflow.data.datasets[2].data = nets;

        this.charts.cashflow.options.plugins.tooltip.callbacks.label = (ctx) => 
            `${ctx.dataset.label}: ${prefix}${ctx.raw.toLocaleString()}`;
        this.charts.cashflow.options.scales.y.ticks.callback = (value) => 
            prefix + (value / (currency === 'KZT' ? 100000 : 10000)).toFixed(0) + '万';

        this.charts.cashflow.update();
    }

    /**
     * 累计现金流图
     */
    initCumulativeChart() {
        const ctx = document.getElementById('cumulativeChart');
        if (!ctx) return;

        if (this.charts.cumulative) {
            this.charts.cumulative.destroy();
        }

        this.charts.cumulative = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: '累计现金流（基准）',
                        data: [],
                        borderColor: this.colors.primary,
                        backgroundColor: (ctx) => {
                            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 250);
                            gradient.addColorStop(0, 'rgba(37, 99, 235, 0.3)');
                            gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');
                            return gradient;
                        },
                        fill: true,
                        tension: 0.3,
                        borderWidth: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, padding: 10, font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ¥${ctx.raw.toLocaleString()}`
                        }
                    },
                    annotation: {
                        annotations: {
                            zeroline: {
                                type: 'line',
                                yMin: 0,
                                yMax: 0,
                                borderColor: 'rgba(0, 0, 0, 0.3)',
                                borderWidth: 2,
                                borderDash: [5, 5]
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => '¥' + (value / 10000).toFixed(0) + '万'
                        }
                    }
                }
            }
        });
    }

    /**
     * 更新累计现金流图
     */
    updateCumulativeChart(cumulativeCashflows, paybackMonth, showScenarios = false, scenarios = null, currency = 'CNY', exchangeRate = 65) {
        if (!this.charts.cumulative) return;

        const multiplier = currency === 'KZT' ? exchangeRate : 1;
        const prefix = currency === 'KZT' ? '₸' : '¥';
        const divisor = currency === 'KZT' ? 100000 : 10000;

        const labels = cumulativeCashflows.map((_, i) => i === 0 ? '初始' : `第${i}月`);
        const data = cumulativeCashflows.map(v => v * multiplier);
        
        this.charts.cumulative.data.labels = labels;
        this.charts.cumulative.data.datasets[0].data = data;
        this.charts.cumulative.data.datasets[0].label = '累计现金流（基准）';

        // 移除其他情景数据集
        while (this.charts.cumulative.data.datasets.length > 1) {
            this.charts.cumulative.data.datasets.pop();
        }

        // 添加情景对比
        if (showScenarios && scenarios) {
            if (scenarios.optimistic) {
                this.charts.cumulative.data.datasets.push({
                    label: '乐观情景',
                    data: scenarios.optimistic.cashflow.cumulative.map(v => v * multiplier),
                    borderColor: this.colors.success,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.3
                });
            }
            if (scenarios.conservative) {
                this.charts.cumulative.data.datasets.push({
                    label: '保守情景',
                    data: scenarios.conservative.cashflow.cumulative.map(v => v * multiplier),
                    borderColor: this.colors.danger,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.3
                });
            }
        }

        // 更新Y轴格式
        this.charts.cumulative.options.scales.y.ticks.callback = (value) => prefix + (value / divisor).toFixed(0) + '万';
        this.charts.cumulative.options.plugins.tooltip.callbacks.label = (ctx) => 
            `${ctx.dataset.label}: ${prefix}${ctx.raw.toLocaleString()}`;

        // 更新回本点标注
        if (paybackMonth > 0) {
            this.charts.cumulative.options.plugins.annotation = {
                annotations: {
                    zeroline: {
                        type: 'line',
                        yMin: 0,
                        yMax: 0,
                        borderColor: 'rgba(0, 0, 0, 0.3)',
                        borderWidth: 2,
                        borderDash: [5, 5]
                    },
                    paybackPoint: {
                        type: 'point',
                        xValue: paybackMonth,
                        yValue: 0,
                        backgroundColor: this.colors.success,
                        radius: 8,
                        borderWidth: 2,
                        borderColor: '#fff'
                    },
                    paybackLabel: {
                        type: 'label',
                        xValue: paybackMonth,
                        yValue: 0,
                        content: [`回本点: 第${paybackMonth}月`],
                        backgroundColor: 'rgba(16, 185, 129, 0.9)',
                        color: '#fff',
                        padding: 6,
                        borderRadius: 4,
                        yAdjust: -30,
                        font: { size: 11, weight: 'bold' }
                    }
                }
            };
        }

        this.charts.cumulative.update();
    }

    /**
     * 敏感性分析图
     */
    initSensitivityChart() {
        const ctx = document.getElementById('sensitivityChart');
        if (!ctx) return;

        if (this.charts.sensitivity) {
            this.charts.sensitivity.destroy();
        }

        this.charts.sensitivity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '目标值变化',
                    data: [],
                    borderColor: this.colors.primary,
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 3,
                    pointBackgroundColor: this.colors.primary,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (ctx) => `变量变化: ${ctx[0].label}`,
                            label: (ctx) => `目标值: ${ctx.raw.toLocaleString()}`
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '变量变化幅度 (%)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '目标值'
                        },
                        ticks: {
                            callback: (value) => value.toLocaleString()
                        }
                    }
                }
            }
        });
    }

    /**
     * 更新敏感性分析图
     */
    updateSensitivityChart(sensitivityData, targetLabel, variableLabel) {
        if (!this.charts.sensitivity) return;

        const labels = sensitivityData.map(d => `${d.change > 0 ? '+' : ''}${d.change}%`);
        const values = sensitivityData.map(d => d.value);

        // 计算颜色渐变（基于是否为正值）
        const baselineIndex = sensitivityData.findIndex(d => d.change === 0);
        const baselineValue = sensitivityData[baselineIndex]?.value || 0;

        this.charts.sensitivity.data.labels = labels;
        this.charts.sensitivity.data.datasets[0].data = values;
        this.charts.sensitivity.data.datasets[0].label = targetLabel;

        // 根据目标设置Y轴格式
        if (targetLabel.includes('利润')) {
            this.charts.sensitivity.options.scales.y.ticks.callback = (value) => 
                '¥' + (value / 10000).toFixed(0) + '万';
        } else if (targetLabel.includes('IRR')) {
            this.charts.sensitivity.options.scales.y.ticks.callback = (value) => 
                value.toFixed(1) + '%';
        } else {
            this.charts.sensitivity.options.scales.y.ticks.callback = (value) => 
                value.toFixed(0) + '月';
        }

        this.charts.sensitivity.options.scales.x.title.text = `${variableLabel}变化幅度 (%)`;
        this.charts.sensitivity.options.scales.y.title.text = targetLabel;

        // 添加基准线标注
        this.charts.sensitivity.options.plugins.annotation = {
            annotations: {
                baseline: {
                    type: 'line',
                    xMin: baselineIndex,
                    xMax: baselineIndex,
                    borderColor: this.colors.warning,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    label: {
                        content: '基准',
                        enabled: true,
                        position: 'start'
                    }
                }
            }
        };

        this.charts.sensitivity.update();
    }

    /**
     * 双回本曲线图 (PB1 vs PB2)
     */
    initPaybackChart() {
        const ctx = document.getElementById('paybackChart');
        if (!ctx) return;

        if (this.charts.payback) {
            this.charts.payback.destroy();
        }

        this.charts.payback = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'PB1 项目累计现金流',
                        data: [],
                        borderColor: this.colors.primary,
                        backgroundColor: (ctx) => {
                            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
                            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
                            gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
                            return gradient;
                        },
                        fill: true,
                        tension: 0.3,
                        borderWidth: 3
                    },
                    {
                        label: 'PB2 股东累计现金流',
                        data: [],
                        borderColor: this.colors.warning,
                        backgroundColor: (ctx) => {
                            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
                            gradient.addColorStop(0, 'rgba(245, 158, 11, 0.3)');
                            gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
                            return gradient;
                        },
                        fill: true,
                        tension: 0.3,
                        borderWidth: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, padding: 10, font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ¥${ctx.raw.toLocaleString()}`
                        }
                    },
                    annotation: {
                        annotations: {
                            zeroline: {
                                type: 'line',
                                yMin: 0,
                                yMax: 0,
                                borderColor: 'rgba(0, 0, 0, 0.4)',
                                borderWidth: 2,
                                borderDash: [6, 4]
                            },
                            threshold24: {
                                type: 'line',
                                xMin: 24,
                                xMax: 24,
                                borderColor: 'rgba(239, 68, 68, 0.6)',
                                borderWidth: 2,
                                borderDash: [4, 4],
                                label: {
                                    content: '24月达标线',
                                    enabled: true,
                                    position: 'start',
                                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                                    color: '#fff',
                                    font: { size: 10 }
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '月份'
                        }
                    },
                    y: {
                        ticks: {
                            callback: (value) => '¥' + (value / 10000).toFixed(0) + '万'
                        },
                        title: {
                            display: true,
                            text: '累计现金流 (CNY)'
                        }
                    }
                }
            }
        });
    }

    /**
     * 更新双回本曲线图
     */
    updatePaybackChart(pb1Cumulative, pb2Cumulative, pb1Month, pb2Month, currency = 'CNY', exchangeRate = 65) {
        if (!this.charts.payback) return;

        const multiplier = currency === 'KZT' ? exchangeRate : 1;
        const prefix = currency === 'KZT' ? '₸' : '¥';
        const divisor = currency === 'KZT' ? 100000 : 10000;

        const maxLen = Math.max(pb1Cumulative.length, pb2Cumulative.length);
        const labels = Array.from({ length: maxLen }, (_, i) => i === 0 ? '初始' : `第${i}月`);
        
        this.charts.payback.data.labels = labels;
        this.charts.payback.data.datasets[0].data = pb1Cumulative.map(v => v * multiplier);
        this.charts.payback.data.datasets[1].data = pb2Cumulative.map(v => v * multiplier);

        // 更新Y轴格式
        this.charts.payback.options.scales.y.ticks.callback = (value) => prefix + (value / divisor).toFixed(0) + '万';
        this.charts.payback.options.plugins.tooltip.callbacks.label = (ctx) => 
            `${ctx.dataset.label}: ${prefix}${ctx.raw.toLocaleString()}`;

        // 更新回本点标注
        const annotations = {
            zeroline: {
                type: 'line',
                yMin: 0,
                yMax: 0,
                borderColor: 'rgba(0, 0, 0, 0.4)',
                borderWidth: 2,
                borderDash: [6, 4]
            },
            threshold24: {
                type: 'line',
                xMin: 24,
                xMax: 24,
                borderColor: 'rgba(239, 68, 68, 0.5)',
                borderWidth: 2,
                borderDash: [4, 4],
                label: {
                    content: '24月达标线',
                    enabled: true,
                    position: 'start',
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    color: '#fff',
                    font: { size: 10 }
                }
            }
        };

        // PB1回本点
        if (pb1Month > 0 && pb1Month < maxLen) {
            annotations.pb1Point = {
                type: 'point',
                xValue: pb1Month,
                yValue: 0,
                backgroundColor: this.colors.primary,
                radius: 8,
                borderWidth: 3,
                borderColor: '#fff'
            };
            annotations.pb1Label = {
                type: 'label',
                xValue: pb1Month,
                yValue: 0,
                content: [`PB1: ${pb1Month}月`],
                backgroundColor: this.colors.primary,
                color: '#fff',
                font: { size: 11, weight: 'bold' },
                padding: 4,
                yAdjust: -25
            };
        }

        // PB2回本点
        if (pb2Month > 0 && pb2Month < maxLen) {
            annotations.pb2Point = {
                type: 'point',
                xValue: pb2Month,
                yValue: 0,
                backgroundColor: this.colors.warning,
                radius: 8,
                borderWidth: 3,
                borderColor: '#fff'
            };
            annotations.pb2Label = {
                type: 'label',
                xValue: pb2Month,
                yValue: 0,
                content: [`PB2: ${pb2Month}月`],
                backgroundColor: this.colors.warning,
                color: '#fff',
                font: { size: 11, weight: 'bold' },
                padding: 4,
                yAdjust: 25
            };
        }

        this.charts.payback.options.plugins.annotation.annotations = annotations;
        this.charts.payback.update();
    }

    /**
     * 销毁所有图表
     */
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }
}

// 导出
window.ChartManager = ChartManager;
