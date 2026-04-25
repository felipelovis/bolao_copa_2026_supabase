// Estado global
let usuarioLogado = null;
let jogosData = [];
let palpitesUsuario = {};
let palpitesAtuais = {};
let palpitesEditados = new Set(); // IDs de jogos que o usuário salvou explicitamente
let datasAbertura = {};
let datasFechamento = {};

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
        'GERAL': 'https://app.powerbi.com/view?r=eyJrIjoiZDRiNDFhYmUtNjM2Yi00NmZhLWIyNmItMzJmNDJmMjRjMTgyIiwidCI6IjViYjM1MmQwLWMyM2ItNDc5My05MjkwLTZmY2Q0NmVhMzZkZiJ9',
        'AMIGOS': 'https://app.powerbi.com/view?r=eyJrIjoiOGMyNzJjNGItMjJmZS00MTY4LWI3NjAtNmYyZDMwMjU4NTE4IiwidCI6IjViYjM1MmQwLWMyM2ItNDc5My05MjkwLTZmY2Q0NmVhMzZkZiJ9'
    };
    
    const titulo = document.getElementById('rankingTitulo');
    if (titulo) titulo.textContent = `📊 Ranking do Bolão — ${bolao}`;

    if (powerBIFrame && urls[bolao]) {
        // Limpar iframe primeiro
        powerBIFrame.src = 'about:blank';
        
        // Após 100ms, carregar com timestamp
        setTimeout(() => {
            const timestamp = new Date().getTime();
            const urlComTimestamp = urls[bolao] + '&refresh=' + timestamp;
            powerBIFrame.src = urlComTimestamp;
            console.log('✅ Power BI carregado para bolão:', bolao, '(refresh:', timestamp, ')');
        }, 100);
    } else {
        console.error('❌ Power BI não configurado para:', bolao);
        if (powerBIFrame) {
            powerBIFrame.style.display = 'none';
        }
    }
}

// Converter data DD/MM/YYYY e hora HH:MM para Date
function parsearDataJogo(data, hora) {
    if (!data || !hora) return null;
    const partes = data.split('/');
    if (partes.length !== 3) return null;
    const [dia, mes, ano] = partes;
    const [hh, mm] = (hora || '00:00').split(':');
    return new Date(ano, mes - 1, dia, hh || 0, mm || 0);
}

// Calcular abertura e fechamento de cada fase a partir dos jogos carregados
function calcularDatasLimiteDinamicas() {
    datasAbertura = {};
    datasFechamento = {};

    ORDEM_FASES.forEach((fase, idx) => {
        const jogosFase = jogosData.filter(j => j.Fase === fase);
        if (jogosFase.length === 0) return;

        const datas = jogosFase.map(j => parsearDataJogo(j.Data, j.Horário)).filter(Boolean);
        if (datas.length === 0) return;

        // Fase fecha no primeiro jogo dela (não dá pra palpitar depois que começou)
        datasFechamento[fase] = new Date(Math.min(...datas));

        // Primeira fase abre imediatamente
        if (idx === 0) {
            datasAbertura[fase] = new Date(0);
            return;
        }

        // Demais fases abrem às 00:01 do dia seguinte ao último jogo da fase anterior
        const faseAnterior = ORDEM_FASES[idx - 1];
        const jogosFaseAnterior = jogosData.filter(j => j.Fase === faseAnterior);
        const datasAnterior = jogosFaseAnterior.map(j => parsearDataJogo(j.Data, j.Horário)).filter(Boolean);

        if (datasAnterior.length > 0) {
            const ultimoJogo = new Date(Math.max(...datasAnterior));
            const abertura = new Date(ultimoJogo);
            abertura.setDate(abertura.getDate() + 1);
            abertura.setHours(0, 1, 0, 0);
            datasAbertura[fase] = abertura;
        } else {
            datasAbertura[fase] = new Date(0);
        }
    });
}

// ===== COUNTDOWN =====
function iniciarCountdown() {
    const copa = new Date('2026-06-11T16:00:00');
    const box = document.getElementById('countdownBox');

    function atualizar() {
        const agora = new Date();
        const diff = copa - agora;
        if (diff <= 0) {
            if (box) box.innerHTML = '<h3>🎉 A Copa já começou!</h3>';
            return;
        }
        const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const min = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seg = Math.floor((diff % (1000 * 60)) / 1000);
        const fmt = n => String(n).padStart(2, '0');
        document.getElementById('cdDias').textContent = fmt(dias);
        document.getElementById('cdHoras').textContent = fmt(horas);
        document.getElementById('cdMin').textContent = fmt(min);
        document.getElementById('cdSeg').textContent = fmt(seg);
    }
    atualizar();
    setInterval(atualizar, 1000);
}

