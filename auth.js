Nome do arquivo:
auth.js
Conteúdo (COPIAR TUDO):
javascript// ===== ELEMENTOS DOM CADASTRO =====
const cadastroScreen = document.getElementById('cadastroScreen');
const cadastroForm = document.getElementById('cadastroForm');
const cadastroError = document.getElementById('cadastroError');
const cadastroSuccess = document.getElementById('cadastroSuccess');
const criarContaBtn = document.getElementById('criarContaBtn');
const voltarLoginBtn = document.getElementById('voltarLoginBtn');

// ===== ELEMENTOS DOM LOGIN =====
const emailInput = document.getElementById('nome'); // Vamos mudar para email
const senhaInput = document.getElementById('codigo'); // Vamos mudar para senha

// ===== MOSTRAR TELA DE CADASTRO =====
criarContaBtn?.addEventListener('click', () => {
    loginScreen.style.display = 'none';
    cadastroScreen.style.display = 'block';
});

// ===== VOLTAR PARA LOGIN =====
voltarLoginBtn?.addEventListener('click', () => {
    cadastroScreen.style.display = 'none';
    loginScreen.style.display = 'block';
    cadastroForm.reset();
    cadastroError.style.display = 'none';
    cadastroSuccess.style.display = 'none';
});

// ===== CRIAR CONTA =====
cadastroForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('cadastroNome').value.trim();
    const email = document.getElementById('cadastroEmail').value.trim();
    const senha = document.getElementById('cadastroSenha').value;
    const senhaConfirm = document.getElementById('cadastroSenhaConfirm').value;
    const bolao = document.getElementById('cadastroBolao').value;
    const telefone = document.getElementById('cadastroTelefone').value.trim();
    
    // Validar senhas
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
        
        // 1. Criar usuário no Supabase Auth
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
        
        // 2. Salvar dados extras na tabela participantes
        const { error: dbError } = await supabase
            .from('participantes')
            .insert([{
                user_id: authData.user.id,
                nome: nome,
                bolao: bolao,
                telefone: telefone
            }]);
        
        if (dbError) throw dbError;
        
        // 3. Mostrar sucesso
        cadastroSuccess.innerHTML = `
            ✅ <strong>Conta criada com sucesso!</strong><br><br>
            📧 Verifique seu email <strong>${email}</strong> para confirmar sua conta.<br>
            <small>Pode demorar alguns minutos. Verifique também a caixa de spam.</small>
        `;
        cadastroSuccess.style.display = 'block';
        cadastroForm.reset();
        
        // 4. Voltar para login após 8 segundos
        setTimeout(() => {
            cadastroScreen.style.display = 'none';
            loginScreen.style.display = 'block';
            cadastroSuccess.style.display = 'none';
        }, 8000);
        
    } catch (error) {
        console.error('Erro no cadastro:', error);
        
        let mensagemErro = error.message;
        
        // Traduzir erros comuns
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

function mostrarErroCadastro(mensagem) {
    cadastroError.textContent = mensagem;
    cadastroError.style.display = 'block';
}

// ===== INTERCEPTAR LOGIN ANTIGO E USAR SUPABASE =====
// Vamos sobrescrever a função handleLogin original
const loginFormOriginal = loginForm;

if (loginFormOriginal) {
    // Remover listener antigo
    const newLoginForm = loginFormOriginal.cloneNode(true);
    loginFormOriginal.parentNode.replaceChild(newLoginForm, loginFormOriginal);
    
    // Adicionar novo listener com Supabase
    newLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('nome').value.trim(); // Campo nome agora é email
        const senha = document.getElementById('codigo').value; // Campo codigo agora é senha
        const bolaoSelect = document.getElementById('bolaoSelect')?.value;
        
        if (!email || !senha) {
            mostrarErro('Preencha email e senha');
            return;
        }
        
        try {
            loginError.style.display = 'none';
            
            // Login com Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: senha
            });
            
            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Email ou senha incorretos');
                } else if (error.message.includes('Email not confirmed')) {
                    throw new Error('Confirme seu email antes de fazer login. Verifique sua caixa de entrada.');
                }
                throw error;
            }
            
            // Buscar dados do participante
            const { data: participante, error: dbError } = await supabase
                .from('participantes')
                .select('*')
                .eq('user_id', data.user.id)
                .single();
            
            if (dbError) throw dbError;
            
            // Salvar na sessão
            sessionStorage.setItem('bolao', participante.bolao);
            sessionStorage.setItem('participante', participante.nome);
            sessionStorage.setItem('user_id', data.user.id);
            usuarioLogado = participante.nome;
            
            // Mostrar app
            loginScreen.style.display = 'none';
            appScreen.style.display = 'block';
            nomeUsuario.textContent = participante.nome;
            
            // Configurar Power BI
            configurarLinkPowerBI(participante.bolao);
            
            // Carregar dados
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
            // Preencher objeto palpitesUsuario
            palpites.forEach(palpite => {
                palpitesUsuario[palpite.id_jogo] = {
                    golsA: parseInt(palpite.gols_a) || 0,
                    golsB: parseInt(palpite.gols_b) || 0
                };
            });
            
            // Preencher campos no HTML
            palpites.forEach(palpite => {
                const inputA = document.querySelector(`input[data-jogo="${palpite.id_jogo}"][data-time="A"]`);
                const inputB = document.querySelector(`input[data-jogo="${palpite.id_jogo}"][data-time="B"]`);
                
                if (inputA) inputA.value = palpite.gols_a;
                if (inputB) inputB.value = palpite.gols_b;
            });
        }
        
    } catch (error) {
        console.log('Nenhum palpite anterior encontrado:', error);
    }
}
