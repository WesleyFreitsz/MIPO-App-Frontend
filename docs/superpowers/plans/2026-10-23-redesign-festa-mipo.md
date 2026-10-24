# Redesign Festa Mipo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar o visual "Festa Mipo" (tokens, componentes, personagens, modo claro/escuro e animações) a todas as telas roteadas do MIPO-App-Frontend numa única entrega, sem mudar comportamento.

**Architecture:** Uma única fonte de tokens em `theme/` (TypeScript), exposta por um `ThemeProvider` com claro/escuro e preferência persistida. Uma biblioteca de componentes em `components/ui/` consome só tokens. Primitivas de movimento em `motion/` usam Reanimated e háptico, e respeitam "reduzir movimento". Cada tela mantém hooks, queries, mutations e handlers atuais: só o JSX e os estilos são trocados pelos componentes. Telas gigantes são quebradas em arquivos em `screens/<feature>/`.

**Tech Stack:**
- Expo SDK 54, React Native 0.81 (nova arquitetura), React 19.1, TypeScript strict
- React Navigation 7 (stack + bottom tabs) e TanStack Query 5
- Reanimated 4, react-native-worklets, Gesture Handler, expo-haptics
- expo-font com @expo-google-fonts (Fredoka, Nunito), lucide-react-native
- Testes: jest-expo e @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-10-23-redesign-festa-mipo-design.md`. A referência visual é `docs/superpowers/specs/2026-10-23-redesign-festa-mipo/mockup.html`; abra no navegador. Em caso de dúvida, vale o mockup.

## Global Constraints

- **Escopo:** só visual e estrutura de UI. Endpoints, payloads, queries, regras de negócio e fluxos ficam como estão.
- **Salas fica fora:**
  - a aba Salas continua comentada
  - `RoomsScreen.tsx`, `CreateRoomScreen.tsx` e `ChatsListScreen.tsx` não são tocadas
  - "Salas livres agora" e "Reservar mesa com …" não entram nas telas
- **Barra de abas:**
  - usuário: Início, Social, Avisos, Perfil
  - admin: Início, Painel, Social, Avisos, Perfil
- **Convenções de código:**
  - Termos de domínio em pt-BR e o resto em inglês (`EventoDetailSheet`, `useThemePreference`).
  - TypeScript strict, sem `any` em código novo. Ao tocar código com `any`, tipar quando for barato.
  - Sem comentários óbvios.
- **Textos de UI:** em pt-BR. Os títulos perdem os emojis ("Painel Administrativo 🛡️" → "Painel da Mipo").
- **Cores:** nenhum hex fora de `theme/tokens.ts`. Telas e componentes usam só `useTheme().colors`.
- **Tipografia:**
  - Fredoka (`Fredoka_600SemiBold`, `Fredoka_700Bold`) em títulos, botões, números e chips de destaque.
  - Nunito (`Nunito_600SemiBold`, `Nunito_700Bold`, `Nunito_800ExtraBold`, `Nunito_900Black`) no resto.
- **Adesivo:**
  - contorno 2.5; chip 2
  - sombra sólida sem blur: cartão (4,4), botão e tile (3,3), destaque (5,5)
  - raios: cartão 20, botão e input 14, tile 16, ícone em caixa 12, folha 28
- **Texto sobre cores:** sobre `yellow`, `lime`, `teal`, `lilac` e `orange` é sempre `onColor` (#1E1414). Sobre `pink` e `red` é sempre branco.
- **Fundo amarelo `hero`:** só no Login, no check-in e no topo do Início.
- **Acessibilidade:**
  - contraste AA (≥ 4.5 em texto normal)
  - área de toque ≥ 44
  - `accessibilityLabel` em todo botão só com ícone
  - respeitar `useReducedMotion()` do Reanimated
- **Safe areas:** obrigatórias, com Android edge-to-edge e a barra de abas flutuante. O conteúdo rolável reserva `TAB_BAR_HEIGHT + insets.bottom + 16` no fim.
- **Branch e commits:** trabalhar na branch `redesign/festa-mipo` (criar a partir de `main`). Cada task termina em commit, com mensagem convencional em inglês e o rodapé `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Verificação de cada task:**
  - `npx tsc --noEmit` sem erros novos. Anote a contagem de erros antes da Task 1 e não deixe subir.
  - `npx jest` verde.
  - Para telas: rodar `npx expo start` e conferir a tela nos dois temas contra o mockup.

## Review Focus

1. **Nomes e textos longos** (nome de jogo, de evento, de usuário, de grupo) não podem estourar cartões, tiles nem balões. Corte com `numberOfLines` e reticências. Testes em Task 5 (GameTile) e Task 6 (ChatBubble).
2. **Usuário sem `avatarUrl`** ou com nome de uma só palavra: o Avatar mostra iniciais (1–2 letras maiúsculas) e uma cor estável derivada do id. Teste em Task 5.
3. **Fonte do sistema aumentada (acessibilidade):** botões e chips crescem em altura sem cortar texto. Nada de `height` fixa em contêiner de texto, use `minHeight`. Teste em Task 4 (Button sem `height` fixo).
4. **"Reduzir movimento" ligado:** personagens ficam parados, confete não roda e as entradas viram fade. Testes em Task 3 (Character) e Task 4 (StaggerIn).
5. **Teclado aberto em formulários e no chat:** com `softwareKeyboardLayoutMode: "resize"`, o input do chat e o botão de enviar continuam visíveis acima do teclado. Os formulários rolam até o campo focado (`KeyboardAvoidingView` só no iOS). Verificação manual nas Tasks 8, 13 e 17.

---

### Task 1: Infra de testes e tokens

**Files:**
- Modify: `package.json` (scripts `test`, `typecheck`; devDeps)
- Create: `jest.config.js`
- Create: `theme/tokens.ts`
- Create: `theme/contrast.ts`
- Delete: `theme/index.ts` (não é importado por ninguém)
- Test: `theme/__tests__/tokens.test.ts`

**Interfaces:**
- Produces:
  - `type ColorName = 'bg' | 'hero' | 'surface' | 'surface2' | 'sunken' | 'text' | 'muted' | 'line' | 'shadow' | 'yellow' | 'red' | 'pink' | 'lime' | 'teal' | 'blue' | 'lilac' | 'orange' | 'tab' | 'tabText' | 'tabMuted' | 'onColor' | 'onPink' | 'success' | 'overlay'`
  - `type Palette = Record<ColorName, string>`
  - `const palettes: { light: Palette; dark: Palette }`
  - `type AccentName = 'yellow' | 'red' | 'pink' | 'lime' | 'teal' | 'blue' | 'lilac' | 'orange'`
  - `function foregroundOn(accent: AccentName, palette: Palette): string`: retorna `palette.onPink` (branco) para `pink` e `red`, e `palette.onColor` para o resto.
  - `const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }`
  - `const radius = { chip: 999, icon: 12, button: 14, input: 14, tile: 16, card: 20, sheet: 28 }`
  - `const stroke = { regular: 2.5, thin: 2, thick: 3 }`
  - `const offset = { card: 4, button: 3, hero: 5 }`
  - `const fontFamily = { display: 'Fredoka_700Bold', displaySemi: 'Fredoka_600SemiBold', body: 'Nunito_600SemiBold', bodyBold: 'Nunito_700Bold', bodyHeavy: 'Nunito_800ExtraBold', bodyBlack: 'Nunito_900Black' }`
  - `const typeScale = { screenTitle: 26, section: 18, cardTitle: 16, body: 13, caption: 12, micro: 10.5, hero: 30 }`
  - `function contrastRatio(fg: string, bg: string): number` (WCAG 2.1, hex de 6 dígitos)

