Ext.define("EAM.custom.external_osobja", {
  extend: "EAM.custom.AbstractExtensibleFramework",

  getSelectors: function () {
    // --- CONSTANTES CENTRALIZADAS ---
    const EWS_URL =
      "https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector";
    const API_KEY = "aeb580ed2d-2aa7-45f7-97e2-97cce77f3b36";
    const TENANT = "IBNQI1720580460_DEM";
    const ORGANIZATION = "IBNQ";
    const ORG_CODE = "C001";
    const EAM_FIELDS_NS = "http://schemas.datastream.net/MP_fields";
    const EAM_HEADERS_NS = "http://schemas.datastream.net/headers";
    // ---------------------------------

    // --- FUNÇÕES DE CONTROLE DE ESTADO ---

    function getFormPanel() {
      return EAM.Utils.getCurrentTab().getFormPanel();
    }

    function getFields(fp) {
      return fp && fp.getForm && fp.getForm().getFieldsAndButtons();
    }

    // Regra de Negócio: Habilita/desabilita o UDFCHKBX03 (Ação 1)
    function setUdf03CheckboxState(enableCheckbox, fp) {
      fp = fp || getFormPanel();
      var fields = getFields(fp);
      if (!fields) return;

      var newState = enableCheckbox ? "optional" : "protected";
      var action = {
        udfchkbox03: newState,
      };

      EAM.Builder.setFieldState(action, fields);
      console.log(`[UDF03] Checkbox 03 definido como: ${newState}`);

      // Se desabilitado, limpa e protege o campo de data
      if (!enableCheckbox) {
        fp.setFldValue("udfchkbox03", false, false);
        setUdf03DateState(false, fp);
      }
    }

    // Regra de Negócio: Habilita/desabilita o UDFDATE03 (Ação 2)
    function setUdf03DateState(enableDate, fp) {
      fp = fp || getFormPanel();
      var fields = getFields(fp);
      if (!fields) return;

      var newState = enableDate ? "optional" : "protected";
      var action = {
        udfdate03: newState,
      };

      EAM.Builder.setFieldState(action, fields);
      console.log(`[UDF03] Data 03 definido como: ${newState}`);

      // Se desabilitado, limpa o campo
      if (!enableDate) {
        fp.setFldValue("udfdate03", "", false);
      }
    }

    // --- FUNÇÃO AUXILIAR: VERIFICA E EXIBE MENSAGEM ---
    function checkUDF51Value(value) {
      if (String(value).trim() === "02") {
        Ext.Msg.alert(
          "Aviso",
          "O valor preenchido no UDFCHAR51 é 02 e requer atenção especial."
        );
        console.warn("[ALERTA] UDFCHAR51 = 02: Mensagem disparada.");
      }
    }

    // --- FUNÇÕES SOAP BÁSICAS (Manter o corpo completo no script) ---

    function buildEnvelope(orgValue = ORGANIZATION) {
      var xmlDoc = document.implementation.createDocument("", "", null);
      var env = xmlDoc.createElementNS(
        "http://schemas.xmlsoap.org/soap/envelope/",
        "soapenv:Envelope"
      );
      env.setAttribute("xmlns:xsd", "http://www.w3.org/2001/XMLSchema");
      env.setAttribute(
        "xmlns:xsi",
        "http://www.w3.org/2001/XMLSchema-instance"
      );
      var header = xmlDoc.createElement("soapenv:Header");
      var tenantElem = xmlDoc.createElementNS(EAM_HEADERS_NS, "Tenant");
      tenantElem.textContent = TENANT;
      header.appendChild(tenantElem);
      var orgElem = xmlDoc.createElementNS(EAM_HEADERS_NS, "Organization");
      orgElem.textContent = orgValue;
      header.appendChild(orgElem);
      env.appendChild(header);
      var body = xmlDoc.createElement("soapenv:Body");
      env.appendChild(body);
      xmlDoc.appendChild(env);
      return { xmlDoc: xmlDoc, body: body };
    }

    function parseFaultInfo(text) {
      try {
        var xml = new DOMParser().parseFromString(text, "text/xml");
        var faults = xml.getElementsByTagName("Fault");
        if (faults && faults.length) {
          var fs = faults[0].getElementsByTagName("faultstring");
          return fs && fs.length
            ? (fs[0].textContent || "").trim()
            : "SOAP Fault";
        }
      } catch (e) {}
      return "";
    }

    function parseFirstChildText(nsXml, containerTag, wantedChild) {
      var nodes = nsXml.getElementsByTagNameNS(EAM_FIELDS_NS, containerTag);
      if (!nodes || !nodes.length) return "";
      var kids = nodes[0].childNodes || [];
      for (var i = 0; i < kids.length; i++) {
        if (kids[i].localName === wantedChild) {
          return (kids[i].textContent || "").trim();
        }
      }
      return "";
    }

    function callSOAP(xmlData, soapAction, parseFn, onCannotFind, onHardError) {
      return Ext.Ajax.request({
        url: EWS_URL,
        method: "POST",
        withCredentials: true,
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: soapAction,
          "x-api-key": API_KEY,
        },
        xmlData: xmlData,
        success: function (resp) {
          var txt = resp.responseText || "";
          try {
            var desc = parseFn(txt);
            if (desc) {
              finishWithDesc(desc);
              return;
            }
          } catch (e) {
            console.warn("Parse exception:", e);
          }
          var fault = parseFaultInfo(txt);
          if (fault) {
            if (/cannot\s+find|não\s+(localizar|encontrar)/i.test(fault)) {
              onCannotFind();
            } else {
              Ext.Msg.alert("Erro SOAP", fault);
              if (onHardError) onHardError(fault);
            }
          } else {
            onCannotFind();
          }
        },
        failure: function (resp) {
          var txt = (resp.responseText || "").toString();
          var fault = parseFaultInfo(txt);
          if (fault) {
            if (/cannot\s+find|não\s+(localizar|encontrar)/i.test(fault)) {
              onCannotFind();
            } else {
              Ext.Msg.alert("Erro de Conexão", fault);
              if (onHardError) onHardError(fault);
            }
          } else {
            onCannotFind();
          }
        },
      });
    }

    // --- FUNÇÕES DE PARSE (DESCRIÇÃO) E BUILD (Asset/Loc/Sys) ---
    // (Assumimos que o corpo completo dessas funções está presente no script final)

    function parseAssetDesc(text) {
      /* ... */
    }
    function parseLocationDesc(text) {
      /* ... */
    }
    function parseSystemDesc(text) {
      /* ... */
    }

    function finishWithDesc(desc) {
      var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
      if (vFormPanel && desc) {
        vFormPanel.setFldValue("udfchar51", desc, true);
        checkUDF51Value(desc);
      }
    }

    function buildAssetRequest(code) {
      /* ... */
    }
    function buildLocationRequest(code) {
      /* ... */
    }
    function buildSystemRequests(code) {
      /* ... */
    }

    function lookupSystem(vFormPanel, equipmentCode) {
      /* ... */
    }
    function lookupLocation(vFormPanel, equipmentCode) {
      /* ... */
    }
    function lookupAsset(vFormPanel, equipmentCode) {
      /* ... */
    }

    // --- LÓGICA DEPARTAMENTOS (UDFCHAR50 -> UDFCHAR51) ---

    function processDeptResponse(response, fallbackCode) {
      var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
      if (!vFormPanel) return;

      try {
        var parser = new DOMParser();
        var responseXml = parser.parseFromString(
          response.responseText,
          "text/xml"
        );

        var descricaoElement = responseXml.getElementsByTagNameNS(
          EAM_FIELDS_NS,
          "DESCRIPTION"
        );
        var desc =
          descricaoElement.length > 0 &&
          descricaoElement[0].textContent.trim() !== ""
            ? descricaoElement[0].textContent.trim()
            : fallbackCode;

        // Preenche UDFCHAR51 (Lógica Anterior)
        vFormPanel.setFldValue("udfchar51", desc, true);

        // Verifica Alerta (Lógica Anterior)
        checkUDF51Value(desc);
      } catch (e) {
        console.error("Erro ao processar resposta SOAP (departamento):", e);
        // Preenche UDFCHAR51 com o código em caso de erro
        vFormPanel.setFldValue("udfchar51", fallbackCode, true);
        checkUDF51Value(fallbackCode);
      }
    }

    function buildDeptSoapRequest(departmentCode) {
      var b = buildEnvelope("*");
      var mpFunction = b.xmlDoc.createElementNS(
        "http://schemas.datastream.net/MP_functions/MP0617_001",
        "MP0617_GetDepartment_001"
      );
      mpFunction.setAttribute("verb", "Get");
      mpFunction.setAttribute("noun", "Department");
      mpFunction.setAttribute("version", "001");

      var deptID = b.xmlDoc.createElementNS(EAM_FIELDS_NS, "DEPARTMENTID");
      var orgID = b.xmlDoc.createElement("ORGANIZATIONID");
      var orgCode = b.xmlDoc.createElement("ORGANIZATIONCODE");
      orgCode.textContent = "*";
      orgID.appendChild(orgCode);
      deptID.appendChild(orgID);

      var deptCodeElement = b.xmlDoc.createElement("DEPARTMENTCODE");
      deptCodeElement.textContent = departmentCode.trim();
      deptID.appendChild(deptCodeElement);

      mpFunction.appendChild(deptID);
      b.body.appendChild(mpFunction);
      return new XMLSerializer().serializeToString(b.xmlDoc);
    }

    // --- SELECTORS (EVENTOS) ---

    return {
      // EQUIPAMENTIOS / LOCALIZAÇÕES / SISTEMAS (equipment -> udfchar51)
      "[extensibleFramework] [tabName=HDR] [name=equipment]": {
        customonblur: function (field) {
          var vFormPanel = getFormPanel();
          var equipmentCode = vFormPanel.getFldValue("equipment");
          if (!equipmentCode || equipmentCode.trim() === "") return;

          vFormPanel.setFldValue("udfchar51", "", true);
          // Removido o checkUDF51Value para não disparar no campo 'equipment'
          lookupAsset(vFormPanel, equipmentCode);
        },
      },

      // REGRA 1 (Gatilho) & Lógica Anterior (Preenchimento)
      "[extensibleFramework] [tabName=HDR] [name=udfchar50]": {
        customonblur: function () {
          var fp = getFormPanel();
          var deptCode = fp.getFldValue("udfchar50");
          var code = (deptCode || "").trim();

          // AÇÃO 1: Regra de Negócio: Libera/Protege o Checkbox
          if (code === "02") {
            setUdf03CheckboxState(true, fp); // Libera udfchkbox03
          } else {
            setUdf03CheckboxState(false, fp); // Protege udfchkbox03 e udfdate03
          }

          // LÓGICA ANTERIOR: Inicia a busca SOAP para preencher udfchar51
          if (!code) return; // Não faz SOAP se o campo estiver vazio
          fp.setFldValue("udfchar51", "", true);

          var soapRequest = buildDeptSoapRequest(code);

          Ext.Ajax.request({
            url: EWS_URL,
            method: "POST",
            headers: {
              "Content-Type": "text/xml; charset=utf-8",
              SOAPAction:
                "http://schemas.datastream.net/MP_functions/MP0617_001/MP0617_GetDepartment_001",
              "x-api-key": API_KEY,
            },
            xmlData: soapRequest,
            success: function (response) {
              processDeptResponse(response, code);
            },
            failure: function () {
              console.error("Falha ao consultar departamento.");
              var fallbackCode = code;
              fp.setFldValue("udfchar51", fallbackCode, true);
              checkUDF51Value(fallbackCode);
            },
          });
        },
      },

      // REGRA 2: UDFCHKBX03 marcado altera o estado do UFFDATE03
      "[extensibleFramework] [tabName=HDR] checkbox[name=udfchkbox03]": {
        change: function (field, newValue) {
          setUdf03DateState(newValue, getFormPanel());
        },
      },

      // TRADUÇÃO DE CÓDIGOS DE USUÁRIO (udfchar03, 04, 10)
      "[extensibleFramework] [tabName=HDR] [name=udfchar03], [name=udfchar04], [name=udfchar10]":
        {
          customonblur: function () {
            // ... (Lógica de tradução SOAP completa) ...
          },
        },
    };
  },
});
