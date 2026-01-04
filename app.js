/**
 * 中哈跨境机械设备租售测算 - 主应用
 */

// 全局状态
window.appState = {
    businessMode: 'lease',      // lease | lease-to-sell
    paymentMode: 'full',        // full | financing
    currencyView: 'CNY',        // CNY | KZT | dual
    scenario: 'baseline',       // optimistic | baseline | conservative
    calculator: null,
    chartManager: null,
    scenarioResults: null,
    
    // 项目管理状态
    currentProjectId: null,     // 当前项目ID
    currentProject: null,       // 当前项目数据
    isNewProject: true,         // 是否新建项目
    isDirty: false              // 是否有未保存的修改
};

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 等待数据库就绪
    if (typeof db !== 'undefined') {
        await db.ready;
    }
    
    // 初始化计算器和图表
    appState.calculator = new Calculator();
    appState.chartManager = new ChartManager();
    appState.chartManager.init();

    // 绑定控制条事件
    initControlBar();

    // 绑定表单事件
    initFormEvents();

    // 绑定VAT抵扣显隐
    initVATDeductToggle();
    
    // 检查URL参数，加载项目
    await loadProjectFromURL();

    // 初始计算
    calculate();

    // 更新时间戳
    updateTimestamp();
    
    // 更新页面标题
    updatePageTitle();
});

/**
 * 从URL参数加载项目
 */
async function loadProjectFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    const autoCalc = urlParams.get('calc') === 'true';
    
    if (projectId) {
        try {
            const project = await db.getProject(projectId);
            if (project) {
                appState.currentProjectId = projectId;
                appState.currentProject = project;
                appState.isNewProject = false;
                
                // 填充表单数据
                populateFormFromProject(project);
                
                showToast(`已加载项目: ${project.name}`, 'success');
                
                if (autoCalc) {
                    calculate();
                }
            } else {
                showToast('项目不存在', 'error');
            }
        } catch (error) {
            console.error('加载项目失败:', error);
            showToast('加载项目失败', 'error');
        }
    }
}

/**
 * 将项目数据填充到表单
 */
function populateFormFromProject(project) {
    // 设备信息
    if (project.equipment) {
        setInputValue('equipmentType', project.equipment.type);
        setInputValue('equipmentModel', project.equipment.model);
        setInputValue('quantity', project.equipment.quantity);
        setInputValue('purchasePrice', project.equipment.purchasePrice);
        setInputValue('economicLife', project.equipment.economicLife);
        setInputValue('residualValueRate', project.equipment.residualValueRate * 100);
    }
    
    // 收入配置
    if (project.revenue) {
        setInputValue('monthlyRent', project.revenue.monthlyRent);
        setInputValue('installationFee', project.revenue.installationFee);
        setInputValue('maintenanceServiceFee', project.revenue.maintenanceServiceFee);
        setInputValue('leaseTerm', project.revenue.leaseTerm);
        
        // 租转售模式
        if (project.revenue.endSalePrice) {
            setInputValue('endSalePrice', project.revenue.endSalePrice);
        }
    }
    
    // 项目地址
    if (project.region) {
        setInputValue('targetRegion', project.region);
        updateCityOptions(); // 更新城市选项
    }
    if (project.city) {
        setInputValue('targetCity', project.city);
    }
    
    // 跨境成本
    if (project.crossborderCost) {
        setInputValue('domesticFreight', project.crossborderCost.domesticFreight);
        setInputValue('internationalFreight', project.crossborderCost.internationalFreight);
        setInputValue('portCharges', project.crossborderCost.portCharges);
        setInputValue('insuranceRate', project.crossborderCost.insuranceRate * 100);
        setInputValue('customsAgentFee', project.crossborderCost.customsAgentFee);
    }
    
    // 税费规则
    if (project.taxRules) {
        setInputValue('taxBasis', project.taxRules.taxBasis);
        setInputValue('tariffRate', project.taxRules.tariffRate * 100);
        setInputValue('vatRate', project.taxRules.vatRate * 100);
        
        const vatDeductible = document.getElementById('vatDeductible');
        if (vatDeductible) {
            vatDeductible.checked = project.taxRules.vatDeductible;
        }
    }
    
    // 汇率配置
    if (project.fxConfig) {
        setInputValue('exchangeRate', project.fxConfig.baseRate);
        setInputValue('fxVolatility', project.fxConfig.volatility * 100);
    }
    
    // 资金配置
    if (project.financing) {
        setInputValue('purchaseAdvanceRate', project.financing.purchaseAdvanceRate * 100);
        setInputValue('freightTaxAdvanceRate', project.financing.freightTaxAdvanceRate * 100);
        setInputValue('capitalCostRate', project.financing.capitalCostRate * 100);
        setInputValue('advancePeriod', project.financing.advancePeriod);
        
        // 设置付款模式
        appState.paymentMode = project.financing.mode || 'full';
        const paymentBtn = document.querySelector(`#paymentToggle [data-value="${appState.paymentMode}"]`);
        if (paymentBtn) {
            setActiveToggle('paymentToggle', paymentBtn);
            togglePaymentMode();
        }
    }
    
    // 业务模式
    if (project.businessMode) {
        appState.businessMode = project.businessMode;
        const modeBtn = document.querySelector(`#modeToggle [data-value="${appState.businessMode}"]`);
        if (modeBtn) {
            setActiveToggle('modeToggle', modeBtn);
            toggleLeaseToSellFields();
        }
    }
}

/**
 * 安全设置输入值
 */
function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) {
        el.value = value;
    }
}

/**
 * 更新页面标题
 */
function updatePageTitle() {
    const titleEl = document.querySelector('.page-title');
    const idEl = document.querySelector('.project-meta');
    
    if (appState.currentProject) {
        if (titleEl) {
            titleEl.textContent = appState.currentProject.name || '项目详情';
        }
        if (idEl) {
            const region = appState.currentProject.region || '--';
            const status = getStatusText(appState.currentProject.status);
            idEl.innerHTML = `ID: ${appState.currentProjectId} &nbsp; 区域: ${region} &nbsp; 状态: ${status} &nbsp; 更新: ${formatDate(appState.currentProject.updatedAt)}`;
        }
    } else {
        if (titleEl) {
            titleEl.textContent = '新建测算';
        }
        if (idEl) {
            idEl.innerHTML = 'ID: 未保存 &nbsp; 区域: -- &nbsp; 状态: 新建 &nbsp; 更新: --';
        }
    }
}

/**
 * 获取状态文本
 */
function getStatusText(status) {
    const map = {
        'draft': '草稿',
        'pending': '待审核',
        'approved': '已批准',
        'active': '进行中',
        'completed': '已完成',
        'archived': '已归档'
    };
    return map[status] || status || '草稿';
}

/**
 * 格式化日期
 */
function formatDate(dateStr) {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN');
}

/**
 * 初始化顶部控制条
 */
function initControlBar() {
    // 模式切换
    document.querySelectorAll('#modeToggle .toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setActiveToggle('modeToggle', this);
            appState.businessMode = this.dataset.value;
            toggleLeaseToSellFields();
            calculate();
        });
    });

    // 付款方式切换
    document.querySelectorAll('#paymentToggle .toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setActiveToggle('paymentToggle', this);
            appState.paymentMode = this.dataset.value;
            togglePaymentMode();
            calculate();
        });
    });

    // 币种视图切换
    document.querySelectorAll('#currencyToggle .toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setActiveToggle('currencyToggle', this);
            appState.currencyView = this.dataset.value;
            updateCurrencyDisplay();
        });
    });

    // 情景切换
    document.querySelectorAll('#scenarioToggle .toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setActiveToggle('scenarioToggle', this);
            appState.scenario = this.dataset.value;
            updateScenarioTag();
            calculate();
        });
    });
}

/**
 * 设置激活的切换按钮
 */
function setActiveToggle(groupId, activeBtn) {
    document.querySelectorAll(`#${groupId} .toggle-btn`).forEach(btn => {
        btn.classList.remove('active');
    });
    activeBtn.classList.add('active');
}

/**
 * 初始化表单事件
 */
function initFormEvents() {
    // 输入变化时更新预览
    const inputs = document.querySelectorAll('.input-panel input, .input-panel select');
    inputs.forEach(input => {
        input.addEventListener('change', debounce(() => {
            updatePreviews();
            // 如果是运输相关字段变化，重新计算运输费用
            if (['domesticFreight', 'internationalFreight', 'portCharges', 'customsAgentFee', 
                 'insuranceRate', 'insuranceBase', 'importDutyRate', 'destinationDelivery'].includes(input.id)) {
                calculateTransportCosts();
            }
        }, 300));
        input.addEventListener('input', debounce(() => {
            updatePreviews();
        }, 500));
    });
    
    // 特殊处理贸易术语变化
    const incotermsSelect = document.getElementById('incoterms');
    if (incotermsSelect) {
        incotermsSelect.addEventListener('change', () => {
            updateTransportResponsibility();
        });
    }
}

/**
 * 城市选项配置
 */
const CITY_OPTIONS = {
    '哈萨克斯坦': ['阿拉木图', '阿斯塔纳', '奇姆肯特', '阿克套', '卡拉干达'],
    '乌兹别克斯坦': ['塔什干', '撒马尔罕', '布哈拉', '纳沃伊', '安集延'],
    '吉尔吉斯斯坦': ['比什凯克', '奥什', '贾拉拉巴德'],
    '塔吉克斯坦': ['杜尚别', '苦盏', '库尔干秋别'],
    '土库曼斯坦': ['阿什哈巴德', '土库曼纳巴德', '达沙古兹']
};

/**
 * 更新城市选项
 */
function updateCityOptions() {
    const region = document.getElementById('targetRegion')?.value;
    const citySelect = document.getElementById('targetCity');
    if (!region || !citySelect) return;
    
    const cities = CITY_OPTIONS[region] || ['其他'];
    citySelect.innerHTML = cities.map(city => 
        `<option value="${city}">${city}</option>`
    ).join('');
}

/**
 * VAT抵扣切换
 */
function initVATDeductToggle() {
    const vatDeductible = document.getElementById('vatDeductible');
    if (vatDeductible) {
        vatDeductible.addEventListener('change', function() {
            const deductFields = document.querySelectorAll('.vat-deduct-only');
            deductFields.forEach(field => {
                field.style.display = this.checked ? 'block' : 'none';
            });
        });
    }
}

/**
 * 切换租转售字段显隐
 */
function toggleLeaseToSellFields() {
    const fields = document.querySelectorAll('.lease-to-sell-only');
    const show = appState.businessMode === 'lease-to-sell';
    fields.forEach(field => {
        field.style.display = show ? 'block' : 'none';
    });
    
    // 租转售模式下，如果期末出售价格为0，自动建议一个值（设备原值的30%作为残值出售）
    if (show) {
        const endSalePriceInput = document.getElementById('endSalePrice');
        const purchasePriceInput = document.getElementById('purchasePrice');
        if (endSalePriceInput && purchasePriceInput) {
            const currentEndSale = parseFloat(endSalePriceInput.value) || 0;
            const purchasePrice = parseFloat(purchasePriceInput.value) || 800000;
            if (currentEndSale === 0) {
                // 建议价格 = 采购价 × 30%（残值估算）
                endSalePriceInput.value = Math.round(purchasePrice * 0.3);
                showToast('💡 已自动填入建议出售价格（采购价×30%），可自行调整', 'info');
            }
        }
    }
}

/**
 * 切换付款模式显隐
 */
function togglePaymentMode() {
    const fullMode = document.querySelectorAll('.full-payment-mode');
    const financeMode = document.querySelectorAll('.financing-mode');
    
    if (appState.paymentMode === 'full') {
        fullMode.forEach(el => el.style.display = 'block');
        financeMode.forEach(el => el.style.display = 'none');
    } else {
        fullMode.forEach(el => el.style.display = 'none');
        financeMode.forEach(el => el.style.display = 'block');
    }
}

/**
 * 更新情景标签
 */
function updateScenarioTag() {
    const tag = document.getElementById('scenarioTag');
    const scenarios = {
        optimistic: {
            label: '乐观情景 📈',
            desc: '租金+10%, 运费-15%, 汇率-8%, 税费-10%, 运营-15%'
        },
        baseline: {
            label: '基准情景',
            desc: '所有参数按输入值计算'
        },
        conservative: {
            label: '保守情景 📉',
            desc: '租金-15%, 运费+25%, 汇率+15%, 税费+10%, 运营+20%'
        }
    };
    const s = scenarios[appState.scenario];
    tag.textContent = s.label;
    tag.title = s.desc;
}

/**
 * 折叠/展开区域
 */
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    section.classList.toggle('collapsed');
}

/**
 * 折叠/展开表格
 */
function toggleTable(tableId) {
    const table = document.getElementById(tableId);
    table.classList.toggle('collapsed');
    
    const header = table.previousElementSibling;
    const icon = header.querySelector('.collapse-icon');
    if (table.classList.contains('collapsed')) {
        icon.style.transform = 'rotate(-90deg)';
    } else {
        icon.style.transform = 'rotate(0deg)';
    }
}

/**
 * 更新预览信息
 */
