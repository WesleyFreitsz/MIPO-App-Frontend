# Redesign "Festa Mipo" do MIPO-App-Frontend

Data: 2026-10-23
Referência visual aprovada: [`2026-10-23-redesign-festa-mipo/mockup.html`](2026-10-23-redesign-festa-mipo/mockup.html). Abra no navegador; o topo tem a troca entre claro e escuro, e o fim da página traz os demos de animação. Ela mostra 32 telas e é a fonte da verdade visual: em caso de dúvida, o mockup vale mais que este texto.

## Intenção

O MIPO é o app social do espaço físico da Mipo, uma loja e espaço de jogos de tabuleiro em Londrina (@mipojogos). Hoje o app "tem cara de IA": é minimalista, frio e genérico, e não passa aconchego.

O objetivo é que, ao abrir o app, a pessoa sinta que entrou na Mipo. A referência de sensação é a "casa de vó muito bem arrumada, cheia de cores e texturas" (Gato Preto Cat Café) somada à identidade festiva dos posts da Mipo no Instagram.

O aconchego vem do calor: personagens da Mipo presentes nos momentos certos, cores saturadas da marca, contornos de adesivo, cartões levemente tortos, textos em tom de conversa ("Bora jogar hoje?") e animações com um quê de brinquedo.

## Metas

- **Visual em todo o app:** aplicar a direção "Festa Mipo" (aprovada) a todas as telas de usuário e de admin.
- **Design system único:** tokens de cor, tipografia, espaço, raio, sombra e movimento, mais componentes reutilizáveis. Todas as telas consomem esse sistema.
- **Modo claro e escuro** completos.
- **Animações:** botão adesivo, entrada de cartões, personagens "vivos", check-in com festa, curtir, troca de aba, carregamento.
- **Personagens:** usar os personagens oficiais da Mipo, que estão em `2026-10-23-redesign-festa-mipo/personagens/`.

## Fora de escopo

- Mudar comportamento, fluxos, regras de negócio ou endpoints. O redesign é visual e estrutural de UI. Os fluxos e os dados de cada tela continuam os mesmos de hoje.
- Migrar a navegação para expo-router. Continua React Navigation.
- Criar features novas. Alguns mockups usam dados que talvez a API não exponha (ver "Dados de exemplo").
- Mexer no backend (`MIPO-App-Backend`).

## O que seria fracasso, mesmo funcionando

- Voltar a parecer genérico: cinzas frios tipo Tailwind slate, cartões brancos sem contorno, telas sem personagem.
- Modo escuro cinza e apagado. Ele deve ser uma "noite de jogo" quente, com as cores da Mipo vivas.
- Animações que atrasam a pessoa ou cansam: nada pode bloquear um toque ou demorar mais que ~600 ms.
- Contraste ruim de texto, especialmente sobre amarelo, magenta e lima.

## Estado atual (achados do código)

- Expo 54, RN 0.81, nova arquitetura, React Navigation (stack mais bottom tabs) em `App.tsx`.
- Estilo quase todo em `StyleSheet.create`, com uns 870 hex soltos. `App.tsx`, `HomeScreen` e `LoginScreen` têm cada um seu `THEME`/`COLORS` local.
- `theme/index.ts` existe, mas ninguém importa.
- NativeWind está instalado, mas não está configurado (sem babel/metro/global.css, globs errados) e tem 0 usos de `className`.
- Sem fonte customizada: só a do sistema. Ícones vêm do `lucide-react-native`.
- Animação usa o `Animated` do core. Reanimated não é dependência direta. Existem `AnimatedCard` e `FadeInView`, quase sem uso.
- Telas enormes (Social 55K, ChatDetail 53K, Rooms 47K) e duplicadas (`ProfileScreen` e `PlayerProfileScreen`; modal de evento repetido em Home e EventsList).
- `app.json` força `userInterfaceStyle: "light"`.

## Direção visual

