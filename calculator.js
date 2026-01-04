/**
 * 中哈跨境机械设备租售测算 - 计算引擎
 */

class Calculator {
    constructor() {
        this.data = {};
        this.results = {};
        this.scenarios = {
            optimistic: { 
                rentMultiplier: 1.10,      // 租金+10%（客户接受更高价格）
                freightMultiplier: 0.85,   // 运费-15%（物流优化）
                exchangeMultiplier: 0.92,  // 汇率-8%（坚戈升值，有利于CNY收入）
                taxMultiplier: 0.90,       // 税费-10%（享受优惠政策）
                operatingMultiplier: 0.85  // 运营成本-15%（效率提升）
            },
            baseline: { 
                rentMultiplier: 1.0, 
                freightMultiplier: 1.0, 
                exchangeMultiplier: 1.0,
                taxMultiplier: 1.0,
                operatingMultiplier: 1.0
            },
            conservative: { 
                rentMultiplier: 0.85,      // 租金-15%（市场竞争激烈）
                freightMultiplier: 1.25,   // 运费+25%（物流紧张）
                exchangeMultiplier: 1.15,  // 汇率+15%（坚戈贬值）
                taxMultiplier: 1.10,       // 税费+10%（政策收紧）
                operatingMultiplier: 1.20  // 运营成本+20%（通胀压力）
            }
        };
    }

    /**
     * 从表单收集所有输入数据
     */
    collectData() {
        const getValue = (id, defaultVal = 0) => {
            const el = document.getElementById(id);
            if (!el) return defaultVal;
            if (el.type === 'checkbox') return el.checked;
            return parseFloat(el.value) || defaultVal;
        };

        const getString = (id, defaultVal = '') => {
            const el = document.getElementById(id);
            return el ? el.value : defaultVal;
        };

        this.data = {
            // B1 项目信息
            equipmentModel: getString('equipmentModel'),
            quantity: getValue('quantity', 1),
            leaseTerm: getValue('leaseTerm', 12),
            projectLocation: getString('projectLocation', 'almaty'),

            // B2 收入参数
            monthlyRent: getValue('monthlyRent', 50000),
            installationFee: getValue('installationFee', 5000),
            maintenanceServiceFee: getValue('maintenanceServiceFee', 10000),
            endSalePrice: getValue('endSalePrice', 0),
            disposalFeeRate: getValue('disposalFeeRate', 3) / 100,

            // B3 采购与残值
            purchasePrice: getValue('purchasePrice', 800000),
            economicLife: getValue('economicLife', 10),
            continuingOperationMethod: getString('continuingOperationMethod', 'accounting'),
            residualValueRate: getValue('residualValueRate', 10) / 100,

            // B4 跨境运输与保险
            domesticFreight: getValue('domesticFreight', 15000),
            internationalFreight: getValue('internationalFreight', 25000),
            portCharges: getValue('portCharges', 8000),
            insuranceRate: getValue('insuranceRate', 0.8) / 100,
            insuranceBase: getString('insuranceBase', 'equipment'),
            customsAgentFee: getValue('customsAgentFee', 3000),

            // B5 税费
            taxBasis: getString('taxBasis', 'CIF'),
            includeFreight: getValue('includeFreight', true),
            includeInsurance: getValue('includeInsurance', true),
            tariffRate: getValue('tariffRate', 5) / 100,
            vatRate: getValue('vatRate', 12) / 100,
            tariffExempt: getValue('tariffExempt', false),
            vatDeductible: getValue('vatDeductible', false),
            vatDeductRate: getValue('vatDeductRate', 100) / 100,

            // B6 运营与维保
            annualMaintenance: getValue('annualMaintenance', 20000),
            localParts: getValue('localParts', 15000),
            localServiceFee: getValue('localServiceFee', 10000),
            otherOperatingCost: getValue('otherOperatingCost', 5000),

            // B7 资金与融资
            paymentMode: window.appState?.paymentMode || 'full',
            purchaseAdvanceRate: getValue('purchaseAdvanceRate', 100) / 100,
            freightTaxAdvanceRate: getValue('freightTaxAdvanceRate', 100) / 100,
            advancePeriod: getValue('advancePeriod', 3),
            capitalCostRate: getValue('capitalCostRate', 6) / 100,
            downPaymentRate: getValue('downPaymentRate', 30) / 100,
            financingRate: getValue('financingRate', 8) / 100,
            financingTerm: getValue('financingTerm', 24),
            repaymentMethod: getString('repaymentMethod', 'equal'),
            handlingFeeRate: getValue('handlingFeeRate', 1) / 100,

            // 汇率
            rentCurrency: getString('rentCurrency', 'CNY'),
            exchangeRate: getValue('exchangeRate', 65),
            exchangeVolatility: getValue('exchangeVolatility', 5) / 100,

            // 业务模式
            businessMode: window.appState?.businessMode || 'lease',
            scenario: window.appState?.scenario || 'baseline'
        };

        return this.data;
    }

