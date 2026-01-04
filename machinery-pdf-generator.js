// ==UserScript==
// @name         工程机械PDF报告生成器 - 中亚信息集成版
// @namespace    machinery-pdf-generator
// @version      1.0.0
// @description  查询工程机械信息并生成PDF报告，自动提交到中亚信息系统
// @author       Engineering Assistant
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// ==/UserScript==

(function() {
    'use strict';

    // 中亚信息系统API配置
    const ZHONGYA_API = {
        baseUrl: 'https://your-zhongya-domain.com/api',
        endpoints: {
            uploadReport: '/machinery/upload-report',
            queryData: '/machinery/query',
            updatePrices: '/machinery/update-prices'
        },
        apiKey: 'your-api-key-here' // 需要配置您的API密钥
    };

    // PDF生成器类
    class MachineryPDFGenerator {
        constructor() {
            this.jsPDF = window.jspdf.jsPDF;
            this.reportData = null;
        }

        // 查询机械信息并生成PDF
        async generateReport(keyword) {
            console.log(`开始为 ${keyword} 生成PDF报告...`);
            
            // 1. 查询机械数据
            const machineryData = await this.queryMachineryData(keyword);
            if (!machineryData) {
                throw new Error('未找到相关机械信息');
            }

            // 2. 生成PDF报告
            const pdfBlob = await this.createPDF(machineryData);
            
            // 3. 上传到中亚信息系统
            const uploadResult = await this.uploadToZhongya(pdfBlob, machineryData);
            
            // 4. 下载PDF到本地
            this.downloadPDF(pdfBlob, `${keyword}_机械信息报告_${new Date().toISOString().slice(0,10)}.pdf`);
            
            return {
                pdfBlob,
                uploadResult,
                reportData: machineryData
            };
        }

        // 查询机械数据（集成多个数据源）
        async queryMachineryData(keyword) {
            const dataSources = [
                this.queryFromLMJX(keyword),      // 中国路面机械网
                this.queryFromZJJW(keyword),      // 中国起重机械网  
                this.queryFromTieba(keyword),     // 铁甲网
                this.queryFromOfficial(keyword)   // 官方渠道
            ];

            try {
                const results = await Promise.allSettled(dataSources);
                return this.mergeDataSources(results, keyword);
            } catch (error) {
                console.error('数据查询失败:', error);
                return null;
            }
        }

        // 合并多数据源结果
        mergeDataSources(results, keyword) {
            const validResults = results
                .filter(result => result.status === 'fulfilled' && result.value)
                .map(result => result.value);

            if (validResults.length === 0) return null;

            // 智能合并逻辑
            return {
                keyword: keyword,
                queryTime: new Date().toISOString(),
                sources: validResults.map(r => r.source),
                basicInfo: this.mergeBaiscInfo(validResults),
                parameters: this.mergeParameters(validResults),
                pricing: this.mergePricing(validResults),
                rental: this.mergeRental(validResults),
                images: this.mergeImages(validResults),
                confidence: this.calculateConfidence(validResults)
            };
        }

        // 生成PDF报告
        async createPDF(data) {
            const pdf = new this.jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            let currentY = 20;

            // 设置中文字体
            pdf.setFont('helvetica');
            
            // 1. 报告头部
            pdf.setFontSize(20);
            pdf.setTextColor(51, 51, 51);
            pdf.text('工程机械信息调研报告', pageWidth/2, currentY, { align: 'center' });
            currentY += 10;

            pdf.setFontSize(14);
            pdf.setTextColor(102, 102, 102);
            pdf.text(`设备关键词: ${data.keyword}`, pageWidth/2, currentY, { align: 'center' });
            currentY += 8;
            
            pdf.text(`报告生成时间: ${new Date(data.queryTime).toLocaleString('zh-CN')}`, pageWidth/2, currentY, { align: 'center' });
            currentY += 15;

            // 2. 基本信息
            currentY = this.addSectionToPDF(pdf, '基本信息', data.basicInfo, currentY, pageWidth, pageHeight);
            
            // 3. 技术参数  
            if (data.parameters) {
                currentY = this.addSectionToPDF(pdf, '技术参数', data.parameters, currentY, pageWidth, pageHeight);
            }

            // 4. 价格信息
            if (data.pricing) {
                currentY = this.addPricingToPDF(pdf, data.pricing, currentY, pageWidth, pageHeight);
            }

            // 5. 租赁信息
            if (data.rental) {
                currentY = this.addRentalToPDF(pdf, data.rental, currentY, pageWidth, pageHeight);
            }

            // 6. 数据来源
            currentY = this.addDataSourcesToPDF(pdf, data.sources, currentY, pageWidth, pageHeight);

            // 7. 页脚信息
            this.addFooterToPDF(pdf, pageWidth, pageHeight);

            return pdf.output('blob');
        }

        // 添加章节到PDF
        addSectionToPDF(pdf, title, data, currentY, pageWidth, pageHeight) {
            // 检查是否需要新页面
            if (currentY > pageHeight - 50) {
                pdf.addPage();
                currentY = 20;
            }

            // 章节标题
            pdf.setFontSize(16);
            pdf.setTextColor(67, 126, 235);
            pdf.text(title, 20, currentY);
            currentY += 10;

            // 章节内容
            pdf.setFontSize(11);
            pdf.setTextColor(51, 51, 51);

            if (typeof data === 'object') {
                for (const [key, value] of Object.entries(data)) {
                    if (currentY > pageHeight - 20) {
                        pdf.addPage();
                        currentY = 20;
                    }
                    
                    pdf.text(`${key}: ${value}`, 25, currentY);
                    currentY += 6;
                }
            } else {
                pdf.text(String(data), 25, currentY);
                currentY += 6;
            }

            return currentY + 10;
        }

        // 添加价格信息到PDF
        addPricingToPDF(pdf, pricing, currentY, pageWidth, pageHeight) {
            if (currentY > pageHeight - 80) {
                pdf.addPage();
                currentY = 20;
            }

            pdf.setFontSize(16);
            pdf.setTextColor(231, 76, 60);
            pdf.text('价格分析', 20, currentY);
            currentY += 15;

            // 新机价格
            if (pricing.newMachine) {
                pdf.setFontSize(12);
                pdf.setTextColor(51, 51, 51);
                pdf.text('新机价格:', 25, currentY);
                currentY += 8;
                
                Object.entries(pricing.newMachine).forEach(([source, price]) => {
                    pdf.setFontSize(10);
                    pdf.text(`  ${source}: ${price}`, 30, currentY);
                    currentY += 5;
                });
                currentY += 5;
            }

            // 二手价格
            if (pricing.used) {
                pdf.setFontSize(12);
                pdf.text('二手价格:', 25, currentY);
                currentY += 8;
                
                pricing.used.forEach(item => {
                    pdf.setFontSize(10);
                    pdf.text(`  ${item.age}: ${item.price} (${item.condition})`, 30, currentY);
                    currentY += 5;
                });
                currentY += 5;
            }

            return currentY + 10;
        }

        // 添加租赁信息到PDF
        addRentalToPDF(pdf, rental, currentY, pageWidth, pageHeight) {
            if (currentY > pageHeight - 60) {
                pdf.addPage();
                currentY = 20;
            }

            pdf.setFontSize(16);
            pdf.setTextColor(40, 167, 69);
            pdf.text('租赁价格', 20, currentY);
            currentY += 15;

            pdf.setFontSize(11);
            pdf.setTextColor(51, 51, 51);

            Object.entries(rental).forEach(([key, value]) => {
                if (currentY > pageHeight - 15) {
                    pdf.addPage();
                    currentY = 20;
                }
                pdf.text(`${key}: ${value}`, 25, currentY);
                currentY += 6;
            });

            return currentY + 10;
        }

        // 添加数据来源
        addDataSourcesToPDF(pdf, sources, currentY, pageWidth, pageHeight) {
            if (currentY > pageHeight - 40) {
                pdf.addPage();
                currentY = 20;
            }

            pdf.setFontSize(12);
            pdf.setTextColor(108, 117, 125);
            pdf.text('数据来源:', 20, currentY);
            currentY += 8;

            sources.forEach((source, index) => {
                pdf.setFontSize(9);
                pdf.text(`${index + 1}. ${source}`, 25, currentY);
                currentY += 5;
            });

            return currentY;
        }

        // 添加页脚
        addFooterToPDF(pdf, pageWidth, pageHeight) {
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text('本报告由中亚信息工程机械查询系统自动生成', pageWidth/2, pageHeight - 10, { align: 'center' });
        }

        // 上传到中亚信息系统
        async uploadToZhongya(pdfBlob, reportData) {
            const formData = new FormData();
            formData.append('report', pdfBlob, `${reportData.keyword}_report.pdf`);
            formData.append('keyword', reportData.keyword);
            formData.append('reportData', JSON.stringify(reportData));
            formData.append('timestamp', Date.now());

            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `${ZHONGYA_API.baseUrl}${ZHONGYA_API.endpoints.uploadReport}`,
                    headers: {
                        'Authorization': `Bearer ${ZHONGYA_API.apiKey}`,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    data: formData,
                    onload: function(response) {
                        if (response.status === 200) {
                            const result = JSON.parse(response.responseText);
                            console.log('报告上传成功:', result);
                            resolve(result);
                        } else {
                            reject(new Error(`上传失败: ${response.status}`));
                        }
                    },
                    onerror: function(error) {
                        reject(error);
                    }
                });
            });
        }

        // 下载PDF文件
        downloadPDF(pdfBlob, filename) {
            const url = URL.createObjectURL(pdfBlob);
            GM_download(url, filename, url);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        // 以下是数据源查询方法的占位符实现
        async queryFromLMJX(keyword) {
            // 中国路面机械网查询实现
            return {
                source: '中国路面机械网',
                data: await this.genericQuery(`https://www.lmjx.net/search?q=${keyword}`)
            };
        }

        async queryFromZJJW(keyword) {
            // 中国起重机械网查询实现  
            return {
                source: '中国起重机械网',
                data: await this.genericQuery(`https://www.cncma.org/search?q=${keyword}`)
            };
        }

        async queryFromTieba(keyword) {
            // 铁甲网查询实现
            return {
                source: '铁甲网',
                data: await this.genericQuery(`https://www.tieba.com/search?q=${keyword}`)
            };
        }

        async queryFromOfficial(keyword) {
            // 官方渠道查询实现
            return {
                source: '品牌官网',
                data: await this.genericQuery(`official-api-endpoint?model=${keyword}`)
            };
        }

        async genericQuery(url) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    onload: function(response) {
                        if (response.status === 200) {
                            // 解析HTML或JSON响应
                            resolve(response.responseText);
                        } else {
                            reject(new Error(`查询失败: ${response.status}`));
                        }
                    },
                    onerror: reject
                });
            });
        }

        // 数据合并辅助方法
        mergeBaiscInfo(results) {
            // 合并基本信息逻辑
            return {
                名称: results[0]?.name || '未知',
                品牌: results[0]?.brand || '未知',
                型号: results[0]?.model || '未知',
                类型: results[0]?.type || '工程机械'
            };
        }

        mergeParameters(results) {
            // 合并技术参数逻辑
            const params = {};
            results.forEach(result => {
                if (result.parameters) {
                    Object.assign(params, result.parameters);
                }
            });
            return params;
        }

        mergePricing(results) {
            // 合并价格信息逻辑
            return {
                newMachine: {},
                used: []
            };
        }

        mergeRental(results) {
            // 合并租赁信息逻辑
            return {
                台班价: '查询中...',
                月租价: '查询中...',
                年租价: '查询中...'
            };
        }

        mergeImages(results) {
            // 合并图片信息逻辑
            return [];
        }

        calculateConfidence(results) {
            // 计算数据可信度
            return Math.min(results.length * 0.25, 1.0);
        }
    }

    // 中亚信息系统集成API
    class ZhongyaIntegration {
        constructor() {
            this.apiBase = ZHONGYA_API.baseUrl;
            this.apiKey = ZHONGYA_API.apiKey;
        }

        // 获取中亚系统中的机械库存
        async getMachineryInventory() {
            return this.apiCall('/machinery/inventory');
        }

        // 更新机械价格信息
        async updateMachineryPrices(machineryData) {
            return this.apiCall('/machinery/update-prices', 'POST', machineryData);
        }

        // 创建询价记录
        async createInquiry(inquiryData) {
            return this.apiCall('/inquiry/create', 'POST', inquiryData);
        }

        // 生成中亚格式的报价单
        async generateQuotation(machineryData) {
            const quotationData = {
                machinery: machineryData.keyword,
                specifications: machineryData.parameters,
                pricing: machineryData.pricing,
                timestamp: new Date().toISOString(),
                source: '工程机械查询系统'
            };

            return this.apiCall('/quotation/generate', 'POST', quotationData);
        }

        async apiCall(endpoint, method = 'GET', data = null) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: method,
                    url: `${this.apiBase}${endpoint}`,
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    data: data ? JSON.stringify(data) : null,
                    onload: function(response) {
                        if (response.status >= 200 && response.status < 300) {
                            resolve(JSON.parse(response.responseText));
                        } else {
                            reject(new Error(`API调用失败: ${response.status}`));
                        }
                    },
                    onerror: reject
                });
            });
        }
    }

    // 主界面创建
    function createMainInterface() {
        const interfaceHTML = `
            <div id="machinery-pdf-interface" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 30px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                z-index: 999999;
                font-family: 'Microsoft YaHei', Arial, sans-serif;
                color: white;
                min-width: 400px;
                display: none;
            ">
                <h2 style="margin: 0 0 20px 0; text-align: center;">🏗️ 工程机械PDF报告生成</h2>
                <div style="margin-bottom: 15px;">
                    <label for="machinery-keyword" style="display: block; margin-bottom: 5px; font-weight: bold;">设备关键词:</label>
                    <input type="text" id="machinery-keyword" placeholder="例如: 徐工XCT25, 25吨汽车吊" style="
                        width: 100%;
                        padding: 12px;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; margin-bottom: 10px;">
                        <input type="checkbox" id="upload-zhongya" checked style="margin-right: 10px;">
                        自动上传到中亚信息系统
                    </label>
                    <label style="display: flex; align-items: center; margin-bottom: 10px;">
                        <input type="checkbox" id="generate-quotation" style="margin-right: 10px;">
                        同时生成报价单
                    </label>
                    <label style="display: flex; align-items: center;">
                        <input type="checkbox" id="create-inquiry" style="margin-right: 10px;">
                        创建询价记录
                    </label>
                </div>

                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="generate-report-btn" style="
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: 2px solid rgba(255,255,255,0.3);
                        padding: 12px 24px;
                        border-radius: 25px;
                        cursor: pointer;
                        font-weight: bold;
                        transition: all 0.3s ease;
                    ">📄 生成PDF报告</button>
                    
                    <button id="close-interface-btn" style="
                        background: rgba(255,255,255,0.1);
                        color: white;
                        border: 2px solid rgba(255,255,255,0.2);
                        padding: 12px 24px;
                        border-radius: 25px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">❌ 关闭</button>
                </div>

                <div id="progress-info" style="
                    margin-top: 15px;
                    text-align: center;
                    font-size: 12px;
                    display: none;
                ">
                    <div style="margin: 10px 0;">⏳ 正在生成报告...</div>
                    <div style="width: 100%; background: rgba(255,255,255,0.2); border-radius: 10px; height: 6px;">
                        <div id="progress-bar" style="background: white; height: 100%; border-radius: 10px; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', interfaceHTML);
        
        const interface_ = document.getElementById('machinery-pdf-interface');
        const generateBtn = document.getElementById('generate-report-btn');
        const closeBtn = document.getElementById('close-interface-btn');
        const keywordInput = document.getElementById('machinery-keyword');
        
        // 事件绑定
        generateBtn.addEventListener('click', handleGenerateReport);
        closeBtn.addEventListener('click', () => interface_.style.display = 'none');
        
        // 回车键触发生成
        keywordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleGenerateReport();
            }
        });

        return interface_;
    }

    // 处理报告生成
    async function handleGenerateReport() {
        const keyword = document.getElementById('machinery-keyword').value.trim();
        if (!keyword) {
            alert('请输入设备关键词');
            return;
        }

        const progressInfo = document.getElementById('progress-info');
        const progressBar = document.getElementById('progress-bar');
        const generateBtn = document.getElementById('generate-report-btn');
        
        // 显示进度
        progressInfo.style.display = 'block';
        generateBtn.disabled = true;
        generateBtn.textContent = '⏳ 生成中...';

        try {
            const generator = new MachineryPDFGenerator();
            const zhongya = new ZhongyaIntegration();

            // 更新进度
            progressBar.style.width = '25%';
            
            // 生成报告
            const result = await generator.generateReport(keyword);
            progressBar.style.width = '75%';

            // 中亚系统集成选项
            const uploadZhongya = document.getElementById('upload-zhongya').checked;
            const generateQuotation = document.getElementById('generate-quotation').checked;
            const createInquiry = document.getElementById('create-inquiry').checked;

            if (uploadZhongya && result.uploadResult) {
                console.log('已上传到中亚系统:', result.uploadResult);
            }

            if (generateQuotation) {
                const quotation = await zhongya.generateQuotation(result.reportData);
                console.log('报价单已生成:', quotation);
            }

            if (createInquiry) {
                const inquiry = await zhongya.createInquiry({
                    keyword: keyword,
                    timestamp: new Date().toISOString(),
                    reportId: result.uploadResult?.reportId
                });
                console.log('询价记录已创建:', inquiry);
            }

            progressBar.style.width = '100%';
            
            alert(`✅ PDF报告生成成功！\n设备: ${keyword}\n已下载到本地并${uploadZhongya ? '上传到中亚系统' : '准备就绪'}`);
            
        } catch (error) {
            console.error('报告生成失败:', error);
            alert(`❌ 报告生成失败: ${error.message}`);
        } finally {
            // 重置界面
            progressInfo.style.display = 'none';
            progressBar.style.width = '0%';
            generateBtn.disabled = false;
            generateBtn.textContent = '📄 生成PDF报告';
        }
    }

    // 初始化
    function init() {
        console.log('工程机械PDF生成器已加载');
        
        // 创建主界面
        const mainInterface = createMainInterface();
        
        // 添加快捷键 Ctrl+Shift+P 打开界面
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                mainInterface.style.display = 'block';
                document.getElementById('machinery-keyword').focus();
            }
        });

        // 添加右键菜单
        document.addEventListener('contextmenu', (e) => {
            const selectedText = window.getSelection().toString().trim();
            if (selectedText) {
                setTimeout(() => {
                    GM_registerMenuCommand('🏗️ 生成机械PDF报告', function() {
                        mainInterface.style.display = 'block';
                        document.getElementById('machinery-keyword').value = selectedText;
                    });
                }, 10);
            }
        });
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();