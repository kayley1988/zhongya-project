# 数据迁移指南

## 📋 迁移前准备

### 1. 环境要求
- ✅ MySQL 5.7+ 或 MariaDB 10.2+
- ✅ PHP 7.4+ 
- ✅ 已执行 `schema_learning_v2.sql` 创建数据库
- ✅ 服务器支持CORS（或同域部署）

### 2. 文件清单
```
中亚/中亚/
├── migration-tool.html          # 前端迁移工具（浏览器打开）
├── api/learning/migrate.php     # 后端迁移接口
└── database/schema_learning_v2.sql  # 数据库结构
```

---

## 🚀 迁移步骤

### 方法一：使用迁移工具（推荐）

#### Step 1: 部署后端API
```bash
# 1. 上传 migrate.php 到服务器
scp api/learning/migrate.php user@server:/var/www/html/api/learning/

# 2. 确保PHP文件有执行权限
chmod 644 /var/www/html/api/learning/migrate.php

# 3. 测试API是否可访问
curl http://your-server.com/api/learning/migrate.php
# 应返回: {"success":false,"message":"只支持POST请求"}
```

#### Step 2: 创建数据库
```bash
# 方法A: 使用MySQL命令行
mysql -u root -p
CREATE DATABASE zhongya_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE zhongya_learning;
SOURCE /path/to/schema_learning_v2.sql;
EXIT;

# 方法B: 使用宝塔面板
# 1. 登录宝塔面板
# 2. 数据库 → 添加数据库
# 3. 数据库名: zhongya_learning
# 4. 导入SQL文件: schema_learning_v2.sql
```

#### Step 3: 打开迁移工具
```bash
# 在浏览器中打开
file:///d:/test/2025.12.17中亚/2025.12.17中亚/2025.12.17中亚/中亚/中亚/migration-tool.html

# 或者部署到服务器后访问
http://your-server.com/migration-tool.html
```

#### Step 4: 按界面提示操作
1. **扫描数据** - 自动读取LocalStorage中的单词数据
2. **配置数据库** - 输入MySQL连接信息
3. **预览数据** - 检查数据格式是否正确
4. **执行迁移** - 一键导入到MySQL数据库
5. **查看结果** - 确认迁移成功

---

### 方法二：手动导出导入

#### 1. 导出LocalStorage数据
在浏览器控制台执行：
```javascript
// 导出单词数据
const vocabulary = JSON.parse(localStorage.getItem('vocabulary') || '[]');
const folders = JSON.parse(localStorage.getItem('folderStructure') || '{"folders":[]}');
const progress = JSON.parse(localStorage.getItem('learningProgress') || '{}');

// 下载为JSON文件
const data = { vocabulary, folders, progress };
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'vocabulary-backup-' + new Date().toISOString().split('T')[0] + '.json';
a.click();
```

#### 2. 使用PHP脚本导入
```php
<?php
// import-json.php
$json = file_get_contents('vocabulary-backup.json');
$data = json_decode($json, true);

// 连接数据库
$pdo = new PDO('mysql:host=localhost;dbname=zhongya_learning', 'root', 'password');

// 导入单词
foreach ($data['vocabulary'] as $word) {
    $stmt = $pdo->prepare("
        INSERT INTO vocabulary_words (word_id, word, translation, language, added_date)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $word['id'],
        $word['word'],
        $word['translation'],
        $word['language'],
        $word['addedDate']
    ]);
}

echo "导入完成！";
?>
```

---

## 🔧 配置说明

### API端点地址
```javascript
// 本地测试环境
http://localhost/api/learning/migrate.php

// 生产环境（阿里云）
http://your-domain.com/api/learning/migrate.php
https://your-domain.com/api/learning/migrate.php  // HTTPS推荐
```

### 数据库配置
```json
{
  "host": "localhost",        // 数据库主机
  "database": "zhongya_learning",  // 数据库名
  "user": "root",             // 用户名
  "password": "your-password" // 密码
}
```

### CORS配置（如果跨域）
在 `migrate.php` 开头已添加：
```php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
```

如果需要限制域名，修改为：
```php
header('Access-Control-Allow-Origin: https://your-domain.com');
```

---

## 📊 数据映射关系

### LocalStorage → MySQL 字段对应

#### 单词数据 (vocabulary)
| LocalStorage | MySQL表 | MySQL字段 |
|-------------|---------|----------|
| id | vocabulary_words | word_id |
| word | vocabulary_words | word |
| pronunciation | vocabulary_words | pronunciation |
| romanization | vocabulary_words | romanization |
| translation | vocabulary_words | translation |
| meaning | vocabulary_words | meaning |
| language | vocabulary_words | language |
| source | vocabulary_words | source |
| parentId | vocabulary_words | parent_folder_id |
| addedDate | vocabulary_words | added_date |
| example | vocabulary_words | example_sentence |
| notes | vocabulary_words | notes |