    /**
     * 执行全部计算
     */
    calculate() {
        this.collectData();
        const d = this.data;
        const scenario = this.scenarios[d.scenario];

        // ========== 1. 收入计算 ==========
        const monthlyRentAdjusted = d.monthlyRent * scenario.rentMultiplier;
        const totalRentRevenue = monthlyRentAdjusted * d.leaseTerm * d.quantity;
        const installationRevenue = d.installationFee * d.quantity;
        const serviceRevenue = d.maintenanceServiceFee * (d.leaseTerm / 12) * d.quantity;
        
        let disposalRevenue = 0;
        let disposalCost = 0;
        if (d.businessMode === 'lease-to-sell' && d.endSalePrice > 0) {
            disposalRevenue = d.endSalePrice * d.quantity;
            disposalCost = disposalRevenue * d.disposalFeeRate;
        }

        const totalRevenue = totalRentRevenue + installationRevenue + serviceRevenue + disposalRevenue;

        // ========== 2. 采购与折旧 ==========
        const totalPurchaseCost = d.purchasePrice * d.quantity;
        const annualDepreciation = totalPurchaseCost * (1 - d.residualValueRate) / d.economicLife;
        const leaseTermYears = d.leaseTerm / 12;
        const totalDepreciation = annualDepreciation * leaseTermYears;
        const residualValue = totalPurchaseCost * d.residualValueRate;

        // ========== 3. 跨境运输成本 ==========
        const domesticFreightTotal = d.domesticFreight * d.quantity * scenario.freightMultiplier;
        const internationalFreightTotal = d.internationalFreight * d.quantity * scenario.freightMultiplier;
        const portChargesTotal = d.portCharges * d.quantity;
        
        // 保险计算
        let insuranceBase = totalPurchaseCost;
        if (d.insuranceBase === 'cif') {
            insuranceBase = totalPurchaseCost + domesticFreightTotal + internationalFreightTotal;
        }
        const insuranceCost = insuranceBase * d.insuranceRate;
        
        const customsAgentFeeTotal = d.customsAgentFee * d.quantity;
        
        const totalTransportCost = domesticFreightTotal + internationalFreightTotal + 
                                    portChargesTotal + insuranceCost + customsAgentFeeTotal;
        
        // 运输占比
        const transportRatio = totalTransportCost / totalPurchaseCost;

        // ========== 4. 税费计算 ==========
        // 完税价格 (CIF)
        let dutiableValue = totalPurchaseCost;
        if (d.taxBasis === 'CIF') {
            if (d.includeFreight) dutiableValue += internationalFreightTotal;
            if (d.includeInsurance) dutiableValue += insuranceCost;
        }

        // 关税（应用情景乘数）
        let tariffAmount = 0;
        if (!d.tariffExempt) {
            tariffAmount = dutiableValue * d.tariffRate * (scenario.taxMultiplier || 1);
        }

        // VAT (计算基础 = 完税价格 + 关税)
        const vatBase = dutiableValue + tariffAmount;
        let vatAmount = vatBase * d.vatRate * (scenario.taxMultiplier || 1);
        let vatDeductAmount = 0;
        let vatCashOccupied = vatAmount;
        
        if (d.vatDeductible) {
            vatDeductAmount = vatAmount * d.vatDeductRate;
            vatCashOccupied = vatAmount - vatDeductAmount;
        }

        const totalTax = tariffAmount + vatAmount;
        const taxRatio = totalTax / totalPurchaseCost;

        // ========== 5. 运营成本 ==========
        const operatingMultiplier = scenario.operatingMultiplier || 1;
        const annualOperatingCost = (d.annualMaintenance + d.localParts + 
                                      d.localServiceFee + d.otherOperatingCost) * d.quantity * operatingMultiplier;
        const totalOperatingCost = annualOperatingCost * leaseTermYears;

        // ========== 6. 资金成本 ==========
        let capitalCost = 0;
        let monthlyPayment = 0;
        let totalInterest = 0;
        let downPayment = 0;
        let financingAmount = 0;
        let handlingFee = 0;

        const totalInitialCost = totalPurchaseCost + totalTransportCost + totalTax;

        if (d.paymentMode === 'full') {
            // 全款垫资模式
            const advanceAmount = totalPurchaseCost * d.purchaseAdvanceRate + 
                                  (totalTransportCost + totalTax) * d.freightTaxAdvanceRate;
            capitalCost = advanceAmount * d.capitalCostRate * (d.advancePeriod / 12);
            totalInterest = capitalCost;
        } else {
            // 融资租赁模式
            downPayment = totalInitialCost * d.downPaymentRate;
            financingAmount = totalInitialCost - downPayment;
            handlingFee = financingAmount * d.handlingFeeRate;

            if (d.repaymentMethod === 'equal') {
                // 等额本息
                const monthlyRate = d.financingRate / 12;
                const n = d.financingTerm;
                if (monthlyRate > 0) {
                    monthlyPayment = financingAmount * monthlyRate * Math.pow(1 + monthlyRate, n) / 
                                     (Math.pow(1 + monthlyRate, n) - 1);
                    totalInterest = monthlyPayment * n - financingAmount;
                } else {
                    monthlyPayment = financingAmount / n;
                    totalInterest = 0;
                }
            } else {
                // 到期还本付息
                totalInterest = financingAmount * d.financingRate * (d.financingTerm / 12);
            }
            capitalCost = totalInterest + handlingFee;
        }

        // ========== 7. 利润计算 ==========
        // 总成本
        let totalCostAccounting, totalCostCashflow;
        
        if (d.continuingOperationMethod === 'accounting') {
            // 会计口径：按折旧摊销
            totalCostAccounting = totalDepreciation + totalTransportCost + totalTax + 
                                   totalOperatingCost + capitalCost + disposalCost;
            totalCostCashflow = totalPurchaseCost + totalTransportCost + totalTax + 
                                 totalOperatingCost + capitalCost + disposalCost;
        } else {
            // 现金流口径：一次性支出
            totalCostAccounting = totalPurchaseCost + totalTransportCost + totalTax + 
                                   totalOperatingCost + capitalCost + disposalCost;
            totalCostCashflow = totalCostAccounting;
        }

        const accountingProfit = totalRevenue - totalCostAccounting;
        const cashflowProfit = totalRevenue - totalCostCashflow;
        const annualAccountingProfit = accountingProfit / leaseTermYears;

        // ========== 8. 现金流与回本 ==========
        const monthlyRevenue = (monthlyRentAdjusted * d.quantity) + 
                               (d.maintenanceServiceFee * d.quantity / 12);
        const monthlyOperatingCost = annualOperatingCost / 12;
        const monthlyNetCashflow = monthlyRevenue - monthlyOperatingCost;

        // 计算月度现金流序列
        const monthlyCashflows = [];
        const cumulativeCashflows = [];
        let cumulative = -(totalPurchaseCost + totalTransportCost + totalTax);
        
        // 初始投资
        monthlyCashflows.push({
            month: 0,
            income: installationRevenue,
            expense: totalPurchaseCost + totalTransportCost + totalTax,
            net: installationRevenue - (totalPurchaseCost + totalTransportCost + totalTax),
            financing: d.paymentMode === 'financing' ? -downPayment : 0
        });
        cumulativeCashflows.push(cumulative + installationRevenue);
        cumulative = cumulativeCashflows[0];

        // 租期内每月
        for (let m = 1; m <= d.leaseTerm; m++) {
            let monthExpense = monthlyOperatingCost;
            let financingExpense = 0;
            
            if (d.paymentMode === 'financing' && m <= d.financingTerm) {
                if (d.repaymentMethod === 'equal') {
                    financingExpense = monthlyPayment;
                } else if (m === d.financingTerm) {
                    financingExpense = financingAmount + totalInterest;
                }
            }

            monthExpense += financingExpense;
            const monthNet = monthlyRevenue - monthExpense;
            cumulative += monthNet;

            monthlyCashflows.push({
                month: m,
                income: monthlyRevenue,
                expense: monthExpense,
                net: monthNet,
                financing: financingExpense
            });
            cumulativeCashflows.push(cumulative);
        }

        // 期末处置（租转售模式）
        if (d.businessMode === 'lease-to-sell' && disposalRevenue > 0) {
            const lastMonth = monthlyCashflows[monthlyCashflows.length - 1];
            lastMonth.income += disposalRevenue;
            lastMonth.expense += disposalCost;
            lastMonth.net += (disposalRevenue - disposalCost);
            cumulative += (disposalRevenue - disposalCost);
            cumulativeCashflows[cumulativeCashflows.length - 1] = cumulative;
        }

        // 计算回本月
        let paybackMonth = -1;
        for (let i = 0; i < cumulativeCashflows.length; i++) {
            if (cumulativeCashflows[i] >= 0) {
                paybackMonth = i;
                break;
            }
        }

        // ========== 9. IRR 计算（简化版）==========
        const irr = this.calculateIRR(monthlyCashflows.map(m => m.net));

        // ========== 10. 汇兑损益 ==========
        const baseExchangeRate = d.exchangeRate;
        const volatileExchangeRate = baseExchangeRate * scenario.exchangeMultiplier;
        
        // 假设收入为外币，成本为人民币
        let exchangeGainLoss = 0;
        if (d.rentCurrency === 'KZT') {
            // 租金收入为坚戈，汇率变化影响换算后人民币金额
            const baseRevenueCNY = totalRentRevenue;
            const actualRevenueCNY = totalRentRevenue * (baseExchangeRate / volatileExchangeRate);
            exchangeGainLoss = actualRevenueCNY - baseRevenueCNY;
        }

        // ========== 汇总结果 ==========
        this.results = {
            // 基础信息
            quantity: d.quantity,
            leaseTerm: d.leaseTerm,
            leaseTermYears,
            businessMode: d.businessMode,
            paymentMode: d.paymentMode,
            scenario: d.scenario,

            // 收入
            revenue: {
                monthlyRent: monthlyRentAdjusted,
                totalRent: totalRentRevenue,
                installation: installationRevenue,
                service: serviceRevenue,
                disposal: disposalRevenue,
                total: totalRevenue
            },

            // 采购
            purchase: {
                unitPrice: d.purchasePrice,
                total: totalPurchaseCost,
                annualDepreciation,
                totalDepreciation,
                residualValue
            },

            // 运输
            transport: {
                domestic: domesticFreightTotal,
                international: internationalFreightTotal,
                portCharges: portChargesTotal,
                insurance: insuranceCost,
                customsAgent: customsAgentFeeTotal,
                total: totalTransportCost,
                ratio: transportRatio
            },

            // 税费
            tax: {
                dutiableValue,
                tariff: tariffAmount,
                vat: vatAmount,
                vatDeduct: vatDeductAmount,
                vatCashOccupied,
                total: totalTax,
                ratio: taxRatio
            },

            // 运营
            operating: {
                annual: annualOperatingCost,
                total: totalOperatingCost,
                maintenance: d.annualMaintenance * d.quantity,
                parts: d.localParts * d.quantity,
                localService: d.localServiceFee * d.quantity,
                other: d.otherOperatingCost * d.quantity
            },

            // 资金
            financing: {
                mode: d.paymentMode,
                capitalCost,
                totalInterest,
                monthlyPayment,
                downPayment,
                financingAmount,
                handlingFee
            },

            // 利润
            profit: {
                accounting: accountingProfit,
                cashflow: cashflowProfit,
                annualAccounting: annualAccountingProfit,
                totalCostAccounting,
                totalCostCashflow
            },

            // 现金流
            cashflow: {
                monthly: monthlyCashflows,
                cumulative: cumulativeCashflows,
                monthlyNet: monthlyNetCashflow,
                paybackMonth,
                irr
            },

            // 汇率
            exchange: {
                baseRate: baseExchangeRate,
                volatileRate: volatileExchangeRate,
                gainLoss: exchangeGainLoss
            },

            // 成本结构
            costStructure: {
                purchase: d.continuingOperationMethod === 'accounting' ? totalDepreciation : totalPurchaseCost,
                transport: totalTransportCost,
                tax: totalTax,
                operating: totalOperatingCost,
                financing: capitalCost,
                disposal: disposalCost
            }
        };

        // ========== 11. 三种毛利率计算 ==========
        this.calculateGrossMargins();

        // ========== 12. 两种回本口径计算 ==========
        this.calculatePaybackPeriods();

        // ========== 13. 达标判定与未达标原因分析 ==========
        this.analyzeCompliance();

        // ========== 14. 反推达标阈值 ==========
        this.calculateThresholds();

        return this.results;
    }

