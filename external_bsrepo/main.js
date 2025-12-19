Ext.define("EAM.custom.external_bsrepo", {
  extend: "EAM.custom.AbstractExtensibleFramework",

  getSelectors: function () {
    const TARGET = "WZBWOG";
    const LOG = false;

    const STATE_BY_CODE = {};

    let currentWaitTask = null;

    function log() {
      if (!LOG) return;
      try { console.log.apply(console, ["[BSREPO]"].concat([].slice.call(arguments))); } catch (e) {}
    }

    function getFormPanel() {
      const tab = EAM.Utils.getCurrentTab && EAM.Utils.getCurrentTab();
      return tab && tab.getFormPanel && tab.getFormPanel();
    }

    function getDetailCode(fp) {
      try {
        const form = fp.getForm && fp.getForm();
        const rec = form && form.getRecord && form.getRecord();
        if (!rec || !rec.get) return "";
        return String(rec.get("reportname") || rec.get("PKID") || rec.get("pkid") || "")
          .trim()
          .toUpperCase();
      } catch (e) {
        return "";
      }
    }

    function getFilenameField(fp) {
      return fp.query("field[name=filename]")[0] || null;
    }

    function getFilenameFieldset(fp, filenameField) {
      return filenameField.up("fieldset") || null;
    }

    function enableAncestors(field, stopAt) {
      let p = field && field.ownerCt;
      while (p && p !== stopAt) {
        if (p.disabled === true && p.setDisabled) p.setDisabled(false);
        p = p.ownerCt;
      }
    }

    function captureState(fp, code) {
      if (!code) return;
      if (STATE_BY_CODE[code]) return;

      const f = getFilenameField(fp);
      if (!f) return;

      const fs = getFilenameFieldset(fp, f);

      STATE_BY_CODE[code] = {
        fieldsetDisabled: fs ? !!fs.disabled : null,
        filenameDisabled: !!f.disabled,
        filenameReadOnly: !!f.readOnly
      };

      log("captureState:", code, STATE_BY_CODE[code]);
    }

    function restoreState(fp, code) {
      if (!code) return;
      const st = STATE_BY_CODE[code];
      if (!st) {
        log("restoreState: sem baseline para", code);
        return;
      }

      const f = getFilenameField(fp);
      if (!f) return;

      const fs = getFilenameFieldset(fp, f);

      if (fs && st.fieldsetDisabled !== null && fs.setDisabled) {
        fs.setDisabled(st.fieldsetDisabled);
      }

      if (f.setDisabled) f.setDisabled(st.filenameDisabled);
      if (f.setReadOnly) f.setReadOnly(st.filenameReadOnly);

      if (f.inputEl && f.inputEl.dom) {
        f.inputEl.dom.disabled = st.filenameDisabled;
        f.inputEl.dom.readOnly = st.filenameReadOnly;
      }

      log("restoreState:", code, st);
    }

    function forceEnableFilename(fp) {
      const f = getFilenameField(fp);
      if (!f) return;

      const code = getDetailCode(fp);
      captureState(fp, code);

      enableAncestors(f, fp);

      if (f.setDisabled) f.setDisabled(false);
      if (f.setReadOnly) f.setReadOnly(false);
      if (f.enable) f.enable();

      if (f.inputEl && f.inputEl.dom) {
        f.inputEl.dom.disabled = false;
        f.inputEl.dom.readOnly = false;
        f.inputEl.dom.removeAttribute("disabled");
        f.inputEl.dom.removeAttribute("readonly");
      }
    }

    function waitDetailAndApply(reason) {
      if (currentWaitTask && currentWaitTask.cancel) currentWaitTask.cancel();

      let tries = 0;
      const max = 60;

      currentWaitTask = new Ext.util.DelayedTask(function tick() {
        tries++;

        const fp = getFormPanel();
        if (!fp) return;

        const code = getDetailCode(fp);
        const f = getFilenameField(fp);

        if (code && code !== "@[EMPTY]" && f) {

          captureState(fp, code);

          [0, 120, 300, 700, 1200].forEach(function (ms) {
            Ext.defer(function () {
              const fp2 = getFormPanel();
              if (!fp2) return;

              const code2 = getDetailCode(fp2);
              if (!code2 || code2 === "@[EMPTY]") return;

              if (code2 === TARGET) {
                forceEnableFilename(fp2);
              } else {
                restoreState(fp2, code2);
              }
            }, ms);
          });

          return;
        }

        if (tries < max) currentWaitTask.delay(200);
      });

      currentWaitTask.delay(0);
    }

    function hookSummaryView() {
      const views = Ext.ComponentQuery.query("dataview");
      let v = null;

      for (let i = 0; i < views.length; i++) {
        const id = views[i].getId && views[i].getId();
        if (id && id.indexOf("uxgridsummaryview-") === 0) {
          v = views[i];
          break;
        }
      }
      if (!v || v.__bsrepoHooked) return;
      v.__bsrepoHooked = true;

      function onPick() {
        waitDetailAndApply("summary.pick");
      }

      v.on("itemclick", onPick);
      v.on("selectionchange", onPick);

      v.on("afterrender", function () {
        const sel = v.itemSelector || ".gsMain";
        if (v.el) {
          v.el.on("click", function (e) {
            if (e.getTarget(sel)) onPick();
          });
        }
      });
    }

    function boot() {
      Ext.defer(hookSummaryView, 200);
      Ext.defer(hookSummaryView, 800);
      Ext.defer(hookSummaryView, 2000);
      Ext.defer(function () { waitDetailAndApply("boot.initial"); }, 300);
    }

    return {
      "[extensibleFramework] [tabName=HDR]": {
        afterrender: function () { boot(); },
        afterloadrecord: function () {
          waitDetailAndApply("HDR.afterloadrecord");
        }
      }
    };
  }
});
