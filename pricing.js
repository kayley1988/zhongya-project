/**
 * 哈萨克斯坦设备定价测算器 - 核心逻辑
 * 满足：毛利率30% + 24个月回本
 */

// 全局状态
const PricingState = {
    deliveryMode: 'DAP',        // EXW | DAP
    fundingMode: 'full',        // full | financing
    currency: 'CNY',            // CNY | KZT | BOTH
    productType: 'rental',      // rental | leaseSale | directSale
    paybackBasis: 'total',      // total | equity
    charts: {},
    lastResults: null
};

// 默认参数配置
const DefaultConfig = {
    // 设备默认采购价（按状态）
    equipmentPrices: {
        excavator: { new: 1200000, A: 900000, B: 800000, C: 650000 },
        loader: { new: 800000, A: 600000, B: 520000, C: 420000 },
        bulldozer: { new: 1500000, A: 1100000, B: 950000, C: 750000 },
        crane: { new: 2000000, A: 1500000, B: 1300000, C: 1000000 },
        roller: { new: 600000, A: 450000, B: 380000, C: 300000 },
        grader: { new: 900000, A: 680000, B: 580000, C: 460000 },
        other: { new: 800000, A: 600000, B: 500000, C: 400000 }
    },
    // 运输路线默认费用
    routeFreight: {
        '霍尔果斯-公路': { freight: 25000, days: 7 },
        '霍尔果斯-铁路': { freight: 18000, days: 10 },
        '阿拉山口-铁路': { freight: 20000, days: 12 },
        '连云港-海铁联运': { freight: 35000, days: 20 }
    },
    // 默认汇率
    exchangeRate: 68.5,
    // 默认目标
    targetMargin: 0.30,
    paybackMonths: 24
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    initCharts();
    calculate();
    bindEvents();
    initProductTabs();
    initPaybackTabs();
});

function initProductTabs() {
    // 产品类型 tabs 已通过 onclick 绑定
}

function initPaybackTabs() {
    // 回本口径 tabs 已通过 onclick 绑定
}

function setProductType(type) {
    PricingState.productType = type;
    
    // 更新按钮状态
    document.querySelectorAll('.product-tab').forEach(tab => {
        tab.classList.toggle('active', 
            (tab.id === 'tabLease' && type === 'lease') ||
            (tab.id === 'tabRentToOwn' && type === 'rent-to-own') ||
            (tab.id === 'tabSale' && type === 'sale')
        );
    });
    
    // 更新卡片高亮状态
    const leaseCard = document.querySelector('.lease-card');
    const rentToOwnCard = document.querySelector('.rent-to-own-card');
    const saleCard = document.querySelector('.sale-card');
    
    // 移除所有高亮
    [leaseCard, rentToOwnCard, saleCard].forEach(card => {
        if (card) {
            card.classList.remove('card-highlight', 'card-dimmed');
        }
    });
    
    // 添加高亮到选中的卡片，其他卡片变灰
    if (type === 'lease') {
        if (leaseCard) leaseCard.classList.add('card-highlight');
        if (rentToOwnCard) rentToOwnCard.classList.add('card-dimmed');
        if (saleCard) saleCard.classList.add('card-dimmed');
    } else if (type === 'rent-to-own') {
        if (leaseCard) leaseCard.classList.add('card-dimmed');
        if (rentToOwnCard) rentToOwnCard.classList.add('card-highlight');
        if (saleCard) saleCard.classList.add('card-dimmed');
    } else if (type === 'sale') {
        if (leaseCard) leaseCard.classList.add('card-dimmed');
        if (rentToOwnCard) rentToOwnCard.classList.add('card-dimmed');
        if (saleCard) saleCard.classList.add('card-highlight');
    }
    
    // 重新计算以更新漏斗等数据
    calculate();
}

function setPaybackBasis(basis) {
    PricingState.paybackBasis = basis;
    document.querySelectorAll('.payback-tab').forEach(tab => {
        tab.classList.toggle('active', 
            (tab.id === 'tabPaybackTotal' && basis === 'total') ||
            (tab.id === 'tabPaybackEquity' && basis === 'equity')
        );
    });
    calculate();
}

function bindEvents() {
    // 为所有输入框绑定变化事件
    document.querySelectorAll('input[type="number"], input[type="range"], select').forEach(el => {
        if (!el.hasAttribute('oninput') && !el.hasAttribute('onchange')) {
            el.addEventListener('change', calculate);
        }
    });
}

// ==================== 交互控制 ====================
function toggleSection(header) {
    const section = header.closest('.input-section');
    const content = section.querySelector('.section-content');
    const icon = section.querySelector('.collapse-icon');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▼';
        section.classList.remove('collapsed');
    } else {
        content.style.display = 'none';
        icon.textContent = '▶';
        section.classList.add('collapsed');
    }
}

function toggleCalculationDetails() {
    const details = document.querySelector('.calculation-details');
    const content = details.querySelector('.details-content');
    const icon = details.querySelector('.collapse-icon');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▼';
    } else {
        content.style.display = 'none';
        icon.textContent = '▶';
    }
}

function setDeliveryMode(mode) {
    PricingState.deliveryMode = mode;
    
    document.getElementById('btnEXW').classList.toggle('active', mode === 'EXW');
    document.getElementById('btnDAP').classList.toggle('active', mode === 'DAP');
    document.getElementById('dapCostDetails').style.display = mode === 'DAP' ? 'block' : 'none';
    
    // 更新标签显示
    document.getElementById('tagTransport').style.display = mode === 'DAP' ? 'inline-block' : 'none';
    
    calculate();
}

function setFundingMode(mode) {
    PricingState.fundingMode = mode;
    
    document.getElementById('btnFull').classList.toggle('active', mode === 'full');
    document.getElementById('btnFinancing').classList.toggle('active', mode === 'financing');
    document.getElementById('financingDetails').style.display = mode === 'financing' ? 'block' : 'none';
    
    calculate();
}

function setCurrency(currency) {
    PricingState.currency = currency;
    
    document.getElementById('btnCNY').classList.toggle('active', currency === 'CNY');
    document.getElementById('btnKZT').classList.toggle('active', currency === 'KZT');
    document.getElementById('btnBOTH').classList.toggle('active', currency === 'BOTH');
    
    updateDisplay();
}

function syncSlider(name) {
    const slider = document.getElementById(name + 'Slider');
    const input = document.getElementById(name);
    input.value = slider.value;
    calculate();
}

function syncInput(name) {
    const slider = document.getElementById(name + 'Slider');
    const input = document.getElementById(name);
    slider.value = input.value;
    calculate();
}

// ==================== 设备与路线变化 ====================
function onEquipmentTypeChange() {
    const type = document.getElementById('equipmentType').value;
    const condition = document.getElementById('equipmentCondition').value;
    const prices = DefaultConfig.equipmentPrices[type] || DefaultConfig.equipmentPrices.other;
    
    document.getElementById('purchasePrice').value = prices[condition] || prices.B;
    updateInsuranceFee();
    calculate();
}

function onConditionChange() {
    const type = document.getElementById('equipmentType').value;
    const condition = document.getElementById('equipmentCondition').value;
    const prices = DefaultConfig.equipmentPrices[type] || DefaultConfig.equipmentPrices.other;
    
    document.getElementById('purchasePrice').value = prices[condition] || prices.B;
    updateInsuranceFee();
    calculate();
}

