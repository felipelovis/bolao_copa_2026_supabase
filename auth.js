// ===== ELEMENTOS DOM =====
const cadastroScreen = document.getElementById('cadastroScreen');
const cadastroForm = document.getElementById('cadastroForm');
const cadastroError = document.getElementById('cadastroError');
const cadastroSuccess = document.getElementById('cadastroSuccess');
const criarContaBtn = document.getElementById('criarContaBtn');
const voltarLoginBtn = document.getElementById('voltarLoginBtn');
const recuperarSenhaScreen = document.getElementById('recuperarSenhaScreen');
const recuperarSenhaForm = document.getElementById('recuperarSenhaForm');
const recuperarError = document.getElementById('recuperarError');
const recuperarSuccess = document.getElementById('recuperarSuccess');
const esqueceuSenhaLink = document.getElementById('esqueceuSenhaLink');
const voltarLoginBtn2 = document.getElementById('voltarLoginBtn2');

// ===== NAVEGAÇÃO CADASTRO =====
if (criarContaBtn) {
    criarContaBtn.addEventListener('click', function() {
        loginScreen.style.display = 'none';
        cadastroScreen.style.display = 'block';
    });
}

if (voltarLoginBtn) {
    voltarLoginBtn.addEventListener('click', function() {
        cadastroScreen.style.display = 'none';
        loginScreen.style.display = 'block';
        cadastroForm.reset();
        cadastroError.style.display = 'none';
        cadastroSuccess.style.display = 'none';
    });
}

// ===== NAVEGAÇÃO RECUPERAR SENHA =====
if (esqueceuSenhaLink) {
    esqueceuSenhaLink.addEventListener('click', function(e) {
        e.preventDefault();
        loginScreen.style.display = 'none';
        recuperarSenhaScreen.style.display = 'block';
    });
}

if (voltarLoginBtn2) {
    voltarLoginBtn2.addEventListener('click', function() {
        recuperarSenhaScreen.style.display = 'none';
        loginScreen.style.display = 'block';
        if (recuperarSenhaForm) recuperarSenhaForm.reset();
        recuperarError.style.display = 'none';
        recuperarSuccess.style.display = 'none';
    });
}

// ===== CADASTRO =====
if (cadastroForm) {
    cadastroForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const nome = document.getElementById('cadastroNome').value.trim();
        const email = document.getElementById('cadastroEmail').value.trim();
        const senha = document.getElementById('cadastroSenha').value;
        const senhaConfirm = document.getElementById('cadastroSenhaConfirm').value;
        const bolao = document.getElementById('cadastroBolao').value;
        const telefone = document.getElementById('cadastroTelefone').value.trim();
        
        if (senha !== senhaConfirm) {
            mostrarErroCadastro('As senhas não coincidem!');
            return;
        }
        
        if (!bolao) {
            mostrarErroCadastro('Selecione um bolão!');
            return;
        }
        
        try {
            cadastroError.style.display = 'none';
            
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: senha,
                options: { data: { nome: nome, bolao: bolao } }
            });
            
            if (authError) throw authError;
            
            const { error: dbError } = await supabase
                .from('participantes')
                .insert([{ user_id: authData.user.id, nome: nome, bolao: bolao, telefone: telefone }]);
            
            if (dbError) throw dbError;
            
            cadastroSuccess.innerHTML = 'Conta criada! Verifique seu email: ' + email;
            cadastroSuccess.style.display = 'block';
            cadastroForm.reset();
            
            setTimeout(function() {
                cadastroScreen.style.display = 'none';
                loginScreen.style.display = 'block';
                cadastroSuccess.style.display = 'none';
            }, 8000);
            
        } catch (error) {
            mostrarErroCadastro(error.message);
        }
    });
}

