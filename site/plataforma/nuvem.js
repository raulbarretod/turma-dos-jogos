// Conexão com a AWS: login dos responsáveis (Cognito) e perfis/progresso das crianças (API + DynamoDB).
// Chamadas diretas com fetch, sem bibliotecas. Os tokens do login ficam no localStorage para continuar logado.
(() => {
  const cfg = window.TURMA_CONFIG || {};
  const TOKENS = 'turma:tokens';

  class ErroNuvem extends Error {
    constructor(codigo, msg) { super(msg || codigo); this.codigo = codigo; }
  }

  let tokens = null;
  try { tokens = JSON.parse(localStorage.getItem(TOKENS)); } catch {}
  function guardar(t) {
    tokens = t;
    try { t ? localStorage.setItem(TOKENS, JSON.stringify(t)) : localStorage.removeItem(TOKENS); } catch {}
  }
  // conteúdo do token (e-mail, validade)
  const lerToken = t => JSON.parse(new TextDecoder().decode(
    Uint8Array.from(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));

  async function cognito(acao, corpo) {
    let r;
    try {
      r = await fetch(`https://cognito-idp.${cfg.regiao}.amazonaws.com/`, {
        method:'POST', body:JSON.stringify(corpo),
        headers:{ 'Content-Type':'application/x-amz-json-1.1', 'X-Amz-Target':`AWSCognitoIdentityProviderService.${acao}` },
      });
    } catch { throw new ErroNuvem('SemInternet'); }
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) throw new ErroNuvem(String(dados.__type || 'Erro').split('#').pop(), dados.message);
    return dados;
  }

  // renova o login (1 hora) com o token de renovação (30 dias); várias chamadas ao mesmo tempo esperam a mesma renovação
  let renovando = null;
  async function tokenValido() {
    if (!tokens) throw new ErroNuvem('NaoLogado');
    if (lerToken(tokens.id).exp * 1000 - Date.now() > 60_000) return tokens;
    renovando ??= cognito('InitiateAuth', { AuthFlow:'REFRESH_TOKEN_AUTH', ClientId:cfg.clientId,
        AuthParameters:{ REFRESH_TOKEN:tokens.renovar } })
      .then(r => guardar({ ...tokens, id:r.AuthenticationResult.IdToken, acesso:r.AuthenticationResult.AccessToken }))
      .catch(e => { if (e.codigo === 'NotAuthorizedException') { guardar(null); throw new ErroNuvem('NaoLogado'); } throw e; })
      .finally(() => { renovando = null; });
    await renovando;
    return tokens;
  }

  async function api(metodo, caminho, corpo, manter = false) {
    const t = await tokenValido();
    let r;
    try {
      r = await fetch(cfg.apiUrl + caminho, {
        method:metodo, keepalive:manter,   // keepalive: termina de enviar mesmo se a página for fechada
        headers:{ Authorization:`Bearer ${t.id}`, ...(corpo && { 'Content-Type':'application/json' }) },
        body:corpo && JSON.stringify(corpo),
      });
    } catch { throw new ErroNuvem('SemInternet'); }
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) throw new ErroNuvem(r.status === 401 ? 'NaoLogado' : dados.erro || `http${r.status}`);
    return dados;
  }

  const Conta = {
    get logado() { return !!tokens; },
    get email() { return tokens ? lerToken(tokens.id).email : ''; },
    async entrar(email, senha) {
      const r = await cognito('InitiateAuth', { AuthFlow:'USER_PASSWORD_AUTH', ClientId:cfg.clientId,
        AuthParameters:{ USERNAME:email, PASSWORD:senha } });
      const a = r.AuthenticationResult;
      if (!a) throw new ErroNuvem('Desafio');
      guardar({ id:a.IdToken, acesso:a.AccessToken, renovar:a.RefreshToken });
    },
    // o e-mail da conta vem do próprio usuário do login (o site não pode gravar nem trocar e-mail);
    // o aceite da política vai para a função da AWS, que grava data e versão no banco (o usuário não consegue alterar)
    criar: (email, senha, politica) => cognito('SignUp', { ClientId:cfg.clientId, Username:email, Password:senha,
      ClientMetadata:{ consentimento:politica } }),
    confirmar: (email, codigo) => cognito('ConfirmSignUp', { ClientId:cfg.clientId, Username:email, ConfirmationCode:codigo }),
    reenviar: email => cognito('ResendConfirmationCode', { ClientId:cfg.clientId, Username:email }),
    esqueci: email => cognito('ForgotPassword', { ClientId:cfg.clientId, Username:email }),
    novaSenha: (email, codigo, senha) => cognito('ConfirmForgotPassword',
      { ClientId:cfg.clientId, Username:email, ConfirmationCode:codigo, Password:senha }),
    sair() {
      const t = tokens; guardar(null);
      if (t) cognito('RevokeToken', { ClientId:cfg.clientId, Token:t.renovar }).catch(() => {});
    },
    // apaga perfis e progresso e depois a própria conta
    async excluir() {
      await api('DELETE', '/conta');
      await cognito('DeleteUser', { AccessToken:(await tokenValido()).acesso });
      guardar(null);
    },
  };

  const Perfis = {
    listar: () => api('GET', '/perfis'),
    criar: (nome, cor) => api('POST', '/perfis', { nome, cor }),
    editar: (id, nome, cor) => api('PATCH', `/perfis/${id}`, { nome, cor }),
    apagar: id => api('DELETE', `/perfis/${id}`),
    salvarDados: (id, dados, manter) => api('PATCH', `/perfis/${id}/dados`, dados, manter),
  };

  window.Nuvem = { Conta, Perfis, configurado:!!(cfg.clientId && cfg.apiUrl) };
})();
