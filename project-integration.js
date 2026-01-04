/**
 * 项目页面与数据库集成
 * 处理项目加载、保存、版本管理等功能
 */

// 项目状态
window.projectState = {
    projectId: null,
    project: null,
    versions: [],
    currentVersionId: null,
    isDirty: false
};

/**
 * 页面初始化 - 在 app.js 之后执行
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 等待数据库就绪
    await db.ready;
    
    // 从 URL 获取项目ID
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    
    if (projectId) {
        // 同步状态到 projectState
        projectState.projectId = projectId;
        
        // 获取项目（可能已被 app.js 加载）
        const project = await db.getProject(projectId);
        if (project) {
            projectState.project = project;
            
            // 更新页面头部
            updateProjectHeader(project);
            
            // 加载版本列表
            await loadVersionList(projectId);
        }
    } else {
        // 无项目ID，显示新建状态
        showNewProjectState();
    }
    
    // 监听表单变化
    initDirtyTracking();
});

/**
 * 更新项目头部信息
 */
function updateProjectHeader(project) {
    const titleEl = document.getElementById('projectTitle');
    const idEl = document.getElementById('projectId');
    const regionEl = document.getElementById('projectRegion');
    const statusEl = document.getElementById('projectStatus');
    const updateTimeEl = document.getElementById('projectUpdateTime');
    
    if (titleEl) titleEl.textContent = project.name || '未命名项目';
    if (idEl) idEl.textContent = `ID: ${project.projectId}`;
    if (regionEl) regionEl.textContent = `区域: ${project.region || '--'}`;
    
    const statusMap = {
        draft: '📝 草稿',
        negotiating: '💬 跟进中',
        bidding: '📋 投标中',
        active: '🚀 执行中',
        completed: '✅ 已完成',
        archived: '📦 已归档'
    };
    if (statusEl) statusEl.textContent = `状态: ${statusMap[project.status] || '📝 草稿'}`;
    
    if (project.updatedAt && updateTimeEl) {
        const date = new Date(project.updatedAt);
        updateTimeEl.textContent = 
            `更新: ${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    document.title = `${project.name || '新建测算'} - 项目测算`;
}

/**
 * 加载版本列表
 */
async function loadVersionList(projectId) {
    try {
        const versions = await db.getProjectVersions(projectId);
        projectState.versions = versions;
        
        const select = document.getElementById('versionSelect');
        select.innerHTML = '<option value="">-- 选择版本 --</option>';
        
        versions.forEach(v => {
            const option = document.createElement('option');
            option.value = v.versionId;
            option.textContent = `${v.versionName} (${formatDateTime(v.createdAt)})`;
            select.appendChild(option);
        });
        
        // 如果有版本，默认选择最新的
        if (versions.length > 0) {
            select.value = versions[0].versionId;
            updateVersionInfo(versions[0]);
        }
    } catch (error) {
        console.error('加载版本列表失败:', error);
    }
}

/**
 * 加载指定版本
 */
async function loadVersion(versionId) {
    if (!versionId) {
        document.getElementById('versionInfo').textContent = '--';
        return;
    }
    
    try {
        const version = projectState.versions.find(v => v.versionId === versionId);
        if (!version) return;
        
        projectState.currentVersionId = versionId;
        updateVersionInfo(version);
        
        // 加载版本的输入快照
        if (version.inputsSnapshot) {
            loadFormFromSnapshot(version.inputsSnapshot);
            
            // 重新计算
            if (typeof calculate === 'function') {
                calculate();
            }
            
            showToast('✅ 版本已加载', 'success');
        }
    } catch (error) {
        console.error('加载版本失败:', error);
        showToast('加载版本失败', 'error');
    }
}

/**
 * 更新版本信息显示
 */
function updateVersionInfo(version) {
    const scenarioMap = {
        baseline: '基准情景',
        optimistic: '乐观情景',
        conservative: '保守情景',
        'what-if': '假设分析'
    };
    
    document.getElementById('versionInfo').textContent = 
        `${scenarioMap[version.scenarioType] || '基准情景'} | ${formatDateTime(version.createdAt)}`;
}

/**
 * 显示新建项目状态
 */
function showNewProjectState() {
    document.getElementById('projectTitle').textContent = '新建测算';
    document.getElementById('projectId').textContent = 'ID: 未保存';
    document.getElementById('projectRegion').textContent = '区域: --';
    document.getElementById('projectStatus').textContent = '状态: 新建';
    document.getElementById('projectUpdateTime').textContent = '更新: --';
}

/**
 * 从快照加载表单数据
 */
function loadFormFromSnapshot(snapshot) {
    if (!snapshot) return;
    
    // 遍历快照中的所有字段
    Object.keys(snapshot).forEach(key => {
        const element = document.getElementById(key);
        if (!element) return;
        
        const value = snapshot[key];
        
        if (element.type === 'checkbox') {
            element.checked = value;
        } else if (element.tagName === 'SELECT') {
            element.value = value;
        } else {
            element.value = value;
        }
    });
    
    // 触发模式切换
    if (snapshot.businessMode && typeof appState !== 'undefined') {
        appState.businessMode = snapshot.businessMode;
        const modeBtn = document.querySelector(`#modeToggle .toggle-btn[data-value="${snapshot.businessMode}"]`);
        if (modeBtn) {
            document.querySelectorAll('#modeToggle .toggle-btn').forEach(b => b.classList.remove('active'));
            modeBtn.classList.add('active');
        }
        if (typeof toggleLeaseToSellFields === 'function') {
            toggleLeaseToSellFields();
        }
    }
    
    if (snapshot.paymentMode && typeof appState !== 'undefined') {
        appState.paymentMode = snapshot.paymentMode;
        const payBtn = document.querySelector(`#paymentToggle .toggle-btn[data-value="${snapshot.paymentMode}"]`);
        if (payBtn) {
            document.querySelectorAll('#paymentToggle .toggle-btn').forEach(b => b.classList.remove('active'));
            payBtn.classList.add('active');
        }
        if (typeof togglePaymentMode === 'function') {
            togglePaymentMode();
        }
    }
}

