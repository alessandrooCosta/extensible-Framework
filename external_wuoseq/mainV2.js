//Este script coloreia as linhas da grade de ordens de serviço na aba "LST" com base no tipo de trabalho (jobtype) obtido da função WSJOBS.

Ext.define("EAM.custom.external_wuoseq", {
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
                filterfields: 'workordernum',  //  Isso pode precisar ser ajustado com base no nome real do campo usado no modelo de dados da grade (WSJOBS). Mas acredito que seja o mesmo
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
          
          function collectCodes() {
            var seen = {};
            var codes = [];

            gridStore.each(function (rec) {
              var c = rec.get('evt_code');
              if (c === undefined || c === null || c === '') c = rec.get('EVT_CODE');
              if (c === undefined || c === null || c === '') return;

              var k = String(c);
              if (!seen[k]) {
                seen[k] = true;
                codes.push(c);
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
          
          
          function clearRowCellsColor(node, maxCells) {
            if (!node) return;

            try {
              var cells = node.querySelectorAll && node.querySelectorAll('td');
              if (!cells || !cells.length) return;

              var limit = Math.min(maxCells, cells.length);
              for (var i = 0; i < limit; i++) {
                var cell = cells[i];
                if (!cell) continue;

                cell.style.removeProperty('background-color');
                var inner = cell.querySelector && cell.querySelector('.x-grid-cell-inner');
                if (inner) inner.style.removeProperty('background-color');
              }
            } catch (e) {}
          }

          function applyRowCellsColor(node, color, maxCells) {
            if (!node || !color) return;

            try {
              var cells = node.querySelectorAll && node.querySelectorAll('td');
              if (!cells || !cells.length) return;

              var limit = Math.min(maxCells, cells.length);
              for (var i = 0; i < limit; i++) {
                var cell = cells[i];
                if (!cell) continue;

                cell.style.setProperty('background-color', color, 'important');
                var inner = cell.querySelector && cell.querySelector('.x-grid-cell-inner');
                if (inner) inner.style.setProperty('background-color', color, 'important');
              }
            } catch (e) {}
          }

          
          function repaintFromCache() {
            var applied = 0;
            var notApplied = 0;
            var maxCellsPerRow = 31;


            for (var i = 0; i < gridStore.getCount(); i++) {
              try {
                var rec = gridStore.getAt(i);
                var code = rec.get('evt_code');
                if (code === undefined || code === null || code === '') code = rec.get('EVT_CODE');

                var node = gridView.getNode(i);
                if (!node) continue;

                clearRowCellsColor(node, maxCellsPerRow);

                var s = findStatus(code);
                var status = norm(s).toUpperCase();
                var color = null;

                if (status === 'PM' || status === 'PPM') color = '#CCFFCC';
                else if (status === 'JOB') color = '#FFCCCC';

                applyRowCellsColor(node, color, maxCellsPerRow);
                
                if (color) applied++;
                else notApplied++;
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
                  window.WUOSEQ_DIAG = {
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
