// Estado global
let usuarioLogado = null;
let jogosData = [];
let palpitesUsuario = {};
let palpitesAtuais = {};

// Elementos DOM
const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('appScreen');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const nomeUsuario = document.getElementById('nomeUsuario');
const logoutBtn = document.getElementById('logoutBtn');
const jogosContainer = document.getElementById('jogosContainer');
const loading = document.getElementById('loading');
const submitContainer = document.getElementById('submitContainer');
const submitBtn = document.getElementById('submitBtn');
const successMessage = document.getElementById('successMessage');
const prazosInfo = document.getElementById('prazosInfo');
const progressContainer = document.getElementById('progressContainer');

// ===== CONFIGURAR POWER BI =====
function configurarLinkPowerBI(bolao) {
    const powerBIFrame = document.getElementById('powerBIFrame');
    
    const urls = {
        'GERAL': 'https://app.powerbi.com/view?r=eyJrIjoiYjg2YTNiZjMtNGI0OS00NmQxLTllYjMtNDUzYzMyZjliZGM2IiwidCI6IjViYjM1MmQwLWMyM2ItNDc5My05MjkwLTZmY2Q0NmVhMzZkZiJ9&pageName=ReportSection16fe902b8ade46b31c66',
        'AMIGOS': 'https://app.powerbi.com/view?r=eyJrIjoiN2U0MzgxNWUtZDY1Yy00MDFiLWIyZDEtNmQ3YTEyMTY1ZTFmIiwidCI6IjViYjM1MmQwLWMyM2ItNDc5My05MjkwLTZmY2Q0NmVhMzZkZiJ9&pageName=ReportSection16fe902b8ade46b31c66'
    };
    
    if (powerBIFrame && urls[bolao]) {
        powerBIFrame.src = urls[bolao];
        console.log('✅ Power BI carregado para bolão:', bolao);
    } else {
        console.error('❌ Power BI não configurado para:', bolao);
        if (powerBIFrame) {
            powerBIFrame.style.display = 'none';
        }
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    mostrarPrazos();
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    if (submitBtn) {
        submitBtn.addEventListener('click', salvarPalpitesSupabase);
    }
});

// Mostrar prazos na tela de login
function mostrarPrazos() {
    if (!prazosInfo) return;
    
    let html = '';
    for (const [fase, dataLimite] of Object.entries(DATAS_LIMITE)) {
        const tempoRestante = calcularTempoRestante(dataLimite);
        const classe = tempoRestante.encerrado ? 'prazo-encerrado' : 'prazo-aberto';
        const icone = tempoRestante.encerrado ? '🔒' : '🟢';
        const texto = tempoRestante.encerrado ? 'Indisponivel' : tempoRestante.texto;
        
        html += `<div class="prazo-item ${classe}">${icone} ${fase}: ${texto}</div>`;
    }
    prazosInfo.innerHTML = html;
}

// Calcular tempo restante
function calcularTempoRestante(dataLimite) {
    const agora = new Date();
    const diferenca = dataLimite - agora;
    
    if (diferenca <= 0) {
        return { encerrado: true, texto: 'Indisponível' };
    }
    
    const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
    
    if (dias > 0) {
        return { encerrado: false, texto: `${dias}d ${horas}h ${minutos}min` };
    } else if (horas > 0) {
        return { encerrado: false, texto: `${horas}h ${minutos}min` };
    } else {
        return { encerrado: false, texto: `${minutos}min` };
    }
}

// Verificar se fase está aberta
function faseEstaAberta(fase) {
    if (!DATAS_LIMITE[fase]) return true;
    return !calcularTempoRestante(DATAS_LIMITE[fase]).encerrado;
}

// Logout
function handleLogout() {
    usuarioLogado = null;
    palpitesAtuais = {};
    palpitesUsuario = {};
    
    sessionStorage.clear();
    
    if (supabase && supabase.auth) {
        supabase.auth.signOut();
    }
    
    loginScreen.style.display = 'block';
    appScreen.style.display = 'none';
    
    loginError.style.display = 'none';
}

