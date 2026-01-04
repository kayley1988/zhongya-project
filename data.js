/**
 * 数据管理中心 - 统一数据源
 * 所有页面的数据都从这里管理和同步
 */

// ==================== 数据表配置 ====================

const DATA_TABLES = {
    projects: {
        name: '项目数据',
        icon: '📁',
        desc: '管理所有项目的基础信息',
        storeName: 'projects',
        primaryKey: 'projectId',
        columns: [
            { key: 'projectId', label: 'ID', width: '120px', type: 'id' },
            { key: 'name', label: '项目名称', width: '180px', type: 'text', required: true },
            { key: 'region', label: '区域', width: '120px', type: 'select', options: ['哈萨克斯坦', '乌兹别克斯坦', '吉尔吉斯斯坦', '土库曼斯坦', '塔吉克斯坦'] },
            { key: 'city', label: '城市', width: '100px', type: 'text' },
            { key: 'projectType', label: '项目类型', width: '100px', type: 'select', options: ['设备租赁', '设备出售', '租售结合', '工程承包'] },
            { key: 'customer', label: '客户', width: '120px', type: 'text' },
            { key: 'status', label: '状态', width: '90px', type: 'select', options: ['draft', 'pending', 'approved', 'rejected', 'archived'] },
            { key: 'updatedAt', label: '更新时间', width: '150px', type: 'datetime' }
        ],
        defaultSort: { field: 'updatedAt', order: 'desc' }
    },
    
    customers: {
        name: '客户数据',
        icon: '👥',
        desc: '管理客户信息',
        storeName: 'customers',
        primaryKey: 'customerId',
        columns: [
            { key: 'customerId', label: 'ID', width: '100px', type: 'id' },
            { key: 'name', label: '客户名称', width: '180px', type: 'text', required: true },
            { key: 'type', label: '客户类型', width: '100px', type: 'select', options: ['企业', '政府', '个人'] },
            { key: 'country', label: '国家', width: '120px', type: 'select', options: ['哈萨克斯坦', '乌兹别克斯坦', '吉尔吉斯斯坦', '土库曼斯坦', '塔吉克斯坦', '中国'] },
            { key: 'contact', label: '联系人', width: '100px', type: 'text' },
            { key: 'phone', label: '电话', width: '130px', type: 'text' },
            { key: 'email', label: '邮箱', width: '160px', type: 'text' },
            { key: 'creditLevel', label: '信用等级', width: '90px', type: 'select', options: ['A', 'B', 'C', 'D'] }
        ],
        defaultSort: { field: 'name', order: 'asc' }
    },
    
    equipments: {
        name: '设备库',
        icon: '🏗️',
        desc: '管理设备型号和价格',
        storeName: 'equipments',
        primaryKey: 'equipmentId',
        columns: [
            { key: 'equipmentId', label: 'ID', width: '100px', type: 'id' },
            { key: 'type', label: '设备类型', width: '100px', type: 'select', options: ['叉车', '挖掘机', '装载机', '塔吊', '混凝土设备', '压路机', '起重机', '其他'] },
            { key: 'brand', label: '品牌', width: '90px', type: 'text' },
            { key: 'model', label: '型号', width: '100px', type: 'text', required: true },
            { key: 'specs', label: '规格参数', width: '140px', type: 'text' },
            { key: 'purchasePrice', label: '采购单价(¥)', width: '120px', type: 'money' },
            { key: 'suggestedRent', label: '建议月租(¥)', width: '120px', type: 'money' },
            { key: 'depreciationYears', label: '折旧年限', width: '90px', type: 'number' }
        ],
        defaultSort: { field: 'type', order: 'asc' }
    },
    
    fxRates: {
        name: '汇率数据',
        icon: '💱',
        desc: '管理货币汇率',
        storeName: 'fxRates',
        primaryKey: 'rateId',
        columns: [
            { key: 'rateId', label: 'ID', width: '80px', type: 'id' },
            { key: 'fromCurrency', label: '源货币', width: '90px', type: 'select', options: ['CNY', 'USD', 'EUR', 'RUB'] },
            { key: 'toCurrency', label: '目标货币', width: '90px', type: 'select', options: ['KZT', 'UZS', 'KGS', 'TMT', 'TJS'] },
            { key: 'rate', label: '汇率', width: '110px', type: 'number', decimals: 4 },
            { key: 'source', label: '数据来源', width: '100px', type: 'text' },
            { key: 'effectiveDate', label: '生效日期', width: '110px', type: 'date' },
            { key: 'updatedAt', label: '更新时间', width: '150px', type: 'datetime' }
        ],
        defaultSort: { field: 'updatedAt', order: 'desc' }
    },
    
    taxRules: {
        name: '税率规则',
        icon: '📋',
        desc: '管理各国税率规则',
        storeName: 'taxRules',
        primaryKey: 'ruleId',
        columns: [
            { key: 'ruleId', label: 'ID', width: '80px', type: 'id' },
            { key: 'country', label: '国家', width: '120px', type: 'select', options: ['哈萨克斯坦', '乌兹别克斯坦', '吉尔吉斯斯坦', '土库曼斯坦', '塔吉克斯坦'], required: true },
            { key: 'taxType', label: '税种', width: '100px', type: 'select', options: ['进口关税', '增值税', '企业所得税', '预提税', '印花税'] },
            { key: 'rate', label: '税率(%)', width: '90px', type: 'number', decimals: 2 },
            { key: 'condition', label: '适用条件', width: '180px', type: 'text' },
            { key: 'notes', label: '备注', width: '150px', type: 'text' }
        ],
        defaultSort: { field: 'country', order: 'asc' }
    },
    
    costTemplates: {
        name: '成本模板',
        icon: '💵',
        desc: '管理跨境成本计算模板',
        storeName: 'costTemplates',
        primaryKey: 'templateId',
        columns: [
            { key: 'templateId', label: 'ID', width: '80px', type: 'id' },
            { key: 'name', label: '模板名称', width: '150px', type: 'text', required: true },
            { key: 'country', label: '适用国家', width: '120px', type: 'select', options: ['哈萨克斯坦', '乌兹别克斯坦', '吉尔吉斯斯坦', '全部'] },
            { key: 'category', label: '成本类别', width: '100px', type: 'select', options: ['运输', '清关', '保险', '仓储', '安装', '其他'] },
            { key: 'calcMethod', label: '计算方式', width: '110px', type: 'select', options: ['固定金额', '百分比', '单价×数量'] },
            { key: 'value', label: '默认值', width: '100px', type: 'number' },
            { key: 'isDefault', label: '默认启用', width: '90px', type: 'boolean' }
        ],
        defaultSort: { field: 'category', order: 'asc' }
    }
};

