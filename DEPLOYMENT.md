# 工程机械价格分析系统 - 部署指南

## 📋 系统概述

本系统是一套完整的工程机械价格分析解决方案，包括：
- 🌐 **浏览器端**：油猴脚本（价格分析插件 + PDF报告生成器）
- 🖥️ **服务器端**：PHP API + MySQL数据库
- 📊 **Web管理端**：价格数据管理后台
- 📄 **报告系统**：专业PDF报告自动生成

## 🛠️ 技术栈

### 前端技术
- Tampermonkey/Greasemonkey（油猴脚本）
- JavaScript ES6+
- jsPDF + jsPDF-AutoTable（PDF生成）
- Chart.js（数据可视化）
- HTML5 + CSS3

### 后端技术
- PHP 7.4+
- MySQL 8.0+
- RESTful API
- JSON数据格式

### 部署环境
- 阿里云服务器
- 宝塔面板（BT Panel）
- Nginx/Apache
- HTTPS支持

---

## 📦 部署步骤

### 一、服务器环境准备

#### 1.1 登录阿里云服务器
```bash
ssh root@your-server-ip
```

#### 1.2 安装宝塔面板（如未安装）
```bash
# CentOS系统
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh

# Ubuntu系统
wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh
```

#### 1.3 配置宝塔面板
1. 访问宝塔面板：`http://your-server-ip:8888`
2. 安装必要软件栈：
   - Nginx 1.20+
   - PHP 7.4+ （勾选：mysqli、pdo_mysql、fileinfo、gd扩展）
   - MySQL 8.0+
   - phpMyAdmin（可选）

---

### 二、数据库配置

#### 2.1 创建数据库
登录宝塔面板 → 数据库 → 添加数据库
- 数据库名：`jinzhe_machinery`
- 用户名：`jinzhe_db`
- 密码：设置强密码
- 权限：所有人（或指定IP）

#### 2.2 导入数据库结构
```bash
# 上传SQL文件到服务器
cd /www/wwwroot/www.jinzhe.asia/
mkdir -p database
cd database

# 导入主数据库结构
mysql -u jinzhe_db -p jinzhe_machinery < machinery-price-schema.sql

# 导入报告相关表
mysql -u jinzhe_db -p jinzhe_machinery < report-tables.sql
```

或通过phpMyAdmin导入：
1. 登录phpMyAdmin
2. 选择 `jinzhe_machinery` 数据库
3. 导入 → 选择文件 → 执行

#### 2.3 验证数据库
```sql
USE jinzhe_machinery;
SHOW TABLES;
-- 应显示：equipment_prices, price_analysis_logs, generated_reports 等表

SELECT * FROM equipment_prices LIMIT 5;
-- 应显示预置的设备数据
```

---

### 三、API部署

#### 3.1 上传API文件
```bash
# 创建API目录
mkdir -p /www/wwwroot/www.jinzhe.asia/api/machinery

# 上传文件（通过FTP或宝塔面板文件管理）
# 上传以下文件：
# - machinery-price-api.php
# - upload-report.php
```

#### 3.2 配置API文件

编辑 `machinery-price-api.php`：
```php
// 修改数据库配置
define('DB_HOST', 'localhost');
define('DB_NAME', 'jinzhe_machinery');
define('DB_USER', 'jinzhe_db');
define('DB_PASS', '你的数据库密码');
define('API_KEY', 'jinzhe_2025_central_asia'); // 可自定义
```

#### 3.3 设置文件权限
```bash
# 创建上传目录
mkdir -p /www/wwwroot/www.jinzhe.asia/uploads/reports
chmod 755 /www/wwwroot/www.jinzhe.asia/uploads/reports

# 设置API文件权限
chmod 644 /www/wwwroot/www.jinzhe.asia/api/machinery/*.php
```

#### 3.4 配置Nginx（重要）

编辑站点配置：宝塔面板 → 网站 → 设置 → 配置文件