- [ ] **Step 1: Instalar a infra de teste**

Run:
```bash
git checkout -b redesign/festa-mipo
npx tsc --noEmit | grep -c "error TS"
npx expo install jest-expo jest @testing-library/react-native
npm i -D @types/jest
```
Anote a contagem de erros do `tsc`: esse é o baseline das tasks seguintes. Em `package.json`, adicione os scripts `"test": "jest"` e `"typecheck": "tsc --noEmit"`. Crie `jest.config.js` com `preset: 'jest-expo'` e `transformIgnorePatterns` liberando `(jest-)?react-native|@react-native|expo(nent)?|@expo|@expo-google-fonts|react-navigation|@react-navigation|lucide-react-native|react-native-svg`.

- [ ] **Step 2: Escrever o teste que falha**

```ts
import { palettes, contrastRatio, foregroundOn, AccentName } from '../tokens';

const accents: AccentName[] = ['yellow', 'red', 'pink', 'lime', 'teal', 'blue', 'lilac', 'orange'];

test('valores de marca do spec', () => {
  expect(palettes.light).toMatchObject({ bg: '#FFF8E7', hero: '#F6E22D', surface: '#FFFFFF', text: '#1E1414', yellow: '#F6E22D', red: '#E0262B', pink: '#E3156B', lime: '#B9D531', teal: '#7CC8B4', lilac: '#C9B6F0' });
  expect(palettes.dark).toMatchObject({ bg: '#17111C', hero: '#3A1530', surface: '#261C2C', text: '#FFF3D6', yellow: '#F4DB3A', pink: '#F0418A' });
});

test.each(['light', 'dark'] as const)('texto principal e secundário passam AA em %s', (scheme) => {
  const p = palettes[scheme];
  for (const bg of [p.bg, p.surface, p.surface2]) {
    expect(contrastRatio(p.text, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.muted, bg)).toBeGreaterThanOrEqual(4.5);
  }
});

test.each(['light', 'dark'] as const)('texto sobre cores de destaque passa AA grande (3:1) em %s', (scheme) => {
  const p = palettes[scheme];
  for (const a of accents) expect(contrastRatio(foregroundOn(a, p), p[a])).toBeGreaterThanOrEqual(3);
});

test('contrastRatio conhecido', () => {
  expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx jest theme` (Expected: FAIL, módulo `../tokens` não existe)

- [ ] **Step 4: Implementar `theme/tokens.ts` e `theme/contrast.ts`**

As cores vêm da tabela de paleta do spec. Valores de tokens fora da tabela:
- Claro: `tab #1E1414`, `tabText #F6E22D`, `tabMuted #8D7B5E`, `onColor #1E1414`, `onPink #FFFFFF`, `success #3DBE5B`, `overlay rgba(20,10,15,0.55)`.
- Escuro: `tab #0B070D`, `tabText #F4DB3A`, `tabMuted #7C6A80`, `onColor #1E1414`, `onPink #FFFFFF`, `success #3DBE5B`, `overlay rgba(0,0,0,0.6)`.

Se algum par falhar no contraste, ajuste só a luminosidade do token `muted` (o `muted` do escuro já pode precisar disso) e anote o novo valor na mensagem de commit. Para `blue` e `red` com texto, `foregroundOn` define a cor. Se `blue` claro (`#4A6FD8`) com `onColor` não passar 3:1, `foregroundOn('blue')` passa a retornar `onPink`.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx jest theme` (Expected: PASS)

- [ ] **Step 6: Commit** `feat(theme): add Festa Mipo design tokens and test setup`

---

### Task 2: ThemeProvider, preferência de tema, fontes e app.json

**Files:**
- Create: `theme/resolveColorScheme.ts`
- Create: `theme/ThemeProvider.tsx`
- Create: `theme/useMipoFonts.ts`
- Create: `theme/index.ts` (barrel: reexporta tokens, `ThemeProvider`, `useTheme`)
- Modify: `App.tsx` (envolver com `ThemeProvider`, segurar o splash até as fontes carregarem, `StatusBar` por tema, remover o `THEME` local)
- Modify: `app.json`
- Test: `theme/__tests__/resolveColorScheme.test.ts`

**Interfaces:**
- Consumes: `palettes`, `Palette` (Task 1)
- Produces:
  - `type ThemePreference = 'system' | 'light' | 'dark'`
  - `function resolveColorScheme(preference: ThemePreference, system: 'light' | 'dark' | null | undefined): 'light' | 'dark'`
  - `const THEME_PREFERENCE_KEY = 'mipo.themePreference'`
  - `function ThemeProvider(props: { children: React.ReactNode }): JSX.Element`
  - `function useTheme(): { scheme: 'light' | 'dark'; colors: Palette; preference: ThemePreference; setPreference(p: ThemePreference): void }`
  - `function useMipoFonts(): boolean` (true quando carregou)

- [ ] **Step 1: Teste que falha**

```ts
import { resolveColorScheme } from '../resolveColorScheme';
test.each([
  ['system', 'dark', 'dark'], ['system', 'light', 'light'], ['system', null, 'light'], ['system', undefined, 'light'],
  ['light', 'dark', 'light'], ['dark', 'light', 'dark'],
] as const)('pref %s + sistema %s = %s', (pref, sys, expected) => {
  expect(resolveColorScheme(pref, sys)).toBe(expected);
});
```

- [ ] **Step 2: Rodar e ver falhar.** Run: `npx jest resolveColorScheme` (FAIL)

- [ ] **Step 3: Implementar**
  - `ThemeProvider` lê a preferência do AsyncStorage (`THEME_PREFERENCE_KEY`) na montagem e cai em `'system'` se der erro ou estiver vazia.
  - Usa `useColorScheme()` do RN e grava a preferência no `setPreference`.
  - Instalar as dependências:
    ```bash
    npx expo install expo-font expo-splash-screen @expo-google-fonts/fredoka @expo-google-fonts/nunito react-native-reanimated react-native-worklets expo-haptics
    ```
  - `useMipoFonts` chama `useFonts` com os seis pesos da Global Constraints.
  - Em `App.tsx`, `SplashScreen.preventAutoHideAsync()` roda no escopo do módulo e `hideAsync` quando as fontes carregarem.
  - `StatusBar`: `style={scheme === 'dark' ? 'light' : 'dark'}`.
  - `NavigationContainer` recebe um `theme` derivado dos tokens (`background: colors.bg`, `card: colors.bg`, `text: colors.text`, `border: colors.line`, `primary: colors.red`).

- [ ] **Step 4: `app.json`**
  - `userInterfaceStyle: "automatic"`
  - `splash.backgroundColor` e `android.adaptiveIcon.backgroundColor`: `#F6E22D`
  - adicionar `"expo-font"` em `plugins`

