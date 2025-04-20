// WebSocket连接管理
let ws;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000;

function connect() {
    // 获取当前环境的WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log('正在连接到WebSocket服务器:', wsUrl);
    
    try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('WebSocket连接已建立');
            showConnectionStatus('已连接', 'success');
            reconnectAttempts = 0;
            // 显示加入游戏区域
            document.getElementById('join-section').style.display = 'block';
        };
        
        ws.onclose = (event) => {
            console.log('WebSocket连接已关闭', event.code, event.reason);
            showConnectionStatus('已断开连接', 'error');
            document.getElementById('join-section').style.display = 'none';
            
            // 重连逻辑
            if (reconnectAttempts < maxReconnectAttempts) {
                setTimeout(() => {
                    reconnectAttempts++;
                    showConnectionStatus(`正在尝试重新连接 (${reconnectAttempts}/${maxReconnectAttempts})...`, 'warning');
                    connect();
                }, reconnectDelay);
            } else {
                showError('无法连接到服务器，请刷新页面重试');
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket错误:', error);
            showError('连接发生错误');
        };
        
        ws.onmessage = (event) => {
            try {
                const response = JSON.parse(event.data);
                console.log('收到消息:', response);
                
                if (response.type === 'connected') {
                    console.log('连接确认:', response.message);
                } else if (response.type === 'gameState') {
                    updateGameState(response.data);
                } else if (response.type === 'error') {
                    showError(response.message);
                }
            } catch (error) {
                console.error('消息处理错误:', error);
                showError('游戏数据处理错误');
            }
        };
    } catch (error) {
        console.error('创建WebSocket连接时出错:', error);
        showError('无法创建连接');
    }
}

function showConnectionStatus(message, type) {
    const statusDiv = document.getElementById('connection-status');
    statusDiv.textContent = message;
    statusDiv.className = '';
    
    switch (type) {
        case 'success':
            statusDiv.style.backgroundColor = '#e8f5e9';
            statusDiv.style.color = '#2e7d32';
            break;
        case 'error':
            statusDiv.style.backgroundColor = '#ffebee';
            statusDiv.style.color = '#c62828';
            break;
        case 'warning':
            statusDiv.style.backgroundColor = '#fff3e0';
            statusDiv.style.color = '#ef6c00';
            break;
    }
}

function showError(message, timeout = 5000) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, timeout);
}

// 游戏状态更新
function updateGameState(data) {
    const playerList = document.getElementById('player-list');
    const gameStatus = document.getElementById('game-status');
    const actionButtons = document.getElementById('action-buttons');
    const questionDisplay = document.getElementById('question-display');
    const resetButton = document.getElementById('reset-button');
    
    // 更新玩家列表
    let playerListHtml = '<h3>玩家列表</h3>';
    data.players.forEach((player, index) => {
        const isCurrentPlayer = index === data.currentPlayerIndex;
        playerListHtml += `
            <div class="player ${isCurrentPlayer ? 'current' : ''}">
                ${player}${isCurrentPlayer ? ' (当前玩家)' : ''}
            </div>
        `;
    });
    playerList.innerHTML = playerListHtml;
    
    // 更新游戏状态
    if (!data.isGameStarted) {
        gameStatus.textContent = '等待开始游戏...';
        actionButtons.innerHTML = data.players.length >= 2 
            ? '<button onclick="startGame()" class="primary-button">开始游戏</button>'
            : '<p class="warning-text">需要至少2名玩家才能开始游戏</p>';
        questionDisplay.innerHTML = '';
        resetButton.style.display = 'none';
    } else {
        const currentPlayer = data.players[data.currentPlayerIndex];
        gameStatus.textContent = `当前玩家: ${currentPlayer}`;
        
        if (data.currentQuestion) {
            const questionType = data.currentQuestion.type === 'truth' ? '真心话' : '大冒险';
            questionDisplay.innerHTML = `
                <div class="question-box ${data.currentQuestion.type}">
                    <h3>${questionType}</h3>
                    <p>${data.currentQuestion.content}</p>
                </div>
            `;
            actionButtons.innerHTML = '<button onclick="nextPlayer()" class="next-button">下一个玩家</button>';
        } else {
            questionDisplay.innerHTML = '';
            actionButtons.innerHTML = `
                <button onclick="chooseTruth()" class="truth-button">真心话</button>
                <button onclick="chooseDare()" class="dare-button">大冒险</button>
            `;
        }
        resetButton.style.display = 'block';
    }
}

// 游戏操作函数
function joinGame() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim();
    
    if (!name) {
        showError('请输入你的名字');
        return;
    }
    
    if (name.length > 20) {
        showError('名字不能超过20个字符');
        return;
    }
    
    ws.send(JSON.stringify({ type: 'join', name: name }));
    nameInput.value = '';
    document.getElementById('join-section').style.display = 'none';
}

function startGame() {
    ws.send(JSON.stringify({ type: 'start' }));
}

function chooseTruth() {
    ws.send(JSON.stringify({ type: 'choose', choice: 'truth' }));
}

function chooseDare() {
    ws.send(JSON.stringify({ type: 'choose', choice: 'dare' }));
}

function nextPlayer() {
    ws.send(JSON.stringify({ type: 'next' }));
}

function resetGame() {
    if (confirm('确定要重置游戏吗？所有玩家将需要重新加入。')) {
        ws.send(JSON.stringify({ type: 'reset' }));
        document.getElementById('join-section').style.display = 'block';
    }
}

// 初始化连接
window.onload = connect; 