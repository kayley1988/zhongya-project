/**
 * 中亚跨境项目管理 - 列表页逻辑
 */

const REGION_FLAGS = {
    '哈萨克斯坦': '🇰🇿',
    '乌兹别克斯坦': '🇺🇿',
    '吉尔吉斯斯坦': '🇰🇬',
    '塔吉克斯坦': '🇹🇯',
    '土库曼斯坦': '🇹🇲'
};

const CITY_OPTIONS = {
    '哈萨克斯坦': ['阿拉木图', '阿斯塔纳(努尔苏丹)', '奇姆肯特', '阿克套', '卡拉干达'],
    '乌兹别克斯坦': ['塔什干', '撒马尔罕', '布哈拉', '纳沃伊', '安集延'],
    '吉尔吉斯斯坦': ['比什凯克', '奥什', '贾拉拉巴德'],
    '塔吉克斯坦': ['杜尚别', '苦盏', '库尔干秋别'],
    '土库曼斯坦': ['阿什哈巴德', '土库曼纳巴德', '达沙古兹']
};

// 项目类型配置
const PROJECT_TYPES = {
    '设备租赁': { icon: '📦', color: '#3b82f6' },
    '设备出售': { icon: '🏷️', color: '#10b981' },
    '租售结合': { icon: '🔄', color: '#f59e0b' },
    '工程承包': { icon: '🏗️', color: '#8b5cf6' }
};

// 表格字段配置（飞书风格增强）
const TABLE_FIELDS = [
    { key: 'checkbox', label: '', visible: true, required: true, width: '40px', group: 'system' },
    { key: 'name', label: '项目名称', visible: true, required: true, width: '200px', group: 'basic', sortable: true },
    { key: 'status', label: '状态', visible: true, required: false, width: '100px', group: 'basic', sortable: true },
    { key: 'region', label: '区域', visible: true, required: false, width: '120px', group: 'basic', sortable: true },
    { key: 'city', label: '城市', visible: false, required: false, width: '100px', group: 'basic' },
    { key: 'projectType', label: '业务类型', visible: true, required: false, width: '100px', group: 'basic' },
    { key: 'customer', label: '客户', visible: true, required: false, width: '150px', group: 'basic' },
    { key: 'equipment', label: '设备信息', visible: true, required: false, width: '180px', group: 'basic' },
    { key: 'equipmentValue', label: '设备价值', visible: true, required: false, width: '120px', group: 'finance', sortable: true },
    { key: 'monthlyRent', label: '月租金', visible: true, required: false, width: '100px', group: 'finance', sortable: true },
    { key: 'leaseTerm', label: '租期', visible: false, required: false, width: '80px', group: 'finance' },
    { key: 'gm1', label: 'GM1毛利率', visible: true, required: false, width: '110px', group: 'finance', sortable: true },
    { key: 'pb1', label: '回本周期', visible: true, required: false, width: '100px', group: 'finance', sortable: true },
    { key: 'passStatus', label: '达标', visible: true, required: false, width: '80px', group: 'finance' },
    { key: 'updatedAt', label: '更新时间', visible: true, required: false, width: '120px', group: 'other', sortable: true },
    { key: 'actions', label: '操作', visible: true, required: true, width: '120px', group: 'system' }
];

// 全局状态
let listState = {
    projects: [],
    stats: null,
    currentView: 'card',
    tableFields: [...TABLE_FIELDS],
    filters: {
        region: 'all',
        projectType: 'all',
        search: ''
    },
    pagination: {
        page: 1,
        pageSize: 12,
        total: 0
    }
};

/**
 * 页面初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
    await db.ready;
    // 不再自动创建示例数据，显示真实空状态
    loadFieldSettings();
    await loadData();
    bindEvents();
});

/**
 * 加载字段配置
 */
function loadFieldSettings() {
    const saved = localStorage.getItem('tableFieldSettings');
    if (saved) {
        try {
            const savedFields = JSON.parse(saved);
            listState.tableFields = TABLE_FIELDS.map(field => {
                const savedField = savedFields.find(f => f.key === field.key);
                return savedField ? { ...field, visible: savedField.visible } : field;
            });
        } catch (e) {
            console.error('加载字段配置失败', e);
        }
    }
}

/**
 * 保存字段配置
 */
function saveFieldSettings() {
    localStorage.setItem('tableFieldSettings', JSON.stringify(
        listState.tableFields.map(f => ({ key: f.key, visible: f.visible }))
    ));
}

/**
 * 加载所有数据
 */
async function loadData() {
    await loadProjects();
}

/**
 * 加载项目列表
 */
async function loadProjects() {
    try {
        const projects = await db.getProjects(listState.filters);
        listState.projects = projects;
        listState.pagination.total = projects.length;
        
        renderStats();
        renderCurrentView();
        renderPagination();
        updateProjectCount();
    } catch (error) {
        console.error('加载项目失败:', error);
        showToast('加载失败：' + error.message, 'error');
    }
}

/**
 * 渲染统计卡片 - 按项目类型统计
 */
