

Ext.define("EAM.custom.external_ssiuss", {
  extend: "EAM.custom.AbstractExtensibleFramework",

  getSelectors: function () {
    function log(){ try { console.log.apply(console, arguments); } catch(e){} }

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

    function getTrlForm(){
      var s = getScreen();
      var trl = s && s.down && (s.down("[tabName=TRL]") || s.down("uxtabcontainer[itemId=TRL]"));
      return trl && (trl.getFormPanel ? trl.getFormPanel() : trl.down("formpanel")) || null;
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

    function showWarning(title, msg){
      Ext.Msg.show({
        title: title || '',
        msg:   msg   || 'Não há nenhuma peça vinculada a esta requisição.',
        buttons: Ext.Msg.OK,
        icon: Ext.Msg.WARNING
      });
    }

    function checkRequisitionAndParts(trlTab){
      var req = getReqValue();
      if (!Ext.isEmpty(req)) return;

      var grid = getPartsGrid(trlTab);
      if (!grid || !grid.getStore) return;
      var store = grid.getStore();
      if (!store) return;

      var decide = function(){
        var count = store.getCount();
        if (count === 0 && Ext.isEmpty(getReqValue())) {
          showWarning('', 'Não há nenhuma peça vinculada a esta requisição.');
        }
      };

      if (store.isLoaded && store.isLoaded()) { decide(); }
      else { store.on('load', decide, null, { single: true }); }
    }

    function isEmpty(v){ return v === null || v === undefined || (typeof v === 'string' && v.trim() === ''); }

    function readPriceRaw(rec){
      if (!rec || !rec.get) return null;
      var cands = ['trl_price', 'price', 'stockprice', 'corevalue'];
      for (var i=0;i<cands.length;i++){
        var raw = rec.get(cands[i]);
        if (!isEmpty(raw)) return raw;
      }
      return null;
    }

    function reflectFormUdf(val){
      try{
        var s = getScreen();
        var trl = s && s.down && (s.down('[tabName=TRL]') || s.down('uxtabcontainer[itemId=TRL]'));
        var fp  = trl && (trl.getFormPanel ? trl.getFormPanel() : (trl.down && (trl.down('[isFormPanel=true]') || trl.down('formpanel'))));
        if (!fp || !fp.setFldValue) return;

        if (fp.getForm && fp.getForm().getFieldsAndButtons && EAM.Builder && EAM.Builder.setFieldState){
          EAM.Builder.setFieldState({ udfnum02: "optional", UDFNUM02: "optional" }, fp.getForm().getFieldsAndButtons());
        }

        if (fp.getFld && fp.getFld('udfnum02')) fp.setFldValue('udfnum02', val, true);
        else if (fp.getFld && fp.getFld('UDFNUM02')) fp.setFldValue('UDFNUM02', val, true);
        else fp.setFldValue('udfnum02', val, true);
      }catch(e){}
    }

    function setEditabilityByStatus(){
      var fp = getHdrForm();
      if (!fp || !fp.getForm || !EAM.Builder || !EAM.Builder.setFieldState) return;
      var status = getStatusLower();
      var fields = fp.getForm().getFieldsAndButtons();

      if (status === 'aprovado') {
        EAM.Builder.setFieldState({ udfnum02: "protected", UDFNUM02: "protected" }, fields);
      } else if (status === 'incompleto') {
        EAM.Builder.setFieldState({ udfnum02: "optional", UDFNUM02: "optional" }, fields);
      } else {
        EAM.Builder.setFieldState({ udfnum02: "optional", UDFNUM02: "optional" }, fields);
      }
    }

    function applyPriceToDest(grid, rec){
      try{
        if (!grid || !rec) return;
        var valorExistente = rec.get('udfnum02') || rec.get('UDFNUM02');
        if (valorExistente !== undefined) {
          reflectFormUdf(valorExistente);
        }
      }catch(e){}
    }

    function bindSelectionHandlers(trlTab){
      var grid = getPartsGrid(trlTab);
      if (!grid) return;
      var sm = grid.getSelectionModel && grid.getSelectionModel();
      if (sm && !sm._PRICE_selBound) {
        sm._PRICE_selBound = true;
        sm.on('selectionchange', function(){
          try{
            var sel = sm.getSelection ? sm.getSelection() : [];
            var rec = sel && sel[0];
            if (!rec) return;
            Ext.defer(function(){ applyPriceToDest(grid, rec); }, 1000);
          }catch(e){}
        });
      }
      if (!grid._PRICE_itemBound) {
        grid._PRICE_itemBound = true;
        grid.on('itemclick', function(view, rec){
          Ext.defer(function(){ applyPriceToDest(grid, rec); }, 1000);
        });
      }
      try{
        var initialSel = sm && sm.getSelection ? sm.getSelection() : [];
        if (initialSel && initialSel[0]) {
          Ext.defer(function(){ applyPriceToDest(grid, initialSel[0]); }, 1000);
        }
      }catch(e){} 
    }

    function hidePriceField(fp) {
      if (!fp || !fp.getFld) return;
      var fldPreco = fp.getFld("price");
      var fldCurrency = fp.getFld("currencycode");
      if (fldPreco && !fldPreco._PRICE_hidden) {
          var parentPreco = fldPreco.ownerCt;
          if (parentPreco) {
              parentPreco.hide();
          } else {       
              if (fldPreco.el) fldPreco.el.hide();
              if (fldPreco.labelEl) fldPreco.labelEl.hide();
          }
          if (fldCurrency) {
              var parentCurrency = fldCurrency.ownerCt;
              if (parentCurrency) {
                  parentCurrency.hide();
              } else {
                  if (fldCurrency.el) fldCurrency.el.hide();
                  if (fldCurrency.labelEl) fldCurrency.labelEl.hide();
              }
          }
          fldPreco._PRICE_hidden = true;
      }
  }

    function hookPartCopyPrice(fp){
      var fldPart = fp.getFld("part");
      var fldSug = fp.getFld("udfnum02");
      var fldPreco = fp.getFld("price");
      if (!fldPart || !fldSug || !fldPreco) return;
      if (fldPart._PRICE_hooked) return;
      fldPart._PRICE_hooked = true;
      var originalSetValue = fldPart.setValue;
      fldPart.setValue = function(v){
        originalSetValue.apply(this, arguments);
        var checkAttempts = 0;
        var checkAndCopy = function(){
            checkAttempts++;
            var valorSugerido = fldSug.getValue();
            if (valorSugerido === undefined || valorSugerido === null || valorSugerido === '') {
                var precoAtual = fldPreco.getValue();
                if (precoAtual !== undefined && precoAtual !== null) {
                    fldSug.setValue(precoAtual);
                } else if (checkAttempts < 10) {
                    Ext.defer(checkAndCopy, 100);
                }
            }
        };
        Ext.defer(checkAndCopy, 100);
      };
    }

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
              setEditabilityByStatus();
              checkRequisitionAndParts(tab);
              bindSelectionHandlers(tab);
              var trlForm = getTrlForm();
              if (trlForm) {
                hidePriceField(trlForm);  
                hookPartCopyPrice(trlForm);
              }
            }, 40);
          };
          var act = tp.getActiveTab && tp.getActiveTab();
          if (isTRL(act)) enterTRL(act);

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