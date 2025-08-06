
/*  MP0807_GetTrackingData_001, uma função de consulta (Get) via SOAP no HxGN EAM para recuperar dados da entidade TrackingData. */
/*  MP0808_SyncTrackingData_001, uma função SOAP no HxGN EAM usada para inserir ou atualizar registros na entidade TrackingData. */

/*
Alternativas: Grid Data
Se não tiver acesso SOAP, também pode consultar registros TrackingData por Grid Data REST, assim:
*/
Ext.Ajax.request({
    url: '/rest/grid/TRACKINGDATA',
    method: 'GET',
    params: {
      filter: Ext.encode([{ property: 'transcode', operator: '=', value: 'LOGIN' }]),
      fields: 'transid,transcode,createddate,promptdata1,promptdata2',
      limit: 10
    },
    success: function (resp) {
      const data = Ext.decode(resp.responseText).data;
      console.log(data);
    }
  });
  // Apenas um exemplo de como consultar registros TrackingData por Grid Data REST.








