// --- Configuration & State ---
const CONFIG = {
    API_VERSION: 'v1beta',
    DEFAULT_MODEL: 'gemini-1.5-flash',
    CONTEXT_LIMIT: 20
};

let state = {
    apiKey: localStorage.getItem('gemini_api_key') || '',
    selectedModel: localStorage.getItem('gemini_model') || CONFIG.DEFAULT_MODEL,
    chatContext: [],
    isTyping: false
};

const elements = {
    messageList: document.getElementById('message-list'),
    chatScreen: document.getElementById('chat-screen'),
    chatForm: document.getElementById('chat-form'),
    userInput: document.getElementById('user-input'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    saveKeyBtn: document.getElementById('save-key-btn'),
    apiKeyInput: document.getElementById('api-key-input'),
    modelSelect: document.getElementById('model-select')
};

// --- Utils ---
function getTimeString() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    elements.chatScreen.scrollTop = elements.chatScreen.scrollHeight;
}

// --- UI Logic ---
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

    state.chatContext.push({
        role: isUser ? 'user' : 'model',
        parts: [{ text: text }]
    });
    if (state.chatContext.length > CONFIG.CONTEXT_LIMIT) state.chatContext.shift();
}

function appendSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'date-separator';
    div.innerHTML = `<span>${text}</span>`;
    elements.messageList.appendChild(div);
    scrollToBottom();
}

function showTyping() {
    if (state.isTyping) return;
    state.isTyping = true;
    const div = document.createElement('div');
    div.className = 'message ai typing';
    div.id = 'typing-indicator';
    div.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="message-content"><div class="bubble">...</div></div>
    `;
    elements.messageList.appendChild(div);
    scrollToBottom();
}

function hideTyping() {
    state.isTyping = false;
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

// --- Smart Mock Mode (Fallback) ---
function getMockResponse(input) {
    const responses = [
        "それは面白いですね！もっと詳しく教えてください。",
        "なるほど、そうなんですね。あなたの考え、素敵だと思います。",
        "今日はどんな一日でしたか？私はいつでもお話を聞きますよ。",
        "うふふ、なんだか楽しい気分になりますね。",
        "ごめんなさい、今はちょっと考え事をしていました。もう一度言ってもらえますか？",
        "あなたの言葉、心に響きます。"
    ];
    if (input.includes("こんにちは")) return "こんにちは！お会いできて嬉しいです。";
    if (input.includes("名前")) return "私はあなたのAIコンパニオンです。名前はまだありません。";
    if (input.includes("疲れた")) return "お疲れ様です。ゆっくり休んでくださいね。";
    return responses[Math.floor(Math.random() * responses.length)];
}

// --- API Logic ---
async function fetchGeminiResponse(retryModel = null) {
    if (!state.apiKey) {
        return { text: getMockResponse(elements.userInput.value), isMock: true };
    }

    // Filter context: Gemini requires the first message to be from 'user'
    const validContext = state.chatContext.filter((item, index) => {
        if (index === 0 && item.role === 'model') return false;
        return true;
    });

    if (validContext.length === 0) return { text: getMockResponse(elements.userInput.value), isMock: true };

    const currentModel = retryModel || state.selectedModel;
    const API_URL = `https://generativelanguage.googleapis.com/${CONFIG.API_VERSION}/models/${currentModel}:generateContent?key=${state.apiKey}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: validContext })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`API Error (${currentModel}):`, data);
            const apiErrorMessage = data.error?.message || "不明なエラー";

            // If model not found, try fallback
            if (response.status === 404 && !retryModel && currentModel !== 'gemini-pro') {
                return await fetchGeminiResponse('gemini-pro');
            }
            
            return { text: `【APIエラー】${apiErrorMessage} (デモモードで返信します) ${getMockResponse("")}`, isError: true };
        }

        return { text: data.candidates[0].content.parts[0].text };

    } catch (error) {
        console.error("Network Error:", error);
        return { text: `【通信エラー】${error.message} (オフラインモード)`, isError: true };
    }
}

// --- Events ---
elements.chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = elements.userInput.value.trim();
    if (!text || state.isTyping) return;

    elements.userInput.value = '';
    appendMessage(text, 'user');

    showTyping();
    // Use a small delay for natural feeling in mock mode
    const responseData = await fetchGeminiResponse();
    setTimeout(() => {
        hideTyping();
        appendMessage(responseData.text, 'model');
    }, responseData.isMock ? 1000 : 0);
});

elements.settingsBtn.addEventListener('click', () => {
    elements.apiKeyInput.value = state.apiKey;
    elements.modelSelect.value = state.selectedModel;
    elements.settingsModal.classList.remove('hidden');
});

elements.closeModalBtn.addEventListener('click', () => elements.settingsModal.classList.add('hidden'));

elements.saveKeyBtn.addEventListener('click', () => {
    state.apiKey = elements.apiKeyInput.value.trim();
    state.selectedModel = elements.modelSelect.value;
    localStorage.setItem('gemini_api_key', state.apiKey);
    localStorage.setItem('gemini_model', state.selectedModel);
    elements.settingsModal.classList.add('hidden');
    appendSystemMessage("✅ 設定を保存しました。");
});

// Start
window.onload = () => {
    appendMessage("こんにちは！いつでもお話ししましょう。", "model");
    elements.userInput.focus();
};
