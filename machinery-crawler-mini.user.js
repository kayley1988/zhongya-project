// ==UserScript==
// @name         铁甲网爬虫-最小测试版
// @namespace    http://www.jinzhe.asia/
// @version      1.0.0
// @description  最小测试版：爬取铁甲网并导出Excel
// @author       金哲工程机械
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-end
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    console.log('🚀 铁甲网爬虫-最小测试版 已启动');

    // 获取页面window
    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // 铁甲网爬虫类
    class TiegaCrawler {
        async crawl(keyword) {
            console.log('🕷️ 开始爬取铁甲网:', keyword);
            
            const url = 'https://www.tiega.cn/search?q=' + encodeURIComponent(keyword);
            console.log('📍 URL:', url);
            
            try {
                const html = await this.fetch(url);
                const data = this.parse(html, keyword);
                console.log('✅ 爬取成功:', data);
                return { success: true, data };
            } catch (error) {
                console.error('❌ 爬取失败:', error);
                return { success: false, message: error.message };
            }
        }

        fetch(url) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    timeout: 15000,
                    onload: (response) => {
                        if (response.status === 200) {
                            resolve(response.responseText);
                        } else {
                            reject(new Error('HTTP ' + response.status));
                        }
                    },
                    onerror: () => reject(new Error('网络错误')),
                    ontimeout: () => reject(new Error('请求超时'))
                });
            });
        }

        parse(html, keyword) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const text = doc.body.innerText;
            
            // 提取数据
            const result = {
                关键词: keyword,
                设备类型: this.extractType(text),
                吨位: this.extractTonnage(text),
                数据来源: '铁甲网',
                爬取时间: new Date().toLocaleString('zh-CN'),
                原始文本长度: text.length + '字符'
            };

            // 提取表格数据
            const specs = this.extractSpecs(doc);
            Object.assign(result, specs);

            return result;
        }

        extractType(text) {
            const types = ['汽车起重机', '履带起重机', '塔式起重机', '挖掘机', '装载机'];
            for (const type of types) {
                if (text.includes(type)) return type;
            }
            return '工程机械';
        }

        extractTonnage(text) {
            const match = text.match(/(\d+)\s*[吨t]/i);
            return match ? match[1] + '吨' : '-';
        }

        extractSpecs(doc) {
            const specs = {};
            let count = 0;
            
            // 从表格提取（最多10条）
            doc.querySelectorAll('table tr').forEach(row => {
                if (count >= 10) return;
                
                const cells = row.querySelectorAll('td, th');
                if (cells.length >= 2) {
                    const key = cells[0].innerText.trim();
                    const value = cells[1].innerText.trim();
                    
                    if (key && value && value !== '-' && key.length < 20) {
                        specs[key] = value;
                        count++;
                    }
                }
            });

            return specs;
        }
    }

    // Excel导出类
    class ExcelExporter {
        async loadLibrary() {
            if (win.XLSX) {
                console.log('✅ SheetJS 已存在');
                return true;
            }

            console.log('📦 加载 SheetJS...');
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
                script.onload = () => {
                    console.log('✅ SheetJS 加载成功');
                    resolve(true);
                };
                script.onerror = () => reject(new Error('SheetJS加载失败'));
                document.head.appendChild(script);
            });
        }

        async export(data, filename) {
            await this.loadLibrary();
            
            const XLSX = win.XLSX;
            
            // 创建工作表
            const ws = XLSX.utils.json_to_sheet([data]);
            
            // 创建工作簿
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '爬取数据');
            
            // 导出文件
            const fname = filename || `铁甲网_${Date.now()}.xlsx`;
            XLSX.writeFile(wb, fname);
            
            console.log('💾 Excel已导出:', fname);
            return fname;
        }
    }

    // 注入全局API
    const crawler = new TiegaCrawler();
    const exporter = new ExcelExporter();

    win.TiegaTest = {
        // 爬取数据
        crawl: async function(keyword) {
            console.log('📡 API调用: crawl(' + keyword + ')');
            return await crawler.crawl(keyword);
        },

        // 导出Excel
        exportExcel: async function(data, filename) {
            console.log('📊 API调用: exportExcel');
            return await exporter.export(data, filename);
        },

        // 一键测试：爬取+导出
        test: async function(keyword) {
            console.log('🧪 开始一键测试:', keyword);
            
            const result = await crawler.crawl(keyword);
            
            if (result.success) {
                const filename = await exporter.export(result.data, keyword + '.xlsx');
                console.log('✅ 测试完成！文件:', filename);
                return { success: true, filename };
            } else {
                console.error('❌ 测试失败:', result.message);
                return result;
            }
        }
    };

    console.log('✅ API已注入: window.TiegaTest');
    console.log('📖 使用方法: window.TiegaTest.test("XGC88000")');

})();