function onRouteChange() {
    const route = document.getElementById('transportRoute')?.value;
    const routeConfig = DefaultConfig.routeFreight[route];
    
    if (routeConfig) {
        const freightEl = document.getElementById('internationalFreight');
        const dapTimeEl = document.getElementById('dapTime');
        if (freightEl) freightEl.value = routeConfig.freight;
        if (dapTimeEl) dapTimeEl.textContent = `约${routeConfig.days}天`;
    }
    calculate();
}

function updateInsuranceFee() {
    const purchasePrice = parseFloat(document.getElementById('purchasePrice')?.value) || 0;
    const insuranceEl = document.getElementById('insuranceFee');
    if (insuranceEl) insuranceEl.value = Math.round(purchasePrice * 0.008);
}

// ==================== 核心计算引擎 ====================
function calculate() {
    const inputs = collectInputs();
    const results = computePricing(inputs);
    PricingState.lastResults = results;
    
    updateDisplay();
    updateCharts(results);
    updateFormulas(inputs, results);
}

function collectInputs() {
    return {
        // 设备信息
        equipmentType: document.getElementById('equipmentType').value,
        equipmentModel: document.getElementById('equipmentModel').value,
        equipmentCondition: document.getElementById('equipmentCondition').value,
        quantity: parseInt(document.getElementById('quantity').value) || 1,
        purchasePrice: parseFloat(document.getElementById('purchasePrice').value) || 0,
        
        // 交付方式
        deliveryMode: PricingState.deliveryMode,
        transportRoute: document.getElementById('transportRoute').value,
        domesticFreight: parseFloat(document.getElementById('domesticFreight').value) || 0,
        internationalFreight: parseFloat(document.getElementById('internationalFreight').value) || 0,
        loadingFee: parseFloat(document.getElementById('loadingFee').value) || 0,
        customsFee: parseFloat(document.getElementById('customsFee').value) || 0,
        insuranceFee: parseFloat(document.getElementById('insuranceFee').value) || 0,
        contingencyFee: parseFloat(document.getElementById('contingencyFee').value) || 0,
        
        // 税费
        includeTaxInPrice: document.getElementById('includeTaxInPrice').checked,
        tariffRate: parseFloat(document.getElementById('tariffRate').value) / 100 || 0.05,
        vatRate: parseFloat(document.getElementById('vatRate').value) / 100 || 0.12,
        
        // 资金方式
        fundingMode: PricingState.fundingMode,
        downPaymentRate: parseFloat(document.getElementById('downPaymentRate').value) / 100 || 0.30,
        interestRate: parseFloat(document.getElementById('interestRate').value) / 100 || 0.08,
        financingTerm: parseInt(document.getElementById('financingTerm').value) || 24,
        
        // 运营参数 - 小修（每月）
        minorMaintPerMonth: parseFloat(document.getElementById('minorMaintenance')?.value) || 2000,
        // 运营参数 - 大修（每月预提，实际年度发生）
        majorMaintPerYear: (parseFloat(document.getElementById('majorMaintenance')?.value) || 3000) * 12,
        // 停机率
        downtimeRate: parseFloat(document.getElementById('downtimeRate')?.value) / 100 || 0.05,
        
        // 其他运营参数
        utilization: parseFloat(document.getElementById('utilization').value) / 100 || 0.70,
        maintenanceCost: parseFloat(document.getElementById('maintenanceCost')?.value) || 0,
        monthlyInsurance: parseFloat(document.getElementById('monthlyInsurance').value) || 1500,
        managementFee: parseFloat(document.getElementById('managementFee').value) || 2000,
        yardFee: parseFloat(document.getElementById('yardFee').value) || 1000,
        otherCost: parseFloat(document.getElementById('otherCost')?.value) || 500,
        residualRate: parseFloat(document.getElementById('residualRate').value) / 100 || 0.50,
        
        // 币种与汇率
        exchangeRate: parseFloat(document.getElementById('exchangeRate').value) || 68.5,
        
        // 高级选项
        targetMargin: parseFloat(document.getElementById('targetMargin').value) / 100 || 0.30,
        paybackPeriod: parseInt(document.getElementById('paybackPeriod').value) || 24,
        paybackBasis: PricingState.paybackBasis,
        productType: PricingState.productType
    };
}

