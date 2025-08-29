Ext.define("EAM.custom.external_wusrvo", {
    extend: "EAM.custom.AbstractExtensibleFramework",
    getSelectors: function () {
      return {
        '[extensibleFramework] [tabName=LST]': {
          afterlayout: function () {
          console.log('WUSRVO: afterlayout triggered for LST tab.');
          var gridView = EAM.Utils.getScreen().down("readonlygrid").getView();
          var gridStore = EAM.Utils.getScreen().down("readonlygrid").getStore();
          console.log("GridStore: "+gridStore);
          console.log("GridView: "+gridView);
          function colorlist(){
            for(var i = 0; i < gridStore.getCount(); i++){
                try{
                    var record = gridStore.getAt(i);
                    var status = record.get('ctr_priority');  
                    var node = gridView.getNode(i);
                    console.log("Record:", record.data);
                    console.log("Status:", status);
                    console.log("Node:", node);
                if(node){
                    if(status === '0'){
                        node.style.backgroundColor = '#CCFFCC';
                    }else if(status === '1'){
                        node.style.backgroundColor = '#FFCCCC';
                    }else if(status === '2'){
                        node.style.backgroundColor = '#CCE5FF';
                    }else if(status === '3'){
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
            if(EAM.Utils.getScreen().getUserFunction() === 'WUSRVO'){
              colorlist();
            }
          }, 200);
        }
      },
    }
  }});
  

 