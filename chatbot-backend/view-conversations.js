// Script pour visualiser les conversations et statistiques du chatbot
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

async function getStatistics() {
  console.log('\n' + '='.repeat(80));
  console.log(colors.bright + colors.cyan + '📊 STATISTIQUES CHATBOT' + colors.reset);
  console.log('='.repeat(80) + '\n');

  try {
    // Nombre total de sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*');
    
    if (sessionsError) throw sessionsError;

    // Nombre total de conversations
    const { data: conversations, error: convsError } = await supabase
      .from('conversations')
      .select('*');
    
    if (convsError) throw convsError;

    console.log(colors.green + '✓ Sessions actives:' + colors.reset, sessions.length);
    console.log(colors.green + '✓ Total messages:' + colors.reset, conversations.length);
    console.log(colors.green + '✓ Messages par session (moyenne):' + colors.reset, 
      sessions.length > 0 ? (conversations.length / sessions.length).toFixed(1) : 0);

    // Sessions les plus actives
    const sessionActivity = {};
    conversations.forEach(conv => {
      sessionActivity[conv.session_id] = (sessionActivity[conv.session_id] || 0) + 1;
    });

    const topSessions = Object.entries(sessionActivity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    console.log('\n' + colors.yellow + '🔥 Top 5 sessions les plus actives:' + colors.reset);
    topSessions.forEach(([sessionId, count], index) => {
      console.log(`  ${index + 1}. ${sessionId.substring(0, 8)}... - ${count} messages`);
    });

    // Questions les plus récentes
    const recentConvs = conversations
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 3);

    console.log('\n' + colors.blue + '⏰ 3 dernières questions:' + colors.reset);
    recentConvs.forEach((conv, index) => {
      const date = new Date(conv.timestamp).toLocaleString('fr-FR');
      console.log(`  ${index + 1}. [${date}] "${conv.message_user.substring(0, 50)}${conv.message_user.length > 50 ? '...' : ''}"`);
    });

  } catch (error) {
    console.error(colors.red + '❌ Erreur:', error.message + colors.reset);
  }
}

async function viewConversations(sessionId = null, limit = 10) {
  console.log('\n' + '='.repeat(80));
  console.log(colors.bright + colors.magenta + '💬 CONVERSATIONS' + colors.reset);
  console.log('='.repeat(80) + '\n');

  try {
    let query = supabase
      .from('conversations')
      .select('*')
      .order('timestamp', { ascending: false });

    if (sessionId) {
      query = query.eq('session_id', sessionId);
      console.log(colors.cyan + `🔍 Filtrage par session: ${sessionId}` + colors.reset + '\n');
    }

    query = query.limit(limit);

    const { data: conversations, error } = await query;
    
    if (error) throw error;

    if (conversations.length === 0) {
      console.log(colors.yellow + '⚠️  Aucune conversation trouvée.' + colors.reset);
      return;
    }

    conversations.forEach((conv, index) => {
      const date = new Date(conv.timestamp).toLocaleString('fr-FR');
      const sessionShort = conv.session_id.substring(0, 8);
      
      console.log(colors.bright + `\n━━━ Conversation ${index + 1} ━━━` + colors.reset);
      console.log(colors.cyan + `📅 Date:` + colors.reset, date);
      console.log(colors.cyan + `🆔 Session:` + colors.reset, sessionShort + '...');
      console.log(colors.green + `👤 USER:` + colors.reset, conv.message_user);
      console.log(colors.blue + `🤖 BOT:` + colors.reset, conv.response_ai);
    });

    console.log('\n' + '─'.repeat(80));
    console.log(colors.yellow + `📝 Affichage de ${conversations.length} conversation(s)` + colors.reset);

  } catch (error) {
    console.error(colors.red + '❌ Erreur:', error.message + colors.reset);
  }
}

