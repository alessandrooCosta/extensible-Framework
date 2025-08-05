Ext.define("EAM.custom.external_cssrpt", {
  extend: "EAM.custom.AbstractExtensibleFramework",

  getSelectors: function () {
    return {
      "[extensibleFramework] [tabName=HDR] [name=udfchar03]": {
        customonblur: function () {
          var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
          var udfChar03Value = vFormPanel.getFldValue("udfchar03");

          console.log("udfchar03Value:", udfChar03Value);

          if (!udfChar03Value || udfChar03Value.trim() === "") {
            console.log("Valor vazio ou nulo, saindo da função");
            return;
          }

          // VERSÃO 1: Formato array indexado
          try {
            console.log("Tentando versão 1 - formato array indexado");
            var response = EAM.Ajax.request({
              url: "GRIDDATA",
              async: false,
              params: {
                USER_FUNCTION_NAME: "CSSRPT",
                SYSTEM_FUNCTION_NAME: "CSSRPT",
                CURRENT_TAB_NAME: "DESCRIPTIONS",
                COMPONENT_INFO_TYPE: "DATA_ONLY",
                "filterfields[0]": "DES_ENTITY",
                "filterfields[1]": "DES_TYPE",
                "filterfields[2]": "DES_CODE",
                "filterfields[3]": "DES_LANG",
                "filteroperator[0]": "=",
                "filteroperator[1]": "=",
                "filteroperator[2]": "=",
                "filteroperator[3]": "=",
                "filtervalue[0]": "UDLV",
                "filtervalue[1]": "COCT",
                "filtervalue[2]": udfChar03Value,
                "filtervalue[3]": "PT",
                returnfields: "DES_TEXT",
              },
            });

            if (response && response.success) {
              this.processResponse(response, vFormPanel);
              return;
            }
          } catch (error) {
            console.error("Erro versão 1:", error);
          }

          // VERSÃO 2: Formato pipe-separated (original)
          try {
            console.log("Tentando versão 2 - formato pipe-separated");
            var response = EAM.Ajax.request({
              url: "GRIDDATA",
              async: false,
              params: {
                USER_FUNCTION_NAME: "CSSRPT",
                SYSTEM_FUNCTION_NAME: "CSSRPT",
                CURRENT_TAB_NAME: "DESCRIPTIONS",
                COMPONENT_INFO_TYPE: "DATA_ONLY",
                filterfields: "DES_ENTITY|DES_TYPE|DES_CODE|DES_LANG",
                filteroperator: "=|=|=|=",
                filtervalue: "UDLV|COCT|" + udfChar03Value + "|PT",
                returnfields: "DES_TEXT",
              },
            });

            if (response && response.success) {
              this.processResponse(response, vFormPanel);
              return;
            }
          } catch (error) {
            console.error("Erro versão 2:", error);
          }

          // VERSÃO 3: Sem filtros de entidade/tipo (mais simples)
          try {
            console.log("Tentando versão 3 - filtro simplificado");
            var response = EAM.Ajax.request({
              url: "GRIDDATA",
              async: false,
              params: {
                USER_FUNCTION_NAME: "CSSRPT",
                SYSTEM_FUNCTION_NAME: "CSSRPT",
                CURRENT_TAB_NAME: "DESCRIPTIONS",
                COMPONENT_INFO_TYPE: "DATA_ONLY",
                "filterfields[0]": "DES_CODE",
                "filteroperator[0]": "=",
                "filtervalue[0]": udfChar03Value,
                returnfields: "DES_TEXT",
              },
            });

            if (response && response.success) {
              this.processResponse(response, vFormPanel);
              return;
            }
          } catch (error) {
            console.error("Erro versão 3:", error);
          }

          console.log("Todas as versões falharam");
        },
      },
    };
  },

  processResponse: function (response, vFormPanel) {
    console.log("Processando resposta bem-sucedida:", response);

    var pageData = response.responseData.pageData;
    var gridResult = pageData?.grid?.GRIDRESULT;
    var gridData = gridResult?.GRID?.DATA;

    console.log("Grid data:", gridData);

    if (gridData && Array.isArray(gridData) && gridData.length > 0) {
      var row = gridData[0];
      console.log("Primeira linha:", row);

      // Tentar diferentes variações do nome do campo
      var descricao = row.des_text || row.DES_TEXT || row.Des_Text;

      console.log("Descrição encontrada:", descricao);

      if (descricao && !Ext.isEmpty(descricao)) {
        vFormPanel.setFldValue("udfchar07", descricao, true);
        console.log("Descrição definida no campo udfchar07:", descricao);
      } else {
        console.log("Descrição vazia ou não encontrada");
      }
    } else {
      console.log("Nenhum dado encontrado no grid");
    }
  },
});

