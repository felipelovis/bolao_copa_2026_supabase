// Estado global
let usuarioLogado = null;
let jogosData = [];
let palpitesUsuario = {};
let palpitesAtuais = {};
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

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    
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

// Verificar se fase está aberta (entre abertura e fechamento)
function faseEstaAberta(fase) {
    const agora = new Date();
    const abertura = datasAbertura[fase];
    const fechamento = datasFechamento[fase];
    if (!fechamento) return false;
    const naoFechou = agora < fechamento;
    const jaAbriu = !abertura || agora >= abertura;
    return naoFechou && jaAbriu;
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
        
        const faseAberta = faseEstaAberta(fase);
        if (faseAberta) temFaseAberta = true;

        const agora = new Date();
        const abertura = datasAbertura[fase];
        const fechamento = datasFechamento[fase];
        let badgeTexto, badgeClasse, mensagemBloqueio;

        if (faseAberta) {
            const tempo = calcularTempoRestante(fechamento);
            badgeTexto = '⏰ ' + tempo.texto;
            badgeClasse = 'aberta';
        } else if (fechamento && agora >= fechamento) {
            badgeTexto = '🔒 Encerrado';
            badgeClasse = 'encerrada';
            mensagemBloqueio = '🔒 Fase encerrada. Visualizando seus palpites.';
        } else if (abertura && agora < abertura) {
            badgeTexto = `🔜 Abre em ${abertura.toLocaleDateString('pt-BR')}`;
            badgeClasse = 'encerrada';
            mensagemBloqueio = `🔜 Esta fase abre em ${abertura.toLocaleDateString('pt-BR')} às ${abertura.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            badgeTexto = '⏳ Aguardando';
            badgeClasse = 'encerrada';
            mensagemBloqueio = '⏳ Fase ainda não disponível.';
        }

        html += `
            <div class="fase-section">
                <div class="fase-header">
                    <h2 class="fase-title">🏆 ${fase}</h2>
                    <div class="fase-prazo ${badgeClasse}">${badgeTexto}</div>
                </div>
        `;

        if (!faseAberta) {
            html += `<div class="fase-bloqueada">${mensagemBloqueio}</div>`;
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
        
        submitBtn.textContent = '✅ SALVO!';
        submitBtn.style.background = '#4CAF50';
        
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
