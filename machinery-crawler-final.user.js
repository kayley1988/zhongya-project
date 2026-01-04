// ==UserScript==
// @name         工程机械爬虫引擎-全局版
// @namespace    http://www.jinzhe.asia/
// @version      4.1.0
// @description  适用于所有网页的工程机械数据爬取和PDF生成工具
// @author       金哲工程机械
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-end
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 立即初始化 ====================
    console.log('==========================================');
    console.log('%c🤖 工程机械爬虫引擎 v4.1.0 已启动', 'color: #667eea; font-size: 16px; font-weight: bold;');
    console.log('📍 URL:', window.location.href);
    console.log('🌐 全局运行模式');
    console.log('🔧 使用 unsafeWindow 注入到页面');
    console.log('⏰ 执行时间:', new Date().toLocaleTimeString());
    console.log('==========================================');

    // ==================== 数据爬虫引擎 ====================
    class MachineryDataCrawler {
        constructor() {
            this.sources = [
                { name: '铁甲网', url: 'https://www.tiega.cn/search?q=' },
                { name: '路面机械网', url: 'https://www.lmjx.net/search/' }
            ];
        }

        async crawl(keyword) {
            console.log('🕷️ 开始爬取:', keyword);
            
            for (const source of this.sources) {
                try {
                    const url = source.url + encodeURIComponent(keyword);
                    console.log(`访问: ${source.name}`);
                    
                    const data = await this.fetchData(url, source.name);
                    
                    if (data && Object.keys(data.specs).length > 0) {
                        console.log(`✅ ${source.name} 成功`);
                        return data;
                    }
                } catch (error) {
                    console.warn(`⚠️ ${source.name} 失败:`, error.message);
                }
            }
            
            return null;
        }

        fetchData(url, sourceName) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    timeout: 15000,
                    onload: (response) => {
                        try {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(response.responseText, 'text/html');
                            const data = this.parseHTML(doc);
                            data.source = sourceName;
                            resolve(data);
                        } catch (error) {
                            reject(error);
                        }
                    },
                    onerror: () => reject(new Error('网络错误')),
                    ontimeout: () => reject(new Error('超时'))
                });
            });
        }

        parseHTML(doc) {
            const text = doc.body.innerText;
            return {
                type: this.extractType(text),
                tonnage: this.extractTonnage(text),
                specs: this.extractSpecs(doc, text),
                prices: this.extractPrices(text),
                timestamp: new Date().toISOString()
            };
        }

        extractType(text) {
            const types = ['汽车起重机', '履带起重机', '塔式起重机'];
            for (const type of types) {
                if (text.includes(type)) return type;
            }
            return '工程机械';
        }

        extractTonnage(text) {
            const match = text.match(/(\d+)\s*[吨t]/i);
            return match ? parseInt(match[1]) : 0;
        }

        extractSpecs(doc, text) {
            const specs = {};
            
            // 从表格提取
            doc.querySelectorAll('table tr').forEach(row => {
                const cells = row.querySelectorAll('td, th');
                if (cells.length >= 2) {
                    const key = cells[0].innerText.trim();
                    const value = cells[1].innerText.trim();
                    if (key && value && value !== '-') {
                        specs[key] = value;
                    }
                }
            });

            // 正则提取
            const patterns = {
                '起重量': /起重量[：:]\s*([^\n\r，,]+)/,
                '主臂长度': /主臂长度[：:]\s*([^\n\r，,]+)/,
                '发动机': /发动机[：:]\s*([^\n\r，,]+)/
            };

            for (const [key, pattern] of Object.entries(patterns)) {
                if (!specs[key]) {
                    const match = text.match(pattern);
                    if (match) specs[key] = match[1].trim();
                }
            }

            return specs;
        }

        extractPrices(text) {
            const prices = {};
            
            const newPriceMatch = text.match(/(\d+\.?\d*)\s*[-~]\s*(\d+\.?\d*)\s*万/);
            if (newPriceMatch) {
                prices.newMachine = {
                    min: parseFloat(newPriceMatch[1]),
                    max: parseFloat(newPriceMatch[2]),
                    unit: '万元'
                };
            }

            return prices;
        }
    }

    // ==================== PDF生成器 ====================
    class PDFGenerator {
        async loadLibraries() {
            if (window.jspdf) return true;

            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.onload = () => {
                    const script2 = document.createElement('script');
                    script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
                    script2.onload = () => resolve(true);
                    script2.onerror = () => reject(new Error('AutoTable加载失败'));
                    document.head.appendChild(script2);
                };
                script.onerror = () => reject(new Error('jsPDF加载失败'));
                document.head.appendChild(script);
            });
        }

        async generate(data, keyword) {
            await this.loadLibraries();
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // 简单封面
            doc.setFontSize(20);
            doc.text(keyword + ' 价格分析报告', 105, 50, { align: 'center' });
            doc.setFontSize(12);
            doc.text('生成时间: ' + new Date().toLocaleString('zh-CN'), 105, 70, { align: 'center' });

            // 参数表格
            if (Object.keys(data.specs).length > 0) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text('技术参数', 20, 20);

                const tableData = Object.entries(data.specs).map(([k, v]) => [k, v]);
                doc.autoTable({
                    startY: 30,
                    head: [['参数', '值']],
                    body: tableData
                });
            }

            const fileName = `${keyword}_${Date.now()}.pdf`;
            return {
                blob: doc.output('blob'),
                fileName: fileName
            };
        }
    }

    // ==================== 全局API ====================
    const crawler = new MachineryDataCrawler();
    const pdfGen = new PDFGenerator();

    // 获取页面的真实window对象
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    
    console.log('🎯 目标window:', pageWindow === window ? 'GM window' : 'unsafe window (页面真实window)');

    // 强制注入到页面的真实window
    Object.defineProperty(pageWindow, 'MachineryCrawler', {
        value: {
            crawlData: async function(keyword) {
                console.log('📡 crawlData 被调用，参数:', keyword);
                try {
                    const data = await crawler.crawl(keyword);
                    if (!data) {
                        return { success: false, message: '未找到数据' };
                    }
                    return { success: true, data: data };
                } catch (error) {
                    console.error('❌ crawlData 出错:', error);
                    return { success: false, message: error.message };
                }
            },

            generatePDF: async function(data, keyword) {
                console.log('📄 generatePDF 被调用');
                try {
                    const result = await pdfGen.generate(data, keyword);
                    return { success: true, ...result };
                } catch (error) {
                    console.error('❌ generatePDF 出错:', error);
                    return { success: false, message: error.message };
                }
            },

            downloadPDF: function(blob, fileName) {
                console.log('💾 downloadPDF 被调用');
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
            }
        },
        writable: false,
        configurable: false
    });

    console.log('✅ API已注入到:', pageWindow === window ? 'GM window' : 'unsafeWindow (页面可访问)');
    console.log('✅ 方法列表:', Object.keys(pageWindow.MachineryCrawler));
    console.log('✅ crawlData类型:', typeof pageWindow.MachineryCrawler.crawlData);

    // ==================== 设置就绪标志 ====================
    pageWindow.__CRAWLER_ENGINE_READY__ = true;
    pageWindow.__CRAWLER_ENGINE_VERSION__ = '4.1.0';

    console.log('✅ 标志已设置到 pageWindow');
    
    // 立即验证
    console.log('🔍 立即验证API状态:');
    console.log('  - pageWindow.MachineryCrawler存在:', !!pageWindow.MachineryCrawler);
    console.log('  - pageWindow.crawlData存在:', !!pageWindow.MachineryCrawler?.crawlData);
    
    // 延迟验证
    setTimeout(() => {
        console.log('🔍 延迟验证API状态:');
        console.log('  - pageWindow.MachineryCrawler存在:', !!pageWindow.MachineryCrawler);
        console.log('  - pageWindow.crawlData存在:', !!pageWindow.MachineryCrawler?.crawlData);
        console.log('  - generatePDF存在:', !!pageWindow.MachineryCrawler?.generatePDF);
        console.log('  - downloadPDF存在:', !!pageWindow.MachineryCrawler?.downloadPDF);
        
        if (pageWindow.MachineryCrawler) {
            console.log('%c✅ 爬虫引擎已完全就绪！页面可以调用了！', 'color: green; font-size: 14px; font-weight: bold;');
        } else {
            console.error('%c❌ API注入失败！', 'color: red; font-size: 14px; font-weight: bold;');
        }
    }, 500);

    // 触发事件到页面
    const event = new CustomEvent('MachineryEngineReady', {
        detail: { version: '4.1.0' }
    });
    
    pageWindow.dispatchEvent(event);
    setTimeout(() => pageWindow.dispatchEvent(event), 1000);
    
    console.log('==========================================');

})();