添加API路由规则：
```nginx
location /api/machinery/ {
    try_files $uri $uri/ /api/machinery/machinery-price-api.php?$query_string;
}

location /api/machinery/upload-report {
    try_files $uri /api/machinery/upload-report.php?$query_string;
}

# 允许跨域（如需要）
location /api/ {
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS';
    add_header Access-Control-Allow-Headers 'Content-Type, Authorization';
}
```

重启Nginx：
```bash
nginx -t  # 测试配置
nginx -s reload  # 重载配置
```

---

### 四、Web管理界面部署

#### 4.1 上传Web文件
```bash
mkdir -p /www/wwwroot/www.jinzhe.asia/admin
# 上传 price-dashboard.html 到 admin 目录
```

#### 4.2 配置Web界面

编辑 `price-dashboard.html`，确认API地址正确：
```javascript
const API_BASE = 'http://www.jinzhe.asia/api/machinery';
const API_KEY = 'jinzhe_2025_central_asia';
```

如果启用了HTTPS，修改为：
```javascript
const API_BASE = 'https://www.jinzhe.asia/api/machinery';
```

#### 4.3 访问测试
浏览器访问：`http://www.jinzhe.asia/admin/price-dashboard.html`

---

### 五、油猴脚本安装

#### 5.1 用户端安装