// ==================== 状态管理 ====================

const dataState = {
    currentTable: 'projects',
    data: {},
    pagination: {
        page: 1,
        pageSize: 20
    },
    sort: {
        field: null,
        order: 'asc'
    },
    search: '',
    editingId: null,
    importData: null
};

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', async () => {
    // 等待数据库初始化完成
    if (window.db) {
        try {
            await window.db.ensureReady();
            console.log('IndexedDB 就绪');
        } catch (e) {
            console.error('IndexedDB 初始化失败:', e);
        }
    }
    
    await initDataCenter();
});

async function initDataCenter() {
    try {
        showToast('正在加载数据...', 'info');
        
        // 同步其他页面数据
        await syncFromOtherPages();
        
        // 更新所有计数
        updateAllCounts();
        updateHeroStats();
        
        // 渲染当前表格
        renderTable();
        
        showToast('数据加载完成', 'success');
    } catch (error) {
        console.error('初始化失败:', error);
        showToast('初始化失败: ' + error.message, 'error');
    }
}

// ==================== 数据同步 ====================

/**
 * 从其他页面同步数据
 */
async function syncFromOtherPages() {
    // 1. 同步项目数据 (从 IndexedDB - window.db)
    if (window.db) {
        try {
            // 等待数据库就绪
            await window.db.ensureReady();
            const projects = await window.db.getProjects();
            dataState.data.projects = projects || [];
            
            // 从项目中提取客户信息
            extractCustomersFromProjects(projects);
            
            // 从项目中提取设备信息
            extractEquipmentsFromProjects(projects);
            
            console.log(`同步项目数据成功: ${projects.length} 条`);
        } catch (e) {
            console.error('同步项目数据失败:', e);
            dataState.data.projects = [];
        }
    } else {
        console.warn('数据库未初始化，尝试从 localStorage 恢复');
        const stored = localStorage.getItem(`dataCenter_projects`);
        dataState.data.projects = stored ? JSON.parse(stored) : [];
    }
    
    // 2. 从 localStorage 加载其他数据
    const tables = ['customers', 'equipments', 'fxRates', 'taxRules', 'costTemplates'];
    for (const table of tables) {
        if (!dataState.data[table] || dataState.data[table].length === 0) {
            const stored = localStorage.getItem(`dataCenter_${table}`);
            dataState.data[table] = stored ? JSON.parse(stored) : [];
        }
    }
    
    // 3. 初始化默认数据（如果为空）
    initDefaultFxRates();
    initDefaultTaxRules();
    initDefaultEquipments();
}

/**
 * 从项目数据中提取客户信息
 */
function extractCustomersFromProjects(projects) {
    if (!projects || !projects.length) return;
    
    const existingCustomers = dataState.data.customers || [];
    const existingNames = new Set(existingCustomers.map(c => c.name));
    
    const newCustomers = [];
    projects.forEach(p => {
        if (p.customer && !existingNames.has(p.customer)) {
            existingNames.add(p.customer);
            newCustomers.push({
                customerId: generateId('customers'),
                name: p.customer,
                country: p.region || '哈萨克斯坦',
                type: '企业',
                creditLevel: 'B',
                createdAt: new Date().toISOString()
            });
        }
    });
    
    if (newCustomers.length > 0) {
        dataState.data.customers = [...existingCustomers, ...newCustomers];
        saveToStore('customers', dataState.data.customers);
    }
}