/**
 * 收集表单数据为快照
 */
function collectFormSnapshot() {
    const snapshot = {};
    
    // 所有输入字段
    const fields = [
        'equipmentModel', 'quantity', 'leaseTerm', 'projectLocation',
        'monthlyRent', 'installationFee', 'maintenanceServiceFee', 'endSalePrice', 'disposalFeeRate',
        'purchasePrice', 'economicLife', 'continuingOperationMethod', 'residualValueRate',
        'domesticFreight', 'internationalFreight', 'portCharges', 'insuranceRate', 'insuranceBase', 'customsAgentFee',
        'taxBasis', 'tariffRate', 'vatRate',
        'annualMaintenance', 'localParts', 'localServiceFee', 'otherOperatingCost',
        'purchaseAdvanceRate', 'freightTaxAdvanceRate', 'advancePeriod', 'capitalCostRate',
        'downPaymentRate', 'financingRate', 'financingTerm', 'repaymentMethod', 'handlingFeeRate',
        'rentCurrency', 'exchangeRate', 'exchangeVolatility'
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            if (element.type === 'checkbox') {
                snapshot[field] = element.checked;
            } else {
                snapshot[field] = element.value;
            }
        }
    });
    
    // 复选框
    const checkboxes = ['includeFreight', 'includeInsurance', 'tariffExempt', 'vatDeductible'];
    checkboxes.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            snapshot[field] = element.checked;
        }
    });
    
    // 模式状态
    if (typeof appState !== 'undefined') {
        snapshot.businessMode = appState.businessMode;
        snapshot.paymentMode = appState.paymentMode;
        snapshot.scenario = appState.scenario;
    }
    
    return snapshot;
}

/**
 * 收集测算结果
 */
function collectCalcResult() {
    const calc = window.appState?.calculator;
    if (!calc || !calc.result) return null;
    
    const r = calc.result;
    
    return {
        gm1: r.gm1,
        gm2: r.gm2,
        gm3: r.gm3,
        pb1Months: r.pb1Months,
        pb2Months: r.pb2Months,
        passGm1: r.passGm1,
        passGm2: r.passGm2,
        passGm3: r.passGm3,
        passPb1: r.passPb1,
        passPb2: r.passPb2,
        totalRevenue: r.totalRevenue,
        totalCost: r.totalCost,
        grossProfit: r.grossProfit,
        logisticsRatio: r.transportRatio,
        resultBreakdown: {
            revenue: r.revenue,
            cost: r.cost,
            cashFlow: r.monthlyCashFlows
        }
    };
}

