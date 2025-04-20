let socket;
let playerName = '';
let retryCount = 0;

// DOM元素
const connectionStatus = document.getElementById('connectionStatus');
const joinButton = document.getElementById('joinButton');
const startButton = document.getElementById('startButton');
const nextButton = document.getElementById('nextButton');
const resetButton = document.getElementById('resetButton');

// 连接WebSocket服务器
function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;
    
    console.log('尝试连接到WebSocket服务器:', wsUrl);
    
    if (socket) {
        socket.close();
    }
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
        console.log('WebSocket连接已建立');
        connectionStatus.textContent = '已连接';
        connectionStatus.className = 'connection-status connected';
        joinButton.disabled = false;
        retryCount = 0;
    };
    
    socket.onclose = (event) => {
        console.log('WebSocket连接已关闭:', event.code, event.reason);
        connectionStatus.textContent = '未连接 - 正在重新连接...';
        connectionStatus.className = 'connection-status disconnected';
        joinButton.disabled = true;
        startButton.disabled = true;
        nextButton.disabled = true;
        resetButton.disabled = true;
        
        // 使用指数退避重试
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.log(`将在 ${retryDelay}ms 后重试连接`);
        setTimeout(connect, retryDelay);
        retryCount++;
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket错误:', error);
    };
    
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('收到服务器消息:', data);
            if (data.type === 'state_update') {
                updateGameState(data.data);
            }
        } catch (error) {
            console.error('处理服务器消息时出错:', error);
        }
    };
}

// 更新游戏状态
function updateGameState(state) {
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';
    
    state.players.forEach((player, index) => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `<span>${index + 1}. ${player}</span>`;
        playerList.appendChild(playerItem);
    });
    
    if (state.game_started) {
        document.getElementById('setupArea').style.display = 'none';
        document.getElementById('gameArea').style.display = 'block';
        
        const currentPlayer = state.players[state.current_player_index];
        document.getElementById('currentPlayer').textContent = `轮到 ${currentPlayer} 了！`;
        
        if (state.choice && state.question) {
            const result = state.choice === 'truth' 
                ? `选择了：真心话\n问题：${state.question}`
                : `选择了：大冒险\n挑战：${state.question}`;
            document.getElementById('result').textContent = result;
        } else {
            document.getElementById('result').textContent = '';
        }
        
        startButton.disabled = true;
        nextButton.disabled = false;
        resetButton.disabled = false;
    } else {
        document.getElementById('setupArea').style.display = 'block';
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('result').textContent = '';
        
        startButton.disabled = state.players.length < 2;
        nextButton.disabled = true;
        resetButton.disabled = true;
    }
}

// 加入游戏
function joinGame() {
    playerName = document.getElementById('playerName').value.trim();
    if (playerName === '') {
        alert('请输入你的名字！');
        return;
    }
    
    socket.send(JSON.stringify({
        action: 'join',
        name: playerName
    }));
    
    document.getElementById('playerName').disabled = true;
    joinButton.disabled = true;
}

// 开始游戏
function startGame() {
    socket.send(JSON.stringify({
        action: 'start'
    }));
}

// 选择真心话或大冒险
function chooseOption(choice) {
    socket.send(JSON.stringify({
        action: 'choose',
        choice: choice
    }));
}

// 下一轮
function nextTurn() {
    socket.send(JSON.stringify({
        action: 'next'
    }));
}

// 重置游戏
function resetGame() {
    socket.send(JSON.stringify({
        action: 'reset'
    }));
    document.getElementById('playerName').disabled = false;
    joinButton.disabled = false;
}

// 初始化连接
connect(); 
