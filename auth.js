// ===== ELEMENTOS DOM CADASTRO =====
const cadastroScreen = document.getElementById('cadastroScreen');
const cadastroForm = document.getElementById('cadastroForm');
const cadastroError = document.getElementById('cadastroError');
const cadastroSuccess = document.getElementById('cadastroSuccess');
const criarContaBtn = document.getElementById('criarContaBtn');
const voltarLoginBtn = document.getElementById('voltarLoginBtn');

// ===== ELEMENTOS RECUPERAR SENHA =====
const recuperarSenhaScreen = document.getElementById('recuperarSenhaScreen');
const recuperarSenhaForm = document.getElementById('recuperarSenhaForm');
const recuperarError = document.getElementById('recuperarError');
const recuperarSuccess = document.getElementById('recuperarSuccess');
const esqueceuSenhaLink = document.getElementById('esqueceuSenhaLink');
const voltarLoginBtn2 = document.getElementById('voltarLoginBtn2');

// ===== MOSTRAR TELA DE CADASTRO =====
if (criarContaBtn) {
    criarContaBtn.addEventListener('click', function() {
        loginScreen.style.display = 'none';
        cadastroScreen.style.display = 'block';
    });
}

// ===== VOLTAR PARA LOGIN =====
if (voltarLoginBtn) {
    voltarLoginBtn.addEventListener('click', function() {
        cadastroScreen.style.display = 'none';
        loginScreen.style.display = 'block';
        cadastroForm.reset();
        cadastroError.style.display = 'none';
        cadastroSuccess.style.display = 'none';
    });
}

// ===== MOSTRAR TELA RECUPERAR SENHA =====
if (esqueceuSenhaLink) {
    esqueceuSenhaLink.addEventListener('click', function(e) {
        e.preventDefault();
        loginScreen.style.display = 'none';
        recuperarSenhaScreen.style.display = 'block';
    });
}

// ===== VOLTAR PARA LOGIN (do recuperar senha) =====
if (voltarLoginBtn2) {
    voltarLoginBtn2.addEventListener('click', function() {
        recuperarSenhaScreen.style.display = 'none';
        loginScreen.style.display = 'block';
        recuperarSenhaForm.reset();
        recuperarError.style.display = 'none';
        recuperarSuccess.style.display = 'none';
    });
}

// ===== CRIAR CONTA =====
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
            mostrarErroCadastro('❌ As senhas não coincidem!');
            return;
        }
        
        if (!bolao) {
            mostrarErroCadastro('❌ Selecione um bolão!');
            return;
        }
        
        if (senha.length < 6) {
            mostrarErroCadastro('❌ Senha deve ter no mínimo 6 caracteres!');
            return;
        }
        
        try {
            cadastroError.style.display = 'none';
            
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: senha,
                options: {
                    data: {
                        nome: nome,
                        bolao: bolao
                    }
                }
            });
            
            if (authError) throw authError;
            
            const { error: dbError } = await supabase
                .from('participantes')
                .insert([{
                    user_id: authData.user.id,
                    nome: nome,
                    bolao: bolao,
                    telefone: telefone
                }]);
            
            if (dbError) throw dbError;
            
            cadastroSuccess.innerHTML = '✅ <strong>Conta criada com sucesso!</strong><br><br>📧 Verifique seu email <strong>' + email + '</strong> para confirmar sua conta.<br><small>Pode demorar alguns minutos. Verifique também a caixa de spam.</small>';
            cadastroSuccess.style.display = 'block';
            cadastroForm.reset();
            
            setTimeout(function() {
                cadastroScreen.style.display = 'none';
                loginScreen.style.display = 'block';
                cadastroSuccess.style.display = 'none';
            }, 8000);
            
        } catch (error) {
            console.error('Erro no cadastro:', error);
            
            let mensagemErro = error.message;
            
            if (mensagemErro.includes('already registered')) {
                mensagemErro = '❌ Este email já está cadastrado!';
            } else if (mensagemErro.includes('Invalid email')) {
                mensagemErro = '❌ Email inválido!';
            } else if (mensagemErro.includes('Password')) {
                mensagemErro = '❌ Senha muito fraca. Use no mínimo 6 caracteres.';
            }
            
            mostrarErroCadastro(mensagemErro);
        }
    });
}

