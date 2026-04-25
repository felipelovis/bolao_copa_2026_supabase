// ===== SUPABASE CONFIG =====
const SUPABASE_URL = 'https://silwyysyzalfcnmaxqbh.supabase.co';

// ✅ SUA CHAVE CORRETA (ATUALIZADA):
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpbHd5eXN5emFsZmNubWF4cWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDY5ODcsImV4cCI6MjA3OTE4Mjk4N30.kQwIioycFbPOLzdzn_adJ65ty0vIDzEPqibcDec_8yk';

// ===== INICIALIZAÇÃO DO CLIENTE (CORREÇÃO DO ERRO UNDEFINED) =====
// Verifica se a biblioteca foi carregada antes
if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.error('❌ ERRO CRÍTICO: A biblioteca do Supabase (CDN) não foi carregada antes do config.js!');
    alert('Erro no carregamento do sistema. Verifique o console.');
} else {
    // Cria o cliente e "pendura" ele na janela global para o Auth.js e App.js usarem
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase Conectado Globalmente com a chave nova!');
}

// ===== GOOGLE SHEETS CONFIG =====
const SPREADSHEET_ID = '1wTFNb0iaDg_3y9fszpUkkdG02xEdTdXUK4HLo1PULRk';
const API_KEY = 'AIzaSyDFMcnjQHmqQhKyWysq5GHyCRINDnitg_A';

// ===== ORDEM DAS FASES =====
// Datas de abertura/fechamento são calculadas dinamicamente a partir do Google Sheets
const ORDEM_FASES = ['Grupo', '16 avos', 'Oitavas de final', 'Quartas de final', 'Semifinais', 'Terceiro e Quarto', 'Final'];