- [ ] **Step 5: Verificar**

Run: `npx jest && npx tsc --noEmit`. Expected: PASS e erros ≤ baseline.

Também rode `npx expo start -c` e confira que o app abre, e que trocar o tema do sistema muda a `StatusBar`.

- [ ] **Step 6: Commit** `feat(theme): add ThemeProvider with persisted preference, fonts and app.json dark support`

---

### Task 3: Personagens (assets e componente)

**Files:**
- Create: `scripts/prepare-characters.mjs`
- Create: `assets/characters/*.png` (gerados)
- Create: `components/ui/characters.ts`
- Create: `components/ui/Character.tsx`
- Modify: `package.json` (devDep `sharp`, script `prepare:characters`)
- Test: `components/ui/__tests__/Character.test.tsx`

**Interfaces:**
- Produces:
  - `type CharacterName = 'celular1' | … | 'celular5' | 'moeda1' | … | 'moeda5' | 'monstro1' | … | 'monstro5' | 'quebraCabeca1' | … | 'quebraCabeca6' | 'dado1' | 'dado2' | 'dado3' | 'pocao1' | 'pocao2' | 'pocao3' | 'trofeu1' | … | 'trofeu6' | 'peao1' | … | 'peao14'`
  - Mapeamento das pranchetas: p1–5 → celular1–5, p6–10 → moeda1–5, p11–15 → monstro1–5, p16–21 → quebraCabeca1–6, p22–24 → dado1–3, p25–27 → pocao1–3, p28–33 → trofeu1–6, p34–47 → peao1–14
  - `const characters: Record<CharacterName, ImageSourcePropType>`
  - `type CharacterMotion = 'idle' | 'wiggle' | 'jump' | 'spin' | 'none'`
  - `function Character(props: { name: CharacterName; size: number; motion?: CharacterMotion; style?: StyleProp<ViewStyle>; testID?: string }): JSX.Element` (padrão `motion='idle'`)

- [ ] **Step 1: Gerar os assets**

O script lê `docs/superpowers/specs/2026-10-23-redesign-festa-mipo/personagens/pN.png` e:
1. recorta o PNG na caixa dos pixels com alpha > 10;
2. adiciona 4% de margem transparente;
3. redimensiona para 512 px no lado maior;
4. grava em `assets/characters/<nome>.png` com `compressionLevel: 9`.

Rode `npm i -D sharp && npm run prepare:characters`. Esperado: 47 arquivos e uns 2 MB no total.

Depois do recorte, o tamanho visual vem só do `size`. O fator de escala do mockup (1.25×/2.7×) não se aplica mais.

- [ ] **Step 2: Teste que falha**

```tsx
import { render } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';
import { Character } from '../Character';
import { characters } from '../characters';

test('todos os 47 personagens mapeados', () => { expect(Object.keys(characters)).toHaveLength(47); });

test('com reduzir movimento, não anima', () => {
  jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
  const { getByTestId } = render(<Character name="dado1" size={96} motion="jump" testID="c" />);
  expect(getByTestId('c').props.style).toEqual(expect.not.arrayContaining([expect.objectContaining({ transform: expect.anything() })]));
});
```

- [ ] **Step 3: Rodar e ver falhar.** Run: `npx jest Character` (FAIL)

- [ ] **Step 4: Implementar `Character`**

Use `Animated.Image` com um `useAnimatedStyle` por movimento, todos em loop com `withRepeat`:
- `idle`: translateY 0 ↔ −5 e rotate −2° ↔ 2°, 3200 ms ida e volta, `Easing.inOut(Easing.sin)`.
- `wiggle`: parado por 80% do ciclo de 2400 ms, depois −8°, 8°, −4°, 0.
- `jump`: em 1400 ms, squash para scale (1.1, 0.88), sobe 34 com scale (0.95, 1.06), cai com scale (1.08, 0.92), quica −6 e assenta.
- `spin`: rotate −12° → 0 → 12° → 0, com translateY −4 nos extremos, 1200 ms.

Com `useReducedMotion()` true ou `motion='none'`, não aplica transform. O componente usa `accessible={false}`, porque é decorativo.

- [ ] **Step 5: Rodar e ver passar.** Run: `npx jest Character` (PASS)

- [ ] **Step 6: Commit** `feat(ui): add Mipo characters assets and animated Character component`

---

### Task 4: Movimento e Button adesivo

