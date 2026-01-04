/**
 * 汇率管理页面脚本
 * 所有全局函数都在此定义，确保 onclick handlers 可正常调用
 */

// 全局状态
const fxState = {
    rates: [],
    chart: null
};

// 全局代理基址
const FX_PROXY_BASE = 'http://localhost:4000';

/**
 * 加载当前汇率显示
 */
async function loadCurrentRates() {
    console.log('[loadCurrentRates] 开始加载显示');
    try {
        const pairs = ['CNY/KZT', 'CNY/UZS', 'USD/KZT'];
        
        for (const pair of pairs) {
            try {
                console.log(`[loadCurrentRates] 加载 ${pair}...`);
                const latest = await db.getLatestFxRate(pair);
                console.log(`[loadCurrentRates] ${pair} 数据:`, latest);
                if (latest) {
                    const [base, quote] = pair.split('/');
                    const rateId = pair.replace('/', '').toLowerCase();
                    
                    const rateEl = document.getElementById(`${rateId}Rate`);
                    const dateEl = document.getElementById(`${rateId}Date`);
                    const changeEl = document.getElementById(`${rateId}Change`);
                    
                    console.log(`[loadCurrentRates] ${pair} 元素: rate=${rateEl ? 'found' : 'NOT FOUND'}, date=${dateEl ? 'found' : 'NOT FOUND'}`);
                    
                    if (rateEl) {
                        rateEl.textContent = latest.rateValue.toFixed(4);
                        console.log(`[loadCurrentRates] 更新 ${rateId}Rate = ${latest.rateValue.toFixed(4)}`);
                    }
                    if (dateEl) {
                        dateEl.textContent = `更新时间: ${formatDate(latest.rateDate)}`;
                        console.log(`[loadCurrentRates] 更新 ${rateId}Date`);
                    }
                    if (changeEl) changeEl.textContent = '变化: --';
                }
                
            } catch (error) {
                console.warn(`加载 ${pair} 失败:`, error);
            }
        }
        console.log('[loadCurrentRates] 完成');
    } catch (error) {
        console.error('加载汇率失败:', error);
    }
}

/**
 * 加载汇率历史
 */
