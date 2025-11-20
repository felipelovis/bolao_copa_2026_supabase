// ===== ELEMENTOS DOM CADASTRO =====
const cadastroScreen = document.getElementById('cadastroScreen');
const cadastroForm = document.getElementById('cadastroForm');
const cadastroError = document.getElementById('cadastroError');
const cadastroSuccess = document.getElementById('cadastroSuccess');
const criarContaBtn = document.getElementById('criarContaBtn');
const voltarLoginBtn = document.getElementById('voltarLoginBtn');

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
            cadastroSuccess.innerHTML = '✅ <strong>Conta criada com sucesso!</strong><br><br>📧 Verifique seu email <strong>' + email + '</strong> para confirmar sua conta.<br><small>Pode demorar alguns minutos. Verifique também a caixa de spam.</small>';
            cadastroSuccess.style.display = 'block';
            cadastroForm.reset();
            
            // 4. Voltar para login após 8 segundos
            setTimeout(function() {
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
}

function mostrarErroCadastro(mensagem) {
    cadastroError.textContent = mensagem;
    cadastroError.style.display = 'block';
}