/**
 * 从项目数据中提取设备信息
 */
function extractEquipmentsFromProjects(projects) {
    if (!projects || !projects.length) return;
    
    const existingEquipments = dataState.data.equipments || [];
    const existingModels = new Set(existingEquipments.map(e => `${e.type}_${e.model}`));
    
    const newEquipments = [];
    projects.forEach(p => {
        const eq = p.equipment;
        if (eq && eq.model) {
            const key = `${eq.type || '其他'}_${eq.model}`;
            if (!existingModels.has(key)) {
                existingModels.add(key);
                newEquipments.push({
                    equipmentId: generateId('equipments'),
                    type: eq.type || '其他',
                    brand: eq.brand || '',
                    model: eq.model,
                    specs: eq.specs || '',
                    purchasePrice: eq.purchasePrice || 0,
                    suggestedRent: eq.monthlyRent || Math.round((eq.purchasePrice || 0) * 0.03),
                    depreciationYears: 10,
                    createdAt: new Date().toISOString()
                });
            }
        }
    });
    
    if (newEquipments.length > 0) {
        dataState.data.equipments = [...existingEquipments, ...newEquipments];
        saveToStore('equipments', dataState.data.equipments);
    }
}

/**
 * 初始化默认汇率数据
 */
function initDefaultFxRates() {
    if (dataState.data.fxRates && dataState.data.fxRates.length > 0) return;
    
    const defaultRates = [
        { fromCurrency: 'CNY', toCurrency: 'KZT', rate: 68.5, source: '系统默认' },
        { fromCurrency: 'CNY', toCurrency: 'UZS', rate: 1750, source: '系统默认' },
        { fromCurrency: 'CNY', toCurrency: 'KGS', rate: 12.2, source: '系统默认' },
        { fromCurrency: 'USD', toCurrency: 'KZT', rate: 450, source: '系统默认' },
        { fromCurrency: 'USD', toCurrency: 'UZS', rate: 12500, source: '系统默认' },
        { fromCurrency: 'EUR', toCurrency: 'KZT', rate: 520, source: '系统默认' },
        { fromCurrency: 'RUB', toCurrency: 'KZT', rate: 5.2, source: '系统默认' }
    ].map(r => ({
        ...r,
        rateId: generateId('fxRates'),
        effectiveDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
    }));
    
    dataState.data.fxRates = defaultRates;
    saveToStore('fxRates', defaultRates);
}

/**
 * 初始化默认税率规则
 */
function initDefaultTaxRules() {
    if (dataState.data.taxRules && dataState.data.taxRules.length > 0) return;
    
    const defaultRules = [
        { country: '哈萨克斯坦', taxType: '进口关税', rate: 5, condition: '建筑机械设备' },
        { country: '哈萨克斯坦', taxType: '增值税', rate: 12, condition: '标准税率' },
        { country: '哈萨克斯坦', taxType: '企业所得税', rate: 20, condition: '标准税率' },
        { country: '乌兹别克斯坦', taxType: '进口关税', rate: 10, condition: '建筑机械设备' },
        { country: '乌兹别克斯坦', taxType: '增值税', rate: 12, condition: '标准税率' },
        { country: '吉尔吉斯斯坦', taxType: '进口关税', rate: 0, condition: 'EAEU成员国' },
        { country: '吉尔吉斯斯坦', taxType: '增值税', rate: 12, condition: '标准税率' }
    ].map(r => ({
        ...r,
        ruleId: generateId('taxRules'),
        notes: '',
        createdAt: new Date().toISOString()
    }));
    
    dataState.data.taxRules = defaultRules;
    saveToStore('taxRules', defaultRules);
}

/**
 * 初始化默认设备库
 */
function initDefaultEquipments() {
    if (dataState.data.equipments && dataState.data.equipments.length > 0) return;
    
    const defaultEquipments = [
        { type: '叉车', brand: '合力', model: 'CPCD50', specs: '5吨', purchasePrice: 180000, suggestedRent: 12000 },
        { type: '挖掘机', brand: '小松', model: 'PC60', specs: '6吨', purchasePrice: 280000, suggestedRent: 22000 },
        { type: '装载机', brand: '柳工', model: 'ZL50CN', specs: '5吨', purchasePrice: 350000, suggestedRent: 25000 },
        { type: '塔吊', brand: '中联', model: 'TC7030', specs: '70m臂长', purchasePrice: 980000, suggestedRent: 72000 },
        { type: '压路机', brand: '徐工', model: 'XS223J', specs: '22吨', purchasePrice: 420000, suggestedRent: 35000 }
    ].map(e => ({
        ...e,
        equipmentId: generateId('equipments'),
        depreciationYears: 10,
        createdAt: new Date().toISOString()
    }));
    
    dataState.data.equipments = defaultEquipments;
    saveToStore('equipments', defaultEquipments);
}