// ===== PONTUAÇÃO =====
function calcularPontosJogo(golsAReal, golsBReal, golsAPalpite, golsBPalpite) {
    const rA = parseInt(golsAReal);
    const rB = parseInt(golsBReal);
    const pA = parseInt(golsAPalpite);
    const pB = parseInt(golsBPalpite);
    if (isNaN(rA) || isNaN(rB) || isNaN(pA) || isNaN(pB)) return null;
    if (pA === rA && pB === rB) return 5;
    const resReal = rA > rB ? 'A' : rA < rB ? 'B' : 'E';
    const resPalpite = pA > pB ? 'A' : pA < pB ? 'B' : 'E';
    if (resReal === 'E' && resPalpite === 'E') return 2;
    if (resReal === resPalpite) return 1;
    return 0;
}

function calcularPontuacaoTotal() {
    let total = 0, apurados = 0, acertos = 0;
    jogosData.forEach(jogo => {
        if (estadoJogo(jogo) !== 'encerrado') return;
        const rA = jogo.GoIsA ?? jogo.GolsA ?? '';
        const rB = jogo.GoIsB ?? jogo.GolsB ?? '';
        if (rA === '' || rB === '') return;
        const palpite = palpitesUsuario[jogo.ID_Jogo];
        if (!palpite) return;
        const pts = calcularPontosJogo(rA, rB, palpite.golsA, palpite.golsB);
        if (pts !== null) { total += pts; apurados++; if (pts > 0) acertos++; }
    });
    return { total, apurados, acertos };
}

function atualizarCardPontuacao() {
    const card = document.getElementById('pontuacaoCard');
    if (!card) return;
    const { total, apurados, acertos } = calcularPontuacaoTotal();
    if (apurados === 0) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    card.innerHTML = `
        <div class="pontuacao-titulo">🏅 Minha Pontuação</div>
        <div class="pontuacao-total">${total} <span>pts</span></div>
        <div class="pontuacao-detalhes">${apurados} jogos apurados · ${acertos} acerto${acertos !== 1 ? 's' : ''}</div>
    `;
}

// ===== FILTRO POR FASE =====
function gerarFaseNav() {
    const nav = document.getElementById('faseNav');
    if (!nav) return;
    const fasesExistentes = ORDEM_FASES.filter(f => jogosData.some(j => j.Fase === f));
    if (fasesExistentes.length === 0) { nav.style.display = 'none'; return; }
    const labels = {
        'Grupo': 'Grupos', '16 avos': '16 avos', 'Oitavas de final': 'Oitavas',
        'Quartas de final': 'Quartas', 'Semifinais': 'Semis',
        'Terceiro e Quarto': '3º/4º', 'Final': 'Final'
    };
    nav.innerHTML = fasesExistentes.map(fase => {
        const id = 'fase-' + fase.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
        return `<button class="fase-nav-btn" onclick="document.getElementById('${id}').scrollIntoView({behavior:'smooth',block:'start'})">${labels[fase] || fase}</button>`;
    }).join('') + `<button class="fase-nav-btn fase-nav-enviar" onclick="salvarPalpitesSupabase()">📨 Enviar</button>`;
    nav.style.display = 'flex';
}

// ===== ALERTA PRAZO IMINENTE =====
function verificarPrazosIminentes() {
    const alerta = document.getElementById('alertaPrazo');
    if (!alerta) return;
    const agora = new Date();
    const h24 = 24 * 60 * 60 * 1000;
    const iminentes = [];
    ORDEM_FASES.forEach(fase => {
        const fechamento = datasFechamento[fase];
        const abertura = datasAbertura[fase];
        if (!fechamento || !abertura) return;
        const restante = fechamento - agora;
        if (restante > 0 && restante <= h24 && agora >= abertura) {
            const h = Math.floor(restante / (1000 * 60 * 60));
            const m = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60));
            iminentes.push(`<strong>${fase}</strong> (${h}h ${m}min)`);
        }
    });
    if (iminentes.length === 0) { alerta.style.display = 'none'; return; }
    alerta.style.display = 'block';
    alerta.innerHTML = `⚠️ Prazo encerrando em breve: ${iminentes.join(', ')} — Salve seus palpites!`;
}

