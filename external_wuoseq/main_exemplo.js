// Define uma nova classe JavaScript seguindo o padrão do Ext JS
// O nome da classe é "EAM.custom.external_wsfaac"
Ext.define("EAM.custom.external_wsfaac", {
    
  // Especifica que esta classe herda de "EAM.custom.AbstractExtensibleFramework"
  // Isso fornece acesso aos métodos e propriedades da classe pai para customizações EAM
  extend: "EAM.custom.AbstractExtensibleFramework",
  
  // Função obrigatória que retorna os "seletores" (observadores de eventos)
  getSelectors: function () {
      // Retorna um objeto com seletores CSS como chaves e eventos como valores
      return {
          
          // ================================
          // SELETOR PRINCIPAL: Aba de Lista (LST)
          // ================================
          
          // Este seletor observa a aba 'LST' (Lista) dentro do framework extensível
          // [extensibleFramework] = container principal do framework
          // [tabName=LST] = elemento que representa a aba chamada 'LST'
          '[extensibleFramework] [tabName=LST]': {
              
              // Evento que dispara DEPOIS que o layout da aba é renderizado
              // Isso garante que todos os elementos visuais estejam prontos
              afterlayout: function () {
                  
                  // Log no console para debug - indica que o evento foi disparado
                  console.log('WSFAAC: afterlayout triggered for LST tab.');
                  
                  // Obtém a referência da VIEW do grid (componente visual da tabela)
                  // down() busca um componente filho do tipo "readonlygrid"
                  // getView() retorna a parte visual/renderização do grid
                  var gridView = EAM.Utils.getScreen().down("readonlygrid").getView();
                  
                  // Obtém a referência do STORE do grid (dados/modelo da tabela)
                  // getStore() retorna o armazenamento de dados do grid
                  var gridStore = EAM.Utils.getScreen().down("readonlygrid").getStore();
                  
                  // ================================
                  // FUNÇÃO INTERNA: Colorir Lista
                  // ================================
                  
                  // Define uma função para aplicar cores às linhas da tabela
                  function colorlist() {
                      
                      // Loop através de todos os registros no store de dados
                      // data.length retorna o número total de registros
                      for (var i = 0; i < gridStore.data.length; i++) {
                          
                          // Bloco try-catch para capturar erros durante o processamento
                          try {
                              // Obtém o registro (linha de dados) na posição 'i'
                              var record = gridStore.getRecord(i);
                              
                              // Extrai o valor do campo 'eqe_rankingindex' do registro atual
                              // Este campo contém o ranking que determinará a cor
                              var ranking = record.get('eqe_rankingindex');
                              
                              // Obtém o elemento HTML (nó DOM) que representa a linha 'i' na tela
                              var node = gridView.getNode(i);
                              
                              // Verifica se o nó existe (proteção contra elementos não encontrados)
                              if (node) {
                                  // Aplicação das cores baseada no valor do ranking:
                                  
                                  // Se ranking é 'OURO', aplica cor dourada
                                  if (ranking === 'OURO') 
                                      node.style.backgroundColor = 'goldenrod';
                                  
                                  // Se ranking é 'PRATA', aplica cor prata
                                  else if (ranking === 'PRATA') 
                                      node.style.backgroundColor = 'silver';
                                  
                                  // Se ranking é 'BRONZE', aplica cor bronze (hex #cd7f32)
                                  else if (ranking === 'BRONZE') 
                                      node.style.backgroundColor = '#cd7f32';
                                  
                                  // Se ranking é 'N/RANK' (não ranqueado), aplica cinza claro
                                  else if (ranking === 'N/RANK') 
                                      node.style.backgroundColor = 'lightgray';
                                  
                                  // Se não for nenhum dos casos acima, mantém cor padrão (implícito)
                              }
                          } 
                          // Captura qualquer erro que ocorra durante o processamento da linha
                          catch (e) {
                              // Loga o erro no console com informações específicas
                              console.log('Erro ao processar linha ' + i + ': ' + e);
                          }
                      } // Fim do loop for
                  } // Fim da função colorlist
                  
                  // ================================
                  // EXECUÇÃO E EVENTOS DE ATUALIZAÇÃO
                  // ================================
                  
                  // Executa a função de colorir imediatamente após o layout ser criado
                  colorlist();
                  
                  // Adiciona um listener (ouvinte) ao evento 'scroll' do gridView
                  // Sempre que o usuário rolar a tabela, a função colorlist será executada
                  // Isso é necessário porque o Ext JS pode renderizar novas linhas durante o scroll
                  gridView.on('scroll', colorlist);
                  
                  // ================================
                  // ATUALIZAÇÃO PERIÓDICA (TIMER)
                  // ================================
                  
                  // Configura um timer que executa a cada 5000 milissegundos (5 segundos)
                  setInterval(function () {
                      
                      // Verifica se a tela atual ainda é 'WUFAAC'
                      // getUserFunction() retorna o nome da função/tela ativa
                      // Isso evita executar a colorização em telas diferentes
                      if (EAM.Utils.getScreen().getUserFunction() === 'WUFAAC') {
                          
                          // Se estiver na tela correta, executa a colorização
                          // Isso é útil se os dados forem atualizados automaticamente
                          colorlist();
                      }
                      
                  }, 5000); // Intervalo de 5 segundos
                  
              } // Fim da função afterlayout
          } // Fim do seletor da aba LST
      }; // Fim do objeto return
  } // Fim da função getSelectors
}); // Fim da definição da classe