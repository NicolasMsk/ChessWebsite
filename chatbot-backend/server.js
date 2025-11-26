require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize Express
const app = express();

// Logs de démarrage
console.log('🚀 Starting Chess Chatbot Server...');
console.log('📝 Environment Variables Check:');
console.log('  - SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
console.log('  - SUPABASE_SECRET_KEY:', process.env.SUPABASE_SECRET_KEY ? '✓ Set' : '✗ Missing');
console.log('  - OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing');
console.log('  - OPENAI_MODEL:', process.env.OPENAI_MODEL || 'gpt-4o-mini (default)');
console.log('  - PORT:', process.env.PORT || '3000 (default)');
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'development (default)');
console.log('  - CORS_ORIGIN:', process.env.CORS_ORIGIN || '* (all origins)');

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Initialize Supabase
console.log('🗄️  Initializing Supabase client...');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);
console.log('✓ Supabase client initialized');

// Initialize OpenAI
console.log('🤖 Initializing OpenAI client...');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
console.log('✓ OpenAI client initialized');

// Load SYSTEM PROMPT from prompt.txt file
console.log('📄 Loading system prompt from prompt.txt...');
let SYSTEM_PROMPT;
try {
  const promptPath = path.join(__dirname, 'prompt.txt');
  SYSTEM_PROMPT = fs.readFileSync(promptPath, 'utf8');
  console.log('✓ System prompt loaded successfully');
  console.log(`  - Length: ${SYSTEM_PROMPT.length} characters`);
} catch (error) {
  console.error('❌ Error loading prompt.txt:', error.message);
  console.log('⚠️  Using fallback prompt...');
  SYSTEM_PROMPT = `Tu es un assistant commercial pour Nicolas Musicki, professeur d'échecs à Paris.
  
TARIFS:
- Cours individuel: 50€/h
- Cours duo: 75€/h
- 1er cours GRATUIT

Contact: nicolas.musicki@gmail.com / +33609365691

Tu dois TOUJOURS mentionner le 1er cours gratuit et les tarifs quand on te pose des questions.`;
}

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Chess Chatbot Backend is running' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  console.log('\n💬 New chat request received');
  try {
    const { message, sessionId } = req.body;
    console.log('  - Session ID:', sessionId);
    console.log('  - Message:', message?.substring(0, 50) + '...');

    // Validation
    if (!message || !sessionId) {
      console.log('❌ Validation failed: Missing message or sessionId');
      return res.status(400).json({ error: 'Message and sessionId required' });
    }

    // Create or get session
    console.log('📦 Checking session in Supabase...');
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();
    
    console.log('  - Session found:', session ? '✓' : '✗');

    if (sessionError && sessionError.code !== 'PGRST116') {
      throw sessionError;
    }

    // If session doesn't exist, create it
    if (!session) {
      await supabase
        .from('sessions')
        .insert({
          session_id: sessionId,
          user_identifier: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        });
    }

    // Get conversation history (last 3 exchanges = 6 messages max)
    const { data: history } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false })
      .limit(3);

    // Build messages for OpenAI
    console.log('📚 Building message history...');
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];
    
    // Add history in correct order (oldest first)
    if (history && history.length > 0) {
      history.reverse().forEach(msg => {
        messages.push({ role: 'user', content: msg.message_user });
        messages.push({ role: 'assistant', content: msg.response_ai });
      });
    }
    
    // Add current message
    messages.push({ role: 'user', content: message });
    
    console.log('  - Total messages:', messages.length);

    // Call OpenAI API
    console.log('🤖 Calling OpenAI API...');
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const aiResponse = response.choices[0].message.content;
    console.log('✓ OpenAI response received:', aiResponse?.substring(0, 50) + '...');

    // Save conversation to Supabase
    console.log('💾 Saving to Supabase...');
    await supabase
      .from('conversations')
      .insert({
        session_id: sessionId,
        message_user: message,
        response_ai: aiResponse
      });
    console.log('✓ Conversation saved');

    // Return response
    console.log('✅ Sending response to client');
    res.json({
      success: true,
      message: aiResponse,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('\n❌ Error in /api/chat:');
    console.error('  - Error message:', error.message);
    console.error('  - Error stack:', error.stack);
    console.error('  - Full error:', JSON.stringify(error, null, 2));
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: error.stack
    });
  }
});

// Get conversation history
app.get('/api/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: history, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    res.json({ success: true, history: history || [] });
  } catch (error) {
    console.error('Error in /api/history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎯 Chess Chatbot Backend running on port ${PORT}`);
  console.log(`Model: ${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`);
  console.log(`Supabase: ${process.env.SUPABASE_URL}`);
});