    /**
     * 计算三种毛利率口径
     * GM1: 经营毛利率 = (收入 - 可变成本) / 收入
     * GM2: 含摊销毛利率 = (收入 - 可变成本 - 折旧) / 收入
     * GM3: 全口径毛利率 = (收入 - 可变成本 - 折旧 - 资金成本) / 收入
     */
    calculateGrossMargins() {
        const r = this.results;
        const d = this.data;
        
        // 总收入
        const Rev = r.revenue.total;
        
        // 可变跨境/运营成本 = 运输+保险+代理+维保+当地服务+不可抵扣VAT+其他可变+处置成本
        const Var = r.transport.total + r.operating.total + r.tax.vatCashOccupied + 
                    (r.costStructure.disposal || 0);
        
        // 设备摊销（按寿命摊销）
        const Dep = r.purchase.totalDepreciation;
        
        // 资金成本
        const Fin = r.financing.capitalCost;

        // 关税（固定税费，也计入可变成本）
        const tariff = r.tax.tariff;
        const VarTotal = Var + tariff;

        // GM1: 经营毛利率（最常用对外口径）
        const gm1Value = Rev > 0 ? (Rev - VarTotal) / Rev : 0;
        const gm1Pass = gm1Value >= 0.30;

        // GM2: 含摊销毛利率（更接近"真实赚钱能力"）
        const gm2Value = Rev > 0 ? (Rev - VarTotal - Dep) / Rev : 0;
        const gm2Pass = gm2Value >= 0.30;

        // GM3: 全口径毛利率（最严）
        const gm3Value = Rev > 0 ? (Rev - VarTotal - Dep - Fin) / Rev : 0;
        const gm3Pass = gm3Value >= 0.30;

        // 直接字段 - 供app.js使用
        this.results.grossMargins = {
            gm1: gm1Value,
            gm2: gm2Value,
            gm3: gm3Value,
            revenue: Rev,
            variableCost: VarTotal,
            depreciation: Dep,
            financingCost: Fin
        };

        // 详细字段 - 完整信息
        this.results.grossMargin = {
            // 各项成本明细
            revenue: Rev,
            variableCost: VarTotal,
            depreciation: Dep,
            financingCost: Fin,
            
            // GM1
            gm1: {
                value: gm1Value,
                pass: gm1Pass,
                label: '经营毛利率',
                formula: '(收入-可变成本)/收入',
                profit: Rev - VarTotal
            },
            // GM2
            gm2: {
                value: gm2Value,
                pass: gm2Pass,
                label: '含摊销毛利率',
                formula: '(收入-可变成本-折旧)/收入',
                profit: Rev - VarTotal - Dep
            },
            // GM3
            gm3: {
                value: gm3Value,
                pass: gm3Pass,
                label: '全口径毛利率',
                formula: '(收入-可变成本-折旧-资金)/收入',
                profit: Rev - VarTotal - Dep - Fin
            },
            
            // 成本明细（用于展示）
            costBreakdown: {
                transport: r.transport.total,
                operating: r.operating.total,
                vatNonDeduct: r.tax.vatCashOccupied,
                tariff: r.tax.tariff,
                depreciation: Dep,
                financing: Fin,
                disposal: r.costStructure.disposal || 0
            }
        };
    }

