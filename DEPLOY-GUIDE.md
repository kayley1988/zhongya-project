# 中亚跨境项目管理系统 - 部署指南

## 📦 企业微信部署步骤

### 1. GitHub部署（推荐）

#### 第一步：创建GitHub仓库

1. 在当前目录打开终端，执行：

```powershell
# 初始化Git仓库
git init

# 添加所有文件
git add .

# 提交
git commit -m "中亚项目管理系统 v1.0"

# 关联远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/zhongya-project.git

# 推送到GitHub
git branch -M main
git push -u origin main
```

2. 在GitHub仓库中开启Pages：
   - Settings → Pages
   - Source选择 "main" 分支
   - 保存后会生成访问地址：`https://你的用户名.github.io/zhongya-project/`

#### 第二步：配置企业微信

1. **创建自建应用**
   - 登录企业微信管理后台
   - 应用管理 → 自建 → 创建应用
   - 应用名称：中亚项目管理
   - 应用Logo：上传一个图标
   - 可见范围：选择需要使用的部门/成员

2. **配置网页授权**
   - 进入应用详情页
   - 找到"网页授权及JS-SDK"
   - 设置可信域名：`你的用户名.github.io`
   - 下载验证文件，放到项目根目录
   - 重新推送到GitHub

3. **设置应用主页**
   - 应用主页URL：`https://你的用户名.github.io/zhongya-project/list.html`
   - 保存

### 2. 自有服务器部署

如果你有云服务器（阿里云/腾讯云）：

```bash
# 1. 上传文件到服务器
scp -r * root@你的服务器IP:/var/www/zhongya/

# 2. 配置Nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/zhongya;
    index list.html index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
}

# 3. 配置HTTPS（必需）
# 使用Let's Encrypt免费证书
certbot --nginx -d yourdomain.com
```

### 3. 企业微信内网穿透（测试用）

如果只是测试，可以用内网穿透：

```powershell
# 安装Ngrok或类似工具
# 启动本地服务器
python -m http.server 8080

# 另一个终端启动内网穿透
ngrok http 8080
```

然后用ngrok提供的临时域名配置到企业微信。

## 🎯 使用效果

部署成功后，企业员工可以：

1. 打开企业微信APP
2. 工作台看到"中亚项目管理"应用
3. 点击直接进入系统
4. 手机端也能流畅使用

## 🔐 安全建议

1. **不要**在公开的GitHub Pages部署敏感数据
2. **建议**使用企业自有服务器 + HTTPS
3. **建议**在企业微信配置IP白名单
4. **必须**定期备份IndexedDB数据

## 📱 手机适配

当前系统已经是响应式设计，在手机端会自动适配。

如果需要进一步优化移动端体验，可以：
- 调整表格为卡片式布局
- 增大触控按钮
- 优化图表在小屏幕的显示

## 🆘 常见问题

**Q: 数据会丢失吗？**  
A: 数据存储在浏览器IndexedDB中，清除浏览器数据会丢失。建议定期导出备份。

**Q: 多人协作怎么办？**  
A: 当前是纯前端系统，不支持多人实时协作。如需协作，需要加后端数据库。

**Q: 能离线使用吗？**  
A: 可以！首次加载后，即使断网也能继续使用（需要浏览器缓存支持）。

## 📞 技术支持

如有问题，请联系技术团队。

---

**部署日期**: 2026年1月4日  
**系统版本**: v2.0
