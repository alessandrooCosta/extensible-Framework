Ext.define("EAM.custom.external_wuple1", {
  extend: "EAM.custom.AbstractExtensibleFramework",

  getSelectors: function () {
    return {
      '[extensibleFramework] [tabName=LST]': {
        afterlayout: function () {
          var grid = null;
          try {
            grid = EAM.Utils.getScreen().down("readonlygrid");
          } catch (err) {
            return;
          }
          
          if (!grid) return;
          if (grid._wuple1_initialized) return; 
          grid._wuple1_initialized = true;

          var gridView = grid.getView();
          var gridStore = grid.getStore();
          if (!gridView || !gridStore) return;

          var inFlight = false;
          var pending = false;
          var lastSignature = null;
          var statusCache = {};
          var diagnosticsRan = false;
          var WO_TOTAL = 31;

          // Normaliza um valor para string trimmed.
          // Entrada: qualquer valor; Saída: '' para null/undefined, senão String(v).trim().
          function norm(v) {
            return (v === undefined || v === null) ? '' : String(v).trim();
          }

          // Gera variantes úteis de uma chave para matching robusto.
          // Exemplos: original, UPPER, lower, sem zeros à esquerda, versão numérica.
          // Retorna array de strings únicas.
          function keyVariants(v) {
            var k = norm(v);
            if (!k && k !== '0') return [];

            var arr = [k, k.toUpperCase(), k.toLowerCase()];
            var noLeading = k.replace(/^0+/, '');
            if (noLeading) arr.push(noLeading);

            var n = Number(k);
            if (!isNaN(n)) arr.push(String(n));

            var uniq = {};
            var out = [];
            for (var i = 0; i < arr.length; i++) {
              if (!uniq[arr[i]]) {
                uniq[arr[i]] = true;
                out.push(arr[i]);
              }
            }
            return out;
          }

          // Lê as linhas de interesse da resposta do GRIDDATA.
          // Entrada: objeto de resposta possivelmente complexo; Saída: array DATA ou [].
          function readRows(resp) {
            var rows = (((resp || {}).responseData || {}).pageData || {}).grid;
            return (((rows || {}).GRIDRESULT || {}).GRID || {}).DATA || [];
          }

          // Extrai o campo usado como código (workordernum) do row retornado pelo GRIDDATA.
          // Ajuste aqui se o nome do campo no WSJOBS for diferente.
          function getCode(rec) {
            return rec.workordernum;
          }

          // Extrai o tipo/jobtype do row retornado pelo GRIDDATA.
          // Ajuste se o nome do campo (workorderrtype) for diferente.
          function getJobtype(rec) {
            return rec.workordertype_display;
          // return rec.workorderrtype;
          }

          // Faz a requisição GRIDDATA para um conjunto de códigos.
          // Entrada: array de códigos; Saída: objeto/promise retornado por EAM.Ajax.request.
          // Obs.: se o backend usa outro campo para filtro, ajuste filterfields.
          function requestGridData(codes) {
            return EAM.Ajax.request({
              url: 'GRIDDATA',
              params: {
                USER_FUNCTION_NAME: 'WSJOBS',
                SYSTEM_FUNCTION_NAME: 'WSJOBS',
                CURRENT_TAB_NAME: 'LST',
                COMPONENT_INFO_TYPE: 'DATA_ONLY',
                filterfields: 'workordernum',  //  Pode precisar de ajuste (ex.: 'evt_code')
                filteroperator: 'IN',
                filtervalue: codes.join(',')
              }
            });
          }
          
          // Adapta um retorno que pode ser síncrono para uma interface "thenable".
          // Se v já tem then, retorna v; senão retorna objeto simples com then.
          function asPromise(v) {
            if (v && typeof v.then === 'function') return v;
            return {
              then: function (ok) {
                try { ok(v); } catch (e) {}
                return { catch: function () {} };
              }
            };
          }

          // Formata inteiro com dois dígitos: 1 -> '01'.
          function pad2(n) {
            return n < 10 ? '0' + n : String(n);
          }

          // Gera candidatos de nomes de campo para a posição pos (evp_wo01, EVP_WO01).
          // Usado para procurar múltiplas ordens por linha.
          function getWoFieldCandidates(pos) {
            var p = pad2(pos);
            var base = 'evp_wo' + p;
            return [base, base.toUpperCase()];
          }

          // Dado um registro da store e uma posição (1..WO_TOTAL), retorna o código WO se presente.
          // Usa os candidatos de getWoFieldCandidates e rec.get(campo).
          function getWoCode(rec, pos) {
            var candidates = getWoFieldCandidates(pos);
            for (var i = 0; i < candidates.length; i++) {
              var v = rec.get(candidates[i]);
              if (norm(v) !== '') return v;
            }
            return '';
          }

          // Constroi um mapa dataIndex -> columnIndex da grade.
          // Retorna objeto onde a chave é dataIndex em lowercase.
          function getWoColumnIndexMap() {
            var map = {};
            try {
              var columns = gridView.getGridColumns ? gridView.getGridColumns() : (grid.headerCt && grid.headerCt.getGridColumns ? grid.headerCt.getGridColumns() : []);
              for (var i = 0; i < columns.length; i++) {
                var dataIndex = norm(columns[i].dataIndex).toLowerCase();
                if (!dataIndex) continue;
                map[dataIndex] = i;
              }
            } catch (e) {}
            return map;
          }

          // Dado o mapa de colunas e pos, retorna o índice da célula (td) correspondente ou -1.
          function getWoCellIndex(woColumnIndexMap, pos) {
            var key = 'evp_wo' + pad2(pos);
            if (woColumnIndexMap.hasOwnProperty(key)) return woColumnIndexMap[key];
            return -1;
          }
          
          // Percorre a store e coleta todos os códigos WO visíveis (sem duplicatas).
          // Retorna array de códigos.
          function collectCodes() {
            var seen = {};
            var codes = [];

            gridStore.each(function (rec) {
              for (var pos = 1; pos <= WO_TOTAL; pos++) {
                var c = getWoCode(rec, pos);
                if (norm(c) === '') continue;

                var k = String(c);
                if (!seen[k]) {
                  seen[k] = true;
                  codes.push(c);
                }
              }
            });

            return codes;
          }

          // Atualiza o cache statusCache com as rows retornadas pelo GRIDDATA.
          // Para cada row usa getCode() e getJobtype(), e popula statusCache para todas as variantes de chave.
          function updateCache(rows) {
            for (var i = 0; i < rows.length; i++) {
              var rec = rows[i];
              if (!rec) continue;

              var code = getCode(rec);
              if (code === undefined || code === null) continue;

              var job = getJobtype(rec);
              var vars = keyVariants(code);

              for (var j = 0; j < vars.length; j++) {
                statusCache[vars[j]] = job;
              }
            }
          }
          
          // Procura o status (jobtype) de um código consultando statusCache usando variantes.
          // Retorna jobtype ou undefined.
          function findStatus(code) {
            var vars = keyVariants(code);
            for (var i = 0; i < vars.length; i++) {
              if (statusCache.hasOwnProperty(vars[i])) return statusCache[vars[i]];
            }
            return undefined;
          }

          // Mapeia um tipo de OS (ex.: 'M01') para uma cor HEX.
          // Retorna string com cor ou null se nenhuma cor aplicável.
          function getOsTypeColor(osType) {
            var type = norm(osType).toUpperCase();

            if (type === 'M01 - MANUTENCAO CORRETIVA EMERGENCIAL' || type === 'M01' || type.indexOf('M01') === 0) return '#FF0000'; // MANUTENCAO CORRETIVA EMERGENCIAL
            if (type === 'M02 - MANUTENÇÃO PREVENTIVA PERIÓDICA' || type === 'M02' || type.indexOf('M02') === 0) return '#00B050'; // MANUTENCAO PREVENTIVA PERIODICA
            if (type === 'M03 - MANUTENCAO CORRETIVA PLANEJADA' || type === 'M03' || type.indexOf('M03') === 0) return '#FFF200'; // MANUTENCAO CORRETIVA PLANEJADA
            if (type === 'M04 - MANUTENCAO PREDITIVA PERIODICA' || type === 'M04' || type.indexOf('M04') === 0) return '#D9EAD3'; // MANUTENCAO PREDITIVA PERIODICA
            if (type === 'M05 - ROTAS DE INSPECAO' || type === 'M05' || type.indexOf('M05') === 0) return '#00B0F0'; // ROTAS DE INSPECAO
            if (type === 'M06 - MELHORIAS' || type === 'M06' || type.indexOf('M06') === 0) return '#D9B2D9'; // MELHORIAS
            if (type === 'M09 - CALIBRACAO' || type === 'M09' || type.indexOf('M09') === 0) return '#A6A6A6'; // CALIBRACAO
            if (type === 'M10 - INFRAESTRUTURA' || type === 'M10' || type.indexOf('M10') === 0) return '#D97800'; // INFRAESTRUTURA
            // M07, M08 e M11: sem cor
            return null;
          }
          
          // Aplica/Remove o background-color em uma célula específica (td) dentro do node de linha.
          // node: elemento table/row retornado por gridView.getNode(i)
          // columnIndex: índice da célula (0..n)
          // color: string hex ou null para remover
          function paintCell(node, columnIndex, color) {
            if (!node || columnIndex < 0) return;

            try {
              var cells = node.querySelectorAll && node.querySelectorAll('td');
              var cell = cells && cells[columnIndex];
              if (!cell) return;

              if (color) cell.style.setProperty('background-color', color, 'important');
              else cell.style.removeProperty('background-color');

              var inner = cell.querySelector && cell.querySelector('.x-grid-cell-inner');
              if (!inner) return;

              if (color) inner.style.setProperty('background-color', color, 'important');
              else inner.style.removeProperty('background-color');
            } catch (e) {}
          }

          // Percorre a store e tenta pintar todas as células de WO usando o cache atual.
          // Conta quantas células receberam cor (applied) e quantas não (notApplied).
          // Observação: gridView.getNode(i) pode ser undefined para linhas não renderizadas (virtual scrolling) — o código pula esses.
          function repaintFromCache() {
            var applied = 0;
            var notApplied = 0;
            var woColumnIndexMap = getWoColumnIndexMap();

            for (var i = 0; i < gridStore.getCount(); i++) {
              try {
                var rec = gridStore.getAt(i);
                var node = gridView.getNode(i);
                if (!node) continue;

                for (var pos = 1; pos <= WO_TOTAL; pos++) {
                  var columnIndex = getWoCellIndex(woColumnIndexMap, pos);
                  if (columnIndex < 0) continue;

                  var code = getWoCode(rec, pos);
                  if (norm(code) === '') {
                    paintCell(node, columnIndex, null);
                    notApplied++;
                    continue;
                  }

                  var s = findStatus(code);
                  var color = getOsTypeColor(s);

                  paintCell(node, columnIndex, color);

                  if (color) applied++;
                  else notApplied++;
                }
              } catch (lineErr) {
              }
            }
          }
          
          // Simples utilitário: particiona um array em chunks de tamanho 'size'.
          function chunk(arr, size) {
            var out = [];
            for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
            return out;
          }

          // Faz requests em batches sequenciais (para evitar limites no IN / no servidor).
          // Quando todos os batches completam, chama done(allRows).
          function fetchInBatches(codes, done) {
            var batches = chunk(codes, 50);
            var allRows = [];
            var idx = 0;

            function next() {
              if (idx >= batches.length) {
                done(allRows);
                return;
              }

              var current = batches[idx++];
              var req = null;

              try {
                req = requestGridData(current);
              } catch (err) {
                next();
                return;
              }

              asPromise(req)
                .then(function (resp) {
                  var rows = readRows(resp);
                  if (rows && rows.length) allRows = allRows.concat(rows);
                  next();
                })
                .catch(function (err) {
                  next();
                });
            }

            next();
          }

          // Rotina de diagnóstico executada uma vez para coletar amostras e expor window.WUPLE1_DIAG.
          // Útil para debug em produção sem interromper fluxo principal.
          function runWsJobsDiagnostics() {
            if (diagnosticsRan) return;
            diagnosticsRan = true;

            var codes = collectCodes();
            var sampleCodes = codes.slice(0, 20);

            if (!sampleCodes.length) {
              return;
            }

            var req;
            try {
              req = requestGridData(sampleCodes);
            } catch (e) {
              return;
            }

            asPromise(req)
              .then(function (resp) {
                var rows = readRows(resp) || [];
                var matched = 0;
                var unmatched = 0;
                var sample = [];
                var map = {};

                for (var i = 0; i < rows.length; i++) {
                  var rc = getCode(rows[i]);
                  var rj = getJobtype(rows[i]);
                  if (rc !== undefined && rc !== null) map[norm(rc)] = rj;
                  if (sample.length < 10) sample.push({ code: rc, jobtype: rj });
                }

                for (var s = 0; s < sampleCodes.length; s++) {
                  if (map.hasOwnProperty(norm(sampleCodes[s]))) matched++;
                  else unmatched++;
                }

                try {
                  window.WUPLE1_DIAG = {
                    when: new Date().toISOString(),
                    sampleCodes: sampleCodes,
                    rowCount: rows.length,
                    matched: matched,
                    unmatched: unmatched,
                    sampleRows: sample
                  };
                } catch (e2) {
                }
              })
              .catch(function (err) {
              });
          }
          
          // Função central: coleta códigos, faz request(s), atualiza cache e repinta.
          // Controla reentrância com inFlight/pending e evita requests redundantes com lastSignature.
          function refreshColors() {
            if (inFlight) {
              pending = true;
              return;
            }

            inFlight = true;
            pending = false;

            var codes = collectCodes();
            if (!codes.length) {
              repaintFromCache();
              inFlight = false;
              return;
            }

            var signature = codes.map(String).sort().join('|');

            if (signature === lastSignature) {
              repaintFromCache();
              inFlight = false;
              if (pending) refreshColors();
              return;
            }

            var req = null;
            try {
              req = requestGridData(codes);
            } catch (err) {
              inFlight = false;
              if (pending) refreshColors();
              return;
            }
            
            asPromise(req)
              .then(function (resp) {
                var rows = readRows(resp) || [];

                if (rows.length < codes.length) {
                  // Resultado parcial: busca em batches para cobrir todos os códigos.
                  fetchInBatches(codes, function (batchedRows) {
                    updateCache(batchedRows || []);
                    lastSignature = signature;
                    repaintFromCache();

                    inFlight = false;
                    if (pending) refreshColors();
                  });
                } else {
                  updateCache(rows);
                  lastSignature = signature;
                  repaintFromCache();

                  inFlight = false;
                  if (pending) refreshColors();
                }
              })
              .catch(function (err) {
                inFlight = false;
                if (pending) refreshColors();
              });
          }
          
          // Debounce simples: retorna função que adia execução de fn por 'delay' ms.
          function debounce(fn, delay) {
            var timer = null;
            return function () {
              var ctx = this;
              var args = arguments;
              clearTimeout(timer);
              timer = setTimeout(function () {
                fn.apply(ctx, args);
              }, delay);
            };
          }

          // Execução inicial e registro de listeners.
          refreshColors();
          runWsJobsDiagnostics();

          // Listeners: scroll/refresh/datachanged -> atualiza cores com debounce onde aplicável.
          gridView.on('scroll', debounce(refreshColors, 120));
          gridView.on('refresh', refreshColors);
          gridStore.on('datachanged', refreshColors);

          // Handler visual para item click (destaca a linha clicada).
          gridView.on('itemclick', function (view, record, item) {
            var nodes = gridView.getNodes();
            Ext.Array.each(nodes, function (node) {
              node.style.boxShadow = '';
            });
            item.style.boxShadow = 'inset 0 0 0 2px #0000FF';
          });
        }
      }
    };
  }
});