    /**
     * 计算两种回本口径
     * PB1: 项目回本（不考虑融资，衡量项目本身）
     * PB2: 股东回本（考虑融资结构，衡量股东现金占用）
     */
    calculatePaybackPeriods() {
        const r = this.results;
        const d = this.data;

        // ===== PB1: 项目回本（不看融资）=====
        // 初始投入：采购+运输+税费（全部当成项目现金流出）
        const projectInitialInvestment = r.purchase.total + r.transport.total + r.tax.total;
        
        // 月度净收入（不含融资还款）
        const monthlyRevenue = r.revenue.monthlyRent * d.quantity + 
                               (d.maintenanceServiceFee * d.quantity / 12);
        const monthlyOpCost = r.operating.annual / 12;
        const monthlyNetProject = monthlyRevenue - monthlyOpCost;

        // 计算PB1累计现金流
        const pb1Cashflows = [];
        const pb1Cumulative = [];
        let pb1Cum = -projectInitialInvestment + r.revenue.installation;
        pb1Cashflows.push({ month: 0, net: pb1Cum });
        pb1Cumulative.push(pb1Cum);

        for (let m = 1; m <= d.leaseTerm; m++) {
            let monthNet = monthlyNetProject;
            // 期末处置
            if (m === d.leaseTerm && d.businessMode === 'lease-to-sell' && r.revenue.disposal > 0) {
                monthNet += r.revenue.disposal - (r.costStructure.disposal || 0);
            }
            pb1Cum += monthNet;
            pb1Cashflows.push({ month: m, net: monthNet });
            pb1Cumulative.push(pb1Cum);
        }

        // 找PB1回本月
        let pb1Month = -1;
        for (let i = 0; i < pb1Cumulative.length; i++) {
            if (pb1Cumulative[i] >= 0) {
                pb1Month = i;
                break;
            }
        }

        // ===== PB2: 股东回本（考虑融资）=====
        let shareholderInitialInvestment;
        let financingInflow = 0;
        
        if (d.paymentMode === 'financing') {
            // 融资模式：股东出资 = 首付 + 手续费
            shareholderInitialInvestment = r.financing.downPayment + r.financing.handlingFee;
            financingInflow = r.financing.financingAmount; // 融资放款算入现金流入
        } else {
            // 全款模式：股东出资 = 全部初始投入 × 垫资比例
            shareholderInitialInvestment = r.purchase.total * d.purchaseAdvanceRate + 
                                           (r.transport.total + r.tax.total) * d.freightTaxAdvanceRate;
        }

        // 计算PB2累计现金流
        const pb2Cashflows = [];
        const pb2Cumulative = [];
        let pb2Cum = -shareholderInitialInvestment + r.revenue.installation;
        if (d.paymentMode === 'financing') {
            pb2Cum += financingInflow; // 融资放款
        }
        pb2Cashflows.push({ month: 0, net: pb2Cum, financing: financingInflow });
        pb2Cumulative.push(pb2Cum);

        for (let m = 1; m <= d.leaseTerm; m++) {
            let monthNet = monthlyNetProject;
            let financingPayment = 0;
            
            // 融资还款
            if (d.paymentMode === 'financing' && m <= d.financingTerm) {
                if (d.repaymentMethod === 'equal') {
                    financingPayment = r.financing.monthlyPayment;
                } else if (m === d.financingTerm) {
                    financingPayment = r.financing.financingAmount + r.financing.totalInterest;
                }
                monthNet -= financingPayment;
            }
            
            // 全款垫资的资金成本（在垫资周期结束时支付）
            if (d.paymentMode === 'full' && m === d.advancePeriod) {
                monthNet -= r.financing.capitalCost;
            }

            // 期末处置
            if (m === d.leaseTerm && d.businessMode === 'lease-to-sell' && r.revenue.disposal > 0) {
                monthNet += r.revenue.disposal - (r.costStructure.disposal || 0);
            }

            pb2Cum += monthNet;
            pb2Cashflows.push({ month: m, net: monthNet, financing: financingPayment });
            pb2Cumulative.push(pb2Cum);
        }

        // 找PB2回本月
        let pb2Month = -1;
        for (let i = 0; i < pb2Cumulative.length; i++) {
            if (pb2Cumulative[i] >= 0) {
                pb2Month = i;
                break;
            }
        }

        // 达标判定（≤24个月）
        const pb1Pass = pb1Month > 0 && pb1Month <= 24;
        const pb2Pass = pb2Month > 0 && pb2Month <= 24;

        this.results.paybackPeriods = {
            // PB1: 项目回本
            pb1: pb1Month,
            pb1Pass: pb1Pass,
            pb1Cumulative: pb1Cumulative,
            pb1Cashflows: pb1Cashflows,
            pb1Label: '项目回本',
            pb1Description: '不考虑融资，衡量项目本身',
            pb1InitialInvestment: projectInitialInvestment,
            pb1MonthlyNet: monthlyNetProject,
            // PB2: 股东回本
            pb2: pb2Month,
            pb2Pass: pb2Pass,
            pb2Cumulative: pb2Cumulative,
            pb2Cashflows: pb2Cashflows,
            pb2Label: '股东回本',
            pb2Description: '考虑融资结构，衡量股东现金占用',
            pb2InitialInvestment: shareholderInitialInvestment,
            pb2FinancingInflow: financingInflow
        };

        // 也保留原始格式用于兼容
        this.results.payback = {
            // PB1: 项目回本
            pb1: {
                month: pb1Month,
                pass: pb1Pass,
                label: '项目回本',
                description: '不考虑融资，衡量项目本身',
                initialInvestment: projectInitialInvestment,
                monthlyNet: monthlyNetProject,
                cashflows: pb1Cashflows,
                cumulative: pb1Cumulative
            },
            // PB2: 股东回本
            pb2: {
                month: pb2Month,
                pass: pb2Pass,
                label: '股东回本',
                description: '考虑融资结构，衡量股东现金占用',
                initialInvestment: shareholderInitialInvestment,
                financingInflow: financingInflow,
                cashflows: pb2Cashflows,
                cumulative: pb2Cumulative
            }
        };
    }