**Files:**
- Create: `motion/tokens.ts`
- Create: `motion/haptics.ts`
- Create: `motion/StickerPressable.tsx`
- Create: `motion/StaggerIn.tsx`
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Text.tsx`
- Test: `motion/__tests__/StaggerIn.test.tsx`, `components/ui/__tests__/Button.test.tsx`

**Interfaces:**
- Consumes: `useTheme`, tokens (Tasks 1–2)
- Produces:
  - `const springs = { press: { damping: 15, stiffness: 400 }, pop: { damping: 12, stiffness: 180 } }`
  - `const durations = { enter: 550, stagger: 70, fade: 200 }`
  - `const haptic = { tap(): void; select(): void; success(): void }`: usa `expo-haptics` com Light, Selection e Success. Erros são engolidos.
  - `function StickerPressable(props: PressableProps & { shadowOffset?: number; haptics?: 'tap' | 'select' | 'none'; style?: StyleProp<ViewStyle>; children: React.ReactNode }): JSX.Element`: no press-in translada `(offset, offset)` com a mola `press` e zera a sombra sólida; no press-out volta.
  - `function StaggerIn(props: { index: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }): JSX.Element`: usa `entering={FadeInDown.springify().damping(12).delay(index * 70)}` e, com reduzir movimento, `FadeIn.duration(200)`. Anima só na montagem.
  - `type TextVariant = 'hero' | 'screenTitle' | 'section' | 'cardTitle' | 'body' | 'bodyBold' | 'caption' | 'micro' | 'label' | 'button'`
  - `function MipoText(props: TextProps & { variant?: TextVariant; color?: ColorName | 'onColor' | 'onPink' }): JSX.Element`
  - `type ButtonVariant = 'yellow' | 'red' | 'pink' | 'teal' | 'lime' | 'ghost'`
  - `function Button(props: { label: string; onPress(): void; variant?: ButtonVariant; size?: 'md' | 'sm'; block?: boolean; icon?: LucideIcon; loading?: boolean; disabled?: boolean; accessibilityLabel?: string; testID?: string }): JSX.Element` (padrão `variant='yellow'`, `size='md'`)

O "sombra sólida" é um `View` irmão absoluto deslocado `(offset, offset)` na cor `shadow`, com o mesmo raio. Não use `shadow*`/`elevation`, porque o Android desfoca.

- [ ] **Step 1: Testes que falham**

```tsx
test('Button usa foregroundOn para o texto e não tem altura fixa', () => {
  const { getByText, getByTestId } = renderWithTheme(<Button label="Vou nessa!" variant="red" onPress={() => {}} testID="b" />);
  expect(StyleSheet.flatten(getByText('Vou nessa!').props.style).color).toBe('#FFFFFF');
  expect(StyleSheet.flatten(getByTestId('b').props.style).height).toBeUndefined();
});
test('Button desabilitado não chama onPress', () => { /* fireEvent.press → mock não chamado */ });
test('StaggerIn com reduzir movimento usa fade simples', () => { /* mock useReducedMotion=true; a prop entering é a instância FadeIn */ });
```

`renderWithTheme` fica em `test-utils/renderWithTheme.tsx` e envolve o render em `ThemeProvider`. Ele é criado nesta task e reutilizado depois.

- [ ] **Step 2: Rodar e ver falhar.** Run: `npx jest Button StaggerIn`
- [ ] **Step 3: Implementar** os arquivos acima.
- [ ] **Step 4: Rodar e ver passar.** Run: `npx jest`
- [ ] **Step 5: Commit** `feat(motion): add sticker press, stagger entrance, haptics and Button/Text`

---

### Task 5: Componentes base A

**Files** (todos em `components/ui/`): `Card.tsx`, `Chip.tsx`, `Input.tsx`, `FieldLabel.tsx`, `SegmentedControl.tsx`, `Avatar.tsx`, `AvatarStack.tsx`, `IconBox.tsx`, `CountBadge.tsx`, `Checkbox.tsx`, `GameTile.tsx`, `DateBlock.tsx`, `index.ts` (barrel). Testes em `__tests__/Avatar.test.tsx` e `__tests__/GameTile.test.tsx`.

**Interfaces** (Produces):
- `Card(props: { tone?: 'neutral' | AccentName; flat?: boolean; style?: StyleProp<ViewStyle>; children: React.ReactNode; onPress?(): void })`: com `onPress`, usa `StickerPressable`.
- `Chip(props: { label: string; tone?: 'neutral' | 'active' | 'dark' | AccentName; icon?: LucideIcon; onPress?(): void })`: `active` usa fundo `text` e texto `bg`; `dark` usa fundo `#1E1414` (via token `tab`) e texto `tabText`.
- `Input(props: TextInputProps & { icon?: LucideIcon })`: placeholder em `muted`, `minHeight` 44.
- `FieldLabel(props: { children: string })`: maiúsculas, micro, Nunito 900, cor `muted`.
- `SegmentedControl<T extends string>(props: { options: { value: T; label: string }[]; value: T; onChange(v: T): void })`: o segmento ativo é amarelo com contorno e dispara `haptic.select()`.
- `Avatar(props: { name: string; id: string; uri?: string | null; size?: 'sm' | 'md' | 'lg'; online?: boolean })`: sm 26, md 34, lg 84.
- `getInitials(name: string): string`: duas iniciais maiúsculas (primeira e última palavra), ou só a primeira letra se houver uma palavra.
- `avatarTone(id: string): AccentName`: hash estável do id sobre `['yellow', 'teal', 'lime', 'lilac', 'pink', 'orange']`.
- `AvatarStack(props: { people: { id: string; name: string; uri?: string | null }[]; max?: number })`: sobreposição de −8.
- `IconBox(props: { icon: LucideIcon; tone: AccentName; size?: number })`
- `CountBadge(props: { count: number })`: com `count > 99` mostra "99+"; com 0 não renderiza; entra com `ZoomIn`.
- `Checkbox(props: { checked: boolean; onChange(v: boolean): void; accessibilityLabel: string })`
- `GameTile(props: { name: string; meta?: string; tone: AccentName; tilt?: number; width?: number; height?: number; imageUrl?: string | null; onPress?(): void })`: nome com `numberOfLines={2}` e meta com `numberOfLines={1}`. Se houver `imageUrl`, a imagem cobre o tile e o nome fica numa faixa inferior `surface`.
- `DateBlock(props: { date: Date })`: dia da semana em pt-BR, abreviado, maiúsculo e sem ponto ("SEX"), sobre faixa `red`, com o número do dia embaixo.

- [ ] **Step 1: Testes que falham**

```tsx
test.each([['Ana Souza', 'AS'], ['ana', 'A'], ['  João   Pedro da Silva ', 'JS']])('getInitials(%s) = %s', (n, e) => expect(getInitials(n)).toBe(e));
test('avatarTone é estável', () => expect(avatarTone('abc')).toBe(avatarTone('abc')));
test('Avatar sem uri mostra iniciais', () => { /* renderWithTheme(<Avatar name="Ana Souza" id="1" />) → getByText('AS') */ });
test('GameTile corta nome longo em 2 linhas', () => { /* getByText(nome longo).props.numberOfLines === 2 */ });
test('CountBadge 150 mostra 99+ e 0 não renderiza', () => { /* … */ });
test('DateBlock de 2026-10-23 mostra SEX e 23', () => { /* … */ });
```

- [ ] **Step 2: Rodar e ver falhar.** Run: `npx jest components/ui`
- [ ] **Step 3: Implementar** os componentes, seguindo a aparência das classes `.card`, `.chip`, `.input`, `.seg`, `.av`, `.stack`, `.ico`, `.badge`, `.check`, `.tile` e `.date` do mockup.
- [ ] **Step 4: Rodar e ver passar.** Run: `npx jest`
- [ ] **Step 5: Commit** `feat(ui): add base components (card, chip, input, avatar, tile, ...)`

---

### Task 6: Componentes base B (estrutura e estados)