function updatePreviews() {
    const calc = appState.calculator;
    calc.collectData();
    const d = calc.data;
    const fmt = Calculator.formatCurrency;

    // 收入预览
    const rentTotal = d.monthlyRent * d.leaseTerm * d.quantity;
    const installTotal = d.installationFee * d.quantity;
    const serviceTotal = d.maintenanceServiceFee * (d.leaseTerm / 12) * d.quantity;
    
    // 租转售模式下的期末出售收入
    let disposalTotal = 0;
    if (appState.businessMode === 'lease-to-sell' && d.endSalePrice > 0) {
        disposalTotal = d.endSalePrice * d.quantity;
    }
    
    let revenueHtml = `租金: ${fmt(rentTotal)} | 安装: ${fmt(installTotal)} | 服务: ${fmt(serviceTotal)}`;
    if (disposalTotal > 0) {
        revenueHtml += ` | <span style="color:#10b981;font-weight:600;">期末出售: ${fmt(disposalTotal)}</span>`;
    }
    document.getElementById('revenuePreview').innerHTML = revenueHtml;

    // 运输预览 - 基于贸易术语计算买方实际承担费用
    const incoterm = document.getElementById('incoterms')?.value;
    let transportTotal = 0;
    
    if (incoterm && INCOTERMS_RESPONSIBILITY[incoterm]) {
        const responsibility = INCOTERMS_RESPONSIBILITY[incoterm];
        
        // 只计算买方承担的费用
        if (responsibility.buyer.includes('国内段运费')) {
            transportTotal += d.domesticFreight;
        }
        if (responsibility.buyer.includes('国际段运费')) {
            transportTotal += d.internationalFreight;
        }
        if (responsibility.buyer.includes('口岸杂费')) {
            transportTotal += d.portCharges;
        }
        if (responsibility.buyer.includes('清关代理费')) {
            transportTotal += d.customsAgentFee;
        }
        if (responsibility.buyer.includes('运输保险')) {
            const insuranceBase = document.getElementById('insuranceBase')?.value || 'equipment';
            const insuranceCost = insuranceBase === 'cif' ? 
                (d.purchasePrice + d.domesticFreight + d.internationalFreight) * d.insuranceRate / 100 :
                d.purchasePrice * d.insuranceRate / 100;
            transportTotal += insuranceCost;
        }
        if (responsibility.buyer.includes('进口关税')) {
            const dutyRate = parseFloat(document.getElementById('importDutyRate')?.value) || 0;
            transportTotal += d.purchasePrice * dutyRate / 100;
        }
        if (responsibility.buyer.includes('目的地配送')) {
            const deliveryCost = parseFloat(document.getElementById('destinationDelivery')?.value) || 0;
            transportTotal += deliveryCost;
        }
        
        transportTotal *= d.quantity;
    } else {
        // 如果没有选择贸易术语，使用传统计算方式（提示用户）
        transportTotal = (d.domesticFreight + d.internationalFreight + d.portCharges + d.customsAgentFee) * d.quantity;
    }
    
    const purchaseTotal = d.purchasePrice * d.quantity;
    const transportRatio = transportTotal / purchaseTotal;
    
    const transportPreviewText = incoterm ? 
        `${incoterm}术语下买方承担: ${fmt(transportTotal)}` : 
        `总计: ${fmt(transportTotal)} (请先选择贸易术语)`;
    
    document.getElementById('transportPreview').innerHTML = transportPreviewText;
    
    const indicator = document.getElementById('transportRatioIndicator');
    let ratioClass = 'green';
    let ratioText = '正常';
    if (transportRatio > 0.20) {
        ratioClass = 'red';
        ratioText = '偏高⚠️';
    } else if (transportRatio > 0.15) {
        ratioClass = 'yellow';
        ratioText = '关注';
    }
    indicator.className = `ratio-indicator ${ratioClass}`;
    indicator.textContent = `占采购价 ${(transportRatio * 100).toFixed(1)}% - ${ratioText}`;

    // 税费预览
    let dutiableValue = purchaseTotal;
    if (d.taxBasis === 'CIF') {
        if (document.getElementById('includeFreight').checked) {
            dutiableValue += d.internationalFreight * d.quantity;
        }
    }
    const tariff = dutiableValue * d.tariffRate;
    const vatBase = dutiableValue + tariff;
    const vat = vatBase * d.vatRate;
    document.getElementById('taxPreview').innerHTML = `
        关税: ${fmt(tariff)} | VAT: ${fmt(vat)} | 合计: ${fmt(tariff + vat)}
    `;

    // 运营预览
    const annualOp = (d.annualMaintenance + d.localParts + d.localServiceFee + d.otherOperatingCost) * d.quantity;
    document.getElementById('operatingPreview').innerHTML = `
        年度: ${fmt(annualOp)} | 单台: ${fmt(annualOp / d.quantity)}/年
    `;

    // 资金预览
    if (appState.paymentMode === 'full') {
        const advanceAmt = purchaseTotal * d.purchaseAdvanceRate + transportTotal * d.freightTaxAdvanceRate;
        const interest = advanceAmt * d.capitalCostRate * (d.advancePeriod / 12);
        document.getElementById('financingPreview').innerHTML = `
            <span style="color:#6366f1;">【全款垫资】</span> 垫资额: ${fmt(advanceAmt)} | 资金成本: ${fmt(interest)}
        `;
    } else {
        const totalCost = purchaseTotal + transportTotal + tariff + vat;
        const downPayment = totalCost * d.downPaymentRate;
        const financing = totalCost - downPayment;
        // 计算利息
        const monthlyRate = d.financingRate / 12;
        const n = d.financingTerm;
        let totalInterest = 0;
        if (d.repaymentMethod === 'equal' && monthlyRate > 0) {
            const monthlyPayment = financing * monthlyRate * Math.pow(1 + monthlyRate, n) / (Math.pow(1 + monthlyRate, n) - 1);
            totalInterest = monthlyPayment * n - financing;
        } else {
            totalInterest = financing * d.financingRate * (n / 12);
        }
        const handlingFee = financing * d.handlingFeeRate;
        document.getElementById('financingPreview').innerHTML = `
            <span style="color:#f59e0b;">【融资租赁】</span> 首付: ${fmt(downPayment)} | 融资: ${fmt(financing)} | 利息: ${fmt(totalInterest)} | 手续费: ${fmt(handlingFee)}
        `;
    }

    // 汇率预览
    const baseRate = d.exchangeRate;
    const vol = d.exchangeVolatility;
    document.getElementById('exchangePreview').innerHTML = `
        1 CNY = ${baseRate.toFixed(2)} KZT<br>
        波动区间: ${(baseRate * (1 - vol)).toFixed(2)} ~ ${(baseRate * (1 + vol)).toFixed(2)} KZT
    `;
}

/**
 * 主计算函数
 */
function calculate() {
    const calc = appState.calculator;
    const results = calc.calculate();
    
    // 验证数据
    const validation = calc.validate();
    updateDataStatus(validation);

    // 计算所有情景
    appState.scenarioResults = calc.calculateAllScenarios();

    // 更新KPI卡片
    updateKPICards(results);

    // 更新图表
    updateCharts(results);

    // 更新明细表
    updateDetailTables(results);

    // 更新预览
    updatePreviews();

    // 更新时间戳
    updateTimestamp();
    
    // 如果有项目ID，自动同步到数据库（静默保存）
    if (typeof projectState !== 'undefined' && projectState.projectId) {
        autoSyncToDatabase();
    }
}

/**
 * 自动同步测算结果到数据库（静默）
 */
async function autoSyncToDatabase() {
    if (!window.db || !projectState?.projectId) return;
    
    try {
        const snapshot = typeof collectFormSnapshot === 'function' ? collectFormSnapshot() : {};
        const result = typeof collectCalcResult === 'function' ? collectCalcResult() : null;
        
        if (result) {
            await db.updateProject(projectState.projectId, {
                latestResult: {
                    ...result,
                    inputsSnapshot: snapshot,
                    calculatedAt: new Date().toISOString()
                },
                updatedAt: new Date().toISOString()
            });
            
            // 标记为已同步
            if (typeof projectState !== 'undefined') {
                projectState.isDirty = false;
            }
        }
    } catch (error) {
        console.warn('自动同步失败:', error);
    }
}

/**
 * 更新数据状态
 */
function updateDataStatus(validation) {
    const status = document.getElementById('dataStatus');
    if (validation.errors.length > 0) {
        status.className = 'data-status error';
        status.textContent = `❌ ${validation.errors[0]}`;
    } else if (validation.warnings.length > 0) {
        status.className = 'data-status warning';
        status.textContent = `⚠️ ${validation.warnings[0]}`;
    } else {
        status.className = 'data-status';
        status.textContent = '✅ 数据完整';
    }
}

/**
 * 更新KPI卡片 - 3种毛利率 + 2种回本
 */
function updateKPICards(results) {
    const fmt = Calculator.formatCurrency;
    const fmtNum = Calculator.formatNumber;
    const fmtPct = Calculator.formatPercent;

    // 获取毛利率和回本数据
    const gm = results.grossMargins;
    const pb = results.paybackPeriods;
    const compliance = results.compliance;
    const thresholds = results.thresholds;

    // === 毛利率指标 ===
    // GM1 经营毛利率
    updateGMCard('kpiGM1', 'kpiGM1Indicator', gm.gm1, compliance.gm1.pass);
    document.querySelector('.kpi-card[onclick*="gm1"]')?.classList.toggle('pass', compliance.gm1.pass);
    document.querySelector('.kpi-card[onclick*="gm1"]')?.classList.toggle('fail', !compliance.gm1.pass);

    // GM2 含摊销毛利率
    updateGMCard('kpiGM2', 'kpiGM2Indicator', gm.gm2, compliance.gm2.pass);
    document.querySelector('.kpi-card[onclick*="gm2"]')?.classList.toggle('pass', compliance.gm2.pass);
    document.querySelector('.kpi-card[onclick*="gm2"]')?.classList.toggle('fail', !compliance.gm2.pass);

    // GM3 全口径毛利率
    updateGMCard('kpiGM3', 'kpiGM3Indicator', gm.gm3, compliance.gm3.pass);
    document.querySelector('.kpi-card[onclick*="gm3"]')?.classList.toggle('pass', compliance.gm3.pass);
    document.querySelector('.kpi-card[onclick*="gm3"]')?.classList.toggle('fail', !compliance.gm3.pass);

    // === 回本指标 ===
    // PB1 项目回本
    updatePBCard('kpiPB1', 'kpiPB1Indicator', pb.pb1, compliance.pb1.pass);
    document.querySelector('.kpi-card[onclick*="pb1"]')?.classList.toggle('pass', compliance.pb1.pass);
    document.querySelector('.kpi-card[onclick*="pb1"]')?.classList.toggle('fail', !compliance.pb1.pass);

    // PB2 股东回本
    updatePBCard('kpiPB2', 'kpiPB2Indicator', pb.pb2, compliance.pb2.pass);
    document.querySelector('.kpi-card[onclick*="pb2"]')?.classList.toggle('pass', compliance.pb2.pass);
    document.querySelector('.kpi-card[onclick*="pb2"]')?.classList.toggle('fail', !compliance.pb2.pass);

    // === 更新达标警告条 ===
    updateComplianceAlert(compliance);

    // === 更新达标阈值反推 ===
    updateThresholdPanel(thresholds, results);
}

/**
 * 更新毛利率卡片
 */
function updateGMCard(valueId, indicatorId, value, pass) {
    const valueEl = document.getElementById(valueId);
    const indicatorEl = document.getElementById(indicatorId);
    
    if (valueEl) {
        valueEl.textContent = Calculator.formatPercent(value);
        valueEl.className = `kpi-value ${pass ? 'pass' : 'fail'}`;
    }
    
    if (indicatorEl) {
        indicatorEl.textContent = pass ? '✓ 达标' : '✗ 未达标';
        indicatorEl.className = `kpi-indicator ${pass ? 'pass' : 'fail'}`;
    }
}

/**
 * 更新回本卡片
 */
function updatePBCard(valueId, indicatorId, value, pass) {
    const valueEl = document.getElementById(valueId);
    const indicatorEl = document.getElementById(indicatorId);
    
    if (valueEl) {
        if (value <= 0 || value === Infinity || isNaN(value)) {
            valueEl.textContent = '未回本';
            valueEl.className = 'kpi-value fail';
        } else {
            valueEl.textContent = Calculator.formatNumber(value);
            valueEl.className = `kpi-value ${pass ? 'pass' : 'fail'}`;
        }
    }
    
    if (indicatorEl) {
        if (value <= 0 || value === Infinity || isNaN(value)) {
            indicatorEl.textContent = '✗ 未回本';
            indicatorEl.className = 'kpi-indicator fail';
        } else {
            indicatorEl.textContent = pass ? '✓ 达标' : '✗ 超期';
            indicatorEl.className = `kpi-indicator ${pass ? 'pass' : 'fail'}`;
        }
    }
}

/**
 * 更新达标警告条
 */
function updateComplianceAlert(compliance) {
    const alertEl = document.getElementById('complianceAlert');
    const titleEl = document.getElementById('alertTitle');
    const issuesEl = document.getElementById('alertIssues');
    
    if (!alertEl) return;

    alertEl.style.display = 'block';
    
    const failedItems = [];
    const passedItems = [];
    
    // 检查各项指标
    const indicators = [
        { key: 'gm1', name: 'GM1', label: '经营毛利率' },
        { key: 'gm2', name: 'GM2', label: '含摊销毛利率' },
        { key: 'gm3', name: 'GM3', label: '全口径毛利率' },
        { key: 'pb1', name: 'PB1', label: '项目回本' },
        { key: 'pb2', name: 'PB2', label: '股东回本' }
    ];
    
    indicators.forEach(ind => {
        const item = compliance[ind.key];
        if (item.pass) {
            passedItems.push({ name: ind.name, label: ind.label, reason: item.reason });
        } else {
            failedItems.push({ name: ind.name, label: ind.label, reason: item.reason });
        }
    });
    
    if (failedItems.length === 0) {
        alertEl.classList.add('all-pass');
        titleEl.textContent = '✅ 全部指标达标';
        issuesEl.innerHTML = passedItems.map(item => 
            `<span class="alert-issue-item pass">${item.name} ${item.label} ${item.reason}</span>`
        ).join('');
    } else {
        alertEl.classList.remove('all-pass');
        titleEl.textContent = `⚠️ ${failedItems.length}项指标未达标`;
        issuesEl.innerHTML = failedItems.map(item => 
            `<span class="alert-issue-item">${item.name} ${item.label} ${item.reason}</span>`
        ).join('');
    }
}