// ===== BARRA DE PROGRESSO =====
function atualizarProgresso() {
    const container = document.getElementById('progressContainer');
    const fill = document.getElementById('progressFill');
    const pct = document.getElementById('progressPct');
    const feitos = document.getElementById('palpitesFeitos');
    const total = document.getElementById('palpitesTotal');
    if (!container || !fill) return;

    const totalJogos = jogosData.length;
    const preenchidos = palpitesEditados.size;
    const porcentagem = totalJogos > 0 ? Math.round((preenchidos / totalJogos) * 100) : 0;

    container.style.display = 'block';
    fill.style.width = porcentagem + '%';
    pct.textContent = porcentagem + '%';
    feitos.textContent = preenchidos;
    total.textContent = totalJogos;
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    iniciarCountdown();
    
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

    const agora = new Date();
    let html = '';

    ORDEM_FASES.forEach(fase => {
        const abertura = datasAbertura[fase];
        const fechamento = datasFechamento[fase];

        let classe, icone, texto;

        if (!fechamento) {
            // Dados ainda não carregados
            classe = 'prazo-aberto';
            icone = '⏳';
            texto = 'Calculando...';
        } else if (agora >= fechamento) {
            classe = 'prazo-encerrado';
            icone = '🔒';
            texto = 'Encerrado';
        } else if (abertura && agora < abertura) {
            classe = 'prazo-encerrado';
            icone = '🔜';
            texto = `Abre em ${abertura.toLocaleDateString('pt-BR')}`;
        } else {
            const tempo = calcularTempoRestante(fechamento);
            classe = 'prazo-aberto';
            icone = '🟢';
            texto = tempo.texto;
        }

        html += `<div class="prazo-item ${classe}">${icone} ${fase}: ${texto}</div>`;
    });

    prazosInfo.innerHTML = html;
}

// Calcular tempo restante até uma data
function calcularTempoRestante(data) {
    const agora = new Date();
    const diferenca = data - agora;

    if (diferenca <= 0) return { encerrado: true, texto: 'Encerrado' };

    const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));

    if (dias > 0) return { encerrado: false, texto: `${dias}d ${horas}h ${minutos}min` };
    if (horas > 0) return { encerrado: false, texto: `${horas}h ${minutos}min` };
    return { encerrado: false, texto: `${minutos}min` };
}

// Verificar estado de um jogo: 'futuro' | 'aberto' | 'encerrado'
function estadoJogo(jogo) {
    const agora = new Date();
    const kickoff = parsearDataJogo(jogo.Data, jogo.Horário);
    const abertura = parsearDataJogo(jogo.Abertura, jogo['Horário Abertura']);

    if (kickoff && agora >= kickoff) return 'encerrado';
    if (abertura && agora < abertura) return 'futuro';
    return 'aberto';
}

// Mantido para compatibilidade com salvarPalpitesSupabase
function jogoEstaAberto(jogo) {
    return estadoJogo(jogo) === 'aberto';
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
        atualizarProgresso();

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

    calcularDatasLimiteDinamicas();
    mostrarPrazos();
}

