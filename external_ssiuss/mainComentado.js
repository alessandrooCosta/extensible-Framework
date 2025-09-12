Ext.define("EAM.custom.external_ssiuss", {              // Define uma classe/custom do EAM
    extend: "EAM.custom.AbstractExtensibleFramework",     // Herda o framework extensível (onde o EAM chama getSelectors)
  
    getSelectors: function () {                           // Ponto de entrada do custom (EAM chama isso após carregar o JS)
  
      // === Helpers utilitários ===
      function getScreen(){                               // Obtém a "Screen" (container raiz da UF atual)
        try{ return EAM.Utils.getScreen(); } catch(e){ return null; }
      }
  
      function getFormPanelHDR(){                         // Recupera o form da aba HDR (onde mora o campo de requisição)
        var s = getScreen();
        var hdr = s && s.down && s.down('[tabName=HDR]'); // Procura componente com tabName=HDR
        return hdr && hdr.getFormPanel ? hdr.getFormPanel() : null; // Se achou, retorna o formPanel da HDR
      }
  
      function getReqValue(){                             // Lê o valor da requisição no form da HDR
        var fp = getFormPanelHDR();
        if (!fp || !fp.getFldValue) return null;          // Se não há form/reader, retorna null
        return fp.getFldValue('requisitioncode')          // Tenta pelo nome de campo 1
            || fp.getFldValue('TRA_REQ')                  // Ou nome alternativo 2
            || null;
      }
  
      function isTRL(tab){                                // Determina se um "tab" é a aba TRL (Peças)
        if (!tab) return false;
        var itemId = tab.itemId || (tab.initialConfig && tab.initialConfig.itemId); // Algumas telas usam itemId="TRL"
        var title  = tab.title;                           // Outras expõem apenas o título ("Peças")
        var tvn    = tab.tabViewConfig && tab.tabViewConfig.tabName; // Em telas mais novas, tabViewConfig.tabName="TRL"
        var uft    = tab.tabConfig && tab.tabConfig.uftId;           // Em alguns casos, tabConfig.uftId="trl"
        return (itemId === 'TRL') || (tvn === 'TRL') || (uft === 'trl') ||
               (title && title.toLowerCase() === 'peças'); // Considera “Peças” por título também
      }
  
      function checkAndWarn(){                            // Regras de validação quando entra na TRL
        var req = getReqValue();                          // Lê a requisição da HDR
        if (Ext.isEmpty(req)) {                           // Se estiver vazia/undefined/null/''…
          Ext.Msg.alert('Aviso', 'Requisição está vazia.'); // …mostra alerta para o usuário
        }
      }
  
      // === Bootstrap: liga listeners no tabpanel sem depender de selectors do TRL ===
      (function attachTabpanelListeners(){                // IIFE: executa imediatamente esta função
        var attempts = 0;                                 // Contador de tentativas (para aguardar renderização assíncrona)
  
        function tryAttach(){                             // Tenta localizar o tabpanel e amarrar eventos
          attempts++;
          var screen = getScreen();
          if (!screen) {                                  // Se a tela ainda não está disponível…
            if (attempts < 60) return Ext.defer(tryAttach, 250); // …tenta de novo por até ~15s
            return;                                       // Desiste em último caso
          }
  
          // Procura o tabpanel principal da UF:
          var tp =
            (screen.down && screen.down('tabpanel[isTabView=true]')) || // Preferível: tabpanel marcado como "view"
            (screen.down && screen.down('tabpanel')) ||                 // Fallback: qualquer tabpanel
            null;
  
          if (!tp) {                                       // Se ainda não existe tabpanel (renderizando)…
            if (attempts < 60) return Ext.defer(tryAttach, 250); // …re-tenta depois
            return;                                        // Desiste em último caso
          }
  
          // Checagem inicial: se a aba TRL já estiver ativa ao abrir a tela
          var act = tp.getActiveTab && tp.getActiveTab();  // Aba atualmente ativa
          if (isTRL(act)) Ext.defer(checkAndWarn, 50);     // Se for TRL, valida com pequeno delay (garante valores)
  
          // Evita registrar os mesmos listeners mais de uma vez
          if (!tp._ssiussBound) {
            tp._ssiussBound = true;
  
            // Listener central: quando mudar de aba no tabpanel
            tp.on('tabchange', function(panel, newTab){
              if (isTRL(newTab)) Ext.defer(checkAndWarn, 50); // Entrou na TRL → valida requisição
            });
  
            // (Opcional) Para bloquear a entrada quando vazio, troque por beforetabchange:
            // tp.on('beforetabchange', function(panel, newTab){
            //   if (isTRL(newTab) && Ext.isEmpty(getReqValue())) {
            //     Ext.Msg.alert('Aviso', 'Requisição está vazia.');
            //     return false;                             // Cancela a troca de aba
            //   }
            // });
          }
        }
  
        tryAttach();                                       // Chuta a primeira tentativa (o resto é retry via Ext.defer)
      })();
  
      return {};                                           // Não declaramos “selectors” estáticos aqui (tudo feito no bootstrap)
    }
  });
  