/*
---------------- Codigo de teste com variaveis locais: ----------------

Ext.define("EAM.custom.external_cssrpt", {
  extend: "EAM.custom.AbstractExtensibleFramework",

  getSelectors: function () {
    return {
      "[extensibleFramework] [tabName=HDR] [name=udfchar03]": {
        customonblur: function () {
          var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
          var udfChar03Value = vFormPanel.getFldValue("udfchar03");
          
          console.log("=== SOLUÇÃO COM DADOS LOCAIS ===");
          console.log("udfchar03Value:", udfChar03Value);
          
          if (!udfChar03Value || udfChar03Value.trim() === '') {
            console.log("Valor vazio ou nulo, limpando campo de descrição");
            vFormPanel.setFldValue("udfchar07", "", true);
            return;
          }

          // DICIONÁRIO DE DESCRIÇÕES LOCAIS
          // Substitua estas descrições pelas suas descrições reais
          var localDescriptions = {
            // Formato: "udfchar03" + valor selecionado
            "udfchar031": "Primeira opção - Descrição exemplo 1",
            "udfchar032": "Segunda opção - Descrição exemplo 2", 
            "udfchar033": "Terceira opção - Descrição exemplo 3",
            "udfchar034": "Quarta opção - Descrição exemplo 4",
            "udfchar035": "Quinta opção - Descrição exemplo 5",
            "udfchar036": "Sexta opção - Descrição exemplo 6",
            "udfchar037": "Sétima opção - Descrição exemplo 7",
            "udfchar038": "Oitava opção - Descrição exemplo 8",
            "udfchar039": "Nona opção - Descrição exemplo 9",
            "udfchar0310": "Décima opção - Descrição exemplo 10"
            
            // ADICIONE MAIS OPÇÕES CONFORME NECESSÁRIO:
            // "udfchar0311": "Sua descrição aqui",
            // "udfchar0312": "Sua descrição aqui",
            // etc...
          };
          
          // Construir a chave de busca (concatenando "udfchar03" + valor)
          var searchKey = "udfchar03" + udfChar03Value;
          console.log("Procurando por:", searchKey);
          
          // Buscar a descrição correspondente
          var descricao = localDescriptions[searchKey];
          
          if (descricao && descricao.trim() !== '') {
            // Encontrou a descrição, definir no campo
            vFormPanel.setFldValue("udfchar07", descricao, true);
            console.log("✅ Descrição definida:", descricao);
            
            // Opcional: mostrar mensagem de sucesso (descomente se quiser)
            // EAM.Utils.showMessage("Descrição carregada: " + descricao);
            
          } else {
            // Não encontrou a descrição
            console.log("❌ Descrição não encontrada para:", searchKey);
            
            // Limpar o campo ou definir mensagem padrão
            var mensagemPadrao = "Descrição não encontrada para: " + udfChar03Value;
            vFormPanel.setFldValue("udfchar07", mensagemPadrao, true);
            
            // Opcional: mostrar aviso (descomente se quiser)
            // EAM.Utils.showMessage("Descrição não cadastrada para o valor: " + udfChar03Value, "warning");
          }
          
          // Log para debug: mostrar todas as opções disponíveis
          console.log("Opções disponíveis:", Object.keys(localDescriptions));
        },
      },
    };
  }
});



*/