### Paleta (tokens)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `bg` | `#FFF8E7` | `#17111C` | fundo das telas |
| `hero` | `#F6E22D` | `#3A1530` | topo do Início, telas de entrada |
| `surface` | `#FFFFFF` | `#261C2C` | cartões neutros, inputs |
| `surface2` | `#FFF1CC` | `#33263A` | áreas secundárias |
| `sunken` | `#F3E7C9` | `#120D16` | segmented control, skeleton, citações |
| `text` | `#1E1414` | `#FFF3D6` | texto principal |
| `muted` | `#6B5A52` | `#B9A8B8` | texto secundário |
| `line` | `#1E1414` | `#000000` | contorno de adesivo |
| `shadow` | `#1E1414` | `#000000` | sombra deslocada |
| `yellow` | `#F6E22D` | `#F4DB3A` | marca, botão padrão, aba ativa |
| `red` | `#E0262B` | `#F0474B` | ação principal (CTA), logo, badges |
| `pink` | `#E3156B` | `#F0418A` | destaque de evento, perfil |
| `lime` | `#B9D531` | `#C3DD4A` | sucesso, aprovado |
| `teal` | `#7CC8B4` | `#7CC8B4` | apoio, a cor do peão |
| `blue` | `#4A6FD8` | `#7B95F0` | apoio |
| `lilac` | `#C9B6F0` | `#B9A2EE` | apoio, herança do Gato Preto |
| `orange` | `#F59A23` | `#F7A940` | apoio |
| `tab` | `#1E1414` | `#0B070D` | barra de abas |

Regras de cor:
- **Texto sobre amarelo, lima, verde-água, lilás e laranja:** sempre `#1E1414`.
- **Texto sobre magenta e vermelho:** branco.
- **Fundos de tela:** o amarelo `hero` fica só no login, no código de verificação, no check-in e no topo do Início. As telas densas (listas, chat, formulários, admin) usam `bg` creme ou berinjela.
- **No escuro**, os cartões coloridos continuam com as cores da marca e contorno preto. Os cartões neutros ganham um brilho interno sutil no topo, para não sumirem no fundo.

### Tipografia

- **Títulos, botões, números e chips de destaque:** Fredoka (600 e 700). Ela foi identificada a olho a partir dos posts da Mipo e o usuário aprovou o resultado. Se a Mipo tiver o arquivo da fonte oficial, ele substitui a Fredoka.
- **Texto corrido e legendas:** Nunito (600, 700, 800 e 900). Escolha minha, por ser arredondada e combinar com a Fredoka.
- **Escala usada no mockup:** título de tela 26, título de seção 18, título de cartão 15–20, corpo 13, legenda 12, micro 10.5. O builder pode ajustar para a escala do design system, mantendo a hierarquia.
- **Logo "mipo":** no mockup é Fredoka 700 vermelho com sombra deslocada. No app, o ideal é usar o lettering oficial da Mipo como imagem/SVG, se existir. Se não existir, fica como no mockup.

### Forma e profundidade (o "adesivo")

- **Contorno:** 2.5 px na cor `line` em cartões, botões, inputs, chips (2 px), avatares e ícones em caixa.
- **Sombra sólida deslocada:** sem desfoque, offset (4, 4) em cartões, (3, 3) em botões e tiles, (5, 5) em destaques.
- **Raios:** cartão 20, botão e input 14, tile 16, ícone em caixa 12, chip pílula, folha inferior 28.
- **Cartões levemente tortos:** só em capas de jogo e tiles decorativos (±1–2°). Nunca em listas ou formulários.
- **Texturas:** fundo pontilhado no chat. Os mockups A e C, com papel e feltro, foram descartados.

### Componentes (do mockup)

Botão (amarelo, vermelho, magenta, ghost, `sm`, `block`), Chip (neutro, ativo e cores), Cartão (neutro e coloridos, `flat` sem sombra), Input, Label de formulário, Segmented control, Avatar (iniciais, cor, ponto de online, grande), pilha de avatares, Ícone em caixa, Tile de jogo, Bloco de data (dia da semana mais número), Balão de chat (meu e deles), Badge de contagem, Barra de abas flutuante, Top bar com voltar redondo, Folha inferior (bottom sheet), FAB, Checkbox, Stepper, campo de código de 6 dígitos, Skeleton, Estado vazio, Estado de erro, Personagem (ver abaixo).

### Personagens

São 47 PNGs (2000×2000, fundo transparente) em `personagens/`, com nome `pN.png` (N = número da "Prancheta N" original). A maioria tem bastante margem vazia. Os peões (34–47) ocupam só ~35% do quadro, e no mockup são ampliados 2.7×; os demais, 1.25×.

