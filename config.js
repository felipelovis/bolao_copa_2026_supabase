// ===== SUPABASE CONFIG =====
const SUPABASE_URL = 'https://silwyysyzalfcnmaxqbh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpbHd5eXN5emFsZmNubWF4cWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwNjA2NzcsImV4cCI6MjA0NzYzNjY3N30.xOqT7LUPZhQiAY_GIlqQj-pn8KPm_-i2kh6E5P0t2YM';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// ===== APPS SCRIPT (LEGADO - NÃO USADO MAIS) =====
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTd5SOdLOr9bD12gtBg74PSN7v-xac21ELQW-21FL_vOjAGjLJ1k45iEDGQHtlI5JB/exec';
