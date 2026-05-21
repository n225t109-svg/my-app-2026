// DOM Elements
const chatHistory = document.getElementById('chat-history');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const saveKeyBtn = document.getElementById('save-key-btn');
const apiKeyInput = document.getElementById('api-key-input');

// App State
let apiKey = localStorage.getItem('gemini_api_key') || '';
let chatContext = [];

// Initialize
function init() {
    if (!apiKey) {
        showModal();
    }
}

// Modal Logic
function showModal() {
    settingsModal.classList.remove('hidden');
    apiKeyInput.value = apiKey;
}

function hideModal() {
    settingsModal.classList.add('hidden');
}

settingsBtn.addEventListener('click', showModal);
closeModalBtn.addEventListener('click', hideModal);

saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        hideModal();
        alert('APIキーを保存しました。');
    } else {
        alert('APIキーを入力してください。');
    }
});

// Chat Logic
function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(isUser ? 'user-message' : 'ai-message');

    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    bubble.textContent = text;

    messageDiv.appendChild(bubble);
    chatHistory.appendChild(messageDiv);
    
    // Add to context
    chatContext.push({
        role: isUser ? 'user' : 'model',
        parts: [{ text: text }]
    });

    // Keep history manageable (last 10 turns = 20 entries)
    if (chatContext.length > 20) {
        chatContext = chatContext.slice(-20);
    }

    // Scroll to bottom
    const main = chatHistory.parentElement;
    main.scrollTop = main.scrollHeight;
}

function showTypingIndicator() {
    const indicatorDiv = document.createElement('div');
    indicatorDiv.classList.add('message', 'ai-message', 'typing');
    indicatorDiv.innerHTML = `
        <div class="bubble">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    chatHistory.appendChild(indicatorDiv);
    const main = chatHistory.parentElement;
    main.scrollTop = main.scrollHeight;
    return indicatorDiv;
}

async function fetchGeminiResponse() {
    if (!apiKey) {
        return "APIキーが設定されていないようです。右上の設定（⚙️）からAPIキーを入力すると、より賢い返答ができるようになります！今はデモモードで動作しています。";
    }

    // Using v1 stable. If you still see v1beta in errors, please hard-refresh your browser.
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    console.log('Calling Gemini API (v1)...');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: chatContext
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error Response:', errorData);
            
            if (response.status === 400 || response.status === 403) {
                return `（デモモード）APIエラーが発生しました。キーが正しいか、またはモデルがこの地域でサポートされているか確認してください。詳細: ${errorData.error?.message || '不明なエラー'}`;
            }
            throw new Error(errorData.error?.message || 'APIリクエストに失敗しました');
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Gemini API Error:', error);
        return `エラーが発生しました: ${error.message}`;
    }
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = userInput.value.trim();
    if (!message) return;

    // Add user message to UI
    addMessage(message, true);
    userInput.value = '';

    // Show typing indicator
    const typingIndicator = showTypingIndicator();

    // Get AI response
    const aiResponse = await fetchGeminiResponse();

    // Remove typing indicator and add AI message
    typingIndicator.remove();
    if (aiResponse) {
        addMessage(aiResponse, false);
    }
});

// Start app
init();
