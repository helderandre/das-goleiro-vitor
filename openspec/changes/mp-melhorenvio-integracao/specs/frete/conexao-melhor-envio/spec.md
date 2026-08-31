## Purpose

Manter o dashboard conectado à conta Melhor Envio da loja via aplicativo OAuth, com tokens renovados automaticamente e visibilidade do saldo da carteira.

## ADDED Requirements

### Requirement: Conexão por aplicativo OAuth
A integração SHALL usar um aplicativo próprio (Área Dev) com fluxo Authorization Code e apenas os escopos necessários (cotação, carrinho, checkout, geração, impressão, cancelamento, rastreio, pedidos, usuário, transações). O admin SHALL poder conectar, ver o estado da conexão e reautorizar pelo dashboard.

#### Scenario: Primeira conexão
- **WHEN** o admin aciona "Conectar Melhor Envio" e autoriza o aplicativo
- **THEN** os tokens são armazenados no servidor e a página de integrações mostra a conta conectada

### Requirement: Tokens protegidos e renovados automaticamente
Access e refresh tokens SHALL ser armazenados apenas no servidor (nunca expostos ao browser) e renovados automaticamente antes da expiração (access 30 dias, refresh 45 dias), persistindo o novo refresh token a cada renovação. Falha de renovação SHALL gerar alerta visível pedindo reautorização.

#### Scenario: Renovação transparente
- **WHEN** o access token está a menos de 7 dias de expirar
- **THEN** o sistema renova sem intervenção e as chamadas seguintes usam o novo token

#### Scenario: Refresh expirado
- **WHEN** a renovação falha porque o refresh token venceu
- **THEN** o dashboard exibe alerta "reconectar Melhor Envio" e as ações de frete ficam desabilitadas com essa explicação

### Requirement: Requisições identificadas e resilientes
Toda chamada à API do Melhor Envio SHALL enviar `User-Agent` identificando a aplicação e e-mail técnico (o runtime não envia User-Agent por padrão) e os headers JSON exigidos. Resposta 401 `Unauthenticated` SHALL provocar uma renovação seguida de um único retry. O limite de 250 requisições/min MUST ser respeitado.

#### Scenario: Token expirado no meio de um fluxo
- **WHEN** uma chamada retorna 401
- **THEN** o sistema renova o token e repete a chamada uma vez antes de reportar erro

### Requirement: Visibilidade da carteira
A página de integrações SHALL exibir o saldo da Melhor Carteira (saldo, reservado, débitos) e alertar quando o saldo for insuficiente para o custo típico de uma etiqueta, com orientação de recarga.

#### Scenario: Saldo baixo
- **WHEN** o saldo disponível é menor que o valor da próxima etiqueta a gerar
- **THEN** o admin vê o aviso antes de tentar o checkout da etiqueta

### Requirement: Ambientes isolados
Sandbox e produção SHALL ser configurações separadas (URLs, credenciais e tokens distintos); credenciais de um ambiente MUST NOT ser usadas no outro.

#### Scenario: Testes em sandbox
- **WHEN** o ambiente configurado é sandbox
- **THEN** todas as chamadas vão para o host de sandbox e nenhuma etiqueta real é comprada
