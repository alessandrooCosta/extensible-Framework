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
          function colorListAndCells() {
            for(var i = 0; i < gridStore.getCount(); i++) {
                try {
                    var record = gridStore.getAt(i);
                    var status = record.get('evt_status'); 
                    var mrc = record.get('evt_mrc'); 
                    var equipament = record.get('evt_object');
                    var worker = record.get('evt_code');
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

                        var columnIndex = 3;                         
                        if (cells[columnIndex]) {
                            switch(mrc) {
                                case 'MANU': cells[columnIndex].style.backgroundColor = '#99FF99'; break;
                                case '*': cells[columnIndex].style.backgroundColor = '#FF9999'; break;
                                case '03-ELE-ASSET': cells[columnIndex].style.backgroundColor = '#99CCFF'; break;
                            }
                            cells[columnIndex].style.fontWeight = 'bold';
                        }
                        var columnIndex2 = 2; 
                        if(cells[columnIndex2]){
                          switch(equipament) {
                            case 'AA-001': cells[columnIndex2].style.backgroundColor = '#99FF99'; break;
                            case 'FT-038': cells[columnIndex2].style.backgroundColor = '#FF9999'; break;
                            case 'FT-041': cells[columnIndex2].style.backgroundColor = '#99CCFF'; break;
                        }
                        cells[columnIndex2].style.fontWeight = 'bold';
                        }
                        var columnIndex4 = 1; 
                        if(cells[columnIndex4]){
                          switch(worker) {
                            case '10001': cells[columnIndex4].style.backgroundColor = '#99FF99'; break;
                            case '10002': cells[columnIndex4].style.backgroundColor = '#FF9999'; break;
                            case '10004': cells[columnIndex4].style.backgroundColor = '#99CCFF'; break;
                        }
                        cells[columnIndex4].style.fontWeight = 'bold';
                        }
                        
                    }
                } catch(e) {
                    console.log('Erro ao processar linha ' + i + ': ' + e);
                }
            }
        }
        
        colorListAndCells();
          gridView.on('scroll',colorListAndCells);
          gridView.on('itemclick', function(view, record, item) {
            var nodes = gridView.getNodes();
            Ext.Array.each(nodes, function(node) {
              node.style.boxShadow = '';
            });
            item.style.boxShadow = 'inset 0 0 0 2px #0000FF';
          });

          setInterval(function(){
            if(EAM.Utils.getScreen().getUserFunction() === 'WUOSEQ'){
              colorListAndCells();
            }
          }, 200);
        }
      },
    }
  }});
  

 /*
Exatamente! No código atual, você está colorindo a célula **baseado no valor da linha** (campo `evt_status`), não no valor próprio da célula.

Para colorir a célula **baseado no valor dela mesma**, você precisa modificar a abordagem. Aqui estão as opções:

## Opção 1: Colorir por valor específico da célula

```javascript
function colorListAndCells() {
    for(var i = 0; i < gridStore.getCount(); i++) {
        try {
            var record = gridStore.getAt(i);
            var node = gridView.getNode(i);
            
            if(node) {
                var cells = node.querySelectorAll('td');
                var columnIndex = 2; // Terceira coluna
                
                if (cells[columnIndex]) {
                    // Pega o VALOR DA CÉLULA (não da linha)
                    var cellValue = record.get(grid.getColumns()[columnIndex].dataIndex);
                    
                    // Remove estilos anteriores
                    cells[columnIndex].style.backgroundColor = '';
                    cells[columnIndex].style.fontWeight = '';
                    
                    // Aplica cor baseada no VALOR DA CÉLULA
                    switch(cellValue) {
                        case 'Urgente': 
                            cells[columnIndex].style.backgroundColor = '#FF9999';
                            cells[columnIndex].style.fontWeight = 'bold';
                            break;
                        case 'Alta': 
                            cells[columnIndex].style.backgroundColor = '#FFCC99';
                            break;
                        case 'Normal': 
                            cells[columnIndex].style.backgroundColor = '#CCFFCC';
                            break;
                        case 'Concluído': 
                            cells[columnIndex].style.backgroundColor = '#99FF99';
                            cells[columnIndex].style.fontWeight = 'bold';
                            break;
                    }
                }
            }
        } catch(e) {
            console.log('Erro ao processar linha ' + i + ': ' + e);
        }
    }
}
```

## Opção 2: Colorir múltiplas células baseado em seus próprios valores

```javascript
function colorCellsByTheirOwnValues() {
    for(var i = 0; i < gridStore.getCount(); i++) {
        try {
            var record = gridStore.getAt(i);
            var node = gridView.getNode(i);
            
            if(node) {
                var cells = node.querySelectorAll('td');
                
                // Para cada célula na linha
                for(var j = 0; j < cells.length; j++) {
                    var columnDataIndex = grid.getColumns()[j].dataIndex;
                    var cellValue = record.get(columnDataIndex);
                    
                    // Reseta estilos
                    cells[j].style.backgroundColor = '';
                    cells[j].style.fontWeight = '';
                    
                    // Aplica cores baseadas no valor específico de cada célula
                    if (columnDataIndex === 'prioridade') {
                        switch(cellValue) {
                            case 'Alta': cells[j].style.backgroundColor = '#FFCCCC'; break;
                            case 'Média': cells[j].style.backgroundColor = '#FFFFCC'; break;
                            case 'Baixa': cells[j].style.backgroundColor = '#CCFFCC'; break;
                        }
                    }
                    else if (columnDataIndex === 'status') {
                        switch(cellValue) {
                            case 'Atrasado': 
                                cells[j].style.backgroundColor = '#FF9999';
                                cells[j].style.fontWeight = 'bold';
                                break;
                            case 'Concluído': 
                                cells[j].style.backgroundColor = '#99FF99';
                                break;
                        }
                    }
                }
            }
        } catch(e) {
            console.log('Erro ao processar linha ' + i + ': ' + e);
        }
    }
}
```

## Opção 3: Combinar ambos (linha + célula específica)

```javascript
function colorBoth() {
    for(var i = 0; i < gridStore.getCount(); i++) {
        try {
            var record = gridStore.getAt(i);
            var status = record.get('evt_status');  
            var node = gridView.getNode(i);
            
            if(node) {
                // 1. COR DA LINHA (baseado em evt_status)
                if(status === 'R'){
                    node.style.backgroundColor = '#CCFFCC';
                }else if(status === 'C'){
                    node.style.backgroundColor = '#FFCCCC';
                }
                // ... outros status
                
                // 2. COR DA CÉLULA ESPECÍFICA (baseado no valor dela mesma)
                var cells = node.querySelectorAll('td');
                var columnIndex = 2;
                
                if (cells[columnIndex]) {
                    var cellValue = record.get(grid.getColumns()[columnIndex].dataIndex);
                    
                    switch(cellValue) {
                        case 'Urgente': 
                            cells[columnIndex].style.backgroundColor = '#FF6666';
                            cells[columnIndex].style.fontWeight = 'bold';
                            break;
                        case 'Importante': 
                            cells[columnIndex].style.backgroundColor = '#FFCC66';
                            break;
                        // ... outros valores específicos da célula
                    }
                }
            }
        } catch(e) {
            console.log('Erro ao processar linha ' + i + ': ' + e);
        }
    }
}
```

## Pontos importantes:

1. **`grid.getColumns()[columnIndex].dataIndex`** - Pega o nome do campo da coluna
2. **`record.get(dataIndex)`** - Pega o valor ESPECÍFICO da célula
3. **Cada célula pode ter sua própria lógica de formatação**

Agora você pode escolher colorir baseado:
- ✅ **No valor da linha** (como estava fazendo)
- ✅ **No valor da própria célula** 
- ✅ **Em uma combinação de ambos**


 */