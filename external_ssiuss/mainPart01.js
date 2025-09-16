
Ext.define("EAM.custom.external_ssiuss", {
  extend: "EAM.custom.AbstractExtensibleFramework",

  getSelectors: function () {

    // ===== util/log =====
    var TAG = 'PRICE:';
    function log(){ try { console.log.apply(console, [TAG].concat([].slice.call(arguments))); } catch(e){} }
    function warn(){ try { console.warn.apply(console, [TAG].concat([].slice.call(arguments))); } catch(e){} }

    // ===== helpers de localização =====
    function getScreen(){
      try { return EAM.Utils.getScreen(); } catch(e){ return null; }
    }

    function isTRL(tab){
      if (!tab) return false;
      var itemId = tab.itemId || (tab.initialConfig && tab.initialConfig.itemId);
      var title = tab.title && String(tab.title).toLowerCase();
      var tvn = tab.tabViewConfig && tab.tabViewConfig.tabName;
      var uft = tab.tabConfig && tab.tabConfig.uftId;
      return (itemId === 'TRL') || (tvn === 'TRL') || (uft === 'trl') || (title === 'peças');
    }

    function getTrlTab(){
      var s = getScreen();
      return s && s.down && (s.down('[tabName=TRL]') || s.down('uxtabcontainer[itemId=TRL]')) || null;
    }

    function getPartsGrid(trlTab){
      var t = trlTab || getTrlTab();
      if (!t || !t.down) return null;
      return t.down('editablegrid') || t.down('readonlygrid') || t.down('gridpanel') || t.down('grid') || null;
    }

    function getHdrForm(){
      var s = getScreen();
      var hdr = s && s.down && s.down('[tabName=HDR]');
      return hdr && hdr.getFormPanel ? hdr.getFormPanel() : null;
    }

    // ===== status / campos de cabeçalho =====
    function getReqValue(){
      var fp = getHdrForm();
      if (!fp || !fp.getFldValue) return null;
      return fp.getFldValue('requisitioncode') || fp.getFldValue('TRA_REQ') || null;
    }

    function getStatusLower(){
      var fp = getHdrForm();
      if (!fp || !fp.getFldValue) return '';
      var st = fp.getFldValue('status') || fp.getFldValue('evt_status') || '';
      return String(st).toLowerCase();
    }

    // ===== alerta padrão (ícone nativo do ExtJS/EAM) =====
    function showWarning(title, msg){
      Ext.Msg.show({
        title: title || '',
        msg:   msg   || 'Não há nenhuma peça vinculada a esta requisição.',
        buttons: Ext.Msg.OK,
        icon: Ext.Msg.WARNING
      });
    }

    // ===== mensagem: sem requisição E sem peças =====
    function checkRequisitionAndParts(trlTab){
      var req = getReqValue();
      if (!Ext.isEmpty(req)) return;

      var grid = getPartsGrid(trlTab);
      if (!grid || !grid.getStore) return;
      var store = grid.getStore();
      if (!store) return;

      var decide = function(){
        var count = store.getCount();
        // dispara só quando NÃO há peças e NÃO há requisição
        if (count === 0 && Ext.isEmpty(getReqValue())) {
          showWarning('', 'Não há nenhuma peça vinculada a esta requisição.');
        }
      };

      if (store.isLoaded && store.isLoaded()) { decide(); }
      else { store.on('load', decide, null, { single: true }); }
    }

    // ===== leitura de preço (mantém string original: "0.00", "10.50", etc.) =====
    function isEmpty(v){ return v === null || v === undefined || (typeof v === 'string' && v.trim() === ''); }

    function readPriceRaw(rec){
      if (!rec || !rec.get) return null;
      // Array de campos de preço com prioridade para trl_price
      var cands = ['trl_price', 'price', 'stockprice', 'corevalue'];
      for (var i=0;i<cands.length;i++){
        var raw = rec.get(cands[i]);
        if (!isEmpty(raw)) return raw;
      }
      return null;
    }

    // ===== refletir valor no formulário (UI) sem forçar formatação =====
    function reflectFormUdf(val){
      try{
        var s = getScreen();
        var trl = s && s.down && (s.down('[tabName=TRL]') || s.down('uxtabcontainer[itemId=TRL]'));
        var fp  = trl && (trl.getFormPanel ? trl.getFormPanel() : (trl.down && (trl.down('[isFormPanel=true]') || trl.down('formpanel'))));
        if (!fp || !fp.setFldValue) return;

        // tornar visível/legível mas sem habilitar edição nos aprovados (controlado adiante)
        if (fp.getForm && fp.getForm().getFieldsAndButtons && EAM.Builder && EAM.Builder.setFieldState){
          EAM.Builder.setFieldState({ udfnum02: "protected", UDFNUM02: "protected" }, fp.getForm().getFieldsAndButtons());
        }

        if (fp.getFld && fp.getFld('udfnum02')) fp.setFldValue('udfnum02', val, true);
        else if (fp.getFld && fp.getFld('UDFNUM02')) fp.setFldValue('UDFNUM02', val, true);
        else fp.setFldValue('udfnum02', val, true);
      }catch(e){}
    }

    // ===== controlos de edição conforme status =====
    function setEditabilityByStatus(){
      var fp = getHdrForm();
      if (!fp || !fp.getForm || !EAM.Builder || !EAM.Builder.setFieldState) return;
      var status = getStatusLower();              // 'incompleto' | 'aprovado' | etc.
      var fields = fp.getForm().getFieldsAndButtons();

      if (status === 'aprovado') {
        // bloqueia qualquer edição do campo nos APROVADOS
        EAM.Builder.setFieldState({ udfnum02: "protected", UDFNUM02: "protected" }, fields);
      } else if (status === 'incompleto') {
        // permite editar nos INCOMPLETOS
        EAM.Builder.setFieldState({ udfnum02: "protected", UDFNUM02: "protected" }, fields);
      } else {
        // default conservador: somente leitura
        EAM.Builder.setFieldState({ udfnum02: "protected", UDFNUM02: "protected" }, fields);
      }
    }

    // ===== aplica valor ao registro (somente INCOMPLETO) e sempre reflete no FORM =====
    function applyPriceToDest(grid, rec){
      try{
        if (!grid || !rec) return;

        var raw = readPriceRaw(rec);
        if (raw == null) return;                  // nada a copiar

        // sempre atualiza a UI (form) com a string original (ex.: "0.00")
        reflectFormUdf(raw);

        // Se APROVADO → não altera o record (evita dirty/validação ao sair da tela)
        if (getStatusLower() === 'aprovado') return;

        // Se INCOMPLETO → pode gravar no record (permite salvar)
        var currentLower = rec.get('udfnum02');   // dataIndex no store
        var currentUpper = rec.get('UDFNUM02');
        var hasLower = currentLower !== undefined;
        var hasUpper = currentUpper !== undefined;

        // Se o model não tem o campo, adiciona (lowercase) como string p/ preservar "0.00"
        if (!hasLower && !hasUpper) {
          var store = grid.getStore && grid.getStore();
          var model = store && store.getModel && store.getModel();
          if (model && model.getField && !model.getField('udfnum02') && model.addFields) {
            model.addFields([{ name: 'udfnum02', type: 'string', persist: true }]);
          }
          hasLower = true;
        }

        if (hasLower && rec.get('udfnum02') !== raw) rec.set('udfnum02', raw);
        if (hasUpper && rec.get('UDFNUM02') !== raw) rec.set('UDFNUM02', raw);

      }catch(e){}
    }

    // ===== bind de seleção/clique na grid da TRL (1 clique) =====
    function bindSelectionHandlers(trlTab){
      var grid = getPartsGrid(trlTab);
      if (!grid) return;

      var sm = grid.getSelectionModel && grid.getSelectionModel();

      // selectionchange cobre clique simples e navegação por teclado
      if (sm && !sm._PRICE_selBound) {
        sm._PRICE_selBound = true;
        sm.on('selectionchange', function(){
          try{
            var sel = sm.getSelection ? sm.getSelection() : [];
            var rec = sel && sel[0];
            if (!rec) return;
            // Otimizando o tempo de defer para 100ms
            Ext.defer(function(){ applyPriceToDest(grid, rec); }, 1000);
          }catch(e){}
        });
      }

      // fallback de click (algumas builds disparam 2x em grids bloqueadas)
      if (!grid._PRICE_itemBound) {
        grid._PRICE_itemBound = true;
        grid.on('itemclick', function(view, rec){
          // Otimizando o tempo de defer para 100ms
          Ext.defer(function(){ applyPriceToDest(grid, rec); }, 1000);
        });
      }

      // já havia seleção ao entrar?
      try{
        var initialSel = sm && sm.getSelection ? sm.getSelection() : [];
        if (initialSel && initialSel[0]) {
          // Otimizando o tempo de defer para 100ms
          Ext.defer(function(){ applyPriceToDest(grid, initialSel[0]); }, 1000);
        }
      }catch(e){}
    }

    // ===== bootstrap =====
    (function attach(){
      var attempts = 0;
      function tryAttach(){
        attempts++;
        var s = getScreen();
        if (!s) { if (attempts < 60){ return Ext.defer(tryAttach, 250); } return; }

        var tp = (s.down && s.down('tabpanel[isTabView=true]')) || (s.down && s.down('tabpanel')) || null;
        if (!tp) { if (attempts < 60){ return Ext.defer(tryAttach, 250); } return; }

        if (!tp._PRICE_bound) {
          tp._PRICE_bound = true;

          var enterTRL = function(tab){
            Ext.defer(function(){
              // (1) controle de edição conforme status
              setEditabilityByStatus();
              // (2) alerta se não houver peças e nem requisição
              checkRequisitionAndParts(tab);
              // (3) copiar/espelhar preço (um clique)
              bindSelectionHandlers(tab);
            }, 40);
          };

          // se já estiver em TRL, executa
          var act = tp.getActiveTab && tp.getActiveTab();
          if (isTRL(act)) enterTRL(act);

          // troca de abas
          tp.on('tabchange', function(panel, newTab){
            if (isTRL(newTab)) enterTRL(newTab);
          });
        }
      }
      tryAttach();
    })();

    return {};




  }
});