// ==================== 表格切换 ====================

function switchTable(tableKey) {
    dataState.currentTable = tableKey;
    dataState.pagination.page = 1;
    dataState.search = '';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    // 设置默认排序
    const config = DATA_TABLES[tableKey];
    if (config && config.defaultSort) {
        dataState.sort = { ...config.defaultSort };
    }
    
    renderTable();
    
    // 更新表格计数
    const total = getFilteredData().length;
    const countEl = document.getElementById('tableCount');
    if (countEl) countEl.textContent = `${total} 条记录`;
}

// ==================== 表格渲染 ====================

function renderTable() {
    renderTableHead();
    renderTableBody();
    renderPagination();
    
    // 更新表格计数
    const total = getFilteredData().length;
    const countEl = document.getElementById('tableCount');
    if (countEl) countEl.textContent = `${total} 条记录`;
}

function renderTableHead() {
    const config = DATA_TABLES[dataState.currentTable];
    const thead = document.getElementById('tableHead');
    if (!thead) return;
    
    thead.innerHTML = `
        <tr>
            <th class="checkbox-cell">
                <input type="checkbox" class="row-checkbox" onchange="toggleSelectAll(this)">
            </th>
            ${config.columns.map(col => `
                <th style="width: ${col.width}; min-width: ${col.width}" 
                    class="sortable" 
                    onclick="sortBy('${col.key}')">
                    ${col.label}
                    ${dataState.sort.field === col.key ? 
                        (dataState.sort.order === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
            `).join('')}
            <th style="width: 100px">操作</th>
        </tr>
    `;
}

function renderTableBody() {
    const config = DATA_TABLES[dataState.currentTable];
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    let data = getFilteredData();
    
    // 分页
    const { page, pageSize } = dataState.pagination;
    const total = data.length;
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    const pageData = data.slice(start, end);
    
    // 更新显示范围
    const showRange = document.getElementById('showRange');
    const totalCount = document.getElementById('totalCount');
    if (showRange) showRange.textContent = total > 0 ? `${start + 1}-${end}` : '0-0';
    if (totalCount) totalCount.textContent = total;
    
    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${config.columns.length + 2}">
                    <div class="empty-state">
                        <div class="empty-icon">📭</div>
                        <h3>暂无数据</h3>
                        <p>点击"新增"按钮添加数据，或从其他页面同步</p>
                        <button class="btn btn-primary" onclick="openAddModal()">➕ 添加数据</button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = pageData.map(item => `
        <tr data-id="${item[config.primaryKey]}">
            <td class="checkbox-cell">
                <input type="checkbox" class="row-checkbox" data-id="${item[config.primaryKey]}">
            </td>
            ${config.columns.map(col => renderCell(item, col)).join('')}
            <td class="cell-actions">
                <button class="action-btn" title="编辑" onclick="editItem('${item[config.primaryKey]}')">✏️</button>
                <button class="action-btn" title="复制" onclick="duplicateItem('${item[config.primaryKey]}')">📋</button>
                <button class="action-btn danger" title="删除" onclick="deleteItem('${item[config.primaryKey]}')">🗑️</button>
            </td>
        </tr>
    `).join('');
    // 启用单元格内联编辑（双击编辑）
    enableInlineEditing();
}

// 启用表格内联编辑：双击单元格进入编辑，Enter 保存，Esc 取消，blur 保存
function enableInlineEditing() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    const config = DATA_TABLES[dataState.currentTable];

    tbody.querySelectorAll('tr').forEach(tr => {
        const id = tr.dataset.id;
        if (!id) return;

        // 跳过复选框列（0）和操作列（最后一列）
        const cells = Array.from(tr.children);
        cells.forEach((td, idx) => {
            // 可编辑列索引对应 config.columns: cells[0] 是 checkbox
            const colIndex = idx - 1; // map to config.columns
            if (colIndex < 0 || colIndex >= config.columns.length) return;

            const col = config.columns[colIndex];
            // 不对 id/datetime 字段内联编辑
            if (col.type === 'id' || col.type === 'datetime') return;

            td.ondblclick = (e) => {
                startCellEdit(td, col, id);
            };
        });
    });
}

function startCellEdit(td, col, id) {
    // 已经在编辑中则忽略
    if (td.dataset.editing === 'true') return;
    td.dataset.editing = 'true';

    const tableKey = dataState.currentTable;
    const config = DATA_TABLES[tableKey];
    const primaryKey = config.primaryKey;
    const item = (dataState.data[tableKey] || []).find(d => d[primaryKey] === id);
    if (!item) {
        td.dataset.editing = 'false';
        return;
    }

    const oldValue = item[col.key] != null ? item[col.key] : '';

    // 创建输入控件
    let input;
    if (col.type === 'number' || col.type === 'money') {
        input = document.createElement('input');
        input.type = 'number';
        input.step = col.decimals ? Math.pow(0.1, col.decimals) : 'any';
        input.value = oldValue;
    } else if (col.type === 'select') {
        input = document.createElement('select');
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '——';
        input.appendChild(emptyOpt);
        (col.options || []).forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            if (opt === oldValue) o.selected = true;
            input.appendChild(o);
        });
    } else if (col.type === 'boolean') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!oldValue;
    } else {
        input = document.createElement('input');
        input.type = 'text';
        input.value = oldValue;
    }

    input.className = 'inline-edit-input';
    td.innerHTML = '';
    td.appendChild(input);
    input.focus();

    const commit = async () => {
        let newValue;
        if (col.type === 'boolean') {
            newValue = input.checked;
        } else if (col.type === 'number' || col.type === 'money') {
            newValue = input.value !== '' ? parseFloat(input.value) : null;
        } else {
            newValue = input.value;
        }

        // 更新内存数据
        item[col.key] = newValue;
        item.updatedAt = new Date().toISOString();

        try {
            await saveTableData(tableKey);
            renderTableBody();
            updateAllCounts();
            updateHeroStats();
            showToast('保存成功', 'success');
        } catch (err) {
            console.error('内联保存失败:', err);
            showToast('保存失败: ' + err.message, 'error');
        }
    };

    const cancel = () => {
        td.dataset.editing = 'false';
        renderTableBody();
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            commit();
        } else if (e.key === 'Escape') {
            cancel();
        }
    });

    input.addEventListener('blur', () => {
        // 在失焦时提交（避免频繁触发）
        commit();
    });
}