**Files** (em `components/ui/`): `Screen.tsx`, `ScreenHeader.tsx`, `BottomSheet.tsx`, `Fab.tsx`, `ChatBubble.tsx`, `CodeInput.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `LoadingState.tsx`, `Hero.tsx`, `Celebration.tsx`. Teste em `__tests__/ChatBubble.test.tsx` e `__tests__/states.test.tsx`.

**Interfaces** (Produces):
- `const TAB_BAR_HEIGHT = 62`
- `Screen(props: { children: React.ReactNode; scroll?: boolean; withTabBar?: boolean; background?: 'bg' | 'hero'; refreshControl?: React.ReactElement; contentStyle?: StyleProp<ViewStyle> })`: aplica a safe area de cima. Com `withTabBar`, reserva `TAB_BAR_HEIGHT + insets.bottom + 16` no fim.
- `ScreenHeader(props: { title: string; onBack?(): void; right?: React.ReactNode; subtitle?: string })`: botão voltar redondo de 36 com sombra (2,2) e `accessibilityLabel="Voltar"`; título 22. Sem `onBack`, usa `navigation.goBack`.
- `Hero(props: { children: React.ReactNode; tone?: 'hero' | AccentName })`: bloco que sangra até as bordas, com raio inferior 28 e borda inferior 3.
- `BottomSheet(props: { visible: boolean; onClose(): void; children: React.ReactNode })`: `Modal` transparente, fundo `overlay` com fade, folha `bg` com raio 28, alça (grab), entra com `SlideInDown.springify()` e fecha ao tocar no fundo.
- `Fab(props: { icon: LucideIcon; onPress(): void; accessibilityLabel: string })`: 54×54, `red`, raio 18, posicionado acima da barra de abas.
- `ChatBubble(props: { text: string; mine: boolean; time?: string; children?: React.ReactNode })`: `mine` usa `yellow` e o canto inferior direito com raio 6; de outros usa `surface` e o canto inferior esquerdo com raio 6; largura máxima 78%.
- `CodeInput(props: { length: 6; value: string; onChange(v: string): void })`: `TextInput` oculto com `keyboardType="number-pad"` e caixas 36×46; a caixa ativa fica amarela com sombra.
- `Skeleton(props: { height: number; style?: StyleProp<ViewStyle> })`: brilho correndo em loop, que vira um bloco estático com reduzir movimento.
- `EmptyState(props: { character: CharacterName; title: string; message?: string; action?: { label: string; onPress(): void } })`
- `ErrorState(props: { onRetry(): void; message?: string })`: personagem `peao13` (p46), título "Ops, caiu uma peça!", mensagem padrão "Não conseguimos falar com a Mipo agora. Confere sua internet e tenta de novo.", botão vermelho "Tentar de novo".
- `LoadingState(props: { label?: string; skeletons?: number })`: personagem `peao3` (p36) com `motion="spin"`, texto padrão "Embaralhando as cartas...", e N skeletons de 90.
- `Celebration(props: { visible: boolean; title: string; message?: string; character: CharacterName; reward?: string; onClose(): void; ctaLabel?: string })`: tela cheia `hero` com 8 confetes (cores `red`, `pink`, `lime`, `teal`, `blue`, branco, `orange`, `pink`), `Character` com `motion="jump"` e `haptic.success()` ao abrir. Com reduzir movimento, fica sem confete.

- [ ] **Step 1: Testes que falham**
  - ChatBubble: um texto de 500 caracteres renderiza e `maxWidth` é `'78%'`.
  - ErrorState: mostra "Ops, caiu uma peça!" e o botão chama `onRetry`.
  - EmptyState: renderiza a ação só se ela for passada.
  - Celebration: com `visible` false não renderiza nada.
- [ ] **Step 2: Rodar e ver falhar.** Run: `npx jest components/ui`
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar.** Run: `npx jest`
- [ ] **Step 5: Commit** `feat(ui): add screen scaffolding, sheet, chat bubble and empty/error/loading states`

---

### Task 7: Navegação (barra de abas e cabeçalhos)

**Files:**
- Create: `navigation/MipoTabBar.tsx`
- Create: `navigation/useTabBadges.ts`
- Modify: `App.tsx`

**Interfaces:**
- Consumes: `CountBadge`, `useTheme`, `haptic`, `TAB_BAR_HEIGHT`
- Produces:
  - `function useTabBadges(): { social: boolean; avisos: number }`: as mesmas três queries e regras que hoje estão em `TabNavigator`, só movidas para cá.
  - `function MipoTabBar(props: BottomTabBarProps): JSX.Element`

Mudanças:
- **Barra:** flutuante, `left/right 10`, `bottom insets.bottom + 12`, altura 62, fundo `tab`, borda 2.5 `#000` via token `line` do escuro, raio 22.
- **Aba ativa:** o ícone fica dentro de uma pílula `tabText` com borda 2, padding 4×10 e pulinho `scale 0.8 → 1.1 → 1` com a mola `pop`. O rótulo fica em `tabText`.
- **Abas inativas:** cor `tabMuted`.
- **Feedback:** `haptic.select()` ao trocar de aba.
- **Ícones:** Início `Home`, Painel `ShieldCheck`, Social `Users`, Avisos `Bell`, Perfil `User`.
- **Nome da rota:** "Notificações" passa a ser exibido como "Avisos" (`tabBarLabel: 'Avisos'`). O nome da rota não muda.
- **Badges:** Social mostra um ponto quando há chat não lido; Avisos mostra `CountBadge`.
- **Cabeçalhos:**
  - Todas as rotas do stack ficam com `headerShown: false`. Cada tela passa a renderizar o próprio `ScreenHeader` com o título que antes vinha do `App.tsx`.
  - Títulos: ChatDetail = nome do chat; EventsList "Eventos"; AdminEventsManagement "Eventos"; AdminCreateEvent "Novo evento" (admin) / "Sugerir evento" (usuário); AdminUsers "Usuários"; AdminFinance "Financeiro"; AdminGames "Acervo"; AdminRewards "Recompensas"; AdminApprovals "Aprovações"; AdminAchievements "Conquistas"; AdminNotifications "Enviar aviso".
  - O `ActivityIndicator` de `Routes` vira `LoadingState`.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar.** Run: `npx tsc --noEmit && npx jest`. Rode `npx expo start` e confira:
  - as 4 abas (usuário) e as 5 abas (admin)
  - os badges
  - o pulinho e o háptico
  - a barra acima da área de gestos no Android
  - os dois temas
- [ ] **Step 3: Commit** `feat(nav): floating sticker tab bar and in-screen headers`

---

### Task 8: Login, cadastro e redefinição de senha

**Files:** Modify `screens/LoginScreen.tsx`

Mantenha `AuthMode`, os estados, `handle*` e as chamadas a `api`/`useAuth` exatamente como estão. Mudanças de UI, seguindo o mockup "Login" e "Código do e-mail":
- **Fundo e logo:** `Screen background="hero"`. Logo "mipo" em Fredoka 700, 64, cor `red`, com sombra de texto deslocada (3,3) na cor `line`. Abaixo, a legenda "a sua mesa tá te esperando".
- **Personagem por modo:**
  - login e cadastro: `monstro2` (p12) com 150 e `idle`
  - `forgot`: `peao9` (p42)
  - `reset`: `peao8` (p41)
- **Modo `reset`:** título "Confere seu e-mail!" e subtítulo "Mandamos um código de 6 dígitos pra {email}". Usa `CodeInput` para o código, seguido de `Input` de nova senha e `Button` vermelho "Alterar senha". Não há reenvio.
- **Campos e botões:**
  - `Input` com ícones `Mail`/`Lock` e `Button` vermelho `block`
  - "Criar conta" / "Já tenho conta" e "Esqueci a senha" como links de texto (Fredoka / Nunito 700)
  - entradas com `StaggerIn`
- **Teclado:** `KeyboardAvoidingView` no iOS e `ScrollView` com `keyboardShouldPersistTaps="handled"`.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar** com tsc/jest. Manualmente:
  - os 4 modos nos dois temas
  - o teclado não cobre o botão no Android
  - os erros continuam aparecendo
- [ ] **Step 3: Commit** `feat(login): Festa Mipo redesign for auth screens`

---

### Task 9: Início, detalhe do evento e check-in

**Files:**
- Create: `screens/evento/EventoDetailSheet.tsx` (substitui os modais duplicados de `HomeScreen` e `EventsListScreen`)
- Create: `screens/evento/EventoCard.tsx`
- Modify: `screens/HomeScreen.tsx`
- Delete: `assets/Captura de tela 2026-02-16 223704.png` (se só a Home usa; confirme com grep)

