const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);

// 配置WebSocket服务器
const wss = new WebSocketServer({ 
    server,
    perMessageDeflate: false,
    clientTracking: true
});

// 服务静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 添加CORS支持
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// 健康检查端点 - Render需要这个来确认服务正常运行
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 游戏状态
const gameState = {
    players: [],
    currentPlayerIndex: -1,
    isGameStarted: false,
    maxPlayers: 10
};

// 真心话问题库
const truthQuestions = [
    "你最后一次说谎是什么时候？",
    "你最大的秘密是什么？",
    "你最喜欢的人是谁？",
    "你做过最尴尬的事是什么？",
    "你最后悔的事情是什么？"
];

// 大冒险任务库
const dareActions = [
    "模仿一个动物叫声",
    "唱一首歌",
    "做10个俯卧撑",
    "跳一段舞",
    "讲一个笑话"
];

// 广播游戏状态给所有客户端
function broadcastGameState(additionalData = {}) {
    const state = {
        ...gameState,
        ...additionalData
    };
    
    wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
            try {
                client.send(JSON.stringify({
                    type: 'gameState',
                    data: state
                }));
            } catch (error) {
                console.error('广播游戏状态时出错:', error);
            }
        }
    });
}

// WebSocket连接处理
wss.on('connection', (ws, req) => {
    console.log('新客户端连接');

    // 发送连接确认
    ws.send(JSON.stringify({
        type: 'connected',
        message: '连接成功'
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('收到消息:', data);
            
            switch (data.type) {
                case 'join':
                    if (gameState.players.length < gameState.maxPlayers && !gameState.players.includes(data.name)) {
                        gameState.players.push(data.name);
                        broadcastGameState();
                    }
                    break;

                case 'start':
                    if (gameState.players.length >= 2) {
                        gameState.isGameStarted = true;
                        gameState.currentPlayerIndex = 0;
                        broadcastGameState();
                    }
                    break;

                case 'choose':
                    if (gameState.isGameStarted) {
                        const questions = data.choice === 'truth' ? truthQuestions : dareActions;
                        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
                        broadcastGameState({
                            currentQuestion: {
                                type: data.choice,
                                content: randomQuestion
                            }
                        });
                    }
                    break;

                case 'next':
                    if (gameState.isGameStarted) {
                        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
                        broadcastGameState();
                    }
                    break;

                case 'reset':
                    gameState.players = [];
                    gameState.currentPlayerIndex = -1;
                    gameState.isGameStarted = false;
                    broadcastGameState();
                    break;
            }
        } catch (error) {
            console.error('处理消息时出错:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: '消息处理错误'
            }));
        }
    });

    ws.on('close', () => {
        console.log('客户端断开连接');
    });

    // 发送初始游戏状态
    broadcastGameState();
});

// 使用环境变量端口或默认端口
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在端口 ${PORT}`);
});

// 导出app用于部署
module.exports = app; 