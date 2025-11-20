// ===== CONFIGURAÇÃO SUPABASE =====
const SUPABASE_URL = 'https://silwyysyzalfcnmaxqbh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpbHd5eXN5emFsZmNubWF4cWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDY5ODcsImV4cCI6MjA3OTE4Mjk4N30.kQwIioycFbPOLzdzn_adJ65ty0vIDzEPqibcDec_8yk';

// Inicializar cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