1. **安装Tampermonkey扩展**
   - Chrome：访问 [Tampermonkey官网](https://www.tampermonkey.net/)
   - Firefox：从 Firefox Add-ons 安装
   - Edge：从 Microsoft Store 安装

2. **安装价格分析脚本**
   - 点击Tampermonkey图标 → 管理面板
   - 点击"+"创建新脚本
   - 复制 `smart-machinery-price-analyzer.user.js` 内容
   - 保存

3. **安装报告生成脚本**
   - 重复上述步骤
   - 复制 `machinery-report-generator.user.js` 内容
   - 保存

#### 5.2 配置脚本

确认脚本中的API地址：
```javascript
const API_BASE = 'http://www.jinzhe.asia/api/machinery';
```

---

### 六、功能测试

#### 6.1 API接口测试

```bash
# 测试价格查询接口
curl -X GET "http://www.jinzhe.asia/api/machinery/equipment/price?keyword=起重机"

# 测试价格分析上传
curl -X POST "http://www.jinzhe.asia/api/machinery/price-analysis" \
  -H "Authorization: Bearer jinzhe_2025_central_asia" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "徐工XCT25",
    "equipment": {
      "type": "汽车起重机",
      "tonnage": 25,
      "prices": {
        "newMachine": {"min": 88, "max": 95}
      }
    },
    "source": "test"
  }'

# 测试热门设备查询
curl -X GET "http://www.jinzhe.asia/api/machinery/trending-equipment?limit=5"
```

#### 6.2 Web界面测试

1. 访问管理后台
2. 检查设备列表是否加载
3. 测试搜索功能
4. 测试添加设备功能
5. 测试报告导出功能

#### 6.3 油猴脚本测试

1. 访问任意网页
2. 选中设备型号文字（如"徐工XCT25"）
3. 按快捷键 `Ctrl+Shift+M`
4. 检查是否弹出价格分析窗口
5. 测试各个标签页功能
6. 点击"生成价格分析报告"按钮
7. 检查PDF是否正确生成和下载

---

### 七、安全配置

#### 7.1 修改API密钥
```php
// machinery-price-api.php
define('API_KEY', '你的自定义复杂密钥');
```

同步修改所有脚本中的API_KEY。

#### 7.2 配置HTTPS（强烈推荐）

在宝塔面板：
1. 网站 → 设置 → SSL
2. 申请Let's Encrypt免费证书
3. 强制HTTPS重定向

修改所有API地址为HTTPS：
```javascript
const API_BASE = 'https://www.jinzhe.asia/api/machinery';
```

#### 7.3 数据库安全

```bash
# 限制数据库访问IP
# 宝塔面板 → 数据库 → 权限 → 仅允许本地访问

# 定期备份数据库
# 宝塔面板 → 计划任务 → 添加任务
# 任务类型：备份数据库
# 执行周期：每天凌晨3点
```

#### 7.4 文件权限加固

```bash
# 只读权限
chmod 644 /www/wwwroot/www.jinzhe.asia/api/machinery/*.php

# 上传目录可写
chmod 755 /www/wwwroot/www.jinzhe.asia/uploads/reports

# 禁止执行目录
# Nginx配置添加：
location ~* ^/uploads/.*\.(php|php5)$ {
    deny all;
}
```

---

### 八、性能优化

#### 8.1 启用PHP OPcache

宝塔面板 → PHP设置 → 性能调整
- 开启OPcache
- 设置内存：128MB

#### 8.2 MySQL优化

编辑 `/etc/my.cnf`：
```ini
[mysqld]
innodb_buffer_pool_size = 512M
query_cache_size = 64M
max_connections = 200
```

重启MySQL：
```bash
systemctl restart mysql
```

#### 8.3 启用Gzip压缩

Nginx配置：
```nginx
gzip on;
gzip_types application/json text/css application/javascript;
gzip_min_length 1000;
```

---

### 九、监控与维护

#### 9.1 日志配置

```bash
# 查看PHP错误日志
tail -f /www/wwwlogs/www.jinzhe.asia.log

# 查看Nginx访问日志
tail -f /www/wwwlogs/www.jinzhe.asia.access.log
```

#### 9.2 定期维护任务

创建宝塔计划任务：

1. **清理旧日志**（每周）
```bash
0 3 * * 0 find /www/wwwroot/www.jinzhe.asia/uploads/reports -type f -mtime +365 -delete
```

2. **数据库优化**（每月）
```sql
OPTIMIZE TABLE equipment_prices;
OPTIMIZE TABLE price_analysis_logs;
```

3. **价格快照**（每天）
```sql
CALL sp_create_price_snapshot(设备ID);
```

---

### 十、故障排查

#### 10.1 API无法访问

```bash
# 检查PHP进程
ps aux | grep php-fpm

# 检查Nginx配置
nginx -t

# 查看错误日志
tail -f /www/wwwlogs/error.log
```

#### 10.2 数据库连接失败

```bash
# 测试连接
mysql -u jinzhe_db -p jinzhe_machinery

# 检查MySQL状态
systemctl status mysql

# 查看MySQL错误日志
tail -f /var/log/mysql/error.log
```

#### 10.3 文件上传失败

```bash
# 检查目录权限
ls -la /www/wwwroot/www.jinzhe.asia/uploads/reports

# 检查PHP上传配置
php -i | grep upload_max_filesize
php -i | grep post_max_size

# 修改PHP配置（宝塔面板 → PHP设置 → 配置文件）
upload_max_filesize = 20M
post_max_size = 20M
```

---

## 🎯 使用流程

### 用户端使用流程

1. **浏览器安装油猴脚本**
2. **访问任意包含设备信息的网页**
3. **选中设备型号** → 按 `Ctrl+Shift+M` 或右键菜单
4. **查看多维度价格分析**
5. **点击"生成价格分析报告"** → 自动生成PDF
6. **报告自动上传到服务器** → 可在管理后台查看

### 管理端使用流程

1. **访问管理后台**：`http://www.jinzhe.asia/admin/price-dashboard.html`
2. **查看设备库和热门查询**
3. **添加/编辑设备信息**
4. **导出各类报告**：综合分析、设备对比、市场趋势、区域价格
5. **下载历史报告**
6. **查看统计数据**

---

## 📞 技术支持

- 官网：www.jinzhe.asia
- 邮箱：support@jinzhe.asia
- 文档更新：查看系统README.md

---

## 📝 更新日志

### v3.0.0 (2025-12-30)
- ✅ 完整的价格分析系统
- ✅ 专业PDF报告生成
- ✅ Web管理后台
- ✅ 多维度价格分析
- ✅ 数据库快照和历史对比
- ✅ 报告分享功能

---

## ⚠️ 重要提醒

1. **数据安全**：定期备份数据库和上传文件
2. **API密钥**：不要在公开场合泄露API密钥
3. **HTTPS**：生产环境必须使用HTTPS
4. **性能监控**：关注服务器资源使用情况
5. **法律合规**：确保爬取数据符合相关网站条款

---

**部署完成！祝使用愉快！** 🎉