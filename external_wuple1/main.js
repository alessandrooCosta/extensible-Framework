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

          function norm(v) {
            return (v === undefined || v === null) ? '' : String(v).trim();
          }

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

          function readRows(resp) {
            var rows = (((resp || {}).responseData || {}).pageData || {}).grid;
            return (((rows || {}).GRIDRESULT || {}).GRID || {}).DATA || [];
          }

          function getCode(rec) {
            return rec.workordernum;
          }

          function getJobtype(rec) {
            return rec.workorderrtype;
          }

          function requestGridData(codes) {
            return EAM.Ajax.request({
              url: 'GRIDDATA',
              params: {
                USER_FUNCTION_NAME: 'WSJOBS',
                SYSTEM_FUNCTION_NAME: 'WSJOBS',
                CURRENT_TAB_NAME: 'LST',
                COMPONENT_INFO_TYPE: 'DATA_ONLY',
                filterfields: 'workordernum',  //  Isso pode precisar ser ajustado com base no nome real do campo usado no modelo de dados da grade (WSJOBS). 
                filteroperator: 'IN',
                filtervalue: codes.join(',')
              }
            });
          }
          
          function asPromise(v) {
            if (v && typeof v.then === 'function') return v;
            return {
              then: function (ok) {
                try { ok(v); } catch (e) {}
                return { catch: function () {} };
              }
            };
          }

          function pad2(n) {
            return n < 10 ? '0' + n : String(n);
          }

          function getWoFieldCandidates(pos) {
            var p = pad2(pos);
            var base = 'evp_wo' + p;
            return [base, base.toUpperCase()];
          }

          function getWoCode(rec, pos) {
            var candidates = getWoFieldCandidates(pos);
            for (var i = 0; i < candidates.length; i++) {
              var v = rec.get(candidates[i]);
              if (norm(v) !== '') return v;
            }
            return '';
          }

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

          function getWoCellIndex(woColumnIndexMap, pos) {
            var key = 'evp_wo' + pad2(pos);
            if (woColumnIndexMap.hasOwnProperty(key)) return woColumnIndexMap[key];
            return -1;
          }
          
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
          
          function findStatus(code) {
            var vars = keyVariants(code);
            for (var i = 0; i < vars.length; i++) {
              if (statusCache.hasOwnProperty(vars[i])) return statusCache[vars[i]];
            }
            return undefined;
          }

          function getOsTypeColor(osType) {
            var type = norm(osType).toUpperCase();

            if (type === 'M01') return '#FF0000'; // MANUTENCAO CORRETIVA EMERGENCIAL
            if (type === 'M02') return '#00B050'; // MANUTENCAO PREVENTIVA PERIODICA
            if (type === 'M03') return '#FFF200'; // MANUTENCAO CORRETIVA PLANEJADA
            if (type === 'M04') return '#D9EAD3'; // MANUTENCAO PREDITIVA PERIODICA
            if (type === 'M05') return '#00B0F0'; // ROTAS DE INSPECAO
            if (type === 'M06') return '#D9B2D9'; // MELHORIAS
            if (type === 'M09') return '#A6A6A6'; // CALIBRAÇÃO
            if (type === 'M10') return '#D97800'; // INFRAESTRUTURA
            // M07, M08 e M11: sem cor
            return null;
          }
          
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
          

          function chunk(arr, size) {
            var out = [];
            for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
            return out;
          }

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

          refreshColors();
          runWsJobsDiagnostics();

          gridView.on('scroll', debounce(refreshColors, 120));
          gridView.on('refresh', refreshColors);
          gridStore.on('datachanged', refreshColors);

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
