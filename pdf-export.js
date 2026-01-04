/**
 * PDF 导出模块
 * 使用 html2pdf.js 直接生成 PDF 下载
 */

const PDFExporter = {
    // html2pdf.js CDN
    scriptLoaded: false,

    // 确保脚本加载
    async ensureScript() {
        if (this.scriptLoaded) return;
        
        return new Promise((resolve, reject) => {
            // 检查是否已加载
            if (window.html2pdf) {
                this.scriptLoaded = true;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = () => {
                this.scriptLoaded = true;
                resolve();
            };
            script.onerror = () => reject(new Error('无法加载 PDF 库'));
            document.head.appendChild(script);
        });
    },

    /**
     * 导出项目测算报告为 PDF
     */
    async exportProjectReport() {
        try {
            // 显示加载提示
            this.showLoading('正在生成 PDF 报告...');

            // 加载 html2pdf
            await this.ensureScript();

            // 获取要导出的内容
            const content = this.prepareProjectContent();
            
            // 配置选项
            const options = {
                margin: [10, 10, 10, 10],
                filename: this.generateFilename(),
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    letterRendering: true
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a4', 
                    orientation: 'portrait'
                },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            // 生成并下载 PDF
            await html2pdf().set(options).from(content).save();

            this.hideLoading();
            this.showToast('PDF 报告已下载', 'success');

        } catch (error) {
            this.hideLoading();
            console.error('PDF 导出失败:', error);
            this.showToast('PDF 导出失败: ' + error.message, 'error');
        }
    },

    /**
     * 准备项目页面内容
     */
    prepareProjectContent() {
        // 创建导出容器
        const exportContainer = document.createElement('div');
        exportContainer.className = 'pdf-export-container';
        
        // 添加报告样式
        exportContainer.innerHTML = `
            <style>
                .pdf-export-container {
                    font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
                    color: #333;
                    padding: 20px;
                    background: white;
                }
                .pdf-header {
                    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
                    color: white;
                    padding: 30px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                }
                .pdf-header h1 {
                    margin: 0 0 10px 0;
                    font-size: 24px;
                }
                .pdf-header .meta {
                    display: flex;
                    gap: 20px;
                    font-size: 14px;
                    opacity: 0.9;
                }
                .pdf-section {
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                    page-break-inside: avoid;
                }
                .pdf-section h3 {
                    margin: 0 0 15px 0;
                    color: #1e1b4b;
                    font-size: 16px;
                    border-bottom: 2px solid #4f46e5;
                    padding-bottom: 8px;
                }
                .pdf-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                }
                .pdf-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: white;
                    border-radius: 6px;
                }
                .pdf-item .label {
                    color: #666;
                }
                .pdf-item .value {
                    font-weight: 600;
                    color: #333;
                }
                .pdf-kpi-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 15px;
                }
                .pdf-kpi {
                    text-align: center;
                    padding: 20px;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                }
                .pdf-kpi .value {
                    font-size: 28px;
                    font-weight: 700;
                    color: #4f46e5;
                    margin-bottom: 5px;
                }
                .pdf-kpi .label {
                    font-size: 12px;
                    color: #666;
                }
                .pdf-kpi.positive .value { color: #10b981; }
                .pdf-kpi.negative .value { color: #ef4444; }
                .pdf-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                .pdf-table th,
                .pdf-table td {
                    padding: 10px 12px;
                    text-align: left;
                    border-bottom: 1px solid #e5e7eb;
                }
                .pdf-table th {
                    background: #f0f0f0;
                    font-weight: 600;
                    color: #333;
                }
                .pdf-table tr:last-child td {
                    border-bottom: none;
                }
                .pdf-footer {
                    text-align: center;
                    padding: 20px;
                    color: #999;
                    font-size: 12px;
                    border-top: 1px solid #eee;
                    margin-top: 20px;
                }
            </style>
        `;

        // 获取页面数据
        const projectTitle = document.getElementById('projectTitle')?.textContent || '项目测算报告';
        const projectId = document.getElementById('projectId')?.textContent || '';
        const projectRegion = document.getElementById('projectRegion')?.textContent || '';
        const projectStatus = document.getElementById('projectStatus')?.textContent || '';

        // 报告头部
        exportContainer.innerHTML += `
            <div class="pdf-header">
                <h1>📊 ${projectTitle}</h1>
                <div class="meta">
                    <span>${projectId}</span>
                    <span>${projectRegion}</span>
                    <span>${projectStatus}</span>
                    <span>生成时间: ${new Date().toLocaleString('zh-CN')}</span>
                </div>
            </div>
        `;

        // 项目基本信息
        exportContainer.innerHTML += this.buildProjectInfoSection();

        // KPI 指标
        exportContainer.innerHTML += this.buildKPISection();

        // 财务明细
        exportContainer.innerHTML += this.buildFinancialSection();

        // 成本分析
        exportContainer.innerHTML += this.buildCostSection();

        // 现金流表
        exportContainer.innerHTML += this.buildCashflowSection();

        // 报告页脚
        exportContainer.innerHTML += `
            <div class="pdf-footer">
                <p>本报告由「中亚跨境项目管理系统」自动生成</p>
                <p>报告仅供参考，具体以实际情况为准</p>
            </div>
        `;

        return exportContainer;
    },

    /**
     * 构建项目信息部分
     */
    buildProjectInfoSection() {
        const getValue = (id) => document.getElementById(id)?.value || document.getElementById(id)?.textContent || '--';
        
        return `
            <div class="pdf-section">
                <h3>📋 项目基本信息</h3>
                <div class="pdf-grid">
                    <div class="pdf-item">
                        <span class="label">设备类型</span>
                        <span class="value">${getValue('equipmentType')}</span>
                    </div>
                    <div class="pdf-item">
                        <span class="label">设备型号</span>
                        <span class="value">${getValue('equipmentModel')}</span>
                    </div>
                    <div class="pdf-item">
                        <span class="label">设备数量</span>
                        <span class="value">${getValue('quantity')} 台</span>
                    </div>
                    <div class="pdf-item">
                        <span class="label">租赁期限</span>
                        <span class="value">${getValue('leaseTerm')} 个月</span>
                    </div>
                    <div class="pdf-item">
                        <span class="label">目标区域</span>
                        <span class="value">${getValue('targetRegion')}</span>
                    </div>
                    <div class="pdf-item">
                        <span class="label">目标城市</span>
                        <span class="value">${getValue('targetCity')}</span>
                    </div>
                    <div class="pdf-item">
                        <span class="label">月租金</span>
                        <span class="value">¥${this.formatNumber(getValue('monthlyRent'))}</span>
                    </div>
                    <div class="pdf-item">
                        <span class="label">采购单价</span>
                        <span class="value">¥${this.formatNumber(getValue('purchasePrice'))}</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 构建KPI指标部分
     */
    buildKPISection() {
        const kpiCards = document.querySelectorAll('.kpi-card');
        let kpiHTML = '<div class="pdf-kpi-grid">';
        
        kpiCards.forEach(card => {
            const label = card.querySelector('.kpi-label')?.textContent || '';
            const value = card.querySelector('.kpi-value')?.textContent || '--';
            const isPositive = card.classList.contains('positive') || value.includes('+');
            const isNegative = card.classList.contains('negative') || value.includes('-');
            
            kpiHTML += `
                <div class="pdf-kpi ${isPositive ? 'positive' : ''} ${isNegative ? 'negative' : ''}">
                    <div class="value">${value}</div>
                    <div class="label">${label}</div>
                </div>
            `;
        });
        
        kpiHTML += '</div>';

        return `
            <div class="pdf-section">
                <h3>📈 关键指标 (KPI)</h3>
                ${kpiHTML}
            </div>
        `;
    },

    /**
     * 构建财务明细部分
     */
    buildFinancialSection() {
        // 从收入表格获取数据
        const revenueTable = document.querySelector('.result-table');
        if (!revenueTable) return '';

        return `
            <div class="pdf-section">
                <h3>💰 收入与利润明细</h3>
                ${revenueTable.outerHTML.replace('class="result-table"', 'class="pdf-table"')}
            </div>
        `;
    },

    /**
     * 构建成本分析部分
     */
    buildCostSection() {
        // 从成本表格获取数据
        const costTables = document.querySelectorAll('.result-table');
        let costHTML = '';
        
        costTables.forEach((table, index) => {
            if (index > 0) { // 跳过第一个收入表
                const section = table.closest('.result-section');
                const title = section?.querySelector('h3')?.textContent || `表格 ${index}`;
                costHTML += `
                    <div class="pdf-section">
                        <h3>${title}</h3>
                        ${table.outerHTML.replace('class="result-table"', 'class="pdf-table"')}
                    </div>
                `;
            }
        });

        return costHTML;
    },

    /**
     * 构建现金流表部分
     */
    buildCashflowSection() {
        const cashflowTable = document.getElementById('cashflowTable');
        if (!cashflowTable) return '';

        // 简化表格，只显示部分数据
        const clone = cashflowTable.cloneNode(true);
        
        return `
            <div class="pdf-section">
                <h3>📊 现金流量表</h3>
                ${clone.outerHTML.replace(/class="[^"]*"/g, 'class="pdf-table"')}
            </div>
        `;
    },

    /**
     * 生成文件名
     */
    generateFilename() {
        const projectTitle = document.getElementById('projectTitle')?.textContent || '项目';
        const date = new Date().toISOString().split('T')[0];
        // 清理文件名中的非法字符
        const safeName = projectTitle.replace(/[\\/:*?"<>|]/g, '_').substring(0, 50);
        return `${safeName}_测算报告_${date}.pdf`;
    },

    /**
     * 格式化数字
     */
    formatNumber(num) {
        const n = parseFloat(num);
        if (isNaN(n)) return num;
        return n.toLocaleString('zh-CN');
    },

    /**
     * 显示加载提示
     */
    showLoading(message) {
        // 创建加载遮罩
        const overlay = document.createElement('div');
        overlay.id = 'pdfLoadingOverlay';
        overlay.innerHTML = `
            <style>
                #pdfLoadingOverlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                }
                .pdf-loading-content {
                    background: white;
                    padding: 40px 60px;
                    border-radius: 16px;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                }
                .pdf-loading-spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid #f0f0f0;
                    border-top-color: #4f46e5;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .pdf-loading-text {
                    font-size: 16px;
                    color: #333;
                }
            </style>
            <div class="pdf-loading-content">
                <div class="pdf-loading-spinner"></div>
                <div class="pdf-loading-text">${message}</div>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    /**
     * 隐藏加载提示
     */
    hideLoading() {
        const overlay = document.getElementById('pdfLoadingOverlay');
        if (overlay) overlay.remove();
    },

    /**
     * 显示提示消息
     */
    showToast(message, type = 'info') {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            alert(message);
        }
    }
};

/**
 * 替换原有的导出函数
 */
function exportPDFReport() {
    PDFExporter.exportProjectReport();
}
