Ext.define("EAM.custom.external_wuoseq", {
    extend: "EAM.custom.AbstractExtensibleFramework",
    getSelectors: function () {
      return {
        '[extensibleFramework] [tabName=LST]': {
          afterlayout: function () {
          console.log('WUOSEQ: afterlayout triggered for LST tab.');
          
          var gridView = EAM.Utils.getScreen().down("readonlygrid").getView();
          var gridStore = EAM.Utils.getScreen().down("readonlygrid").getStore();
          console.log("GridStore: "+gridStore);
          console.log("GridView: "+gridView);
          function colorlist(){
            for(var i = 0; i < gridStore.getCount(); i++){
                try{
                    var record = gridStore.getAt(i);
                    var status = record.get('evt_status');  
                    var node = gridView.getNode(i);
                    console.log("Record:", record.data);
                    console.log("Status:", status);
                    console.log("Node:", node);
                if(node){
                    if(status === 'R'){
                        node.style.backgroundColor = '#CCFFCC';
                    }else if(status === 'C'){
                        node.style.backgroundColor = '#FFCCCC';
                    }else if(status === 'IP'){
                        node.style.backgroundColor = '#CCE5FF';
                    }else if(status === 'Q'){
                        node.style.backgroundColor = '#FFFFCC';
                    }
                }
            }catch(e){
                  console.log('Erro ao processar linha ' + i + ': ' + e);
            }
          }
          }
          colorlist();
          gridView.on('scroll', colorlist);

          gridView.on('itemclick', function(view, record, item) {
            var nodes = gridView.getNodes();
            Ext.Array.each(nodes, function(node) {
              node.style.boxShadow = '';
            });
            item.style.boxShadow = 'inset 0 0 0 2px #0000FF';
          });

          setInterval(function(){
            if(EAM.Utils.getScreen().getUserFunction() === 'WUOSEQ'){
              colorlist();
            }
          }, 200);
        }
      },
    }
  }});
  

 /*
POSSIVEL CODIGO PARA TRAZER CELULA COLORIDA

function colorListAndCells() {
    for(var i = 0; i < gridStore.getCount(); i++) {
        try {
            var record = gridStore.getAt(i);
            var status = record.get('evt_status');  
            var node = gridView.getNode(i);
            
            if(node) {
                // 1. COR DA LINHA (original)
                if(status === 'R'){
                    node.style.backgroundColor = '#CCFFCC';
                }else if(status === 'C'){
                    node.style.backgroundColor = '#FFCCCC';
                }else if(status === 'IP'){
                    node.style.backgroundColor = '#CCE5FF';
                }else if(status === 'Q'){
                    node.style.backgroundColor = '#FFFFCC';
                }
                
                // 2. COR DA CÉLULA ESPECÍFICA
                var cells = node.querySelectorAll('td');
                var columnIndex = 2; // Exemplo: terceira coluna
                
                if (cells[columnIndex]) {
                    // Cores mais fortes/escuras para a célula
                    switch(status) {
                        case 'R': cells[columnIndex].style.backgroundColor = '#99FF99'; break;
                        case 'C': cells[columnIndex].style.backgroundColor = '#FF9999'; break;
                        case 'IP': cells[columnIndex].style.backgroundColor = '#99CCFF'; break;
                        case 'Q': cells[columnIndex].style.backgroundColor = '#FFFF99'; break;
                    }
                    cells[columnIndex].style.fontWeight = 'bold';
                }
            }
        } catch(e) {
            console.log('Erro ao processar linha ' + i + ': ' + e);
        }
    }
}


Resultado Visual:
Cada linha terá:

Cor de fundo da linha (mais clara)

Cor de fundo da célula específica (mais forte/escura)

Texto em negrito na célula específica

Exemplo para status 'R' (Resolved):

Linha: #CCFFCC (verde bem claro)

Célula: #99FF99 (verde mais escuro) + negrito


*/