function renderStats() {
    const container = document.getElementById('heroStats');
    const projects = listState.projects;
    
    if (projects.length === 0) {
        // 显示空状态
        container.innerHTML = `
            <div class="hero-stat-card empty-state">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                    <div class="stat-value">0</div>
                    <div class="stat-label">项目总数</div>
                </div>
            </div>
            <div class="hero-stat-card empty-hint">
                <div class="stat-content">
                    <div class="stat-label">点击"新建项目"开始使用</div>
                </div>
            </div>
        `;
        return;
    }
    
    // 统计各类型项目数量
    const typeStats = {};
    for (const type in PROJECT_TYPES) {
        typeStats[type] = 0;
    }
    
    projects.forEach(p => {
        const type = p.projectType || '设备租赁';
        if (typeStats[type] !== undefined) {
            typeStats[type]++;
        }
    });
    
    // 生成统计卡片 HTML
    let html = `
        <div class="hero-stat-card" onclick="clearTypeFilter()" style="cursor:pointer;">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
                <div class="stat-value">${projects.length}</div>
                <div class="stat-label">项目总数</div>
            </div>
        </div>
    `;
    
    for (const [type, config] of Object.entries(PROJECT_TYPES)) {
        const count = typeStats[type] || 0;
        const isActive = listState.filters.projectType === type;
        html += `
            <div class="hero-stat-card ${isActive ? 'active' : ''}" style="cursor:pointer;" onclick="filterByType('${type}')">
                <div class="stat-icon">${config.icon}</div>
                <div class="stat-content">
                    <div class="stat-value">${count}</div>
                    <div class="stat-label">${type}</div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

/**
 * 按类型筛选
 */
function filterByType(type) {
    if (listState.filters.projectType === type) {
        listState.filters.projectType = 'all';
    } else {
        listState.filters.projectType = type;
    }
    listState.pagination.page = 1;
    loadProjects();
}

/**
 * 清除类型筛选
 */
function clearTypeFilter() {
    listState.filters.projectType = 'all';
    listState.pagination.page = 1;
    loadProjects();
}

/**
 * 切换视图
 */
function switchView(view) {
    listState.currentView = view;
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    const fieldManagerBtn = document.getElementById('fieldManagerBtn');
    if (fieldManagerBtn) {
        fieldManagerBtn.style.display = view === 'table' ? 'flex' : 'none';
    }
    
    renderCurrentView();
}

/**
 * 渲染当前视图
 */
function renderCurrentView() {
    const grid = document.getElementById('projectsGrid');
    const table = document.getElementById('projectsTable');
    const emptyState = document.getElementById('emptyState');
    
    if (listState.projects.length === 0) {
        grid.style.display = 'none';
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    if (listState.currentView === 'card') {
        grid.style.display = 'grid';
        table.style.display = 'none';
        renderProjects();
    } else {
        grid.style.display = 'none';
        table.style.display = 'block';
        renderTableView();
    }
}

/**
 * 渲染项目卡片
 */
function renderProjects() {
    const grid = document.getElementById('projectsGrid');
    const { page, pageSize } = listState.pagination;
    
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageProjects = listState.projects.slice(start, end);
    
    grid.innerHTML = pageProjects.map(project => renderProjectCard(project)).join('');
}

/**
 * 渲染单个项目卡片
 */
function renderProjectCard(project) {
    const flag = REGION_FLAGS[project.region] || '🌍';
    const result = project.latestResult;
    const typeConfig = PROJECT_TYPES[project.projectType] || PROJECT_TYPES['设备租赁'];
    
    const equipment = project.equipment || {};
    const equipmentInfo = `${equipment.type || '设备'} ${equipment.model || ''} × ${equipment.quantity || 1}台`;
    const equipmentValue = formatMoney((equipment.purchasePrice || 0) * (equipment.quantity || 1));
    
    const revenue = project.revenue || {};
    const monthlyRent = formatMoney(revenue.monthlyRent || 0);
    const leaseTerm = revenue.leaseTerm || 12;
    
    let gm1Display = '--', gm1Class = 'none';
    let pb1Display = '--', pb1Class = 'none';
    let totalRevenue = '--';
    
    if (result) {
        if (result.gm1 != null) {
            gm1Display = (result.gm1 * 100).toFixed(1) + '%';
            gm1Class = result.gm1 >= 0.30 ? 'pass' : (result.gm1 >= 0.25 ? 'warn' : 'fail');
        }
        if (result.pb1Months > 0) {
            pb1Display = result.pb1Months + '月';
            pb1Class = result.pb1Months <= 24 ? 'pass' : 'fail';
        } else if (result.pb1Months != null && result.pb1Months <= 0) {
            pb1Display = '未回本';
            pb1Class = 'fail';
        }
        if (result.totalRevenue) {
            totalRevenue = formatMoney(result.totalRevenue);
        }
    }
    
    const updateTime = project.updatedAt ? formatDate(project.updatedAt) : '--';
    
    return `
        <div class="project-card" onclick="openProject('${project.projectId}')" ondblclick="goToProject('${project.projectId}')" title="单击预览，双击编辑">
            <div class="card-header">
                <div class="card-title-area">
                    <div class="card-title" title="${project.name}">${project.name}</div>
                    <div class="card-subtitle">
                        <span>${flag} ${project.city || project.region}</span>
                    </div>
                </div>
                <span class="card-type-badge" style="background: ${typeConfig.color}20; color: ${typeConfig.color}">
                    ${typeConfig.icon} ${project.projectType || '租赁'}
                </span>
            </div>
            
            <div class="card-body">
                <div class="card-info-grid">
                    <div class="info-item">
                        <span class="info-label">设备</span>
                        <span class="info-value">${equipmentInfo}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">设备价值</span>
                        <span class="info-value highlight">${equipmentValue}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">月租金</span>
                        <span class="info-value">${monthlyRent}/月</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">租期</span>
                        <span class="info-value">${leaseTerm}个月</span>
                    </div>
                </div>
                
                <div class="card-kpi">
                    <div class="kpi-badge ${gm1Class}">
                        <span class="kpi-value">${gm1Display}</span>
                        <span class="kpi-label">GM1毛利率</span>
                    </div>
                    <div class="kpi-badge ${pb1Class}">
                        <span class="kpi-value">${pb1Display}</span>
                        <span class="kpi-label">回本周期</span>
                    </div>
                    <div class="kpi-badge none">
                        <span class="kpi-value">${totalRevenue}</span>
                        <span class="kpi-label">预计收入</span>
                    </div>
                </div>
            </div>
            
            <div class="card-footer">
                <span class="card-meta">更新于 ${updateTime}</span>
                <div class="card-actions" onclick="event.stopPropagation()">
                    <button class="card-action-btn" title="测算" onclick="runCalc('${project.projectId}')">📊</button>
                    <button class="card-action-btn" title="复制" onclick="duplicateProject('${project.projectId}')">📋</button>
                    <button class="card-action-btn danger" title="删除" onclick="deleteProject('${project.projectId}')">🗑️</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * 渲染表格视图
 */
function renderTableView() {
    renderTableHead();
    renderTableBody();
    renderPagination();
}

/**
 * 渲染飞书风格表头
 */
function renderTableHead() {
    const thead = document.getElementById('tableHead');
    const visibleFields = listState.tableFields.filter(f => f.visible);
    
    const allSelected = listState.selectedProjects.size > 0 && 
                        listState.selectedProjects.size === getFilteredProjects().length;
    
    thead.innerHTML = `
        <tr>
            ${visibleFields.map(field => {
                if (field.key === 'checkbox') {
                    return `<th class="checkbox-cell" style="width: ${field.width}">
                        <input type="checkbox" class="row-checkbox" 
                               ${allSelected ? 'checked' : ''} 
                               onchange="toggleSelectAll(this)">
                    </th>`;
                }
                
                const isSortable = field.sortable;
                const isCurrentSort = listState.sortField === field.key;
                const sortIcon = isCurrentSort ? 
                    (listState.sortOrder === 'asc' ? '↑' : '↓') : 
                    (isSortable ? '↕' : '');
                
                return `<th style="width: ${field.width}" 
                           class="${isSortable ? 'sortable' : ''} ${isCurrentSort ? 'sorted' : ''}"
                           ${isSortable ? `onclick="sortTable('${field.key}')"` : ''}>
                    <div class="th-content">
                        <span>${field.label}</span>
                        ${sortIcon ? `<span class="sort-icon">${sortIcon}</span>` : ''}
                    </div>
                </th>`;
            }).join('')}
        </tr>
    `;
}

/**
 * 渲染飞书风格表格内容
 */
function renderTableBody() {
    const tbody = document.getElementById('tableBody');
    const { page, pageSize } = listState.pagination;
    const visibleFields = listState.tableFields.filter(f => f.visible);
    
    // 获取筛选后的项目
    const filteredProjects = getFilteredProjects();
    
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageProjects = filteredProjects.slice(start, end);
    
    if (pageProjects.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${visibleFields.length}" class="empty-table">
                    <div class="empty-state">
                        <span class="empty-icon">📋</span>
                        <p>暂无项目数据</p>
                        <button class="btn btn-primary" onclick="createNewProject()">创建项目</button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = pageProjects.map(project => {
        const isSelected = listState.selectedProjects.has(project.projectId);
        const cells = visibleFields.map(field => renderTableCell(project, field.key)).join('');
        return `<tr class="${isSelected ? 'selected' : ''}" 
                   data-project-id="${project.projectId}"
                   onclick="openProject('${project.projectId}')" 
                   ondblclick="goToProject('${project.projectId}')" 
                   title="单击预览，双击编辑">${cells}</tr>`;
    }).join('');
    
    // 更新批量操作栏
    updateBatchActionBar();
}

/**
 * 渲染分页控件
 */
function renderPagination() {
    const filteredProjects = getFilteredProjects();
    const totalItems = filteredProjects.length;
    const { page, pageSize } = listState.pagination;
    const totalPages = Math.ceil(totalItems / pageSize);
    
    const paginationContainer = document.querySelector('.pagination-controls');
    if (!paginationContainer) return;
    
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalItems);
    
    paginationContainer.innerHTML = `
        <div class="pagination-info">
            显示 ${totalItems > 0 ? start : 0}-${end} 项，共 ${totalItems} 项
        </div>
        <div class="pagination-actions">
            <select class="page-size-select" onchange="changePageSize(this.value)">
                <option value="10" ${pageSize === 10 ? 'selected' : ''}>10条/页</option>
                <option value="20" ${pageSize === 20 ? 'selected' : ''}>20条/页</option>
                <option value="50" ${pageSize === 50 ? 'selected' : ''}>50条/页</option>
                <option value="100" ${pageSize === 100 ? 'selected' : ''}>100条/页</option>
            </select>
            <div class="page-buttons">
                <button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="goToPage(1)">«</button>
                <button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="goToPage(${page - 1})">‹</button>
                <span class="page-indicator">${page} / ${totalPages || 1}</span>
                <button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="goToPage(${page + 1})">›</button>
                <button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="goToPage(${totalPages})">»</button>
            </div>
        </div>
    `;
}

/**
 * 跳转到指定页
 */
function goToPage(page) {
    const filteredProjects = getFilteredProjects();
    const totalPages = Math.ceil(filteredProjects.length / listState.pagination.pageSize);
    
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    
    listState.pagination.page = page;
    renderTableBody();
    renderPagination();
}

/**
 * 更新批量操作栏状态
 */
function updateBatchActionBar() {
    const bar = document.getElementById('batchActionBar');
    const countSpan = document.getElementById('selectedCount');
    
    if (listState.selectedProjects.size > 0) {
        bar.classList.add('show');
        countSpan.textContent = listState.selectedProjects.size;
    } else {
        bar.classList.remove('show');
    }
}

/**
 * 渲染单个表格单元格（飞书风格）
 */
function renderTableCell(project, key) {
    const flag = REGION_FLAGS[project.region] || '🌍';
    const equipment = project.equipment || {};
    const revenue = project.revenue || {};
    const result = project.latestResult || {};
    
    // 计算KPI状态
    const getKPIStatus = (value, thresholds) => {
        if (value == null) return 'neutral';
        if (value >= thresholds.pass) return 'pass';
        if (value >= thresholds.warn) return 'warn';
        return 'fail';
    };
    
    switch (key) {
        case 'checkbox':
            const isSelected = listState.selectedProjects.has(project.projectId);
            return `<td class="checkbox-cell" onclick="event.stopPropagation()">
                <input type="checkbox" class="row-checkbox" 
                       ${isSelected ? 'checked' : ''} 
                       onchange="toggleProjectSelection('${project.projectId}', this)">
            </td>`;
            
        case 'status':
            const statusMap = {
                'draft': { label: '草稿', class: 'status-draft' },
                'pending': { label: '待审核', class: 'status-pending' },
                'approved': { label: '已通过', class: 'status-approved' },
                'rejected': { label: '已驳回', class: 'status-rejected' },
                'archived': { label: '已归档', class: 'status-archived' }
            };
            const status = statusMap[project.status] || statusMap['draft'];
            return `<td><span class="status-badge ${status.class}">${status.label}</span></td>`;
            
        case 'passStatus':
            const gm1Val = result.gm1;
            const pb1Val = result.pb1Months;
            let passClass = 'neutral';
            let passLabel = '待测算';
            
            if (gm1Val != null) {
                const gm1Pass = gm1Val >= 0.25;
                const pb1Pass = pb1Val && pb1Val <= 24;
                
                if (gm1Pass && pb1Pass) {
                    passClass = 'pass';
                    passLabel = '达标';
                } else if (gm1Pass || pb1Pass) {
                    passClass = 'warn';
                    passLabel = '部分达标';
                } else {
                    passClass = 'fail';
                    passLabel = '未达标';
                }
            }
            return `<td><span class="kpi-badge ${passClass}">${passLabel}</span></td>`;
        
        case 'name':
            return `<td>
                <div class="project-name-cell">
                    <span class="project-name-text">${project.name}</span>
                    ${project.isTemplate ? '<span class="template-badge">模板</span>' : ''}
                </div>
            </td>`;
            
        case 'region':
            return `<td><span class="region-cell">${flag} ${project.region}</span></td>`;
            
        case 'city':
            return `<td>${project.city || '--'}</td>`;
            
        case 'projectType':
            const typeClass = {
                '设备租赁': 'type-rental',
                '设备出售': 'type-sale',
                '租售结合': 'type-mixed',
                '工程承包': 'type-contract'
            }[project.projectType] || 'type-rental';
            return `<td><span class="project-type-badge ${typeClass}">${project.projectType || '租赁'}</span></td>`;
            
        case 'customer':
            return `<td>
                <div class="customer-cell">
                    <span class="customer-name">${project.customer || '--'}</span>
                </div>
            </td>`;
            
        case 'equipment':
            const equipInfo = `${equipment.type || '设备'} ${equipment.model || ''}`;
            const qty = equipment.quantity || 1;
            return `<td>
                <div class="equipment-cell">
                    <span class="equipment-name">${equipInfo}</span>
                    <span class="equipment-qty">×${qty}</span>
                </div>
            </td>`;
            
        case 'equipmentValue':
            const value = (equipment.purchasePrice || 0) * (equipment.quantity || 1);
            return `<td class="money-cell">${formatCompactMoney(value)}</td>`;
            
        case 'monthlyRent':
            return `<td class="money-cell">${formatCompactMoney(revenue.monthlyRent || 0)}</td>`;
            
        case 'leaseTerm':
            return `<td><span class="term-badge">${revenue.leaseTerm || 12}月</span></td>`;
            
        case 'gm1':
            const gm1 = result.gm1;
            const gm1Status = getKPIStatus(gm1, { pass: 0.25, warn: 0.15 });
            const gm1Display = gm1 != null ? (gm1 * 100).toFixed(1) + '%' : '--';
            return `<td>
                <div class="kpi-cell ${gm1Status}">
                    <span class="kpi-value">${gm1Display}</span>
                    ${gm1 != null ? `<span class="kpi-indicator"></span>` : ''}
                </div>
            </td>`;
            
        case 'pb1':
            const pb1 = result.pb1Months;
            const pb1Status = pb1 != null ? (pb1 <= 24 ? 'pass' : (pb1 <= 36 ? 'warn' : 'fail')) : 'neutral';
            const pb1Display = pb1 > 0 ? pb1 + '月' : '--';
            return `<td>
                <div class="kpi-cell ${pb1Status}">
                    <span class="kpi-value">${pb1Display}</span>
                    ${pb1 != null ? `<span class="kpi-indicator"></span>` : ''}
                </div>
            </td>`;
            
        case 'updatedAt':
            return `<td class="date-cell">${formatRelativeDate(project.updatedAt)}</td>`;
            
        case 'actions':
            return `
                <td class="actions-cell" onclick="event.stopPropagation()">
                    <div class="row-actions">
                        <button class="row-action-btn" title="测算" onclick="runCalc('${project.projectId}')">
                            <span>📊</span>
                        </button>
                        <button class="row-action-btn" title="复制" onclick="duplicateProject('${project.projectId}')">
                            <span>📋</span>
                        </button>
                        <button class="row-action-btn more" title="更多" onclick="showRowMenu(event, '${project.projectId}')">
                            <span>⋯</span>
                        </button>
                    </div>
                </td>
            `;
        default:
            return '<td>--</td>';
    }
}

/**
 * 格式化紧凑金额显示
 */
function formatCompactMoney(value) {
    if (value >= 100000000) {
        return '¥' + (value / 100000000).toFixed(2) + '亿';
    } else if (value >= 10000) {
        return '¥' + (value / 10000).toFixed(1) + '万';
    } else {
        return '¥' + value.toLocaleString();
    }
}

/**
 * 格式化相对日期
 */
function formatRelativeDate(dateStr) {
    if (!dateStr) return '--';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
            const mins = Math.floor(diff / (1000 * 60));
            return mins <= 1 ? '刚刚' : `${mins}分钟前`;
        }
        return `${hours}小时前`;
    } else if (days === 1) {
        return '昨天';
    } else if (days < 7) {
        return `${days}天前`;
    } else if (days < 30) {
        return `${Math.floor(days / 7)}周前`;
    } else {
        return formatDate(dateStr);
    }
}

