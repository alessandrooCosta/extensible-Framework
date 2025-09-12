Ext.define("EAM.custom.external_ssiuss", {
    extend: "EAM.custom.AbstractExtensibleFramework",
  
    getSelectors: function () {
  
      // ===== helpers / logging =====
      var TAG = 'PRICE:';
      function log(){ try { console.log.apply(console, [TAG].concat([].slice.call(arguments))); } catch(e){} }
      function warn(){ try { console.warn.apply(console, [TAG].concat([].slice.call(arguments))); } catch(e){} }
      function err(){ try { console.error.apply(console, [TAG].concat([].slice.call(arguments))); } catch(e){} }
  
      function getScreen(){
        try{ var s = EAM.Utils.getScreen(); log('getScreen(): OK', s? (s.getXType ? s.getXType() : s.xtype) : null); return s; }
        catch(e){ err('getScreen() FAIL', e); return null; }
      }
  
      function isTRL(tab){
        if (!tab) return false;
        var itemId = tab.itemId || (tab.initialConfig && tab.initialConfig.itemId);
        var title  = tab.title && String(tab.title).toLowerCase();
        var tvn    = tab.tabViewConfig && tab.tabViewConfig.tabName;
        var uft    = tab.tabConfig && tab.tabConfig.uftId;
        var yes = (itemId === 'TRL') || (tvn === 'TRL') || (uft === 'trl') || (title === 'peças');
        log('isTRL?', {itemId, tvn, uft, title, yes});
        return yes;
      }
  
      function getTrlTab(){
        var s = getScreen();
        var t = s && s.down && (s.down('[tabName=TRL]') || s.down('uxtabcontainer[itemId=TRL]')) || null;
        log('getTrlTab():', !!t, t);
        return t;
      }
  
      function getPartsGrid(trlTab){
        var t = trlTab || getTrlTab();
        if (!t || !t.down){ warn('getPartsGrid(): no TRL tab or .down'); return null; }
        var g = t.down('editablegrid') || t.down('readonlygrid') || t.down('gridpanel') || t.down('grid') || null;
        log('getPartsGrid():', g ? (g.getXType ? g.getXType() : g.xtype) : null, g);
        return g;
      }
  
      function getHdrForm(){
        var s = getScreen();
        var hdr = s && s.down && s.down('[tabName=HDR]');
        var fp = hdr && hdr.getFormPanel ? hdr.getFormPanel() : null;
        log('getHdrForm():', !!fp);
        return fp;
      }
  
      function getReqValue(){
        var fp = getHdrForm();
        if (!fp || !fp.getFldValue){ warn('getReqValue(): no form/getFldValue'); return null; }
        var v = fp.getFldValue('requisitioncode') || fp.getFldValue('TRA_REQ') || null;
        log('getReqValue():', v);
        return v;
      }
  
      // ===== mensagem: sem requisicao E sem peças =====
      function checkRequisitionAndParts(trlTab){
        var req = getReqValue();
        if (!Ext.isEmpty(req)) { log('checkMsg: requisicao existe -> ok'); return; }
  
        var grid = getPartsGrid(trlTab);
        if (!grid || !grid.getStore){ warn('checkMsg: no grid/store'); return; }
  
        var store = grid.getStore();
        if (!store){ warn('checkMsg: store null'); return; }
  
        var decide = function(){
          var count = store.getCount();
          log('checkMsg: store loaded. count=', count, 'req=', getReqValue());
          if (count === 0 && Ext.isEmpty(getReqValue())) {
            log('checkMsg: disparando alerta');
            Ext.Msg.alert('Aviso', 'Requisição está vazia.');
          }
        };
  
        if (store.isLoaded && store.isLoaded()) { log('checkMsg: already loaded'); decide(); }
        else {
          log('checkMsg: waiting store.load');
          store.on('load', function(){ log('checkMsg: store load event'); decide(); }, null, { single: true });
        }
      }
  
      // ===== cópia preço → destino no RECORD =====
      function normalize(v){
        var n = parseFloat(v);
        var out = isNaN(n) ? v : n;
        log('normalize:', v, '=>', out);
        return out;
      }
  
      function readPrice(rec){
        if (!rec || !rec.get){ warn('readPrice(): no record/get'); return null; }
        var p1 = rec.get('price');
        var p2 = p1 == null ? rec.get('trl_price') : null;
        var v = (p1 != null) ? p1 : p2;
        log('readPrice(): price=', p1, 'trl_price=', p2, '=>', v);
        return v;
      }
  
      function ensureField(model, name){
        if (!model || !model.getField || !model.addFields){ warn('ensureField(): model ops missing'); return; }
        if (!model.getField(name)){
          log('ensureField(): adding field', name);
          model.addFields([{ name: name, type: 'number', persist: true }]);
        } else {
          log('ensureField(): field exists', name);
        }
      }
  
      function writeDestOnRecord(grid, rec){
        try{
          if (!grid || !rec){ warn('writeDestOnRecord(): no grid/rec'); return; }
  
          var price = readPrice(rec);
          if (price == null){ warn('writeDestOnRecord(): price null'); return; }
  
          var val = normalize(price);
          var store = grid.getStore ? grid.getStore() : null;
          var model = store && store.getModel ? store.getModel() : null;
  
          var curTrl = rec.get('trl_udfnum02');
          var curUDF = rec.get('UDFNUM02');
          var hasTrl = curTrl !== undefined;
          var hasUDF = curUDF !== undefined;
  
          log('writeDestOnRecord(): before set', {curTrl, curUDF, hasTrl, hasUDF});
  
          if (!hasTrl && !hasUDF) {
            log('writeDestOnRecord(): no dest in model -> ensure trl_udfnum02');
            ensureField(model, 'trl_udfnum02');
            hasTrl = true;
          }
  
          if (hasTrl && rec.get('trl_udfnum02') !== val) {
            log('set trl_udfnum02 =', val);
            rec.set('trl_udfnum02', val);
          }
          if (hasUDF && rec.get('UDFNUM02') !== val) {
            log('set UDFNUM02 =', val);
            rec.set('UDFNUM02', val);
          }
  
          log('writeDestOnRecord(): after set', {
            newTrl: rec.get('trl_udfnum02'),
            newUDF: rec.get('UDFNUM02'),
            dirty: rec.dirty,
            modified: rec.modified
          });
        }catch(e){
          err('writeDestOnRecord() exception', e);
        }
      }
  
      function bindSelectionHandlers(trlTab){
        var grid = getPartsGrid(trlTab);
        if (!grid) { warn('bindSelectionHandlers(): grid not found'); return; }
  
        // selectionchange (clique + teclado)
        var sm = grid.getSelectionModel && grid.getSelectionModel();
        if (sm && !sm._PRICE_selBound) {
          sm._PRICE_selBound = true;
          log('bindSelectionHandlers(): binding selectionchange');
          sm.on('selectionchange', function(){
            try{
              var sel = sm.getSelection ? sm.getSelection() : [];
              var rec = sel && sel[0];
              log('selectionchange: rec?', !!rec, rec && rec.data);
              if (!rec) return;
              Ext.defer(function(){ writeDestOnRecord(grid, rec); }, 60);
            }catch(e){ err('selectionchange handler error', e); }
          });
        } else {
          log('bindSelectionHandlers(): selectionchange already bound or no SM');
        }
  
        // itemclick (fallback)
        if (!grid._PRICE_itemBound) {
          grid._PRICE_itemBound = true;
          log('bindSelectionHandlers(): binding itemclick');
          grid.on('itemclick', function(view, rec){
            log('itemclick:', rec && rec.data);
            Ext.defer(function(){ writeDestOnRecord(grid, rec); }, 60);
          });
        }
  
        // se já houver seleção ao entrar
        try{
          var initialSel = sm && sm.getSelection ? sm.getSelection() : [];
          log('initial selection:', initialSel && initialSel.length);
          if (initialSel && initialSel[0]) {
            Ext.defer(function(){ writeDestOnRecord(grid, initialSel[0]); }, 80);
          }
        }catch(e){ err('initial selection check error', e); }
      }
  
      // ===== bootstrap =====
      (function attach(){
        var attempts = 0;
        function tryAttach(){
          attempts++;
          var s = getScreen();
          if (!s) { if (attempts < 60){ log('bootstrap: waiting screen…', attempts); return Ext.defer(tryAttach, 250); } return; }
  
          var tp = (s.down && s.down('tabpanel[isTabView=true]')) || (s.down && s.down('tabpanel')) || null;
          if (!tp) { if (attempts < 60){ log('bootstrap: waiting tabpanel…', attempts); return Ext.defer(tryAttach, 250); } return; }
  
          if (!tp._PRICE_bound) {
            tp._PRICE_bound = true;
            log('bootstrap: binding tabpanel listeners');
  
            var enterTRL = function(tab){
              log('enterTRL(): start');
              Ext.defer(function(){
                checkRequisitionAndParts(tab);    // mensagem
                bindSelectionHandlers(tab);       // cópia preço
              }, 50);
            };
  
            var act = tp.getActiveTab && tp.getActiveTab();
            if (isTRL(act)) { log('bootstrap: active is TRL'); enterTRL(act); }
  
            tp.on('tabchange', function(panel, newTab){
              log('tabpanel tabchange');
              if (isTRL(newTab)) enterTRL(newTab);
            });
          } else {
            log('bootstrap: already bound');
          }
        }
        tryAttach();
      })();
  
      return {};
    }
  });
  