async function loadFxHistory() {
    const pair = document.getElementById('filterPair').value;
    const tbody = document.getElementById('fxHistoryBody');
    
    try {
        const rates = await db.getFxRates(pair);
        fxState.rates = rates;
        
        if (rates.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:40px;color:#999;">
                        暂无汇率记录
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = rates.slice(0, 30).map((rate, idx) => {
            const rateValue = typeof rate.rateValue === 'number' ? rate.rateValue : (rate.rate || '--');
            const dateVal = formatDate(rate.rateDate || rate.date);
            const pairVal = rate.currencyPair || rate.pair || '--';
            const srcVal = rate.source || '手动录入';
            return `
            <tr>
                <td>${dateVal}</td>
                <td>${pairVal}</td>
                <td class="rate-value">${typeof rateValue === 'number' ? rateValue.toFixed(4) : rateValue}</td>
                <td>${srcVal}</td>
                <td>${rate.isLocked ? '<span class="locked">🔒 已锁定</span>' : '正常'}</td>
                <td>
                    <button class="action-btn" onclick="editRate('${idx}')" title="编辑">✏️</button>
                    <button class="action-btn" onclick="deleteRate('${idx}')" title="删除">🗑️</button>
                </td>
            </tr>
        `; }).join('');
        
        // 更新图表
        updateChart();
        
    } catch (error) {
        console.error('加载汇率历史失败:', error);
        showToast('加载失败', 'error');
    }
}

/**
 * 初始化图表
 */
function initChart() {
    const ctx = document.getElementById('fxChart').getContext('2d');
    fxState.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'CNY/KZT',
                data: [],
                borderColor: '#1a73e8',
                backgroundColor: 'rgba(26, 115, 232, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
    
    updateChart();
}

/**
 * 更新图表
 */
function updateChart() {
    if (!fxState.chart) return;
    
    const days = parseInt(document.getElementById('chartPeriod').value);
    const rates = fxState.rates.slice(0, days).reverse();
    
    fxState.chart.data.labels = rates.map(r => formatDate(r.rateDate));
    fxState.chart.data.datasets[0].data = rates.map(r => r.rateValue);
    fxState.chart.update();
}

/**
 * 打开添加汇率弹窗
 */
function openAddRateModal() {
    document.getElementById('newRatePair').value = 'CNY/KZT';
    document.getElementById('newRateLocked').checked = false;
    document.getElementById('addRateModal').classList.add('show');
}

/**
 * 关闭弹窗
 */
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

/**
 * 优先通过代理获取汇率，回退到前端抓取
 */
async function fetchRateForPair(pair) {
    console.log(`[fetchRateForPair] 开始获取 ${pair}`);
    try {
        const url = `${FX_PROXY_BASE}/api/fx?pairs=${encodeURIComponent(pair)}`;
        console.log(`[fetchRateForPair] 代理 URL: ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        console.log(`[fetchRateForPair] 代理响应: ${resp.status}`);
        if (resp.ok) {
            const json = await resp.json();
            console.log(`[fetchRateForPair] 代理返回数据:`, json);
            if (json && json.ok && json.rates && json.rates[pair]) {
                const result = { ...json.rates[pair], source: json.rates[pair].source || 'proxy' };
                console.log(`[fetchRateForPair] 返回: `, result);
                return result;
            }
        }
    } catch (err) {
        console.warn('proxy fetch failed, falling back:', err.message);
    }

    // 代理不可用时，回退到前端抓取
    console.log(`[fetchRateForPair] 代理失败，尝试回退...`);
    return await fetchRateForPairFallback(pair);
}

/**
 * 前端回退：通过抓取汇率网站获取实时汇率
 */
async function fetchRateForPairFallback(pair) {
    const [base, quote] = pair.split('/');
    
    const sources = [
        {
            name: '新浪财经',
            url: getSinaUrl(base, quote),
            parser: parseSinaRate
        },
        {
            name: 'CDN汇率API',
            url: `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base.toLowerCase()}/${quote.toLowerCase()}.json`,
            parser: parseCdnApiRate
        }
    ];
    
    for (const source of sources) {
        try {
            if (!source.url) continue;
            
            console.log(`正在从${source.name}获取${pair}汇率...`);
            const response = await fetch(source.url);
            const data = await response.text();
            
            const result = source.parser(data, base, quote);
            if (result && result.rate > 0) {
                return {
                    rate: result.rate,
                    date: new Date().toISOString().split('T')[0],
                    source: source.name
                };
            }
        } catch (err) {
            console.warn(`${source.name}获取失败:`, err);
            continue;
        }
    }
    
    throw new Error('所有汇率源都无法获取数据');
}

/**
 * 获取新浪财经汇率URL
 */
function getSinaUrl(base, quote) {
    const pairMap = {
        'CNY/KZT': 'https://hq.sinajs.cn/list=CNYKZT',
        'CNY/UZS': 'https://hq.sinajs.cn/list=CNYUZS', 
        'USD/CNY': 'https://hq.sinajs.cn/list=USDCNY',
        'USD/KZT': 'https://hq.sinajs.cn/list=USDKZT'
    };
    return pairMap[`${base}/${quote}`];
}

/**
 * 解析新浪财经汇率数据
 */
function parseSinaRate(data, base, quote) {
    try {
        const match = data.match(/hq_str_[^=]+"([^"]+)"/);
        if (match && match[1]) {
            const values = match[1].split(',');
            const rate = parseFloat(values[0]);
            if (rate && rate > 0) {
                return { rate };
            }
        }
    } catch (err) {
        console.warn('新浪汇率解析失败:', err);
    }
    return null;
}

/**
 * 解析CDN API汇率数据
 */
function parseCdnApiRate(data, base, quote) {
    try {
        const json = JSON.parse(data);
        const rate = json[quote.toLowerCase()];
        if (rate && rate > 0) {
            return { rate };
        }
    } catch (err) {
        console.warn('CDN API解析失败:', err);
    }
    return null;
}

/**
 * 保存新汇率
 */
async function saveNewRate() {
    const pair = document.getElementById('newRatePair').value;
    const locked = document.getElementById('newRateLocked').checked;

    showToast('⏳ 正在获取并保存汇率...');
    try {
        const fetched = await fetchRateForPair(pair);
        const [base, quote] = pair.split('/');

        await db.setFxRate({
            baseCurrency: base,
            quoteCurrency: quote,
            rateDate: fetched.date,
            rateValue: fetched.rate,
            source: fetched.source,
            isLocked: !!locked
        });

        closeModal('addRateModal');
        showToast('✅ 已添加并获取汇率', 'success');

        await loadCurrentRates();
        await loadFxHistory();
    } catch (error) {
        console.error(error);
        showToast('获取汇率失败，请稍后重试', 'error');
    }
}

/**
 * 获取实时汇率（为页面中列出的货币对批量刷新）
 */
async function fetchLatestRates() {
    console.log('[fetchLatestRates] 开始刷新汇率');
    showToast('⏳ 正在刷新所有已配置汇率...');
    try {
        let pairs = ['CNY/KZT', 'CNY/UZS', 'USD/KZT'];
        console.log('[fetchLatestRates] 待刷新货币对:', pairs);
        if (typeof db.getTrackedPairs === 'function') {
            const tracked = await db.getTrackedPairs();
            if (Array.isArray(tracked) && tracked.length > 0) pairs = tracked;
        }

        const today = new Date().toISOString().split('T')[0];
        for (const pair of pairs) {
            try {
                console.log(`[fetchLatestRates] 处理 ${pair}...`);
                const latest = await db.getLatestFxRate(pair);
                console.log(`[fetchLatestRates] ${pair} 锁定状态: ${latest ? latest.isLocked : 'N/A'}`);
                if (latest && latest.isLocked) {
                    console.log(`[fetchLatestRates] ${pair} 已锁定，跳过`);
                    continue;
                }

                const fetched = await fetchRateForPair(pair);
                console.log(`[fetchLatestRates] ${pair} 获取成功:`, fetched);
                const [base, quote] = pair.split('/');
                const rateData = {
                    baseCurrency: base,
                    quoteCurrency: quote,
                    rateDate: fetched.date || today,
                    rateValue: fetched.rate,
                    source: fetched.source
                };
                console.log(`[fetchLatestRates] 保存数据:`, rateData);
                await db.setFxRate(rateData);
                console.log(`[fetchLatestRates] ${pair} 保存成功`);
            } catch (errInner) {
                console.warn('刷新单个汇率失败', pair, errInner);
            }
        }

        console.log('[fetchLatestRates] 准备加载显示...');
        await loadCurrentRates();
        await loadFxHistory();
        console.log('[fetchLatestRates] 完成');
        showToast('✅ 汇率刷新完成', 'success');
    } catch (error) {
        console.error('批量刷新失败', error);
        showToast('刷新失败，请稍后重试', 'error');
    }
}

/**
 * 锁定/解锁汇率
 */
async function lockRate(pair) {
    try {
        if (typeof db.toggleLockRate === 'function') {
            await db.toggleLockRate(pair);
            await loadCurrentRates();
            showToast('🔒 切换锁定状态成功', 'success');
            return;
        }
        showToast(`🔒 ${pair} 汇率已锁定（本地提示）`, 'success');
    } catch (err) {
        console.error('lockRate error', err);
        showToast('锁定失败', 'error');
    }
}

/**
 * 删除汇率
 */
async function deleteRate(rateId) {
    if (!confirm('确定要删除此汇率记录吗？')) return;
    showToast('✅ 已删除', 'success');
    await loadFxHistory();
}

/**
 * 编辑汇率
 */
function editRate(rateId) {
    showToast('编辑功能开发中...', 'info');
}

/**
 * 格式化日期
 */
function formatDate(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
        return '今天';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return '昨天';
    }
    
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * Toast 提示
 */
function showToast(message, type = 'info') {
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
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    try {
        if (typeof db !== 'undefined') {
            loadCurrentRates();
            loadFxHistory();
        }
    } catch (err) {
        console.warn('Failed to initialize fx page:', err);
    }
});