/**
 * 显示行操作菜单
 */
function showRowMenu(event, projectId) {
    event.stopPropagation();
    
    // 移除已存在的菜单
    const existingMenu = document.querySelector('.row-menu');
    if (existingMenu) existingMenu.remove();
    
    const menu = document.createElement('div');
    menu.className = 'row-menu';
    menu.innerHTML = `
        <div class="row-menu-item" onclick="goToProject('${projectId}')">
            <span>✏️</span> 编辑项目
        </div>
        <div class="row-menu-item" onclick="duplicateProject('${projectId}')">
            <span>📋</span> 复制项目
        </div>
        <div class="row-menu-item" onclick="exportSingleProject('${projectId}')">
            <span>📤</span> 导出数据
        </div>
        <div class="row-menu-divider"></div>
        <div class="row-menu-item" onclick="archiveProject('${projectId}')">
            <span>📦</span> 归档项目
        </div>
        <div class="row-menu-item danger" onclick="deleteProject('${projectId}')">
            <span>🗑️</span> 删除项目
        </div>
    `;
    
    document.body.appendChild(menu);
    
    // 定位菜单
    const rect = event.target.getBoundingClientRect();
    menu.style.top = rect.bottom + 'px';
    menu.style.left = (rect.left - menu.offsetWidth + rect.width) + 'px';
    
    // 点击外部关闭菜单
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 0);
}