function renderCell(item, col) {
    const value = item[col.key];
    
    switch (col.type) {
        case 'id':
            const shortId = value ? (value.length > 12 ? value.slice(-10) : value) : '--';
            return `<td><span class="cell-id" title="${value || ''}">${shortId}</span></td>`;
            
        case 'money':
            return `<td class="cell-money">${(value || 0).toLocaleString()}</td>`;
            
        case 'number':
            const decimals = col.decimals || 0;
            return `<td>${value != null ? Number(value).toFixed(decimals) : '--'}</td>`;
            
        case 'date':
            return `<td class="cell-date">${value ? formatDate(value) : '--'}</td>`;
            
        case 'datetime':
            return `<td class="cell-date">${value ? formatDateTime(value) : '--'}</td>`;
            
        case 'select':
            const tagColors = {
                'draft': 'gray', 'pending': 'yellow', 'approved': 'green', 
                'rejected': 'red', 'archived': 'purple',
                '设备租赁': 'blue', '设备出售': 'green', '租售结合': 'yellow', '工程承包': 'purple',
                'A': 'green', 'B': 'blue', 'C': 'yellow', 'D': 'red',
                '热门': 'red', '普通': 'gray', '特殊': 'purple',
                '企业': 'blue', '政府': 'purple', '个人': 'green'
            };
            const color = tagColors[value] || 'gray';
            const displayValue = getDisplayValue(value);
            return `<td><span class="cell-tag ${color}">${displayValue}</span></td>`;
            
        case 'boolean':
            return `<td>${value ? '✅' : '❌'}</td>`;
            
        default:
            const textValue = value || '--';
            const displayText = textValue.length > 20 ? textValue.slice(0, 20) + '...' : textValue;
            return `<td class="${col.key === 'name' ? 'cell-name' : ''}" title="${textValue}">${displayText}</td>`;
    }
}

function getDisplayValue(value) {
    const labels = {
        'draft': '草稿',
        'pending': '待审核',
        'approved': '已通过',
        'rejected': '已驳回',
        'archived': '已归档'
    };
    return labels[value] || value || '--';
}

function getFilteredData() {
    let data = [...(dataState.data[dataState.currentTable] || [])];
    
    // 搜索过滤
    if (dataState.search) {
        const keyword = dataState.search.toLowerCase();
        data = data.filter(item => {
            return Object.values(item).some(val => 
                String(val).toLowerCase().includes(keyword)
            );
        });
    }
    
    // 排序
    if (dataState.sort.field) {
        data.sort((a, b) => {
            const aVal = a[dataState.sort.field];
            const bVal = b[dataState.sort.field];
            
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            
            let result = 0;
            if (typeof aVal === 'string') {
                result = aVal.localeCompare(bVal);
            } else {
                result = aVal - bVal;
            }
            
            return dataState.sort.order === 'asc' ? result : -result;
        });
    }
    
    return data;
}

// ==================== 分页 ====================

