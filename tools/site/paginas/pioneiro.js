// Páginas "Seja Pioneiro" e "Entregador Pioneiro": vagas ao vivo e formulário de interesse.
// Link do vendedor: realyz.com.br/pioneiro.html?v=NOME (o nome vai junto, para saber quem vendeu).
(function () {
  var API = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'http://localhost:8080' : 'https://api.realyz.com.br';
  var GRUPO = window.RZ_GRUPO || 'empresa';
  var $ = function (id) { return document.getElementById(id); };
  var v = new URLSearchParams(location.search).get('v');
  if (v) $('vendedor').value = v.slice(0, 60);

  function vagas() {
    fetch(API + '/pioneiros/vagas').then(function (r) { return r.json(); }).then(function (d) {
      var areas = (d.areas || []).filter(function (a) { return a.grupo === GRUPO; });
      var tot = GRUPO === 'empresa' ? d.empresas : d.entregadores;
      var faltam = tot.meta - tot.fechados;
      $('contador').textContent = faltam > 0 ? 'Faltam ' + faltam + ' de ' + tot.meta + ' vagas' : 'Vagas de pioneiro preenchidas';
      var sel = $('area');
      var atual = sel.value;
      sel.innerHTML = (GRUPO === 'empresa' ? '<option value="">Escolha a área</option>' : '') + areas.map(function (a) {
        return '<option value="' + a.id + '"' + (a.restantes <= 0 ? ' disabled' : '') + '>' + a.label + (a.restantes <= 0 ? ' (vagas preenchidas)' : ' · faltam ' + a.restantes) + '</option>';
      }).join('');
      if (atual) sel.value = atual;
      var box = $('areas');
      if (box) box.innerHTML = areas.map(function (a) {
        var pct = Math.min(100, Math.round((a.fechados / a.meta) * 100));
        return '<div class="area' + (a.restantes <= 0 ? ' cheia' : '') + '"><b>' + a.label + '</b><div class="barra"><i style="width:' + pct + '%"></i></div><small>' + (a.restantes > 0 ? 'Faltam ' + a.restantes + ' de ' + a.meta : 'Preenchida') + '</small></div>';
      }).join('');
    }).catch(function () {
      $('contador').textContent = 'Vagas limitadas';
      if ($('areas')) $('areas').parentNode.hidden = true; // sem resposta do servidor: esconde a lista vazia
      if (!$('area').options.length) $('area').innerHTML = '<option value="">Escolha a área</option>';
    });
  }
  vagas();

  // Máscaras simples: CNPJ e WhatsApp.
  function mascara(el, fn) { el && el.addEventListener('input', function () { el.value = fn(el.value.replace(/\D/g, '')); }); }
  mascara(document.querySelector('[name=cnpj]'), function (d) {
    d = d.slice(0, 14);
    return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  });
  mascara(document.querySelector('[name=whatsapp]'), function (d) {
    d = d.slice(0, 11);
    return d.length > 10 ? d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3') : d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/^(\d{2})$/, '($1');
  });

  // Botão principal: abre o cadastro do Realyz com a área e o vendedor já escolhidos.
  if ($('cadastrar')) {
    $('cadastrar').addEventListener('click', function () {
      var area = $('area').value;
      if (!area) return ($('erroCad').textContent = GRUPO === 'empresa' ? 'Escolha a área da empresa.' : 'Escolha: motoboy ou motorista.');
      location.href = '/?pioneiro=' + encodeURIComponent(area) + (v ? '&v=' + encodeURIComponent(v) : '');
    });
    $('area').addEventListener('change', function () { $('erroCad').textContent = ''; });
    $('prefiro').addEventListener('click', function (e) {
      e.preventDefault();
      $('form').hidden = false;
      $('form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  $('form').addEventListener('input', function () { $('erro').textContent = ''; });
  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    var dados = {};
    Array.prototype.forEach.call(f.elements, function (el) { if (el.name) dados[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim(); });
    if ($('areaForm')) dados.area = $('area').value;
    if (!dados.area) return ($('erro').textContent = 'Escolha a área.');
    if (!dados.nome) return ($('erro').textContent = GRUPO === 'empresa' ? 'Informe o nome da empresa.' : 'Informe o seu nome.');
    if (GRUPO === 'empresa' && dados.cnpj.replace(/\D/g, '').length !== 14) return ($('erro').textContent = 'O CNPJ tem 14 números.');
    if (GRUPO === 'empresa' && !dados.responsavel) return ($('erro').textContent = 'Informe o seu nome.');
    if (dados.whatsapp.replace(/\D/g, '').length < 10) return ($('erro').textContent = 'Informe o WhatsApp com DDD.');
    if (!dados.aceite) return ($('erro').textContent = 'Marque que leu e concorda com as condições.');
    var btn = $('enviar');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    fetch(API + '/pioneiros/interesse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) throw new Error(x.j.error || 'Não deu para enviar. Tente de novo.');
        f.hidden = true;
        $('ok').hidden = false;
        $('ok').scrollIntoView({ behavior: 'smooth', block: 'center' });
        vagas();
      })
      .catch(function (err) {
        $('erro').textContent = err.message === 'Failed to fetch' ? 'Sem conexão. Confira a internet e tente de novo.' : err.message;
        btn.disabled = false;
        btn.textContent = 'Garantir minha vaga';
      });
  });
})();