// Renderizar jogos por fase
function renderizarJogos() {
    const fases = ['Grupo', '16 avos', 'Oitavas de final', 'Quartas de final', 'Semifinais', 'Terceiro e Quarto', 'Final'];
    let html = '';
    let temFaseAberta = false;
    
    fases.forEach(fase => {
        const jogosFase = jogosData.filter(j => j.Fase === fase);
        if (jogosFase.length === 0) return;
        
        const agora = new Date();
        const jogosAbertos = jogosFase.filter(j => estadoJogo(j) === 'aberto').length;

        if (jogosAbertos > 0) temFaseAberta = true;

        // Próxima abertura de jogo futuro nesta fase
        const proximaAbertura = jogosFase
            .map(j => parsearDataJogo(j.Abertura, j['Horário Abertura']))
            .filter(d => d && agora < d)
            .sort((a, b) => a - b)[0];

        let badgeTexto, badgeClasse;
        if (jogosAbertos > 0) {
            badgeTexto = `🟢 ${jogosAbertos} ${jogosAbertos > 1 ? 'disponíveis' : 'disponível'}`;
            badgeClasse = 'aberta';
        } else if (proximaAbertura) {
            badgeTexto = `🔜 Próximo: ${proximaAbertura.toLocaleDateString('pt-BR')} ${proximaAbertura.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
            badgeClasse = 'encerrada';
        } else {
            badgeTexto = '🔒 Encerrado';
            badgeClasse = 'encerrada';
        }

        const faseSectionId = 'fase-' + fase.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
        html += `
            <div class="fase-section" id="${faseSectionId}">
                <div class="fase-header">
                    <h2 class="fase-title">🏆 ${fase}</h2>
                    <div class="fase-prazo ${badgeClasse}">${badgeTexto}</div>
                </div>
        `;
        
        if (fase === 'Grupo') {
            const grupos = [...new Set(jogosFase.map(j => j.Grupo))].sort();
            grupos.forEach(grupo => {
                if (grupo) {
                    html += `<h3 class="grupo-subtitle">Grupo ${grupo}</h3>`;
                    const jogosGrupo = jogosFase.filter(j => j.Grupo === grupo);
                    jogosGrupo.forEach(jogo => {
                        html += renderizarJogo(jogo);
                    });
                }
            });
        } else {
            jogosFase.forEach(jogo => {
                html += renderizarJogo(jogo);
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

    gerarFaseNav();
    verificarPrazosIminentes();
    atualizarCardPontuacao();

    document.querySelectorAll('.gols-input').forEach(input => {
        input.addEventListener('change', handlePalpiteChange);
    });
}

// Renderizar um jogo individual
function renderizarJogo(jogo) {
    const idJogo = jogo.ID_Jogo;
    const palpiteAnterior = palpitesUsuario[idJogo] || { golsA: null, golsB: null };
    const preenchido = palpiteAnterior.golsA !== null && palpiteAnterior.golsB !== null;
    const dataHora = jogo.Data && jogo.Horário ? `📅 ${jogo.Data} | ⏰ ${jogo.Horário}` : '';
    const estado = estadoJogo(jogo);

    if (estado === 'futuro') {
        const abertura = parsearDataJogo(jogo.Abertura, jogo['Horário Abertura']);
        const abreEm = abertura
            ? `🔜 Abre em ${abertura.toLocaleDateString('pt-BR')} às ${abertura.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
            : '🔜 Em breve';
        return `
            <div class="jogo-card jogo-futuro">
                <div class="jogo-data">${abreEm}</div>
                <div class="jogo-content">
                    <div class="time"><h3>${jogo.SeleçãoA}</h3></div>
                    <div class="gols-display">-</div>
                    <div class="vs">X</div>
                    <div class="gols-display">-</div>
                    <div class="time"><h3>${jogo.SeleçãoB}</h3></div>
                </div>
            </div>
        `;
    }

    if (estado === 'aberto') {
        return `
            <div class="jogo-card ${preenchido ? 'jogo-preenchido' : ''}">
                <div class="jogo-data">${dataHora}</div>
                <div class="jogo-content">
                    <div class="time"><h3>${jogo.SeleçãoA}</h3></div>
                    <div>
                        <input type="number" class="gols-input"
                               data-jogo="${idJogo}" data-time="A"
                               min="0" max="20"
                               value="${preenchido ? palpiteAnterior.golsA : ''}">
                    </div>
                    <div class="vs">X</div>
                    <div>
                        <input type="number" class="gols-input"
                               data-jogo="${idJogo}" data-time="B"
                               min="0" max="20"
                               value="${preenchido ? palpiteAnterior.golsB : ''}">
                    </div>
                    <div class="time"><h3>${jogo.SeleçãoB}</h3></div>
                </div>
            </div>
        `;
    }

    // encerrado — suporta colunas GoIsA/GoIsB ou GolsA/GolsB
    const rawA = jogo.GoIsA ?? jogo.GolsA ?? '';
    const rawB = jogo.GoIsB ?? jogo.GolsB ?? '';
    const golsAReal = rawA !== '' ? rawA : null;
    const golsBReal = rawB !== '' ? rawB : null;
    const temResultado = golsAReal !== null && golsBReal !== null;

    if (temResultado) {
        let ptsHtml = '';
        if (preenchido) {
            const pts = calcularPontosJogo(golsAReal, golsBReal, palpiteAnterior.golsA, palpiteAnterior.golsB);
            if (pts !== null) {
                const ptsClass = pts === 5 ? 'pontos-exato' : pts === 2 ? 'pontos-empate' : pts === 1 ? 'pontos-vencedor' : 'pontos-zero';
                const ptsTexto = pts === 5 ? '🎯 Exato!' : pts === 2 ? '✅ Empate!' : pts === 1 ? '👍 Vencedor!' : '❌ Errou';
                ptsHtml = `
                    <div class="palpite-resultado">
                        <span class="palpite-label">Seu palpite: ${palpiteAnterior.golsA} x ${palpiteAnterior.golsB}</span>
                        <span class="pontos-badge ${ptsClass}">${pts > 0 ? '+' + pts : '0'} pts · ${ptsTexto}</span>
                    </div>`;
            }
        } else {
            ptsHtml = `<div class="palpite-resultado"><span class="sem-palpite">Sem palpite registrado</span></div>`;
        }
        return `
            <div class="jogo-card jogo-com-resultado">
                <div class="jogo-data">🏁 ${dataHora}</div>
                <div class="resultado-real-label">Resultado Final</div>
                <div class="jogo-content">
                    <div class="time"><h3>${jogo.SeleçãoA}</h3></div>
                    <div class="gols-display resultado-real-placar">${golsAReal}</div>
                    <div class="vs">X</div>
                    <div class="gols-display resultado-real-placar">${golsBReal}</div>
                    <div class="time"><h3>${jogo.SeleçãoB}</h3></div>
                </div>
                ${ptsHtml}
            </div>
        `;
    }

    return `
        <div class="jogo-card ${preenchido ? 'jogo-preenchido' : 'jogo-encerrado'}">
            <div class="jogo-data">🔒 ${dataHora}</div>
            <div class="jogo-content">
                <div class="time"><h3>${jogo.SeleçãoA}</h3></div>
                <div class="gols-display">${preenchido ? palpiteAnterior.golsA : '-'}</div>
                <div class="vs">X</div>
                <div class="gols-display">${preenchido ? palpiteAnterior.golsB : '-'}</div>
                <div class="time"><h3>${jogo.SeleçãoB}</h3></div>
            </div>
        </div>
    `;
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

// ===== SALVAR PALPITES NO SUPABASE (OTIMIZADO) =====
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
    
    const startTime = performance.now();
    
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
        
        if (jogo && jogoEstaAberto(jogo)) {
            palpitesParaSalvar.push({
                user_id: userId,
                participante: participante,
                id_jogo: idJogo,
                gols_a: parseInt(palpite.golsA) || 0,
                gols_b: parseInt(palpite.golsB) || 0,
                bolao: bolao,
                editado: true
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
        console.log('💾 Salvando', palpitesParaSalvar.length, 'palpites...');
        
        // USAR UPSERT (atualiza se existe, insere se não existe)
        const { error: upsertError } = await supabase
            .from('palpites')
            .upsert(palpitesParaSalvar, {
                onConflict: 'user_id,id_jogo,bolao'
            });
        
        if (upsertError) throw upsertError;
        
        const endTime = performance.now();
        const tempoDecorrido = ((endTime - startTime) / 1000).toFixed(2);
        
        palpitesParaSalvar.forEach(p => palpitesEditados.add(String(p.id_jogo)));

        submitBtn.textContent = '✅ SALVO!';
        submitBtn.style.background = '#4CAF50';
        atualizarProgresso();
        if (typeof confetti === 'function') {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.8 }, colors: ['#4CAF50', '#2196F3', '#FFC107', '#ffffff'] });
        }
        
        if (successMessage) {
            successMessage.textContent = `✅ ${palpitesParaSalvar.length} palpites salvos em ${tempoDecorrido}s!`;
            successMessage.style.display = 'block';
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 5000);
        }
        
        console.log(`✅ Salvamento concluído em ${tempoDecorrido}s`);
        
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


// ===== DARK MODE =====
(function() {
    if (localStorage.getItem('darkMode') === '1') {
        document.body.classList.add('dark');
    }
})();

function toggleDarkMode() {
    const dark = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', dark ? '1' : '0');
    const btn = document.getElementById('darkToggle');
    if (btn) btn.textContent = dark ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('darkToggle');
    if (btn) btn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
});

// ===== RESUMO DE PALPITES =====
function abrirResumo() {
    const modal = document.getElementById('resumoModal');
    const conteudo = document.getElementById('resumoConteudo');
    if (!modal || !conteudo) return;

    let html = '';

    ORDEM_FASES.forEach(fase => {
        const jogosFase = jogosData.filter(j => j.Fase === fase);
        if (jogosFase.length === 0) return;

        let faseHtml = '';
        jogosFase.forEach(jogo => {
            const idJogo = String(jogo.ID_Jogo);
            const palpite = palpitesUsuario[idJogo];
            const salvo = palpitesEditados.has(idJogo);
            const estado = estadoJogo(jogo);
            const rawA = jogo.GoIsA ?? jogo.GolsA ?? '';
            const rawB = jogo.GoIsB ?? jogo.GolsB ?? '';
            const temResultado = rawA !== '' && rawB !== '';

            let ptsHtml = '';
            let rowClass = salvo ? 'resumo-salvo' : estado === 'encerrado' ? 'resumo-sem-palpite' : 'resumo-pendente';

            if (salvo && estado === 'encerrado' && temResultado) {
                const pts = calcularPontosJogo(rawA, rawB, palpite.golsA, palpite.golsB);
                if (pts !== null) {
                    const cls = pts === 5 ? 'pontos-exato' : pts === 2 ? 'pontos-empate' : pts === 1 ? 'pontos-vencedor' : 'pontos-zero';
                    ptsHtml = `<span class="pontos-badge ${cls}">${pts > 0 ? '+' + pts : '0'} pts</span>`;
                }
            }

            const palpiteTexto = salvo
                ? `${palpite.golsA} x ${palpite.golsB}`
                : estado === 'encerrado' ? '—' : 'Pendente';

            faseHtml += `
                <div class="resumo-linha ${rowClass}">
                    <span class="resumo-times">${jogo.SeleçãoA} × ${jogo.SeleçãoB}</span>
                    <span class="resumo-palpite">${palpiteTexto}</span>
                    ${ptsHtml}
                </div>`;
        });

        html += `<div class="resumo-fase"><div class="resumo-fase-titulo">${fase}</div>${faseHtml}</div>`;
    });

    if (!html) html = '<p style="text-align:center;color:#999;padding:30px;">Nenhum dado carregado ainda.</p>';
    conteudo.innerHTML = html;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function fecharResumo(e) {
    if (e && e.target !== e.currentTarget) return;
    const modal = document.getElementById('resumoModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') fecharResumo();
});

// ===== FAB ENVIAR PALPITES =====
(function() {
    function controlarFab() {
        const fab = document.getElementById('fabEnviar');
        const submit = document.getElementById('submitContainer');
        if (!fab || !submit || submit.style.display === 'none') {
            if (fab) fab.style.display = 'none';
            return;
        }
        const rect = submit.getBoundingClientRect();
        const visivel = rect.top < window.innerHeight && rect.bottom > 0;
        fab.style.display = visivel ? 'none' : 'block';
    }

    window.addEventListener('scroll', () => {
        controlarFab();
        const topo = document.getElementById('voltarTopo');
        if (topo) topo.style.display = window.scrollY > 400 ? 'block' : 'none';
    }, { passive: true });

    document.addEventListener('DOMContentLoaded', () => {
        const fab = document.getElementById('fabEnviar');
        if (fab) fab.addEventListener('click', () => {
            const btn = document.getElementById('submitBtn');
            if (btn) btn.click();
        });
    });
})();

// ===== ATUALIZAR POWER BI MANUALMENTE =====
function atualizarPowerBI() {
    const bolao = sessionStorage.getItem('bolao');
    if (bolao) {
        const powerBIFrame = document.getElementById('powerBIFrame');
        if (powerBIFrame) {
            // Limpar iframe
            powerBIFrame.src = 'about:blank';
            
            // Mostrar loading
            const btn = event.target;
            const textoOriginal = btn.textContent;
            btn.textContent = '⏳ Atualizando...';
            btn.disabled = true;
            
            // Recarregar após 500ms
            setTimeout(() => {
                configurarLinkPowerBI(bolao);
                
                // Restaurar botão após 2s
                setTimeout(() => {
                    btn.textContent = textoOriginal;
                    btn.disabled = false;
                }, 2000);
            }, 500);
            
            console.log('🔄 Power BI atualizado manualmente');
        }
    }
}
