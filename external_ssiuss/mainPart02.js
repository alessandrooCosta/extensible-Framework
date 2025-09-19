Ext.define("EAM.custom.external_priceCopy", {
  extend: "EAM.custom.AbstractExtensibleFramework",

  getSelectors: function () {

    // === Helpers ===
    function getScreen(){ try { return EAM.Utils.getScreen(); } catch(e){ return null; } }

    function getTrlForm(){
      var s = getScreen();
      var trl = s && s.down && (s.down("[tabName=TRL]") || s.down("uxtabcontainer[itemId=TRL]"));
      return trl && (trl.getFormPanel ? trl.getFormPanel() : trl.down("formpanel")) || null;
    }

    function getHdrForm(){
      var s = getScreen();
      var hdr = s && s.down && s.down("[tabName=HDR]");
      return hdr && hdr.getFormPanel ? hdr.getFormPanel() : null;
    }

    function getStatusLower(){
      var fp = getHdrForm();
      if (!fp || !fp.getFldValue) return "";
      var st = fp.getFldValue("status") || fp.getFldValue("evt_status") || "";
      return String(st).toLowerCase();
    }

    // === Copia preço para Preço Sugerido ===
    function hookPartCopyPrice(fp){
      var fldPart   = fp.getFld("part");
      var fldPreco  = fp.getFld("price");
      var fldSug    = fp.getFld("udfnum02");

      if (!fldPart || !fldPreco || !fldSug) return;
      if (fldPart._PRICE_hooked) return;

      fldPart._PRICE_hooked = true;
      var originalSetValue = fldPart.setValue;

      fldPart.setValue = function(v){
        originalSetValue.apply(this, arguments);

        Ext.defer(function(){
          var precoAtual = fldPreco.getValue();

          // só copia automaticamente se status = incompleto
          if (getStatusLower() === "incompleto" && precoAtual) {
            fldSug.setValue(precoAtual);
          }
        }, 200);
      };
    }

    // === Bootstrap ===
    (function attach(){
      var attempts = 0;
      function tryAttach(){
        attempts++;
        var fp = getTrlForm();
        if (!fp) { if (attempts < 60){ return Ext.defer(tryAttach, 300); } return; }
        hookPartCopyPrice(fp);
      }
      tryAttach();
    })();

    return {};
  }




















  
});
