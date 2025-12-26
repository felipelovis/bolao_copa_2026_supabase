// ===== SUPABASE CONFIG =====
const SUPABASE_URL = 'https://silwyysyzalfcnmaxqbh.supabase.co';
// Use a chave que você sabe que está correta. Mantive a do seu config.js original:
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpbHd5eXN5emFsZmNubWF4cWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDY5ODcsImV4cCI6MjA3OTE4Mjk4N30.kQwIioycFbPOLzdzn_adJ65ty0vIDzEPqibcDec_8yk';

// VERIFICAÇÃO DE SEGURANÇA
if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.error('❌ A biblioteca do Supabase (CDN) não foi carregada antes do config.js!');
} else {
    // AQUI ESTÁ O TRUQUE:
    // Criamos o cliente e atribuímos diretamente ao objeto global 'window.supabase'
    // Isso torna a variável 'supabase' visível para o Auth.js, App.js e Admin.html
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase Conectado Globalmente');
}

// ===== GOOGLE SHEETS CONFIG =====
const SPREADSHEET_ID = '1wTFNb0iaDg_3y9fszpUkkdG02xEdTdXUK4HLo1PULRk';
const API_KEY = 'AIzaSyDFMcnjQHmqQhKyWysq5GHyCRINDnitg_A';

// ===== DATAS LIMITE =====
const DATAS_LIMITE = {
    'Grupo': new Date('2026-06-12T14:00:00'),
    '16 avos': new Date('2026-06-12T12:00:00'),
    'Oitavas de final': new Date('2025-11-12T12:00:00'),
    'Quartas de final': new Date('2025-11-12T16:00:00'),
    'Semifinais': new Date('2025-11-12T16:00:00'),
    'Terceiro e Quarto': new Date('2025-11-12T14:00:00'),
    'Final': new Date('2025-11-12T16:00:00')
};
