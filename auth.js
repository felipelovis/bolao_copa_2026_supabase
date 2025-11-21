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
const redefinirSenhaScreen = document.getElementById('redefinirSenhaScreen');
const redefinirSenhaForm = document.getElementById('redefinirSenhaForm');
const redefinirError = document.getElementById('redefinirError');
const redefinirSuccess = document.getElementById('redefinirSuccess');

window.addEventListener('load', async function() {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const access_token = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    if (type === 'recovery' && access_token) {
        const loginEl = document.getElementById('loginScreen');
        if (loginEl) loginEl.style.display = 'none';
        if (redefinirSenhaScreen) redefinirSenhaScreen.style.display = 'block';
    }
});

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

if (cadastroForm) {
    cadastroForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const nome = document.getElementById('cadastroNome').value.trim();
        const email = document.getElementById('cadastroEmail').value.trim();
        const senha = document.getElementById('cadastroSenha').value;
        const senhaConfirm = document.getElementById('cadastroSenhaConfirm').value;
        const bolao = document.getElementById('cadastroBolao').value;
        
        if (senha !== senhaConfirm) {
            mostrarErroCadastro('Senhas diferentes');
            return;
        }
        if (!bolao) {
            mostrarErroCadastro('Selecione bolao');
            return;
        }
        
        try {
            cadastroError.style.display = 'none';
            
            const result = await supabase.auth.signUp({
                email: email,
                password: senha,
                options: { 
                    data: { nome: nome, bolao: bolao },
                    emailRedirectTo: 'https://bolaocopadomundo.vercel.app'
                }
            });
            
            if (result.data?.user?.identities?.length === 0) {
                mostrarErroCadastro('❌ Este email já está cadastrado!');
                return;
            }
            
            if (result.error) throw result.error;
            
            await supabase.from('participantes').insert([{
                user_id: result.data.user.id,
                nome: nome,
                bolao: bolao
            }]);
            
            cadastroSuccess.innerHTML = '✅ Conta criada! Verifique: ' + email;
            cadastroSuccess.style.display = 'block';
            cadastroForm.reset();
            
            setTimeout(function() {
                cadastroScreen.style.display = 'none';
                loginScreen.style.display = 'block';
                cadastroSuccess.style.display = 'none';
            }, 8000);
            
        } catch (error) {
            let msg = error.message;
            if (msg.includes('already') || msg.includes('registered')) {
                msg = '❌ Este email já está cadastrado!';
            } else if (msg.includes('Invalid')) {
                msg = '❌ Email inválido!';
            } else if (msg.includes('Password')) {
                msg = '❌ Senha muito fraca!';
            }
            mostrarErroCadastro(msg);
        }
    });
}

if (recuperarSenhaForm) {
    recuperarSenhaForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('recuperarEmail').value.trim();
        try {
            recuperarError.style.display = 'none';
            await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://bolaocopadomundo.vercel.app'
            });
            recuperarSuccess.innerHTML = '✅ Email enviado: ' + email;
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

if (redefinirSenhaForm) {
    redefinirSenhaForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const novaSenha = document.getElementById('novaSenha').value;
        const novaSenhaConfirm = document.getElementById('novaSenhaConfirm').value;
        
        if (novaSenha !== novaSenhaConfirm) {
            mostrarErroRedefinir('Senhas diferentes');
            return;
        }
        
        try {
            redefinirError.style.display = 'none';
            
            const { error } = await supabase.auth.updateUser({
                password: novaSenha
            });
            
            if (error) throw error;
            
            redefinirSuccess.innerHTML = '✅ Senha alterada! Faça login.';
            redefinirSuccess.style.display = 'block';
            
            setTimeout(function() {
                redefinirSenhaScreen.style.display = 'none';
                const loginEl = document.getElementById('loginScreen');
                if (loginEl) loginEl.style.display = 'block';
                redefinirSuccess.style.display = 'none';
            }, 3000);
            
        } catch (error) {
            mostrarErroRedefinir(error.message);
        }
    });
}

const loginFormElement = document.getElementById('loginForm');
if (loginFormElement) {
    loginFormElement.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('nome').value.trim();
        const senha = document.getElementById('codigo').value;
        
        try {
            const loginErrorElement = document.getElementById('loginError');
            if (loginErrorElement) loginErrorElement.style.display = 'none';
            
            const result = await supabase.auth.signInWithPassword({
                email: email,
                password: senha
            });
            
            if (result.error) throw new Error('Email ou senha incorretos');
            
            const participanteResult = await supabase
                .from('participantes')
                .select('*')
                .eq('user_id', result.data.user.id)
                .single();
            
            if (participanteResult.error) throw participanteResult.error;
            
            sessionStorage.setItem('bolao', participanteResult.data.bolao);
            sessionStorage.setItem('participante', participanteResult.data.nome);
            sessionStorage.setItem('user_id', result.data.user.id);
            
            const nomeEl = document.getElementById('nomeUsuario');
            if (nomeEl) nomeEl.textContent = participanteResult.data.nome;
            
            const loginEl = document.getElementById('loginScreen');
            const appEl = document.getElementById('appScreen');
            if (loginEl) loginEl.style.display = 'none';
            if (appEl) appEl.style.display = 'block';
            
            // Carregar tudo em paralelo (mais rápido!)
            Promise.all([
                typeof configurarLinkPowerBI === 'function' 
                    ? configurarLinkPowerBI(participanteResult.data.bolao) 
                    : Promise.resolve(),
                typeof carregarDados === 'function' 
                    ? carregarDados() 
                    : Promise.resolve(),
                carregarPalpitesSalvosSupabase(result.data.user.id)
            ]).catch(err => console.error('Erro ao carregar:', err));
            
        } catch (error) {
            const loginErrorElement = document.getElementById('loginError');
            if (loginErrorElement) {
                loginErrorElement.textContent = error.message;
                loginErrorElement.style.display = 'block';
            }
        }
    });
}

async function carregarPalpitesSalvosSupabase(userId) {
    try {
        const result = await supabase.from('palpites').select('*').eq('user_id', userId);
        if (result.error) throw result.error;
        if (result.data) {
            result.data.forEach(p => {
                if (typeof palpitesUsuario !== 'undefined') {
                    palpitesUsuario[p.id_jogo] = { golsA: p.gols_a, golsB: p.gols_b };
                }
                const inputA = document.querySelector('input[data-jogo="' + p.id_jogo + '"][data-time="A"]');
                const inputB = document.querySelector('input[data-jogo="' + p.id_jogo + '"][data-time="B"]');
                if (inputA) inputA.value = p.gols_a;
                if (inputB) inputB.value = p.gols_b;
            });
        }
    } catch (error) {
        console.log('Sem palpites');
    }
}

function mostrarErroCadastro(msg) {
    cadastroError.textContent = msg;
    cadastroError.style.display = 'block';
}

function mostrarErroRecuperar(msg) {
    recuperarError.textContent = msg;
    recuperarError.style.display = 'block';
}

function mostrarErroRedefinir(msg) {
    redefinirError.textContent = msg;
    redefinirError.style.display = 'block';
}
