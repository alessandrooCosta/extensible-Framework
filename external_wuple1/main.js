Ext.define("EAM.custom.external_wuple1", {
  extend: "EAM.custom.AbstractExtensibleFramework",
  getSelectors: function () {
    return { '[extensibleFramework] [tabName=LST]': { afterlayout: initWuple1 } };
  }
});

function initWuple1() {
  var grid;
  try { grid = EAM.Utils.getScreen().down("readonlygrid"); } catch (e) { return; }
  if (!grid || grid._wuple1_initialized) return;
  grid._wuple1_initialized = true;

  var view = grid.getView(), store = grid.getStore();
  if (!view || !store) return;

  var WO_TOTAL = 31, WO_WIDTH = 60, YM_WIDTH = 100, cache = {};
  var busy = false, again = false, sig = "";
  var COLORS = { M01: "#FF0000", M02: "#00B050", M03: "#FFF200", M04: "#D9EAD3", M05: "#00B0F0", M06: "#D9B2D9", M09: "#A6A6A6", M10: "#D97800" };

  function n(v) { return v === undefined || v === null ? "" : String(v).trim(); }
  function p2(i) { return i < 10 ? "0" + i : String(i); }
  function cols() { return view.getGridColumns ? view.getGridColumns() : (grid.headerCt && grid.headerCt.getGridColumns ? grid.headerCt.getGridColumns() : []); }
  function promise(v) { return v && typeof v.then === "function" ? v : { then: function (ok) { try { ok(v); } catch (e) {} return { catch: function () {} }; } }; }
  function readRows(resp) { var r = (((resp || {}).responseData || {}).pageData || {}).grid; return (((r || {}).GRIDRESULT || {}).GRID || {}).DATA || []; }
  function req(codes) {
    return EAM.Ajax.request({
      url: "GRIDDATA",
      params: {
        USER_FUNCTION_NAME: "WSJOBS",
        SYSTEM_FUNCTION_NAME: "WSJOBS",
        CURRENT_TAB_NAME: "LST",
        COMPONENT_INFO_TYPE: "DATA_ONLY",
        filterfields: "workordernum",
        filteroperator: "IN",
        filtervalue: codes.join(",")
      }
    });
  }

  function keyVariants(code) {
    var k = n(code);
    if (!k && k !== "0") return [];
    var out = [k, k.toUpperCase(), k.toLowerCase()], z = k.replace(/^0+/, ""), num = Number(k);
    if (z) out.push(z);
    if (!isNaN(num)) out.push(String(num));
    return out;
  }

  function setCache(code, type) {
    var ks = keyVariants(code);
    for (var i = 0; i < ks.length; i++) cache[ks[i]] = type;
  }

  function getType(code) {
    var ks = keyVariants(code);
    for (var i = 0; i < ks.length; i++) if (cache.hasOwnProperty(ks[i])) return cache[ks[i]];
    return "";
  }

  function woFields(pos) {
    var base = "evp_wo" + p2(pos);
    return pos === 9 ? [base, base.toUpperCase(), "alias_1", "ALIAS_1"] : [base, base.toUpperCase()];
  }

  function woCode(rec, pos) {
    var fs = woFields(pos);
    for (var i = 0; i < fs.length; i++) {
      var v = rec.get(fs[i]);
      if (n(v) !== "") return v;
    }
    return "";
  }

  function colorForType(type) {
    var t = n(type).toUpperCase().substring(0, 3);
    return COLORS[t] || null;
  }

  function styleCell(cell, bg, fg) {
    if (!cell) return;
    if (bg) cell.style.setProperty("background-color", bg, "important"); else cell.style.removeProperty("background-color");
    if (fg) cell.style.setProperty("color", fg, "important"); else cell.style.removeProperty("color");
    var inner = cell.querySelector && cell.querySelector(".x-grid-cell-inner");
    if (!inner) return;
    if (bg) inner.style.setProperty("background-color", bg, "important"); else inner.style.removeProperty("background-color");
    if (fg) inner.style.setProperty("color", fg, "important"); else inner.style.removeProperty("color");
  }

  function paintCell(node, ref, bg, fg) {
    if (!node || !ref) return;
    var cell = ref.columnId ? (node.querySelector && node.querySelector('td[data-columnid="' + ref.columnId + '"]')) : null;
    if (!cell && ref.visibleIndex >= 0) {
      var td = node.querySelectorAll && node.querySelectorAll("td");
      cell = td && td[ref.visibleIndex];
    }
    styleCell(cell, bg, fg);
  }

  function paintRow(node, bg, fg) {
    if (!node) return;
    var cells = node.querySelectorAll && node.querySelectorAll("td");
    if (!cells) return;
    for (var i = 0; i < cells.length; i++) styleCell(cells[i], bg, fg);
  }

  function buildColumnMap() {
    var map = {}, c = cols(), visible = 0;
    for (var i = 0; i < c.length; i++) {
      var col = c[i], hidden = (col && typeof col.isHidden === "function") ? col.isHidden() : !!(col && col.hidden);
      var k = n(col && col.dataIndex).toLowerCase();
      if (k) map[k] = { columnId: (col && typeof col.getItemId === "function") ? col.getItemId() : (col && col.id), visibleIndex: hidden ? -1 : visible };
      if (!hidden) visible++;
    }
    return map;
  }

  function colRef(map, pos) {
    var key = "evp_wo" + p2(pos);
    return map[key] || (pos === 9 ? map.alias_1 : null) || null;
  }

  function applyWidths() {
    var c = cols();
    for (var i = 0; i < c.length; i++) {
      var col = c[i], key = n(col && col.dataIndex).toLowerCase(), w = null;
      if (!key) continue;
      if (key.indexOf("evp_wo") === 0 || key === "alias_1") w = WO_WIDTH;
      else if (key === "evp_year" || key === "evp_month") w = YM_WIDTH;
      if (!w) continue;
      try { if (typeof col.setWidth === "function") col.setWidth(w); else col.width = w; } catch (e) {}
    }
  }

  function collectCodes() {
    var out = [], seen = {};
    store.each(function (rec) {
      for (var pos = 1; pos <= WO_TOTAL; pos++) {
        var code = n(woCode(rec, pos));
        if (!code || seen[code]) continue;
        seen[code] = true;
        out.push(code);
      }
    });
    return out;
  }

  function repaint() {
    var map = buildColumnMap();
    for (var i = 0; i < store.getCount(); i++) {
      var rec = store.getAt(i), node = view.getNode(i);
      if (!node) continue;
      if (n(rec.get("evp_line")) === "99") { paintRow(node, "#000000", "#FFFFFF"); continue; }
      paintRow(node, null, null);
      for (var pos = 1; pos <= WO_TOTAL; pos++) {
        var ref = colRef(map, pos);
        if (!ref || ref.visibleIndex < 0) continue;
        var code = woCode(rec, pos);
        paintCell(node, ref, code ? colorForType(getType(code)) : null, null);
      }
    }
  }

  function fetchAll(codes, done) {
    var out = [], i = 0;
    (function next() {
      if (i >= codes.length) return done(out);
      var part = codes.slice(i, i + 50);
      i += 50;
      promise(req(part)).then(function (resp) { out = out.concat(readRows(resp) || []); next(); }).catch(function () { next(); });
    })();
  }

  function refresh() {
    if (busy) { again = true; return; }
    busy = true; again = false;
    var codes = collectCodes(), nextSig = codes.slice().sort().join("|");
    if (!codes.length || nextSig === sig) {
      repaint();
      busy = false;
      if (again) refresh();
      return;
    }
    fetchAll(codes, function (rows) {
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i] || {};
        if (r.workordernum !== undefined && r.workordernum !== null) setCache(r.workordernum, r.workordertype_display);
      }
      sig = nextSig;
      repaint();
      busy = false;
      if (again) refresh();
    });
  }

  function debounce(fn, ms) {
    var t = null;
    return function () { var ctx = this, a = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(ctx, a); }, ms); };
  }

  applyWidths();
  refresh();
  view.on("scroll", debounce(refresh, 120));
  view.on("refresh", refresh);
  store.on("datachanged", refresh);
  view.on("itemclick", function (v, r, item) {
    Ext.Array.each(view.getNodes(), function (n) { n.style.boxShadow = ""; });
    item.style.boxShadow = "inset 0 0 0 2px #0000FF";
  });
}
