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

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    mostrarPrazos();
    
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    submitBtn.addEventListener('click', handleSubmit);
});

// Mostrar prazos na tela de login
function mostrarPrazos() {
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

// ===== LOGIN (MULTI-BOLÃO) =====
async function handleLogin(e) {
    e.preventDefault();
    
    const bolao = document.getElementById('bolaoSelect').value;
    const nome = document.getElementById('nome').value.trim();
    const codigo = document.getElementById('codigo').value.trim();
    
    // Validar seleção de bolão
    if (!bolao) {
        mostrarErro('Por favor, selecione um bolão');
        return;
    }
    
    if (!nome || !codigo) {
        mostrarErro('Preencha todos os campos');
        return;
    }
    
    try {
        loginError.style.display = 'none';
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'login',
                bolao: bolao,
                nome: nome,
                codigo: codigo
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Salvar dados na sessão
            sessionStorage.setItem('bolao', bolao);
            sessionStorage.setItem('participante', nome);
            usuarioLogado = nome;
            
            // Esconder login, mostrar app
            loginScreen.style.display = 'none';
            appScreen.style.display = 'block';
            
            // Mostrar nome do usuário
            nomeUsuario.textContent = nome;
            
            // Configurar link do Power BI
            configurarLinkPowerBI(bolao);
            
            // Carregar dados
            await carregarDados();
            
            // Carregar palpites salvos
            await carregarPalpitesSalvos(bolao, nome);
            
        } else {
            mostrarErro(data.message || 'Nome, código ou bolão inválidos');
        }
        
    } catch (error) {
        mostrarErro('Erro ao conectar: ' + error.message);
        console.error('Erro no login:', error);
    }
}

function mostrarErro(mensagem) {
    loginError.textContent = mensagem;
    loginError.style.display = 'block';
}

// Logout
function handleLogout() {
    usuarioLogado = null;
    userToken = null;
    palpitesAtuais = {};
    palpitesUsuario = {};
    
    sessionStorage.clear();
    
    loginScreen.style.display = 'block';
    appScreen.style.display = 'none';
    
    document.getElementById('bolaoSelect').value = '';
    document.getElementById('nome').value = '';
    document.getElementById('codigo').value = '';
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

// ===== CARREGAR PALPITES SALVOS (MULTI-BOLÃO) =====
async function carregarPalpitesSalvos(bolao, participante) {
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'carregar',
                bolao: bolao,
                participante: participante
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.palpites) {
            // Preencher objeto palpitesUsuario
            data.palpites.forEach(palpite => {
                palpitesUsuario[palpite.idJogo] = {
                    golsA: parseInt(palpite.golsA) || 0,
                    golsB: parseInt(palpite.golsB) || 0
                };
            });
            
            // Preencher campos no HTML
            data.palpites.forEach(palpite => {
                const inputA = document.querySelector(`input[data-jogo="${palpite.idJogo}"][data-time="A"]`);
                const inputB = document.querySelector(`input[data-jogo="${palpite.idJogo}"][data-time="B"]`);
                
                if (inputA) inputA.value = palpite.golsA;
                if (inputB) inputB.value = palpite.golsB;
            });
        }
        
    } catch (error) {
        console.log('Nenhum palpite anterior encontrado:', error);
    }
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

// ===== ENVIAR PALPITES (MULTI-BOLÃO) =====
async function handleSubmit() {
    const bolao = sessionStorage.getItem('bolao');
    const participante = sessionStorage.getItem('participante');
    
    // Coletar todos os palpites dos inputs
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
    
    // Filtrar apenas jogos de fases abertas
    const palpitesFasesAbertas = {};
    for (const [idJogo, palpite] of Object.entries(palpitesAtuais)) {
        const jogo = jogosData.find(j => j.ID_Jogo == idJogo);
        if (jogo && faseEstaAberta(jogo.Fase)) {
            palpitesFasesAbertas[idJogo] = palpite;
        }
    }
    
    if (Object.keys(palpitesFasesAbertas).length === 0) {
        alert('⚠️ Não há palpites em fases abertas para salvar!');
        return;
    }
    
    // Converter para array de palpites
    const palpitesArray = Object.entries(palpitesFasesAbertas).map(([idJogo, palpite]) => ({
        idJogo: idJogo,
        golsA: palpite.golsA,
        golsB: palpite.golsB
    }));
    
    // Mostrar barra de progresso
    submitContainer.style.display = 'none';
    progressContainer.style.display = 'block';
    
    const progressText = document.getElementById('progressText');
    const progressDetails = document.getElementById('progressDetails');
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    
    progressText.textContent = '⏳ Salvando palpites...';
    progressDetails.textContent = `Salvando ${palpitesArray.length} palpites`;
    progressFill.style.width = '30%';
    progressPercentage.textContent = '30%';
    
    try {
        setTimeout(() => {
            progressFill.style.width = '60%';
            progressPercentage.textContent = '60%';
        }, 500);
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'salvar',
                bolao: bolao,
                participante: participante,
                palpites: palpitesArray
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            progressFill.style.width = '100%';
            progressPercentage.textContent = '100%';
            progressText.textContent = '✅ Palpites salvos!';
            progressDetails.textContent = data.message;
            
            setTimeout(() => {
                progressContainer.style.display = 'none';
                submitContainer.style.display = 'block';
                
                successMessage.innerHTML = `✅ ${data.message} Boa sorte! 🍀`;
                successMessage.style.display = 'block';
                
                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 5000);
            }, 2000);
        } else {
            throw new Error(data.message || 'Erro ao salvar');
        }
        
    } catch (error) {
        progressContainer.style.display = 'none';
        submitContainer.style.display = 'block';
        alert('❌ Erro ao salvar: ' + error.message);
        console.error('Erro ao salvar:', error);
    }
}

// ===== CONFIGURAR LINK POWER BI =====
function configurarLinkPowerBI(bolao) {
    const linkPowerBI = POWER_BI_LINKS[bolao];
    
    if (linkPowerBI) {
        const btnRanking = document.getElementById('linkRanking');
        if (btnRanking) {
            btnRanking.href = linkPowerBI;
        }
    }
}