/**
 * 导出单个项目
 */
function exportSingleProject(projectId) {
    const project = listState.projects.find(p => p.projectId === projectId);
    if (!project) return;
    
    const data = JSON.stringify(project, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}_${formatDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 归档项目
 */
async function archiveProject(projectId) {
    if (!confirm('确定要归档此项目吗？')) return;
    
    try {
        const project = listState.projects.find(p => p.projectId === projectId);
        if (project) {
            project.status = 'archived';
            project.updatedAt = new Date().toISOString();
            await window.projectDB.saveProject(project);
            await loadProjects();
            showToast('项目已归档');
        }
    } catch (error) {
        console.error('归档失败:', error);
        showToast('归档失败', 'error');
    }
}

/**
 * 打开字段管理弹窗
 */
function openFieldManager() {
    const fieldList = document.getElementById('fieldList');
    
    fieldList.innerHTML = listState.tableFields.map((field, index) => `
        <div class="field-item" data-index="${index}">
            <span class="drag-handle">⋮⋮</span>
            <input type="checkbox" 
                   id="field_${field.key}" 
                   ${field.visible ? 'checked' : ''} 
                   ${field.required ? 'disabled' : ''}
                   onchange="toggleField('${field.key}')">
            <label class="field-name" for="field_${field.key}">${field.label}</label>
            ${field.required ? '<span class="field-required">必选</span>' : ''}
        </div>
    `).join('');
    
    document.getElementById('fieldManagerModal').classList.add('show');
}

/**
 * 切换字段显示
 */
function toggleField(key) {
    const field = listState.tableFields.find(f => f.key === key);
    if (field && !field.required) {
        field.visible = !field.visible;
    }
}

/**
 * 应用字段设置
 */
function applyFields() {
    saveFieldSettings();
    closeModal('fieldManagerModal');
    renderTableView();
    showToast('字段设置已保存', 'success');
}

/**
 * 重置字段设置
 */
function resetFields() {
    listState.tableFields = [...TABLE_FIELDS];
    saveFieldSettings();
    openFieldManager();
    showToast('已恢复默认设置', 'info');
}

/**
 * 格式化金额
 */
function formatMoney(value) {
    if (!value || isNaN(value)) return '--';
    if (value >= 10000) {
        return (value / 10000).toFixed(1) + '万';
    }
    return value.toLocaleString('zh-CN');
}

/**
 * 格式化日期
 */
function formatDate(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
    
    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 渲染分页
 */
function renderPagination() {
    const { page, pageSize, total } = listState.pagination;
    const totalPages = Math.ceil(total / pageSize);
    
    document.getElementById('paginationInfo').textContent = 
        `共 ${total} 个项目，第 ${page}/${totalPages || 1} 页`;
    
    const controls = document.getElementById('paginationControls');
    
    if (totalPages <= 1) {
        controls.innerHTML = '';
        return;
    }
    
    let html = `<button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="goToPage(${page - 1})">‹</button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
            html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === page - 2 || i === page + 2) {
            html += `<span style="padding:0 8px;color:#9ca3af;">...</span>`;
        }
    }
    
    html += `<button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="goToPage(${page + 1})">›</button>`;
    
    controls.innerHTML = html;
}

/**
 * 翻页
 */
function goToPage(page) {
    listState.pagination.page = page;
    renderCurrentView();
    renderPagination();
    window.scrollTo({ top: 300, behavior: 'smooth' });
}

/**
 * 更新项目计数
 */
function updateProjectCount() {
    document.getElementById('projectCount').textContent = listState.projects.length;
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 搜索
    const searchInput = document.getElementById('searchInput');
    let searchTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            listState.filters.search = searchInput.value.trim();
            listState.pagination.page = 1;
            loadProjects();
        }, 300);
    });
    
    // 区域筛选
    document.getElementById('filterRegion').addEventListener('change', (e) => {
        listState.filters.region = e.target.value;
        listState.pagination.page = 1;
        loadProjects();
    });
}

/**
 * 刷新数据
 */
async function refreshData() {
    showToast('正在刷新...', 'info');
    await loadData();
    showToast('数据已刷新', 'success');
}

/**
 * 重置所有数据
 */
async function resetAllData() {
    if (!confirm('确定要重置所有数据吗？这将清除所有项目并重新生成示例数据。')) {
        return;
    }
    
    try {
        await db.resetDatabase();
        await loadData();
        showToast('数据已重置', 'success');
    } catch (error) {
        showToast('重置失败：' + error.message, 'error');
    }
}

/**
 * 打开项目详情
 */
function openProject(projectId) {
    openProjectDetail(projectId);
}

/**
 * 打开项目详情弹窗
 */
async function openProjectDetail(projectId) {
    try {
        const project = await db.getProject(projectId);
        if (!project) {
            showToast('项目不存在', 'error');
            return;
        }
        
        // 保存当前查看的项目ID
        listState.currentDetailId = projectId;
        
        // 填充弹窗数据
        populateProjectDetail(project);
        
        // 显示弹窗
        openModal('projectDetailModal');
        
    } catch (error) {
        showToast('加载项目失败: ' + error.message, 'error');
    }
}

/**
 * 填充项目详情
 */
function populateProjectDetail(project) {
    const result = project.latestResult;
    const equipment = project.equipment || {};
    const revenue = project.revenue || {};
    
    // 基本信息
    document.getElementById('detailProjectName').textContent = project.name || '未命名项目';
    document.getElementById('detailId').textContent = project.projectId;
    document.getElementById('detailRegion').textContent = `${project.region || '--'} / ${project.city || '--'}`;
    document.getElementById('detailCreated').textContent = project.createdAt ? formatDate(project.createdAt) : '--';
    document.getElementById('detailUpdated').textContent = project.updatedAt ? formatDate(project.updatedAt) : '--';
    
    // 设备信息
    document.getElementById('detailEquipType').textContent = equipment.type || '--';
    document.getElementById('detailEquipModel').textContent = equipment.model || '--';
    document.getElementById('detailQuantity').textContent = (equipment.quantity || 1) + ' 台';
    document.getElementById('detailUnitPrice').textContent = formatMoney(equipment.purchasePrice || 0);
    document.getElementById('detailTotalValue').textContent = formatMoney((equipment.purchasePrice || 0) * (equipment.quantity || 1));
    
    // 收入配置
    const monthlyRent = revenue.monthlyRent || result?.monthlyRent || 0;
    const leaseTerm = revenue.leaseTerm || result?.leaseTerm || 12;
    document.getElementById('detailMonthlyRent').textContent = formatMoney(monthlyRent) + '/月';
    document.getElementById('detailLeaseTerm').textContent = leaseTerm + ' 个月';
    document.getElementById('detailTotalRent').textContent = formatMoney(monthlyRent * leaseTerm);
    
    // 测算结果
    if (result) {
        const gm1 = result.gm1 != null ? (result.gm1 * 100).toFixed(1) + '%' : '--';
        const gm2 = result.gm2 != null ? (result.gm2 * 100).toFixed(1) + '%' : '--';
        const pb1 = result.pb1Months > 0 ? result.pb1Months + ' 月' : (result.pb1Months === 0 ? '未回本' : '--');
        const pb2 = result.pb2Months > 0 ? result.pb2Months + ' 月' : (result.pb2Months === 0 ? '未回本' : '--');
        
        document.getElementById('detailGM1').textContent = gm1;
        document.getElementById('detailGM2').textContent = gm2;
        document.getElementById('detailPB1').textContent = pb1;
        document.getElementById('detailPB2').textContent = pb2;
        
        document.getElementById('detailTotalRevenue').textContent = formatMoney(result.totalRevenue || 0);
        document.getElementById('detailTotalCost').textContent = formatMoney(result.totalCost || 0);
        document.getElementById('detailNetCashflow').textContent = formatMoney(result.netCashflow || 0);
        
        // 设置颜色
        const gm1El = document.getElementById('detailGM1');
        gm1El.className = 'kpi-value ' + (result.gm1 >= 0.3 ? 'pass' : result.gm1 >= 0.25 ? 'warn' : 'fail');
        
        const pb1El = document.getElementById('detailPB1');
        pb1El.className = 'kpi-value ' + (result.pb1Months > 0 && result.pb1Months <= 24 ? 'pass' : 'fail');
    } else {
        ['detailGM1', 'detailGM2', 'detailPB1', 'detailPB2', 'detailTotalRevenue', 'detailTotalCost', 'detailNetCashflow']
            .forEach(id => document.getElementById(id).textContent = '--');
    }
}

/**
 * 编辑当前详情弹窗中的项目
 */
function editCurrentProject() {
    if (listState.currentDetailId) {
        window.location.href = `project.html?id=${listState.currentDetailId}`;
    }
}

/**
 * 复制当前详情弹窗中的项目
 */
async function duplicateCurrentProject() {
    if (listState.currentDetailId) {
        await duplicateProject(listState.currentDetailId);
        closeModal('projectDetailModal');
    }
}

/**
 * 直接跳转编辑（双击或快速操作）
 */
function goToProject(projectId) {
    window.location.href = `project.html?id=${projectId}`;
}

/**
 * 运行测算
 */
async function runCalc(projectId) {
    showToast('正在打开测算...', 'info');
    window.location.href = `project.html?id=${projectId}&calc=true`;
}

/**
 * 复制项目
 */
async function duplicateProject(projectId) {
    try {
        await db.duplicateProject(projectId);
        await loadData();
        showToast('项目已复制', 'success');
    } catch (error) {
        showToast('复制失败：' + error.message, 'error');
    }
}

/**
 * 删除项目
 */
async function deleteProject(projectId) {
    if (!confirm('确定要删除这个项目吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        await db.deleteProject(projectId);
        await loadData();
        showToast('项目已删除', 'success');
    } catch (error) {
        showToast('删除失败：' + error.message, 'error');
    }
}

/**
 * 打开新建弹窗
 */
function openCreateModal() {
    document.getElementById('createModal').classList.add('show');
}

/**
 * 打开弹窗
 */
function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

/**
 * 关闭弹窗
 */
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

/**
 * 更新城市选项
 */
function updateCityOptions() {
    const region = document.getElementById('projectRegion').value;
    const citySelect = document.getElementById('projectCity');
    const cities = CITY_OPTIONS[region] || [];
    
    citySelect.innerHTML = cities.map(city => 
        `<option value="${city}">${city}</option>`
    ).join('');
}

/**
 * 创建项目
 */
async function createProject() {
    const name = document.getElementById('projectName').value.trim();
    const region = document.getElementById('projectRegion').value;
    const city = document.getElementById('projectCity').value;
    const projectType = document.getElementById('projectType').value;
    const customer = document.getElementById('projectCustomer').value.trim();
    const equipmentType = document.getElementById('equipmentType').value;
    const equipmentModel = document.getElementById('equipmentModel').value.trim();
    const equipmentQty = parseInt(document.getElementById('equipmentQty').value) || 1;
    const equipmentPrice = (parseFloat(document.getElementById('equipmentPrice').value) || 80) * 10000;
    
    if (!name) {
        showToast('请输入项目名称', 'error');
        return;
    }
    
    try {
        await db.createProject({
            name,
            region,
            city,
            projectType,
            customer,
            equipment: {
                type: equipmentType,
                model: equipmentModel || equipmentType,
                quantity: equipmentQty,
                purchasePrice: equipmentPrice,
                economicLife: 10,
                residualValueRate: 0.05
            }
        });
        
        closeModal('createModal');
        await loadData();
        showToast('项目创建成功', 'success');
        
        // 清空表单
        document.getElementById('projectName').value = '';
        document.getElementById('projectCustomer').value = '';
        document.getElementById('equipmentModel').value = '';
        document.getElementById('equipmentQty').value = '1';
        document.getElementById('equipmentPrice').value = '80';
        
    } catch (error) {
        showToast('创建失败：' + error.message, 'error');
    }
}

/**
 * 创建并编辑
 */
async function createAndEdit() {
    const name = document.getElementById('projectName').value.trim();
    
    if (!name) {
        showToast('请输入项目名称', 'error');
        return;
    }
    
    const region = document.getElementById('projectRegion').value;
    const city = document.getElementById('projectCity').value;
    const projectType = document.getElementById('projectType').value;
    const customer = document.getElementById('projectCustomer').value.trim();
    const equipmentType = document.getElementById('equipmentType').value;
    const equipmentModel = document.getElementById('equipmentModel').value.trim();
    const equipmentQty = parseInt(document.getElementById('equipmentQty').value) || 1;
    const equipmentPrice = (parseFloat(document.getElementById('equipmentPrice').value) || 80) * 10000;
    
    try {
        const project = await db.createProject({
            name,
            region,
            city,
            projectType,
            customer,
            equipment: {
                type: equipmentType,
                model: equipmentModel || equipmentType,
                quantity: equipmentQty,
                purchasePrice: equipmentPrice,
                economicLife: 10,
                residualValueRate: 0.05
            }
        });
        
        closeModal('createModal');
        window.location.href = `project.html?id=${project.projectId}`;
        
    } catch (error) {
        showToast('创建失败：' + error.message, 'error');
    }
}

/**
 * 显示 Toast 提示
 */
function showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container');
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-content">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== 飞书风格增强功能 ====================

/**
 * 全局状态扩展
 */
listState.selectedProjects = new Set();
listState.advancedFilters = {
    status: 'all',
    type: 'all',
    gm1: 'all',
    pb1: 'all',
    dateRange: 'all',
    value: 'all'
};
listState.quickFilter = 'all';
listState.sortField = 'updatedAt';
listState.sortOrder = 'desc';
listState.columnConfig = null;

/**
 * 渲染快速统计区
 */
function renderStatsRow() {
    const container = document.getElementById('statsRow');
    if (!container) return;
    
    const projects = listState.projects;
    
    // 计算各项统计
    let totalValue = 0;
    let totalMonthlyRent = 0;
    let passCount = 0;
    let riskCount = 0;
    
    projects.forEach(p => {
        const equipment = p.equipment || {};
        const result = p.latestResult || {};
        
        totalValue += (equipment.purchasePrice || 0) * (equipment.quantity || 1);
        totalMonthlyRent += (p.revenue?.monthlyRent || result.monthlyRent || 0) * (equipment.quantity || 1);
        
        const gm1 = result.gm1 || 0;
        const pb1 = result.pb1Months || 999;
        
        if (gm1 >= 0.3 && pb1 <= 24) passCount++;
        if (gm1 < 0.2 || pb1 > 36) riskCount++;
    });
    
    container.innerHTML = `
        <div class="stat-card-mini" onclick="quickFilter('all')">
            <div class="stat-icon blue">📊</div>
            <div class="stat-content">
                <div class="stat-value">${projects.length}</div>
                <div class="stat-label">项目总数</div>
            </div>
        </div>
        <div class="stat-card-mini" onclick="quickFilter('pass')">
            <div class="stat-icon green">✅</div>
            <div class="stat-content">
                <div class="stat-value">${passCount}</div>
                <div class="stat-label">达标项目</div>
            </div>
            <span class="stat-trend up">${projects.length ? Math.round(passCount/projects.length*100) : 0}%</span>
        </div>
        <div class="stat-card-mini" onclick="quickFilter('risk')">
            <div class="stat-icon red">⚠️</div>
            <div class="stat-content">
                <div class="stat-value">${riskCount}</div>
                <div class="stat-label">风险项目</div>
            </div>
        </div>
        <div class="stat-card-mini">
            <div class="stat-icon yellow">💰</div>
            <div class="stat-content">
                <div class="stat-value">${formatCompactNumber(totalValue)}</div>
                <div class="stat-label">设备总价值</div>
            </div>
        </div>
        <div class="stat-card-mini">
            <div class="stat-icon purple">📈</div>
            <div class="stat-content">
                <div class="stat-value">${formatCompactNumber(totalMonthlyRent)}/月</div>
                <div class="stat-label">租金收入</div>
            </div>
        </div>
    `;
}

/**
 * 格式化紧凑数字
 */
function formatCompactNumber(num) {
    if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
    if (num >= 10000) return (num / 10000).toFixed(1) + '万';
    return num.toLocaleString('zh-CN');
}

/**
 * 更新快速筛选计数
 */
function updateQuickFilterCounts() {
    const projects = listState.projects;
    
    let counts = {
        all: projects.length,
        '跟进中': 0,
        '执行中': 0,
        pass: 0,
        risk: 0
    };
    
    projects.forEach(p => {
        const status = p.status || '跟进中';
        const result = p.latestResult || {};
        const gm1 = result.gm1 || 0;
        const pb1 = result.pb1Months || 999;
        
        if (counts[status] !== undefined) counts[status]++;
        if (gm1 >= 0.3 && pb1 <= 24) counts.pass++;
        if (gm1 < 0.2 || pb1 > 36) counts.risk++;
    });
    
    // 更新DOM
    for (const [key, count] of Object.entries(counts)) {
        const el = document.getElementById(`count${key}`) || document.getElementById(`count${key.replace('中', '中')}`);
        if (el) el.textContent = count;
    }
    
    document.getElementById('countAll').textContent = counts.all;
}

/**
 * 快速筛选
 */
function quickFilter(filter) {
    listState.quickFilter = filter;
    listState.pagination.page = 1;
    
    // 更新按钮状态
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    renderCurrentView();
}

/**
 * 获取筛选后的项目
 */
function getFilteredProjects() {
    let projects = [...listState.projects];
    const filter = listState.quickFilter;
    const advanced = listState.advancedFilters;
    
    // 快速筛选
    if (filter !== 'all') {
        projects = projects.filter(p => {
            const result = p.latestResult || {};
            const gm1 = result.gm1 || 0;
            const pb1 = result.pb1Months || 999;
            const status = p.status || '跟进中';
            
            if (filter === 'pass') return gm1 >= 0.3 && pb1 <= 24;
            if (filter === 'risk') return gm1 < 0.2 || pb1 > 36;
            return status === filter;
        });
    }
    
    // 高级筛选 - 状态
    if (advanced.status !== 'all') {
        projects = projects.filter(p => (p.status || '跟进中') === advanced.status);
    }
    
    // 高级筛选 - 类型
    if (advanced.type !== 'all') {
        projects = projects.filter(p => (p.projectType || '设备租赁') === advanced.type);
    }
    
    // 高级筛选 - GM1
    if (advanced.gm1 !== 'all') {
        projects = projects.filter(p => {
            const gm1 = p.latestResult?.gm1 || 0;
            if (advanced.gm1 === 'pass') return gm1 >= 0.3;
            if (advanced.gm1 === 'warning') return gm1 >= 0.2 && gm1 < 0.3;
            if (advanced.gm1 === 'fail') return gm1 < 0.2;
            return true;
        });
    }
    
    // 高级筛选 - PB1
    if (advanced.pb1 !== 'all') {
        projects = projects.filter(p => {
            const pb1 = p.latestResult?.pb1Months || 999;
            if (advanced.pb1 === 'pass') return pb1 <= 24;
            if (advanced.pb1 === 'warning') return pb1 > 24 && pb1 <= 36;
            if (advanced.pb1 === 'fail') return pb1 > 36;
            return true;
        });
    }
    
    // 高级筛选 - 设备价值
    if (advanced.value !== 'all') {
        projects = projects.filter(p => {
            const value = (p.equipment?.purchasePrice || 0) * (p.equipment?.quantity || 1);
            if (advanced.value === 'small') return value < 1000000;
            if (advanced.value === 'medium') return value >= 1000000 && value <= 5000000;
            if (advanced.value === 'large') return value > 5000000;
            return true;
        });
    }
    
    // 排序
    projects.sort((a, b) => {
        let aVal, bVal;
        switch (listState.sortField) {
            case 'name':
                aVal = a.name || '';
                bVal = b.name || '';
                break;
            case 'gm1':
                aVal = a.latestResult?.gm1 || 0;
                bVal = b.latestResult?.gm1 || 0;
                break;
            case 'pb1':
                aVal = a.latestResult?.pb1Months || 999;
                bVal = b.latestResult?.pb1Months || 999;
                break;
            case 'value':
                aVal = (a.equipment?.purchasePrice || 0) * (a.equipment?.quantity || 1);
                bVal = (b.equipment?.purchasePrice || 0) * (b.equipment?.quantity || 1);
                break;
            case 'updatedAt':
            default:
                aVal = new Date(a.updatedAt || 0);
                bVal = new Date(b.updatedAt || 0);
        }
        
        if (listState.sortOrder === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    return projects;
}

/**
 * 切换高级筛选面板
 */
function toggleAdvancedFilter() {
    const panel = document.getElementById('advancedFilterPanel');
    panel.classList.toggle('show');
}

/**
 * 应用高级筛选
 */
function applyAdvancedFilter() {
    listState.advancedFilters = {
        status: document.getElementById('filterStatus').value,
        type: document.getElementById('filterType').value,
        gm1: document.getElementById('filterGM1').value,
        pb1: document.getElementById('filterPB1').value,
        dateRange: document.getElementById('filterDateRange').value,
        value: document.getElementById('filterValue').value
    };
    
    listState.pagination.page = 1;
    renderCurrentView();
    renderActiveFilters();
    toggleAdvancedFilter();
}

/**
 * 清除所有筛选
 */
function clearAllFilters() {
    listState.advancedFilters = {
        status: 'all',
        type: 'all',
        gm1: 'all',
        pb1: 'all',
        dateRange: 'all',
        value: 'all'
    };
    listState.quickFilter = 'all';
    
    // 重置表单
    document.getElementById('filterStatus').value = 'all';
    document.getElementById('filterType').value = 'all';
    document.getElementById('filterGM1').value = 'all';
    document.getElementById('filterPB1').value = 'all';
    document.getElementById('filterDateRange').value = 'all';
    document.getElementById('filterValue').value = 'all';
    
    // 重置快速筛选按钮
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'all');
    });
    
    listState.pagination.page = 1;
    renderCurrentView();
    renderActiveFilters();
}

/**
 * 渲染活跃筛选标签
 */
function renderActiveFilters() {
    const container = document.getElementById('activeFilters');
    if (!container) return;
    
    const filters = listState.advancedFilters;
    const labels = {
        status: '状态',
        type: '类型',
        gm1: 'GM1',
        pb1: '回本',
        dateRange: '时间',
        value: '价值'
    };
    
    let html = '';
    for (const [key, value] of Object.entries(filters)) {
        if (value !== 'all') {
            html += `
                <span class="filter-tag">
                    ${labels[key]}: ${value}
                    <span class="remove-filter" onclick="removeFilter('${key}')">×</span>
                </span>
            `;
        }
    }
    
    container.innerHTML = html;
}

/**
 * 移除单个筛选
 */
function removeFilter(key) {
    listState.advancedFilters[key] = 'all';
    const filterEl = document.getElementById(`filter${key.charAt(0).toUpperCase() + key.slice(1)}`);
    if (filterEl) filterEl.value = 'all';
    renderCurrentView();
    renderActiveFilters();
}

/**
 * 打开列配置面板
 */
function openColumnConfig() {
    document.getElementById('columnConfigOverlay').classList.add('show');
    document.getElementById('columnConfigPanel').classList.add('show');
    renderColumnConfig();
}

/**
 * 关闭列配置面板
 */
function closeColumnConfig() {
    document.getElementById('columnConfigOverlay').classList.remove('show');
    document.getElementById('columnConfigPanel').classList.remove('show');
}

/**
 * 渲染列配置
 */
function renderColumnConfig() {
    const basicFields = ['name', 'region', 'city', 'status', 'projectType', 'customer'];
    const financeFields = ['equipmentValue', 'monthlyRent', 'leaseTerm', 'gm1', 'pb1', 'netCashflow'];
    const otherFields = ['equipment', 'createdAt', 'updatedAt'];
    
    const renderGroup = (container, fields) => {
        const el = document.getElementById(container);
        if (!el) return;
        
        el.innerHTML = fields.map(key => {
            const field = listState.tableFields.find(f => f.key === key) || { key, label: key, visible: false };
            return `
                <div class="column-item" draggable="true" data-key="${key}">
                    <span class="drag-handle">⋮⋮</span>
                    <span class="column-name">${field.label || key}</span>
                    <div class="column-toggle ${field.visible ? 'active' : ''}" onclick="toggleColumn('${key}')"></div>
                </div>
            `;
        }).join('');
    };
    
    renderGroup('columnListBasic', basicFields);
    renderGroup('columnListFinance', financeFields);
    renderGroup('columnListOther', otherFields);
}

/**
 * 切换列显示
 */
function toggleColumn(key) {
    const field = listState.tableFields.find(f => f.key === key);
    if (field && !field.required) {
        field.visible = !field.visible;
        renderColumnConfig();
    }
}

/**
 * 保存列配置
 */
function saveColumnConfig() {
    saveFieldSettings();
    closeColumnConfig();
    if (listState.currentView === 'table') {
        renderTableView();
    }
    showToast('列配置已保存', 'success');
}

/**
 * 重置列配置
 */
function resetColumnConfig() {
    listState.tableFields = [...TABLE_FIELDS];
    renderColumnConfig();
}

/**
 * 项目选择
 */
function toggleProjectSelection(projectId, checkbox) {
    if (checkbox.checked) {
        listState.selectedProjects.add(projectId);
    } else {
        listState.selectedProjects.delete(projectId);
    }
    updateBatchActionBar();
}

/**
 * 全选/取消全选
 */
function toggleSelectAll(checkbox) {
    const projects = getFilteredProjects();
    if (checkbox.checked) {
        projects.forEach(p => listState.selectedProjects.add(p.projectId));
    } else {
        listState.selectedProjects.clear();
    }
    
    // 更新所有行的复选框
    document.querySelectorAll('.table-checkbox[data-project-id]').forEach(cb => {
        cb.checked = checkbox.checked;
    });
    
    updateBatchActionBar();
}

/**
 * 更新批量操作栏
 */
function updateBatchActionBar() {
    const bar = document.getElementById('batchActionBar');
    const count = listState.selectedProjects.size;
    
    document.getElementById('selectedCount').textContent = count;
    
    if (count > 0) {
        bar.classList.add('show');
    } else {
        bar.classList.remove('show');
    }
}

/**
 * 清除选择
 */
function clearSelection() {
    listState.selectedProjects.clear();
    document.querySelectorAll('.table-checkbox').forEach(cb => cb.checked = false);
    updateBatchActionBar();
}

/**
 * 批量更新状态
 */
function batchUpdateStatus() {
    const count = listState.selectedProjects.size;
    const status = prompt(`请输入新状态（跟进中/投标中/签约/执行中/已完成/已终止）：`);
    if (status) {
        showToast(`已将 ${count} 个项目状态更新为"${status}"`, 'success');
        clearSelection();
        loadProjects();
    }
}

/**
 * 批量导出
 */
function batchExport() {
    const count = listState.selectedProjects.size;
    showToast(`正在导出 ${count} 个项目...`, 'info');
    // TODO: 实现批量导出
}

/**
 * 批量测算
 */
function batchCalc() {
    const count = listState.selectedProjects.size;
    showToast(`正在对 ${count} 个项目进行批量测算...`, 'info');
    // TODO: 实现批量测算
}

/**
 * 批量归档
 */
function batchArchive() {
    const count = listState.selectedProjects.size;
    if (confirm(`确定要归档选中的 ${count} 个项目吗？`)) {
        showToast(`已归档 ${count} 个项目`, 'success');
        clearSelection();
        loadProjects();
    }
}

/**
 * 导出项目列表
 */
function exportProjects() {
    const projects = getFilteredProjects();
    
    // 构建CSV
    const headers = ['项目ID', '项目名称', '区域', '城市', '类型', '客户', '设备', '设备价值', '月租金', 'GM1', 'PB1', '状态', '更新时间'];
    const rows = projects.map(p => {
        const equipment = p.equipment || {};
        const result = p.latestResult || {};
        return [
            p.projectId,
            p.name,
            p.region,
            p.city,
            p.projectType,
            p.customer,
            `${equipment.type || ''} ${equipment.model || ''} × ${equipment.quantity || 1}`,
            (equipment.purchasePrice || 0) * (equipment.quantity || 1),
            result.monthlyRent || 0,
            result.gm1 ? (result.gm1 * 100).toFixed(1) + '%' : '--',
            result.pb1Months ? result.pb1Months.toFixed(1) + '月' : '--',
            p.status || '跟进中',
            p.updatedAt || ''
        ].join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `项目列表_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
    showToast('项目列表已导出', 'success');
}

/**
 * 表格排序
 */
function sortTable(field) {
    if (listState.sortField === field) {
        listState.sortOrder = listState.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        listState.sortField = field;
        listState.sortOrder = 'desc';
    }
    renderTableView();
}

/**
 * 改变每页条数
 */
function changePageSize(size) {
    listState.pagination.pageSize = parseInt(size);
    listState.pagination.page = 1;
    renderCurrentView();
}

// 覆盖原有的渲染方法以支持新功能
function renderCurrentView() {
    const grid = document.getElementById('projectsGrid');
    const table = document.getElementById('projectsTable');
    const emptyState = document.getElementById('emptyState');
    const pagination = document.getElementById('pagination');
    
    // 先更新统计
    renderStatsRow();
    updateQuickFilterCounts();
    
    // 空状态处理
    if (listState.projects.length === 0) {
        if (grid) grid.style.display = 'none';
        if (table) table.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        if (pagination) pagination.style.display = 'none';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    // 原有渲染逻辑
    if (listState.currentView === 'card') {
        renderProjects();
        if (grid) grid.style.display = 'grid';
        if (table) table.style.display = 'none';
        if (pagination) pagination.style.display = 'flex';
    } else {
        renderTableView();
        if (grid) grid.style.display = 'none';
        if (table) table.style.display = 'block';
        if (pagination) pagination.style.display = 'none';
    }
}
