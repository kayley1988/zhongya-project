// 扩展机械数据库 - 更多品牌和机型
// 将此代码添加到主脚本的 machineryDatabase 对象中

const extendedMachineryDatabase = {
    // 中联重科系列
    'QY25V': {
        name: '中联重科QY25V汽车吊',
        params: {
            '起重量': '25t',
            '主臂长度': '41m',
            '最大起升高度': '43m',
            '发动机': '玉柴YC6L280-52',
            '额定功率': '206kW/280PS',
            '行驶速度': '90km/h',
            '轴距': '1300+4600+1350mm',
            '整机质量': '35500kg'
        },
        newPrice: {
            official: '85-92万元',
            dealer: '82-89万元',
            source: '官网指导价'
        },
        usedPrice: [
            { age: '3-5年', price: '44-62万元', condition: '带检测报告' },
            { age: '5-8年', price: '29-40万元', condition: '需过户' },
            { age: '8年以上', price: '17-26万元', condition: '适合配件拆解' }
        ],
        rentPrice: {
            daily: '1700-2100元/天',
            monthly: '4.3-5.2万元/月',
            yearly: '46-56万元/年',
            includes: '含操作手，不含燃油'
        }
    },

    'QY50V': {
        name: '中联重科QY50V汽车吊',
        params: {
            '起重量': '50t',
            '主臂长度': '44m',
            '最大起升高度': '60m',
            '发动机': '潍柴WP12.375E61',
            '额定功率': '276kW/375PS',
            '行驶速度': '85km/h',
            '轴距': '1800+4325+1350mm',
            '整机质量': '47500kg'
        },
        newPrice: {
            official: '165-180万元',
            dealer: '158-172万元',
            source: '官网指导价'
        },
        usedPrice: [
            { age: '3-5年', price: '85-118万元', condition: '带检测报告' },
            { age: '5-8年', price: '62-82万元', condition: '需过户' },
            { age: '8年以上', price: '42-58万元', condition: '适合继续使用' }
        ],
        rentPrice: {
            daily: '3100-3700元/天',
            monthly: '8.2-9.5万元/月',
            yearly: '92-105万元/年',
            includes: '含操作手，不含燃油'
        }
    },

    // 柳工系列
    'TC250C5': {
        name: '柳工TC250C5汽车吊',
        params: {
            '起重量': '25t',
            '主臂长度': '40m',
            '最大起升高度': '42m',
            '发动机': '康明斯ISLe290',
            '额定功率': '213kW/290PS',
            '行驶速度': '85km/h',
            '轴距': '1350+4600+1350mm',
            '整机质量': '34800kg'
        },
        newPrice: {
            official: '80-87万元',
            dealer: '76-83万元',
            source: '官网指导价'
        },
        usedPrice: [
            { age: '3-5年', price: '40-55万元', condition: '带检测报告' },
            { age: '5-8年', price: '26-36万元', condition: '需过户' },
            { age: '8年以上', price: '15-23万元', condition: '适合配件拆解' }
        ],
        rentPrice: {
            daily: '1600-1950元/天',
            monthly: '4.0-4.8万元/月',
            yearly: '43-52万元/年',
            includes: '含操作手，不含燃油'
        }
    },

    // 履带吊系列
    'QUY55': {
        name: '徐工QUY55履带吊',
        params: {
            '起重量': '55t',
            '主臂长度': '54m',
            '最大起升高度': '78m',
            '发动机': '康明斯QSL9-C360',
            '额定功率': '268kW/360PS',
            '行走速度': '1.2km/h',
            '履带宽度': '700mm',
            '整机质量': '58000kg'
        },
        newPrice: {
            official: '280-310万元',
            dealer: '268-295万元',
            source: '官网指导价'
        },
        usedPrice: [
            { age: '3-5年', price: '145-185万元', condition: '带检测报告' },
            { age: '5-8年', price: '105-135万元', condition: '需过户' },
            { age: '8年以上', price: '75-95万元', condition: '适合继续使用' }
        ],
        rentPrice: {
            daily: '4500-5200元/天',
            monthly: '12-14万元/月',
            yearly: '135-155万元/年',
            includes: '含操作手，不含燃油及拖运费'
        }
    },

    // 挖掘机系列
    'XE215C': {
        name: '徐工XE215C挖掘机',
        params: {
            '工作重量': '21.5t',
            '挖掘深度': '6720mm',
            '挖掘半径': '9680mm',
            '发动机': '五十铃4JJ1X',
            '额定功率': '127kW/170PS',
            '行走速度': '5.5/3.5km/h',
            '回转速度': '12rpm',
            '斗容量': '0.93m³'
        },
        newPrice: {
            official: '76-85万元',
            dealer: '72-81万元',
            source: '官网指导价'
        },
        usedPrice: [
            { age: '3-5年', price: '38-52万元', condition: '带检测报告' },
            { age: '5-8年', price: '25-35万元', condition: '需过户' },
            { age: '8年以上', price: '15-22万元', condition: '适合配件拆解' }
        ],
        rentPrice: {
            daily: '1200-1500元/天',
            monthly: '2.8-3.5万元/月',
            yearly: '32-38万元/年',
            includes: '含操作手，不含燃油'
        }
    },

    'CAT320D': {
        name: '卡特彼勒320D挖掘机',
        params: {
            '工作重量': '20.1t',
            '挖掘深度': '6530mm',
            '挖掘半径': '9540mm',
            '发动机': 'Cat C6.6 ACERT',
            '额定功率': '110kW/147PS',
            '行走速度': '5.1/3.1km/h',
            '回转速度': '11.6rpm',
            '斗容量': '0.8-1.2m³'
        },
        newPrice: {
            official: '95-108万元',
            dealer: '90-102万元',
            source: '官网指导价'
        },
        usedPrice: [
            { age: '3-5年', price: '48-65万元', condition: '带检测报告' },
            { age: '5-8年', price: '32-45万元', condition: '需过户' },
            { age: '8年以上', price: '20-28万元', condition: '适合继续使用' }
        ],
        rentPrice: {
            daily: '1400-1700元/天',
            monthly: '3.2-4.0万元/月',
            yearly: '36-44万元/年',
            includes: '含操作手，不含燃油'
        }
    },

    // 装载机系列
    'LW300FN': {
        name: '徐工LW300FN装载机',
        params: {
            '工作重量': '10500kg',
            '额定载重量': '3000kg',
            '铲斗容量': '1.8m³',
            '发动机': '潍柴WP6G125E22',
            '额定功率': '92kW/125PS',
            '行驶速度': '38km/h',
            '最大牵引力': '135kN',
            '转向方式': '铰接转向'
        },
        newPrice: {
            official: '45-52万元',
            dealer: '42-49万元',
            source: '官网指导价'
        },
        usedPrice: [
            { age: '3-5年', price: '22-32万元', condition: '带检测报告' },
            { age: '5-8年', price: '15-22万元', condition: '需过户' },
            { age: '8年以上', price: '8-13万元', condition: '适合配件拆解' }
        ],
        rentPrice: {
            daily: '800-1100元/天',
            monthly: '1.8-2.5万元/月',
            yearly: '20-28万元/年',
            includes: '含操作手，不含燃油'
        }
    },

    // 推土机系列
    'TY230': {
        name: '徐工TY230推土机',
        params: {
            '工作重量': '23000kg',
            '发动机功率': '162kW/220PS',
            '推土铲容量': '4.3m³',
            '最大推土力': '243kN',
            '行驶速度': '前进3档/后退3档',
            '爬坡能力': '30°',
            '燃油箱容量': '360L',
            '液压油箱': '165L'
        },
        newPrice: {
            official: '155-172万元',
            dealer: '148-165万元',
            source: '官网指导价'
        },
        usedPrice: [
            { age: '3-5年', price: '78-105万元', condition: '带检测报告' },
            { age: '5-8年', price: '55-75万元', condition: '需过户' },
            { age: '8年以上', price: '35-48万元', condition: '适合继续使用' }
        ],
        rentPrice: {
            daily: '2800-3400元/天',
            monthly: '7.5-9万元/月',
            yearly: '85-100万元/年',
            includes: '含操作手，不含燃油'
        }
    }
};