// ===== RECUPERAR SENHA =====
if (recuperarSenhaForm) {
    recuperarSenhaForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('recuperarEmail').value.trim();
        
        if (!email) {
            mostrarErroRecuperar('Digite seu email');
            return;
        }
        
        try {
            recuperarError.style.display = 'none';
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://bolao-copa-2026-supabase.vercel.app'
            });
            
            if (error) throw error;
            
            recuperarSuccess.innerHTML = '✅ <strong>Email enviado!</strong><br><br>Verifique sua caixa de entrada em <strong>' + email + '</strong>.<br><small>O link expira em 1 hora.</small>';
            recuperarSuccess.style.display = 'block';
            recuperarSenhaForm.reset();
            
            setTimeout(function() {
                recuperarSenhaScreen.style.display = 'none';
                loginScreen.style.display = 'block';
                recuperarSuccess.style.display = 'none';
            }, 8000);
            
        } catch (error) {
            console.error('Erro ao recuperar senha:', error);
            mostrarErroRecuperar(error.message || 'Erro ao enviar email');
        }
    });
}

function mostrarErroCadastro(mensagem) {
    cadastroError.textContent = mensagem;
    cadastroError.style.display = 'block';
}

function mostrarErroRecuperar(mensagem) {
    recuperarError.textContent = mensagem;
    recuperarError.style.display = 'block';
}

// ===== INTERCEPTAR LOGIN PARA USAR SUPABASE =====
const loginFormOriginal = document.getElementById('loginForm');

if (loginFormOriginal) {
    const newLoginForm = loginFormOriginal.cloneNode(true);
    loginFormOriginal.parentNode.replaceChild(newLoginForm, loginFormOriginal);
    
    newLoginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('nome').value.trim();
        const senha = document.getElementById('codigo').value;
        
        if (!email || !senha) {
            mostrarErro('Preencha email e senha');
            return;
        }
        
        try {
            loginError.style.display = 'none';
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: senha
            });
            
            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Email ou senha incorretos');
                } else if (error.message.includes('Email not confirmed')) {
                    throw new Error('Confirme seu email antes de fazer login');
                }
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
            usuarioLogado = participante.nome;
            
            loginScreen.style.display = 'none';
            appScreen.style.display = 'block';
            nomeUsuario.textContent = participante.nome;
            
            configurarLinkPowerBI(participante.bolao);
            
            await carregarDados();
            await carregarPalpitesSalvosSupabase(data.user.id, participante.bolao);
            
        } catch (error) {
            console.error('Erro no login:', error);
            mostrarErro(error.message || 'Erro ao fazer login');
        }
    });
}

// ===== CARREGAR PALPITES DO SUPABASE =====
async function carregarPalpitesSalvosSupabase(userId, bolao) {
    try {
        const { data: palpites, error } = await supabase
            .from('palpites')
            .select('*')
            .eq('user_id', userId)
            .eq('bolao', bolao);
        
        if (error) throw error;
        
        if (palpites && palpites.length > 0) {
            palpites.forEach(palpite => {
                palpitesUsuario[palpite.id_jogo] = {
                    golsA: parseInt(palpite.gols_a) || 0,
                    golsB: parseInt(palpite.gols_b) || 0
                };
            });
            
            palpites.forEach(palpite => {
                const inputA = document.querySelector(`input[data-jogo="${palpite.id_jogo}"][data-time="A"]`);
                const inputB = document.querySelector(`input[data-jogo="${palpite.id_jogo}"][data-time="B"]`);
                
                if (inputA) inputA.value = palpite.gols_a;
                if (inputB) inputB.value = palpite.gols_b;
            });
        }
        
    } catch (error) {
        console.log('Nenhum palpite anterior:', error);
    }
}
