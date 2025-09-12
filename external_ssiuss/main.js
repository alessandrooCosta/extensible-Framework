Ext.define("EAM.custom.external_ssiuss", {
  extend: "EAM.custom.AbstractExtensibleFramework",

  getSelectors: function () {

    function getScreen(){ try{ return EAM.Utils.getScreen(); } catch(e){ return null; } }

    function getFormPanelHDR(){
      var s = getScreen();
      var hdr = s && s.down && s.down('[tabName=HDR]');
      return hdr && hdr.getFormPanel ? hdr.getFormPanel() : null;
    }

    function getReqValue(){
      var fp = getFormPanelHDR();
      if (!fp || !fp.getFldValue) return null;
      return fp.getFldValue('requisitioncode') || fp.getFldValue('TRA_REQ') || null;
    }

    function isTRL(tab){
      if (!tab) return false;
      var itemId = tab.itemId || (tab.initialConfig && tab.initialConfig.itemId);
      var title  = tab.title;
      var tvn    = tab.tabViewConfig && tab.tabViewConfig.tabName;
      var uft    = tab.tabConfig && tab.tabConfig.uftId;
      return (itemId === 'TRL') || (tvn === 'TRL') || (uft === 'trl') || (title && title.toLowerCase() === 'peças');
    }

    // Encontra a grid de peças dentro da aba TRL
    function getPartsGrid(trlTab){
      if (!trlTab || !trlTab.down) return null;
      return trlTab.down('editablegrid') || trlTab.down('readonlygrid') || trlTab.down('gridpanel') || trlTab.down('grid') || null;
    }

    // Lógica principal: se não tem requisição, só alerta quando também não houver peças
    function checkRequisitionAndParts(trlTab){
      var req = getReqValue();
      if (!Ext.isEmpty(req)) return; // tem requisição → nada a fazer

      var grid = getPartsGrid(trlTab);
      if (!grid || !grid.getStore) {
        // Não achou grid de peças; tente um pequeno atraso para a TRL terminar de montar
        return Ext.defer(function(){ fallbackCheck(trlTab); }, 100);
      }

      var store = grid.getStore();
      if (!store) {
        return Ext.defer(function(){ fallbackCheck(trlTab); }, 100);
      }

      // Se já carregou, decide agora
      if (store.isLoaded && store.isLoaded()) {
        if (store.getCount() === 0) {
          Ext.Msg.alert('Aviso', 'Requisição está vazia.');
        }
        return;
      }

      // Se está carregando (ou nunca carregou), decide após o load
      var once = function(){
        store.un('load', once);
        if (store.getCount() === 0 && Ext.isEmpty(getReqValue())) {
          Ext.Msg.alert('Aviso', 'Requisição está vazia.');
        }
      };
      store.on('load', once);
    }

    // Fallback simples: segunda tentativa após pequeno atraso
    function fallbackCheck(trlTab){
      var grid = getPartsGrid(trlTab);
      var store = grid && grid.getStore ? grid.getStore() : null;
      if (!store) {
        // Se ainda assim não conseguimos inspecionar peças, por segurança não alertamos aqui.
        return;
      }
      if (store.isLoaded && store.isLoaded()) {
        if (store.getCount() === 0 && Ext.isEmpty(getReqValue())) {
          Ext.Msg.alert('Aviso', 'Requisição está vazia.');
        }
      } else {
        var once = function(){
          store.un('load', once);
          if (store.getCount() === 0 && Ext.isEmpty(getReqValue())) {
            Ext.Msg.alert('Aviso', 'Requisição está vazia.');
          }
        };
        store.on('load', once);
      }
    }

    (function attachTabpanelListeners(){
      var attempts = 0;
      function tryAttach(){
        attempts++;
        var screen = getScreen();
        if (!screen) {
          if (attempts < 60) return Ext.defer(tryAttach, 250);
          return;
        }

        var tp =
          (screen.down && screen.down('tabpanel[isTabView=true]')) ||
          (screen.down && screen.down('tabpanel')) || null;

        if (!tp) {
          if (attempts < 60) return Ext.defer(tryAttach, 250);
          return;
        }

        var act = tp.getActiveTab && tp.getActiveTab();
        if (isTRL(act)) Ext.defer(function(){ checkRequisitionAndParts(act); }, 50);

        if (!tp._ssiussBound) {
          tp._ssiussBound = true;
          tp.on('tabchange', function(panel, newTab){
            if (isTRL(newTab)) Ext.defer(function(){ checkRequisitionAndParts(newTab); }, 50);
          });

          // // Se preferir bloquear a navegação quando não houver req e não houver peças:
          // tp.on('beforetabchange', function(panel, newTab){
          //   if (!isTRL(newTab)) return true;
          //   var allow = true;
          //   var req = getReqValue();
          //   if (Ext.isEmpty(req)) {
          //     var grid = getPartsGrid(newTab);
          //     var store = grid && grid.getStore ? grid.getStore() : null;
          //     if (store && store.isLoaded && store.isLoaded()) {
          //       if (store.getCount() === 0) {
          //         Ext.Msg.alert('Aviso', 'Requisição está vazia.');
          //         allow = false;
          //       }
          //     }
          //   }
          //   return allow;
          // });
        }
      }
      tryAttach();
    })();

    return {};
  }
});