    /**
     * 达标判定与未达标原因分析
     */
    analyzeCompliance() {
        const gm = this.results.grossMargin;
        const pb = this.results.payback;
        const r = this.results;

        const issues = [];
        const allPass = gm.gm1.pass && gm.gm2.pass && gm.gm3.pass && pb.pb1.pass && pb.pb2.pass;

        // 分析未达标原因
        if (!gm.gm1.pass || !gm.gm2.pass || !gm.gm3.pass) {
            // 毛利率未达标，分析拖累项
            const costItems = [
                { name: '运输成本', value: r.transport.total, impact: r.transport.total / gm.revenue },
                { name: '税费成本', value: r.tax.total, impact: r.tax.total / gm.revenue },
                { name: '运营成本', value: r.operating.total, impact: r.operating.total / gm.revenue },
                { name: '资金成本', value: r.financing.capitalCost, impact: r.financing.capitalCost / gm.revenue },
                { name: '设备折旧', value: gm.depreciation, impact: gm.depreciation / gm.revenue }
            ];
            
            // 按影响程度排序
            costItems.sort((a, b) => b.impact - a.impact);
            
            // 取前3大拖累项
            const topDrags = costItems.slice(0, 3).filter(item => item.impact > 0.05);
            topDrags.forEach(item => {
                issues.push({
                    type: 'cost',
                    name: item.name,
                    value: item.value,
                    impact: item.impact,
                    suggestion: this.getSuggestion(item.name)
                });
            });

            // 检查租金是否偏低
            const rentRatio = r.revenue.totalRent / gm.revenue;
            if (rentRatio < 0.85) {
                issues.push({
                    type: 'revenue',
                    name: '租金收入不足',
                    value: r.revenue.totalRent,
                    impact: 1 - rentRatio,
                    suggestion: '建议提高月租金或延长租期'
                });
            }
        }

        if (!pb.pb1.pass || !pb.pb2.pass) {
            // 回本期未达标
            if (pb.pb1.month > 24 || pb.pb1.month < 0) {
                issues.push({
                    type: 'payback',
                    name: '项目回本期过长',
                    value: pb.pb1.month,
                    impact: pb.pb1.month > 0 ? (pb.pb1.month - 24) / 24 : 1,
                    suggestion: '建议降低初始投入或提高月租金'
                });
            }
            if (pb.pb2.month > 24 || pb.pb2.month < 0) {
                issues.push({
                    type: 'payback',
                    name: '股东回本期过长',
                    value: pb.pb2.month,
                    impact: pb.pb2.month > 0 ? (pb.pb2.month - 24) / 24 : 1,
                    suggestion: '建议优化融资结构或增加首付'
                });
            }
        }

        // 简化格式供 app.js 使用
        this.results.compliance = {
            gm1: {
                pass: gm.gm1.pass,
                reason: gm.gm1.pass ? `${(gm.gm1.value * 100).toFixed(1)}% ≥ 30%` : `${(gm.gm1.value * 100).toFixed(1)}% < 30%`
            },
            gm2: {
                pass: gm.gm2.pass,
                reason: gm.gm2.pass ? `${(gm.gm2.value * 100).toFixed(1)}% ≥ 30%` : `${(gm.gm2.value * 100).toFixed(1)}% < 30%`
            },
            gm3: {
                pass: gm.gm3.pass,
                reason: gm.gm3.pass ? `${(gm.gm3.value * 100).toFixed(1)}% ≥ 30%` : `${(gm.gm3.value * 100).toFixed(1)}% < 30%`
            },
            pb1: {
                pass: pb.pb1.pass,
                reason: pb.pb1.month > 0 ? 
                    (pb.pb1.pass ? `${pb.pb1.month}月 ≤ 24月` : `${pb.pb1.month}月 > 24月`) : '未回本'
            },
            pb2: {
                pass: pb.pb2.pass,
                reason: pb.pb2.month > 0 ? 
                    (pb.pb2.pass ? `${pb.pb2.month}月 ≤ 24月` : `${pb.pb2.month}月 > 24月`) : '未回本'
            },
            allPass,
            gmPass: gm.gm1.pass && gm.gm2.pass && gm.gm3.pass,
            pbPass: pb.pb1.pass && pb.pb2.pass,
            issues: issues.slice(0, 5),
            summary: allPass ? '所有指标达标 ✓' : `${issues.length}项指标未达标`
        };
    }