**Interfaces:**
- Produces:
  - `function EventoDetailSheet(props: { evento: EventoDetail | null; visible: boolean; onClose(): void; onConfirm(): void; onCheckIn(): void; isConfirmed: boolean; canCheckIn: boolean; confirming?: boolean; checkingIn?: boolean })`
  - `EventoDetail`: tipo extraído do shape que a Home já usa para `selectedEvent`. Mova-o para `types/index.ts` como `export interface EventoDetail`, com os campos que as duas telas leem hoje.
  - `function EventoCard(props: { evento: EventoDetail; onPress(): void; variant: 'destaque' | 'lista' })`: `destaque` é o cartão `pink` com o `dado2` (p23) de 96 à direita e o botão "Vou nessa!"; `lista` é o cartão neutro com `DateBlock` e chip de confirmados.

Home:
- **Topo:** `Hero` amarelo com logo "mipo" 30, o chip `dark` de moedas (`Character moeda2` de 22 + `user.coins ?? 0`) e "Bora jogar hoje, {primeiro nome}?".
- **Destaque:** o próximo evento como `EventoCard destaque`.
- **Jogos em destaque:** a seção mantém "Ver todos" e usa `GameTile` com tilts −2°, 1.5°, −1° alternados e tons `teal`, `lime`, `lilac` em ciclo.
- **Eventos:** "Ver todos" leva a EventsList.
- **Check-in:** a lógica de câmera e permissão continua igual. O `Alert` de sucesso do check-in vira `Celebration` com título "Check-in feito!", mensagem "Boa {nome do evento}, {primeiro nome}.", personagem `dado1`, `reward="Você ganhou pontos de participação"` e CTA "Bora!".
- **Erros:** os alerts de erro continuam como estão.
- **Estados:** `LoadingState` e `ErrorState` nas queries da tela.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar** tsc/jest; manual: a Home nos dois temas, abrir e fechar a folha, confirmar presença, e o fluxo de check-in até a Celebration (dá para forçar o caminho de sucesso com um evento do dia em ambiente de dev).
- [ ] **Step 3: Commit** `feat(home): Festa Mipo home, shared evento sheet and check-in celebration`

---

### Task 10: Lista de eventos

**Files:** Modify `screens/EventsListScreen.tsx`

- `ScreenHeader "Eventos"`.
- Os filtros que já existem viram `Chip`s em linha rolável. Se a tela não tiver filtros hoje, não crie.
- A lista usa `EventoCard variant="lista"` com `StaggerIn`.
- O modal duplicado é removido em favor de `EventoDetailSheet`, ligado aos mesmos handlers.
- Vazio: `EmptyState character="dado3" title="Nenhum evento por enquanto" message="Fica de olho, sempre tem jogatina vindo."`.
- [ ] **Step 1: Implementar.** **Step 2: Verificar** (tsc/jest e a tela nos dois temas). **Step 3: Commit** `feat(events): redesign events list using shared evento components`

---

### Task 11: Jogos (lista e detalhe)

**Files:** Modify `screens/GameListScreen.tsx`, `screens/GameDetailScreen.tsx`

- **Lista:**
  - `ScreenHeader "Jogos"`, `Input` de busca com o placeholder "Buscar no acervo ({total} jogos)" quando o total existir, senão "Buscar no acervo".
  - Chips das categorias que já existem.
  - Grade de 2 colunas de `GameTile`, altura 120, tilts ±1–1.5° e tons em ciclo `teal, lime, lilac, yellow, orange, pink`.
  - Vazio: `EmptyState character="peao5"`.
- **Detalhe:**
  - `Hero tone="teal"` de altura 200 com o voltar e a capa (imagem do jogo ou `GameTile` de 110×140 inclinado −3°).
  - Título 26, linha de meta, três `Card flat` de stats (jogadores, tempo e idade, só os que existirem).
  - Seções "Sobre o jogo" e "Como jogar": o player de vídeo atual (`expo-video`) fica dentro de um `Card tone="lilac"`.
  - Sem CTA de reserva.

- [ ] **Step 1: Implementar.** **Step 2: Verificar** (tsc/jest, nos dois temas, nome longo de jogo no tile, vídeo tocando). **Step 3: Commit** `feat(games): redesign games list and detail`

---

### Task 12: Social (feed, amigos e conversas)

**Files:**
- Modify: `screens/SocialScreen.tsx` (fica só como orquestrador das abas)
- Create: `screens/social/FeedTab.tsx`, `screens/social/AmigosTab.tsx`, `screens/social/ConversasTab.tsx`, `screens/social/PostCard.tsx`, `screens/social/PostComposer.tsx`, `screens/social/LikeButton.tsx`

Mova cada aba atual, com as queries, mutations e handlers dela, para o arquivo correspondente, sem mudar a lógica.

- **Cabeçalho:** título "Social" (screenTitle) com o botão de ação da aba à direita (busca no feed, adicionar amigo em amigos, nova conversa em conversas, que leva a `CreateChatGroup` como hoje). Abaixo, `SegmentedControl` Feed / Amigos / Conversas.
- **Feed:**
  - `PostComposer`: cartão com avatar, placeholder "Conta como foi a jogatina..." e `IconBox` pink de imagem.
  - `PostCard`: avatar, nome, tempo relativo e imagem com raio 14 e contorno.
  - `LikeButton(props: { liked: boolean; count: number; onToggle(): void })`: com mola, o coração vai a 1.5× com −10° e volta; `haptic.tap()`; preenchido em `red` quando curtido.
- **Amigos:**
  - Se houver pedidos pendentes, um cartão `yellow` "{n} pedidos de amizade" com `quebraCabeca1` (p16) de 84 e o botão pink "Ver pedidos" (mesma ação de hoje).
  - Busca e lista com `Avatar online` quando o dado existir.
- **Conversas:**
  - Linhas com avatar, nome, última mensagem e hora, separadas por linha tracejada.
  - Não lidas com `Chip tone="red"` mostrando a contagem; a última mensagem fica em `text` em vez de `muted`.
- **Vazios:** feed `peao1`, amigos `quebraCabeca3`, conversas `celular1`.

- [ ] **Step 1: Implementar** o fatiamento e o visual.
- [ ] **Step 2: Verificar** tsc/jest e manualmente: postar, curtir/descurtir com animação, aceitar pedido, abrir conversa, nos dois temas.
- [ ] **Step 3: Commit** `feat(social): split social screen and apply Festa Mipo design`

---

### Task 13: Conversa (chat)

**Files:**
- Modify: `screens/ChatDetailScreen.tsx`
- Create: `screens/chat/ChatHeader.tsx`, `screens/chat/MessageList.tsx`, `screens/chat/ChatComposer.tsx`, `screens/chat/GroupInfoSheet.tsx`

O WebSocket (`useWebSocketChat`), a edição de mensagem e as infos de grupo continuam iguais. O `useColorScheme` e as cores de chat estilo WhatsApp (`#121212`, `#202c33`) saem: tudo vem de tokens.