// ===== RECUPERAR SENHA =====
if (recuperarSenhaForm) {
    recuperarSenhaForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('recuperarEmail').value.trim();
        
        try {
            recuperarError.style.display = 'none';
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://bolao-copa-2026-supabase.vercel.app'
            });
            
            if (error) throw error;
            
            recuperarSuccess.innerHTML = 'Email enviado para: ' + email;
            recuperarSuccess.style.display = 'block';
            recuperarSenhaForm.reset();
            
            setTimeout(function() {
                recuperarSenhaScreen.style.display = 'none';
                loginScreen.style.display = 'block';
                recuperarSuccess.style.display = 'none';
            }, 8000);
            
        } catch (error) {
            mostrarErroRecuperar(error.message);
        }
    });
}

// ===== LOGIN =====
const loginFormElement = document.getElementById('loginForm');
if (loginFormElement) {
    const oldForm = loginFormElement.cloneNode(true);
    loginFormElement.parentNode.replaceChild(oldForm, loginFormElement);
    
    oldForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('nome').value.trim();
        const senha = document.getElementById('codigo').value;
        
        try {
            const loginErrorElement = document.getElementById('loginError');
            if (loginErrorElement) loginErrorElement.style.display = 'none';
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: senha
            });
            
            if (error) {
                if (error.message.includes('Invalid')) throw new Error('Email ou senha incorretos');
                if (error.message.includes('Email not confirmed')) throw new Error('Confirme seu email antes de fazer login');
                throw error;
            }
            
            const { data: participante, error: dbError } = await supabase
                .from('participantes')
                .select('*')
                .eq('user_id', data.user.id)
                .single();
            
            if (dbError) throw dbError;
            
            sessionStorage.setItem('bolao', participante.bolao);
            sessionStorage.setItem('participante', participante.nome);
            sessionStorage.setItem('user_id', data.user.id);
            
            const usuarioLogadoElement = document.getElementById('nomeUsuario');
            if (usuarioLogadoElement) usuarioLogadoElement.textContent = participante.nome;
            
            const loginScreenElement = document.getElementById('loginScreen');
            const appScreenElement = document.getElementById('appScreen');
            if (loginScreenElement) loginScreenElement.style.display = 'none';
            if (appScreenElement) appScreenElement.style.display = 'block';
            
            if (typeof configurarLinkPowerBI === 'function') {
                configurarLinkPowerBI(participante.bolao);
            }
            
            if (typeof carregarDados === 'function') {
                await carregarDados();
            }
            
            await carregarPalpitesSalvosSupabase(data.user.id);
            
        } catch (error) {
            const loginErrorElement = document.getElementById('loginError');
            if (loginErrorElement) {
                loginErrorElement.textContent = error.message;
                loginErrorElement.style.display = 'block';
            }
        }
    });
}

// ===== CARREGAR PALPITES =====
async function carregarPalpitesSalvosSupabase(userId) {
    try {
        const { data: palpites, error } = await supabase
            .from('palpites')
            .select('*')
            .eq('user_id', userId);
        
        if (error) throw error;
        
        if (palpites) {
            palpites.forEach(p => {
                if (typeof palpitesUsuario !== 'undefined') {
                    palpitesUsuario[p.id_jogo] = { golsA: p.gols_a, golsB: p.gols_b };
                }
                const inputA = document.querySelector(`input[data-jogo="${p.id_jogo}"][data-time="A"]`);
                const inputB = document.querySelector(`input[data-jogo="${p.id_jogo}"][data-time="B"]`);
                if (inputA) inputA.value = p.gols_a;
                if (inputB) inputB.value = p.gols_b;
            });
        }
    } catch (error) {
        console.log('Sem palpites anteriores');
    }
}

// ===== FUNÇÕES AUXILIARES =====
function mostrarErroCadastro(msg) {
    cadastroError.textContent = msg;
    cadastroError.style.display = 'block';
}

function mostrarErroRecuperar(msg) {
    recuperarError.textContent = msg;
    recuperarError.style.display = 'block';
}
