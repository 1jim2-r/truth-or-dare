const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 服务静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).send('OK');
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
function broadcastGameState() {
  const state = {
    ...gameState,
    truthQuestions,
    dareActions
  };
  
  wss.clients.forEach(client => {
    try {
      client.send(JSON.stringify({
        type: 'gameState',
        data: state
      }));
    } catch (error) {
      console.error('广播游戏状态时出错:', error);
    }
  });
}

// WebSocket连接处理
wss.on('connection', (ws) => {
  console.log('新客户端连接');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'join':
          if (gameState.players.length < gameState.maxPlayers && !gameState.players.find(p => p.name === data.name)) {
            gameState.players.push({
              name: data.name,
              id: Date.now().toString()
            });
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
    }
  });

  ws.on('close', () => {
    console.log('客户端断开连接');
  });

  // 发送初始游戏状态
  ws.send(JSON.stringify({
    type: 'gameState',
    data: {
      ...gameState,
      truthQuestions,
      dareActions
    }
  }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

module.exports = app; 