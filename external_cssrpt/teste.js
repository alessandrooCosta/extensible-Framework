Ext.define("EAM.custom.external_cssrpt", {
  extend: "EAM.custom.AbstractExtensibleFramework",

  getSelectors: function () {
    // =========================
    // CONFIG
    // =========================
    var TENANT = "IBNQI1720580460_DEM"; // TODO: seu tenant
    var ORG_DEFAULT = "IBNQI";          // TODO: sua organização
    var GRIDDATA_URL = "/eami/griddata"; // normalmente é esse endpoint no EAM Web
    var EWS_URL = "https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector"; // seu conector SOAP

    // Se você criou/tem uma grade que exponha as colunas de API Key:
    // Ex.: grid baseada em R5APIKEYS (ou view), com colunas AKY_USER, AKY_DEFAULT, AKY_GENERATED
    var APIKEY_GRID_ID = "BSIGCC"; // TODO: altere se sua grade tiver outro ID (ex.: "V_APIKEYS_USR")

    // =========================
    // HELPERS
    // =========================
    function getLoggedUserCodeSafe() {
      // Tenta várias formas comuns de achar o usuário logado no EAM
      try {
        if (EAM && EAM.UserProfile && EAM.UserProfile.data && EAM.UserProfile.data.userCode) {
          return EAM.UserProfile.data.userCode;
        }
      } catch (e) { /* ignore */ }
      try {
        if (window.userContext && window.userContext.user && window.userContext.user.code) {
          return window.userContext.user.code;
        }
      } catch (e) { /* ignore */ }
      // Fallback (para testes)
      return "ACOSTA";
    }

    // Busca a API Key do usuário via Grid Data
    function getApiKeyByUser_GridData(userCode, cb) {
      console.log("[GridData] Buscando API Key para usuário:", userCode);

      var params = {
        gridId: APIKEY_GRID_ID,
        page: 1,
        start: 0,
        limit: 5,
        parameters: Ext.encode({
          filter: [
            { property: "AKY_USER", value: userCode } // <- coluna da grade que contém o código do usuário
          ]
        })
      };

      console.log("[GridData] GET", GRIDDATA_URL, "params:", params);

      Ext.Ajax.request({
        url: GRIDDATA_URL,
        method: "GET",
        params: params,
        success: function (resp) {
          console.log("[GridData] 200 OK. Body:", resp.responseText);
          var data;
          try {
            data = Ext.decode(resp.responseText);
          } catch (e) {
            console.error("[GridData] Erro ao decodificar JSON:", e);
            return cb(null);
          }

          if (!data || !data.records || data.records.length === 0) {
            console.warn("[GridData] Nenhum registro retornado para", userCode);
            return cb(null);
          }

          // Pega a primeira linha encontrada:
          var rec = data.records[0] || {};
          // Mapeia as colunas possíveis:
          var apiKey =
            (rec.AKY_DEFAULT && String(rec.AKY_DEFAULT).trim()) ||
            (rec.AKY_GENERATED && String(rec.AKY_GENERATED).trim()) ||
            (rec.APIKEY && String(rec.APIKEY).trim()) ||
            null;

          console.log("[GridData] Linha encontrada:", rec);
          console.log("[GridData] API Key resolvida:", apiKey);

          cb(apiKey || null);
        },
        failure: function (err) {
          console.error("[GridData] Falha no Grid Data:", err);
          cb(null);
        }
      });
    }

    function buildSoapEnvelope_Department(deptCode) {
      // MP0617_GetDepartment_001
      return (
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ` +
        `                  xmlns:xsd="http://www.w3.org/2001/XMLSchema" ` +
        `                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
        `                  xmlns:mp="http://schemas.datastream.net/MP_functions/MP0617_001" ` +
        `                  xmlns:dsf="http://schemas.datastream.net/MP_fields">` +
        `  <soapenv:Header>` +
        `    <Tenant xmlns="http://schemas.datastream.net/headers">${TENANT}</Tenant>` +
        `    <Organization xmlns="http://schemas.datastream.net/headers">${ORG_DEFAULT}</Organization>` +
        `  </soapenv:Header>` +
        `  <soapenv:Body>` +
        `    <mp:MP0617_GetDepartment_001 verb="Get" noun="Department" version="001">` +
        `      <dsf:DEPARTMENTID>` +
        `        <dsf:ORGANIZATIONID>` +
        `          <dsf:ORGANIZATIONCODE>*</dsf:ORGANIZATIONCODE>` +
        `        </dsf:ORGANIZATIONID>` +
        `        <dsf:DEPARTMENTCODE>${Ext.String.htmlEncode(deptCode)}</dsf:DEPARTMENTCODE>` +
        `      </dsf:DEPARTMENTID>` +
        `    </mp:MP0617_GetDepartment_001>` +
        `  </soapenv:Body>` +
        `</soapenv:Envelope>`
      );
    }

    function buildSoapEnvelope_Description(formattedValue) {
      // MP0674_GetDescription_001
      return (
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ` +
        `                  xmlns:xsd="http://www.w3.org/2001/XMLSchema" ` +
        `                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
        `                  xmlns:mp="http://schemas.datastream.net/MP_functions/MP0674_001" ` +
        `                  xmlns:dsf="http://schemas.datastream.net/MP_fields">` +
        `  <soapenv:Header>` +
        `    <Tenant xmlns="http://schemas.datastream.net/headers">${TENANT}</Tenant>` +
        `    <Organization xmlns="http://schemas.datastream.net/headers">*</Organization>` +
        `  </soapenv:Header>` +
        `  <soapenv:Body>` +
        `    <mp:MP0674_GetDescription_001 verb="Get" noun="Description" version="001">` +
        `      <dsf:DESCRIPTIONID>` +
        `        <dsf:ENTITY>UDLV</dsf:ENTITY>` +
        `        <dsf:DESCODE>${Ext.String.htmlEncode(formattedValue)}</dsf:DESCODE>` +
        `        <dsf:ORGANIZATIONID entity="User">` +
        `          <dsf:ORGANIZATIONCODE>*</dsf:ORGANIZATIONCODE>` +
        `        </dsf:ORGANIZATIONID>` +
        `        <dsf:LANGUAGEID>` +
        `          <dsf:LANGUAGECODE>PT</dsf:LANGUAGECODE>` +
        `        </dsf:LANGUAGEID>` +
        `        <dsf:TYPE entity="User">` +
        `          <dsf:TYPECODE>COCT</dsf:TYPECODE>` +
        `        </dsf:TYPE>` +
        `      </dsf:DESCRIPTIONID>` +
        `    </mp:MP0674_GetDescription_001>` +
        `  </soapenv:Body>` +
        `</soapenv:Envelope>`
      );
    }

    function callSoap(envelope, soapAction, apiKey, onOk, onFail) {
      console.log("[SOAP] Enviando para", EWS_URL, "SOAPAction:", soapAction);
      console.log("[SOAP] Envelope:", envelope);

      Ext.Ajax.request({
        url: EWS_URL,
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          "SOAPAction": soapAction,
          "x-api-key": apiKey // <- **API KEY DINÂMICA AQUI**
        },
        xmlData: envelope,
        success: function (resp) {
          console.log("[SOAP] 200 OK. XML:", resp.responseText);
          var xml;
          try {
            xml = new DOMParser().parseFromString(resp.responseText, "text/xml");
          } catch (e) {
            console.error("[SOAP] Falha ao parsear XML:", e);
            return onFail && onFail(e);
          }

          // checa Fault
          var fault = xml.getElementsByTagNameNS("http://schemas.xmlsoap.org/soap/envelope/", "Fault");
          if (fault && fault.length) {
            console.error("[SOAP] Fault encontrado:", resp.responseText);
            return onFail && onFail(new Error("SOAP Fault"));
          }

          onOk && onOk(xml);
        },
        failure: function (err) {
          console.error("[SOAP] Falha HTTP:", err);
          onFail && onFail(err);
        }
      });
    }

    // =========================
    // SELECTORS
    // =========================
    return {
      // 1) UDFCHAR05 -> Busca Departamento, preenche UDFCHAR06
      '[extensibleFramework] [tabName=HDR] [name=udfchar05]': {
        customonblur: function () {
          var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
          var deptCode = vFormPanel.getFldValue("udfchar05");
          if (!deptCode || deptCode.trim() === "") return;

          var userCode = getLoggedUserCodeSafe();
          console.log("[Flow] Usuário logado para GridData:", userCode);

          getApiKeyByUser_GridData(userCode, function (apiKey) {
            if (!apiKey) {
              console.warn("[Flow] API Key não encontrada para usuário", userCode, ". Abortando SOAP do departamento.");
              return;
            }

            var env = buildSoapEnvelope_Department(deptCode.trim());
            callSoap(
              env,
              "http://schemas.datastream.net/MP_functions/MP0617_001/MP0617_GetDepartment_001",
              apiKey,
              function onOk(xml) {
                var ns = "http://schemas.datastream.net/MP_fields";
                // O cliente pediu UDFCHAR06
                var node = xml.getElementsByTagNameNS(ns, "UDFCHAR06");
                var value = (node && node.length && node[0].textContent) ? node[0].textContent.trim() : "";

                console.log("[Dept] UDFCHAR06 retornado:", value);

                if (value) {
                  vFormPanel.setFldValue("udfchar06", value, true);
                } else {
                  // fallback: usa o próprio deptCode
                  vFormPanel.setFldValue("udfchar06", deptCode.trim(), true);
                }
              },
              function onFail() {
                console.error("[Dept] Erro ao consultar departamento.");
              }
            );
          });
        }
      },

      // 2) UDFCHAR03/04/10 -> Busca Descrições, preenche UDFCHAR07/08/14
      '[extensibleFramework] [tabName=HDR] [name=udfchar03], [name=udfchar04], [name=udfchar10]': {
        customonblur: function () {
          var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();

          var fields = [
            { from: "udfchar03", to: "udfchar07" },
            { from: "udfchar04", to: "udfchar08" },
            { from: "udfchar10", to: "udfchar14" }
          ];

          var userCode = getLoggedUserCodeSafe();
          console.log("[Flow] Usuário logado para GridData:", userCode);

          getApiKeyByUser_GridData(userCode, function (apiKey) {
            if (!apiKey) {
              console.warn("[Flow] API Key não encontrada para usuário", userCode, ". Abortando SOAP de descrições.");
              return;
            }

            fields.forEach(function (pair) {
              var srcVal = vFormPanel.getFldValue(pair.from);
              if (!srcVal || String(srcVal).trim() === "") return;

              var formattedValue = pair.from + String(srcVal).trim().toLowerCase();
              console.log("[Desc] formattedValue:", formattedValue, " -> preencher:", pair.to);

              var env = buildSoapEnvelope_Description(formattedValue);

              callSoap(
                env,
                "http://schemas.datastream.net/MP_functions/MP0674_001/MP0674_GetDescription_001",
                apiKey,
                function onOk(xml) {
                  var ns = "http://schemas.datastream.net/MP_fields";
                  var nodes = xml.getElementsByTagNameNS(ns, "TRANSLATEDTEXT");
                  var translated = (nodes && nodes.length && nodes[0].textContent) ? nodes[0].textContent : "";

                  console.log("[Desc] TRANSLATEDTEXT:", translated);

                  if (translated) {
                    vFormPanel.setFldValue(pair.to, translated, true);
                  } else {
                    console.warn("[Desc] Sem texto traduzido para", formattedValue);
                  }
                },
                function onFail() {
                  console.error("[Desc] Erro no SOAP de descrição para", formattedValue);
                }
              );
            });
          });
        }
      }
    };
  }
});