// Carregar dados do Google Sheets
async function carregarDados() {
    try {
        loading.style.display = 'block';
        jogosContainer.innerHTML = '';
        
        await carregarJogos();
        
        renderizarJogos();
        
        loading.style.display = 'none';
        submitContainer.style.display = 'block';
        
    } catch (error) {
        loading.innerHTML = `<p style="color: #f44336;">❌ Erro ao carregar dados: ${error.message}</p>`;
    }
}

// Carregar jogos do Google Sheets
async function carregarJogos() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/JOGOS?key=${API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.values) {
        throw new Error('Nenhum jogo encontrado');
    }
    
    const headers = data.values[0];
    jogosData = data.values.slice(1).map(row => {
        const jogo = {};
        headers.forEach((header, index) => {
            jogo[header] = row[index] || '';
        });
        return jogo;
    });
}

// Renderizar jogos por fase
function renderizarJogos() {
    const fases = ['Grupo', '16 avos', 'Oitavas de final', 'Quartas de final', 'Semifinais', 'Terceiro e Quarto', 'Final'];
    let html = '';
    let temFaseAberta = false;
    
    fases.forEach(fase => {
        const jogosFase = jogosData.filter(j => j.Fase === fase);
        if (jogosFase.length === 0) return;
        
        const faseAberta = faseEstaAberta(fase);
        if (faseAberta) temFaseAberta = true;
        
        const tempoRestante = calcularTempoRestante(DATAS_LIMITE[fase]);
        
        html += `
            <div class="fase-section">
                <div class="fase-header">
                    <h2 class="fase-title">🏆 ${fase}</h2>
                    <div class="fase-prazo ${faseAberta ? 'aberta' : 'encerrada'}">
                        ${faseAberta ? '⏰ ' + tempoRestante.texto : '🔒 Indisponível'}
                    </div>
                </div>
        `;
        
        if (!faseAberta) {
            html += `<div class="fase-bloqueada">⚠️ Palpites desta fase indisponível</div>`;
        }
        
        if (fase === 'Grupo') {
            const grupos = [...new Set(jogosFase.map(j => j.Grupo))].sort();
            grupos.forEach(grupo => {
                if (grupo) {
                    html += `<h3 class="grupo-subtitle">Grupo ${grupo}</h3>`;
                    const jogosGrupo = jogosFase.filter(j => j.Grupo === grupo);
                    jogosGrupo.forEach(jogo => {
                        html += renderizarJogo(jogo, faseAberta);
                    });
                }
            });
        } else {
            jogosFase.forEach(jogo => {
                html += renderizarJogo(jogo, faseAberta);
            });
        }
        
        html += `</div>`;
    });
    
    if (!temFaseAberta) {
        html += `<div class="fase-bloqueada" style="font-size: 1.2rem; padding: 30px;">
            🔒 Todas as fases encerradas. Você está visualizando seus palpites salvos.
        </div>`;
        submitContainer.style.display = 'none';
    }
    
    jogosContainer.innerHTML = html;
    
    document.querySelectorAll('.gols-input').forEach(input => {
        input.addEventListener('change', handlePalpiteChange);
    });
}

// Renderizar um jogo individual
function renderizarJogo(jogo, faseAberta) {
    const idJogo = jogo.ID_Jogo;
    const palpiteAnterior = palpitesUsuario[idJogo] || { golsA: 0, golsB: 0 };
    
    if (faseAberta) {
        return `
            <div class="jogo-card">
                <div class="jogo-content">
                    <div class="time">
                        <h3>${jogo.SeleçãoA}</h3>
                    </div>
                    <div>
                        <input type="number" class="gols-input" 
                               data-jogo="${idJogo}" 
                               data-time="A" 
                               min="0" max="20" 
                               value="${palpiteAnterior.golsA}">
                    </div>
                    <div class="vs">X</div>
                    <div>
                        <input type="number" class="gols-input" 
                               data-jogo="${idJogo}" 
                               data-time="B" 
                               min="0" max="20" 
                               value="${palpiteAnterior.golsB}">
                    </div>
                    <div class="time">
                        <h3>${jogo.SeleçãoB}</h3>
                    </div>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="jogo-card">
                <div class="jogo-content">
                    <div class="time">
                        <h3>${jogo.SeleçãoA}</h3>
                    </div>
                    <div class="gols-display">${palpiteAnterior.golsA}</div>
                    <div class="vs">X</div>
                    <div class="gols-display">${palpiteAnterior.golsB}</div>
                    <div class="time">
                        <h3>${jogo.SeleçãoB}</h3>
                    </div>
                </div>
            </div>
        `;
    }
}