| Personagem | Arquivos | Onde usar |
|---|---|---|
| Celular | p1–p5 (p5 de tela apagada) | Avisos (cabeçalho), estado vazio de avisos (p5), prévia de push no admin |
| Moeda | p6–p10 | Saldo de moedas, recompensas, "+20 moedas" |
| Monstrinho alado | p11–p15 | Login (p12, braços abertos), demos |
| Quebra-cabeças | p16–p21 (p16 e p21 em dupla) | Amizade, pedidos de amizade, "em comum" no perfil |
| Dado | p22–p24 | Eventos, check-in (p22 pulando) |
| Poção | p25–p27 | Conquistas, apresentação do painel admin (p26) |
| Troféu | p28–p33 | Conquistas, vitória no feed |
| Peão (expressões) | p34–p47 | Código de e-mail (p41), carregando (p36), erro (p46), "digitando..." (p44), aviso de reserva (p37), estados vazios em geral |

Antes de entrar no app, as imagens precisam ser recortadas (sem a margem vazia) e redimensionadas. Hoje são 5.6 MB no total. O formato e o tamanho ficam com o builder; o critério é ficarem nítidas a 3x no maior tamanho usado (~170 pt).

## Modo escuro

- O tema escuro é a "noite de jogo" da tabela de tokens, não uma inversão em cinza.
- **Comportamento (minha escolha):** segue o tema do sistema por padrão e tem uma opção em Perfil > Configurações (Automático / Claro / Escuro), salva no AsyncStorage. `app.json` passa para `userInterfaceStyle: "automatic"`.
- **Splash e ícone adaptativo:** o fundo deixa de ser `#ffffff` e vira o amarelo `#F6E22D`, por coerência com a marca. Escolha minha.
- Todas as telas precisam funcionar nos dois temas. Telas com cor fixa própria, como o hero do perfil em magenta e o do jogador em verde-água, mantêm essa cor nos dois temas.

## Movimento

O comportamento esperado de cada animação está nos demos do mockup.

| Animação | Comportamento | Háptico |
|---|---|---|
| Botão adesivo | Ao pressionar, translada (3, 3) e a sombra vai a 0. Mola rápida na volta | leve no toque (`selection` ou `light`) |
| Entrada dos cartões | Sobe 18 px com escala 0.92 → 1.02 → 1, 550 ms, intervalo de 70 ms entre cartões. Só na primeira montagem da tela, não a cada foco | — |
| Personagens vivos | "Respiração" lenta (±5 px, ±2°, ~3 s em loop). Variante "wiggle": um balanço curto a cada ~2.4 s | — |
| Check-in feito | Dado com squash and stretch em loop, confete saindo do centro, cartão de moedas entrando com atraso | sucesso |
| Curtir | Coração vai a 1.5×, gira −10° e volta com mola; contador incrementa | leve |
| Troca de aba | O ícone ativo vira pílula amarela e dá um pulinho (escala 0.8 → 1.1 → 1) | `selection` |
| Carregando | Peão balança (±12°) e skeletons com brilho correndo | — |
| Badge | Entra com escala | — |

- **Tecnologia:** Reanimated, Gesture Handler (já instalado) e `expo-haptics`. Reanimated hoje não é dependência direta: o builder deve instalar a versão compatível com o SDK 54 (`npx expo install`).
- **Reduzir movimento:** respeitar a configuração de acessibilidade do sistema. Quando ligada, loops e confete param, entradas viram fade simples e o háptico continua.
- **Nada de animação bloqueia interação.** A pessoa pode tocar durante qualquer entrada.

## Telas

O mockup tem 32 telas. Exceto Salas e Reservar mesa (ver abaixo), elas cobrem tudo que está roteado hoje em `App.tsx`.

- **Entrada:** Login (inclui alternar para cadastro e esqueci a senha), Código de verificação.
  - Hoje o cadastro entra direto, sem verificar e-mail. Então o código de 6 dígitos só existe na redefinição de senha, que é o modo `reset` dentro de `LoginScreen`: código e nova senha no mesmo formulário.
  - **Minha escolha:** o fluxo continua igual. A tela de código do mockup vira o visual desse passo, com os campos de nova senha abaixo dos 6 dígitos e sem o contador "Reenviar código".