/**
 * 保存到项目（更新项目数据）
 */
async function saveToProject() {
    if (!projectState.projectId) {
        // 新项目，先创建
        await createNewProject();
        return;
    }
    
    try {
        const snapshot = collectFormSnapshot();
        const result = collectCalcResult();
        
        // 收集设备和业务信息供列表页显示
        const equipmentType = document.getElementById('equipmentType')?.value || '设备';
        const equipmentModel = document.getElementById('equipmentModel')?.value || '';
        const quantity = parseInt(document.getElementById('quantity')?.value) || 1;
        const purchasePrice = parseFloat(document.getElementById('purchasePrice')?.value) || 0;
        const monthlyRent = parseFloat(document.getElementById('monthlyRent')?.value) || 0;
        const leaseTerm = parseInt(document.getElementById('leaseTerm')?.value) || 12;
        const targetRegion = document.getElementById('targetRegion')?.value || '哈萨克斯坦';
        const targetCity = document.getElementById('targetCity')?.value || '';
        
        // 更新项目（包含设备信息供列表页显示）
        const updates = {
            name: `${equipmentType} ${equipmentModel} 租赁项目`.trim(),
            region: targetRegion,
            city: targetCity,
            equipment: {
                type: equipmentType,
                model: equipmentModel,
                quantity: quantity,
                purchasePrice: purchasePrice
            },
            revenue: {
                monthlyRent: monthlyRent,
                leaseTerm: leaseTerm
            },
            latestResult: {
                ...result,
                inputsSnapshot: snapshot,
                calculatedAt: new Date().toISOString(),
                // 摘要数据供列表快速显示
                equipmentValue: purchasePrice * quantity,
                monthlyRent: monthlyRent,
                leaseTerm: leaseTerm
            },
            updatedAt: new Date().toISOString()
        };
        
        await db.updateProject(projectState.projectId, updates);
        
        // 同步更新本地状态
        Object.assign(projectState.project, updates);
        
        projectState.isDirty = false;
        showToast('✅ 已保存到项目', 'success');
        
        // 更新头部显示
        updateProjectHeader(projectState.project);
        
    } catch (error) {
        console.error('保存失败:', error);
        showToast('保存失败: ' + error.message, 'error');
    }
}

/**
 * 创建新项目
 */
async function createNewProject() {
    // 收集表单数据
    const equipmentType = document.getElementById('equipmentType')?.value || '设备';
    const equipmentModel = document.getElementById('equipmentModel')?.value || '';
    const quantity = parseInt(document.getElementById('quantity')?.value) || 1;
    const purchasePrice = parseFloat(document.getElementById('purchasePrice')?.value) || 0;
    const monthlyRent = parseFloat(document.getElementById('monthlyRent')?.value) || 0;
    const leaseTerm = parseInt(document.getElementById('leaseTerm')?.value) || 12;
    const targetRegion = document.getElementById('targetRegion')?.value || '哈萨克斯坦';
    const targetCity = document.getElementById('targetCity')?.value || '';
    
    const defaultName = `${equipmentType} ${equipmentModel} 租赁项目`.trim();
    const name = prompt('请输入项目名称:', defaultName);
    if (!name) return;
    
    try {
        const snapshot = collectFormSnapshot();
        const result = collectCalcResult();
        
        const project = await db.createProject({
            name,
            region: targetRegion,
            country: targetRegion,
            city: targetCity,
            projectType: appState?.businessMode === 'lease-to-sell' ? '租售结合' : '设备租赁',
            status: 'draft',
            equipment: {
                type: equipmentType,
                model: equipmentModel,
                quantity: quantity,
                purchasePrice: purchasePrice
            },
            revenue: {
                monthlyRent: monthlyRent,
                leaseTerm: leaseTerm
            },
            latestResult: {
                ...result,
                inputsSnapshot: snapshot,
                calculatedAt: new Date().toISOString(),
                equipmentValue: purchasePrice * quantity,
                monthlyRent: monthlyRent,
                leaseTerm: leaseTerm
            }
        });
        
        projectState.projectId = project.projectId;
        projectState.project = project;
        projectState.isDirty = false;
        
        // 更新URL
        window.history.replaceState({}, '', `project.html?id=${project.projectId}`);
        
        // 更新头部
        updateProjectHeader(project);
        
        showToast('✅ 项目创建成功: ' + project.projectId, 'success');
    } catch (error) {
        console.error('创建项目失败:', error);
        showToast('创建失败: ' + error.message, 'error');
    }
}