// Atualizar palpite quando input muda
function handlePalpiteChange(e) {
    const idJogo = e.target.dataset.jogo;
    const time = e.target.dataset.time;
    const valor = parseInt(e.target.value) || 0;
    
    if (!palpitesAtuais[idJogo]) {
        palpitesAtuais[idJogo] = { golsA: 0, golsB: 0 };
    }
    
    if (time === 'A') {
        palpitesAtuais[idJogo].golsA = valor;
    } else {
        palpitesAtuais[idJogo].golsB = valor;
    }
}

// ===== SALVAR PALPITES NO SUPABASE =====
async function salvarPalpitesSupabase() {
    const userId = sessionStorage.getItem('user_id');
    const bolao = sessionStorage.getItem('bolao');
    const participante = sessionStorage.getItem('participante');
    
    if (!userId) {
        alert('❌ Erro: Faça login novamente');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ SALVANDO...';
    
    // Coletar TODOS os palpites dos inputs
    const inputs = document.querySelectorAll('.gols-input');
    inputs.forEach(input => {
        const idJogo = input.dataset.jogo;
        const time = input.dataset.time;
        const valor = parseInt(input.value) || 0;
        
        if (!palpitesAtuais[idJogo]) {
            palpitesAtuais[idJogo] = { golsA: 0, golsB: 0 };
        }
        
        if (time === 'A') {
            palpitesAtuais[idJogo].golsA = valor;
        } else {
            palpitesAtuais[idJogo].golsB = valor;
        }
    });
    
    const palpitesParaSalvar = [];
    
    for (const [idJogo, palpite] of Object.entries(palpitesAtuais)) {
        const jogo = jogosData.find(j => j.ID_Jogo == idJogo);
        
        // Só salvar se a fase estiver aberta
        if (jogo && faseEstaAberta(jogo.Fase)) {
            palpitesParaSalvar.push({
                user_id: userId,
                participante: participante,
                id_jogo: idJogo,
                gols_a: parseInt(palpite.golsA) || 0,
                gols_b: parseInt(palpite.golsB) || 0,
                bolao: bolao
            });
        }
    }
    
    if (palpitesParaSalvar.length === 0) {
        alert('❌ Nenhum palpite em fases abertas para salvar!');
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 ENVIAR PALPITES';
        return;
    }
    
    try {
        console.log('🔄 Deletando palpites antigos de fases abertas...');
        
        // Pegar IDs dos jogos de fases abertas
        const idsJogosFasesAbertas = palpitesParaSalvar.map(p => p.id_jogo);
        
        const { error: deleteError } = await supabase
            .from('palpites')
            .delete()
            .eq('user_id', userId)
            .eq('bolao', bolao)
            .in('id_jogo', idsJogosFasesAbertas);
        
        if (deleteError) throw deleteError;
        
        console.log('💾 Salvando', palpitesParaSalvar.length, 'palpites...');
        
        const batchSize = 50;
        for (let i = 0; i < palpitesParaSalvar.length; i += batchSize) {
            const batch = palpitesParaSalvar.slice(i, i + batchSize);
            
            const { error: insertError } = await supabase
                .from('palpites')
                .insert(batch);
            
            if (insertError) throw insertError;
            
            const progresso = Math.min(100, ((i + batchSize) / palpitesParaSalvar.length) * 100);
            submitBtn.textContent = `⏳ ${Math.round(progresso)}%...`;
        }
        
        submitBtn.textContent = '✅ SALVO!';
        submitBtn.style.background = '#4CAF50';
        
        if (successMessage) {
            successMessage.textContent = `✅ ${palpitesParaSalvar.length} palpites salvos com sucesso!`;
            successMessage.style.display = 'block';
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 5000);
        }
        
        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 ENVIAR PALPITES';
            submitBtn.style.background = '';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        alert('❌ Erro ao salvar: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 ENVIAR PALPITES';
    }
}