- **ChatHeader:** voltar, avatar (com `online` quando existir), nome e subtítulo existente. O "⋮" abre o menu/infos atuais.
- **MessageList:** fundo `bg` com pontos (padrão de 16 px, pontos de 1.2 px em `muted` com opacidade 0.18, por SVG `react-native-svg` em `Pattern`). Separador de dia com `Chip` neutro. `ChatBubble`. A mensagem nova recebida ou enviada entra com `StaggerIn index={0}`.
- **"Digitando":** se o hook já expuser esse dado, `Character peao11` (p44) de 34 com "{nome} está digitando...". Se não expuser, não mostrar.
- **ChatComposer:** botão `+` redondo, `Input` "Mensagem" e botão enviar `IconBox yellow` redondo com `accessibilityLabel="Enviar"`.
- **GroupInfoSheet:** o modal de infos do grupo passa a usar `BottomSheet`.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar** tsc/jest; manual: enviar, receber, editar, abrir as infos do grupo, o teclado no Android (composer visível), nos dois temas.
- [ ] **Step 3: Commit** `feat(chat): redesign chat detail with sticker bubbles and dotted background`

---

### Task 14: Novo grupo

**Files:** Modify `screens/CreateChatGroupScreen.tsx`

- `ScreenHeader "Novo grupo"`.
- Linha com o avatar grande do grupo (`IconBox yellow` de 64 com `Camera` se o upload de imagem já existir) e o `Input` do nome.
- `FieldLabel "Participantes ({n})"` com chips dos selecionados, em tons por `avatarTone`, com "✕" para remover.
- Busca, lista com `Checkbox` e `Button` vermelho fixo no rodapé "Criar grupo".
- [ ] **Step 1: Implementar.** **Step 2: Verificar** (tsc/jest, criar um grupo nos dois temas). **Step 3: Commit** `feat(chat): redesign create group screen`

---

### Task 15: Avisos

**Files:** Modify `screens/NotificationsScreen.tsx`

- **Título:** "Avisos" (screenTitle) com `Character celular2` (p2) de 64 e `wiggle` à direita.
- **Grupos:** "Hoje" e "Esta semana", seguidos de "Antes" com `FieldLabel`. O agrupamento é por data, no cliente, a partir do `createdAt` já existente.
- **Pedido de amizade:** `Card` com avatar, texto e botões "Aceitar" (yellow sm) / "Recusar" (ghost sm), com os mesmos handlers.
- **Outros avisos:** `Card` com `IconBox` por tipo: `FRIEND_ACCEPTED` lime `UserCheck`, `NEW_MESSAGE` teal `MessageCircle`, `GROUP_INVITE` lilac `Users`, `POST_LIKE` pink `Heart`, `POST_COMMENT` yellow `MessageSquare`, e qualquer outro yellow `Bell`.
- **Lidos e não lidos:** os lidos ficam com opacidade 0.8; os não lidos ganham um ponto `red`.
- **Vazio:** `EmptyState character="celular5" title="Tudo em dia por aqui" message="Quando alguém te chamar pra jogar, aparece aqui." action={{ label: 'Ver eventos', onPress: → EventsList }}`.
- `useColorScheme` sai.

- [ ] **Step 1: Implementar.** **Step 2: Verificar** (tsc/jest; com e sem avisos; aceitar e recusar; nos dois temas). **Step 3: Commit** `feat(notifications): redesign avisos screen`

---

### Task 16: Perfil (próprio e de jogador), conquistas e tema

**Files:**
- Create: `screens/perfil/PerfilView.tsx`, `screens/perfil/PerfilHero.tsx`, `screens/perfil/PerfilStats.tsx`, `screens/perfil/ThemePreferenceSheet.tsx`
- Modify: `screens/ProfileScreen.tsx`, `screens/PlayerProfileScreen.tsx` (ficam finos: buscam os dados como hoje e renderizam `PerfilView`)
- Modify: `screens/components/AchievementsHighlights.tsx`

**Interfaces:**
- Produces:
  - `function PerfilView(props: { variant: 'meu' | 'jogador'; perfil: PerfilData; actions: PerfilActions; children?: React.ReactNode })`
  - `PerfilData` e `PerfilActions`: tipos extraídos dos campos e handlers que as duas telas já usam. Ficam em `screens/perfil/types.ts`.

Mudanças:
- **Hero:** em `meu` usa `Hero tone="pink"`, com texto branco e a engrenagem que abre `ThemePreferenceSheet` e as opções existentes. Em `jogador` usa `Hero tone="teal"`, com texto `onColor`, os botões de ação de hoje ("Adicionar" red sm e "Mensagem" ghost sm) e o "⋯".
- **Dados do hero:** `Avatar lg`, nome (screenTitle), e os chips de nível (se existir) e de moedas (`Chip dark` com `moeda1` de 20).
- **Stats:** os existentes, em `Card flat` de 3 colunas.
- **Conquistas:** `AchievementsHighlights` é refeito como faixa de cartões de 84 com cor por raridade (comum `surface`, rara `teal`, épica `lime`, lendária `pink`) e personagem por tipo: troféu (`trofeu1`–`trofeu6` ciclando), ou `pocao1` se a conquista não tiver tipo. O primeiro cartão usa `wiggle`. O `useColorScheme` local sai.
- **Em comum (só `jogador`):** se o dado existir, cartão `yellow` com `quebraCabeca6` (p21).
- **`ThemePreferenceSheet`:** `BottomSheet` com o título "Aparência" e um `SegmentedControl` Automático / Claro / Escuro ligado a `useTheme().setPreference`.
- **Gradiente:** o `expo-linear-gradient` sai destas telas.

- [ ] **Step 1: Teste que falha** (`screens/perfil/__tests__/ThemePreferenceSheet.test.tsx`): tocar "Escuro" chama `setPreference('dark')` e grava `mipo.themePreference = 'dark'` no AsyncStorage (com mock).
- [ ] **Step 2: Rodar e ver falhar.** **Step 3: Implementar.** **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Verificar manualmente** os dois perfis nos dois temas, a troca de tema persistindo depois de reabrir o app, e adicionar amigo e mandar mensagem.
- [ ] **Step 6: Commit** `feat(profile): unify profile views, redesign achievements and add theme preference`

---

### Task 17: Admin (painel, aprovações, eventos e criar evento)

**Files:** Modify `screens/AdminDashboard.tsx`, `screens/AdminApprovalsScreen.tsx`, `screens/AdminEventsManagementScreen.tsx`, `screens/AdminCreateEventScreen.tsx`

Tom admin: cartões `neutral`, com cor só em `IconBox`, chips e botões.

