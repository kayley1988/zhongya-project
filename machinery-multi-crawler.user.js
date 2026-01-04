// ==UserScript==
// @name         多网站爬虫引擎-自动打开版
// @namespace    http://www.jinzhe.asia/
// @version      2.0.0
// @description  自动打开多个网站并爬取数据
// @author       金哲工程机械
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        unsafeWindow
// @run-at       document-end
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    console.log('🚀 多网站爬虫引擎 v2.0.0 已启动');

    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // 数据源配置（真实工程机械网站）
    const SOURCES = [
        { 
            name: '铁甲网', 
            url: 'https://www.cehome.com/search/?q=',
            match: 'cehome.com'
        },
        { 
            name: '工程机械在线', 
            url: 'https://www.cmol.com/jixie/search.aspx?keyword=',
            match: 'cmol.com'
        },
        { 
            name: '慧聪工程机械网', 
            url: 'https://info.cm.hc360.com/zt/search/list-',
            match: 'hc360.com',
            suffix: '.html'
        },
        { 
            name: '第一工程机械网', 
            url: 'https://www.d1cm.com/search.htm?q=',
            match: 'd1cm.com'
        },
        { 
            name: '百度搜索', 
            url: 'https://www.baidu.com/s?wd=',
            match: 'baidu.com',
            keywords: ['工程机械', '价格']
        }
    ];

    // 数据提取器
    class DataExtractor {
        extract(keyword) {
            const url = window.location.href;
            const doc = document;
            const text = doc.body.innerText;

            console.log('📊 开始提取数据:', url);

            const data = {
                来源网站: this.getSourceName(url),
                网址: url,
                关键词: keyword,
                设备类型: this.extractType(text),
                吨位: this.extractTonnage(text),
                品牌: this.extractBrand(text),
                爬取时间: new Date().toLocaleString('zh-CN')
            };

            // 提取技术参数
            const specs = this.extractSpecs(doc, text);
            Object.assign(data, specs);

            // 提取价格
            const prices = this.extractPrices(text);
            Object.assign(data, prices);

            console.log('✅ 提取完成:', data);
            return data;
        }

        getSourceName(url) {
            for (const source of SOURCES) {
                if (url.includes(source.match)) {
                    return source.name;
                }
            }
            return '未知来源';
        }

        extractType(text) {
            const types = ['汽车起重机', '履带起重机', '塔式起重机', '挖掘机', '装载机', '推土机'];
            for (const type of types) {
                if (text.includes(type)) return type;
            }
            return '-';
        }

        extractTonnage(text) {
            const match = text.match(/(\d+)\s*[吨t]/i);
            return match ? match[1] + '吨' : '-';
        }

        extractBrand(text) {
            const brands = ['徐工', 'XCMG', '中联', 'ZOOMLION', '三一', 'SANY', '柳工', 'LIUGONG'];
            for (const brand of brands) {
                if (text.includes(brand)) {
                    return brand.includes('XCMG') ? '徐工' : 
                           brand.includes('ZOOMLION') ? '中联' :
                           brand.includes('SANY') ? '三一' :
                           brand.includes('LIUGONG') ? '柳工' : brand;
                }
            }
            return '-';
        }

        extractSpecs(doc, text) {
            const specs = {};
            let count = 0;
            
            // 从表格提取
            doc.querySelectorAll('table tr').forEach(row => {
                if (count >= 8) return;
                
                const cells = row.querySelectorAll('td, th');
                if (cells.length >= 2) {
                    let key = cells[0].innerText.trim();
                    const value = cells[1].innerText.trim();
                    
                    if (key && value && value !== '-' && key.length < 15 && value.length < 50) {
                        // 清理key
                        key = key.replace(/[：:]/g, '').trim();
                        specs[key] = value;
                        count++;
                    }
                }
            });

            // 如果没有提取到，尝试正则
            if (Object.keys(specs).length === 0) {
                const patterns = {
                    '最大起重量': /最大起重量[：:]\s*([^\n\r，,；;]{1,30})/,
                    '主臂长度': /主臂长度[：:]\s*([^\n\r，,；;]{1,30})/,
                    '发动机': /发动机[：:]\s*([^\n\r，,；;]{1,30})/,
                    '额定功率': /额定功率[：:]\s*([^\n\r，,；;]{1,30})/
                };

                for (const [key, pattern] of Object.entries(patterns)) {
                    const match = text.match(pattern);
                    if (match) specs[key] = match[1].trim();
                }
            }

            return specs;
        }

        extractPrices(text) {
            const prices = {};
            
            // 新机价格
            const newMatch = text.match(/新机[^\d]*(\d+\.?\d*)\s*[-~至]\s*(\d+\.?\d*)\s*万/i);
            if (newMatch) {
                prices['新机价格'] = `${newMatch[1]}-${newMatch[2]}万元`;
            } else {
                const singleMatch = text.match(/(?:价格|报价)[^\d]*(\d+\.?\d*)\s*万/i);
                if (singleMatch) {
                    prices['参考价格'] = singleMatch[1] + '万元';
                }
            }

            // 二手机价格
            const usedMatch = text.match(/二手[^\d]*(\d+\.?\d*)\s*[-~至]\s*(\d+\.?\d*)\s*万/i);
            if (usedMatch) {
                prices['二手价格'] = `${usedMatch[1]}-${usedMatch[2]}万元`;
            }

            return prices;
        }
    }

    // 数据管理器（使用localStorage）
    class DataManager {
        constructor() {
            this.storageKey = 'MACHINERY_CRAWLER_DATA';
            this.statusKey = 'MACHINERY_CRAWLER_STATUS';
        }

        // 保存爬取的数据
        saveData(data) {
            try {
                const stored = this.getAllData();
                stored.push(data);
                localStorage.setItem(this.storageKey, JSON.stringify(stored));
                console.log('💾 数据已保存到localStorage');
            } catch (e) {
                console.error('❌ 保存失败:', e);
            }
        }

        // 获取所有数据
        getAllData() {
            try {
                const data = localStorage.getItem(this.storageKey);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                return [];
            }
        }

        // 清空数据
        clearData() {
            localStorage.removeItem(this.storageKey);
            console.log('🗑️ 数据已清空');
        }

        // 更新状态
        updateStatus(total, completed) {
            const status = { total, completed, timestamp: Date.now() };
            localStorage.setItem(this.statusKey, JSON.stringify(status));
        }

        // 获取状态
        getStatus() {
            try {
                const status = localStorage.getItem(this.statusKey);
                return status ? JSON.parse(status) : null;
            } catch (e) {
                return null;
            }
        }
    }

    // Excel导出器
    class ExcelExporter {
        async loadLibrary() {
            if (win.XLSX) return true;

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

        async export(dataArray, filename) {
            await this.loadLibrary();
            
            const XLSX = win.XLSX;
            
            // 创建工作表
            const ws = XLSX.utils.json_to_sheet(dataArray);
            
            // 设置列宽
            const colWidths = [
                { wch: 15 }, // 来源网站
                { wch: 12 }, // 关键词
                { wch: 12 }, // 设备类型
                { wch: 10 }, // 吨位
                { wch: 10 }, // 品牌
                { wch: 15 }, // 价格
                { wch: 20 }, // 技术参数
                { wch: 18 }  // 时间
            ];
            ws['!cols'] = colWidths;
            
            // 创建工作簿
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '爬取数据');
            
            // 导出文件
            const fname = filename || `多网站爬取_${Date.now()}.xlsx`;
            XLSX.writeFile(wb, fname);
            
            console.log('💾 Excel已导出:', fname);
            return fname;
        }
    }

    // 初始化
    const extractor = new DataExtractor();
    const dataManager = new DataManager();
    const exporter = new ExcelExporter();

    // 检测是否是搜索结果页面
    function isSearchResultPage() {
        const url = window.location.href;
        return SOURCES.some(source => {
            if (source.match === 'cehome.com') return url.includes('cehome.com/search');
            if (source.match === 'cmol.com') return url.includes('cmol.com') && url.includes('search');
            if (source.match === 'hc360.com') return url.includes('hc360.com/zt/search');
            if (source.match === 'd1cm.com') return url.includes('d1cm.com/search');
            if (source.match === 'baidu.com') return url.includes('baidu.com/s?');
            return false;
        });
    }let keyword = urlParams.get('wd') || urlParams.get('q') || urlParams.get('query') || '未知型号';
        
        // 去除搜索引擎添加的后缀关键词
        keyword = keyword.replace(/\s+(工程机械|价格|参数).*$/g, '').trim();

        console.log('🎯 检测到搜索结果页面，自动提取数据...');
        console.log('📝 关键词:', keyword);
        
        // 等待页面加载完成
        setTimeout(() => {
            try {
                const data = extractor.extract(keyword);
                dataManager.saveData(data);
                
                // 显示提示
                const toast = document.createElement('div');
                toast.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #4CAF50;
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    z-index: 999999;
                    font-size: 14px;
                    font-weight: bold;
                `;
                toast.textContent = '✅ 数据已提取！3秒后自动关闭...';
                document.body.appendChild(toast);

                // 3秒后关闭窗口
                setTimeout(() => {
                    window.close();
                }, 3000);

            } catch (e) {
                console.error('❌ 提取失败:', e);
                
                // 失败也关闭
                setTimeout(() => {
                    window.close();
                }, 3000);
            }
        }, 3000); // 等待3ow.close();
                }, 3000);

            } catch (e) {
                console.error('❌ 提取失败:', e);
            }
        }, 2000); // 等待2秒让页面加载
    }

    // 注入全局API
    win.MultiCrawler = {
        // 获取数据源列表
        getSources: // 组合搜索关键词
                    const searchTerm = source.keywords 
                        ? keyword + ' ' + source.keywords.join(' ')
                        : keyword;
                    
                    const url = source.url + encodeURIComponent(searchTerm);
                    console.log(`📂 打开: ${source.name}`);
                    console.log(`   URL: ${url}`);
                    
                    try {
                        const w = window.open(url, '_blank');
                        if (w) {
                            windows.push(w);
                        } else {
                            console.warn('⚠️ 弹窗被阻止:', source.name);
                        }
                    } catch (e) {
                        console.error('❌ 打开失败:', source.name, e);
                    }
                }, index * 800); // 每个间隔800ms
            });

            dataManager.updateStatus(SOURCES.length, 0);
            
            return {
                success: true,
                count: SOURCES.length,
                message: `已打开${SOURCES.length}个搜索引擎
            SOURCES.forEach((source, index) => {
                setTimeout(() => {
                    const url = source.url + encodeURIComponent(keyword);
                    console.log(`📂 打开: ${source.name} - ${url}`);
                    const w = window.open(url, '_blank');
                    windows.push(w);
                }, index * 500); // 每个间隔500ms
            });

            dataManager.updateStatus(SOURCES.length, 0);
            
            return {
                success: true,
                count: SOURCES.length,
                message: `已打开${SOURCES.length}个网站`
            };
        },

        // 获取已爬取的数据
        getData: function() {
            return dataManager.getAllData();
        },

        // 获取爬取状态
        getStatus: function() {
            const data = dataManager.getAllData();
            const status = dataManager.getStatus();
            return {
                total: status ? status.total : 0,
                completed: data.length,
                data: data
            };
        },

        // 导出Excel
        exportExcel: async function(filename) {
            const data = dataManager.getAllData();
            if (data.length === 0) {
                return { success: false, message: '没有数据可导出' };
            }
            
            try {
                const fname = await exporter.export(data, filename);
                return { success: true, filename: fname, count: data.length };
            } catch (e) {
                return { success: false, message: e.message };
            }
        },

        // 清空数据
        clear: function() {
            dataManager.clearData();
            return { success: true, message: '数据已清空' };
        }
    };

    console.log('✅ API已注入: window.MultiCrawler');
    console.log('📖 当前页面:', isSearchResultPage() ? '搜索结果页' : '普通页面');

})();
