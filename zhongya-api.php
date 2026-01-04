<?php
/**
 * 中亚信息工程机械API接口
 * 用于接收和处理工程机械PDF报告上传
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

class ZhongyaMachineryAPI {
    
    private $db;
    private $apiKey;
    
    public function __construct() {
        $this->apiKey = 'your-secure-api-key-here';
        $this->initDatabase();
    }
    
    private function initDatabase() {
        // 数据库连接配置
        $host = 'localhost';
        $dbname = 'zhongya_machinery';
        $username = 'your_db_user';
        $password = 'your_db_password';
        
        try {
            $this->db = new PDO(
                "mysql:host={$host};dbname={$dbname};charset=utf8mb4",
                $username,
                $password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]
            );
        } catch (PDOException $e) {
            $this->sendError('数据库连接失败: ' . $e->getMessage());
        }
    }
    
    private function validateApiKey() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        
        if (!preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
            $this->sendError('未提供API密钥', 401);
        }
        
        if ($matches[1] !== $this->apiKey) {
            $this->sendError('API密钥无效', 403);
        }
    }
    
    public function handleRequest() {
        $this->validateApiKey();
        
        $method = $_SERVER['REQUEST_METHOD'];
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $pathParts = explode('/', trim($path, '/'));
        
        // 路由处理
        switch ($pathParts[1] ?? '') {
            case 'machinery':
                $this->handleMachineryRoutes($pathParts, $method);
                break;
            case 'inquiry':
                $this->handleInquiryRoutes($pathParts, $method);
                break;
            case 'quotation':
                $this->handleQuotationRoutes($pathParts, $method);
                break;
            default:
                $this->sendError('接口路径不存在', 404);
        }
    }
    
    private function handleMachineryRoutes($pathParts, $method) {
        $action = $pathParts[2] ?? '';
        
        switch ($action) {
            case 'upload-report':
                if ($method === 'POST') {
                    $this->uploadMachineryReport();
                } else {
                    $this->sendError('方法不被允许', 405);
                }
                break;
                
            case 'query':
                if ($method === 'GET') {
                    $this->queryMachinery();
                } else {
                    $this->sendError('方法不被允许', 405);
                }
                break;
                
            case 'update-prices':
                if ($method === 'POST') {
                    $this->updateMachineryPrices();
                } else {
                    $this->sendError('方法不被允许', 405);
                }
                break;
                
            case 'inventory':
                if ($method === 'GET') {
                    $this->getMachineryInventory();
                } else {
                    $this->sendError('方法不被允许', 405);
                }
                break;
                
            default:
                $this->sendError('操作不存在', 404);
        }
    }
    
    private function uploadMachineryReport() {
        try {
            // 检查上传文件
            if (!isset($_FILES['report'])) {
                $this->sendError('未上传PDF文件');
            }
            
            $pdfFile = $_FILES['report'];
            $keyword = $_POST['keyword'] ?? '';
            $reportDataRaw = $_POST['reportData'] ?? '';
            $timestamp = $_POST['timestamp'] ?? time();
            
            if (empty($keyword)) {
                $this->sendError('设备关键词不能为空');
            }
            
            // 解析报告数据
            $reportData = json_decode($reportDataRaw, true);
            if (!$reportData) {
                $this->sendError('报告数据格式错误');
            }
            
            // 创建上传目录
            $uploadDir = './uploads/machinery-reports/' . date('Y/m/');
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            // 生成文件名
            $fileName = $keyword . '_' . date('YmdHis') . '_' . uniqid() . '.pdf';
            $filePath = $uploadDir . $fileName;
            
            // 移动上传文件
            if (!move_uploaded_file($pdfFile['tmp_name'], $filePath)) {
                $this->sendError('文件保存失败');
            }
            
            // 保存到数据库
            $reportId = $this->saveMachineryReport([
                'keyword' => $keyword,
                'file_path' => $filePath,
                'file_name' => $fileName,
                'report_data' => $reportDataRaw,
                'upload_time' => date('Y-m-d H:i:s', $timestamp),
                'file_size' => $pdfFile['size']
            ]);
            
            // 提取和保存机械信息
            $this->saveMachineryInfo($keyword, $reportData);
            
            $this->sendSuccess([
                'reportId' => $reportId,
                'fileName' => $fileName,
                'filePath' => $filePath,
                'uploadTime' => date('Y-m-d H:i:s'),
                'message' => 'PDF报告上传成功'
            ]);
            
        } catch (Exception $e) {
            $this->sendError('上传处理失败: ' . $e->getMessage());
        }
    }
    
    private function saveMachineryReport($data) {
        $sql = "INSERT INTO machinery_reports 
                (keyword, file_path, file_name, report_data, upload_time, file_size) 
                VALUES (?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['keyword'],
            $data['file_path'],
            $data['file_name'],
            $data['report_data'],
            $data['upload_time'],
            $data['file_size']
        ]);
        
        return $this->db->lastInsertId();
    }
    
    private function saveMachineryInfo($keyword, $reportData) {
        // 更新或插入机械信息
        $sql = "INSERT INTO machinery_info 
                (keyword, name, brand, model, parameters, pricing, rental, last_update)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                brand = VALUES(brand),
                model = VALUES(model),
                parameters = VALUES(parameters),
                pricing = VALUES(pricing),
                rental = VALUES(rental),
                last_update = NOW()";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $keyword,
            $reportData['basicInfo']['名称'] ?? '',
            $reportData['basicInfo']['品牌'] ?? '',
            $reportData['basicInfo']['型号'] ?? '',
            json_encode($reportData['parameters'] ?? []),
            json_encode($reportData['pricing'] ?? []),
            json_encode($reportData['rental'] ?? [])
        ]);
    }
    
    private function queryMachinery() {
        $keyword = $_GET['keyword'] ?? '';
        $page = intval($_GET['page'] ?? 1);
        $limit = intval($_GET['limit'] ?? 20);
        $offset = ($page - 1) * $limit;
        
        if ($keyword) {
            // 查询特定设备
            $sql = "SELECT * FROM machinery_info WHERE keyword LIKE ? OR name LIKE ? LIMIT ? OFFSET ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute(["%{$keyword}%", "%{$keyword}%", $limit, $offset]);
        } else {
            // 查询所有设备
            $sql = "SELECT * FROM machinery_info ORDER BY last_update DESC LIMIT ? OFFSET ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$limit, $offset]);
        }
        
        $results = $stmt->fetchAll();
        
        // 获取总数
        $countSql = $keyword ? 
            "SELECT COUNT(*) FROM machinery_info WHERE keyword LIKE ? OR name LIKE ?" :
            "SELECT COUNT(*) FROM machinery_info";
        
        $countStmt = $this->db->prepare($countSql);
        if ($keyword) {
            $countStmt->execute(["%{$keyword}%", "%{$keyword}%"]);
        } else {
            $countStmt->execute();
        }
        
        $total = $countStmt->fetchColumn();
        
        $this->sendSuccess([
            'data' => $results,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit)
            ]
        ]);
    }
    
    private function updateMachineryPrices() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['keyword'])) {
            $this->sendError('数据格式错误');
        }
        
        $keyword = $input['keyword'];
        $pricing = $input['pricing'] ?? [];
        $rental = $input['rental'] ?? [];
        
        $sql = "UPDATE machinery_info SET 
                pricing = ?, 
                rental = ?, 
                last_update = NOW() 
                WHERE keyword = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            json_encode($pricing),
            json_encode($rental),
            $keyword
        ]);
        
        if ($stmt->rowCount() > 0) {
            $this->sendSuccess(['message' => '价格信息更新成功']);
        } else {
            $this->sendError('设备不存在或更新失败');
        }
    }
    
    private function getMachineryInventory() {
        $sql = "SELECT keyword, name, brand, model, last_update FROM machinery_info ORDER BY last_update DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        
        $inventory = $stmt->fetchAll();
        
        $this->sendSuccess([
            'inventory' => $inventory,
            'count' => count($inventory),
            'lastUpdate' => date('Y-m-d H:i:s')
        ]);
    }
    
    private function handleInquiryRoutes($pathParts, $method) {
        $action = $pathParts[2] ?? '';
        
        switch ($action) {
            case 'create':
                if ($method === 'POST') {
                    $this->createInquiry();
                } else {
                    $this->sendError('方法不被允许', 405);
                }
                break;
            default:
                $this->sendError('操作不存在', 404);
        }
    }
    
    private function createInquiry() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $sql = "INSERT INTO inquiries (keyword, timestamp, report_id, created_at) VALUES (?, ?, ?, NOW())";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $input['keyword'] ?? '',
            $input['timestamp'] ?? date('Y-m-d H:i:s'),
            $input['reportId'] ?? null
        ]);
        
        $inquiryId = $this->db->lastInsertId();
        
        $this->sendSuccess([
            'inquiryId' => $inquiryId,
            'message' => '询价记录创建成功'
        ]);
    }
    
    private function handleQuotationRoutes($pathParts, $method) {
        $action = $pathParts[2] ?? '';
        
        switch ($action) {
            case 'generate':
                if ($method === 'POST') {
                    $this->generateQuotation();
                } else {
                    $this->sendError('方法不被允许', 405);
                }
                break;
            default:
                $this->sendError('操作不存在', 404);
        }
    }
    
    private function generateQuotation() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // 生成报价单编号
        $quotationNo = 'ZY' . date('YmdHis') . rand(1000, 9999);
        
        $sql = "INSERT INTO quotations 
                (quotation_no, machinery, specifications, pricing, timestamp, source, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, NOW())";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $quotationNo,
            $input['machinery'] ?? '',
            json_encode($input['specifications'] ?? []),
            json_encode($input['pricing'] ?? []),
            $input['timestamp'] ?? date('Y-m-d H:i:s'),
            $input['source'] ?? '工程机械查询系统'
        ]);
        
        $quotationId = $this->db->lastInsertId();
        
        $this->sendSuccess([
            'quotationId' => $quotationId,
            'quotationNo' => $quotationNo,
            'message' => '报价单生成成功'
        ]);
    }
    
    private function sendSuccess($data) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    private function sendError($message, $code = 400) {
        http_response_code($code);
        echo json_encode([
            'success' => false,
            'error' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// 创建数据库表的SQL（初次部署时执行）
function createTables($pdo) {
    $tables = [
        "CREATE TABLE IF NOT EXISTS machinery_reports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            keyword VARCHAR(100) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_name VARCHAR(200) NOT NULL,
            report_data TEXT,
            upload_time DATETIME NOT NULL,
            file_size INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_keyword (keyword),
            INDEX idx_upload_time (upload_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        
        "CREATE TABLE IF NOT EXISTS machinery_info (
            id INT AUTO_INCREMENT PRIMARY KEY,
            keyword VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(200),
            brand VARCHAR(100),
            model VARCHAR(100),
            parameters JSON,
            pricing JSON,
            rental JSON,
            last_update DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_keyword (keyword),
            INDEX idx_brand (brand),
            INDEX idx_last_update (last_update)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        
        "CREATE TABLE IF NOT EXISTS inquiries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            keyword VARCHAR(100) NOT NULL,
            timestamp DATETIME,
            report_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (report_id) REFERENCES machinery_reports(id),
            INDEX idx_keyword (keyword)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        
        "CREATE TABLE IF NOT EXISTS quotations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            quotation_no VARCHAR(50) NOT NULL UNIQUE,
            machinery VARCHAR(200) NOT NULL,
            specifications JSON,
            pricing JSON,
            timestamp DATETIME,
            source VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_quotation_no (quotation_no),
            INDEX idx_machinery (machinery)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    ];
    
    foreach ($tables as $sql) {
        $pdo->exec($sql);
    }
}

// 如果是初始化请求，创建数据库表
if (isset($_GET['init']) && $_GET['init'] === 'tables') {
    $api = new ZhongyaMachineryAPI();
    createTables($api->db);
    echo json_encode(['success' => true, 'message' => '数据库表创建成功']);
    exit;
}

// 处理API请求
$api = new ZhongyaMachineryAPI();
$api->handleRequest();
?>