#### 文件夹数据 (folderStructure.folders)
| LocalStorage | MySQL表 | MySQL字段 |
|-------------|---------|----------|
| id | vocabulary_folders | folder_id |
| name | vocabulary_folders | name |
| parentId | vocabulary_folders | parent_id |
| level | vocabulary_folders | level |
| expanded | vocabulary_folders | expanded |
| unviewed | vocabulary_folders | unviewed |

#### 学习进度 (learningProgress)
| LocalStorage | MySQL表 | MySQL字段 |
|-------------|---------|----------|
| mastered[] | learning_progress | is_mastered = 1 |
| difficult[] | learning_progress | is_difficult = 1 |
| fuzzy[] | learning_progress | is_fuzzy = 1 |

---

## ⚠️ 常见问题

### Q1: 迁移工具显示"未发现任何单词数据"
**解决方法：**
1. 确保在**同一个浏览器**中打开过 `vocabulary.html`
2. 检查浏览器是否开启了隐私模式（无痕模式）
3. 确认浏览器未清除过LocalStorage
4. 按F12打开控制台，手动检查：
   ```javascript
   console.log(localStorage.getItem('vocabulary'));
   ```

### Q2: 数据库连接失败
**解决方法：**
1. 检查MySQL服务是否运行：
   ```bash
   systemctl status mysql  # Linux
   # 或宝塔面板：数据库 → MySQL管理
   ```
2. 确认数据库用户名密码正确
3. 检查数据库是否存在：
   ```sql
   SHOW DATABASES LIKE 'zhongya_learning';
   ```
4. 确认用户有权限：
   ```sql
   GRANT ALL ON zhongya_learning.* TO 'root'@'localhost';
   FLUSH PRIVILEGES;
   ```

### Q3: API接口404错误
**解决方法：**
1. 确认文件路径正确：
   ```bash
   ls -la /var/www/html/api/learning/migrate.php
   ```
2. 检查Nginx/Apache配置是否支持PHP
3. 确认URL rewrite规则正确
4. 测试PHP是否工作：
   ```bash
   php -v  # 查看PHP版本
   ```

### Q4: 迁移后数据不完整
**解决方法：**
1. 检查PHP错误日志：
   ```bash
   tail -f /var/log/php-fpm/error.log
   ```
2. 查看MySQL慢查询日志
3. 增加PHP超时时间（php.ini）：
   ```ini
   max_execution_time = 300
   memory_limit = 512M
   ```
4. 分批迁移（已在代码中实现，每次100个单词）

### Q5: 中文乱码
**解决方法：**
1. 确认数据库字符集：
   ```sql
   SHOW VARIABLES LIKE 'character_set%';
   -- 应该全部是 utf8mb4
   ```
2. 修改数据库字符集：
   ```sql
   ALTER DATABASE zhongya_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. 检查PHP文件编码（应为UTF-8 without BOM）

---

## 🔒 安全建议

### 1. API安全
```php
// 添加IP白名单
$allowedIPs = ['127.0.0.1', 'your-ip-address'];
if (!in_array($_SERVER['REMOTE_ADDR'], $allowedIPs)) {
    die(json_encode(['success' => false, 'message' => '访问被拒绝']));
}

// 添加Token验证
$token = $_SERVER['HTTP_X_API_TOKEN'] ?? '';
if ($token !== 'your-secret-token') {
    die(json_encode(['success' => false, 'message' => '无效的Token']));
}
```

### 2. 数据库安全
- ✅ 使用强密码
- ✅ 限制远程访问
- ✅ 定期备份数据
- ✅ 最小权限原则

### 3. 迁移后
- 🔒 **删除或重命名 migrate.php** 防止未授权访问
- 🔒 修改数据库密码
- 🔒 检查服务器访问日志

---

## 📦 备份建议

### 迁移前备份
```bash
# 导出LocalStorage数据（见上方方法二）
# 或使用浏览器开发者工具 Application → Local Storage → 右键 → Copy
```

### 迁移后备份
```bash
# MySQL数据备份
mysqldump -u root -p zhongya_learning > backup_$(date +%Y%m%d).sql

# 或使用宝塔面板自动备份功能
```

---

## 📞 技术支持

如遇到问题，请提供以下信息：
- 浏览器类型和版本
- PHP版本 (`php -v`)
- MySQL版本 (`mysql --version`)
- 错误截图或日志
- LocalStorage数据量（单词数、文件夹数）

---

## ✅ 迁移完成检查清单

- [ ] 数据库创建成功
- [ ] migrate.php部署完成
- [ ] API连接测试通过
- [ ] 单词数据完整导入
- [ ] 文件夹结构正确
- [ ] 学习进度已迁移
- [ ] 中文显示正常
- [ ] LocalStorage原始数据已备份
- [ ] 删除或保护migrate.php
- [ ] 数据库已备份

---

**祝迁移顺利！** 🎉
