// Formulário de contato: manda a mensagem para a API (POST /contato, sem login),
// que repassa por e-mail para a equipe. O endereço da equipe fica só na AWS, nunca no site.
(() => {
  const $ = id => document.getElementById(id);
  const cfg = window.TURMA_CONFIG || {};
  const form = $('contatoForm'), botao = $('contatoEnviar'), erro = $('contatoErro');

  function validar(d) {
    if (!d.nome) return ['cNome', 'Digite seu nome.'];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return ['cEmail', 'Digite um e-mail válido para podermos responder.'];
    if (!d.assunto) return ['cAssunto', 'Digite o assunto.'];
    if (d.mensagem.length < 10) return ['cMensagem', 'Escreva sua mensagem (pelo menos 10 letras).'];
    return null;
  }

  // desafio anti-robô: a API manda um hash e o navegador acha o número que o gera (~1 s; em lotes para não travar a tela)
  async function resolverDesafio() {
    const r = await fetch(`${cfg.apiUrl}/contato/desafio`);
    if (!r.ok) throw r.status === 429 ? 'Muitas mensagens seguidas. Espere um minuto e tente de novo.' : 'erro';
    const d = await r.json(), cod = new TextEncoder();
    const hex = b => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
    for (let ini = 0; ini <= d.max; ini += 2000) {
      const lote = Array.from({ length:Math.min(2000, d.max + 1 - ini) }, (_, i) => ini + i);
      const hashes = await Promise.all(lote.map(n => crypto.subtle.digest('SHA-256', cod.encode(d.salt + n))));
      const achou = hashes.findIndex(h => hex(h) === d.desafio);
      if (achou >= 0) return { salt:d.salt, desafio:d.desafio, assinatura:d.assinatura, numero:lote[achou] };
    }
    throw 'erro';
  }

  form.onsubmit = async e => {
    e.preventDefault();
    const dados = { nome:$('cNome').value.trim(), email:$('cEmail').value.trim(), assunto:$('cAssunto').value.trim(),
      mensagem:$('cMensagem').value.trim(), site:$('cSite').value };
    const problema = validar(dados);
    erro.textContent = problema?.[1] ?? '';
    if (problema) return void $(problema[0]).focus();
    botao.disabled = true; botao.textContent = 'Enviando…';
    try {
      let r;
      try {
        dados.prova = await resolverDesafio();
        r = await fetch(`${cfg.apiUrl}/contato`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(dados) });
      } catch (x) {
        if (typeof x === 'string' && x !== 'erro') throw x;   // mensagem já pronta (ex.: excesso de envios)
        throw x === 'erro' ? 'Não foi possível enviar agora. Tente de novo em alguns minutos.' : 'Sem conexão com a internet. Verifique e tente de novo.';
      }
      if (r.status === 429) throw 'Muitas mensagens seguidas. Espere um minuto e tente de novo.';
      if (!r.ok) throw 'Não foi possível enviar agora. Tente de novo em alguns minutos.';
      form.reset(); form.hidden = true; $('contatoOk').hidden = false;
    } catch (msg) {
      erro.textContent = typeof msg === 'string' ? msg : 'Não foi possível enviar agora. Tente de novo em alguns minutos.';
    } finally {
      botao.disabled = false; botao.textContent = 'Enviar mensagem';
    }
  };
  $('contatoOutra').onclick = () => { $('contatoOk').hidden = true; form.hidden = false; $('cNome').focus(); };
})();