/**
 * 更新达标阈值反推面板 - 支持币种转换
 */
function updateThresholdPanel(thresholds, results) {
    const isKZT = appState.currencyView === 'KZT';
    const rate = results.exchange.baseRate;
    const currentRent = results.revenue.monthlyRent;
    const currencyUnit = isKZT ? '₸/月' : '元/月';
    const amountUnit = isKZT ? '₸' : '元';
    
    // GM1达标所需租金
    updateThresholdItem('thresholdRentGM1', 'thresholdRentGM1Compare', 
        thresholds.minRentForGM1, currentRent, currencyUnit, false, false, isKZT, rate);
    
    // GM2达标所需租金
    updateThresholdItem('thresholdRentGM2', 'thresholdRentGM2Compare', 
        thresholds.minRentForGM2, currentRent, currencyUnit, false, false, isKZT, rate);
    
    // GM3达标所需租金
    updateThresholdItem('thresholdRentGM3', 'thresholdRentGM3Compare', 
        thresholds.minRentForGM3, currentRent, currencyUnit, false, false, isKZT, rate);
    
    // 最大跨境成本
    const currentTransport = results.transport.total;
    updateThresholdItem('thresholdMaxTransport', 'thresholdMaxTransportCompare', 
        thresholds.maxTransportForPB, currentTransport, amountUnit, true, false, isKZT, rate);
    
    // 最大资金利率
    const currentRate = appState.calculator.data.capitalCostRate;
    updateThresholdItem('thresholdMaxRate', 'thresholdMaxRateCompare', 
        thresholds.maxRateForPB, currentRate, '%/年', true, true, false, 1);
    
    // 最短垫资周期
    const currentPeriod = appState.calculator.data.advancePeriod;
    updateThresholdItem('thresholdMinPeriod', 'thresholdMinPeriodCompare', 
        thresholds.minPeriodForPB, currentPeriod, '个月', true, false, false, 1);
}

/**
 * 更新单个阈值项 - 支持币种转换
 */
function updateThresholdItem(valueId, compareId, threshold, current, unit, isMax = false, isPercent = false, isKZT = false, rate = 1) {
    const valueEl = document.getElementById(valueId);
    const compareEl = document.getElementById(compareId);
    
    if (!valueEl) return;
    
    if (threshold === null || threshold === undefined || !isFinite(threshold) || threshold < 0) {
        valueEl.textContent = '无解';
        if (compareEl) {
            compareEl.textContent = '';
            compareEl.className = 'compare';
        }
        return;
    }
    
    // 格式化显示
    const isCurrency = unit.includes('元') || unit.includes('₸');
    if (isPercent) {
        valueEl.textContent = `${(threshold * 100).toFixed(1)}${unit}`;
    } else if (isCurrency) {
        const displayValue = isKZT ? threshold * rate : threshold;
        valueEl.textContent = isKZT ? Calculator.formatCurrency(displayValue, 'KZT') : Calculator.formatCurrency(displayValue);
    } else {
        valueEl.textContent = `${threshold.toFixed(1)}${unit}`;
    }
    
    // 对比当前值
    if (compareEl) {
        let diff, passCondition;
        if (isPercent) {
            diff = current * 100 - threshold * 100;
            passCondition = isMax ? (current <= threshold) : (current >= threshold);
        } else {
            diff = current - threshold;
            passCondition = isMax ? (current <= threshold) : (current >= threshold);
        }
        
        if (passCondition) {
            compareEl.textContent = '✓ 已达标';
            compareEl.className = 'compare lower';
        } else {
            const direction = isMax ? '需降低' : '需提高';
            const amount = Math.abs(diff);
            if (isPercent) {
                compareEl.textContent = `${direction} ${amount.toFixed(1)}%`;
            } else if (isCurrency) {
                const displayAmount = isKZT ? amount * rate : amount;
                compareEl.textContent = `${direction} ${isKZT ? Calculator.formatCurrency(displayAmount, 'KZT') : Calculator.formatCurrency(displayAmount)}`;
            } else {
                compareEl.textContent = `${direction} ${amount.toFixed(1)}${unit.replace(/\/.*/, '')}`;
            }
            compareEl.className = 'compare higher';
        }
    }
}

/**
 * 切换阈值面板折叠
 */
function toggleThresholdPanel() {
    const panel = document.getElementById('thresholdPanel');
    if (panel) {
        panel.classList.toggle('collapsed');
    }
}

/**
 * 更新图表
 */
function updateCharts(results) {
    const cm = appState.chartManager;
    const currency = appState.currencyView;
    const rate = results.exchange.baseRate;
    
    // 成本结构图
    cm.updateCostChart(results.costStructure, null, currency, rate);

    // 月度现金流图
    cm.updateCashFlowChart(
        results.cashflow.monthly,
        currency,
        rate
    );

    // 累计现金流图
    const showScenarios = document.getElementById('showScenarios')?.checked || false;
    cm.updateCumulativeChart(
        results.cashflow.cumulative,
        results.cashflow.paybackMonth,
        showScenarios,
        appState.scenarioResults,
        currency,
        rate
    );

    // 双回本曲线图 (PB1 vs PB2)
    const pb = results.paybackPeriods;
    if (pb) {
        cm.updatePaybackChart(
            pb.pb1Cumulative || results.cashflow.cumulative,
            pb.pb2Cumulative || results.cashflow.cumulative,
            pb.pb1,
            pb.pb2,
            currency,
            rate
        );
    }

    // 敏感性分析
    updateSensitivity();
}

/**
 * 更新敏感性分析
 */
function updateSensitivity() {
    const target = document.getElementById('sensitivityTarget')?.value || 'profit';
    const variable = document.getElementById('sensitivityVariable')?.value || 'rent';

    const targetLabels = {
        profit: '年度利润',
        payback: '回本月',
        irr: 'IRR (%)'
    };

    const variableLabels = {
        rent: '租金',
        freight: '运费',
        tax: '税率',
        exchange: '汇率',
        interest: '利率'
    };

    const data = appState.calculator.sensitivityAnalysis(target, variable);
    appState.chartManager.updateSensitivityChart(data, targetLabels[target], variableLabels[variable]);
}

/**
 * 更新明细表 - 根据当前币种视图显示
 */
function updateDetailTables(results) {
    const rate = results.exchange.baseRate;
    const isKZT = appState.currencyView === 'KZT';
    
    // 格式化金额（根据币种视图）
    const fmtAmt = (cnyValue) => {
        if (isKZT) {
            return Calculator.formatCurrency(cnyValue * rate, 'KZT');
        }
        return Calculator.formatCurrency(cnyValue);
    };

    // 收入明细
    const revenueBody = document.getElementById('revenueTableBody');
    revenueBody.innerHTML = `
        <tr>
            <td>月租金收入</td>
            <td>${fmtAmt(results.revenue.monthlyRent)}/月/台</td>
            <td>${results.quantity}台 × ${results.leaseTerm}月</td>
            <td>${fmtAmt(results.revenue.totalRent)}</td>
        </tr>
        <tr>
            <td>安装调试费</td>
            <td>--</td>
            <td>${results.quantity}台</td>
            <td>${fmtAmt(results.revenue.installation)}</td>
        </tr>
        <tr>
            <td>维保服务费</td>
            <td>--</td>
            <td>${results.quantity}台</td>
            <td>${fmtAmt(results.revenue.service)}</td>
        </tr>
        ${results.revenue.disposal > 0 ? `
        <tr>
            <td>期末处置收入</td>
            <td>--</td>
            <td>${results.quantity}台</td>
            <td>${fmtAmt(results.revenue.disposal)}</td>
        </tr>
        ` : ''}
        <tr style="font-weight:bold; background:#f0f9ff;">
            <td>收入合计</td>
            <td>--</td>
            <td>--</td>
            <td>${fmtAmt(results.revenue.total)}</td>
        </tr>
    `;

    // 跨境成本明细
    const costBody = document.getElementById('costTableBody');
    const totalCost = results.transport.total + results.tax.total;
    costBody.innerHTML = `
        <tr>
            <td>国内段运费</td>
            <td>工厂→口岸</td>
            <td>${fmtAmt(results.transport.domestic)}</td>
            <td>${Calculator.formatPercent(results.transport.domestic / totalCost)}</td>
        </tr>
        <tr>
            <td>国际段运费</td>
            <td>口岸→项目地</td>
            <td>${fmtAmt(results.transport.international)}</td>
            <td>${Calculator.formatPercent(results.transport.international / totalCost)}</td>
        </tr>
        <tr>
            <td>口岸杂费</td>
            <td>换装/仓储/通关</td>
            <td>${fmtAmt(results.transport.portCharges)}</td>
            <td>${Calculator.formatPercent(results.transport.portCharges / totalCost)}</td>
        </tr>
        <tr>
            <td>保险费</td>
            <td>按${appState.calculator.data.insuranceBase === 'cif' ? 'CIF' : '货值'}计算</td>
            <td>${fmtAmt(results.transport.insurance)}</td>
            <td>${Calculator.formatPercent(results.transport.insurance / totalCost)}</td>
        </tr>
        <tr>
            <td>清关代理费</td>
            <td>--</td>
            <td>${fmtAmt(results.transport.customsAgent)}</td>
            <td>${Calculator.formatPercent(results.transport.customsAgent / totalCost)}</td>
        </tr>
        <tr>
            <td>关税</td>
            <td>税率${Calculator.formatPercent(appState.calculator.data.tariffRate)}</td>
            <td>${fmtAmt(results.tax.tariff)}</td>
            <td>${Calculator.formatPercent(results.tax.tariff / totalCost)}</td>
        </tr>
        <tr>
            <td>VAT</td>
            <td>税率${Calculator.formatPercent(appState.calculator.data.vatRate)}${results.tax.vatDeduct > 0 ? ' (部分可抵扣)' : ''}</td>
            <td>${fmtAmt(results.tax.vat)}</td>
            <td>${Calculator.formatPercent(results.tax.vat / totalCost)}</td>
        </tr>
        <tr style="font-weight:bold; background:#f0f9ff;">
            <td>跨境成本合计</td>
            <td>--</td>
            <td>${fmtAmt(totalCost)}</td>
            <td>100%</td>
        </tr>
    `;

    // 运营维保明细
    const operatingBody = document.getElementById('operatingTableBody');
    const years = results.leaseTermYears;
    operatingBody.innerHTML = `
        <tr>
            <td>跨境维保（人员差旅+人工）</td>
            <td>${fmtAmt(results.operating.maintenance)}</td>
            <td>${fmtAmt(results.operating.maintenance * years)}</td>
        </tr>
        <tr>
            <td>当地配件采购</td>
            <td>${fmtAmt(results.operating.parts)}</td>
            <td>${fmtAmt(results.operating.parts * years)}</td>
        </tr>
        <tr>
            <td>当地服务商费用</td>
            <td>${fmtAmt(results.operating.localService)}</td>
            <td>${fmtAmt(results.operating.localService * years)}</td>
        </tr>
        <tr>
            <td>其他费用</td>
            <td>${fmtAmt(results.operating.other)}</td>
            <td>${fmtAmt(results.operating.other * years)}</td>
        </tr>
        <tr style="font-weight:bold; background:#f0f9ff;">
            <td>运营成本合计</td>
            <td>${fmtAmt(results.operating.annual)}</td>
            <td>${fmtAmt(results.operating.total)}</td>
        </tr>
    `;

    // 融资明细
    const financingBody = document.getElementById('financingTableBody');
    if (results.financing.mode === 'full') {
        financingBody.innerHTML = `
            <tr>
                <td>采购垫资比例</td>
                <td>${Calculator.formatPercent(appState.calculator.data.purchaseAdvanceRate)}</td>
                <td>--</td>
            </tr>
            <tr>
                <td>运费税费垫资比例</td>
                <td>${Calculator.formatPercent(appState.calculator.data.freightTaxAdvanceRate)}</td>
                <td>--</td>
            </tr>
            <tr>
                <td>垫资周期</td>
                <td>${appState.calculator.data.advancePeriod}个月</td>
                <td>--</td>
            </tr>
            <tr>
                <td>资金成本利率</td>
                <td>${Calculator.formatPercent(appState.calculator.data.capitalCostRate)}/年</td>
                <td>--</td>
            </tr>
            <tr style="font-weight:bold; background:#f0f9ff;">
                <td>资金成本合计</td>
                <td>${fmtAmt(results.financing.capitalCost)}</td>
                <td>--</td>
            </tr>
        `;
    } else {
        financingBody.innerHTML = `
            <tr>
                <td>首付金额</td>
                <td>${fmtAmt(results.financing.downPayment)}</td>
                <td>比例${Calculator.formatPercent(appState.calculator.data.downPaymentRate)}</td>
            </tr>
            <tr>
                <td>融资金额</td>
                <td>${fmtAmt(results.financing.financingAmount)}</td>
                <td>--</td>
            </tr>
            <tr>
                <td>融资利率</td>
                <td>${Calculator.formatPercent(appState.calculator.data.financingRate)}/年</td>
                <td>期限${appState.calculator.data.financingTerm}个月</td>
            </tr>
            <tr>
                <td>月供</td>
                <td>${fmtAmt(results.financing.monthlyPayment)}</td>
                <td>${appState.calculator.data.repaymentMethod === 'equal' ? '等额本息' : '到期还本付息'}</td>
            </tr>
            <tr>
                <td>利息总额</td>
                <td>${fmtAmt(results.financing.totalInterest)}</td>
                <td>--</td>
            </tr>
            <tr>
                <td>手续费</td>
                <td>${fmtAmt(results.financing.handlingFee)}</td>
                <td>费率${Calculator.formatPercent(appState.calculator.data.handlingFeeRate)}</td>
            </tr>
            <tr style="font-weight:bold; background:#f0f9ff;">
                <td>资金成本合计</td>
                <td>${fmtAmt(results.financing.capitalCost)}</td>
                <td>--</td>
            </tr>
        `;
    }
}