    /**
     * 获取改善建议
     */
    getSuggestion(costName) {
        const suggestions = {
            '运输成本': '考虑优化物流路线、整合运输批次、谈判运费折扣',
            '税费成本': '确认是否有税收优惠政策、优化计税口径、申请VAT抵扣',
            '运营成本': '优化维保频率、寻找本地合作伙伴、减少人员差旅',
            '资金成本': '降低融资利率、缩短垫资周期、增加首付比例',
            '设备折旧': '延长租期以摊薄单位折旧、提高租金覆盖折旧'
        };
        return suggestions[costName] || '建议进一步分析成本结构';
    }

    /**
     * 反推达标阈值
     */
    calculateThresholds() {
        const gm = this.results.grossMargin;
        const pb = this.results.payback;
        const r = this.results;
        const d = this.data;

        // ===== 反推毛利率达标所需最低月租金 =====
        const targetGM = 0.30;
        const leaseMonths = d.leaseTerm;
        const qty = d.quantity;

        // 其他收入（安装+服务+处置）
        const otherRevenue = r.revenue.installation + r.revenue.service + r.revenue.disposal;

        // GM1达标所需月租金: (Rent * months * qty + other) * (1 - targetGM) = Var
        // Rent = (Var / (1 - targetGM) - other) / (months * qty)
        const minRentGM1 = gm.variableCost > 0 ? 
            (gm.variableCost / (1 - targetGM) - otherRevenue) / (leaseMonths * qty) : 0;

        // GM2达标所需月租金
        const minRentGM2 = (gm.variableCost + gm.depreciation) > 0 ?
            ((gm.variableCost + gm.depreciation) / (1 - targetGM) - otherRevenue) / (leaseMonths * qty) : 0;

        // GM3达标所需月租金
        const minRentGM3 = (gm.variableCost + gm.depreciation + gm.financingCost) > 0 ?
            ((gm.variableCost + gm.depreciation + gm.financingCost) / (1 - targetGM) - otherRevenue) / (leaseMonths * qty) : 0;

        // ===== 反推回本达标所需参数 =====
        const targetPBMonths = 24;
        
        // PB1: 最大允许初始投入 = 月净收入 * 24
        const monthlyNetPB1 = pb.pb1.monthlyNet;
        const maxInitialForPB1 = monthlyNetPB1 * targetPBMonths + r.revenue.installation;
        
        // 当前初始投入
        const currentInitial = pb.pb1.initialInvestment;
        
        // 最大允许跨境成本 = 最大初始投入 - 采购成本 - 税费
        const maxTransportForPB1 = Math.max(0, maxInitialForPB1 - r.purchase.total - r.tax.total);
        
        // 最大允许利率（全款模式）
        let maxCapitalRate = d.capitalCostRate;
        if (d.paymentMode === 'full' && r.financing.capitalCost > 0) {
            // 如果资金成本使得回本延迟，计算最大允许利率
            const allowableCapitalCost = Math.max(0, monthlyNetPB1 * (targetPBMonths - pb.pb1.month));
            maxCapitalRate = (allowableCapitalCost / (currentInitial * (d.advancePeriod / 12))) || 0;
        }

        // 最短垫资周期
        let minAdvancePeriod = d.advancePeriod;
        if (d.paymentMode === 'full') {
            // 垫资周期越短，资金成本越低
            const targetCapitalCost = monthlyNetPB1 * 2; // 允许2个月收入覆盖资金成本
            minAdvancePeriod = Math.ceil((targetCapitalCost / (currentInitial * d.capitalCostRate)) * 12);
            minAdvancePeriod = Math.max(1, Math.min(minAdvancePeriod, 12));
        }

        this.results.thresholds = {
            // 毛利率达标所需最低月租金
            minRentForGM1: Math.max(0, minRentGM1),
            minRentForGM2: Math.max(0, minRentGM2),
            minRentForGM3: Math.max(0, minRentGM3),
            currentRent: d.monthlyRent,
            
            // 回本达标所需参数
            maxTransportForPB: maxTransportForPB1,
            currentTransport: r.transport.total,
            
            maxRateForPB: Math.max(0, Math.min(maxCapitalRate, 0.30)),
            currentRate: d.capitalCostRate,
            
            minPeriodForPB: minAdvancePeriod,
            currentPeriod: d.advancePeriod
        };
    }