function renderPagination() {
    const data = getFilteredData();
    const total = data.length;
    const { page, pageSize } = dataState.pagination;
    const totalPages = Math.ceil(total / pageSize);
    
    const controls = document.getElementById('paginationControls');
    if (!controls) return;
    
    if (totalPages <= 1) {
        controls.innerHTML = '';
        return;
    }
    
    let html = `
        <button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="goToPage(1)">«</button>
        <button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="goToPage(${page - 1})">‹</button>
    `;
    
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    html += `
        <button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="goToPage(${page + 1})">›</button>
        <button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="goToPage(${totalPages})">»</button>
    `;
    
    controls.innerHTML = html;
}

function goToPage(page) {
    dataState.pagination.page = page;
    renderTableBody();
    renderPagination();
}

function changePageSize(size) {
    dataState.pagination.pageSize = parseInt(size);
    dataState.pagination.page = 1;
    renderTable();
}

// ==================== 搜索和排序 ====================

function searchData() {
    const input = document.getElementById('searchInput');
    dataState.search = input ? input.value : '';
    dataState.pagination.page = 1;
    renderTableBody();
    renderPagination();
}

function sortBy(field) {
    if (dataState.sort.field === field) {
        dataState.sort.order = dataState.sort.order === 'asc' ? 'desc' : 'asc';
    } else {
        dataState.sort.field = field;
        dataState.sort.order = 'asc';
    }
    renderTable();
}

// ==================== 数据操作 ====================

function openAddModal() {
    dataState.editingId = null;
    const titleEl = document.getElementById('modalTitle');
    if (titleEl) titleEl.textContent = '➕ 新增数据';
    renderForm({});
    const modal = document.getElementById('editModal');
    if (modal) modal.classList.add('show');
}

function editItem(id) {
    const config = DATA_TABLES[dataState.currentTable];
    const item = dataState.data[dataState.currentTable].find(
        d => d[config.primaryKey] === id
    );
    
    if (!item) return;
    
    dataState.editingId = id;
    const titleEl = document.getElementById('modalTitle');
    if (titleEl) titleEl.textContent = '✏️ 编辑数据';
    renderForm(item);
    const modal = document.getElementById('editModal');
    if (modal) modal.classList.add('show');
}

function renderForm(item) {
    const config = DATA_TABLES[dataState.currentTable];
    const body = document.getElementById('modalBody');
    if (!body) return;
    
    body.innerHTML = config.columns
        .filter(col => col.type !== 'id' && col.type !== 'datetime')
        .map(col => {
            const value = item[col.key] || '';
            let input = '';
            
            switch (col.type) {
                case 'select':
                    input = `
                        <select class="form-control" name="${col.key}" ${col.required ? 'required' : ''}>
                            <option value="">请选择</option>
                            ${col.options.map(opt => `
                                <option value="${opt}" ${value === opt ? 'selected' : ''}>${getDisplayValue(opt)}</option>
                            `).join('')}
                        </select>
                    `;
                    break;
                    
                case 'money':
                case 'number':
                    input = `<input type="number" class="form-control" name="${col.key}" 
                               value="${value}" step="${col.decimals ? Math.pow(0.1, col.decimals) : 1}"
                               ${col.required ? 'required' : ''}>`;
                    break;
                    
                case 'date':
                    input = `<input type="date" class="form-control" name="${col.key}" 
                               value="${value}" ${col.required ? 'required' : ''}>`;
                    break;
                    
                case 'boolean':
                    input = `
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" name="${col.key}" ${value ? 'checked' : ''}>
                            <span>启用</span>
                        </label>
                    `;
                    break;
                    
                default:
                    input = `<input type="text" class="form-control" name="${col.key}" 
                               value="${value}" ${col.required ? 'required' : ''}>`;
            }
            
            return `
                <div class="form-group">
                    <label class="form-label">
                        ${col.label}
                        ${col.required ? '<span class="required">*</span>' : ''}
                    </label>
                    ${input}
                </div>
            `;
        }).join('');
}

async function saveData() {
    const config = DATA_TABLES[dataState.currentTable];
    const form = document.getElementById('modalBody');
    if (!form) return;
    
    const formData = {};
    
    config.columns.forEach(col => {
        if (col.type === 'id' || col.type === 'datetime') return;
        
        const input = form.querySelector(`[name="${col.key}"]`);
        if (!input) return;
        
        if (col.type === 'boolean') {
            formData[col.key] = input.checked;
        } else if (col.type === 'money' || col.type === 'number') {
            formData[col.key] = input.value ? parseFloat(input.value) : null;
        } else {
            formData[col.key] = input.value;
        }
    });
    
    for (const col of config.columns) {
        if (col.required && !formData[col.key]) {
            showToast(`请填写 ${col.label}`, 'error');
            return;
        }
    }
    
    try {
        if (dataState.editingId) {
            const index = dataState.data[dataState.currentTable].findIndex(
                d => d[config.primaryKey] === dataState.editingId
            );
            if (index !== -1) {
                formData[config.primaryKey] = dataState.editingId;
                formData.updatedAt = new Date().toISOString();
                dataState.data[dataState.currentTable][index] = {
                    ...dataState.data[dataState.currentTable][index],
                    ...formData
                };
            }
        } else {
            formData[config.primaryKey] = generateId(dataState.currentTable);
            formData.createdAt = new Date().toISOString();
            formData.updatedAt = new Date().toISOString();
            dataState.data[dataState.currentTable].push(formData);
        }
        
        await saveTableData(dataState.currentTable);
        
        closeEditModal();
        renderTable();
        updateAllCounts();
        updateHeroStats();
        showToast('保存成功', 'success');
    } catch (error) {
        console.error('保存失败:', error);
        showToast('保存失败: ' + error.message, 'error');
    }
}