/**
 * 更新币种显示 - 全页面币种转换
 */
function updateCurrencyDisplay() {
    const results = appState.calculator.results;
    if (!results) return;

    const currency = appState.currencyView;
    const rate = results.exchange.baseRate;

    // 更新表格列头
    document.querySelectorAll('.currency-header').forEach(th => {
        if (currency === 'KZT') {
            th.textContent = th.textContent.replace(/CNY/g, 'KZT');
        } else {
            th.textContent = th.textContent.replace(/KZT/g, 'CNY');
        }
    });

    // 重新渲染明细表（根据币种）
    updateDetailTables(results);

    // 更新阈值面板
    updateThresholdPanel(results.thresholds, results);

    // 更新成本结构图
    appState.chartManager.updateCostChart(
        results.costStructure,
        null,
        currency,
        rate
    );

    // 更新现金流图表
    appState.chartManager.updateCashFlowChart(
        results.cashflow.monthly,
        currency,
        rate
    );

    // 更新累计现金流图
    const showScenarios = document.getElementById('showScenarios')?.checked || false;
    appState.chartManager.updateCumulativeChart(
        results.cashflow.cumulative,
        results.cashflow.paybackMonth,
        showScenarios,
        appState.scenarioResults,
        currency,
        rate
    );

    // 更新双回本曲线图
    const pb = results.paybackPeriods;
    if (pb) {
        appState.chartManager.updatePaybackChart(
            pb.pb1Cumulative || results.cashflow.cumulative,
            pb.pb2Cumulative || results.cashflow.cumulative,
            pb.pb1,
            pb.pb2,
            currency,
            rate
        );
    }
}

/**
 * 格式化金额（根据当前币种视图）
 */
function formatAmount(cnyValue, forceOriginal = false) {
    const currency = appState.currencyView;
    const rate = appState.calculator?.results?.exchange?.baseRate || 65;
    
    if (forceOriginal || currency === 'CNY') {
        return Calculator.formatCurrency(cnyValue);
    } else {
        return Calculator.formatCurrency(cnyValue * rate, 'KZT');
    }
}

/**
 * 更新累计现金流图
 */
function updateCumulativeChart() {
    const results = appState.calculator.results;
    if (!results) return;

    const currency = appState.currencyView;
    const rate = results.exchange.baseRate;
    const showScenarios = document.getElementById('showScenarios')?.checked || false;
    appState.chartManager.updateCumulativeChart(
        results.cashflow.cumulative,
        results.cashflow.paybackMonth,
        showScenarios,
        appState.scenarioResults,
        currency,
        rate
    );
}

/**
 * 切换成本图表类型
 */
