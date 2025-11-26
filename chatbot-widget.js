// Chess Chatbot Widget Configuration
const CHATBOT_CONFIG = {
  API_URL: 'https://chesswebsite-production-3d66.up.railway.app',
  STORAGE_KEY: 'chess_chatbot_session'
};

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get or create session ID
function getSessionId() {
  let sessionId = localStorage.getItem(CHATBOT_CONFIG.STORAGE_KEY);
  if (!sessionId) {
    sessionId = generateUUID();
    localStorage.setItem(CHATBOT_CONFIG.STORAGE_KEY, sessionId);
  }
  return sessionId;
}

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Create chatbot HTML
  const chatbotHTML = `
    <div id="chess-chatbot-widget">
      <button class="chatbot-button" id="chatbot-toggle">♟️</button>
      <div class="chatbot-container" id="chatbot-container">
        <div class="chatbot-header">
          <div class="chatbot-header-content">
            <div class="chatbot-logo">♟️</div>
            <div class="chatbot-header-text">
              <h3>Assistant Cours d'Échecs</h3>
              <p>Parlons de ta progression ♟️</p>
            </div>
          </div>
          <button class="chatbot-close" id="chatbot-close">✕</button>
        </div>
        <div class="chatbot-messages" id="chatbot-messages">
          <div class="message bot">
            <div class="message-content">Salut ! 👋 Je suis l'assistant échecs de Nicolas. Tu peux poser tes questions ici !</div>
          </div>
        </div>
        <div class="chatbot-input-area">
          <textarea class="chatbot-input" id="chatbot-input" placeholder="Pose ta question..." rows="1"></textarea>
          <button class="chatbot-send" id="chatbot-send">➤</button>
        </div>
      </div>
    </div>
  `;

  // Insert chatbot at the end of body
  document.body.insertAdjacentHTML('beforeend', chatbotHTML);

  // Initialize chatbot functionality
  const toggleBtn = document.getElementById('chatbot-toggle');
  const closeBtn = document.getElementById('chatbot-close');
  const container = document.getElementById('chatbot-container');
  const messagesDiv = document.getElementById('chatbot-messages');
  const input = document.getElementById('chatbot-input');
  const sendBtn = document.getElementById('chatbot-send');

  const sessionId = getSessionId();

  // Toggle chatbot
  toggleBtn.addEventListener('click', () => {
    container.classList.toggle('active');
    if (container.classList.contains('active')) {
      input.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    container.classList.remove('active');
  });

  // Send message
  async function sendMessage() {
    const message = input.value.trim();
    if (!message) return;

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'message user';
    userMsg.innerHTML = `<div class="message-content">${escapeHtml(message)}</div>`;
    messagesDiv.appendChild(userMsg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Add typing indicator
    const typingMsg = document.createElement('div');
    typingMsg.className = 'message bot';
    typingMsg.innerHTML = `
      <div class="message-content">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    messagesDiv.appendChild(typingMsg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Disable send button
    sendBtn.disabled = true;

    try {
      const response = await fetch(`${CHATBOT_CONFIG.API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
      });

      const data = await response.json();

      // Remove typing indicator
      typingMsg.remove();

      // Add bot response
      const botMsg = document.createElement('div');
      botMsg.className = 'message bot';
      botMsg.innerHTML = `<div class="message-content">${escapeHtml(data.message)}</div>`;
      messagesDiv.appendChild(botMsg);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;

    } catch (error) {
      console.error('Error:', error);
      typingMsg.remove();
      
      const errorMsg = document.createElement('div');
      errorMsg.className = 'message bot';
      errorMsg.innerHTML = `<div class="message-content">Désolé, une erreur s'est produite. Réessaie dans un instant.</div>`;
      messagesDiv.appendChild(errorMsg);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } finally {
      sendBtn.disabled = false;
    }
  }

  // Send on button click
  sendBtn.addEventListener('click', sendMessage);

  // Send on Enter (but allow Shift+Enter for new line)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
  });

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
