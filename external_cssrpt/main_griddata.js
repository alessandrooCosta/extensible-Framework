// INFELIZMENTE NÃO ESTÁ FUNCIONANDO. 

Ext.define("EAM.custom.external_cssrpt", {
  extend: "EAM.custom.AbstractExtensibleFramework",

  getSelectors: function () {
    return {
      '[extensibleFramework] [tabName=HDR] [name=udfchar05]': {
        customonblur: function () {
          const vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
          const deptCode = vFormPanel.getFldValue('udfchar05');

          if (!deptCode || deptCode.trim() === '') return;

          const params = {
            filter: Ext.encode([{ property: 'department', operator: '=', value: deptCode.trim() }]),
            fields: 'department,udfchar01',
            limit: 1
          };

          Ext.Ajax.request({
            url: '/rest/grid/Department',
            method: 'GET',
            params: params,
            success: function (response) {
              try {
                const result = Ext.decode(response.responseText);
                console.log("Resposta completa do Grid Data (Department):", result);

                const records = result.data || [];
                if (records.length > 0) {
                  const unidade = records[0].udfchar01;
                  console.log("Unidade retornada:", unidade);

                  if (unidade && unidade.trim() !== '') {
                    vFormPanel.setFldValue('udfchar06', unidade, true);
                  } else {
                    vFormPanel.setFldValue('udfchar06', deptCode.trim(), true);
                  }
                } else {
                  console.warn("Nenhum departamento encontrado.");
                  vFormPanel.setFldValue('udfchar06', deptCode.trim(), true);
                }
              } catch (e) {
                Ext.Msg.alert("Erro", "Erro ao processar a resposta do Grid Data.");
              }
            },
            failure: function () {
              Ext.Msg.alert("Erro", "Erro ao consultar o departamento via Grid Data.");
            }
          });
        }
      },

      '[extensibleFramework] [tabName=HDR] [name=udfchar03], [name=udfchar04], [name=udfchar10]': {
        customonblur: function () {
          const vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();

          const fields = [
            { from: 'udfchar03', to: 'udfchar07' },
            { from: 'udfchar04', to: 'udfchar08' },
            { from: 'udfchar10', to: 'udfchar14' }
          ];

          fields.forEach(function (pair) {
            const value = vFormPanel.getFldValue(pair.from);
            if (!value || value.trim() === '') return;

            const formattedValue = pair.from + value.trim().toLowerCase();

            const params = {
              filter: Ext.encode([
                { property: 'des_entity', operator: '=', value: 'UDLV' },
                { property: 'des_type', operator: '=', value: 'COCT' },
                { property: 'des_code', operator: '=', value: formattedValue },
                { property: 'des_lang', operator: '=', value: 'PT' }
              ]),
              fields: 'translatedtext',
              limit: 1
            };

            Ext.Ajax.request({
              url: '/rest/grid/R5DESCRIPTIONS',
              method: 'GET',
              params: params,
              success: function (response) {
                try {
                  const result = Ext.decode(response.responseText);
                  console.log("Resposta completa do Grid Data (Descriptions):", result);

                  const records = result.data || [];
                  if (records.length > 0 && records[0].translatedtext) {
                    const translated = records[0].translatedtext;
                    vFormPanel.setFldValue(pair.to, translated, true);
                    console.log("Campo " + pair.to + " preenchido com:", translated);
                  } else {
                    console.warn("Sem resultado para o campo: " + pair.from);
                  }
                } catch (e) {
                  console.error("Erro ao processar resposta do Grid Data:", e);
                }
              },
              failure: function () {
                console.error("Falha ao consultar descrição via Grid Data.");
              }
            });
          });
        }
      }
    };
  }
});



// Outra abordagem que não funcionou, mas deixo aqui para referência futura:

/*
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