function computePricing(inputs) {
    const T = inputs.paybackPeriod; // 回本周期（月）
    const u = inputs.utilization;   // 利用率
    const g = inputs.targetMargin;  // 目标毛利率
    
    // ===== 1. 计算落地总成本 C =====
    let costBreakdown = {
        purchase: inputs.purchasePrice,
        domesticFreight: inputs.domesticFreight,
        internationalFreight: 0,
        loadingFee: 0,
        customsFee: 0,
        insurance: inputs.insuranceFee,
        contingency: 0,
        tax: 0
    };
    
    // DAP模式计入跨境费用
    if (inputs.deliveryMode === 'DAP') {
        costBreakdown.internationalFreight = inputs.internationalFreight;
        costBreakdown.loadingFee = inputs.loadingFee;
        costBreakdown.customsFee = inputs.customsFee;
        costBreakdown.contingency = inputs.contingencyFee;
        
        // 计算税费（CIF基础）
        if (inputs.includeTaxInPrice) {
            const cifValue = inputs.purchasePrice + inputs.domesticFreight + 
                           inputs.internationalFreight + inputs.insuranceFee;
            const tariff = cifValue * inputs.tariffRate;
            const vat = (cifValue + tariff) * inputs.vatRate;
            costBreakdown.tax = tariff + vat;
        }
    }
    
    // 总成本 C
    const totalCost = costBreakdown.purchase + 
                      costBreakdown.domesticFreight +
                      costBreakdown.internationalFreight +
                      costBreakdown.loadingFee +
                      costBreakdown.customsFee +
                      costBreakdown.insurance +
                      costBreakdown.contingency +
                      costBreakdown.tax;
    
    // EXW成本（仅采购+国内段）
    const exwCost = costBreakdown.purchase + costBreakdown.domesticFreight;
    
    // ===== 2. 计算运营成本 O (含大修预提) =====
    // 小修：每月费用
    const minorMaintTotal = (inputs.minorMaintPerMonth || 0) * T;
    // 大修：年度费用分摊到月
    const majorMaintMonthly = (inputs.majorMaintPerYear || 0) / 12;
    const majorMaintTotal = majorMaintMonthly * T;
    // 总维修成本
    const totalMaintenanceCost = minorMaintTotal + majorMaintTotal;
    
    // 其他月度运营成本（保险+管理+场地+其他）
    const otherMonthlyOp = inputs.monthlyInsurance + inputs.managementFee + inputs.yardFee + (inputs.otherCost || 0);
    const monthlyOperating = (inputs.minorMaintPerMonth || 0) + majorMaintMonthly + otherMonthlyOp;
    const totalOperating = monthlyOperating * T;
    
    // ===== 3. 计算残值 S =====
    const residualValue = inputs.purchasePrice * inputs.residualRate;
    
    // ===== 4. 财务漏斗模型 =====
    const C = inputs.deliveryMode === 'DAP' ? totalCost : exwCost;
    
    // Layer 1: 采购价
    const funnelPurchase = inputs.purchasePrice;
    // Layer 2: 交付成本（DAP - EXW差额）
    const deliveryCost = totalCost - exwCost;
    // Layer 3: 运营预提（T个月）
    const operatingProvision = totalOperating;
    // Layer 4: 应回收总额（C - S + O）
    const amountToRecover = C - residualValue + totalOperating;
    // Layer 5: 毛利额（g × R）
    // Layer 6: 总收入目标 R_total = (C - S + O) / (1 - g)
    const requiredRevenue = amountToRecover / (1 - g);
    // Layer 7: 对外报价（月）
    const marginAmount = requiredRevenue - amountToRecover;
    
    // ===== 5. 计算建议月租 R_month =====
    // R_month = R_total / (T × u)
    const monthlyRent = requiredRevenue / (T * u);
    const dailyRent = monthlyRent / 26; // 按26工作日计算
    
    // ===== 6. 计算以租代售方案 =====
    const salePrice = C * (1 + g); // 销售价 = 成本 × (1 + 毛利率)
    const downPayment = salePrice * inputs.downPaymentRate;
    const loanAmount = salePrice - downPayment;
    
    // 月供计算（等额本息）
    const monthlyInterestRate = inputs.interestRate / 12;
    const n = inputs.financingTerm;
    let monthlyInstallment;
    if (monthlyInterestRate > 0) {
        monthlyInstallment = loanAmount * monthlyInterestRate * 
                            Math.pow(1 + monthlyInterestRate, n) / 
                            (Math.pow(1 + monthlyInterestRate, n) - 1);
    } else {
        monthlyInstallment = loanAmount / n;
    }
    
    const totalPayment = downPayment + monthlyInstallment * n + residualValue;
    
    // ===== 7. 计算销售价格 =====
    const exwSalePrice = exwCost * (1 + g);
    const dapSalePrice = totalCost * (1 + g);
    
    // ===== 8. 双口径现金流分析 =====
    // 总投资口径：全部成本作为初始投资
    const cashFlowTotal = calculateCashFlow(inputs, {
        totalCost: C,
        monthlyRent,
        monthlyOperating,
        residualValue,
        basis: 'total',
        loanPayment: 0  // 总投资口径不考虑还款
    });
    
    // 自有资金口径：只考虑自有资金部分
    const equityRatio = inputs.downPaymentRate;  // 自有资金比例
    const equityInvestment = C * equityRatio;    // 自有资金 = 总投资 × 自有比例
    const equityLoanAmount = C * (1 - equityRatio);    // 融资额
    
    // 月还款额（等额本息）- 使用不同变量名避免冲突
    const equityLoanTerm = inputs.financingTerm || T;
    let equityLoanPayment = 0;
    if (equityLoanAmount > 0 && monthlyInterestRate > 0) {
        equityLoanPayment = equityLoanAmount * monthlyInterestRate * 
                      Math.pow(1 + monthlyInterestRate, equityLoanTerm) / 
                      (Math.pow(1 + monthlyInterestRate, equityLoanTerm) - 1);
    } else if (equityLoanAmount > 0) {
        equityLoanPayment = equityLoanAmount / equityLoanTerm;
    }
    
    const cashFlowEquity = calculateCashFlow(inputs, {
        totalCost: equityInvestment,  // 只投入自有资金
        monthlyRent,
        monthlyOperating: monthlyOperating + equityLoanPayment,  // 运营成本 + 月还款
        residualValue: residualValue * equityRatio,  // 残值也按比例
        basis: 'equity',
        loanPayment: equityLoanPayment
    });
    
    // ===== 9. 成本结构（用于图表） =====
    const costStructure = {
        purchase: costBreakdown.purchase,
        transport: costBreakdown.domesticFreight + costBreakdown.internationalFreight + 
                  costBreakdown.loadingFee,
        customs: costBreakdown.customsFee,
        insurance: costBreakdown.insurance,
        tax: costBreakdown.tax,
        contingency: costBreakdown.contingency,
        operating: totalOperating
    };
    
    // ===== 10. 维修成本明细 =====
    const maintenanceDetail = {
        minorMonthly: inputs.minorMaintPerMonth || 0,
        minorTotal: minorMaintTotal,
        majorYearly: inputs.majorMaintPerYear || 0,
        majorMonthly: majorMaintMonthly,
        majorTotal: majorMaintTotal,
        total: totalMaintenanceCost
    };
    
    // ===== 11. 财务漏斗数据 =====
    // 根据产品类型生成不同的漏斗数据
    const productType = PricingState.productType || 'lease';
    let topLayerLabel, topLayerValue;
    
    if (productType === 'lease') {
        topLayerLabel = '① 月租报价';
        topLayerValue = monthlyRent;
    } else if (productType === 'rent-to-own') {
        topLayerLabel = '① 首付+月供';
        topLayerValue = downPayment + monthlyInstallment;  // 首付 + 首月月供（概念值）
    } else {
        topLayerLabel = '① 销售价格';
        topLayerValue = dapSalePrice;
    }
    
    const funnelData = {
        productType,
        layer1: { label: '⑥ 采购价', value: funnelPurchase },
        layer2: { label: '⑤ 落地成本 C', value: C, tag: inputs.deliveryMode },
        layer3: { label: '④ 运营成本 O', value: operatingProvision },
        layer4: { label: '③ 目标毛利 30%', value: marginAmount, tag: `${(g * 100).toFixed(0)}%` },
        layer5: { label: '② 总收入目标 (24月)', value: requiredRevenue },
        layer6: { label: topLayerLabel, value: topLayerValue },
        // 各模式明细
        lease: { monthlyRent, dailyRent },
        rentToOwn: { downPayment, monthlyInstallment, totalPayment, months: n },
        sale: { exwSalePrice, dapSalePrice }
    };
    
    return {
        // 成本
        totalCost: C,
        exwCost,
        dapCost: totalCost,
        costBreakdown,
        costStructure,
        
        // 运营
        monthlyOperating,
        totalOperating,
        residualValue,
        maintenanceDetail,
        
        // 收入目标
        requiredRevenue,
        
        // 租赁报价
        dailyRent,
        monthlyRent,
        
        // 以租代售
        downPayment,
        monthlyInstallment,
        buyoutPrice: residualValue,
        totalPayment,
        installmentMonths: n,
        loanAmount,
        
        // 销售价
        exwSalePrice,
        dapSalePrice,
        priceRangeLow: dapSalePrice * 0.95,
        priceRangeHigh: dapSalePrice * 1.08,
        
        // 双口径现金流
        cashFlowTotal,
        cashFlowEquity,
        cashFlow: inputs.paybackBasis === 'total' ? cashFlowTotal : cashFlowEquity,
        paybackMonth: inputs.paybackBasis === 'total' ? cashFlowTotal.paybackMonth : cashFlowEquity.paybackMonth,
        
        // 财务漏斗
        funnelData,
        
        // 交付对比
        costDiff: totalCost - exwCost
    };
}

function calculateCashFlow(inputs, params) {
    const T = inputs.paybackPeriod;
    const u = inputs.utilization;
    const { totalCost, monthlyRent, monthlyOperating, residualValue, basis = 'total' } = params;
    
    const months = [];
    const cumulativeIncome = [];
    const cumulativeExpense = [];
    const netCashFlow = [];
    
    // 初始投资
    let cumIncome = 0;
    let cumExpense = totalCost;
    let paybackMonth = -1;
    
    for (let m = 1; m <= T; m++) {
        months.push(`M${m}`);
        
        // 月收入（考虑利用率）
        const income = monthlyRent * u;
        cumIncome += income;
        
        // 月支出（运营成本）
        cumExpense += monthlyOperating;
        
        cumulativeIncome.push(cumIncome);
        cumulativeExpense.push(cumExpense);
        
        // 净现金流 = 累计收入 - 累计支出 + 残值（最后一个月）
        let net = cumIncome - cumExpense;
        if (m === T) {
            net += residualValue;
        }
        netCashFlow.push(net);
        
        // 记录回本月份
        if (paybackMonth === -1 && net >= 0) {
            paybackMonth = m;
        }
    }
    
    return {
        months,
        cumulativeIncome,
        cumulativeExpense,
        netCashFlow,
        paybackMonth: paybackMonth > 0 ? paybackMonth : T + 1,
        basis,
        initialInvestment: totalCost
    };
}