async function deleteItem(id) {
    if (!confirm('确定要删除此数据吗？')) return;
    
    const config = DATA_TABLES[dataState.currentTable];
    
    dataState.data[dataState.currentTable] = dataState.data[dataState.currentTable]
        .filter(d => d[config.primaryKey] !== id);
    
    await saveTableData(dataState.currentTable);
    renderTable();
    updateAllCounts();
    updateHeroStats();
    showToast('删除成功', 'success');
}

async function duplicateItem(id) {
    const config = DATA_TABLES[dataState.currentTable];
    const item = dataState.data[dataState.currentTable].find(
        d => d[config.primaryKey] === id
    );
    
    if (!item) return;
    
    const newItem = { ...item };
    newItem[config.primaryKey] = generateId(dataState.currentTable);
    if (newItem.name) newItem.name = newItem.name + ' (副本)';
    newItem.createdAt = new Date().toISOString();
    newItem.updatedAt = new Date().toISOString();
    
    dataState.data[dataState.currentTable].push(newItem);
    
    await saveTableData(dataState.currentTable);
    renderTable();
    updateAllCounts();
    updateHeroStats();
    showToast('复制成功', 'success');
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.classList.remove('show');
    dataState.editingId = null;
}

// ==================== 数据存储 ====================

async function saveTableData(tableKey) {
    const data = dataState.data[tableKey];
    
    if (tableKey === 'projects' && window.db) {
        // 项目数据同步到 IndexedDB
        try {
            await window.db.ensureReady();
            for (const project of data) {
                if (project.projectId) {
                    await window.db.updateProject(project.projectId, project);
                }
            }
        } catch (e) {
            console.error('同步项目到IndexedDB失败:', e);
        }
    }
    
    // 同时保存到 localStorage
    saveToStore(tableKey, data);
}

function saveToStore(storeName, data) {
    localStorage.setItem(`dataCenter_${storeName}`, JSON.stringify(data));
}

function generateId(tableKey) {
    const prefixes = {
        projects: 'PRJ',
        customers: 'CUS',
        equipments: 'EQP',
        fxRates: 'FXR',
        taxRules: 'TAX',
        costTemplates: 'CST'
    };
    const prefix = prefixes[tableKey] || 'DAT';
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
}

// ==================== 统计更新 ====================

function updateAllCounts() {
    for (const tableKey of Object.keys(DATA_TABLES)) {
        const count = (dataState.data[tableKey] || []).length;
        const capitalKey = tableKey.charAt(0).toUpperCase() + tableKey.slice(1);
        const el = document.getElementById(`count${capitalKey}`);
        if (el) el.textContent = count;
    }
}

function updateHeroStats() {
    const projectsEl = document.getElementById('totalProjects');
    const customersEl = document.getElementById('totalCustomers');
    const equipmentsEl = document.getElementById('totalEquipments');
    const recordsEl = document.getElementById('totalRecords');
    
    if (projectsEl) projectsEl.textContent = (dataState.data.projects || []).length;
    if (customersEl) customersEl.textContent = (dataState.data.customers || []).length;
    if (equipmentsEl) equipmentsEl.textContent = (dataState.data.equipments || []).length;
    
    let total = 0;
    for (const key of Object.keys(DATA_TABLES)) {
        total += (dataState.data[key] || []).length;
    }
    if (recordsEl) recordsEl.textContent = total;
}

// ==================== 导入导出 ====================

function importData() {
    const modal = document.getElementById('importModal');
    if (modal) modal.classList.add('show');
}

function closeImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) modal.classList.remove('show');
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
    
    const preview = document.getElementById('importPreview');
    if (preview) preview.style.display = 'none';
    
    dataState.importData = null;
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            let data;
            
            if (file.name.endsWith('.json')) {
                data = JSON.parse(e.target.result);
            } else if (file.name.endsWith('.csv')) {
                data = parseCSV(e.target.result);
            }
            
            if (!Array.isArray(data)) data = [data];
            
            dataState.importData = data;
            
            const preview = document.getElementById('importPreview');
            if (preview) {
                preview.style.display = 'block';
                const previewTable = preview.querySelector('#previewTable');
                if (previewTable) {
                    previewTable.innerHTML = `
                        <p style="color: var(--text-secondary);">共 ${data.length} 条数据准备导入</p>
                    `;
                }
            }
            
            const confirmBtn = document.getElementById('confirmImportBtn');
            if (confirmBtn) confirmBtn.disabled = false;
        } catch (error) {
            showToast('文件解析失败: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
}

function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, i) => {
            obj[header] = values[i]?.trim() || '';
        });
        return obj;
    });
}