// 关键词别名映射 - 用于更好的关键词识别
const keywordAliases = {
    // 汽车吊别名
    '汽车吊': ['吊车', '汽吊', '起重机', '移动吊'],
    '25吨汽车吊': ['25T汽车吊', '25t吊车', '25吨吊车'],
    '50吨汽车吊': ['50T汽车吊', '50t吊车', '50吨吊车'],
    
    // 履带吊别名
    '履带吊': ['履带起重机', '履带式起重机'],
    
    // 挖掘机别名
    '挖掘机': ['挖机', '挖土机', '反铲'],
    '20吨挖掘机': ['20t挖机', '200级挖机'],
    
    // 装载机别名
    '装载机': ['装载车', '铲车', '推土机'],
    '3吨装载机': ['3t装载机', '30装载机'],
    
    // 品牌别名
    '徐工': ['XCMG', 'xcmg'],
    '三一': ['SANY', 'sany', '三一重工'],
    '中联': ['ZOOMLION', 'zoomlion', '中联重科'],
    '柳工': ['LIUGONG', 'liugong', '柳工机械'],
    '卡特': ['CAT', 'cat', 'Caterpillar', '卡特彼勒']
};

// 价格范围计算器
const priceCalculator = {
    // 计算购买vs租赁成本对比
    calculateRentVsBuy(buyPrice, rentPrice, months) {
        const buyPriceNum = parseFloat(buyPrice.replace(/[万元-]/g, ''));
        const rentPriceNum = parseFloat(rentPrice.replace(/[万元-]/g, ''));
        
        const totalRentCost = rentPriceNum * months;
        const residualValue = buyPriceNum * 0.7; // 假设残值70%
        const actualBuyCost = buyPriceNum - residualValue;
        
        return {
            rentCost: totalRentCost,
            buyCost: actualBuyCost,
            recommendation: totalRentCost < actualBuyCost ? '建议租赁' : '建议购买'
        };
    },
    
    // 计算折旧价格
    calculateDepreciation(originalPrice, years) {
        const price = parseFloat(originalPrice.replace(/[万元-]/g, ''));
        const depreciation = Math.min(years * 0.08, 0.6); // 年折旧8%，最高60%
        const currentValue = price * (1 - depreciation);
        return `${Math.round(currentValue)}-${Math.round(currentValue * 1.15)}万元`;
    }
};

// 区域价格调整系数
const regionalPriceAdjustment = {
    '华东': 1.0,    // 基准价格
    '华南': 1.05,   // 略高5%
    '华北': 0.95,   // 略低5%
    '西南': 0.90,   // 较低10%
    '西北': 0.85,   // 更低15%
    '东北': 0.88    // 较低12%
};

// 使用小时数与价格关系
const hoursPriceRelation = {
    '0-2000小时': 1.0,      // 原价
    '2000-5000小时': 0.85,  // 85%
    '5000-8000小时': 0.70,  // 70%
    '8000-12000小时': 0.55, // 55%
    '12000小时以上': 0.40   // 40%
};