// ==================== 显示更新 ====================
function updateDisplay() {
    const results = PricingState.lastResults;
    if (!results) return;
    
    const rate = parseFloat(document.getElementById('exchangeRate')?.value) || 68.5;
    const currency = PricingState.currency;
    
    // 安全设置元素文本
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };
    
    // 格式化函数
    const format = (value, curr = currency) => {
        if (curr === 'BOTH') {
            return `¥${Math.round(value).toLocaleString()} / ₸${Math.round(value * rate).toLocaleString()}`;
        } else if (curr === 'KZT') {
            return `₸${Math.round(value * rate).toLocaleString()}`;
        }
        return `¥${Math.round(value).toLocaleString()}`;
    };
    
    // 租赁报价
    setText('dailyRent', format(results.dailyRent));
    setText('monthlyRent', format(results.monthlyRent));
    setText('noteUtilization', (parseFloat(document.getElementById('utilization')?.value) || 70) + '%');
    setText('noteMargin', (parseFloat(document.getElementById('targetMargin')?.value) || 30) + '%');
    
    // 以租代售
    setText('downPayment', format(results.downPayment));
    setText('installmentMonths', results.installmentMonths);
    setText('monthlyInstallment', format(results.monthlyInstallment));
    setText('buyoutPrice', format(results.buyoutPrice));
    setText('totalPayment', format(results.totalPayment));
    
    // 销售价
    setText('exwPrice', format(results.exwSalePrice));
    setText('dapPrice', format(results.dapSalePrice));
    setText('priceRange', `${format(results.priceRangeLow)} ~ ${format(results.priceRangeHigh)}`);
    
    // 对比卡片
    setText('costDiff', `+${format(results.costDiff, 'CNY')}`);
    
    // 回本状态
    const paybackPeriod = parseInt(document.getElementById('paybackPeriod')?.value) || 24;
    setText('paybackMonth', `第${results.paybackMonth}个月`);
    
    const statusEl = document.getElementById('paybackStatus');
    if (statusEl) {
        if (results.paybackMonth <= paybackPeriod) {
            statusEl.textContent = `✅ 满足${paybackPeriod}个月回本`;
            statusEl.className = 'payback-status success';
        } else {
            statusEl.textContent = `⚠️ 超出${paybackPeriod}个月目标`;
            statusEl.className = 'payback-status warning';
        }
    }
    
    // 更新汇率显示
    setText('rateDisplay', rate);
    
    // 更新财务漏斗
    updateFunnel(results.funnelData);
    
    // 更新回本口径指示器
    updatePaybackIndicators(results);
}

// 更新财务漏斗显示
function updateFunnel(funnelData) {
    if (!funnelData) return;
    
    const productType = funnelData.productType || 'lease';
    
    // Layer 6 (底部): 采购价
    const funnelPurchase = document.getElementById('funnelPurchase');
    if (funnelPurchase) funnelPurchase.textContent = `¥${Math.round(funnelData.layer1.value).toLocaleString()}`;
    
    // Layer 5: 落地成本
    const funnelLanding = document.getElementById('funnelLanding');
    const funnelDeliveryTag = document.getElementById('funnelDeliveryTag');
    if (funnelLanding) {
        funnelLanding.textContent = `¥${Math.round(funnelData.layer2.value).toLocaleString()}`;
    }
    if (funnelDeliveryTag) funnelDeliveryTag.textContent = funnelData.layer2.tag;
    
    // Layer 4: 运营成本
    const funnelOperating = document.getElementById('funnelOperating');
    if (funnelOperating) funnelOperating.textContent = `¥${Math.round(funnelData.layer3.value).toLocaleString()}`;
    
    // Layer 3: 目标毛利
    const funnelProfit = document.getElementById('funnelProfit');
    if (funnelProfit) funnelProfit.textContent = `¥${Math.round(funnelData.layer4.value).toLocaleString()}`;
    
    // Layer 2: 总收入目标
    const funnelRevenue = document.getElementById('funnelRevenue');
    if (funnelRevenue) funnelRevenue.textContent = `¥${Math.round(funnelData.layer5.value).toLocaleString()}`;
    
    // Layer 1 (顶部): 根据产品类型显示不同报价
    const funnelQuote = document.getElementById('funnelQuote');
    const funnelQuoteLabel = document.getElementById('funnelQuoteLabel');
    
    if (funnelQuote) {
        if (productType === 'lease') {
            funnelQuote.textContent = `¥${Math.round(funnelData.lease.monthlyRent).toLocaleString()}/月`;
            if (funnelQuoteLabel) funnelQuoteLabel.textContent = '① 月租报价';
        } else if (productType === 'rent-to-own') {
            const { downPayment, monthlyInstallment, months } = funnelData.rentToOwn;
            funnelQuote.innerHTML = `首付 ¥${Math.round(downPayment).toLocaleString()}<br>月供 ¥${Math.round(monthlyInstallment).toLocaleString()}×${months}期`;
            if (funnelQuoteLabel) funnelQuoteLabel.textContent = '① 以租代售';
        } else {
            funnelQuote.textContent = `¥${Math.round(funnelData.sale.dapSalePrice).toLocaleString()}`;
            if (funnelQuoteLabel) funnelQuoteLabel.textContent = '① 销售价格';
        }
    }
    
    // 更新关键洞察卡片
    updateFunnelInsights(funnelData);
}

// 更新漏斗洞察卡片
function updateFunnelInsights(funnelData) {
    const inputs = collectInputs();
    const results = PricingState.lastResults;
    
    // 采购价敏感性：采购价每降1%对月租的影响
    const purchaseDelta = funnelData.layer1.value * 0.01 / (1 - inputs.targetMargin) / (inputs.paybackPeriod * inputs.utilization);
    const insightPurchase = document.getElementById('insightPurchase');
    if (insightPurchase) insightPurchase.textContent = `¥${Math.round(purchaseDelta).toLocaleString()}`;
    
    // 交付方式差额
    const insightDelivery = document.getElementById('insightDelivery');
    if (insightDelivery) insightDelivery.textContent = `¥${Math.round(funnelData.layer2.value).toLocaleString()}`;
    
    // 交付差额对月租的影响
    const deliveryRentDelta = funnelData.layer2.value / (1 - inputs.targetMargin) / (inputs.paybackPeriod * inputs.utilization);
    const insightDeliveryRent = document.getElementById('insightDeliveryRent');
    if (insightDeliveryRent) insightDeliveryRent.textContent = `¥${Math.round(deliveryRentDelta).toLocaleString()}`;
    
    // 利用率敏感性：60% → 80% 对月租的影响
    const rent60 = results.requiredRevenue / (inputs.paybackPeriod * 0.60);
    const rent80 = results.requiredRevenue / (inputs.paybackPeriod * 0.80);
    const insightUtilization = document.getElementById('insightUtilization');
    if (insightUtilization) insightUtilization.textContent = `¥${Math.round(rent60 - rent80).toLocaleString()}`;
}

