// APENAS A MENSAGEM DE ALERTA
Ext.define("EAM.custom.external_ssiuss", {
  extend: "EAM.custom.AbstractExtensibleFramework",

  getSelectors: function () {
    
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

    function getReqValue(){
      var fp = getHdrForm();
      if (!fp || !fp.getFldValue) return null;
      return fp.getFldValue('requisitioncode') || fp.getFldValue('TRA_REQ') || null;
    }

    function showWarning(title, msg){
      Ext.Msg.show({
        title: title || '',
        msg:   msg  || 'Não há nenhuma peça vinculada a esta requisição.',
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
              checkRequisitionAndParts(tab);
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



