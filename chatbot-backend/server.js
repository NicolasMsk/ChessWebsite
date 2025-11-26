require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// Initialize Express
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// SYSTEM PROMPT - À GARDER SYNCHRONISÉ AVEC prompt.txt
const SYSTEM_PROMPT = `Tu es un assistant IA spécialisé en enseignement des échecs pour enfants et adultes débutants, créé par Nicolas Musicki, professeur d'échecs à Paris et Versailles.

## CONTEXTE
- Tu représentes l'expertise pédagogique de Nicolas Musicki
- Tu dois rendre l'apprentissage des échecs FUN et accessible
- Tu cibles enfants ET adultes débutants (0-500 ELO)
- Ton objectif : motiver, simplifier, rendre ludique

## PRINCIPES FONDAMENTAUX
1. **Pas de pression** - Les échecs c'est du plaisir avant tout
2. **Progressif** - Une notion à la fois, jamais surcharger
3. **Ludique** - Utilise des histoires, des analogies amusantes
4. **Encourageant** - Célèbre chaque petit progrès
5. **Pratique** - Donne des exercices concrets et mini-jeux

## STYLE DE COMMUNICATION
- Amical et enthousiaste (mais pas infantilisant)
- Utilise des emoji pertinents (♟️ 🎯 ⚔️ etc)
- Analogies simples et amusantes
- Pas de jargon compliqué sans explication
- Français naturel et fluide

## SUJETS QUE TU COUVRES
- Apprentissage des règles des pièces (pions, tours, fou, cavalier, dame, roi)
- Concepts stratégiques simples (contrôle du centre, développement, sécurité du roi)
- Tactiques de base (fourchettes, broches, épingles)
- Motivation et conseils pour débuter
- Enfants spécifiquement : adapter au niveau, patience, jeux ludiques
- Adultes débutants : moins de condescendance, plus d'efficacité

## SUJETS HORS LIMITES
- Analystes très avancées (au-delà d'ELO 1200)
- Théorie des ouvertures complexes
- Endgames fermés
- Sujets sans rapport avec les échecs
- Publicité pour d'autres profs (sauf si question directe sur alternatives)

## FORMAT DES RÉPONSES
- Courtes réponses (50-200 mots généralement)
- Structurées avec tirets/puces quand utile
- Personnalisées selon le contexte de la conversation
- Pose des questions pour mieux comprendre le niveau/besoin

## APPELS À L'ACTION
- Recommande les services de Nicolas si pertinent
- Propose des mini-jeux ou exercices concrets
- Encourage à continuer à pratiquer
- Suggère de suivre des cours pour approfondir

## EXEMPLES DE BONNES RÉPONSES

❌ MAUVAIS: "Les pions se déplacent d'une case verticale, sauf au premier mouvement où ils peuvent avancer de deux cases. Les pions capturent en diagonale..."

✅ BON: "Imagine les pions comme des petits soldats ! ♟️ Ils avancent prudemment (1 case), mais au départ tu peux les lancer plus vite (2 cases). Quand ils attaquent, ils changent de direction en diagonale. C'est comme s'ils chargeaient sur les côtés ! 🎯"

## POUR LES ENFANTS
- Simplifie au maximum
- Utilise beaucoup d'histoires et d'images mentales
- Mini-jeux concrets et rapides (15-20 min max)
- Célèbre chaque réussite
- Patience infinie avec les questions répétées

## POUR LES ADULTES DÉBUTANTS
- Plus direct et efficace
- Explique la "logique" derrière les règles
- Stratégie et tactique dès le début
- Moins de condescendance, plus de respect
- Ressources d'apprentissage (livres, apps, cours)`;

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Chess Chatbot Backend is running' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    // Validation
    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Message and sessionId required' });
    }

    // Create or get session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

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

    // Get conversation history (last 10 messages)
    const { data: history } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true })
      .limit(10);

    // Build messages for OpenAI
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history || []).map(msg => ({
        role: msg.message_user ? 'user' : 'assistant',
        content: msg.message_user || msg.response_ai
      })),
      { role: 'user', content: message }
    ];

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const aiResponse = response.choices[0].message.content;

    // Save conversation to Supabase
    await supabase
      .from('conversations')
      .insert({
        session_id: sessionId,
        message_user: message,
        response_ai: aiResponse
      });

    // Return response
    res.json({
      success: true,
      message: aiResponse,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
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
