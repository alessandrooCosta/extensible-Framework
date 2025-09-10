// Define uma classe de extensão para a tela WSWOUP (ou telas similares)
Ext.define("EAM.custom.external_wswoup", {
    // Herdamos os ganchos/utilidades do framework extensível do HxGN EAM
    extend: "EAM.custom.AbstractExtensibleFramework",
  
    // Ponto de entrada obrigatório: retorna o mapa de seletores → handlers
    getSelectors: function () {
      // Prefixo para logs no console (ajuda a filtrar)
      var TAG = 'UDF50:';
      // Helper de log que não explode se console não existir em algum contexto
      var log = function(){ try{ console.log.apply(console, [TAG].concat([].slice.call(arguments))); }catch(e){} };
  
      // ----- UTIL: pega a “Screen” atual do EAM (container raiz da UI da UF) -----
      function getScreen(){ try{ return EAM.Utils.getScreen(); } catch(e){ return null; } }
      // ----- UTIL: pega a aba atual (tab ativa), útil como fallback -----
      function getCurrentTab(){ try{ return EAM.Utils.getCurrentTab(); } catch(e){ return null; } }
  
      // ----- Localiza a aba "listonly" (telas como WSWOUP usam list-only ao invés de LST) -----
      function getListOnlyTab(){
        var s = getScreen();          // obtém a Screen
        var tab = null;
        try {
          // tenta localizar via diferentes formas aceitas pelo EAM (robusto contra skins/versões)
          tab = (s && (s.down('[extensibleFramework] listonly') ||  // dentro do extensibleFramework
                       s.down('listonly') ||                        // por xtype
                       s.down('[tabName=LISTONLY]'))) || null;      // por atributo tabName
        } catch(e){}
        // se não achou, usa a aba atual como último recurso
        return tab || getCurrentTab();
      }
  
      // ----- Dado um container (aba), encontra “alguma grid” ali dentro -----
      function getAnyGrid(scope){
        if (!scope) return null;
        // preferimos editablegrid (se houver), senão readonlygrid, e por fim grid genérica
        return scope.down('editablegrid') || scope.down('readonlygrid') || scope.down('gridpanel') || scope.down('grid') || null;
      }
  
      // ----- Encontra a grid que está sendo exibida na área list-only -----
      function getListGrid(){
        var tab = getListOnlyTab();             // acha a aba listonly
        return getAnyGrid(tab) || getAnyGrid(getScreen());  // tenta dentro da aba e depois na tela inteira
      }
  
      // ----- Garante que o Model do Store possua o campo udfchar50 -----
      function ensureModelField(grid){
        var store = grid && grid.getStore && grid.getStore();        // obtém store da grid
        var model = store && store.getModel && store.getModel();     // obtém model do store
        // se o model existe e não tem o campo udfchar50, adiciona dinamicamente
        if (model && model.getField && !model.getField('udfchar50') && model.addFields){
          model.addFields([{ name: 'udfchar50', type: 'string' }]);
          log('field added to model: udfchar50');
        }
      }
  
      // ----- Garante que a grid tenha o plugin de edição por célula (necessário p/ editar) -----
      function ensureCellEditing(grid){
        // se não existe cellediting ainda, adiciona com 1 clique para editar
        if (grid && grid.findPlugin && !grid.findPlugin('cellediting') && grid.addPlugin){
          grid.addPlugin({ ptype: 'cellediting', clicksToEdit: 1 });
          log('cellediting enabled');
        }
      }
  
      // ----- Aplica limite de 8 caracteres à coluna (exibição e edição) -----
      function applyLimitToColumn(col){
        // renderer: controla a exibição na célula (corta a string na renderização)
        col.renderer = function (v) {
          if (v == null) return '';                  // trata nulos/undefined
          v = String(v);                             // garante string
          return v.length > 8 ? v.substring(0, 8) : v;  // exibe no máx. 8 chars
        };
  
        // editor: impede digitar mais que 8 no campo (UI)
        var editorCfg = { xtype: 'textfield', allowBlank: true, selectOnFocus: true, maxLength: 8, enforceMaxLength: true };
        if (!col.editor) {
          // se a coluna ainda não tem editor, define um
          if (col.setEditor) col.setEditor(editorCfg);
          else col.editor = editorCfg;
        } else {
          // se já tem editor, somente ajusta as props de limite
          Ext.apply(col.editor, { maxLength: 8, enforceMaxLength: true });
          if (col.setEditor) col.setEditor(col.editor);
        }
      }
  
      // ----- Função principal: garante visibilidade+edição da udfchar50 e aplica limite -----
      function addOrEnableUdfEditor(grid, label){
        label = label || 'apply';
        if (!grid) return;
  
        ensureModelField(grid);     // garante o campo no Model
        ensureCellEditing(grid);    // garante o plugin de edição
  
        // procura a coluna udfchar50 em qualquer “lado” (normal/locked) da grid
        var col =
          (grid.down && grid.down('gridcolumn[dataIndex=udfchar50]')) ||
          (grid.normalGrid && grid.normalGrid.down && grid.normalGrid.down('gridcolumn[dataIndex=udfchar50]')) ||
          (grid.lockedGrid && grid.lockedGrid.down && grid.lockedGrid.down('gridcolumn[dataIndex=udfchar50]')) ||
          null;
  
        if (!col) {
          // se a coluna não existe, cria uma configuração mínima (sem mexer em largura/ordem)
          var cfg = {
            xtype: 'gridcolumn',
            text: 'UDF 50',
            dataIndex: 'udfchar50'
          };
          try {
            // acha o header container onde as colunas vivem
            var hdr = (grid.normalGrid && grid.normalGrid.headerCt) || grid.headerCt || (grid.down && grid.down('headercontainer'));
            if (hdr) {
              hdr.add(cfg);                                      // adiciona a coluna
              if (grid.getView && grid.getView().refresh) grid.getView().refresh();  // força repaint
              log(label + ': column inserted');
      
              // re-obtem a referência da coluna recém-criada (para aplicar editor/renderer)
              col = grid.down('gridcolumn[dataIndex=udfchar50]') ||
                    (grid.normalGrid && grid.normalGrid.down && grid.normalGrid.down('gridcolumn[dataIndex=udfchar50]')) ||
                    (grid.lockedGrid && grid.lockedGrid.down && grid.lockedGrid.down('gridcolumn[dataIndex=udfchar50]')) || null;
            }
          } catch(e){ log(label + ': insert failed', e); }
        }
  
        if (!col) return;  // se ainda assim não achou/foi possível criar, aborta
  
        // apenas garante que a coluna fique visível (sem tocar em width, ordem, etc.)
        try { if (col.setHidden) col.setHidden(false); if (col.show) col.show(); } catch(e){}
  
        // aplica o limite de 8 (renderer + editor)
        applyLimitToColumn(col);
        log(label + ': column visible + editable (max 8 chars)');
  
        // reforça o limite também na validação de edição (cobre casos de colar texto longo)
        var plugin = grid.findPlugin && grid.findPlugin('cellediting');
        if (plugin && !plugin._udf50Bound) {
          plugin._udf50Bound = true;  // flag para não registrar duplicado
          plugin.on('validateedit', function(editor, ctx){
            // quando o campo sendo editado for udfchar50 e o valor exceder 8, corta
            if (ctx && ctx.field === 'udfchar50' && typeof ctx.value === 'string' && ctx.value.length > 8) {
              ctx.value = ctx.value.substring(0, 8);
            }
          });
        }
      }
  
      // ----- Amarra a função principal nos eventos de ciclo de vida da grid -----
      function wire(grid){
        if (!grid) return;
        // após a grid renderizar…
        grid.on('afterrender', function(){ addOrEnableUdfEditor(grid, 'afterrender'); });
        // quando a grid é reconfigurada (colunas/loja trocam)…
        grid.on('reconfigure', function(){ addOrEnableUdfEditor(grid, 'reconfigure'); });
        // quando o store carrega dados (lista atualiza)…
        var store = grid.getStore && grid.getStore();
        if (store) store.on('load', function(){ addOrEnableUdfEditor(grid, 'store.load'); });
        // quando a view refresca (por scroll/repintura)…
        var view = grid.getView && grid.getView();
        if (view) view.on('refresh', function(){ addOrEnableUdfEditor(grid, 'view.refresh'); });
      }
  
      // ----- Executa uma vez: encontra a grid, “wire” eventos e aplica a configuração -----
      function runOnce(){
        var grid = getListGrid();                                     // encontra a grid listonly
        if (!grid){ log('grid not found'); return; }                  // se não achou, loga e sai
        log('grid found:', grid.getXType ? grid.getXType() : grid.xtype);
        wire(grid);                                                   // amarra eventos
        addOrEnableUdfEditor(grid, 'init');                           // aplica imediatamente
      }
  
      // ----- Mapa de seletores/handlers que o EAM irá escutar -----
      return {
        // nas telas tipo WSWOUP, a aba de lista é "listonly"
        'listonly': {
          afterrender: runOnce,   // quando a aba renderiza…
          afterlayout: runOnce    // e também após layout (garante desempenho/timing)
        },
        // fallback: quando QUALQUER grid renderiza, verificamos se está dentro da listonly
        'grid': {
          afterrender: function(g){
            var tab = getListOnlyTab();
            if (tab && tab.contains && tab.contains(g)) {
              log('grid inside listonly');
              wire(g);
              addOrEnableUdfEditor(g, 'grid.afterrender');
            }
          }
        },
        // quando o usuário clica no botão Executar (recarrega a lista),
        // aguardamos um pequeno delay e reaplicamos
        'button[action=execute]': {
          click: function(){ setTimeout(runOnce, 500); }
        }
      };
    }
  });
  