    /**
     * 计算IRR（简化版，牛顿迭代法）
     */
    calculateIRR(cashflows, guess = 0.1) {
        const maxIterations = 100;
        const precision = 0.0001;
        let rate = guess;

        for (let i = 0; i < maxIterations; i++) {
            let npv = 0;
            let dnpv = 0;

            for (let j = 0; j < cashflows.length; j++) {
                npv += cashflows[j] / Math.pow(1 + rate, j);
                dnpv -= j * cashflows[j] / Math.pow(1 + rate, j + 1);
            }

            const newRate = rate - npv / dnpv;
            
            if (Math.abs(newRate - rate) < precision) {
                return newRate * 12; // 年化
            }
            rate = newRate;
        }

        return null; // 未收敛
    }

    /**
     * 敏感性分析
     */
    sensitivityAnalysis(target, variable, range = [-20, -10, -5, 0, 5, 10, 20]) {
        const originalData = { ...this.data };
        const results = [];

        for (const pct of range) {
            // 复制数据并调整变量
            this.data = { ...originalData };
            const multiplier = 1 + pct / 100;

            switch (variable) {
                case 'rent':
                    this.data.monthlyRent *= multiplier;
                    break;
                case 'freight':
                    this.data.domesticFreight *= multiplier;
                    this.data.internationalFreight *= multiplier;
                    break;
                case 'tax':
                    this.data.tariffRate *= multiplier;
                    this.data.vatRate *= multiplier;
                    break;
                case 'exchange':
                    this.data.exchangeRate *= multiplier;
                    break;
                case 'interest':
                    this.data.capitalCostRate *= multiplier;
                    this.data.financingRate *= multiplier;
                    break;
            }

            // 重新计算
            const calc = this.calculate();
            
            let value;
            switch (target) {
                case 'profit':
                    value = calc.profit.annualAccounting;
                    break;
                case 'payback':
                    value = calc.cashflow.paybackMonth;
                    break;
                case 'irr':
                    value = calc.cashflow.irr * 100;
                    break;
            }

            results.push({ change: pct, value });
        }

        // 恢复原数据
        this.data = originalData;
        this.calculate();

        return results;
    }