- **Painel:**
  - Cartão `yellow` "Painel da Mipo" com `pocao2` (p26) de 80 e o subtítulo "{n} coisas esperando você", somando aprovações e denúncias pendentes se as telas já buscam essas contagens. Se não buscam, sem subtítulo.
  - Grade 2×N de cartões com `IconBox` e rótulo; a ordem e as rotas seguem as de hoje, com o mapa do mockup. Ícones: Aprovações `CheckSquare` pink, Eventos `Calendar` teal, Usuários `Users` lilac, Financeiro `Wallet` lime, Jogos `Dice5` yellow, Recompensas `Gift` orange, Conquistas `Trophy` yellow, Denúncias `Flag` red, Notificar `Megaphone` teal.
  - `CountBadge` quando houver contagem.
- **Aprovações:** `SegmentedControl` entre as categorias atuais. Cada pedido é um `Card` com avatar, nome, detalhe e título, e os botões "Aprovar" (lime, `Check`) / "Recusar" (ghost, `X`). Vazio: `EmptyState peao2 "Nada esperando aprovação"`.
- **Eventos:** chips dos status que já existem e `EventoCard lista` reaproveitado com `Chip` de status (Pendente yellow, Aprovado lime, Recusado red). Os pedidos de jogador ganham o chip "PEDIDO DE JOGADOR" e os botões aprovar/recusar. O `Fab` com `Plus` leva a AdminCreateEvent.
- **Criar evento:**
  - área de banner tracejada (borda 2.5 tracejada `line`, fundo `surface2`, ícone `ImagePlus`, "Adicionar banner")
  - `FieldLabel` e `Input` para os campos atuais, e `SegmentedControl` se o local for uma escolha fechada
  - `Button` vermelho fixo: "Publicar evento" para admin, "Enviar sugestão" para usuário

- [ ] **Step 1: Implementar.** **Step 2: Verificar** (tsc/jest; cada tela nos dois temas; aprovar/recusar; criar evento com banner; teclado não cobre o botão). **Step 3: Commit** `feat(admin): redesign dashboard, approvals, events management and create event`

---

### Task 18: Admin (usuários, financeiro, acervo e recompensas)

**Files:** Modify `screens/AdminUsersScreen.tsx`, `screens/AdminFinanceScreen.tsx`, `screens/AdminGamesScreen.tsx`, `screens/AdminRewardsScreen.tsx`

- **Usuários:**
  - subtítulo "{total} jogadores" se o total existir, busca e chips de filtro existentes
  - linhas `Card` com avatar, nome, e-mail, `Chip yellow` de moedas e menu `MoreVertical`
  - as ações de hoje (moedas e ban) abrem `BottomSheet`
- **Financeiro:**
  - `Card lime` de saldo com `moeda3` (p8) em `wiggle`, valor em hero 30 e variação se existir
  - gráfico de barras simples com `View`s (4 tons em ciclo), só se a tela já tiver série de dados
  - lista de movimentações com valores negativos em `red`
- **Acervo:** busca e lista de `Card` com miniatura (`GameTile` de 40×48 ou imagem), nome, meta e botão de editar. O `Fab` "+" e os formulários de criar/editar de hoje viram `BottomSheet` ou tela, mantendo como estão hoje.
- **Recompensas:**
  - cartões coloridos em ciclo (yellow, teal, pink) com personagem `moeda5` (p10) e `Chip dark` "{custo} moedas"
  - o primeiro cartão em `idle`
  - o formulário atual com componentes e `Fab` "+"

- [ ] **Step 1: Implementar.** **Step 2: Verificar** (tsc/jest; CRUD de cada tela nos dois temas). **Step 3: Commit** `feat(admin): redesign users, finance, games catalog and rewards`

---

### Task 19: Admin (conquistas, enviar aviso e denúncias)

**Files:** Modify `screens/AdminAchievementsScreen.tsx`, `screens/AdminSendNotificationScreen.tsx`, `screens/AdminReportsScreen.tsx`

- **Conquistas:**
  - prévia em `Card yellow` com o personagem escolhido (100, `wiggle`), nome e `Chip` da raridade
  - formulário existente: nome, raridade como chips (Comum neutral, Rara teal, Épica lime, Lendária pink) e condições automáticas como hoje
  - o seletor de cor `react-native-wheel-color-picker` continua; ele só fica dentro de um `Card`
  - se a conquista tiver campo de ícone ou imagem, a escolha mostra os personagens `trofeu*`/`pocao*`
- **Enviar aviso:**
  - chips de público existentes, `Input` de título e mensagem multiline (`minHeight` 70)
  - `FieldLabel "Prévia"` com um `Card` que imita a notificação (`celular3` de 40, título, "agora" e mensagem truncada)
  - `Button` vermelho fixo "Enviar" com `Send`
- **Denúncias:**
  - `Card` com `Chip red` "{n} denúncias", tempo, avatar, motivo e trecho do post em bloco `sunken`, e os botões "Remover post" (red) / "Manter" (ghost)
  - vazio: `EmptyState peao2 "Nenhuma denúncia"`
  - a tela renderiza o próprio `ScreenHeader` "Denúncias", porque o header nativo já estava escondido

- [ ] **Step 1: Implementar.** **Step 2: Verificar** (tsc/jest; nos dois temas; criar conquista, enviar aviso, moderar post). **Step 3: Commit** `feat(admin): redesign achievements editor, send notification and reports`

---

### Task 20: Limpeza e verificação final

**Files:**
- Delete: `components/AnimatedCard.tsx`, `components/FadeInView.tsx` (confirme por grep que não há usos, ignorando `RoomsScreen`, que fica fora. Se `RoomsScreen` usar algum, mantenha esse arquivo).
- Modify: `tailwind.config.js`: remova o arquivo, e também `nativewind`/`tailwindcss` do `package.json`, se nada mais importar. Confirme por grep.

- [ ] **Step 1: Varredura de cores**

Run:
```bash
grep -rnE "#[0-9a-fA-F]{3,8}\b" --include=*.tsx --include=*.ts App.tsx screens components navigation motion | grep -v "screens/RoomsScreen\|screens/CreateRoomScreen\|screens/ChatsListScreen"
```
Expected: nenhuma linha.

- [ ] **Step 2: Varreduras de código**
  - `grep -rn "useColorScheme" screens components navigation`: nenhuma linha fora de `theme/ThemeProvider.tsx`.
  - `grep -rnE "🛡️|📊|🎁" screens`: nenhuma linha.

- [ ] **Step 3: Verificação completa**
  - Run: `npx jest && npx tsc --noEmit`. Expected: verde e erros ≤ baseline (registre o número final).
  - Rode `npx expo start -c` e percorra todas as telas do mockup (menos Salas e Reservar), comparando com `mockup.html` lado a lado nos dois temas.
  - Ligue "reduzir movimento" no sistema e confirme que os personagens ficam parados, a Celebration fica sem confete e as entradas viram fade.
  - Aumente a fonte do sistema ao máximo e confirme que botões, chips e a barra de abas não cortam texto.

- [ ] **Step 4: Build nativo**

Run: `npx expo prebuild --clean --no-install` (só para validar a config; não commitar `android/` nem `ios/`). Depois, `eas build -p android --profile preview` se o usuário pedir o APK.

- [ ] **Step 5: Commit** `chore: remove legacy theme/animation helpers and unused tailwind setup`
