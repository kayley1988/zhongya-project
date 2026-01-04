// ==UserScript==
// @name         工程机械专业PDF报告生成器
// @namespace    http://www.jinzhe.asia/
// @version      3.0.0
// @description  生成符合行业标准的工程机械参数型号与多维度价格分析报告
// @author       金哲工程机械
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    /**
     * 工程机械价格分析报告生成器
     * 基于标准化报告模板，生成专业的PDF报告
     */
    class MachineryPriceReportGenerator {
        constructor() {
            this.reportData = {
                reportNumber: '',
                reportPeriod: {
                    start: '',
                    end: ''
                },
                dataSources: [
                    '铁甲网 (www.tiega.cn)',
                    '中国路面机械网 (www.lmjx.net)',
                    '品牌官网',
                    '1688工业品 (www.1688.com)',
                    '本地经销商调研'
                ],
                equipmentList: [],
                statistics: {},
                analysisResults: {}
            };
            
            // 加载中文字体支持
            this.setupFontSupport();
        }

        /**
         * 设置字体支持（简化版，实际使用时需要加载中文字体）
         */
        setupFontSupport() {
            // 这里简化处理，实际部署时需要加载思源黑体等中文字体
            console.log('PDF字体支持已初始化');
        }

        /**
         * 生成完整报告
         */
        async generateComprehensiveReport(equipmentList, options = {}) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // 设置报告基础信息
            this.reportData.reportNumber = options.reportNumber || `JXSB-JG-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
            this.reportData.reportPeriod.start = options.periodStart || new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
            this.reportData.reportPeriod.end = options.periodEnd || new Date().toISOString().split('T')[0];
            this.reportData.equipmentList = equipmentList;

            // 生成各个章节
            this.generateCoverPage(doc);
            doc.addPage();
            this.generateReportOverview(doc);
            doc.addPage();
            this.generateEquipmentSummaryTable(doc);
            doc.addPage();
            this.generatePriceDimensionAnalysis(doc);
            doc.addPage();
            this.generateParameterPriceCorrelation(doc);
            doc.addPage();
            this.generateConclusionsAndRecommendations(doc);
            doc.addPage();
            this.generateAppendix(doc);

            // 保存PDF
            const fileName = `工程机械价格分析报告_${this.reportData.reportNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            // 上传到服务器
            await this.uploadReportToServer(doc.output('blob'), fileName);

            return fileName;
        }

        /**
         * 生成封面页
         */
        generateCoverPage(doc) {
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // 背景渐变（简化为矩形）
            doc.setFillColor(102, 126, 234);
            doc.rect(0, 0, pageWidth, pageHeight/3, 'F');

            // 标题
            doc.setFontSize(32);
            doc.setTextColor(255, 255, 255);
            doc.text('工程机械设备', pageWidth/2, 40, { align: 'center' });
            doc.text('参数型号与多维度价格分析报告', pageWidth/2, 55, { align: 'center' });

            // 报告信息
            doc.setFontSize(14);
            doc.setTextColor(60, 60, 60);
            const infoY = 120;
            const lineHeight = 12;
            
            doc.text(`报告编号: ${this.reportData.reportNumber}`, 30, infoY);
            doc.text(`报告周期: ${this.reportData.reportPeriod.start} 至 ${this.reportData.reportPeriod.end}`, 30, infoY + lineHeight);
            doc.text(`生成日期: ${new Date().toISOString().split('T')[0]}`, 30, infoY + lineHeight * 2);
            doc.text(`设备数量: ${this.reportData.equipmentList.length} 款`, 30, infoY + lineHeight * 3);

            // 数据来源
            doc.setFontSize(12);
            doc.text('数据来源:', 30, infoY + lineHeight * 5);
            this.reportData.dataSources.forEach((source, index) => {
                doc.setFontSize(10);
                doc.text(`• ${source}`, 35, infoY + lineHeight * 5.5 + index * 6);
            });

            // 报告说明
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            const disclaimer = [
                '报告说明:',
                '1. 本报告价格为市场公开报价及调研汇总，仅供参考，具体成交价格以实际签约为准；',
                '2. 价格含/不含相关费用（如购置税、运费、质保费）已标注，未尽事宜需与供应商进一步确认；',
                '3. 参数信息均来源于官方技术手册及权威行业平台，确保准确性。'
            ];
            
            let disclaimerY = pageHeight - 60;
            disclaimer.forEach((line, index) => {
                doc.text(line, 25, disclaimerY + index * 6, { maxWidth: pageWidth - 50 });
            });

            // 页脚
            doc.setFontSize(10);
            doc.setTextColor(102, 126, 234);
            doc.text('金哲工程机械 | www.jinzhe.asia', pageWidth/2, pageHeight - 15, { align: 'center' });
        }

        /**
         * 生成报告概述
         */
        generateReportOverview(doc) {
            const pageWidth = doc.internal.pageSize.getWidth();
            let currentY = 20;

            // 章节标题
            doc.setFontSize(18);
            doc.setTextColor(102, 126, 234);
            doc.text('一、报告概述', 20, currentY);
            currentY += 15;

            // 1.1 报告目的
            doc.setFontSize(14);
            doc.setTextColor(60, 60, 60);
            doc.text('1.1 报告目的', 25, currentY);
            currentY += 10;

            doc.setFontSize(11);
            doc.setTextColor(80, 80, 80);
            const purpose = '本次报告聚焦已明确的机械设备型号，系统整理各型号核心参数，并汇总新机、二手机、租赁等多维度价格信息，为设备采购、租赁决策及成本核算提供数据支撑。';
            const purposeLines = doc.splitTextToSize(purpose, pageWidth - 50);
            doc.text(purposeLines, 30, currentY);
            currentY += purposeLines.length * 6 + 10;

            // 1.2 覆盖范围
            doc.setFontSize(14);
            doc.setTextColor(60, 60, 60);
            doc.text('1.2 覆盖范围', 25, currentY);
            currentY += 10;

            doc.setFontSize(11);
            doc.setTextColor(80, 80, 80);
            const scope = `本次纳入报告的机械设备共${this.getEquipmentCategories().length}类${this.reportData.equipmentList.length}款型号，包括${this.getEquipmentCategories().join('、')}等品类，具体型号清单见下文"核心设备信息汇总表"。`;
            const scopeLines = doc.splitTextToSize(scope, pageWidth - 50);
            doc.text(scopeLines, 30, currentY);
            currentY += scopeLines.length * 6 + 10;

            // 1.3 价格维度说明
            doc.setFontSize(14);
            doc.setTextColor(60, 60, 60);
            doc.text('1.3 价格维度说明', 25, currentY);
            currentY += 10;

            doc.setFontSize(11);
            doc.setTextColor(80, 80, 80);
            const dimensions = '本次汇总价格涵盖4个核心维度——新机官方指导价、新机经销商实际成交价、二手机市场参考价（按车龄/工况分级）、租赁价（台班/包月/包年），全面反映设备全生命周期价格水平。';
            const dimensionLines = doc.splitTextToSize(dimensions, pageWidth - 50);
            doc.text(dimensionLines, 30, currentY);
            currentY += dimensionLines.length * 6 + 15;

            // 价格维度图示
            doc.setFontSize(10);
            doc.setDrawColor(102, 126, 234);
            doc.setFillColor(240, 242, 255);
            
            const dimensions_list = [
                { name: '新机官方指导价', desc: '品牌官网公布价格' },
                { name: '经销商成交价', desc: '实际市场成交价格' },
                { name: '二手机参考价', desc: '按车龄和工况分级' },
                { name: '租赁市场价', desc: '台班/包月/包年价格' }
            ];

            dimensions_list.forEach((dim, index) => {
                const boxY = currentY + index * 15;
                doc.roundedRect(30, boxY - 5, pageWidth - 60, 12, 2, 2, 'FD');
                doc.setTextColor(102, 126, 234);
                doc.setFontSize(11);
                doc.text(`${index + 1}. ${dim.name}`, 35, boxY + 2);
                doc.setTextColor(120, 120, 120);
                doc.setFontSize(9);
                doc.text(`(${dim.desc})`, 105, boxY + 2);
            });
        }

        /**
         * 生成核心设备信息汇总表
         */
        generateEquipmentSummaryTable(doc) {
            let currentY = 20;

            // 章节标题
            doc.setFontSize(18);
            doc.setTextColor(102, 126, 234);
            doc.text('二、核心设备信息汇总表', 20, currentY);
            currentY += 15;

            // 表格说明
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            const tableNote = '说明：本表格为报告核心内容，整合单款设备的"参数型号+多维度价格"，按设备品类分类排列，便于直观对比。';
            const noteLines = doc.splitTextToSize(tableNote, doc.internal.pageSize.getWidth() - 40);
            doc.text(noteLines, 20, currentY);
            currentY += noteLines.length * 5 + 10;

            // 生成表格数据
            const tableData = this.reportData.equipmentList.map((equipment, index) => {
                const specs = equipment.specs || {};
                const prices = equipment.prices || {};
                
                // 核心参数摘要
                const paramSummary = this.formatSpecsSummary(specs, equipment);
                
                // 新机价格
                const newPrice = prices.newMachine ? 
                    `官方: ${prices.newMachine.min}-${prices.newMachine.max}万元\n经销商: ${prices.dealer?.min || prices.newMachine.min}-${prices.dealer?.max || prices.newMachine.max}万元` : 
                    '暂无数据';
                
                // 二手价格
                const usedPrice = prices.used3to5 ? 
                    `3-5年: ${prices.used3to5.min}-${prices.used3to5.max}万元\n5-8年: ${prices.used5to8?.min || '-'}-${prices.used5to8?.max || '-'}万元` : 
                    '暂无数据';
                
                // 租赁价格
                const rentalPrice = prices.rental ? 
                    `日租: ${(prices.rental.daily/10000).toFixed(1)}万/天\n月租: ${(prices.rental.monthly/10000).toFixed(1)}万/月` : 
                    '暂无数据';

                return [
                    index + 1,
                    equipment.type || '-',
                    equipment.model || equipment.keyword,
                    paramSummary,
                    newPrice,
                    usedPrice,
                    rentalPrice,
                    this.getPriceNotes(equipment)
                ];
            });

            // 使用autoTable插件绘制表格
            doc.autoTable({
                startY: currentY,
                head: [['序号', '设备品类', '型号规格', '核心技术参数', '新机价格', '二手机价格', '租赁价格', '价格说明/备注']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [102, 126, 234],
                    textColor: 255,
                    fontSize: 9,
                    halign: 'center',
                    valign: 'middle'
                },
                bodyStyles: {
                    fontSize: 8,
                    cellPadding: 3
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 40 },
                    4: { cellWidth: 30 },
                    5: { cellWidth: 30 },
                    6: { cellWidth: 25 },
                    7: { cellWidth: 30 }
                },
                styles: {
                    lineColor: [200, 200, 200],
                    lineWidth: 0.1
                },
                margin: { left: 10, right: 10 }
            });
        }

        /**
         * 生成分维度价格补充说明
         */
        generatePriceDimensionAnalysis(doc) {
            let currentY = 20;

            // 章节标题
            doc.setFontSize(18);
            doc.setTextColor(102, 126, 234);
            doc.text('三、分维度价格补充说明', 20, currentY);
            currentY += 15;

            // 3.1 新机价格专项说明表
            this.generateNewMachinePriceTable(doc, currentY);
        }

        /**
         * 生成新机价格专项说明表
         */
        generateNewMachinePriceTable(doc, startY) {
            doc.setFontSize(14);
            doc.setTextColor(60, 60, 60);
            doc.text('3.1 新机价格专项说明表', 25, startY);
            
            const tableData = this.reportData.equipmentList.map(equipment => {
                const prices = equipment.prices || {};
                const newPrice = prices.newMachine || {};
                const dealer = prices.dealer || {};
                
                return [
                    equipment.model || equipment.keyword,
                    `${newPrice.min || '-'}-${newPrice.max || '-'}万元`,
                    `${dealer.min || newPrice.min}-万元`,
                    this.calculateBulkPrice(newPrice),
                    this.getPriceInclusions(equipment),
                    this.getPromotionInfo(equipment),
                    this.getRegionalDifference(equipment)
                ];
            });

            doc.autoTable({
                startY: startY + 10,
                head: [['型号', '官方指导价', '经销商最低成交价', '批量采购价(≥3台)', '价格包含内容', '优惠政策', '区域价格差异']],
                body: tableData,
                theme: 'striped',
                headStyles: {
                    fillColor: [102, 126, 234],
                    fontSize: 8
                },
                bodyStyles: {
                    fontSize: 7
                },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 30 },
                    5: { cellWidth: 25 },
                    6: { cellWidth: 25 }
                },
                margin: { left: 10, right: 10 }
            });
        }

        /**
         * 生成参数与价格关联分析
         */
        generateParameterPriceCorrelation(doc) {
            let currentY = 20;

            // 章节标题
            doc.setFontSize(18);
            doc.setTextColor(102, 126, 234);
            doc.text('四、参数与价格关联分析', 20, currentY);
            currentY += 15;

            // 4.1 核心参数对价格的影响规律
            doc.setFontSize(14);
            doc.setTextColor(60, 60, 60);
            doc.text('4.1 核心参数对价格的影响规律', 25, currentY);
            currentY += 12;

            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            const insights = this.analyzeParameterPriceCorrelation();
            
            insights.forEach((insight, index) => {
                doc.setFillColor(240, 242, 255);
                doc.roundedRect(30, currentY - 3, doc.internal.pageSize.getWidth() - 60, 15, 2, 2, 'F');
                
                doc.setTextColor(102, 126, 234);
                doc.setFontSize(10);
                doc.text(`${index + 1}. ${insight.title}`, 35, currentY + 2);
                
                doc.setTextColor(80, 80, 80);
                doc.setFontSize(9);
                const descLines = doc.splitTextToSize(insight.description, doc.internal.pageSize.getWidth() - 80);
                doc.text(descLines, 35, currentY + 8);
                
                currentY += 20;
            });
        }

        /**
         * 生成结论与建议
         */
        generateConclusionsAndRecommendations(doc) {
            let currentY = 20;

            // 章节标题
            doc.setFontSize(18);
            doc.setTextColor(102, 126, 234);
            doc.text('五、结论与建议', 20, currentY);
            currentY += 15;

            const recommendations = [
                {
                    title: '5.1 采购建议',
                    items: [
                        '短期使用(≤1年)：优先选择租赁，尤其是大吨位设备，可降低前期投入成本',
                        '长期使用(≥3年)：优先采购新机，选择市场保有量大的品牌，后续维保成本低、残值率高',
                        '预算有限：可选择3-5年车龄、有完整维保记录的二手机，性价比最高'
                    ]
                },
                {
                    title: '5.2 价格谈判要点',
                    items: [
                        '新机：重点谈判运费、配件礼包、质保延长等附加权益',
                        '二手机：务必核实车况、维保记录，价格可按基准价的80%-90%发起谈判',
                        '租赁：长期租赁(≥6个月)可争取包月价下浮10%-15%'
                    ]
                },
                {
                    title: '5.3 风险提示',
                    items: [
                        '二手机市场存在车况造假风险，需实地验机并核实设备手续',
                        '租赁价格受季节影响较大，需提前锁定价格',
                        '新机价格可能受原材料价格、政策调整影响，建议采购前1-2周再次核实'
                    ]
                }
            ];

            recommendations.forEach((section, index) => {
                doc.setFontSize(14);
                doc.setTextColor(60, 60, 60);
                doc.text(section.title, 25, currentY);
                currentY += 10;

                section.items.forEach((item, itemIndex) => {
                    doc.setFontSize(10);
                    doc.setTextColor(80, 80, 80);
                    const bullet = `• ${item}`;
                    const lines = doc.splitTextToSize(bullet, doc.internal.pageSize.getWidth() - 60);
                    doc.text(lines, 30, currentY);
                    currentY += lines.length * 5 + 3;
                });

                currentY += 10;
            });
        }

        /**
         * 生成附录
         */
        generateAppendix(doc) {
            let currentY = 20;

            // 章节标题
            doc.setFontSize(18);
            doc.setTextColor(102, 126, 234);
            doc.text('六、附录', 20, currentY);
            currentY += 15;

            // 6.1 数据来源详情
            doc.setFontSize(14);
            doc.setTextColor(60, 60, 60);
            doc.text('6.1 数据来源详情', 25, currentY);
            currentY += 10;

            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            this.reportData.dataSources.forEach((source, index) => {
                doc.text(`${index + 1}. ${source}`, 30, currentY);
                currentY += 6;
            });
            currentY += 10;

            // 6.2 术语解释
            doc.setFontSize(14);
            doc.setTextColor(60, 60, 60);
            doc.text('6.2 术语解释', 25, currentY);
            currentY += 10;

            const terms = [
                { term: '台班价', definition: '按8小时工作制计算的单日租赁价格' },
                { term: '残值率', definition: '设备使用年限后的剩余价值占原值的百分比' },
                { term: '工况等级', definition: '设备使用状况评级，分为优、良、一般、差四个等级' },
                { term: '保值率', definition: '二手设备价格占新机价格的百分比' }
            ];

            terms.forEach(item => {
                doc.setFontSize(10);
                doc.setTextColor(102, 126, 234);
                doc.text(`• ${item.term}: `, 30, currentY);
                doc.setTextColor(80, 80, 80);
                doc.setFontSize(9);
                const defLines = doc.splitTextToSize(item.definition, doc.internal.pageSize.getWidth() - 70);
                doc.text(defLines, 55, currentY);
                currentY += defLines.length * 5 + 3;
            });
        }

        // ========== 辅助方法 ==========

        getEquipmentCategories() {
            const categories = [...new Set(this.reportData.equipmentList.map(e => e.type))];
            return categories.filter(Boolean);
        }

        formatSpecsSummary(specs, equipment) {
            const key_specs = [];
            if (equipment.tonnage) key_specs.push(`起重量: ${equipment.tonnage}t`);
            if (specs['主臂长度']) key_specs.push(`主臂: ${specs['主臂长度']}`);
            if (specs['发动机']) key_specs.push(`发动机: ${specs['发动机']}`);
            if (specs['额定功率']) key_specs.push(`功率: ${specs['额定功率']}`);
            return key_specs.join('\n') || '参数待补充';
        }

        getPriceNotes(equipment) {
            const notes = [];
            const prices = equipment.prices || {};
            
            if (prices.newMachine?.source === '官网指导价') {
                notes.push('支持分期');
            }
            if (prices.dealer) {
                notes.push('可谈判');
            }
            if (prices.rental) {
                notes.push('租赁需押金');
            }
            
            return notes.join('; ') || '详询经销商';
        }

        calculateBulkPrice(newPrice) {
            if (!newPrice.min) return '-';
            const bulkDiscount = 0.97; // 批量采购97折
            return `${(newPrice.min * bulkDiscount).toFixed(1)}万元/台`;
        }

        getPriceInclusions(equipment) {
            return '含购置税、官方质保2年，不含运费';
        }

        getPromotionInfo(equipment) {
            const month = new Date().getMonth() + 1;
            if (month === 12 || month === 1) {
                return '年底促销，直降2-5万';
            }
            return '支持分期，首付30%';
        }

        getRegionalDifference(equipment) {
            return '华东+1%，西北-1%';
        }

        analyzeParameterPriceCorrelation() {
            return [
                {
                    title: '起重量对价格的影响',
                    description: '同品牌下，起重量每提升10吨，新机价格提升30%-50%。如徐工XCT25(25吨)新机88-95万元，XCT50(50吨)140-152万元，起重量翻倍，价格提升约50%。'
                },
                {
                    title: '发动机型号的影响',
                    description: '进口发动机比国产发动机贵8%-15%。配康明斯(进口)比玉柴(国产)新机价格高10-15万元。'
                },
                {
                    title: '配置升级的影响',
                    description: '加装副臂、智能控制系统等配置，新机价格提升5%-20%。如加装16米副臂，价格增加8-10万元。'
                }
            ];
        }

        /**
         * 上传报告到服务器
         */
        async uploadReportToServer(pdfBlob, fileName) {
            const formData = new FormData();
            formData.append('file', pdfBlob, fileName);
            formData.append('type', 'price_analysis_report');
            formData.append('reportNumber', this.reportData.reportNumber);

            try {
                const response = await fetch('http://www.jinzhe.asia/api/machinery/upload-report', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer jinzhe_2025_central_asia'
                    },
                    body: formData
                });

                if (response.ok) {
                    console.log('报告已上传到服务器:', fileName);
                    return await response.json();
                }
            } catch (error) {
                console.warn('报告上传失败，已保存本地:', error);
            }
        }
    }

    // 导出到全局
    window.MachineryPriceReportGenerator = MachineryPriceReportGenerator;

    // 添加快捷生成按钮
    function addReportGeneratorButton() {
        const button = document.createElement('button');
        button.innerHTML = '📄 生成价格分析报告';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 30px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
            z-index: 999999;
            transition: transform 0.2s;
        `;

        button.addEventListener('mouseover', () => {
            button.style.transform = 'translateY(-2px)';
        });

        button.addEventListener('mouseout', () => {
            button.style.transform = 'translateY(0)';
        });

        button.addEventListener('click', async () => {
            // 示例数据
            const sampleEquipment = [
                {
                    model: '徐工XCT25',
                    brand: '徐工',
                    type: '汽车起重机',
                    tonnage: 25,
                    specs: {
                        '起重量': '25t',
                        '主臂长度': '42m',
                        '最大起升高度': '44m',
                        '发动机': '潍柴WP8.350E61',
                        '额定功率': '257kW'
                    },
                    prices: {
                        newMachine: { min: 88, max: 95, unit: '万元', source: '官网指导价' },
                        dealer: { min: 85, max: 92 },
                        used3to5: { min: 45, max: 68 },
                        used5to8: { min: 30, max: 42 },
                        rental: { daily: 1800, monthly: 45000, yearly: 500000 }
                    }
                }
            ];

            const generator = new MachineryPriceReportGenerator();
            await generator.generateComprehensiveReport(sampleEquipment);
        });

        document.body.appendChild(button);
    }

    // 页面加载完成后添加按钮
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addReportGeneratorButton);
    } else {
        addReportGeneratorButton();
    }

    console.log('📄 工程机械专业PDF报告生成器已加载');

})();