const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 游戏状态
const gameState = {
    players: [],
    current_player_index: 0,
    game_started: false,
    max_players: 10,
    choice: null,
    question: null,
    punishment: null
};

// 真心话问题库
const truthQuestions = [
    "你最近一次撒谎是什么时候？",
    "你最喜欢的电影是什么？为什么？",
    "你做过最疯狂的事情是什么？",
    "你最大的秘密是什么？",
    "你最喜欢的食物是什么？"
];

// 大冒险任务库
const dareActions = [
    "模仿一个动物叫声",
    "做10个俯卧撑",
    "唱一首歌",
    "跳一段舞",
    "做一个鬼脸"
];

// 随机选择问题或任务
function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// WebSocket连接处理
wss.on('connection', (ws) => {
    console.log('新客户端连接');

    // 发送当前游戏状态
    ws.send(JSON.stringify({
        type: 'state_update',
        data: gameState
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('收到消息:', data);

            switch (data.action) {
                case 'join':
                    if (!gameState.players.includes(data.name) && gameState.players.length < gameState.max_players) {
                        gameState.players.push(data.name);
                        broadcastGameState();
                    }
                    break;

                case 'start':
                    if (gameState.players.length >= 2 && !gameState.game_started) {
                        gameState.game_started = true;
                        gameState.current_player_index = 0;
                        broadcastGameState();
                    }
                    break;

                case 'choose':
                    if (gameState.game_started) {
                        gameState.choice = data.choice;
                        gameState.question = data.choice === 'truth' 
                            ? getRandomItem(truthQuestions)
                            : getRandomItem(dareActions);
                        broadcastGameState();
                    }
                    break;

                case 'next':
                    if (gameState.game_started) {
                        gameState.current_player_index = (gameState.current_player_index + 1) % gameState.players.length;
                        gameState.choice = null;
                        gameState.question = null;
                        gameState.punishment = null;
                        broadcastGameState();
                    }
                    break;

                case 'reset':
                    Object.assign(gameState, {
                        players: [],
                        current_player_index: 0,
                        game_started: false,
                        choice: null,
                        question: null,
                        punishment: null
                    });
                    broadcastGameState();
                    break;
            }
        } catch (error) {
            console.error('处理消息时出错:', error);
        }
    });

    ws.on('close', () => {
        console.log('客户端断开连接');
    });
});

// 广播游戏状态
function broadcastGameState() {
    const message = JSON.stringify({
        type: 'state_update',
        data: gameState
    });

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// 提供静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 健康检查端点
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        connections: wss.clients.size,
        uptime: process.uptime()
    });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});  
