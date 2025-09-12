Ext.define("EAM.custom.external_wswoup", {
  extend: "EAM.custom.AbstractExtensibleFramework",

  getSelectors: function () {
    var TAG = 'UDF50:';
    var log = function(){ try{ console.log.apply(console, [TAG].concat([].slice.call(arguments))); }catch(e){} };

    function getScreen(){ try{ return EAM.Utils.getScreen(); } catch(e){ return null; } }
    function getCurrentTab(){ try{ return EAM.Utils.getCurrentTab(); } catch(e){ return null; } }

    function getListOnlyTab(){
      var s = getScreen();
      var tab = null;
      try {
        tab = (s && (s.down('[extensibleFramework] listonly') || s.down('listonly') || s.down('[tabName=LISTONLY]'))) || null;
      } catch(e){}
      return tab || getCurrentTab();
    }

    function getAnyGrid(scope){
      if (!scope) return null;
      return scope.down('editablegrid') || scope.down('readonlygrid') || scope.down('gridpanel') || scope.down('grid') || null;
    }

    function getListGrid(){
      var tab = getListOnlyTab();
      return getAnyGrid(tab) || getAnyGrid(getScreen());
    }

    function ensureModelField(grid){
      var store = grid && grid.getStore && grid.getStore();
      var model = store && store.getModel && store.getModel();
      if (model && model.getField && !model.getField('udfchar50') && model.addFields){
        model.addFields([{ name: 'udfchar50', type: 'string' }]);
        log('field added to model: udfchar50');
      }
    }

    function ensureCellEditing(grid){
      if (grid && grid.findPlugin && !grid.findPlugin('cellediting') && grid.addPlugin){
        grid.addPlugin({ ptype: 'cellediting', clicksToEdit: 1 });
        log('cellediting enabled');
      }
    }

    function findUdfColumn(grid){
      if (!grid) return null;
      return (
        (grid.down && grid.down('gridcolumn[dataIndex=udfchar50]')) ||
        (grid.normalGrid && grid.normalGrid.down && grid.normalGrid.down('gridcolumn[dataIndex=udfchar50]')) ||
        (grid.lockedGrid && grid.lockedGrid.down && grid.lockedGrid.down('gridcolumn[dataIndex=udfchar50]')) ||
        null
      );
    }

    function applyLimitToColumn(col){
      col.renderer = function (v) {
        if (v == null) return '';
        v = String(v);
        return v.length > 8 ? v.substring(0, 8) : v;
      };

      // editor: impede digitar > 8
      var editorCfg = { xtype: 'textfield', allowBlank: true, selectOnFocus: true, maxLength: 8, enforceMaxLength: true };
      if (!col.editor) {
        if (col.setEditor) col.setEditor(editorCfg);
        else col.editor = editorCfg;
      } else {
        // se já existe editor, ajusta
        Ext.apply(col.editor, { maxLength: 8, enforceMaxLength: true });
        if (col.setEditor) col.setEditor(col.editor);
      }
    }

    function addOrEnableUdfEditor(grid, label){
      label = label || 'apply';
      if (!grid) return;

      ensureModelField(grid);
      ensureCellEditing(grid);

      // acha a coluna (normal/locked)
      var col = findUdfColumn(grid);

      if (!col) {
        // cria coluna mínima (sem mexer em width/ordem)
        var cfg = {
          xtype: 'gridcolumn',
          text: 'UDF 50',
          dataIndex: 'udfchar50'
        };
        try {
          var hdr = (grid.normalGrid && grid.normalGrid.headerCt) || grid.headerCt || (grid.down && grid.down('headercontainer'));
          if (hdr) {
            hdr.add(cfg);
            if (grid.getView && grid.getView().refresh) grid.getView().refresh();
            log(label + ': column inserted');
            col = findUdfColumn(grid);
          }
        } catch(e){ log(label + ': insert failed', e); }
      }

      if (!col) return;

      try { if (col.setHidden) col.setHidden(false); if (col.show) col.show(); } catch(e){}

      applyLimitToColumn(col);
      log(label + ': column visible + editable (max 8 chars)');

      var plugin = grid.findPlugin && grid.findPlugin('cellediting');
      if (plugin && !plugin._udf50Bound) {
        plugin._udf50Bound = true;
        plugin.on('validateedit', function(editor, ctx){
          if (ctx && ctx.field === 'udfchar50' && typeof ctx.value === 'string' && ctx.value.length > 8) {
            ctx.value = ctx.value.substring(0, 8);
          }
        });
      }
    }

    function wire(grid){
      if (!grid) return;
      if (grid._udf50Wired) return;
      grid._udf50Wired = true;
      grid.on('afterrender', function(){ addOrEnableUdfEditor(grid, 'afterrender'); });
      grid.on('reconfigure', function(){ addOrEnableUdfEditor(grid, 'reconfigure'); });
      var store = grid.getStore && grid.getStore();
      if (store) store.on('load', function(){ addOrEnableUdfEditor(grid, 'store.load'); });
      var view = grid.getView && grid.getView();
      if (view) view.on('refresh', function(){ addOrEnableUdfEditor(grid, 'view.refresh'); });
    }

    function runOnce(){
      var grid = getListGrid();
      if (!grid){ log('grid not found'); return; }
      log('grid found:', grid.getXType ? grid.getXType() : grid.xtype);
      wire(grid);
      addOrEnableUdfEditor(grid, 'init');
    }

    return {
      'listonly': {
        afterrender: runOnce,
        afterlayout: runOnce
      },
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
      'button[action=execute]': {
        click: function(){ setTimeout(runOnce, 500); }
      }
      };


      /*
      return {
      '[extensibleFramework] [tabName=HDR] [name=reportedby]': {
      















      }
      }
*/
  }
});