async function confirmImport() {
    if (!dataState.importData) return;
    
    const config = DATA_TABLES[dataState.currentTable];
    
    const importedData = dataState.importData.map(item => ({
        ...item,
        [config.primaryKey]: item[config.primaryKey] || generateId(dataState.currentTable),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }));
    
    dataState.data[dataState.currentTable] = [
        ...dataState.data[dataState.currentTable],
        ...importedData
    ];
    
    await saveTableData(dataState.currentTable);
    closeImportModal();
    renderTable();
    updateAllCounts();
    updateHeroStats();
    showToast(`成功导入 ${importedData.length} 条数据`, 'success');
}

function exportCurrentTable() {
    const data = dataState.data[dataState.currentTable];
    const config = DATA_TABLES[dataState.currentTable];
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name}_${formatDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('导出成功', 'success');
}

function exportAllData() {
    const allData = {};
    for (const key of Object.keys(DATA_TABLES)) {
        allData[key] = dataState.data[key] || [];
    }
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `数据中心全量导出_${formatDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('全部数据导出成功', 'success');
}

// ==================== 其他操作 ====================

function toggleSelectAll(checkbox) {
    document.querySelectorAll('#tableBody .row-checkbox').forEach(cb => {
        cb.checked = checkbox.checked;
    });
}

async function batchDelete() {
    const checkedBoxes = document.querySelectorAll('#tableBody .row-checkbox:checked');
    if (checkedBoxes.length === 0) {
        showToast('请选择要删除的项目', 'warning');
        return;
    }
    
    if (!confirm(`确定要删除选中的 ${checkedBoxes.length} 个项目吗？`)) return;
    
    const config = DATA_TABLES[dataState.currentTable];
    const idsToDelete = Array.from(checkedBoxes).map(cb => cb.dataset.id);
    
    dataState.data[dataState.currentTable] = dataState.data[dataState.currentTable]
        .filter(d => !idsToDelete.includes(d[config.primaryKey]));
    
    await saveTableData(dataState.currentTable);
    renderTable();
    updateAllCounts();
    updateHeroStats();
    showToast(`成功删除 ${idsToDelete.length} 个项目`, 'success');
}

function switchDataTable(tableKey) {
    if (DATA_TABLES[tableKey]) {
        switchTable(tableKey);
    }
}

async function clearCurrentTable() {
    const config = DATA_TABLES[dataState.currentTable];
    if (!confirm(`确定要清空 ${config.name} 的所有数据吗？此操作不可恢复！`)) return;
    
    dataState.data[dataState.currentTable] = [];
    await saveTableData(dataState.currentTable);
    renderTable();
    updateAllCounts();
    updateHeroStats();
    showToast('数据已清空', 'success');
}

function refreshTable() {
    syncFromOtherPages().then(() => {
        renderTable();
        updateAllCounts();
        updateHeroStats();
        showToast('刷新成功', 'success');
    });
}

async function initSampleData() {
    if (!confirm('这将初始化示例数据，是否继续？')) return;
    
    // 清空并重新初始化
    dataState.data.fxRates = [];
    dataState.data.taxRules = [];
    dataState.data.equipments = [];
    
    initDefaultFxRates();
    initDefaultTaxRules();
    initDefaultEquipments();
    
    renderTable();
    updateAllCounts();
    updateHeroStats();
    showToast('示例数据初始化完成', 'success');
}

// ==================== 工具函数 ====================

function formatDate(date) {
    if (!date) return '--';
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN');
}

function formatDateTime(date) {
    if (!date) return '--';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) return '刚刚';
        return `${hours}小时前`;
    } else if (days === 1) {
        return '昨天';
    } else if (days < 7) {
        return `${days}天前`;
    }
    return d.toLocaleDateString('zh-CN');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.log(`[${type}] ${message}`);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ==================== 全局数据访问 API ====================

window.DataCenter = {
    getData: async (tableKey) => dataState.data[tableKey] || [],
    saveData: async (tableKey, data) => {
        dataState.data[tableKey] = data;
        saveToStore(tableKey, data);
    },
    getCustomers: async () => dataState.data.customers || [],
    getEquipments: async () => dataState.data.equipments || [],
    getFxRates: async () => dataState.data.fxRates || [],
    getTaxRules: async (country) => {
        const rules = dataState.data.taxRules || [];
        return country ? rules.filter(r => r.country === country) : rules;
    },
    getCostTemplates: async (country) => {
        const templates = dataState.data.costTemplates || [];
        return country ? templates.filter(t => t.country === country || t.country === '全部') : templates;
    }
};