async function viewBySession() {
  console.log('\n' + '='.repeat(80));
  console.log(colors.bright + colors.cyan + '📋 SESSIONS DISPONIBLES' + colors.reset);
  console.log('='.repeat(80) + '\n');

  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('session_id, created_at')
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    if (sessions.length === 0) {
      console.log(colors.yellow + '⚠️  Aucune session trouvée.' + colors.reset);
      return;
    }

    console.log(colors.green + `✓ ${sessions.length} session(s) trouvée(s):` + colors.reset + '\n');

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      const date = new Date(session.created_at).toLocaleString('fr-FR');
      
      // Compter les messages pour cette session
      const { data: convs } = await supabase
        .from('conversations')
        .select('*')
        .eq('session_id', session.session_id);

      console.log(`${i + 1}. ${colors.cyan}${session.session_id}${colors.reset}`);
      console.log(`   Créée: ${date}`);
      console.log(`   Messages: ${convs?.length || 0}\n`);
    }

  } catch (error) {
    console.error(colors.red + '❌ Erreur:', error.message + colors.reset);
  }
}

async function searchByKeyword(keyword) {
  console.log('\n' + '='.repeat(80));
  console.log(colors.bright + colors.yellow + `🔍 RECHERCHE: "${keyword}"` + colors.reset);
  console.log('='.repeat(80) + '\n');

  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`message_user.ilike.%${keyword}%,response_ai.ilike.%${keyword}%`)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;

    if (conversations.length === 0) {
      console.log(colors.yellow + '⚠️  Aucun résultat pour ce mot-clé.' + colors.reset);
      return;
    }

    console.log(colors.green + `✓ ${conversations.length} résultat(s) trouvé(s):` + colors.reset + '\n');

    conversations.forEach((conv, index) => {
      const date = new Date(conv.timestamp).toLocaleString('fr-FR');
      const sessionShort = conv.session_id.substring(0, 8);
      
      console.log(colors.bright + `━━━ Résultat ${index + 1} ━━━` + colors.reset);
      console.log(colors.cyan + `📅 Date:` + colors.reset, date);
      console.log(colors.cyan + `🆔 Session:` + colors.reset, sessionShort + '...');
      console.log(colors.green + `👤 USER:` + colors.reset, conv.message_user);
      console.log(colors.blue + `🤖 BOT:` + colors.reset, conv.response_ai);
      console.log('');
    });

  } catch (error) {
    console.error(colors.red + '❌ Erreur:', error.message + colors.reset);
  }
}

// Menu interactif
async function showMenu() {
  console.clear();
  console.log('\n' + '='.repeat(80));
  console.log(colors.bright + colors.green + '🎯 CHATBOT - VISUALISEUR DE CONVERSATIONS' + colors.reset);
  console.log('='.repeat(80));
  console.log('\nCommandes disponibles:\n');
  console.log('  ' + colors.cyan + 'node view-conversations.js stats' + colors.reset + '           - Afficher les statistiques');
  console.log('  ' + colors.cyan + 'node view-conversations.js view [limit]' + colors.reset + '    - Voir les dernières conversations');
  console.log('  ' + colors.cyan + 'node view-conversations.js sessions' + colors.reset + '        - Lister toutes les sessions');
  console.log('  ' + colors.cyan + 'node view-conversations.js session <id>' + colors.reset + '   - Voir conversations d\'une session');
  console.log('  ' + colors.cyan + 'node view-conversations.js search <mot>' + colors.reset + '   - Rechercher par mot-clé');
  console.log('\nExemples:');
  console.log('  node view-conversations.js stats');
  console.log('  node view-conversations.js view 20');
  console.log('  node view-conversations.js session a5006603-c68f-49f3-9974-f6d8e916083a');
  console.log('  node view-conversations.js search "tarif"');
  console.log('\n' + '='.repeat(80) + '\n');
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    await showMenu();
    return;
  }

  switch (command) {
    case 'stats':
      await getStatistics();
      break;
    
    case 'view':
      const limit = parseInt(args[1]) || 10;
      await viewConversations(null, limit);
      break;
    
    case 'sessions':
      await viewBySession();
      break;
    
    case 'session':
      if (!args[1]) {
        console.log(colors.red + '❌ Erreur: ID de session requis' + colors.reset);
        console.log('Usage: node view-conversations.js session <session-id>');
        return;
      }
      await viewConversations(args[1], 100);
      break;
    
    case 'search':
      if (!args[1]) {
        console.log(colors.red + '❌ Erreur: Mot-clé requis' + colors.reset);
        console.log('Usage: node view-conversations.js search <mot-clé>');
        return;
      }
      await searchByKeyword(args[1]);
      break;
    
    default:
      console.log(colors.red + `❌ Commande inconnue: ${command}` + colors.reset);
      await showMenu();
  }

  console.log('\n');
}

main();
