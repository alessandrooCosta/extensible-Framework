Ext.define("EAM.custom.external_wsfaac", {
    extend: "EAM.custom.AbstractExtensibleFramework",
    getSelectors: function () {
      return {
        '[extensibleFramework] [tabName=LST]': {
          afterlayout: function () {
            console.log('WSFAAC: afterlayout triggered for LST tab.');
  
            var gridView = EAM.Utils.getScreen().down("readonlygrid").getView();
            var gridStore = EAM.Utils.getScreen().down("readonlygrid").getStore();
  
            function colorlist() {
              for (var i = 0; i < gridStore.data.length; i++) {
                try {
                  var record = gridStore.getRecord(i);
                  var ranking = record.get('eqe_rankingindex');
                  var node = gridView.getNode(i);
  
                  if (node) {
                    if (ranking === 'OURO') node.style.backgroundColor = 'goldenrod';
                    else if (ranking === 'PRATA') node.style.backgroundColor = 'silver';
                    else if (ranking === 'BRONZE') node.style.backgroundColor = '#cd7f32';
                    else if (ranking === 'N/RANK') node.style.backgroundColor = 'lightgray';
                  }
                } catch (e) {
                  console.log('Erro ao processar linha ' + i + ': ' + e);
                }
              }
            }
  
            // Executa ao carregar e ao rolar
            colorlist();
            gridView.on('scroll', colorlist);
  
            // Atualiza a cada 5 segundos (se necessário)
            setInterval(function () {
              if (EAM.Utils.getScreen().getUserFunction() === 'WUFAAC') {
                colorlist();
              }
            }, 5000);
          }
        }
      };
    }
  });
  