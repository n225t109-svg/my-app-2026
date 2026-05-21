// --- Configuration & State ---
const CONFIG = {
    API_VERSION: 'v1',
    MODEL: 'gemini-1.5-flash',
    CONTEXT_LIMIT: 20
};

let state = {
    apiKey: localStorage.getItem('gemini_api_key') || '',
    chatContext: [],
    isTyping: false
};

// --- DOM Elements ---
const elements = {
    messageList: document.getElementById('message-list'),
    chatScreen: document.getElementById('chat-screen'),
    chatForm: document.getElementById('chat-form'),
    userInput: document.getElementById('user-input'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    saveKeyBtn: document.getElementById('save-key-btn'),
    apiKeyInput: document.getElementById('api-key-input')
};

// --- Initialization ---
function init() {
    console.log("AI Companion Initializing (LINE Style)...");
    
    // Auto-focus input
    elements.userInput.focus();

    // Check for API key
    if (!state.apiKey) {
        appendSystemMessage("【デモモード】APIキーが設定されていません。右上の⚙️アイコンからキーを設定すると、本物のAIと会話できます。");
    }
}

// --- UI Logic ---

function getTimeString() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
}

function appendMessage(text, role) {
    const isUser = role === 'user';
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;

    const time = getTimeString();

    messageDiv.innerHTML = `
        ${!isUser ? '<div class="avatar">🤖</div>' : ''}
        <div class="message-content">
            <div class="bubble">${escapeHtml(text)}</div>
            <span class="time">${time}</span>
        </div>
    `;

    elements.messageList.appendChild(messageDiv);
    scrollToBottom();

    // Update Context
    state.chatContext.push({
        role: isUser ? 'user' : 'model',
        parts: [{ text: text }]
    });

    if (state.chatContext.length > CONFIG.CONTEXT_LIMIT) {
        state.chatContext.shift();
    }
}

function appendSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'date-separator';
    div.innerHTML = `<span>${text}</span>`;
    elements.messageList.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    elements.chatScreen.scrollTop = elements.chatScreen.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showTyping() {
    if (state.isTyping) return;
    state.isTyping = true;
    const div = document.createElement('div');
    div.className = 'message ai typing';
    div.id = 'typing-indicator';
    div.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="message-content">
            <div class="bubble">...</div>
        </div>
    `;
    elements.messageList.appendChild(div);
    scrollToBottom();
}

function hideTyping() {
    state.isTyping = false;
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

// --- API Logic ---

async function fetchGeminiResponse() {
    if (!state.apiKey) {
        return "APIキーが設定されていないため、お答えすることができません。設定画面からGemini APIキーを入力してください。";
    }

    const API_URL = `https://generativelanguage.googleapis.com/${CONFIG.API_VERSION}/models/${CONFIG.MODEL}:generateContent?key=${state.apiKey}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: state.chatContext })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("API Error Detailed:", data);
            const msg = data.error?.message || "原因不明のエラー";
            
            if (response.status === 400) return `【APIエラー】リクエストが正しくありません。キーを確認してください。(${msg})`;
            if (response.status === 403) return `【APIエラー】アクセス拒否。キーが無効か、この地域では利用できない可能性があります。`;
            if (response.status === 429) return `【APIエラー】リクエストが多すぎます。少し待ってからお試しください。`;
            
            return `【APIエラー】${msg}`;
        }

        if (data.candidates && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return "AIからの応答が空でした。内容がポリシーに抵触している可能性があります。";
        }

    } catch (error) {
        console.error("Network Error:", error);
        return `【通信エラー】インターネット接続を確認してください。: ${error.message}`;
    }
}

// --- Event Listeners ---

elements.chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = elements.userInput.value.trim();
    if (!text || state.isTyping) return;

    elements.userInput.value = '';
    appendMessage(text, 'user');

    showTyping();
    const aiResponse = await fetchGeminiResponse();
    hideTyping();

    appendMessage(aiResponse, 'model');
});

elements.settingsBtn.addEventListener('click', () => {
    elements.apiKeyInput.value = state.apiKey;
    elements.settingsModal.classList.remove('hidden');
});

elements.closeModalBtn.addEventListener('click', () => {
    elements.settingsModal.classList.add('hidden');
});

elements.saveKeyBtn.addEventListener('click', () => {
    const newKey = elements.apiKeyInput.value.trim();
    state.apiKey = newKey;
    localStorage.setItem('gemini_api_key', newKey);
    elements.settingsModal.classList.add('hidden');
    
    if (newKey) {
        appendSystemMessage("✅ APIキーを更新しました。");
    }
});

// Start the app
init();
