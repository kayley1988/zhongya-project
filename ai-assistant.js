/**
 * AI 助手模块
 * 支持多种 API 选择，可分析网页内部数据
 */

const AIAssistant = {
    // 配置
    config: {
        apiType: localStorage.getItem('ai_api_type') || 'deepseek',
        apiKey: localStorage.getItem('ai_api_key') || '',
        apiEndpoint: localStorage.getItem('ai_api_endpoint') || '',
        model: localStorage.getItem('ai_model') || 'deepseek-chat'
    },

    // API 配置选项
    apiOptions: {
        openai: {
            name: 'OpenAI',
            models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
            defaultEndpoint: 'https://api.openai.com/v1/chat/completions'
        },
        azure: {
            name: 'Azure OpenAI',
            models: ['gpt-4o', 'gpt-4', 'gpt-35-turbo'],
            defaultEndpoint: ''
        },
        claude: {
            name: 'Claude (Anthropic)',
            models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
            defaultEndpoint: 'https://api.anthropic.com/v1/messages'
        },
        deepseek: {
            name: 'DeepSeek',
            models: ['deepseek-chat', 'deepseek-coder'],
            defaultEndpoint: 'https://api.deepseek.com/v1/chat/completions'
        },
        custom: {
            name: '自定义 API',
            models: [],
            defaultEndpoint: ''
        }
    },

    // 消息历史
    messages: [],

    // 初始化
    init() {
        this.createUI();
        this.bindEvents();
        this.loadConfig();
    },

    // 创建UI
    createUI() {
        // AI助手浮动按钮
        const floatBtn = document.createElement('div');
        floatBtn.className = 'ai-assistant-float-btn';
        floatBtn.innerHTML = `
            <div class="ai-btn-icon">🤖</div>
            <div class="ai-btn-pulse"></div>
        `;
        floatBtn.onclick = () => this.togglePanel();
        document.body.appendChild(floatBtn);

        // AI助手面板
        const panel = document.createElement('div');
        panel.className = 'ai-assistant-panel';
        panel.id = 'aiAssistantPanel';
        panel.innerHTML = `
            <div class="ai-panel-header">
                <div class="ai-panel-title">
                    <span class="ai-icon">🤖</span>
                    <span>AI 数据助手</span>
                </div>
                <div class="ai-panel-actions">
                    <button class="ai-settings-btn" onclick="AIAssistant.openSettings()" title="设置">⚙️</button>
                    <button class="ai-close-btn" onclick="AIAssistant.togglePanel()">&times;</button>
                </div>
            </div>
            <div class="ai-panel-body">
                <div class="ai-status" id="aiStatus">
                    <span class="status-dot"></span>
                    <span class="status-text">未配置 API</span>
                </div>
                <div class="ai-messages" id="aiMessages">
                    <div class="ai-welcome">
                        <div class="welcome-icon">👋</div>
                        <h4>欢迎使用 AI 助手</h4>
                        <p>我可以帮您分析当前页面的项目数据、测算结果，提供专业建议。</p>
                        <div class="quick-actions">
                            <button onclick="AIAssistant.quickAction('summary')">📊 数据摘要</button>
                            <button onclick="AIAssistant.quickAction('analysis')">📈 利润分析</button>
                            <button onclick="AIAssistant.quickAction('risk')">⚠️ 风险评估</button>
                            <button onclick="AIAssistant.quickAction('suggestion')">💡 优化建议</button>
                        </div>
                    </div>
                </div>
                <div class="ai-input-area">
                    <textarea id="aiInput" placeholder="输入您的问题，AI 将基于页面数据回答..." rows="2"></textarea>
                    <button class="ai-send-btn" onclick="AIAssistant.sendMessage()">
                        <span>发送</span>
                        <span class="send-icon">➤</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        // 设置弹窗
        const settingsModal = document.createElement('div');
        settingsModal.className = 'ai-settings-modal';
        settingsModal.id = 'aiSettingsModal';
        settingsModal.innerHTML = `
            <div class="ai-settings-content">
                <div class="ai-settings-header">
                    <h3>🔧 AI 助手设置</h3>
                    <button class="ai-close-btn" onclick="AIAssistant.closeSettings()">&times;</button>
                </div>
                <div class="ai-settings-body">
                    <div class="setting-group">
                        <label>选择 API 服务</label>
                        <select id="aiApiType" onchange="AIAssistant.onApiTypeChange()">
                            <option value="openai">OpenAI</option>
                            <option value="azure">Azure OpenAI</option>
                            <option value="claude">Claude (Anthropic)</option>
                            <option value="deepseek" selected>DeepSeek (推荐)</option>
                            <option value="custom">自定义 API</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label>API Key</label>
                        <input type="password" id="aiApiKey" placeholder="输入您的 API Key">
                        <small>您的 API Key 仅保存在本地浏览器中</small>
                    </div>
                    <div class="setting-group">
                        <label>API 端点 <span class="optional">(可选)</span></label>
                        <input type="text" id="aiApiEndpoint" placeholder="自定义 API 端点地址">
                    </div>
                    <div class="setting-group">
                        <label>选择模型</label>
                        <select id="aiModel">
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <button class="test-btn" onclick="AIAssistant.testConnection()">🔗 测试连接</button>
                        <span id="testResult"></span>
                    </div>
                </div>
                <div class="ai-settings-footer">
                    <button class="btn-cancel" onclick="AIAssistant.closeSettings()">取消</button>
                    <button class="btn-save" onclick="AIAssistant.saveSettings()">保存设置</button>
                </div>
            </div>
        `;
        document.body.appendChild(settingsModal);

        // 添加样式
        this.addStyles();
    },

    // 添加样式
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* AI 助手浮动按钮 */
            .ai-assistant-float-btn {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
                z-index: 9998;
                transition: transform 0.3s, box-shadow 0.3s;
            }
            .ai-assistant-float-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6);
            }
            .ai-btn-icon {
                font-size: 28px;
                z-index: 1;
            }
            .ai-btn-pulse {
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: inherit;
                animation: pulse 2s ease-out infinite;
                opacity: 0;
            }
            @keyframes pulse {
                0% { transform: scale(1); opacity: 0.5; }
                100% { transform: scale(1.5); opacity: 0; }
            }

            /* AI 助手面板 */
            .ai-assistant-panel {
                position: fixed;
                bottom: 100px;
                right: 30px;
                width: 400px;
                height: 550px;
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                z-index: 9999;
                display: none;
                flex-direction: column;
                overflow: hidden;
                animation: slideUp 0.3s ease;
            }
            .ai-assistant-panel.show {
                display: flex;
            }
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .ai-panel-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .ai-panel-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 600;
                font-size: 16px;
            }
            .ai-icon {
                font-size: 24px;
            }
            .ai-panel-actions {
                display: flex;
                gap: 8px;
            }
            .ai-panel-actions button {
                background: rgba(255,255,255,0.2);
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                color: white;
                transition: background 0.2s;
            }
            .ai-panel-actions button:hover {
                background: rgba(255,255,255,0.3);
            }
            .ai-close-btn {
                font-size: 20px !important;
            }

            /* 状态栏 */
            .ai-status {
                padding: 8px 16px;
                background: #f8f9fa;
                border-bottom: 1px solid #eee;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
            }
            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #ccc;
            }
            .ai-status.connected .status-dot {
                background: #10b981;
            }
            .ai-status.error .status-dot {
                background: #ef4444;
            }

            /* 消息区域 */
            .ai-panel-body {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            .ai-messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
            }
            .ai-welcome {
                text-align: center;
                padding: 20px;
            }
            .welcome-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }
            .ai-welcome h4 {
                margin: 0 0 8px 0;
                color: #333;
            }
            .ai-welcome p {
                color: #666;
                font-size: 14px;
                margin-bottom: 20px;
            }
            .quick-actions {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }
            .quick-actions button {
                padding: 10px;
                background: #f0f0ff;
                border: 1px solid #e0e0ff;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
            }
            .quick-actions button:hover {
                background: #e0e0ff;
                border-color: #667eea;
            }

            /* 消息气泡 */
            .ai-message {
                margin-bottom: 16px;
                display: flex;
                flex-direction: column;
            }
            .ai-message.user {
                align-items: flex-end;
            }
            .ai-message.assistant {
                align-items: flex-start;
            }
            .message-bubble {
                max-width: 85%;
                padding: 12px 16px;
                border-radius: 16px;
                font-size: 14px;
                line-height: 1.5;
            }
            .ai-message.user .message-bubble {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-bottom-right-radius: 4px;
            }
            .ai-message.assistant .message-bubble {
                background: #f0f0f0;
                color: #333;
                border-bottom-left-radius: 4px;
            }
            .message-time {
                font-size: 11px;
                color: #999;
                margin-top: 4px;
            }
            .typing-indicator {
                display: flex;
                gap: 4px;
                padding: 8px;
            }
            .typing-indicator span {
                width: 8px;
                height: 8px;
                background: #667eea;
                border-radius: 50%;
                animation: typing 1.4s infinite;
            }
            .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
            .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes typing {
                0%, 60%, 100% { transform: translateY(0); }
                30% { transform: translateY(-8px); }
            }

            /* 输入区域 */
            .ai-input-area {
                padding: 16px;
                border-top: 1px solid #eee;
                display: flex;
                gap: 10px;
                background: #fafafa;
            }
            .ai-input-area textarea {
                flex: 1;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 12px;
                resize: none;
                font-size: 14px;
                font-family: inherit;
            }
            .ai-input-area textarea:focus {
                outline: none;
                border-color: #667eea;
            }
            .ai-send-btn {
                padding: 12px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                font-weight: 500;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .ai-send-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            /* 设置弹窗 */
            .ai-settings-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 10000;
                display: none;
                align-items: center;
                justify-content: center;
            }
            .ai-settings-modal.show {
                display: flex;
            }
            .ai-settings-content {
                background: white;
                border-radius: 16px;
                width: 480px;
                max-width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .ai-settings-header {
                padding: 20px 24px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .ai-settings-header h3 {
                margin: 0;
                font-size: 18px;
            }
            .ai-settings-body {
                padding: 24px;
            }
            .setting-group {
                margin-bottom: 20px;
            }
            .setting-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: #333;
            }
            .setting-group .optional {
                color: #999;
                font-weight: normal;
            }
            .setting-group input,
            .setting-group select {
                width: 100%;
                padding: 10px 14px;
                border: 1px solid #ddd;
                border-radius: 8px;
                font-size: 14px;
            }
            .setting-group input:focus,
            .setting-group select:focus {
                outline: none;
                border-color: #667eea;
            }
            .setting-group small {
                display: block;
                margin-top: 6px;
                color: #999;
                font-size: 12px;
            }
            .test-btn {
                padding: 10px 20px;
                background: #f0f0ff;
                border: 1px solid #667eea;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                color: #667eea;
            }
            .test-btn:hover {
                background: #e0e0ff;
            }
            #testResult {
                margin-left: 12px;
                font-size: 14px;
            }
            .ai-settings-footer {
                padding: 16px 24px;
                border-top: 1px solid #eee;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }
            .ai-settings-footer button {
                padding: 10px 24px;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
            }
            .btn-cancel {
                background: #f5f5f5;
                border: 1px solid #ddd;
            }
            .btn-save {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                color: white;
            }

            /* 打印时隐藏AI助手 */
            @media print {
                .ai-assistant-float-btn,
                .ai-assistant-panel,
                .ai-settings-modal {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    },

    // 绑定事件
    bindEvents() {
        // 回车发送
        document.getElementById('aiInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    },

    // 加载配置
    loadConfig() {
        this.config.apiType = localStorage.getItem('ai_api_type') || 'openai';
        this.config.apiKey = localStorage.getItem('ai_api_key') || '';
        this.config.apiEndpoint = localStorage.getItem('ai_api_endpoint') || '';
        this.config.model = localStorage.getItem('ai_model') || 'gpt-3.5-turbo';
        this.updateStatus();
    },

    // 更新状态显示
    updateStatus() {
        const statusEl = document.getElementById('aiStatus');
        if (!statusEl) return;

        if (this.config.apiKey) {
            statusEl.className = 'ai-status connected';
            statusEl.querySelector('.status-text').textContent = 
                `已连接: ${this.apiOptions[this.config.apiType]?.name || this.config.apiType}`;
        } else {
            statusEl.className = 'ai-status';
            statusEl.querySelector('.status-text').textContent = '未配置 API，点击 ⚙️ 设置';
        }
    },

    // 切换面板显示
    togglePanel() {
        const panel = document.getElementById('aiAssistantPanel');
        panel.classList.toggle('show');
    },

    // 打开设置
    openSettings() {
        const modal = document.getElementById('aiSettingsModal');
        modal.classList.add('show');
        
        // 填充当前配置
        document.getElementById('aiApiType').value = this.config.apiType;
        document.getElementById('aiApiKey').value = this.config.apiKey;
        document.getElementById('aiApiEndpoint').value = this.config.apiEndpoint;
        this.onApiTypeChange();
        document.getElementById('aiModel').value = this.config.model;
    },

    // 关闭设置
    closeSettings() {
        document.getElementById('aiSettingsModal').classList.remove('show');
    },

    // API类型改变
    onApiTypeChange() {
        const apiType = document.getElementById('aiApiType').value;
        const modelSelect = document.getElementById('aiModel');
        const endpointInput = document.getElementById('aiApiEndpoint');
        
        const options = this.apiOptions[apiType];
        if (options) {
            // 更新模型选项
            modelSelect.innerHTML = options.models.map(m => 
                `<option value="${m}">${m}</option>`
            ).join('');
            
            // 设置默认端点
            if (options.defaultEndpoint && !endpointInput.value) {
                endpointInput.placeholder = options.defaultEndpoint;
            }
        }
    },

    // 保存设置
    saveSettings() {
        this.config.apiType = document.getElementById('aiApiType').value;
        this.config.apiKey = document.getElementById('aiApiKey').value;
        this.config.apiEndpoint = document.getElementById('aiApiEndpoint').value;
        this.config.model = document.getElementById('aiModel').value;

        localStorage.setItem('ai_api_type', this.config.apiType);
        localStorage.setItem('ai_api_key', this.config.apiKey);
        localStorage.setItem('ai_api_endpoint', this.config.apiEndpoint);
        localStorage.setItem('ai_model', this.config.model);

        this.updateStatus();
        this.closeSettings();
        this.showToast('设置已保存', 'success');
    },

    // 测试连接
    async testConnection() {
        const resultEl = document.getElementById('testResult');
        resultEl.textContent = '测试中...';
        resultEl.style.color = '#666';

        try {
            const response = await this.callAPI('请回复"连接成功"');
            if (response) {
                resultEl.textContent = '✅ 连接成功';
                resultEl.style.color = '#10b981';
            }
        } catch (error) {
            resultEl.textContent = '❌ ' + error.message;
            resultEl.style.color = '#ef4444';
        }
    },

    // 收集页面数据
    collectPageData() {
        const data = {
            pageType: '',
            projectInfo: {},
            calculationResults: {},
            rawData: {}
        };

        // 检测页面类型
        if (window.location.href.includes('project.html')) {
            data.pageType = '项目测算页面';
            data.projectInfo = this.collectProjectPageData();
        } else if (window.location.href.includes('list.html')) {
            data.pageType = '项目列表页面';
            data.projectInfo = this.collectListPageData();
        } else if (window.location.href.includes('pricing.html')) {
            data.pageType = '定价测算页面';
            data.projectInfo = this.collectPricingPageData();
        } else {
            data.pageType = '其他页面';
        }

        return data;
    },

    // 收集项目页面数据
    collectProjectPageData() {
        const data = {};
        
        // 项目基本信息
        data.projectName = document.getElementById('projectTitle')?.textContent || '';
        data.projectId = document.getElementById('projectId')?.textContent || '';
        data.region = document.getElementById('projectRegion')?.textContent || '';
        
        // 设备信息
        data.equipmentType = document.getElementById('equipmentType')?.value || '';
        data.equipmentModel = document.getElementById('equipmentModel')?.value || '';
        data.quantity = document.getElementById('quantity')?.value || '';
        data.leaseTerm = document.getElementById('leaseTerm')?.value || '';
        
        // 收入参数
        data.monthlyRent = document.getElementById('monthlyRent')?.value || '';
        data.purchasePrice = document.getElementById('purchasePrice')?.value || '';
        
        // KPI 结果
        const kpiCards = document.querySelectorAll('.kpi-card');
        data.kpis = {};
        kpiCards.forEach(card => {
            const label = card.querySelector('.kpi-label')?.textContent || '';
            const value = card.querySelector('.kpi-value')?.textContent || '';
            if (label && value) {
                data.kpis[label] = value;
            }
        });

        // 尝试获取全局状态
        if (typeof appState !== 'undefined' && appState.calculator?.results) {
            data.calculationResults = appState.calculator.results;
        }

        return data;
    },

    // 收集列表页数据
    collectListPageData() {
        const data = {
            projects: [],
            stats: {}
        };

        // 统计信息
        const heroStats = document.getElementById('heroStats');
        if (heroStats) {
            const statItems = heroStats.querySelectorAll('.stat-card');
            statItems.forEach(item => {
                const label = item.querySelector('.stat-label')?.textContent || '';
                const value = item.querySelector('.stat-number')?.textContent || '';
                if (label) data.stats[label] = value;
            });
        }

        // 项目列表
        if (typeof listState !== 'undefined' && listState.projects) {
            data.projects = listState.projects.map(p => ({
                name: p.name,
                region: p.region,
                projectType: p.projectType,
                equipment: p.equipment,
                latestResult: p.latestResult
            }));
        }

        return data;
    },

    // 收集定价页数据
    collectPricingPageData() {
        const data = {};
        
        // 尝试获取定价相关数据
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            if (input.id && input.value) {
                data[input.id] = input.value;
            }
        });

        return data;
    },

    // 快速操作
    quickAction(action) {
        const prompts = {
            summary: '请帮我总结当前页面的数据摘要，包括关键指标和主要信息。',
            analysis: '请分析当前项目的利润情况，包括毛利率、回本周期等关键财务指标的评估。',
            risk: '请评估当前项目的潜在风险，包括汇率风险、市场风险、运营风险等方面。',
            suggestion: '基于当前数据，请给出优化建议，如何提高项目收益或降低成本。'
        };

        const prompt = prompts[action];
        if (prompt) {
            document.getElementById('aiInput').value = prompt;
            this.sendMessage();
        }
    },

    // 发送消息
    async sendMessage() {
        const input = document.getElementById('aiInput');
        const message = input.value.trim();
        if (!message) return;

        if (!this.config.apiKey) {
            this.showToast('请先配置 API Key', 'warning');
            this.openSettings();
            return;
        }

        // 清空输入
        input.value = '';

        // 添加用户消息
        this.addMessage(message, 'user');

        // 显示加载状态
        this.showTyping();

        try {
            // 收集页面数据
            const pageData = this.collectPageData();
            
            // 构建系统提示
            const systemPrompt = `你是一个专业的跨境机械设备租赁业务分析助手。用户正在使用"中亚跨境项目管理系统"。

当前页面类型: ${pageData.pageType}
当前页面数据: ${JSON.stringify(pageData.projectInfo, null, 2)}

请基于这些数据回答用户的问题。回答应该：
1. 专业、准确、有针对性
2. 使用中文回答
3. 如果涉及财务数据，给出具体的数字分析
4. 如果用户问的问题与数据无关，也可以基于你的知识回答`;

            // 调用API
            const response = await this.callAPI(message, systemPrompt);
            
            // 隐藏加载状态
            this.hideTyping();
            
            // 添加AI回复
            this.addMessage(response, 'assistant');
        } catch (error) {
            this.hideTyping();
            this.addMessage('抱歉，发生了错误: ' + error.message, 'assistant');
        }
    },

    // 调用API
    async callAPI(message, systemPrompt = '') {
        const apiType = this.config.apiType;
        const apiKey = document.getElementById('aiApiKey')?.value || this.config.apiKey;
        const model = document.getElementById('aiModel')?.value || this.config.model;
        let endpoint = document.getElementById('aiApiEndpoint')?.value || this.config.apiEndpoint;

        if (!endpoint) {
            endpoint = this.apiOptions[apiType]?.defaultEndpoint || '';
        }

        if (!endpoint) {
            throw new Error('请配置 API 端点');
        }

        let headers = {
            'Content-Type': 'application/json'
        };
        let body = {};

        if (apiType === 'claude') {
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
            body = {
                model: model,
                max_tokens: 2048,
                system: systemPrompt,
                messages: [{ role: 'user', content: message }]
            };
        } else {
            // OpenAI 兼容格式 (OpenAI, Azure, DeepSeek, 自定义)
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt || '你是一个有帮助的助手' },
                    { role: 'user', content: message }
                ],
                temperature: 0.7,
                max_tokens: 2048
            };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `API 请求失败: ${response.status}`);
        }

        const data = await response.json();

        if (apiType === 'claude') {
            return data.content?.[0]?.text || '无响应';
        } else {
            return data.choices?.[0]?.message?.content || '无响应';
        }
    },

    // 添加消息到界面
    addMessage(content, role) {
        const messagesEl = document.getElementById('aiMessages');
        
        // 移除欢迎消息
        const welcome = messagesEl.querySelector('.ai-welcome');
        if (welcome) welcome.remove();

        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${role}`;
        
        const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-bubble">${this.formatMessage(content)}</div>
            <div class="message-time">${time}</div>
        `;

        messagesEl.appendChild(messageDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    },

    // 格式化消息 (支持简单的markdown)
    formatMessage(content) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    },

    // 显示正在输入
    showTyping() {
        const messagesEl = document.getElementById('aiMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message assistant typing';
        typingDiv.innerHTML = `
            <div class="message-bubble">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        messagesEl.appendChild(typingDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    },

    // 隐藏正在输入
    hideTyping() {
        const typing = document.querySelector('.ai-message.typing');
        if (typing) typing.remove();
    },

    // 显示提示
    showToast(message, type = 'info') {
        // 使用页面已有的toast或创建简单提示
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            alert(message);
        }
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    AIAssistant.init();
});
