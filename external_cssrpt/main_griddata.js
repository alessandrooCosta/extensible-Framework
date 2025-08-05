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