- **Início e eventos:** Home, EventsList, detalhe do evento como bottom sheet (substitui o modal duplicado de Home e EventsList por um só componente), sucesso de check-in.
- **Jogos:** GamesList, GameDetail.
  - **Salas fica fora** (decisão do usuário): a aba Salas continua desligada em `App.tsx` e `RoomsScreen` não é redesenhada. Ignore as telas "Salas" e "Reservar mesa" do mockup.
  - Elementos que dependem de salas também saem: "Salas livres agora" no Início e o botão "Reservar mesa com Azul" no detalhe do jogo.
  - A barra de abas fica com 4 itens para usuários (Início, Social, Avisos, Perfil) e 5 para admins (com Painel).
  - AdminApprovals continua no redesign porque está roteada hoje.
- **Social:** Social com segmented control Feed / Amigos / Conversas, ChatDetail, CreateChatGroup.
- **Avisos e perfil:** Notifications (com estado vazio), Profile, PlayerProfile. Os dois perfis devem virar um componente com variante. Estados de carregando e de erro valem para todas as telas.
- **Admin:** AdminDashboard, AdminApprovals, AdminEventsManagement, AdminCreateEvent, AdminUsers, AdminFinance, AdminGames, AdminRewards, AdminAchievements, AdminSendNotification, AdminReports.
- **Admin, tom mais sóbrio:** cartões neutros, cor só em ícones, chips e ações. O mesmo sistema de componentes. Abas e cabeçalhos seguem o padrão do app; o cabeçalho vermelho atual some.
- **Telas de admin com várias abas ou modais** que o mockup não detalha: o builder aplica os mesmos componentes e padrões.
- **Emojis em títulos** ("Painel Administrativo 🛡️" etc.) saem; o papel deles passa para os personagens e os ícones.

### Dados de exemplo

Nomes, números, textos e alguns elementos do mockup são ilustrativos. A tela final mostra só o que a API já oferece. Alguns elementos do mockup podem não ter dado hoje:
- "Nível 7" no perfil
- "Salas livres agora" no Início
- "8 partidas juntos" e "em comum" no perfil de jogador
- "Embaralhando as cartas..."
- estatísticas de partidas
- gráfico do financeiro

Se o dado não existir, o elemento é omitido ou adaptado ao que existe; não se cria endpoint novo.

## Restrições

- **Entrega de uma vez** (decisão do usuário): o redesign sai inteiro numa única versão, começando agora. Não há convivência entre telas novas e antigas. Ele exige um build nativo novo (EAS), porque entram Reanimated, `expo-haptics`, as fontes e mudanças no `app.json`.
- **Não há testes automatizados** no app. A verificação é manual, rodando o app nos dois temas.
- Seguir as convenções do projeto em `~/.claude/CLAUDE.md`:
  - termos de domínio em pt-BR e o resto em inglês
  - TypeScript estrito, sem `any`
  - sem comentários óbvios
- Textos de UI continuam em pt-BR.
- Precisa rodar em Android e iOS. O app usa `edgeToEdgeEnabled` no Android, então safe areas são obrigatórias com a barra de abas flutuante.
- Acessibilidade: contraste AA para texto, área de toque ≥ 44 pt e rótulos de acessibilidade nos botões só com ícone.

## Decisões deixadas para o builder

- **Como montar os tokens.** Minha recomendação: tokens em TypeScript, num `theme/` reescrito, mais um hook de tema com claro/escuro, consumidos por `StyleSheet`. O motivo é que o NativeWind não está configurado e o código inteiro é StyleSheet. Ativar o NativeWind é aceitável se o builder preferir, desde que com uma única fonte de tokens.
- Estrutura de pastas dos componentes e a ordem de migração das telas.
- Como quebrar as telas gigantes em componentes, mantendo o comportamento.
- Formato, tamanho e nome final das imagens dos personagens em `assets/`.
- Escolha exata de pesos de fonte e da escala tipográfica, mantendo a hierarquia do mockup.
- Ícones: continuar com lucide, com traço ~2.4 como no mockup.
- O destino das telas órfãs `CreateRoomScreen.tsx` e `ChatsListScreen.tsx` (não roteadas): fora deste redesign, a menos que o plano mostre que elas são necessárias.

## Como implementar

Skills instaladas que se aplicam: `expo-design-system` (tokens e componentes), `expo-native-ui` (estilo nativo e safe areas) e `animate-expo` (animações com Reanimated, gestos e háptico).
