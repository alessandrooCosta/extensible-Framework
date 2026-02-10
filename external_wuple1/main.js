Ext.define("EAM.custom.external_wuoseq", {
    extend: "EAM.custom.AbstractExtensibleFramework",
    getSelectors: function () {
      return {
        '[extensibleFramework] [tabName=LST]': {
          afterlayout: function () {
          // Evita registrar handlers múltiplas vezes se afterlayout disparar várias vezes
          // Armazenamos a flag no próprio componente grid (mais confiável que `this` aqui)
          console.log('WUOSEQ: afterlayout handler entered at', new Date().toISOString());

          try {
            var grid = EAM.Utils.getScreen().down("readonlygrid");
          } catch (err) {
            console.log('WUOSEQ: erro ao obter screen.down("readonlygrid")', err);
            var grid = null;
          }

          if (grid && grid._wuple1_initialized) {
            console.log('WUOSEQ: já inicializado, saindo');
            return;
          }
          if (grid) grid._wuple1_initialized = true;

          console.log('WUOSEQ: afterlayout triggered for LST tab. grid=', grid);
          
          if (!grid) return;
          if (!grid) return;
          var gridView = grid.getView();
          var gridStore = grid.getStore();
          console.log("GridStore: "+gridStore);
          console.log("GridView: "+gridView);

          // Função que busca, em lote, os evt_jobtype para todos os evt_code visíveis
          function colorlist() {
            // Funções utilitárias
            function extractRowsFromResp(vHDR) {
              var vRows = (((vHDR || {}).responseData || {}).pageData || {}).grid;
              vRows = (((vRows || {}).GRIDRESULT || {}).GRID || {}).DATA || [];
              return vRows;
            }

            function processRowsAndApply(vRows) {
              try {
                // Monta mapa evt_code -> evt_jobtype (normalizando chaves como string sem espaços)
                var jobTypeByCode = {};
                for (var r = 0; r < vRows.length; r++) {
                  var rec = vRows[r];
                  if (!rec) continue;
                  var code = rec.evt_code || rec.EVT_CODE || rec.code || rec.workordernum || rec.WORKORDER || rec.id;
                  var jobtype = rec.evt_jobtype || rec.EVT_JOBTYPE || rec.jobtype || rec.type || rec.evt_type || rec.EVT_TYPE;
                  if (code !== undefined && code !== null) {
                    try {
                      var key = String(code).trim();
                      jobTypeByCode[key] = jobtype;
                      // variações úteis
                      jobTypeByCode[(key || '').toUpperCase()] = jobtype;
                      jobTypeByCode[(key || '').toLowerCase()] = jobtype;
                      var noLeading = key.replace(/^0+/, '');
                      if (noLeading) jobTypeByCode[noLeading] = jobtype;
                      var asNum = Number(key);
                      if (!isNaN(asNum)) jobTypeByCode[String(asNum)] = jobtype;
                    } catch (e) {
                      jobTypeByCode[code] = jobtype;
                    }
                  }
                }

                // Função para buscar status tentando várias normalizações e, se necessário, pesquisa linear em vRows
                function findStatusForKey(rawKey) {
                  if (rawKey === undefined || rawKey === null) return undefined;
                  var k = String(rawKey).trim();
                  var tries = [k, k.toUpperCase(), k.toLowerCase(), k.replace(/^0+/, ''), String(Number(k))];
                  for (var t = 0; t < tries.length; t++) {
                    var tk = tries[t];
                    if (!tk && tk !== '') continue;
                    if (jobTypeByCode.hasOwnProperty(tk)) return jobTypeByCode[tk];
                  }

                  // fallback: procurar no array vRows por correspondência aproximada nos campos de código
                  for (var rr = 0; rr < vRows.length; rr++) {
                    var rec2 = vRows[rr];
                    if (!rec2) continue;
                    var candidates = [rec2.evt_code, rec2.EVT_CODE, rec2.code, rec2.workordernum, rec2.WORKORDER, rec2.id];
                    for (var cidx = 0; cidx < candidates.length; cidx++) {
                      var cand = candidates[cidx];
                      if (cand === undefined || cand === null) continue;
                      try {
                        if (String(cand).trim() === k) return (rec2.evt_jobtype || rec2.EVT_JOBTYPE || rec2.jobtype || rec2.type || rec2.evt_type || rec2.EVT_TYPE);
                        if (String(Number(cand)) === String(Number(k))) return (rec2.evt_jobtype || rec2.EVT_JOBTYPE || rec2.jobtype || rec2.type || rec2.evt_type || rec2.EVT_TYPE);
                      } catch (e) {
                        // ignore
                      }
                    }
                  }

                  return undefined;
                }

                console.log('WUOSEQ: GRIDDATA agregada rows=', vRows.length, 'mapped=', Object.keys(jobTypeByCode).length);

                // Aplica cores nas linhas
                var applied = 0;
                var notApplied = 0;
                var unmatchedSamples = [];
                for (var i = 0; i < gridStore.getCount(); i++) {
                  try {
                    var record = gridStore.getAt(i);
                    var vWorkorder = record.get('evt_code') || record.get('EVT_CODE');
                    var lookupKey = (vWorkorder !== undefined && vWorkorder !== null) ? String(vWorkorder).trim() : vWorkorder;
                    var node = gridView.getNode(i);
                    if (!node) continue;

                    var status = findStatusForKey(lookupKey);
                    // normalize status for comparison
                    var normStatus = (status === undefined || status === null) ? '' : String(status).trim().toUpperCase();
                    // remove previous inline color
                    node.style.removeProperty('background-color');

                    if (normStatus === 'PPM') {
                      var color = '#CCFFCC';
                      try { node.style.setProperty('background-color', color, 'important'); } catch(e){}
                      // aplicar no TR caso exista
                      try { var tr = node.querySelector && (node.querySelector('tr.x-grid-row') || node.querySelector('tr')); if (tr) tr.style.setProperty('background-color', color, 'important'); } catch(e){}
                      // aplicar nas celulas internas (.x-grid-cell-inner)
                      try { var inners = node.querySelectorAll && node.querySelectorAll('.x-grid-cell-inner'); if (inners) for (var ii=0; ii<inners.length; ii++) inners[ii].style.setProperty('background-color', color, 'important'); } catch(e){}
                      // aplicar nas TDs
                      try { var tds = node.querySelectorAll && node.querySelectorAll('td'); if (tds) for(var _j=0;_j<tds.length;_j++) tds[_j].style.setProperty('background-color', color, 'important'); } catch(e){}
                      applied++;
                    }
                    else if (normStatus === 'JOB') {
                      var color = '#FFCCCC';
                      try { node.style.setProperty('background-color', color, 'important'); } catch(e){}
                      try { var tr2 = node.querySelector && (node.querySelector('tr.x-grid-row') || node.querySelector('tr')); if (tr2) tr2.style.setProperty('background-color', color, 'important'); } catch(e){}
                      try { var inners2 = node.querySelectorAll && node.querySelectorAll('.x-grid-cell-inner'); if (inners2) for (var ii2=0; ii2<inners2.length; ii2++) inners2[ii2].style.setProperty('background-color', color, 'important'); } catch(e){}
                      try { var tds2 = node.querySelectorAll && node.querySelectorAll('td'); if (tds2) for(var _k=0;_k<tds2.length;_k++) tds2[_k].style.setProperty('background-color', color, 'important'); } catch(e){}
                      applied++;
                    }
                    else {
                      notApplied++;
                      if (unmatchedSamples.length < 5) unmatchedSamples.push({index: i, vWorkorder: vWorkorder, lookupKey: lookupKey, rawStatus: status, normStatus: normStatus});
                    }
                  } catch (e) {
                    console.log('Erro ao processar linha ' + i + ': ' + e);
                  }
                }
                console.log('WUOSEQ: linhas aplicadas=', applied, 'nao aplicadas=', notApplied, 'amostrasNaoEncontradas=', unmatchedSamples);
                // Log de amostras: mostra outerHTML para inspeção do DOM (limitado a 1000 chars)
                try {
                  unmatchedSamples.forEach(function(s){
                    try {
                      var n = gridView.getNode(s.index);
                      console.log('WUOSEQ: amostra node index=' + s.index + ' lookupKey=' + s.lookupKey + ' outerHTML=', n && n.outerHTML && n.outerHTML.substring(0,1000));
                    } catch(e) { console.log('WUOSEQ: não foi possível mostrar outerHTML para index=' + s.index, e); }
                  });
                } catch(e) {}
              } catch (e) {
                console.log('Erro ao aplicar cores: ' + e);
              }
            }

            try {
              // 1) Coleta todos os evt_code visíveis no store (sem duplicatas)
              var codes = [];
              var seen = {};
              gridStore.each(function(rec){
                var c = rec.get('evt_code') || rec.get('EVT_CODE');
                if (c && !seen[c]) { seen[c] = true; codes.push(c); }
              });

              if (codes.length === 0) return;

              console.log('WUOSEQ: consultando GRIDDATA para codes=', codes);

              // helper para chamar GRIDDATA
              function callGridDataForCodes(codesBatch) {
                return EAM.Ajax.request({
                  url: 'GRIDDATA',
                  params: {
                    USER_FUNCTION_NAME: 'WSJOBS',
                    SYSTEM_FUNCTION_NAME: 'WSJOBS',
                    CURRENT_TAB_NAME: 'LST',
                    COMPONENT_INFO_TYPE: 'DATA_ONLY',
                    filterfields: 'evt_code',
                    filteroperator: 'IN',
                    filtervalue: codesBatch.join(',')
                  }
                });
              }

              // Primeiro tenta em uma única requisição
              var maybeResp;
              try {
                maybeResp = callGridDataForCodes(codes);
              } catch (err) {
                console.log('WUOSEQ: erro ao chamar GRIDDATA (sync):', err);
                maybeResp = null;
              }

              console.log('WUOSEQ: maybeResp=', maybeResp, 'isPromise=', maybeResp && typeof maybeResp.then === 'function');

              // Trata resposta síncrona ou Promise
              function handleResp(resp) {
                try {
                  var rows = extractRowsFromResp(resp);
                  // Se a resposta trouxer poucas linhas, tenta fallback em batches
                  if (!rows || rows.length < codes.length) {
                    // Faz fallback em batches de 50
                    var batchSize = 50;
                    var batches = [];
                    for (var i = 0; i < codes.length; i += batchSize) batches.push(codes.slice(i, i + batchSize));

                    var allRows = [];
                    for (var b = 0; b < batches.length; b++) {
                      try {
                        var br = EAM.Ajax.request({
                          url: 'GRIDDATA',
                          params: {
                            USER_FUNCTION_NAME: 'WSJOBS',
                            SYSTEM_FUNCTION_NAME: 'WSJOBS',
                            CURRENT_TAB_NAME: 'LST',
                            COMPONENT_INFO_TYPE: 'DATA_ONLY',
                            filterfields: 'evt_code',
                            filteroperator: 'IN',
                            filtervalue: batches[b].join(',')
                          }
                        });
                        var brow = extractRowsFromResp(br);
                        if (brow && brow.length) allRows = allRows.concat(brow);
                      } catch (e) {
                        console.log('Erro no batch ' + b + ': ' + e);
                      }
                    }

                    processRowsAndApply(allRows);
                  } else {
                    processRowsAndApply(rows);
                  }
                } catch (e) {
                  console.log('Erro no tratamento da resposta GRIDDATA: ' + e);
                }
              }

              if (maybeResp && typeof maybeResp.then === 'function') {
                // Promise-based
                console.log('WUOSEQ: GRIDDATA returned a promise, waiting...');
                maybeResp.then(function(resp){ console.log('WUOSEQ: GRIDDATA promise resolved'); handleResp(resp); }).catch(function(err){ console.log('GRIDDATA promise erro:', err); });
              } else if (maybeResp) {
                // Síncrono
                console.log('WUOSEQ: GRIDDATA returned sync response');
                handleResp(maybeResp);
              } else {
                console.log('WUOSEQ: GRIDDATA returned null/undefined response, aborting');
              }

            } catch (e) {
              console.log('Erro na operação de coloração em lote: ' + e);
            }
          }

          // Execução inicial
          colorlist();

          // Reaplica ao rolar/atualizar dados do view/store
          gridView.on('scroll', colorlist);
          gridView.on('refresh', colorlist);
          gridStore.on('datachanged', colorlist);

          // Handler de clique — mantém comportamento existente
          gridView.on('itemclick', function(view, record, item) {
            var nodes = gridView.getNodes();
            Ext.Array.each(nodes, function(node) {
              node.style.boxShadow = '';
            });
            item.style.boxShadow = 'inset 0 0 0 2px #0000FF';
          });
        }
      },
    }
  }});