/**
 * 打开保存版本弹窗
 */
function openVersionModal() {
    if (!projectState.projectId) {
        showToast('请先保存项目', 'warning');
        return;
    }
    
    // 生成默认版本名
    const now = new Date();
    const defaultName = `版本 ${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.getElementById('versionName').value = defaultName;
    document.getElementById('versionScenario').value = appState?.scenario || 'baseline';
    document.getElementById('versionNote').value = '';
    
    document.getElementById('versionModal').classList.add('show');
}

/**
 * 关闭版本弹窗
 */
function closeVersionModal() {
    document.getElementById('versionModal').classList.remove('show');
}

/**
 * 保存版本
 */
async function saveVersion() {
    const versionName = document.getElementById('versionName').value.trim();
    if (!versionName) {
        showToast('请输入版本名称', 'warning');
        return;
    }
    
    try {
        const snapshot = collectFormSnapshot();
        const result = collectCalcResult();
        const scenarioType = document.getElementById('versionScenario').value;
        const note = document.getElementById('versionNote').value.trim();
        
        // 创建版本
        const version = await db.createCalcVersion(projectState.projectId, {
            versionName,
            scenarioType,
            note,
            inputsSnapshot: snapshot
        });
        
        // 保存测算结果
        if (result) {
            await db.saveCalcResult(version.versionId, projectState.projectId, result);
        }
        
        // 同时更新项目的 latestResult
        await db.updateProject(projectState.projectId, {
            latestResult: {
                ...result,
                inputsSnapshot: snapshot,
                calculatedAt: new Date().toISOString()
            }
        });
        
        closeVersionModal();
        showToast('✅ 版本已保存', 'success');
        
        // 刷新版本列表
        await loadVersionList(projectState.projectId);
        
        // 选中新版本
        document.getElementById('versionSelect').value = version.versionId;
        updateVersionInfo(version);
        
    } catch (error) {
        console.error('保存版本失败:', error);
        showToast('保存失败: ' + error.message, 'error');
    }
}

/**
 * 版本对比
 */
function compareVersions() {
    if (projectState.versions.length < 2) {
        showToast('需要至少2个版本才能对比', 'warning');
        return;
    }
    
    showToast('版本对比功能开发中...', 'info');
}

/**
 * 导出版本
 */
function exportVersion() {
    const currentVersion = projectState.versions.find(v => v.versionId === projectState.currentVersionId);
    if (!currentVersion) {
        showToast('请先选择一个版本', 'warning');
        return;
    }
    
    // 导出为 JSON
    const exportData = {
        projectName: projectState.project?.name,
        versionName: currentVersion.versionName,
        scenarioType: currentVersion.scenarioType,
        createdAt: currentVersion.createdAt,
        inputs: currentVersion.inputsSnapshot,
        result: collectCalcResult()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectState.project?.name || '测算'}_${currentVersion.versionName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('✅ 已导出', 'success');
}

/**
 * 监听表单变化，标记为脏数据
 */
function initDirtyTracking() {
    const inputs = document.querySelectorAll('.input-panel input, .input-panel select');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            projectState.isDirty = true;
        });
    });
    
    // 离开页面提醒
    window.addEventListener('beforeunload', (e) => {
        if (projectState.isDirty) {
            e.preventDefault();
            e.returnValue = '您有未保存的更改，确定要离开吗？';
        }
    });
}

/**
 * 格式化日期时间
 */
function formatDateTime(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Toast 提示（如果 app.js 没有定义）
 */
if (typeof showToast !== 'function') {
    window.showToast = function(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };
}