function switchCostChart(type) {
    document.querySelectorAll('.chart-card .chart-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    const results = appState.calculator.results;
    if (results) {
        const currency = appState.currencyView;
        const rate = results.exchange.baseRate;
        appState.chartManager.initCostChart(type);
        appState.chartManager.updateCostChart(results.costStructure, type, currency, rate);
    }
}

/**
 * 更新时间戳
 */
function updateTimestamp() {
    const el = document.getElementById('updateTime');
    if (el) {
        const now = new Date();
        el.textContent = `最近更新: ${now.toLocaleTimeString('zh-CN')}`;
    }
}

/**
 * 收集表单数据为项目格式
 */
function collectProjectData() {
    const data = appState.calculator.collectData();
    
    // 构建项目结构
    const projectData = {
        name: document.getElementById('equipmentType')?.value + ' ' + 
              document.getElementById('equipmentModel')?.value + ' 租赁项目',
        
        region: document.getElementById('targetRegion')?.value || '哈萨克斯坦',
        country: document.getElementById('targetRegion')?.value || '哈萨克斯坦',
        city: document.getElementById('targetCity')?.value || '阿拉木图',
        
        businessMode: appState.businessMode,
        
        equipment: {
            type: data.equipmentType || '挖掘机',
            model: data.equipmentModel || '',
            quantity: parseInt(data.quantity) || 1,
            purchasePrice: parseFloat(data.purchasePrice) || 800000,
            economicLife: parseInt(data.economicLife) || 10,
            residualValueRate: parseFloat(data.residualValueRate) / 100 || 0.1
        },
        
        revenue: {
            monthlyRent: parseFloat(data.monthlyRent) || 50000,
            installationFee: parseFloat(data.installationFee) || 5000,
            maintenanceServiceFee: parseFloat(data.maintenanceServiceFee) || 10000,
            leaseTerm: parseInt(data.leaseTerm) || 12,
            rentCurrency: 'CNY',
            endSalePrice: parseFloat(data.endSalePrice) || 0
        },
        
        crossborderCost: {
            domesticFreight: parseFloat(data.domesticFreight) || 15000,
            internationalFreight: parseFloat(data.internationalFreight) || 25000,
            portCharges: parseFloat(data.portCharges) || 8000,
            insuranceRate: parseFloat(data.insuranceRate) / 100 || 0.008,
            customsAgentFee: parseFloat(data.customsAgentFee) || 3000
        },
        
        taxRules: {
            taxBasis: data.taxBasis || 'CIF',
            tariffRate: parseFloat(data.tariffRate) / 100 || 0.05,
            vatRate: parseFloat(data.vatRate) / 100 || 0.12,
            vatDeductible: document.getElementById('vatDeductible')?.checked || false
        },
        
        financing: {
            mode: appState.paymentMode,
            purchaseAdvanceRate: parseFloat(data.purchaseAdvanceRate) / 100 || 0.3,
            freightTaxAdvanceRate: parseFloat(data.freightTaxAdvanceRate) / 100 || 1.0,
            capitalCostRate: parseFloat(data.capitalCostRate) / 100 || 0.08,
            advancePeriod: parseInt(data.advancePeriod) || 6
        },
        
        fxConfig: {
            strategy: 'single',
            baseRate: parseFloat(data.exchangeRate) || 65,
            volatility: parseFloat(data.fxVolatility) / 100 || 0.05
        }
    };
    
    return projectData;
}

/**
 * 保存项目到数据库
 */
async function saveProject() {
    try {
        const projectData = collectProjectData();
        const results = appState.calculator.results;
        
        // 添加测算结果摘要
        if (results) {
            projectData.latestResult = {
                gm1: results.profit.gm1,
                gm2: results.profit.gm2,
                pb1: results.cashflow.paybackMonth,
                pb2: results.cashflow.shareholderPaybackMonth,
                totalRevenue: results.revenue.total,
                totalCost: results.cost.total,
                netCashflow: results.profit.cashflow
            };
        }
        
        if (appState.currentProjectId && !appState.isNewProject) {
            // 更新现有项目
            await db.updateProject(appState.currentProjectId, projectData);
            showToast('项目已保存', 'success');
        } else {
            // 创建新项目
            const newProject = await db.createProject(projectData);
            appState.currentProjectId = newProject.projectId;
            appState.currentProject = newProject;
            appState.isNewProject = false;
            
            // 更新URL（不刷新页面）
            const newUrl = `${window.location.pathname}?id=${newProject.projectId}`;
            window.history.replaceState({}, '', newUrl);
            
            showToast(`项目已创建: ${newProject.projectId}`, 'success');
        }
        
        appState.isDirty = false;
        updatePageTitle();
        updateTimestamp();
        
    } catch (error) {
        console.error('保存失败:', error);
        showToast('保存失败: ' + error.message, 'error');
    }
}

/**
 * 另存为新项目
 */
async function saveAsNewProject() {
    try {
        const projectData = collectProjectData();
        projectData.name = projectData.name + ' (副本)';
        
        const results = appState.calculator.results;
        if (results) {
            projectData.latestResult = {
                gm1: results.profit.gm1,
                gm2: results.profit.gm2,
                pb1: results.cashflow.paybackMonth,
                pb2: results.cashflow.shareholderPaybackMonth,
                totalRevenue: results.revenue.total,
                totalCost: results.cost.total,
                netCashflow: results.profit.cashflow
            };
        }
        
        const newProject = await db.createProject(projectData);
        appState.currentProjectId = newProject.projectId;
        appState.currentProject = newProject;
        appState.isNewProject = false;
        
        // 更新URL
        const newUrl = `${window.location.pathname}?id=${newProject.projectId}`;
        window.history.replaceState({}, '', newUrl);
        
        showToast(`已另存为新项目: ${newProject.projectId}`, 'success');
        updatePageTitle();
        
    } catch (error) {
        console.error('另存失败:', error);
        showToast('另存失败: ' + error.message, 'error');
    }
}

/**
 * 载入项目（打开项目选择器）
 */
function loadProject() {
    // 跳转到项目列表页
    window.location.href = 'list.html';
}

/**
 * 新建项目
 */
function newProject() {
    if (appState.isDirty) {
        if (!confirm('当前有未保存的修改，确定要新建项目吗？')) {
            return;
        }
    }
    
    // 清除URL参数并刷新
    window.location.href = window.location.pathname;
}

/**
 * 返回列表页
 */
function goBackToList() {
    if (appState.isDirty) {
        if (!confirm('当前有未保存的修改，确定要返回吗？')) {
            return;
        }
    }
    window.location.href = 'list.html';
}

/**
 * 导出JSON
 */
function exportJSON() {
    const data = appState.calculator.collectData();
    const results = appState.calculator.results;
    
    const exportData = {
        inputs: data,
        results: results,
        exportTime: new Date().toISOString()
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `中哈设备租赁测算_${new Date().toLocaleDateString('zh-CN')}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
}

/**
 * 导出Excel (CSV格式)
 */
function exportExcel() {
    const results = appState.calculator.results;
    if (!results) {
        alert('请先进行测算');
        return;
    }

    let csv = '\ufeff'; // BOM for UTF-8
    
    // 基础信息
    csv += '中哈跨境机械设备租售测算报告\n\n';
    csv += '一、项目概况\n';
    csv += `设备台数,${results.quantity}\n`;
    csv += `租期（月）,${results.leaseTerm}\n`;
    csv += `业务模式,${results.businessMode === 'lease' ? '纯租赁' : '租转售'}\n\n`;

    // KPI汇总
    csv += '二、关键指标\n';
    csv += `年度会计利润,${results.profit.annualAccounting.toFixed(0)}\n`;
    csv += `租期净现金流,${results.profit.cashflow.toFixed(0)}\n`;
    csv += `回本月,${results.cashflow.paybackMonth > 0 ? results.cashflow.paybackMonth : '未回本'}\n`;
    csv += `运输占比,${(results.transport.ratio * 100).toFixed(1)}%\n`;
    csv += `税负金额,${results.tax.total.toFixed(0)}\n\n`;

    // 收入明细
    csv += '三、收入明细\n';
    csv += '项目,金额(CNY)\n';
    csv += `租金收入,${results.revenue.totalRent.toFixed(0)}\n`;
    csv += `安装调试费,${results.revenue.installation.toFixed(0)}\n`;
    csv += `维保服务费,${results.revenue.service.toFixed(0)}\n`;
    csv += `收入合计,${results.revenue.total.toFixed(0)}\n\n`;

    // 成本明细
    csv += '四、成本明细\n';
    csv += '项目,金额(CNY)\n';
    csv += `采购成本,${results.purchase.total.toFixed(0)}\n`;
    csv += `运输成本,${results.transport.total.toFixed(0)}\n`;
    csv += `税费成本,${results.tax.total.toFixed(0)}\n`;
    csv += `运营成本,${results.operating.total.toFixed(0)}\n`;
    csv += `资金成本,${results.financing.capitalCost.toFixed(0)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `中哈设备租赁测算_${new Date().toLocaleDateString('zh-CN')}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
}

/**
 * 导出精美PDF报告
 */
function exportPDFReport() {
    const results = appState.calculator.results;
    if (!results) {
        alert('请先进行测算');
        return;
    }

    // 更新报告头部信息
    const equipmentModel = document.getElementById('equipmentModel').value || '机械设备';
    const quantity = document.getElementById('quantity').value || 1;
    const leaseTerm = document.getElementById('leaseTerm').value || 12;
    
    document.getElementById('reportEquipment').textContent = 
        `设备: ${equipmentModel} × ${quantity}台`;
    document.getElementById('reportMode').textContent = 
        `模式: ${appState.businessMode === 'lease' ? '纯租赁' : '租转售'} | ${leaseTerm}个月`;
    document.getElementById('reportDate').textContent = 
        `日期: ${new Date().toLocaleDateString('zh-CN')}`;

    // 展开所有折叠的表格
    document.querySelectorAll('.table-content.collapsed').forEach(el => {
        el.classList.remove('collapsed');
    });

    // 短暂延迟确保渲染完成，然后打印
    setTimeout(() => {
        window.print();
    }, 300);
}

/**
 * 重置表单 - 恢复默认值
 */
function resetForm() {
    if (!confirm('确定要重置所有参数为默认值吗？')) return;
    
    // 定义默认值
    const defaults = {
        // B1 项目基本信息
        'projectLocation': '阿拉木图',
        'equipmentType': '推土机',
        'equipmentModel': 'SD32',
        'quantity': '1',
        'leaseTerm': '12',
        'targetRegion': '哈萨克斯坦',
        'targetCity': '阿拉木图',
        
        // B2 收入参数
        'monthlyRent': '50000',
        'installationFee': '5000',
        'maintenanceServiceFee': '10000',
        'rentCurrency': 'CNY',
        
        // B3 采购与残值
        'purchasePrice': '800000',
        'economicLife': '10',
        'residualValueRate': '10',
        'continuingOperationMethod': 'accounting',
        
        // B4 跨境运输
        'incoterms': '',  // 新增：贸易术语
        'domesticFreight': '15000',
        'internationalFreight': '25000',
        'portCharges': '8000',
        'insuranceRate': '0.8',
        'insuranceBase': 'equipment',
        'customsAgentFee': '3000',
        'importDutyRate': '0',
        'destinationDelivery': '5000',
        
        // B5 税费
        'taxBasis': 'CIF',
        'tariffRate': '5',
        'vatRate': '12',
        
        // B6 运营成本
        'annualMaintenance': '20000',
        'localParts': '15000',
        'localServiceFee': '10000',
        'otherOperatingCost': '5000',
        
        // B7 资金成本（全款模式）
        'purchaseAdvanceRate': '30',
        'freightTaxAdvanceRate': '100',
        'capitalCostRate': '8',
        'advancePeriod': '6',
        
        // B7 资金成本（融资模式）
        'downPaymentRate': '30',
        'financingRate': '6',
        'financingTerm': '24',
        'handlingFeeRate': '1',
        'repaymentMethod': 'equal',
        
        // B8 汇率
        'exchangeRate': '65',
        'exchangeVolatility': '5'
    };
    
    // 应用默认值
    Object.keys(defaults).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.type === 'checkbox') {
                el.checked = defaults[id] === 'true' || defaults[id] === true;
            } else {
                el.value = defaults[id];
                // 触发change事件以更新依赖项
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    });
    
    // 重置复选框
    const checkboxDefaults = {
        'includeFreight': true,
        'includeInsurance': true,
        'includeGoods': true,
        'tariffExempt': false,
        'vatDeductible': false
    };
    
    Object.keys(checkboxDefaults).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.checked = checkboxDefaults[id];
        }
    });
    
    // 重置控制条为默认状态
    setActiveToggle('modeToggle', document.querySelector('#modeToggle .toggle-btn[data-value="lease"]'));
    setActiveToggle('paymentToggle', document.querySelector('#paymentToggle .toggle-btn[data-value="full"]'));
    setActiveToggle('currencyToggle', document.querySelector('#currencyToggle .toggle-btn[data-value="CNY"]'));
    setActiveToggle('scenarioToggle', document.querySelector('#scenarioToggle .toggle-btn[data-value="baseline"]'));
    
    appState.businessMode = 'lease';
    appState.paymentMode = 'full';
    appState.currencyView = 'CNY';
    appState.scenario = 'baseline';
    
    // 重置贸易术语相关的UI状态
    const responsibilityInfo = document.getElementById('responsibilityInfo');
    const transportCostsSection = document.getElementById('transportCostsSection');
    const transportPreviewSection = document.getElementById('transportPreviewSection');
    
    if (responsibilityInfo) responsibilityInfo.style.display = 'none';
    if (transportCostsSection) transportCostsSection.style.display = 'none';
    if (transportPreviewSection) transportPreviewSection.style.display = 'none';
    
    // 更新UI状态
    toggleLeaseToSellFields();
    togglePaymentMode();
    updateScenarioTag();
    
    // 更新城市选项
    if (typeof updateCityOptions === 'function') {
        updateCityOptions();
    }
    
    // 重新计算
    calculate();
    
    // 提示用户
    showToast('✅ 参数已重置为默认值，请重新选择贸易术语');
}

/**
 * 显示提示消息
 */
function showToast(message, duration = 2000) {
    // 移除已有的 toast
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => toast.classList.add('show'), 10);
    
    // 自动移除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * 显示KPI详情弹窗
 */
function showKPIDetail(kpiType) {
    const modal = document.getElementById('kpiModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const results = appState.calculator.results;
    const fmt = Calculator.formatCurrency;
    const fmtPct = Calculator.formatPercent;

    let content = '';

    switch (kpiType) {
        case 'gm1':
            const gm1 = results.grossMargin?.gm1 || {};
            title.textContent = 'GM1 经营毛利率 - 计算明细';
            content = `
                <div class="formula">
                    GM1 = (收入 - 可变成本) ÷ 收入 × 100%
                </div>
                <div class="detail-section">
                    <h4>📥 收入项</h4>
                    <div class="detail-item"><span>租金收入</span><span>${fmt(results.revenue.totalRent)}</span></div>
                    <div class="detail-item"><span>安装调试费</span><span>${fmt(results.revenue.installation)}</span></div>
                    <div class="detail-item"><span>维保服务费</span><span>${fmt(results.revenue.service)}</span></div>
                    ${results.revenue.disposal > 0 ? `<div class="detail-item"><span>处置收入</span><span>${fmt(results.revenue.disposal)}</span></div>` : ''}
                    <div class="detail-item highlight"><span>总收入</span><span>${fmt(results.revenue.total)}</span></div>
                </div>
                <div class="detail-section">
                    <h4>📤 可变成本</h4>
                    <div class="detail-item"><span>跨境运输</span><span>${fmt(results.transport.total)}</span></div>
                    <div class="detail-item"><span>关税</span><span>${fmt(results.tax.tariff)}</span></div>
                    <div class="detail-item"><span>VAT实际占用</span><span>${fmt(results.tax.vatCashOccupied)}</span></div>
                    <div class="detail-item"><span>运营成本</span><span>${fmt(results.operating.total)}</span></div>
                    ${results.costStructure.disposal > 0 ? `<div class="detail-item"><span>处置成本</span><span>${fmt(results.costStructure.disposal)}</span></div>` : ''}
                    <div class="detail-item highlight"><span>可变成本合计</span><span>${fmt(results.grossMargins?.variableCost || 0)}</span></div>
                </div>
                <hr style="margin:12px 0;">
                <div class="detail-item result ${gm1.pass ? 'pass' : 'fail'}">
                    <strong>GM1 经营毛利率</strong>
                    <strong>${fmtPct(gm1.value || 0)} ${gm1.pass ? '✓ 达标' : '✗ 未达标'}</strong>
                </div>
                <p class="threshold-note">达标线：≥30%</p>
            `;
            break;

        case 'gm2':
            const gm2 = results.grossMargin?.gm2 || {};
            title.textContent = 'GM2 含摊销毛利率 - 计算明细';
            content = `
                <div class="formula">
                    GM2 = (收入 - 可变成本 - 设备折旧) ÷ 收入 × 100%
                </div>
                <div class="detail-section">
                    <h4>📊 构成项</h4>
                    <div class="detail-item"><span>总收入</span><span>${fmt(results.revenue.total)}</span></div>
                    <div class="detail-item"><span>可变成本</span><span>${fmt(results.grossMargins?.variableCost || 0)}</span></div>
                    <div class="detail-item"><span>设备折旧</span><span>${fmt(results.grossMargins?.depreciation || 0)}</span></div>
                </div>
                <div class="detail-section">
                    <h4>📋 折旧明细</h4>
                    <div class="detail-item"><span>设备原值</span><span>${fmt(results.purchase.total)}</span></div>
                    <div class="detail-item"><span>残值率</span><span>${fmtPct(appState.calculator.data.residualValueRate)}</span></div>
                    <div class="detail-item"><span>经济寿命</span><span>${appState.calculator.data.economicLife}年</span></div>
                    <div class="detail-item"><span>年折旧额</span><span>${fmt(results.purchase.annualDepreciation)}</span></div>
                    <div class="detail-item"><span>租期折旧</span><span>${fmt(results.purchase.totalDepreciation)}</span></div>
                </div>
                <hr style="margin:12px 0;">
                <div class="detail-item result ${gm2.pass ? 'pass' : 'fail'}">
                    <strong>GM2 含摊销毛利率</strong>
                    <strong>${fmtPct(gm2.value || 0)} ${gm2.pass ? '✓ 达标' : '✗ 未达标'}</strong>
                </div>
                <p class="threshold-note">达标线：≥30%</p>
            `;
            break;

        case 'gm3':
            const gm3 = results.grossMargin?.gm3 || {};
            title.textContent = 'GM3 全口径毛利率 - 计算明细';
            content = `
                <div class="formula">
                    GM3 = (收入 - 可变成本 - 折旧 - 资金成本) ÷ 收入 × 100%
                </div>
                <div class="detail-section">
                    <h4>📊 构成项</h4>
                    <div class="detail-item"><span>总收入</span><span>${fmt(results.revenue.total)}</span></div>
                    <div class="detail-item"><span>可变成本</span><span>${fmt(results.grossMargins?.variableCost || 0)}</span></div>
                    <div class="detail-item"><span>设备折旧</span><span>${fmt(results.grossMargins?.depreciation || 0)}</span></div>
                    <div class="detail-item"><span>资金成本</span><span>${fmt(results.grossMargins?.financingCost || 0)}</span></div>
                </div>
                <div class="detail-section">
                    <h4>💰 资金成本明细</h4>
                    ${appState.calculator.data.paymentMode === 'full' ? `
                        <div class="detail-item"><span>垫资本金</span><span>${fmt(results.purchase.total * appState.calculator.data.purchaseAdvanceRate)}</span></div>
                        <div class="detail-item"><span>资金利率</span><span>${fmtPct(appState.calculator.data.capitalCostRate)}/年</span></div>
                        <div class="detail-item"><span>垫资周期</span><span>${appState.calculator.data.advancePeriod}个月</span></div>
                    ` : `
                        <div class="detail-item"><span>融资金额</span><span>${fmt(results.financing.financingAmount)}</span></div>
                        <div class="detail-item"><span>融资利率</span><span>${fmtPct(appState.calculator.data.financingRate)}/年</span></div>
                        <div class="detail-item"><span>融资期限</span><span>${appState.calculator.data.financingTerm}个月</span></div>
                    `}
                    <div class="detail-item"><span>总利息支出</span><span>${fmt(results.financing.totalInterest)}</span></div>
                </div>
                <hr style="margin:12px 0;">
                <div class="detail-item result ${gm3.pass ? 'pass' : 'fail'}">
                    <strong>GM3 全口径毛利率</strong>
                    <strong>${fmtPct(gm3.value || 0)} ${gm3.pass ? '✓ 达标' : '✗ 未达标'}</strong>
                </div>
                <p class="threshold-note">达标线：≥30%（最严格口径）</p>
            `;
            break;

        case 'pb1':
            const pb1 = results.payback?.pb1 || {};
            title.textContent = 'PB1 项目回本 - 计算明细';
            content = `
                <div class="formula">
                    PB1 = 项目累计现金流首次≥0的月份（不考虑融资）
                </div>
                <div class="detail-section">
                    <h4>📤 初始投入（项目视角）</h4>
                    <div class="detail-item"><span>设备采购</span><span>${fmt(results.purchase.total)}</span></div>
                    <div class="detail-item"><span>跨境运输</span><span>${fmt(results.transport.total)}</span></div>
                    <div class="detail-item"><span>税费</span><span>${fmt(results.tax.total)}</span></div>
                    <div class="detail-item highlight"><span>初始投入合计</span><span>${fmt(pb1.initialInvestment || 0)}</span></div>
                </div>
                <div class="detail-section">
                    <h4>📥 月度净收入</h4>
                    <div class="detail-item"><span>月租金收入</span><span>${fmt(results.revenue.monthlyRent * results.quantity)}/月</span></div>
                    <div class="detail-item"><span>月运营成本</span><span>${fmt(results.operating.annual / 12)}/月</span></div>
                    <div class="detail-item highlight"><span>月度净现金流</span><span>${fmt(pb1.monthlyNet || 0)}/月</span></div>
                </div>
                <hr style="margin:12px 0;">
                <div class="detail-item result ${pb1.pass ? 'pass' : 'fail'}">
                    <strong>PB1 项目回本</strong>
                    <strong>${pb1.month > 0 ? pb1.month + '个月' : '未回本'} ${pb1.pass ? '✓ 达标' : '✗ 未达标'}</strong>
                </div>
                <p class="threshold-note">达标线：≤24个月</p>
            `;
            break;

        case 'pb2':
            const pb2 = results.payback?.pb2 || {};
            title.textContent = 'PB2 股东回本 - 计算明细';
            content = `
                <div class="formula">
                    PB2 = 股东累计现金流首次≥0的月份（考虑融资）
                </div>
                <div class="detail-section">
                    <h4>📤 股东实际出资</h4>
                    ${appState.calculator.data.paymentMode === 'full' ? `
                        <div class="detail-item"><span>采购垫资</span><span>${fmt(results.purchase.total * appState.calculator.data.purchaseAdvanceRate)}</span></div>
                        <div class="detail-item"><span>运费税费垫资</span><span>${fmt((results.transport.total + results.tax.total) * appState.calculator.data.freightTaxAdvanceRate)}</span></div>
                    ` : `
                        <div class="detail-item"><span>首付款</span><span>${fmt(results.financing.downPayment)}</span></div>
                        <div class="detail-item"><span>手续费</span><span>${fmt(results.financing.handlingFee)}</span></div>
                        <div class="detail-item success"><span>融资放款</span><span>+${fmt(results.financing.financingAmount)}</span></div>
                    `}
                    <div class="detail-item highlight"><span>股东净出资</span><span>${fmt(pb2.initialInvestment || 0)}</span></div>
                </div>
                <div class="detail-section">
                    <h4>💸 还款/回收</h4>
                    ${appState.calculator.data.paymentMode === 'financing' ? `
                        <div class="detail-item"><span>月还款额</span><span>${fmt(results.financing.monthlyPayment)}/月</span></div>
                        <div class="detail-item"><span>还款期数</span><span>${appState.calculator.data.financingTerm}期</span></div>
                    ` : `
                        <div class="detail-item"><span>资金成本</span><span>${fmt(results.financing.capitalCost)}</span></div>
                        <div class="detail-item"><span>垫资回收</span><span>第${appState.calculator.data.advancePeriod}月</span></div>
                    `}
                </div>
                <hr style="margin:12px 0;">
                <div class="detail-item result ${pb2.pass ? 'pass' : 'fail'}">
                    <strong>PB2 股东回本</strong>
                    <strong>${pb2.month > 0 ? pb2.month + '个月' : '未回本'} ${pb2.pass ? '✓ 达标' : '✗ 未达标'}</strong>
                </div>
                <p class="threshold-note">达标线：≤24个月</p>
            `;
            break;

        case 'annualProfit':
            title.textContent = '年度会计利润 - 计算明细';
            content = `
                <div class="formula">
                    年度会计利润 = (总收入 - 总成本) ÷ 租期年数
                </div>
                <div class="detail-item"><span>总收入</span><span>${fmt(results.revenue.total)}</span></div>
                <div class="detail-item"><span>总成本（会计口径）</span><span>${fmt(results.profit.totalCostAccounting)}</span></div>
                <div class="detail-item"><span>租期年数</span><span>${results.leaseTermYears.toFixed(2)}年</span></div>
                <hr style="margin:12px 0;">
                <div class="detail-item"><strong>年度会计利润</strong><strong>${fmt(results.profit.annualAccounting)}</strong></div>
            `;
            break;

        case 'cashFlow':
            title.textContent = '租期净现金流 - 计算明细';
            content = `
                <div class="formula">
                    净现金流 = 总收入 - 总现金支出
                </div>
                <div class="detail-item"><span>总收入</span><span>${fmt(results.revenue.total)}</span></div>
                <div class="detail-item"><span>采购支出</span><span>${fmt(results.purchase.total)}</span></div>
                <div class="detail-item"><span>运输支出</span><span>${fmt(results.transport.total)}</span></div>
                <div class="detail-item"><span>税费支出</span><span>${fmt(results.tax.total)}</span></div>
                <div class="detail-item"><span>运营支出</span><span>${fmt(results.operating.total)}</span></div>
                <div class="detail-item"><span>资金成本</span><span>${fmt(results.financing.capitalCost)}</span></div>
                <hr style="margin:12px 0;">
                <div class="detail-item"><strong>租期净现金流</strong><strong>${fmt(results.profit.cashflow)}</strong></div>
            `;
            break;

        case 'payback':
            title.textContent = '回本月 - 计算说明';
            content = `
                <div class="formula">
                    回本月 = 累计现金流首次≥0的月份
                </div>
                <p style="margin:12px 0;">初始投资（采购+运输+税费）产生负现金流，随后每月租金收入逐步回补。</p>
                <div class="detail-item"><span>初始投资</span><span>${fmt(results.purchase.total + results.transport.total + results.tax.total)}</span></div>
                <div class="detail-item"><span>月度净流入</span><span>${fmt(results.cashflow.monthlyNet)}</span></div>
                <hr style="margin:12px 0;">
                <div class="detail-item"><strong>回本月</strong><strong>${results.cashflow.paybackMonth > 0 ? results.cashflow.paybackMonth + '个月' : '租期内未回本'}</strong></div>
            `;
            break;

        case 'transport':
            title.textContent = '运输占比 - 构成明细';
            content = `
                <div class="formula">
                    运输占比 = 运输总成本 ÷ 采购总价 × 100%
                </div>
                <div class="detail-item"><span>国内段运费</span><span>${fmt(results.transport.domestic)}</span></div>
                <div class="detail-item"><span>国际段运费</span><span>${fmt(results.transport.international)}</span></div>
                <div class="detail-item"><span>口岸杂费</span><span>${fmt(results.transport.portCharges)}</span></div>
                <div class="detail-item"><span>保险费</span><span>${fmt(results.transport.insurance)}</span></div>
                <div class="detail-item"><span>清关代理费</span><span>${fmt(results.transport.customsAgent)}</span></div>
                <div class="detail-item"><span>运输总成本</span><span>${fmt(results.transport.total)}</span></div>
                <div class="detail-item"><span>采购总价</span><span>${fmt(results.purchase.total)}</span></div>
                <hr style="margin:12px 0;">
                <div class="detail-item"><strong>运输占比</strong><strong>${Calculator.formatPercent(results.transport.ratio)}</strong></div>
                <p style="margin-top:12px;color:#6b7280;font-size:0.85rem;">
                    ⚡ 阈值说明：&lt;15%绿色正常 | 15-20%黄色关注 | &gt;20%红色偏高
                </p>
            `;
            break;

        case 'tax':
            title.textContent = '税负金额 - 计算明细';
            content = `
                <div class="formula">
                    税负 = 关税 + VAT
                </div>
                <div class="detail-item"><span>完税价格</span><span>${fmt(results.tax.dutiableValue)}</span></div>
                <div class="detail-item"><span>关税（税率${Calculator.formatPercent(appState.calculator.data.tariffRate)}）</span><span>${fmt(results.tax.tariff)}</span></div>
                <div class="detail-item"><span>VAT计税基数</span><span>${fmt(results.tax.dutiableValue + results.tax.tariff)}</span></div>
                <div class="detail-item"><span>VAT（税率${Calculator.formatPercent(appState.calculator.data.vatRate)}）</span><span>${fmt(results.tax.vat)}</span></div>
                ${results.tax.vatDeduct > 0 ? `<div class="detail-item"><span>VAT可抵扣</span><span>-${fmt(results.tax.vatDeduct)}</span></div>` : ''}
                <hr style="margin:12px 0;">
                <div class="detail-item"><strong>税负总额</strong><strong>${fmt(results.tax.total)}</strong></div>
                <div class="detail-item"><span>税负占采购价比例</span><span>${Calculator.formatPercent(results.tax.ratio)}</span></div>
            `;
            break;

        case 'exchange':
            title.textContent = '汇兑损益 - 计算说明';
            content = `
                <div class="formula">
                    汇兑损益 = 收入 × (基准汇率/实际汇率 - 1)
                </div>
                <p style="margin:12px 0;">当租金以坚戈(KZT)收取时，汇率变化会影响换算后的人民币金额。</p>
                <div class="detail-item"><span>基准汇率</span><span>1 CNY = ${results.exchange.baseRate.toFixed(2)} KZT</span></div>
                <div class="detail-item"><span>当前情景汇率</span><span>1 CNY = ${results.exchange.volatileRate.toFixed(2)} KZT</span></div>
                <div class="detail-item"><span>租金币种</span><span>${appState.calculator.data.rentCurrency}</span></div>
                <hr style="margin:12px 0;">
                <div class="detail-item"><strong>汇兑损益</strong><strong>${fmt(results.exchange.gainLoss)}</strong></div>
                <p style="margin-top:12px;color:#6b7280;font-size:0.85rem;">
                    💡 正值表示汇率有利带来收益，负值表示汇率不利产生损失
                </p>
            `;
            break;
    }

    body.innerHTML = content;
    modal.classList.add('show');
}

/**
 * 关闭弹窗
 */
function closeModal() {
    document.getElementById('kpiModal').classList.remove('show');
}

// 点击弹窗外部关闭
document.addEventListener('click', function(e) {
    const modal = document.getElementById('kpiModal');
    if (e.target === modal) {
        closeModal();
    }
});

/**
 * 获取实时汇率
 * 使用多个免费API作为备选
 */
async function fetchExchangeRate() {
    const btn = document.querySelector('.btn-fetch-rate');
    const rateSource = document.getElementById('rateSource');
    const exchangeRateInput = document.getElementById('exchangeRate');
    
    // 设置加载状态
    btn.disabled = true;
    btn.classList.add('loading');
    btn.innerHTML = '⏳ 获取中...';
    rateSource.textContent = '正在获取实时汇率...';
    rateSource.className = 'rate-source';

    // 优先通过本地代理获取（避免 CORS）
    const FX_PROXY_BASE = 'http://localhost:4000';
    let success = false;
    let lastError = null;

    try {
        const proxyResp = await fetch(`${FX_PROXY_BASE}/api/fx?pairs=CNY/KZT`);
        if (proxyResp.ok) {
            const body = await proxyResp.json();
            if (body && body.ok && body.rates && body.rates['CNY/KZT']) {
                const val = body.rates['CNY/KZT'].rate;
                exchangeRateInput.value = val;
                rateSource.textContent = `来源: ${body.rates['CNY/KZT'].source || 'proxy'}`;
                success = true;
            }
        }
    } catch (err) {
        console.warn('本地代理获取 CNY/KZT 失败:', err.message);
    }

    // 如果代理未成功，再尝试直接第三方 API（回退）
    if (!success) {
        // API列表（按优先级排序）
        const apis = [
            {
                name: 'ExchangeRate-API',
                url: 'https://api.exchangerate-api.com/v4/latest/CNY',
                parse: (data) => data.rates.KZT
            },
            {
                name: 'Open Exchange Rates (Free)',
                url: 'https://open.er-api.com/v6/latest/CNY',
                parse: (data) => data.rates.KZT
            },
            {
                name: 'Currency API',
                url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/cny.json',
                parse: (data) => data.cny.kzt
            }
        ];

        for (const api of apis) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时

            const response = await fetch(api.url, { 
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const rate = api.parse(data);

            if (rate && !isNaN(rate) && rate > 0) {
                // 成功获取汇率
                exchangeRateInput.value = rate.toFixed(2);
                
                const now = new Date();
                const timeStr = now.toLocaleString('zh-CN', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                rateSource.innerHTML = `✅ 数据来源: ${api.name}<br>更新时间: ${timeStr}`;
                rateSource.className = 'rate-source success';
                
                success = true;
                
                // 触发计算更新
                updatePreviews();
                calculate();
                
                break;
            }
        } catch (error) {
            lastError = error;
            console.warn(`${api.name} 获取失败:`, error.message);
            continue;
        }
    }

    // 恢复按钮状态
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.innerHTML = '🔄 获取实时汇率';

    if (!success) {
        rateSource.innerHTML = `❌ 自动获取失败，请手动输入<br>
            <a href="https://www.boc.cn/sourcedb/whpj/" target="_blank" style="color:#2563eb;">点击查看中国银行牌价</a>`;
        rateSource.className = 'rate-source error';
        
        console.error('所有汇率API获取失败', lastError);
    }
}

/**
 * 页面加载时自动获取一次汇率
 */
document.addEventListener('DOMContentLoaded', function() {
    // 延迟2秒后自动获取汇率，避免阻塞页面加载
    setTimeout(() => {
        fetchExchangeRate();
    }, 2000);
});

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ==================== 残值分析模块 ====================

let residualValueChart = null;

/**
 * 打开残值分析弹窗
 */
function openResidualValueModal() {
    const modal = document.getElementById('residualValueModal');
    if (!modal) {
        showToast('残值分析功能暂不可用', 'error');
        return;
    }
    
    // 检查必要的B3数据是否已填写
    const purchasePrice = document.getElementById('purchasePrice')?.value;
    const economicLife = document.getElementById('economicLife')?.value;
    const leaseTerm = document.getElementById('leaseTerm')?.value;
    
    if (!purchasePrice || !economicLife || !leaseTerm) {
        showToast('请先完善B1项目信息和B3采购参数', 'warning');
        // 高亮显示需要填写的字段
        highlightRequiredFields(['purchasePrice', 'economicLife', 'leaseTerm']);
        return;
    }
    
    modal.style.display = 'flex';
    updateResidualValueChart();
}

/**
 * 关闭残值分析弹窗
 */
function closeResidualValueModal() {
    const modal = document.getElementById('residualValueModal');
    if (modal) {
        modal.style.display = 'none';
    }
    // 清除字段高亮
    clearFieldHighlight();
}

/**
 * 高亮显示必填字段
 */
function highlightRequiredFields(fieldIds) {
    fieldIds.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.style.borderColor = '#ef4444';
            field.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
            
            // 添加滚动和聚焦
            field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

/**
 * 清除字段高亮
 */
function clearFieldHighlight() {
    ['purchasePrice', 'economicLife', 'leaseTerm'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.style.borderColor = '';
            field.style.boxShadow = '';
        }
    });
}

/**
 * 更新残值曲线图表
 */
function updateResidualValueChart() {
    // 从B3采购与残值区块获取真实数据
    const purchasePrice = parseFloat(document.getElementById('purchasePrice')?.value) || 0;
    const economicLife = parseInt(document.getElementById('economicLife')?.value) || 0;
    const leaseTerm = parseInt(document.getElementById('leaseTerm')?.value) || 0;
    const residualRate = parseFloat(document.getElementById('residualValueRate')?.value) / 100 || 0;
    const method = document.getElementById('depreciationMethod')?.value || 'straight';
    const quantity = parseInt(document.getElementById('quantity')?.value) || 1;
    
    // 数据验证，确保从B3表单获取了有效数据
    if (!purchasePrice || !economicLife || !leaseTerm) {
        showToast('请先完善B1项目信息和B3采购参数后再进行残值分析', 'warning');
        document.getElementById('rvOriginalValue').textContent = '请填写采购单价';
        document.getElementById('rvEconomicLife').textContent = '请填写经济寿命';
        document.getElementById('rvLeaseTerm').textContent = '请填写租期';
        document.getElementById('rvEndValue').textContent = '无法计算';
        return;
    }
    
    const totalValue = purchasePrice * quantity;
    const residualValue = totalValue * residualRate;
    const depreciableAmount = totalValue - residualValue;
    const leaseYears = leaseTerm / 12;
    
    // 获取设备信息用于显示
    const equipmentType = document.getElementById('equipmentType')?.value || '未知设备';
    const equipmentModel = document.getElementById('equipmentModel')?.value || '';
    const equipmentInfo = equipmentModel ? `${equipmentType} (${equipmentModel})` : equipmentType;
    
    // 更新概要信息 - 显示真实的B3数据
    document.getElementById('rvOriginalValue').textContent = `${formatCurrencySimple(totalValue)} (${quantity}台×${formatCurrencySimple(purchasePrice)})`;
    document.getElementById('rvEconomicLife').textContent = economicLife + ' 年';
    document.getElementById('rvLeaseTerm').textContent = leaseTerm + ' 月 (' + leaseYears.toFixed(1) + '年)';
    
    // 在弹窗标题中显示设备信息
    const modalTitle = document.querySelector('#residualValueModal .modal-header h3');
    if (modalTitle) {
        modalTitle.textContent = `📊 ${equipmentInfo} - 残值分析`;
    }
    
    // 计算各年残值
    const yearlyData = calculateDepreciation(totalValue, residualValue, economicLife, method);
    
    // 租期末残值
    const leaseEndYear = Math.ceil(leaseYears);
    const leaseEndValue = leaseEndYear <= economicLife ? yearlyData[leaseEndYear].endValue : residualValue;
    document.getElementById('rvEndValue').textContent = formatCurrencySimple(leaseEndValue);
    
    // 更新方法说明
    updateMethodDescription(method);
    
    // 更新图表
    renderResidualValueChart(yearlyData, economicLife, leaseEndYear);
    
    // 更新明细表
    renderResidualValueTable(yearlyData, leaseEndYear);
}

/**
 * 计算折旧数据
 */
function calculateDepreciation(originalValue, residualValue, life, method) {
    const depreciable = originalValue - residualValue;
    const data = [];
    let bookValue = originalValue;
    let accumulatedDep = 0;
    
    // 年数总和（用于年数总和法）
    const sumOfYears = (life * (life + 1)) / 2;
    
    for (let year = 1; year <= life; year++) {
        let yearlyDep = 0;
        
        switch (method) {
            case 'straight':
                // 直线法：每年折旧相等
                yearlyDep = depreciable / life;
                break;
                
            case 'double':
                // 双倍余额递减法
                const doubleRate = 2 / life;
                if (year <= life - 2) {
                    yearlyDep = bookValue * doubleRate;
                } else {
                    // 最后两年改为直线法
                    yearlyDep = (bookValue - residualValue) / (life - year + 1);
                }
                // 确保不低于残值
                if (bookValue - yearlyDep < residualValue) {
                    yearlyDep = bookValue - residualValue;
                }
                break;
                
            case 'sum':
                // 年数总和法
                const remainingYears = life - year + 1;
                yearlyDep = depreciable * (remainingYears / sumOfYears);
                break;
                
            case 'units':
                // 工作量法（假设前期使用强度高）
                // 模拟：第一年30%，逐年递减
                const usagePattern = Math.pow(0.85, year - 1);
                const totalUsage = Array.from({length: life}, (_, i) => Math.pow(0.85, i)).reduce((a, b) => a + b, 0);
                yearlyDep = depreciable * (usagePattern / totalUsage);
                break;
        }
        
        accumulatedDep += yearlyDep;
        bookValue = originalValue - accumulatedDep;
        
        // 确保不低于残值
        if (bookValue < residualValue) {
            bookValue = residualValue;
            accumulatedDep = originalValue - residualValue;
        }
        
        data.push({
            year,
            startValue: year === 1 ? originalValue : data[year - 2].endValue,
            depreciation: yearlyDep,
            accumulatedDep,
            endValue: bookValue,
            residualRate: bookValue / originalValue
        });
    }
    
    return data;
}

/**
 * 更新折旧方法说明
 */
function updateMethodDescription(method) {
    const descriptions = {
        straight: '每年折旧额相等，残值曲线为直线下降。适用于磨损均匀的通用机械设备。',
        double: '前期折旧快，后期慢，加速回收投资。适用于技术更新快、前期效率高的设备。',
        sum: '按剩余寿命年数的权重分配折旧，前高后低。适用于前期使用强度大的设备。',
        units: '按实际使用量分配折旧，模拟使用强度逐年递减。适用于工程机械、运输设备。'
    };
    
    const descEl = document.getElementById('methodDesc');
    if (descEl) {
        descEl.textContent = descriptions[method] || '';
    }
}

/**
 * 渲染残值曲线图
 */
function renderResidualValueChart(data, economicLife, currentYear) {
    const ctx = document.getElementById('residualValueChart');
    if (!ctx) return;
    
    if (residualValueChart) {
        residualValueChart.destroy();
    }
    
    const labels = ['0年'].concat(data.map(d => `第${d.year}年`));
    const values = [data[0].startValue].concat(data.map(d => d.endValue));
    const depreciation = [0].concat(data.map(d => d.depreciation));
    
    residualValueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: '账面价值',
                    data: values,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: values.map((_, i) => i === currentYear ? '#f59e0b' : '#4f46e5'),
                    pointBorderWidth: values.map((_, i) => i === currentYear ? 3 : 1),
                    pointRadius: values.map((_, i) => i === currentYear ? 8 : 4)
                },
                {
                    label: '年度折旧',
                    data: depreciation,
                    type: 'bar',
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    yAxisID: 'y1'
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
                    labels: { boxWidth: 12, padding: 15 }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const val = ctx.raw;
                            return `${ctx.dataset.label}: ¥${val.toLocaleString()}`;
                        }
                    }
                },
                annotation: {
                    annotations: {
                        currentLine: {
                            type: 'line',
                            xMin: currentYear,
                            xMax: currentYear,
                            borderColor: '#f59e0b',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                content: '租期结束',
                                enabled: true,
                                position: 'start',
                                backgroundColor: '#f59e0b',
                                color: '#fff',
                                font: { size: 11, weight: 'bold' }
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    position: 'left',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '账面价值 (CNY)'
                    },
                    ticks: {
                        callback: (value) => '¥' + (value / 10000).toFixed(0) + '万'
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    beginAtZero: true,
                    grid: { drawOnChartArea: false },
                    title: {
                        display: true,
                        text: '年度折旧 (CNY)'
                    },
                    ticks: {
                        callback: (value) => '¥' + (value / 10000).toFixed(0) + '万'
                    }
                }
            }
        }
    });
}

/**
 * 渲染残值明细表
 */
function renderResidualValueTable(data, currentYear) {
    const tbody = document.getElementById('rvTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = data.map(row => {
        const isCurrent = row.year === currentYear;
        return `
            <tr class="${isCurrent ? 'current-row' : ''}">
                <td>${row.year}${isCurrent ? ' 📍' : ''}</td>
                <td>¥${row.startValue.toLocaleString()}</td>
                <td>¥${row.depreciation.toLocaleString()}</td>
                <td>¥${row.accumulatedDep.toLocaleString()}</td>
                <td>¥${row.endValue.toLocaleString()}</td>
                <td>${(row.residualRate * 100).toFixed(1)}%</td>
            </tr>
        `;
    }).join('');
}

/**
 * 应用计算结果到残值率输入框 - 基于真实B3数据联动
 */
function applyResidualValue() {
    // 从实际B3表单获取数据（不使用默认值）
    const leaseTerm = parseInt(document.getElementById('leaseTerm')?.value);
    const economicLife = parseInt(document.getElementById('economicLife')?.value);
    const method = document.getElementById('depreciationMethod')?.value || 'straight';
    const purchasePrice = parseFloat(document.getElementById('purchasePrice')?.value);
    const quantity = parseInt(document.getElementById('quantity')?.value) || 1;
    const currentResidualRate = parseFloat(document.getElementById('residualValueRate')?.value) / 100;
    
    // 验证必要数据（确保与B3数据联动）
    if (!purchasePrice || !economicLife || !leaseTerm) {
        showToast('请先完善B1项目信息和B3采购参数后再应用残值分析结果', 'error');
        return;
    }
    
    const totalValue = purchasePrice * quantity;
    const residualValue = totalValue * currentResidualRate;
    const data = calculateDepreciation(totalValue, residualValue, economicLife, method);
    
    const leaseEndYear = Math.ceil(leaseTerm / 12);
    if (leaseEndYear <= economicLife && data[leaseEndYear - 1]) {
        const endValue = data[leaseEndYear - 1].endValue;
        const endRate = (endValue / totalValue * 100).toFixed(1);
        
        // 更新残值率到B3字段
        document.getElementById('residualValueRate').value = endRate;
        
        // 获取设备信息用于反馈
        const equipmentType = document.getElementById('equipmentType')?.value || '设备';
        const equipmentModel = document.getElementById('equipmentModel')?.value;
        const equipmentInfo = equipmentModel ? `${equipmentType}(${equipmentModel})` : equipmentType;
        
        showToast(`✅ ${equipmentInfo} 租期${leaseTerm}月后残值率已更新为 ${endRate}%（${formatCurrencySimple(endValue)}）`, 'success');
        closeResidualValueModal();
        
        // 触发主页面重新计算
        if (typeof calculate === 'function') {
            calculate();
        }
    } else {
        showToast(`⚠️ 租期${leaseTerm}月(${leaseEndYear}年)超出设备经济寿命${economicLife}年，无法计算准确残值`, 'warning');
    }
}

/**
 * 简单货币格式化
 */
function formatCurrencySimple(value) {
    if (value >= 10000) {
        return '¥' + (value / 10000).toFixed(1) + '万';
    }
    return '¥' + value.toLocaleString();
}

/**
 * 设置B3字段变化监听器 - 当关键字段变化时提示重新分析残值
 */
function setupB3FieldListeners() {
    const fieldsToWatch = ['purchasePrice', 'economicLife', 'leaseTerm', 'quantity'];
    
    fieldsToWatch.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', function() {
                // 延迟执行，避免频繁触发
                clearTimeout(field._residualValueTimeout);
                field._residualValueTimeout = setTimeout(() => {
                    updateResidualValueButton();
                }, 500);
            });
        }
    });
}

/**
 * 更新残值分析按钮状态
 */
function updateResidualValueButton() {
    const button = document.querySelector('button[onclick="openResidualValueModal()"]');
    if (button) {
        const purchasePrice = document.getElementById('purchasePrice')?.value;
        const economicLife = document.getElementById('economicLife')?.value;
        const leaseTerm = document.getElementById('leaseTerm')?.value;
        
        if (purchasePrice && economicLife && leaseTerm) {
            button.style.backgroundColor = '#10b981';
            button.style.animation = 'pulse 1s ease-in-out';
            button.title = '数据已更新，建议重新分析残值';
            
            // 2秒后恢复正常状态
            setTimeout(() => {
                button.style.backgroundColor = '';
                button.style.animation = '';
                button.title = '查看残值曲线分析';
            }, 2000);
        }
    }
}

// 页面加载时设置监听器
document.addEventListener('DOMContentLoaded', function() {
    setupB3FieldListeners();
});

// ==================== B4 跨境运输贸易术语逻辑 ====================

/**
 * 贸易术语责任分配定义
 */
const INCOTERMS_RESPONSIBILITY = {
    'EXW': { // 工厂交货
        seller: ['设备货值'],
        buyer: ['国内段运费', '国际段运费', '口岸杂费', '运输保险', '清关代理费', '进口关税', '目的地配送']
    },
    'FCA': { // 货交承运人
        seller: ['设备货值', '出口通关'],
        buyer: ['国际段运费', '口岸杂费', '运输保险', '清关代理费', '进口关税', '目的地配送']
    },
    'FOB': { // 装运港船上交货
        seller: ['设备货值', '国内段运费', '出口通关'],
        buyer: ['国际段运费', '口岸杂费', '运输保险', '清关代理费', '进口关税', '目的地配送']
    },
    'CFR': { // 成本加运费
        seller: ['设备货值', '国内段运费', '国际段运费', '出口通关'],
        buyer: ['口岸杂费', '运输保险', '清关代理费', '进口关税', '目的地配送']
    },
    'CIF': { // 成本+保险+运费
        seller: ['设备货值', '国内段运费', '国际段运费', '运输保险', '出口通关'],
        buyer: ['口岸杂费', '清关代理费', '进口关税', '目的地配送']
    },
    'DDP': { // 完税后交货
        seller: ['设备货值', '国内段运费', '国际段运费', '口岸杂费', '运输保险', '清关代理费', '进口关税'],
        buyer: ['目的地配送']
    }
};

/**
 * 辅助函数：显示元素
 */
function showElement(element) {
    if (element) element.style.display = 'block';
}

/**
 * 辅助函数：隐藏元素
 */
function hideElement(element) {
    if (element) element.style.display = 'none';
}

/**
 * 安全的更新运输责任分配显示（简化版）
 */
function updateTransportResponsibility() {
    const incoterm = document.getElementById('incoterms')?.value;
    const responsibilityInfo = document.getElementById('responsibilityInfo');
    const transportCostsSection = document.getElementById('transportCostsSection');
    const transportPreviewSection = document.getElementById('transportPreviewSection');
    
    if (!incoterm) {
        // 隐藏所有相关部分
        hideElement(responsibilityInfo);
        hideElement(transportCostsSection);
        hideElement(transportPreviewSection);
        return;
    }
    
    // 显示基本部分
    showElement(responsibilityInfo);
    showElement(transportCostsSection);
    showElement(transportPreviewSection);
    
    // 简单的责任分配显示
    const sellerCosts = document.getElementById('sellerCosts');
    const buyerCosts = document.getElementById('buyerCosts');
    
    if (sellerCosts && buyerCosts) {
        switch(incoterm) {
            case 'EXW':
                sellerCosts.innerHTML = '<li>设备货值</li>';
                buyerCosts.innerHTML = '<li>全部运输费用</li><li>保险</li><li>清关</li>';
                break;
            case 'CIF':
                sellerCosts.innerHTML = '<li>设备货值</li><li>国际运费</li><li>运输保险</li>';
                buyerCosts.innerHTML = '<li>清关费用</li><li>目的地配送</li>';
                break;
            case 'DDP':
                sellerCosts.innerHTML = '<li>设备货值</li><li>全部运输费用</li><li>保险</li><li>清关</li>';
                buyerCosts.innerHTML = '<li>目的地配送</li>';
                break;
            default:
                sellerCosts.innerHTML = '<li>设备货值</li><li>部分运输费用</li>';
                buyerCosts.innerHTML = '<li>剩余运输费用</li><li>清关费用</li>';
        }
    }
    
    // 触发计算
    if (typeof calculate === 'function') {
        setTimeout(calculate, 100);
    }
}

// ==================== 智能功能函数 ====================

// 智能报告生成
function generateIntelligentReport() {
    document.getElementById('intelligentReportModal').style.display = 'flex';
}

function closeIntelligentReportModal() {
    document.getElementById('intelligentReportModal').style.display = 'none';
    document.getElementById('reportPreview').style.display = 'none';
}

async function generateReportPreview() {
    const reportType = document.getElementById('reportType').value;
    const includeCharts = document.getElementById('includeCharts').checked;
    const includeCashFlow = document.getElementById('includeCashFlow').checked;
    const includeRiskAnalysis = document.getElementById('includeRiskAnalysis').checked;
    const includeSensitivity = document.getElementById('includeSensitivity').checked;

    // 显示加载状态
    const previewContent = document.getElementById('previewContent');
    previewContent.innerHTML = '⏳ 正在生成报告预览...';
    document.getElementById('reportPreview').style.display = 'block';

    try {
        // 获取当前计算数据
        const calculationData = await getCurrentCalculationData();
        
        // 生成报告
        const report = await IntelligentReporting.reportGenerator.generateReport(reportType, calculationData, {
            includeCharts,
            includeCashFlow,
            includeRiskAnalysis,
            includeSensitivity,
            format: 'html'
        });

        // 显示预览
        displayReportPreview(report);
        
    } catch (error) {
        previewContent.innerHTML = `❌ 报告生成失败: ${error.message}`;
        console.error('Report generation failed:', error);
    }
}

function displayReportPreview(report) {
    const previewContent = document.getElementById('previewContent');
    
    let html = `<h3>${report.title}</h3>`;
    
    // 如果是综合报告，显示执行摘要
    if (report.executiveSummary) {
        html += '<h4>执行摘要</h4>';
        const summary = report.executiveSummary.sections[0];
        if (summary && summary.content) {
            html += '<ul>';
            Object.entries(summary.content).forEach(([key, value]) => {
                html += `<li><strong>${key}:</strong> ${value}</li>`;
            });
            html += '</ul>';
        }
    }
    
    // 显示各个章节
    if (report.sections) {
        report.sections.forEach(section => {
            html += `<h4>${section.title}</h4>`;
            if (typeof section.content === 'object') {
                if (Array.isArray(section.content)) {
                    html += '<ul>';
                    section.content.forEach(item => {
                        html += `<li>${item}</li>`;
                    });
                    html += '</ul>';
                } else {
                    html += '<ul>';
                    Object.entries(section.content).forEach(([key, value]) => {
                        html += `<li><strong>${key}:</strong> ${value}</li>`;
                    });
                    html += '</ul>';
                }
            } else {
                html += `<p>${section.content}</p>`;
            }
        });
    }
    
    previewContent.innerHTML = html;
}

async function exportIntelligentReport() {
    const reportType = document.getElementById('reportType').value;
    const exportFormat = document.querySelector('input[name="exportFormat"]:checked').value;
    
    try {
        // 获取当前计算数据
        const calculationData = await getCurrentCalculationData();
        
        // 生成报告
        const report = await IntelligentReporting.reportGenerator.generateReport(reportType, calculationData, {
            includeCharts: document.getElementById('includeCharts').checked,
            includeCashFlow: document.getElementById('includeCashFlow').checked,
            includeRiskAnalysis: document.getElementById('includeRiskAnalysis').checked,
            includeSensitivity: document.getElementById('includeSensitivity').checked,
            format: exportFormat
        });

        // 导出报告
        if (exportFormat === 'html') {
            exportHTMLReport(report);
        } else {
            await IntelligentReporting.exportReport(report, exportFormat);
        }
        
        showToast('✅ 报告导出成功！', 'success');
        closeIntelligentReportModal();
        
    } catch (error) {
        showToast(`❌ 报告导出失败: ${error.message}`, 'error');
        console.error('Report export failed:', error);
    }
}

function exportHTMLReport(report) {
    // 创建HTML内容
    let html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${report.title}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1, h2, h3 { color: #333; }
            .executive-summary { background: #f8f9fa; padding: 20px; margin: 20px 0; border-left: 4px solid #007bff; }
            .section { margin: 30px 0; }
            .data-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
            .data-item { background: #f8f9fa; padding: 15px; border-radius: 5px; }
            .data-label { font-weight: bold; color: #666; }
            .data-value { font-size: 1.2em; color: #333; margin-top: 5px; }
            ul { margin: 10px 0 10px 20px; }
            @media print { body { margin: 20px; } }
        </style>
    </head>
    <body>
        <h1>${report.title}</h1>
        <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
    `;
    
    // 添加报告内容
    if (report.executiveSummary) {
        html += '<div class="executive-summary">';
        html += '<h2>执行摘要</h2>';
        // 添加执行摘要内容
        html += '</div>';
    }
    
    if (report.sections) {
        report.sections.forEach(section => {
            html += `<div class="section">`;
            html += `<h2>${section.title}</h2>`;
            // 添加章节内容
            html += `</div>`;
        });
    }
    
    html += '</body></html>';
    
    // 下载HTML文件
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${report.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// 决策支持系统
function showDecisionSupport() {
    document.getElementById('decisionSupportModal').style.display = 'flex';
}

function closeDecisionSupportModal() {
    document.getElementById('decisionSupportModal').style.display = 'none';
}

async function analyzeInvestmentDecision() {
    try {
        // 显示加载状态
        document.getElementById('overallScoreValue').textContent = '...';
        document.querySelector('.recommendation-content').innerHTML = '⏳ 正在分析投资决策...';
        
        // 获取当前计算数据
        const calculationData = await getCurrentCalculationData();
        
        // 运行决策分析
        const decision = IntelligentReporting.decisionSupport.evaluateInvestment(calculationData);
        
        // 显示结果
        displayDecisionResults(decision);
        
    } catch (error) {
        document.querySelector('.recommendation-content').innerHTML = `❌ 分析失败: ${error.message}`;
        console.error('Decision analysis failed:', error);
    }
}

function displayDecisionResults(decision) {
    // 更新总体评分
    const scoreValue = Math.round(decision.overallScore);
    document.getElementById('overallScoreValue').textContent = scoreValue;
    
    // 更新评分圆圈的颜色（通过CSS变量）
    const scoreCircle = document.getElementById('overallScoreCircle');
    const percentage = decision.overallScore;
    let color = '#ef4444'; // 红色
    if (percentage >= 80) color = '#10b981'; // 绿色
    else if (percentage >= 60) color = '#3b82f6'; // 蓝色
    else if (percentage >= 40) color = '#f59e0b'; // 黄色
    
    scoreCircle.style.background = `conic-gradient(${color} ${percentage * 3.6}deg, #f3f4f6 ${percentage * 3.6}deg)`;
    
    // 更新推荐内容
    const recommendation = decision.recommendation;
    const recommendationContent = document.querySelector('.recommendation-content');
    recommendationContent.innerHTML = `
        <div class="recommendation-level ${recommendation.level.toLowerCase().replace(/\s+/g, '-')}">${recommendation.level}</div>
        <p><strong>建议行动:</strong> ${recommendation.action}</p>
        <p><strong>分析理由:</strong> ${recommendation.reasoning}</p>
        <p><strong>置信度:</strong> ${recommendation.confidence}</p>
        ${recommendation.keyFactors.length > 0 ? `
            <p><strong>关键因素:</strong></p>
            <ul>
                ${recommendation.keyFactors.map(factor => `<li>${factor}</li>`).join('')}
            </ul>
        ` : ''}
    `;
    
    // 显示评分详情
    displayCriteriaScores(decision.criteriaScores);
    
    // 显示行动建议
    displayActionItems(decision.actionItems);
    
    // 显示风险评估
    displayRiskAssessment(decision.riskAssessment);
}

function displayCriteriaScores(scores) {
    const criteriaAnalysis = document.getElementById('criteriaAnalysis');
    criteriaAnalysis.style.display = 'block';
    
    // 更新各项评分条
    Object.entries(scores).forEach(([key, data]) => {
        const bar = document.getElementById(`${key}Bar`);
        const scoreElement = document.getElementById(`${key}Score`);
        
        if (bar && scoreElement) {
            bar.style.width = `${data.score}%`;
            scoreElement.textContent = Math.round(data.score);
        }
    });
}

function displayActionItems(actionItems) {
    const actionItemsElement = document.getElementById('actionItems');
    const actionList = document.getElementById('actionList');
    
    if (actionItems && actionItems.length > 0) {
        actionItemsElement.style.display = 'block';
        
        actionList.innerHTML = actionItems.map(item => `
            <div class="action-item">
                <div class="action-priority ${item.priority.toLowerCase()}">${item.priority}</div>
                <div class="action-title">${item.action}</div>
                <div class="action-description">${item.description}</div>
            </div>
        `).join('');
    }
}

function displayRiskAssessment(riskAssessment) {
    const riskAssessmentElement = document.getElementById('riskAssessmentDetails');
    const riskContent = document.getElementById('riskContent');
    
    if (riskAssessment) {
        riskAssessmentElement.style.display = 'block';
        
        riskContent.innerHTML = `
            <div class="risk-factor">
                <span class="risk-factor-name">综合风险等级</span>
                <span class="risk-level ${riskAssessment.level.toLowerCase()}">${riskAssessment.level}</span>
            </div>
            ${riskAssessment.factors.map(factor => `
                <div class="risk-factor">
                    <span class="risk-factor-name">${factor}</span>
                </div>
            `).join('')}
        `;
    }
}

async function exportDecisionReport() {
    try {
        // 获取当前计算数据
        const calculationData = await getCurrentCalculationData();
        
        // 运行决策分析
        const decision = IntelligentReporting.decisionSupport.evaluateInvestment(calculationData);
        
        // 生成决策报告
        const report = {
            title: '投资决策分析报告',
            timestamp: new Date().toLocaleString('zh-CN'),
            overallScore: decision.overallScore,
            recommendation: decision.recommendation,
            criteriaScores: decision.criteriaScores,
            actionItems: decision.actionItems,
            riskAssessment: decision.riskAssessment
        };
        
        // 导出为JSON文件
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `investment_decision_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
        
        showToast('✅ 决策报告导出成功！', 'success');
        
    } catch (error) {
        showToast(`❌ 导出失败: ${error.message}`, 'error');
        console.error('Decision report export failed:', error);
    }
}

// 获取当前计算数据的辅助函数
async function getCurrentCalculationData() {
    if (!appState.calculator) {
        throw new Error('计算器未初始化');
    }
    
    // 获取表单数据
    const formData = getFormData();
    
    // 执行计算
    const result = appState.calculator.calculate(formData);
    
    // 检查计算结果是否有效
    if (!result || typeof result.financial === 'undefined') {
        throw new Error('无法获取有效的计算结果，请检查输入参数');
    }
    
    return result;
}

// 获取表单数据的辅助函数  
function getFormData() {
    return {
        equipmentType: document.getElementById('equipmentType')?.value || '',
        purchasePrice: parseFloat(document.getElementById('purchasePrice')?.value) || 0,
        quantity: parseInt(document.getElementById('quantity')?.value) || 1,
        monthlyRent: parseFloat(document.getElementById('monthlyRent')?.value) || 0,
        leaseTerm: parseInt(document.getElementById('leaseTerm')?.value) || 12,
        exchangeRate: parseFloat(document.getElementById('exchangeRate')?.value) || 65,
        transportCost: parseFloat(document.getElementById('transportCost')?.value) || 0,
        insuranceRate: parseFloat(document.getElementById('insuranceRate')?.value) || 0.8,
        customsRate: parseFloat(document.getElementById('customsRate')?.value) || 5,
        vatRate: parseFloat(document.getElementById('vatRate')?.value) || 12,
        maintenanceRate: parseFloat(document.getElementById('maintenanceRate')?.value) || 2,
        residualValueRate: parseFloat(document.getElementById('residualValueRate')?.value) || 30,
        incoterms: document.getElementById('incoterms')?.value || 'CIF'
    };
}