    /**
     * 多情景计算
     */
    calculateAllScenarios() {
        const originalScenario = this.data.scenario;
        const scenarios = {};

        for (const name of ['optimistic', 'baseline', 'conservative']) {
            this.data.scenario = name;
            scenarios[name] = this.calculate();
        }

        this.data.scenario = originalScenario;
        this.calculate();

        return scenarios;
    }

    /**
     * 数据验证
     */
    validate() {
        const errors = [];
        const warnings = [];
        const d = this.data;

        // 必填项检查
        if (!d.quantity || d.quantity < 1) {
            errors.push('台数必须大于0');
        }
        if (!d.leaseTerm || d.leaseTerm < 1) {
            errors.push('租期必须大于0');
        }
        if (!d.monthlyRent || d.monthlyRent <= 0) {
            errors.push('月租金必须大于0');
        }
        if (!d.purchasePrice || d.purchasePrice <= 0) {
            errors.push('采购单价必须大于0');
        }
        if (!d.exchangeRate || d.exchangeRate <= 0) {
            errors.push('汇率必须大于0');
        }

        // 警告检查
        if (this.results.transport?.ratio > 0.20) {
            warnings.push('运输占比超过20%，请关注成本控制');
        }
        if (this.results.tax?.ratio > 0.20) {
            warnings.push('税负占比较高，建议优化税务筹划');
        }
        if (!d.vatDeductible && this.results.tax?.vat > 0) {
            warnings.push('VAT不可抵扣，将占用较多现金流');
        }
        if (d.paymentMode === 'financing' && d.financingTerm > d.leaseTerm) {
            warnings.push('融资期限超过租期，请确认还款安排');
        }

        return { errors, warnings, isValid: errors.length === 0 };
    }

    /**
     * 格式化数字
     */
    static formatNumber(num, decimals = 0) {
        if (num === null || num === undefined || isNaN(num)) return '--';
        return num.toLocaleString('zh-CN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * 格式化金额
     */
    static formatCurrency(amount, currency = 'CNY') {
        if (amount === null || amount === undefined || isNaN(amount)) return '--';
        const prefix = currency === 'CNY' ? '¥' : '₸';
        const formatted = Math.abs(amount).toLocaleString('zh-CN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        return (amount < 0 ? '-' : '') + prefix + formatted;
    }

    /**
     * 格式化百分比
     */
    static formatPercent(ratio, decimals = 1) {
        if (ratio === null || ratio === undefined || isNaN(ratio)) return '--';
        return (ratio * 100).toFixed(decimals) + '%';
    }
}

// 导出
window.Calculator = Calculator;