// 更新回本口径指示器
function updatePaybackIndicators(results) {
    const paybackPeriod = parseInt(document.getElementById('paybackPeriod')?.value) || 24;
    
    // 总投资回本月
    const totalMonthEl = document.getElementById('paybackMonthTotal');
    const totalStatusEl = document.getElementById('paybackStatusTotal');
    if (totalMonthEl && results.cashFlowTotal) {
        const month = results.cashFlowTotal.paybackMonth;
        totalMonthEl.textContent = `第${month}个月`;
        if (totalStatusEl) {
            if (month <= paybackPeriod) {
                totalStatusEl.textContent = '✅';
                totalStatusEl.className = 'payback-status success';
            } else {
                totalStatusEl.textContent = '⚠️';
                totalStatusEl.className = 'payback-status warning';
            }
        }
    }
    
    // 自有资金回本月（因为杠杆效应，应该比总投资回本更快）
    const equityMonthEl = document.getElementById('paybackMonthEquity');
    const equityStatusEl = document.getElementById('paybackStatusEquity');
    if (equityMonthEl && results.cashFlowEquity) {
        const month = results.cashFlowEquity.paybackMonth;
        equityMonthEl.textContent = `第${month}个月`;
        if (equityStatusEl) {
            if (month <= paybackPeriod) {
                equityStatusEl.textContent = '✅';
                equityStatusEl.className = 'payback-status success';
            } else {
                equityStatusEl.textContent = '⚠️';
                equityStatusEl.className = 'payback-status warning';
            }
        }
    }
    
    // 打印调试信息
    console.log('回本指标更新:', {
        总投资: results.cashFlowTotal?.paybackMonth,
        自有资金: results.cashFlowEquity?.paybackMonth,
        初始投资_总: results.cashFlowTotal?.initialInvestment,
        初始投资_自有: results.cashFlowEquity?.initialInvestment
    });
}

function updateFormulas(inputs, results) {
    const C = results.dapCost;
    const S = results.residualValue;
    const O = results.totalOperating;
    const g = inputs.targetMargin;
    const T = inputs.paybackPeriod;
    const u = inputs.utilization;
    
    // 成本公式
    document.getElementById('formulaCost').innerHTML = 
        `C = ¥${inputs.purchasePrice.toLocaleString()} + ¥${inputs.domesticFreight.toLocaleString()} + ` +
        `¥${inputs.internationalFreight.toLocaleString()} + ¥${inputs.loadingFee.toLocaleString()} + ` +
        `¥${inputs.customsFee.toLocaleString()} + ¥${inputs.insuranceFee.toLocaleString()} + ` +
        `¥${inputs.contingencyFee.toLocaleString()} + ¥${Math.round(results.costBreakdown.tax).toLocaleString()} = ` +
        `<strong>¥${Math.round(C).toLocaleString()}</strong>`;
    
    // 运营成本公式（含大小修）
    const minorMaint = inputs.minorMaintPerMonth || 0;
    const majorMaintMonthly = (inputs.majorMaintPerYear || 0) / 12;
    const monthlyOp = minorMaint + majorMaintMonthly + inputs.monthlyInsurance + 
                     inputs.managementFee + inputs.yardFee;
    document.getElementById('formulaOperating').innerHTML = 
        `O = (小修¥${minorMaint.toLocaleString()} + 大修¥${Math.round(majorMaintMonthly).toLocaleString()} + ` +
        `保险¥${inputs.monthlyInsurance.toLocaleString()} + 管理¥${inputs.managementFee.toLocaleString()} + ` +
        `场地¥${inputs.yardFee.toLocaleString()}) × ${T}月 = <strong>¥${O.toLocaleString()}</strong>`;
    
    // 残值公式
    document.getElementById('formulaResidual').innerHTML = 
        `S = ¥${inputs.purchasePrice.toLocaleString()} × ${(inputs.residualRate * 100).toFixed(0)}% = ` +
        `<strong>¥${S.toLocaleString()}</strong>`;
    
    // 总收入公式
    document.getElementById('formulaRevenue').innerHTML = 
        `R<sub>total</sub> = (¥${Math.round(C).toLocaleString()} - ¥${S.toLocaleString()} + ¥${O.toLocaleString()}) / ${(1-g).toFixed(2)} = ` +
        `<strong>¥${Math.round(results.requiredRevenue).toLocaleString()}</strong>`;
    
    // 月租公式
    document.getElementById('formulaRent').innerHTML = 
        `R<sub>month</sub> = ¥${Math.round(results.requiredRevenue).toLocaleString()} / (${T} × ${u.toFixed(2)}) = ` +
        `<strong>¥${Math.round(results.monthlyRent).toLocaleString()}</strong>`;
}

// ==================== 图表 ====================
function initCharts() {
    initCostChart();
    initCashFlowChart();
    initSensitivityChart();
}

function initCostChart() {
    const ctx = document.getElementById('costChart');
    if (!ctx) return;
    
    PricingState.charts.cost = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['采购成本', '运输费用', '清关服务', '保险', '税费', '预备费', '运营预提'],
            datasets: [{
                data: [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
                    '#ef4444', '#6b7280', '#ec4899'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '55%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { boxWidth: 12, padding: 10, font: { size: 11 } }
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
    });
}

function initCashFlowChart() {
    const ctx = document.getElementById('cashFlowChart');
    if (!ctx) return;
    
    PricingState.charts.cashFlow = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: '累计收入',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: false,
                    tension: 0.3
                },
                {
                    label: '累计支出',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: false,
                    tension: 0.3
                },
                {
                    label: '净现金流',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ¥${Math.round(ctx.raw).toLocaleString()}`
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

function initSensitivityChart() {
    const ctx = document.getElementById('sensitivityChart');
    if (!ctx) return;
    
    PricingState.charts.sensitivity = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['利用率', '运费', '汇率', '残值'],
            datasets: [{
                label: '月租变化',
                data: [0, 0, 0, 0],
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const sign = ctx.raw >= 0 ? '+' : '';
                            return `月租变化: ${sign}¥${Math.round(ctx.raw).toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        callback: (value) => {
                            const sign = value >= 0 ? '+' : '';
                            return sign + '¥' + (value / 1000).toFixed(0) + 'k';
                        }
                    }
                }
            }
        }
    });
}

function updateCharts(results) {
    console.log('updateCharts called with:', results);
    console.log('costStructure:', results.costStructure);
    console.log('cashFlow:', results.cashFlow);
    
    // 更新成本构成图
    if (PricingState.charts.cost) {
        const cs = results.costStructure;
        console.log('Updating cost chart with:', [cs.purchase, cs.transport, cs.customs, cs.insurance, cs.tax, cs.contingency, cs.operating]);
        PricingState.charts.cost.data.datasets[0].data = [
            cs.purchase, cs.transport, cs.customs, cs.insurance, 
            cs.tax, cs.contingency, cs.operating
        ];
        PricingState.charts.cost.update();
    } else {
        console.warn('Cost chart not initialized');
    }
    
    // 更新现金流图（根据当前口径）
    if (PricingState.charts.cashFlow) {
        const cf = results.cashFlow;
        PricingState.charts.cashFlow.data.labels = cf.months;
        PricingState.charts.cashFlow.data.datasets[0].data = cf.cumulativeIncome;
        PricingState.charts.cashFlow.data.datasets[1].data = cf.cumulativeExpense;
        PricingState.charts.cashFlow.data.datasets[2].data = cf.netCashFlow;
        PricingState.charts.cashFlow.update();
    }
    
    // 更新双口径对比图（如果存在）
    updateDualBasisChart(results);
    
    // 更新利用率-月租曲线（如果存在）
    updateUtilizationChart(results);
    
    // 更新维修成本瀑布图（如果存在）
    updateMaintenanceChart(results);
}

