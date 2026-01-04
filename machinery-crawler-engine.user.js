// ==UserScript==
// @name         工程机械数据爬虫引擎
// @namespace    http://www.jinzhe.asia/
// @version      3.1.0
// @description  为 www.jinzhe.asia 提供外部数据爬取服务和PDF报告生成
// @author       金哲工程机械
// @match        http://www.jinzhe.asia/*
// @match        https://www.jinzhe.asia/*
// @match        http://localhost:*/*// @match        http://127.0.0.1:*/*
// @match        file:///*crawler-demo.html*// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    console.log('🤖 工程机械爬虫引擎已启动 v3.3.0');
    console.log('📍 当前URL:', window.location.href);
    console.log('📍 执行时机: document-start');
    console.log('✅ 全局运行模式 - 适用于所有网页');
    
    // ==================== 数据爬虫引擎 ====================
    class MachineryDataCrawler {
        constructor() {
            this.sources = [
                { name: '铁甲网', baseUrl: 'https://www.tiega.cn', searchPath: '/search?q=' },
                { name: '路面机械网', baseUrl: 'https://www.lmjx.net', searchPath: '/search/' },
                { name: '中国工程机械商贸网', baseUrl: 'https://www.cmol.com', searchPath: '/search?keyword=' }
            ];
        }

        // 爬取设备数据
        async crawl(keyword) {
            console.log('🕷️ 开始爬取:', keyword);
            
            for (const source of this.sources) {
                try {
                    const url = `${source.baseUrl}${source.searchPath}${encodeURIComponent(keyword)}`;
                    console.log(`正在访问: ${source.name} - ${url}`);
                    
                    const data = await this.fetchFromSource(url, source.name);
                    
                    if (data && Object.keys(data.specs).length > 0) {
                        console.log(`✅ ${source.name} 爬取成功`);
                        data.source = source.name;
                        data.sourceUrl = url;
                        return data;
                    }
                } catch (error) {
                    console.warn(`⚠️ ${source.name} 爬取失败:`, error.message);
                }
            }

            return null;
        }

        // 从单个源获取数据
        fetchFromSource(url, sourceName) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    timeout: 15000,
                    onload: (response) => {
                        try {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(response.responseText, 'text/html');
                            const data = this.parseHTML(doc, sourceName);
                            resolve(data);
                        } catch (error) {
                            reject(error);
                        }
                    },
                    onerror: () => reject(new Error('网络请求失败')),
                    ontimeout: () => reject(new Error('请求超时'))
                });
            });
        }

        // 解析HTML提取数据
        parseHTML(doc, sourceName) {
            const bodyText = doc.body.innerText;
            const data = {
                type: this.extractType(bodyText),
                tonnage: this.extractTonnage(bodyText),
                specs: this.extractSpecs(doc, bodyText),
                prices: this.extractPrices(bodyText),
                timestamp: new Date().toISOString()
            };

            return data;
        }

        // 提取设备类型
        extractType(text) {
            const types = [
                '汽车起重机', '履带起重机', '塔式起重机', '随车起重机',
                '门式起重机', '桥式起重机', '轮胎起重机', '全地面起重机'
            ];
            
            for (const type of types) {
                if (text.includes(type)) return type;
            }
            
            return '工程机械设备';
        }

        // 提取吨位
        extractTonnage(text) {
            // 匹配各种吨位表达方式
            const patterns = [
                /(\d+)\s*[吨t]/i,
                /(\d+)\s*ton/i,
                /起重量[：:]\s*(\d+)/
            ];
            
            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) return parseInt(match[1]);
            }
            
            return 0;
        }

        // 提取技术参数
        extractSpecs(doc, text) {
            const specs = {};
            
            // 从表格提取
            const tables = doc.querySelectorAll('table');
            tables.forEach(table => {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length >= 2) {
                        const key = cells[0].innerText.trim();
                        const value = cells[1].innerText.trim();
                        
                        if (key && value && value !== '-' && value !== '--') {
                            // 过滤掉非参数项
                            if (this.isValidSpec(key)) {
                                specs[key] = value;
                            }
                        }
                    }
                });
            });

            // 正则表达式提取常见参数
            const specPatterns = {
                '起重量': /起重量[：:]\s*([^\n\r，,]+)/,
                '主臂长度': /主臂长度[：:]\s*([^\n\r，,]+)/,
                '最大起升高度': /(?:最大)?起升高度[：:]\s*([^\n\r，,]+)/,
                '发动机': /发动机[：:]\s*([^\n\r，,]+)/,
                '发动机型号': /发动机型号[：:]\s*([^\n\r，,]+)/,
                '额定功率': /额定功率[：:]\s*([^\n\r，,]+)/,
                '整车自重': /整车自重[：:]\s*([^\n\r，,]+)/,
                '行驶速度': /行驶速度[：:]\s*([^\n\r，,]+)/,
                '底盘型号': /底盘型号[：:]\s*([^\n\r，,]+)/
            };

            for (const [key, pattern] of Object.entries(specPatterns)) {
                if (!specs[key]) { // 表格没提取到才用正则
                    const match = text.match(pattern);
                    if (match) {
                        specs[key] = match[1].trim();
                    }
                }
            }

            return specs;
        }

        // 判断是否为有效参数项
        isValidSpec(key) {
            const validKeywords = [
                '起重', '长度', '高度', '发动机', '功率', '自重', '速度',
                '型号', '底盘', '轴距', '排放', '油箱', '液压', '臂架',
                '回转', '变幅', '卷扬', '支腿', '轮胎', '驾驶室'
            ];
            
            return validKeywords.some(keyword => key.includes(keyword));
        }

        // 提取价格信息
        extractPrices(text) {
            const prices = {};
            
            // 新机价格
            const newPricePatterns = [
                /新机价格[：:]\s*(\d+\.?\d*)\s*[-~至]\s*(\d+\.?\d*)\s*万/,
                /官方指导价[：:]\s*(\d+\.?\d*)\s*[-~至]\s*(\d+\.?\d*)\s*万/,
                /参考价格[：:]\s*(\d+\.?\d*)\s*[-~至]\s*(\d+\.?\d*)\s*万/,
                /(\d+\.?\d*)\s*[-~]\s*(\d+\.?\d*)\s*万元/
            ];

            for (const pattern of newPricePatterns) {
                const match = text.match(pattern);
                if (match) {
                    prices.newMachine = {
                        min: parseFloat(match[1]),
                        max: parseFloat(match[2]),
                        unit: '万元',
                        source: '网络爬取'
                    };
                    break;
                }
            }

            // 二手价格
            const usedPriceMatch = text.match(/二手价[：:]\s*(\d+\.?\d*)\s*[-~]\s*(\d+\.?\d*)\s*万/);
            if (usedPriceMatch) {
                prices.used = {
                    min: parseFloat(usedPriceMatch[1]),
                    max: parseFloat(usedPriceMatch[2]),
                    unit: '万元'
                };
            }

            // 租赁价格
            const rentalDailyMatch = text.match(/日租[金]?[：:]\s*(\d+\.?\d*)/);
            const rentalMonthlyMatch = text.match(/月租[金]?[：:]\s*(\d+\.?\d*)/);
            
            if (rentalDailyMatch || rentalMonthlyMatch) {
                prices.rental = {
                    daily: rentalDailyMatch ? parseFloat(rentalDailyMatch[1]) : null,
                    monthly: rentalMonthlyMatch ? parseFloat(rentalMonthlyMatch[1]) : null,
                    unit: '元'
                };
            }

            return prices;
        }
    }

    // ==================== PDF报告生成器 ====================
    class PDFReportGenerator {
        constructor() {
            this.reportNumber = '';
        }

        // 动态加载jsPDF库
        async loadJsPDF() {
            if (window.jspdf) {
                console.log('✅ jsPDF已加载');
                return true;
            }

            console.log('📦 开始加载jsPDF库...');
            
            return new Promise((resolve, reject) => {
                const script1 = document.createElement('script');
                script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script1.onload = () => {
                    console.log('✅ jsPDF主库加载成功');
                    
                    const script2 = document.createElement('script');
                    script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
                    script2.onload = () => {
                        console.log('✅ jsPDF-AutoTable加载成功');
                        resolve(true);
                    };
                    script2.onerror = () => {
                        console.error('❌ jsPDF-AutoTable加载失败');
                        reject(new Error('jsPDF-AutoTable加载失败'));
                    };
                    document.head.appendChild(script2);
                };
                script1.onerror = () => {
                    console.error('❌ jsPDF主库加载失败');
                    reject(new Error('jsPDF加载失败'));
                };
                document.head.appendChild(script1);
            });
        }

        async generate(equipmentData, keyword) {
            console.log('📄 开始生成PDF报告');
            
            try {
                // 先加载jsPDF
                await this.loadJsPDF();
                
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });

                // 生成报告编号
                this.reportNumber = `JXSB-JG-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

                // 生成封面
                this.generateCover(doc, keyword);
                
                // 生成内容页
                doc.addPage();
                this.generateContent(doc, equipmentData, keyword);

                // 返回PDF blob
                return {
                    blob: doc.output('blob'),
                    fileName: `${keyword}_价格分析报告_${new Date().toISOString().split('T')[0]}.pdf`,
                    reportNumber: this.reportNumber
                };
            } catch (error) {
                console.error('PDF生成失败:', error);
                throw error;
            }
        }

        generateCover(doc, keyword) {
            const pageWidth = doc.internal.pageSize.getWidth();
            
            // 标题背景
            doc.setFillColor(102, 126, 234);
            doc.rect(0, 0, pageWidth, 80, 'F');

            // 主标题
            doc.setFontSize(28);
            doc.setTextColor(255, 255, 255);
            doc.text('工程机械设备', pageWidth/2, 30, { align: 'center' });
            doc.text('参数型号与价格分析报告', pageWidth/2, 50, { align: 'center' });

            // 报告信息
            doc.setFontSize(12);
            doc.setTextColor(60, 60, 60);
            doc.text(`报告编号: ${this.reportNumber}`, 30, 100);
            doc.text(`设备型号: ${keyword}`, 30, 110);
            doc.text(`生成日期: ${new Date().toLocaleDateString('zh-CN')}`, 30, 120);
            doc.text(`数据来源: 网络爬虫采集`, 30, 130);

            // 页脚
            doc.setFontSize(10);
            doc.setTextColor(102, 126, 234);
            doc.text('金哲工程机械 | www.jinzhe.asia', pageWidth/2, 280, { align: 'center' });
        }

        generateContent(doc, data, keyword) {
            let y = 20;
            
            // 标题
            doc.setFontSize(16);
            doc.setTextColor(102, 126, 234);
            doc.text(`${keyword} 详细技术参数`, 20, y);
            y += 15;

            // 基本信息
            doc.setFontSize(11);
            doc.setTextColor(60, 60, 60);
            doc.text(`设备类型: ${data.type}`, 25, y);
            y += 8;
            
            if (data.tonnage > 0) {
                doc.text(`额定吨位: ${data.tonnage}吨`, 25, y);
                y += 8;
            }
            
            doc.text(`数据来源: ${data.source}`, 25, y);
            y += 12;

            // 技术参数表格
            if (Object.keys(data.specs).length > 0) {
                const specData = Object.entries(data.specs).map(([key, value]) => [key, value]);
                
                doc.autoTable({
                    startY: y,
                    head: [['参数名称', '参数值']],
                    body: specData,
                    theme: 'grid',
                    headStyles: { 
                        fillColor: [102, 126, 234],
                        fontSize: 11,
                        fontStyle: 'bold'
                    },
                    bodyStyles: {
                        fontSize: 10
                    }
                });

                y = doc.lastAutoTable.finalY + 15;
            }

            // 价格信息
            if (data.prices && Object.keys(data.prices).length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(102, 126, 234);
                doc.text('价格信息', 20, y);
                y += 10;

                const priceData = [];
                
                if (data.prices.newMachine) {
                    priceData.push([
                        '新机价格',
                        `${data.prices.newMachine.min} - ${data.prices.newMachine.max} ${data.prices.newMachine.unit}`,
                        data.prices.newMachine.source || '网络采集'
                    ]);
                }

                if (data.prices.used) {
                    priceData.push([
                        '二手价格',
                        `${data.prices.used.min} - ${data.prices.used.max} ${data.prices.used.unit}`,
                        '市场参考'
                    ]);
                }

                if (data.prices.rental) {
                    const rentalInfo = [];
                    if (data.prices.rental.daily) rentalInfo.push(`日租:${data.prices.rental.daily}元`);
                    if (data.prices.rental.monthly) rentalInfo.push(`月租:${data.prices.rental.monthly}元`);
                    
                    priceData.push([
                        '租赁价格',
                        rentalInfo.join(', '),
                        '市场参考'
                    ]);
                }

                if (priceData.length > 0) {
                    doc.autoTable({
                        startY: y,
                        head: [['价格类型', '价格区间', '数据来源']],
                        body: priceData,
                        theme: 'grid',
                        headStyles: { fillColor: [40, 167, 69] }
                    });
                }
            }

            // 报告说明
            y = doc.internal.pageSize.getHeight() - 30;
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text('注：本报告数据通过网络爬虫自动采集，仅供参考。', 20, y);
            doc.text('实际价格请以厂家和经销商最新报价为准。', 20, y + 5);
        }
    }

    // ==================== API接口 ====================
    const crawler = new MachineryDataCrawler();
    const pdfGenerator = new PDFReportGenerator();

    // 暴露给网页的全局API
    window.MachineryCrawler = {
        // 爬取数据
        async crawlData(keyword) {
            console.log('📡 收到爬取请求:', keyword);
            
            try {
                const data = await crawler.crawl(keyword);
                
                if (!data) {
                    return {
                        success: false,
                        message: '未能从外部网站爬取到数据',
                        keyword: keyword
                    };
                }

                return {
                    success: true,
                    message: '数据爬取成功',
                    keyword: keyword,
                    data: data
                };
            } catch (error) {
                return {
                    success: false,
                    message: error.message,
       ==================== 立即注入API ====================
    console.log('🚀 立即注入API到页面...');
    
    // 立即设置就绪标志（最高优先级）
    window.__CRAWLER_ENGINE_READY__ = true;
    window.__CRAWLER_ENGINE_VERSION__ = '3.3.0';
    
    console.log('✅ 全局标志已设置');
    console.log('  - window.__CRAWLER_ENGINE_READY__ =', window.__CRAWLER_ENGINE_READY__);
    console.log('  - window.MachineryCrawler =', typeof window.MachineryCrawler);
    
    // 触发就绪事件（多次触发确保被捕获）
    function triggerReadyEvent() {
        const event = new CustomEvent('MachineryEngineReady', {
            detail: { version: '3.3.0', timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(event);
        console.log('✅ 已触发就绪事件');
    }
    
    // 立即触发一次
    triggerReadyEvent();
    
    // DOM加载后再触发一次
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOM已加载，再次触发就绪事件');
            triggerReadyEvent();
        });
    }
    
    // 页面完全加载后再触发一次
    window.addEventListener('load', () => {
        console.log('📄 页面完全加载，最后一次触发就绪事件');
        triggerReadyEvent();
    });
    
    console.log('✅ 爬虫引擎API已注入到 window.MachineryCrawler');
    console.log('📋 可用方法: crawlData(keyword), generatePDF(data, keyword), downloadPDF(blob, fileName)');
    console.log('🔍 检测方式: window.__CRAWLER_ENGINE_READY__ === true');
    console.log('🎯 引擎初始化完成！
                };
            }
        },

        // 下载PDF
        downloadPDF(blob, fileName) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    // 通知网页爬虫引擎已就绪
    console.log('🚀 准备注入API到页面...');
    
    // 立即设置就绪标志
    window.__CRAWLER_ENGINE_READY__ = true;
    window.__CRAWLER_ENGINE_VERSION__ = '3.1.0';
    
    // 触发就绪事件
    const readyEvent = new CustomEvent('MachineryEngineReady', {
        detail: { version: '3.1.0', timestamp: new Date().toISOString() }
    });
    
    // 延迟触发，确保页面监听器已注册
    setTimeout(() => {
        window.dispatchEvent(readyEvent);
        console.log('✅ 已触发就绪事件');
    }, 500);

    console.log('✅ 爬虫引擎API已注入到 window.MachineryCrawler');
    console.log('📋 可用方法: crawlData(keyword), generatePDF(data, keyword), downloadPDF(blob, fileName)');
    console.log('🔍 检测方式: window.__CRAWLER_ENGINE_READY__ === true');

})();
