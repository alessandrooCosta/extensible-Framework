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

          setInterval(function(){
            if(EAM.Utils.getScreen().getUserFunction() === 'WUOSEQ'){
              colorlist();
            }
          }, 5000);
        }
      },
    }
  }});
  

  /*

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
                        node.style.backgroundColor = '#E6F4E6';
                    }else if(status === 'C'){
                        node.style.backgroundColor = '#FBEAEA';
                    }else if(status === 'IP'){
                        node.style.backgroundColor = '#E8F1FB';
                    }else if(status === 'Q'){
                        node.style.backgroundColor = '#FFFFE6';
                    }
                }
            }catch(e){
                  console.log('Erro ao processar linha ' + i + ': ' + e);
            }
          }
          }
          colorlist();
          gridView.on('scroll', colorlist);

          setInterval(function(){
            if(EAM.Utils.getScreen().getUserFunction() === 'WUOSEQ'){
              colorlist();
            }
          }, 5000);
        }
      },
    }
  }});
  

  */