// 双口径对比图更新
function updateDualBasisChart(results) {
    const chartTotal = document.getElementById('cashFlowChartTotal');
    const chartEquity = document.getElementById('cashFlowChartEquity');
    
    if (!chartTotal || !chartEquity) return;
    
    // 检查数据有效性
    if (!results.cashFlowTotal || !results.cashFlowTotal.months || 
        !results.cashFlowEquity || !results.cashFlowEquity.months) {
        console.warn('No valid cash flow data for dual basis chart');
        return;
    }
    
    // 初始化或更新总投资口径图
    if (!PricingState.charts.cashFlowTotal) {
        PricingState.charts.cashFlowTotal = new Chart(chartTotal, {
            type: 'line',
            data: {
                labels: results.cashFlowTotal.months,
                datasets: [{
                    label: '净现金流（总投资）',
                    data: results.cashFlowTotal.netCashFlow,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3
                }, {
                    label: '零线',
                    data: results.cashFlowTotal.months.map(() => 0),
                    borderColor: '#94a3b8',
                    borderDash: [5, 5],
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: '总投资口径', font: { size: 12 } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ¥${Math.round(ctx.raw).toLocaleString()}`
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
    } else {
        PricingState.charts.cashFlowTotal.data.labels = results.cashFlowTotal.months;
        PricingState.charts.cashFlowTotal.data.datasets[0].data = results.cashFlowTotal.netCashFlow;
        PricingState.charts.cashFlowTotal.data.datasets[1].data = results.cashFlowTotal.months.map(() => 0);
        PricingState.charts.cashFlowTotal.update();
    }
    
    // 初始化或更新自有资金口径图
    if (!PricingState.charts.cashFlowEquity) {
        PricingState.charts.cashFlowEquity = new Chart(chartEquity, {
            type: 'line',
            data: {
                labels: results.cashFlowEquity.months,
                datasets: [{
                    label: '净现金流（自有资金）',
                    data: results.cashFlowEquity.netCashFlow,
                    borderColor: '#ec4899',
                    backgroundColor: 'rgba(236, 72, 153, 0.1)',
                    fill: true,
                    tension: 0.3
                }, {
                    label: '零线',
                    data: results.cashFlowEquity.months.map(() => 0),
                    borderColor: '#94a3b8',
                    borderDash: [5, 5],
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: '自有资金口径', font: { size: 12 } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ¥${Math.round(ctx.raw).toLocaleString()}`
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
    } else {
        PricingState.charts.cashFlowEquity.data.labels = results.cashFlowEquity.months;
        PricingState.charts.cashFlowEquity.data.datasets[0].data = results.cashFlowEquity.netCashFlow;
        PricingState.charts.cashFlowEquity.data.datasets[1].data = results.cashFlowEquity.months.map(() => 0);
        PricingState.charts.cashFlowEquity.update();
    }
}

// 利用率-月租曲线更新
function updateUtilizationChart(results) {
    const ctx = document.getElementById('utilizationChart');
    if (!ctx) return;
    
    const inputs = collectInputs();
    const baseRent = results.monthlyRent || 0;
    const currentU = inputs.utilization || 0.7;
    
    // 如果没有有效数据，不更新图表
    if (!results.requiredRevenue || results.requiredRevenue <= 0) {
        console.warn('No valid requiredRevenue for utilization chart');
        return;
    }
    
    // 生成利用率曲线数据（50%-95%）
    const utilizationLevels = [];
    const rentLevels = [];
    
    for (let u = 0.50; u <= 0.95; u += 0.05) {
        utilizationLevels.push((u * 100).toFixed(0) + '%');
        // R_month = R_total / (T × u)
        const T = inputs.paybackPeriod || 24;
        const rent = results.requiredRevenue / (T * u);
        rentLevels.push(isNaN(rent) ? 0 : rent);
    }
    
    if (!PricingState.charts.utilization) {
        PricingState.charts.utilization = new Chart(ctx, {
            type: 'line',
            data: {
                labels: utilizationLevels,
                datasets: [{
                    label: '建议月租',
                    data: rentLevels,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `月租: ¥${Math.round(ctx.raw).toLocaleString()}`
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => '¥' + (value / 1000).toFixed(0) + 'k'
                        }
                    }
                }
            }
        });
    } else {
        PricingState.charts.utilization.data.labels = utilizationLevels;
        PricingState.charts.utilization.data.datasets[0].data = rentLevels;
        PricingState.charts.utilization.update();
    }
    
    // 更新当前利用率标记
    const markerEl = document.querySelector('.utilization-marker');
    if (markerEl) {
        markerEl.innerHTML = `📍 当前设定：利用率 <strong>${(currentU * 100).toFixed(0)}%</strong> → 月租 <strong>¥${Math.round(baseRent).toLocaleString()}</strong>`;
    }
}

// 维修成本瀑布图更新
function updateMaintenanceChart(results) {
    const ctx = document.getElementById('maintenanceChart');
    if (!ctx) return;
    
    const maint = results.maintenanceDetail;
    if (!maint) {
        console.warn('No maintenance detail for chart');
        return;
    }
    
    const inputs = collectInputs();
    const labels = ['小修（月度累计）', '大修（年度分摊）', '维修总计'];
    const values = [
        maint.minorTotal || 0, 
        maint.majorTotal || 0, 
        maint.total || 0
    ];
    
    if (!PricingState.charts.maintenance) {
        PricingState.charts.maintenance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '维修成本',
                    data: values,
                    backgroundColor: ['#10b981', '#f59e0b', '#3b82f6'],
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
                            label: (ctx) => `${ctx.label}: ¥${Math.round(ctx.raw).toLocaleString()}`
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => '¥' + (value / 10000).toFixed(1) + '万'
                        }
                    }
                }
            }
        });
    } else {
        PricingState.charts.maintenance.data.datasets[0].data = values;
        PricingState.charts.maintenance.update();
    }
    
    // 更新维修汇总
    const summaryEl = document.querySelector('.maintenance-summary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <span>小修 ${inputs.paybackPeriod}月: ¥${maint.minorTotal.toLocaleString()}</span>
            <span>大修预提: ¥${maint.majorTotal.toLocaleString()}</span>
            <span><strong>合计: ¥${maint.total.toLocaleString()}</strong></span>
        `;
    }
}

function switchCostChartType(type) {
    document.querySelectorAll('.chart-toggle .chart-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.includes(type === 'doughnut' ? '饼' : '柱'));
    });
    
    if (PricingState.charts.cost) {
        PricingState.charts.cost.destroy();
    }
    
    const ctx = document.getElementById('costChart');
    const results = PricingState.lastResults;
    const cs = results.costStructure;
    
    PricingState.charts.cost = new Chart(ctx, {
        type: type,
        data: {
            labels: ['采购成本', '运输费用', '清关服务', '保险', '税费', '预备费', '运营预提'],
            datasets: [{
                data: [cs.purchase, cs.transport, cs.customs, cs.insurance, 
                       cs.tax, cs.contingency, cs.operating],
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
                    '#ef4444', '#6b7280', '#ec4899'
                ],
                borderWidth: type === 'doughnut' ? 2 : 0,
                borderColor: '#fff',
                borderRadius: type === 'bar' ? 4 : 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            ...(type === 'doughnut' ? {
                cutout: '55%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 12, padding: 10, font: { size: 11 } }
                    }
                }
            } : {
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => '¥' + (value / 10000).toFixed(0) + '万'
                        }
                    }
                }
            })
        }
    });
}

// ==================== 敏感性分析 ====================
function updateSensitivity() {
    const sensU = parseInt(document.getElementById('sensUtilization')?.value) || 0;
    const sensF = parseInt(document.getElementById('sensFreight')?.value) || 0;
    const sensE = parseInt(document.getElementById('sensExchange')?.value) || 0;
    const sensR = parseInt(document.getElementById('sensResidual')?.value) || 0;
    
    // 安全设置文本
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };
    
    // 更新显示值
    setText('sensUtilizationVal', (sensU >= 0 ? '+' : '') + sensU + '%');
    setText('sensFreightVal', (sensF >= 0 ? '+' : '') + sensF + '%');
    setText('sensExchangeVal', (sensE >= 0 ? '+' : '') + sensE + '%');
    setText('sensResidualVal', (sensR >= 0 ? '+' : '') + sensR + '%');
    
    // 重新计算
    const baseInputs = collectInputs();
    const baseResults = PricingState.lastResults;
    if (!baseResults) return;
    
    const baseRent = baseResults.monthlyRent;
    
    // 计算各因素对月租的影响
    const impacts = [];
    
    // 利用率影响（利用率提高→月租降低）
    const adjU = baseInputs.utilization * (1 + sensU / 100);
    const rentU = baseResults.requiredRevenue / (baseInputs.paybackPeriod * adjU);
    impacts.push(rentU - baseRent);
    
    // 运费影响（运费提高→月租提高）
    const adjInputsF = { ...baseInputs };
    adjInputsF.internationalFreight *= (1 + sensF / 100);
    adjInputsF.domesticFreight *= (1 + sensF / 100);
    const resultsF = computePricing(adjInputsF);
    impacts.push(resultsF.monthlyRent - baseRent);
    
    // 汇率影响（本模型以CNY计价，汇率主要影响KZT显示）
    impacts.push(0); // 简化处理
    
    // 残值影响（残值提高→月租降低）
    const adjInputsR = { ...baseInputs };
    adjInputsR.residualRate *= (1 + sensR / 100);
    const resultsR = computePricing(adjInputsR);
    impacts.push(resultsR.monthlyRent - baseRent);
    
    // 更新图表
    if (PricingState.charts.sensitivity) {
        PricingState.charts.sensitivity.data.datasets[0].data = impacts;
        PricingState.charts.sensitivity.data.datasets[0].backgroundColor = impacts.map(v => 
            v >= 0 ? '#ef4444' : '#10b981'
        );
        PricingState.charts.sensitivity.update();
    }
    
    // 计算综合调整后的月租
    const totalImpact = impacts.reduce((a, b) => a + b, 0);
    const adjustedRent = baseRent + totalImpact;
    
    setText('adjustedRent', `¥${Math.round(adjustedRent).toLocaleString()}`);
    setText('rentChange', (totalImpact >= 0 ? '+' : '') + `¥${Math.round(totalImpact).toLocaleString()}`);
    
    const rentChangeEl = document.getElementById('rentChange');
    if (rentChangeEl) {
        rentChangeEl.className = 'rent-change ' + (totalImpact >= 0 ? 'increase' : 'decrease');
    }
}

// ==================== 弹窗控制 ====================
function showModal(name) {
    const modal = document.getElementById('modal' + name.charAt(0).toUpperCase() + name.slice(1));
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(name) {
    const modal = document.getElementById('modal' + name.charAt(0).toUpperCase() + name.slice(1));
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// hideModal 作为 closeModal 的别名
function hideModal(name) {
    closeModal(name);
}

// 显示漏斗层级详情
function showFunnelDetail(layer) {
    const results = PricingState.lastResults;
    const inputs = collectInputs();
    
    const details = {
        1: {
            title: '① 设备采购价（对内成本）',
            content: `
                <p><strong>采购单价：</strong>¥${inputs.purchasePrice.toLocaleString()}</p>
                <p><strong>数量：</strong>${inputs.quantity} 台</p>
                <p><strong>设备状态：</strong>${inputs.equipmentCondition === 'new' ? '全新' : '二手' + inputs.equipmentCondition + '级'}</p>
                <p class="tip">💡 这是对内成本的起点，不对外展示</p>
            `
        },
        2: {
            title: '② 落地总成本 C（' + inputs.deliveryMode + '）',
            content: `
                <p><strong>采购价：</strong>¥${inputs.purchasePrice.toLocaleString()}</p>
                <p><strong>国内运费：</strong>¥${inputs.domesticFreight.toLocaleString()}</p>
                ${inputs.deliveryMode === 'DAP' ? `
                <p><strong>国际运费：</strong>¥${inputs.internationalFreight.toLocaleString()}</p>
                <p><strong>装卸费：</strong>¥${inputs.loadingFee.toLocaleString()}</p>
                <p><strong>清关费：</strong>¥${inputs.customsFee.toLocaleString()}</p>
                <p><strong>保险：</strong>¥${inputs.insuranceFee.toLocaleString()}</p>
                <p><strong>税费：</strong>¥${Math.round(results.costBreakdown.tax).toLocaleString()}</p>
                ` : ''}
                <p><strong>落地总成本：</strong>¥${Math.round(results.totalCost).toLocaleString()}</p>
            `
        },
        3: {
            title: '③ 自有资金占用 E（融资模式）',
            content: `
                <p><strong>落地成本：</strong>¥${Math.round(results.totalCost).toLocaleString()}</p>
                <p><strong>首付比例：</strong>${(inputs.downPaymentRate * 100).toFixed(0)}%</p>
                <p><strong>自有资金：</strong>¥${Math.round(results.totalCost * inputs.downPaymentRate).toLocaleString()}</p>
                <p><strong>融资金额：</strong>¥${Math.round(results.loanAmount).toLocaleString()}</p>
                <p class="tip">💡 使用融资时，以自有资金为回本基数可能更快达到回本</p>
            `
        },
        4: {
            title: '④ 运营成本 O（' + inputs.paybackPeriod + '个月）',
            content: `
                <p><strong>小修（月度）：</strong>¥${(inputs.minorMaintPerMonth || 0).toLocaleString()} × ${inputs.paybackPeriod}月 = ¥${((inputs.minorMaintPerMonth || 0) * inputs.paybackPeriod).toLocaleString()}</p>
                <p><strong>大修（年度分摊）：</strong>¥${(inputs.majorMaintPerYear || 0).toLocaleString()}/年 ÷ 12 × ${inputs.paybackPeriod}月 = ¥${Math.round((inputs.majorMaintPerYear || 0) / 12 * inputs.paybackPeriod).toLocaleString()}</p>
                <p><strong>月保险：</strong>¥${inputs.monthlyInsurance.toLocaleString()} × ${inputs.paybackPeriod}月</p>
                <p><strong>管理费：</strong>¥${inputs.managementFee.toLocaleString()} × ${inputs.paybackPeriod}月</p>
                <p><strong>场地费：</strong>¥${inputs.yardFee.toLocaleString()} × ${inputs.paybackPeriod}月</p>
                <hr>
                <p><strong>运营总成本：</strong>¥${Math.round(results.totalOperating).toLocaleString()}</p>
            `
        },
        5: {
            title: '⑤ 目标毛利（' + (inputs.targetMargin * 100).toFixed(0) + '%）',
            content: `
                <p><strong>公式：</strong>毛利 = 总收入 × 毛利率</p>
                <p><strong>总收入目标：</strong>¥${Math.round(results.requiredRevenue).toLocaleString()}</p>
                <p><strong>毛利率：</strong>${(inputs.targetMargin * 100).toFixed(0)}%</p>
                <p><strong>毛利额：</strong>¥${Math.round(results.funnelData.layer5.value).toLocaleString()}</p>
                <p class="tip">💡 30%毛利率是行业常见水平，用于覆盖总部费用和利润</p>
            `
        },
        6: {
            title: '⑥ 总收入目标 R_total',
            content: `
                <p><strong>计算公式：</strong></p>
                <p style="background:#f8fafc;padding:12px;border-radius:6px;">R<sub>total</sub> = (C - S + O) / (1 - g)</p>
                <p><strong>落地成本 C：</strong>¥${Math.round(results.totalCost).toLocaleString()}</p>
                <p><strong>残值 S：</strong>¥${Math.round(results.residualValue).toLocaleString()}</p>
                <p><strong>运营成本 O：</strong>¥${Math.round(results.totalOperating).toLocaleString()}</p>
                <p><strong>毛利率 g：</strong>${(inputs.targetMargin * 100).toFixed(0)}%</p>
                <hr>
                <p><strong>总收入目标：</strong>¥${Math.round(results.requiredRevenue).toLocaleString()}</p>
            `
        },
        7: {
            title: '⑦ 对外报价（月租）',
            content: `
                <p><strong>计算公式：</strong></p>
                <p style="background:#f8fafc;padding:12px;border-radius:6px;">R<sub>month</sub> = R<sub>total</sub> / (T × u)</p>
                <p><strong>总收入目标：</strong>¥${Math.round(results.requiredRevenue).toLocaleString()}</p>
                <p><strong>回本周期 T：</strong>${inputs.paybackPeriod} 个月</p>
                <p><strong>利用率 u：</strong>${(inputs.utilization * 100).toFixed(0)}%</p>
                <hr>
                <p><strong>建议月租：</strong>¥${Math.round(results.monthlyRent).toLocaleString()}</p>
                <p><strong>建议日租：</strong>¥${Math.round(results.dailyRent).toLocaleString()}（按26工作日）</p>
            `
        }
    };
    
    const detail = details[layer];
    if (detail) {
        showModalContent(detail.title, detail.content);
    }
}

// 显示自定义弹窗内容
function showModalContent(title, content) {
    // 使用通用弹窗或创建临时弹窗
    let modal = document.getElementById('modalGeneric');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalGeneric';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeModal('generic')"></div>
            <div class="modal-content" style="max-width:500px;">
                <div class="modal-header">
                    <h2 id="modalGenericTitle"></h2>
                    <button class="modal-close" onclick="closeModal('generic')">×</button>
                </div>
                <div class="modal-body" id="modalGenericBody"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const titleEl = document.getElementById('modalGenericTitle');
    const bodyEl = document.getElementById('modalGenericBody');
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = content;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function showTooltip(name) {
    // 简单提示
    const tips = {
        purchasePrice: '设备采购成本，含增值税发票金额。二手设备根据成色等级自动调整默认值。',
        utilization: '设备实际出租时间占比。70%表示一年中约8.4个月处于出租状态。行业平均约60-75%。',
        residualValue: '24个月后设备预估残值。新机通常50-60%，二手机40-55%，视保养情况而定。',
        minorMaint: '小修包括：更换滤芯、润滑油、易损件等日常维护，通常每月发生。',
        majorMaint: '大修包括：发动机大修、液压系统翻新、变速箱维修等，通常每1-2年进行一次。',
        downtime: '因维修、天气或无订单导致的停机时间比例，会影响实际利用率。'
    };
    alert(tips[name] || '暂无说明');
}

// ==================== 工具函数 ====================
function resetToDefaults() {
    if (confirm('确定要重置所有参数为默认值吗？')) {
        location.reload();
    }
}

function exportQuote() {
    const results = PricingState.lastResults;
    if (!results) {
        alert('请先完成计算');
        return;
    }
    
    const inputs = collectInputs();
    const rate = inputs.exchangeRate;
    
    let content = `
═══════════════════════════════════════════════════════════
               哈萨克斯坦设备租售报价单
═══════════════════════════════════════════════════════════
生成时间: ${new Date().toLocaleString()}
───────────────────────────────────────────────────────────

【设备信息】
设备类型: ${inputs.equipmentType}
型号规格: ${inputs.equipmentModel}
设备状态: ${inputs.equipmentCondition === 'new' ? '全新' : '二手' + inputs.equipmentCondition + '级'}
数量: ${inputs.quantity} 台
采购单价: ¥${inputs.purchasePrice.toLocaleString()}

【交付方式】
${inputs.deliveryMode === 'DAP' ? 'DAP 到哈萨克（含运输+清关+保险）' : 'EXW 中国交付（不含跨境段）'}
运输路线: ${inputs.transportRoute}

───────────────────────────────────────────────────────────
                      📋 租赁报价
───────────────────────────────────────────────────────────
建议日租: ¥${Math.round(results.dailyRent).toLocaleString()} (₸${Math.round(results.dailyRent * rate).toLocaleString()})
建议月租: ¥${Math.round(results.monthlyRent).toLocaleString()} (₸${Math.round(results.monthlyRent * rate).toLocaleString()})
基于利用率: ${(inputs.utilization * 100).toFixed(0)}%
目标毛利率: ${(inputs.targetMargin * 100).toFixed(0)}%

───────────────────────────────────────────────────────────
                    🔄 以租代售方案
───────────────────────────────────────────────────────────
首付款: ¥${Math.round(results.downPayment).toLocaleString()}
月供 × ${results.installmentMonths}期: ¥${Math.round(results.monthlyInstallment).toLocaleString()}/月
期末买断价: ¥${Math.round(results.buyoutPrice).toLocaleString()}
总支付: ¥${Math.round(results.totalPayment).toLocaleString()}

───────────────────────────────────────────────────────────
                      💵 销售价格
───────────────────────────────────────────────────────────
EXW价（中国交付）: ¥${Math.round(results.exwSalePrice).toLocaleString()}
DAP价（到哈萨克）: ¥${Math.round(results.dapSalePrice).toLocaleString()}

───────────────────────────────────────────────────────────
                      💱 汇率参考
───────────────────────────────────────────────────────────
CNY/KZT: ${rate}

═══════════════════════════════════════════════════════════
※ 本报价单仅供参考，最终价格以正式合同为准
※ 税费口径: ${inputs.includeTaxInPrice ? '含税价（税费由卖方代缴）' : '不含税（买方自行清关）'}
═══════════════════════════════════════════════════════════
`;
    
    // 创建下载
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `报价单_${inputs.equipmentModel}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== 全局暴露 ====================
// 将 HTML onclick 调用的函数挂载到 window
window.setProductType = setProductType;
window.setPaybackBasis = setPaybackBasis;
window.toggleSection = toggleSection;
window.toggleCalculationDetails = toggleCalculationDetails;
window.showModal = showModal;
window.hideModal = hideModal;
window.closeModal = closeModal;
window.exportQuote = exportQuote;
window.scrollToTop = scrollToTop;
window.calculate = calculate;
window.updateSensitivity = updateSensitivity;
window.showFunnelDetail = showFunnelDetail;

// 初始化敏感性分析
setTimeout(() => {
    updateSensitivity();
}, 500);
