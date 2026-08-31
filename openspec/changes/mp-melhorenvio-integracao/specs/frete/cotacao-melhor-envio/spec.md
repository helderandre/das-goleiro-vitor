## Purpose

Cotar frete no Melhor Envio a partir do CEP do cliente e dos produtos físicos do carrinho, e congelar a cotação escolhida no pedido para que o valor cobrado e a etiqueta gerada sejam consistentes.

## ADDED Requirements

### Requirement: Cotação no servidor com dados reais dos produtos
A cotação SHALL ser executada no servidor (token nunca no browser) enviando apenas itens físicos, com dimensões (cm, inteiras), peso (kg) e valor segurado (preço com desconto, 2 casas) vindos do cadastro do produto. Produto físico sem peso/dimensões válidos MUST bloquear a cotação com erro acionável.

#### Scenario: Produto sem dimensões
- **WHEN** um produto físico sem peso cadastrado entra numa cotação
- **THEN** a cotação é recusada e o admin é orientado a completar o cadastro do produto

#### Scenario: Carrinho misto
- **WHEN** o carrinho tem um livro físico e um e-book
- **THEN** apenas o livro entra na cotação

### Requirement: Apresentação dos serviços
O sistema SHALL exibir por serviço: nome + transportadora, preço (`custom_price`) e prazo como faixa em dias úteis (`custom_delivery_range`). Serviços retornados com erro ou sem preço MUST ser filtrados. Serviços e transportadoras SHALL ser identificados por id numérico, nunca por nome.

#### Scenario: Serviço indisponível para o CEP
- **WHEN** a resposta traz PAC com campo de erro e SEDEX com preço
- **THEN** somente SEDEX é oferecido ao cliente

### Requirement: Re-cotação no fechamento e congelamento no pedido
Imediatamente antes de criar a cobrança, o sistema SHALL re-cotar e comparar com o serviço escolhido: se o preço mudou, a nova cotação MUST ser apresentada antes de cobrar. O pedido SHALL persistir o snapshot da cotação escolhida (serviço, transportadora, preço, prazo, pacotes com dimensões/peso, data da cotação), e o total do pedido SHALL ser `subtotal + shipping_cost`.

#### Scenario: Preço mudou entre carrinho e checkout
- **WHEN** o cliente fecha o pedido e a re-cotação retorna preço diferente do exibido
- **THEN** o pedido não é cobrado com o valor antigo; o cliente vê o novo valor para confirmar

#### Scenario: Etiqueta usa a cotação congelada
- **WHEN** o admin gera a etiqueta de um pedido pago
- **THEN** o serviço e os pacotes usados são os do snapshot persistido no pedido

### Requirement: Cache e uso responsável da API
Cotações repetidas com os mesmos parâmetros (CEPs, itens, opções) SHALL ser servidas de cache por até 15 minutos. O fluxo MUST respeitar o limite de requisições da API e o máximo de 100 unidades por item.

#### Scenario: Cliente redigita o mesmo CEP
- **WHEN** a mesma combinação de CEP e itens é cotada de novo dentro de 15 minutos
- **THEN** o resultado vem do cache sem nova chamada à API

### Requirement: Pedidos sem frete
Pedidos compostos apenas por e-books SHALL ser marcados como sem envio (`requires_shipping = false`, `shipping_cost = 0`) e MUST NOT passar por cotação nem por etiqueta.

#### Scenario: Compra de e-book
- **WHEN** um pedido só de e-books é criado
- **THEN** nenhuma cotação é feita e o fluxo de etiqueta fica indisponível para o pedido
