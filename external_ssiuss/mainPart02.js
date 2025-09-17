Ext.define("EAM.custom.external_ssiuss", {
    extend: "EAM.custom.AbstractExtensibleFramework",
  
    getSelectors: function () {
      var TAG = "PRICE:";
      function log() { try { console.log.apply(console, [TAG].concat([].slice.call(arguments))); } catch(e){} }
      function err() { try { console.error.apply(console, [TAG].concat([].slice.call(arguments))); } catch(e){} }
  
      // === Helpers ===
      function getScreen(){ try { return EAM.Utils.getScreen(); } catch(e){ return null; } }
  
      function getTrlForm(){
        var s = getScreen();
        var trl = s && s.down && (s.down("[tabName=TRL]") || s.down("uxtabcontainer[itemId=TRL]"));
        var fp  = trl && (trl.getFormPanel ? trl.getFormPanel() : (trl.down && (trl.down("[isFormPanel=true]") || trl.down("formpanel"))));
        return fp || null;
      }
  
      // === Protege campo Preço Sugerido ===
      function protectPriceField(fp){
        try{
          if (!fp || !fp.getForm || !EAM.Builder || !EAM.Builder.setFieldState) return;
          var fields = fp.getForm().getFieldsAndButtons();
          EAM.Builder.setFieldState({ udfnum02: "protected", UDFNUM02: "protected" }, fields);
        }catch(e){ err("protectPriceField", e); }
      }
  
      // === Atualiza Preço no form ===
      function setPriceOnForm(val){
        try{
          var fp = getTrlForm();
          if (!fp || !fp.setFldValue) return;
          protectPriceField(fp);
          if (fp.getFld("udfnum02")) fp.setFldValue("udfnum02", val, true);
          else if (fp.getFld("UDFNUM02")) fp.setFldValue("UDFNUM02", val, true);
          else fp.setFldValue("udfnum02", val, true);
          log("💰 Preço sugerido atualizado:", val);
        }catch(e){ err("setPriceOnForm", e); }
      }
  
      // === Consulta preço médio via SSPART.STO ===
      function fetchPartPrice(partCode){
        log("fetchPartPrice para partCode:", partCode);
  
        Ext.Ajax.request({
          url: "/web/base/SSPART.STO",
          method: "POST",
          params: {
            SYSTEM_FUNCTION_NAME: "SSPART",
            USER_FUNCTION_NAME: "SSPART",
            CURRENT_TAB_NAME: "STO",
            partcode: partCode,
            organization: "TROMB-03",
            storecode: "ALMTROMB",
            storeorg: "TROMB-03",
            pagemode: "view",
            pricelevel: "S",
            PKID: "TROMB-03#ALMTROMB#TROMB-03",
            ONLY_DATA_REQUIRED: true,
            // se necessário, também inclua tenant/eamid vindos do Network
          },
          success: function (response) {
            try {
              var data = Ext.decode(response.responseText);
              log("✅ JSON recebido:", data);
  
              if (data.pageData && data.pageData.values) {
                var price = data.pageData.values.averageprice || "";
                log("💰 Preço médio encontrado:", price);
                setPriceOnForm(price);
              } else {
                log("⚠️ Nenhum preço encontrado para a peça", partCode);
                setPriceOnForm("");
              }
            } catch (e) {
              console.warn("⚠️ Resposta não era JSON, veio HTML:", response.responseText);
            }
          },
          failure: function (resp) {
            err("❌ Erro ao buscar preço:", resp.status, resp.statusText);
          }
        });
      }
  
      // === Observa LOV da peça ===
      function bindPartLovObserver(){
        var fp = getTrlForm();
        if (!fp || !fp.getFld) return;
  
        var fldPart = fp.getFld("part"); // campo LOV da peça
        if (!fldPart || fldPart._PRICE_bound) return;
  
        fldPart._PRICE_bound = true;
        log("Observando campo de Peça (LOV)");
  
        // dispara quando o usuário escolhe algo no LOV
        fldPart.on("select", function(fld, record){
          var partCode = null;
          if (fld.getCodeValue) {
            partCode = fld.getCodeValue();
          } else if (record && record.get) {
            partCode = record.get("partcode");
          } else {
            partCode = fld.getValue();
          }
          log("EVENT: select ->", partCode);
          if (partCode) fetchPartPrice(partCode);
        });
  
        // fallback: se o valor mudar manualmente
        fldPart.on("change", function(fld, newVal){
          var partCode = fld.getCodeValue ? fld.getCodeValue() : newVal;
          log("EVENT: change ->", partCode);
          if (partCode) fetchPartPrice(partCode);
        });
      }
  
      // === Bootstrap ===
      (function attach(){
        var attempts = 0;
        function tryAttach(){
          attempts++;
          var s = getScreen();
          if (!s) { if (attempts < 60){ return Ext.defer(tryAttach, 300); } return; }
  
          var tp = (s.down && s.down("tabpanel[isTabView=true]")) || (s.down && s.down("tabpanel")) || null;
          if (!tp) { if (attempts < 60){ return Ext.defer(tryAttach, 300); } return; }
  
          if (!tp._PRICE_bound){
            tp._PRICE_bound = true;
            log("bootstrap: bind preço sugerido");
  
            var enterTRL = function(tab){
              Ext.defer(function(){
                bindPartLovObserver();
              }, 80);
            };
  
            var act = tp.getActiveTab && tp.getActiveTab();
            if (act && act.tabViewConfig && act.tabViewConfig.tabName === "TRL") enterTRL(act);
  
            tp.on("tabchange", function(panel, newTab){
              if (newTab && newTab.tabViewConfig && newTab.tabViewConfig.tabName === "TRL") enterTRL(newTab);
            });
          }
        }
        tryAttach();
      })();
  
      return {};
    }
  });
  