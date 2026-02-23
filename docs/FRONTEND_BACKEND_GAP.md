# Análise: Funções do Frontend sem Backend

Documento que mapeia as funcionalidades do frontend mobile e a implementação correspondente no backend.

**Última atualização:** Implementação concluída — todas as telas admin e salas foram integradas.

---

## 1. Telas (status atual)

| Tela | Arquivo | Funcionalidade | Endpoints | Status |
|------|---------|----------------|-----------|--------|
| AdminAchievementsScreen | `screens/AdminAchievementsScreen.tsx` | CRUD de conquistas | `GET /achievements`, `POST /achievements`, `DELETE /achievements/:id` | ✅ Integrado |
| AdminRewardsScreen | `screens/AdminRewardsScreen.tsx` | CRUD de recompensas | `GET /rewards`, `POST /rewards`, `PATCH /rewards/:id`, `DELETE /rewards/:id` | ✅ Integrado |
| AdminGamesScreen | `screens/AdminGamesScreen.tsx` | CRUD de jogos/catálogo | `GET /games`, `POST /games`, `PATCH /games/:id`, `DELETE /games/:id` | ✅ Integrado |
| AdminFinanceScreen | `screens/AdminFinanceScreen.tsx` | Resumo financeiro | `GET /finance/summary`, `GET /finance/transactions` | ✅ Integrado |
| AdminUsersScreen | `screens/AdminUsersScreen.tsx` | Lista usuários, moedas, banir | `GET /users/admin/list`, `PATCH /users/:id/coins`, `PATCH /users/:id/ban` | ✅ Integrado |
| RoomsScreen | `screens/RoomsScreen.tsx` | Listar/entrar em salas | `GET /rooms`, `POST /rooms`, `POST /rooms/:id/join` | ✅ Integrado |
| CreateRoomScreen | `screens/CreateRoomScreen.tsx` | Criar sala | `POST /rooms` | ✅ Integrado |

---

## 2. Rotas e navegação

| Rota | Tela | Status |
|------|------|--------|
| `CriarSala` | `CreateRoomScreen.tsx` | ✅ Implementado em `App.tsx` |
| Entrar na sala → Chat | Ao confirmar entrada, o backend cria chat e retorna `chatId`; a navegação usa `chatId` e `name` para `ChatDetail`. | ✅ Implementado |

---

## 3. Telas que usam backend corretamente

| Tela | Endpoints utilizados | Status |
|------|---------------------|--------|
| SocialScreen (Feed, Amigos, Chats) | `/posts/feed`, `/friends`, `/chats`, `/friends/available/users` | ✅ Integrado |
| HomeScreen | `/events`, `/events/:id/toggle`, `/events/:id/checkin` | ✅ Integrado |
| ProfileScreen | `/users/profile`, `/posts/user/:id`, `/posts`, `/posts/:id/like` | ✅ Integrado |
| ChatDetailScreen | `/chats/:id/messages` + WebSocket | ✅ Integrado |
| NotificationsScreen | `/friends/requests/pending`, `/notifications`, `/friends/:id/accept`, `DELETE /friends/:id/reject` | ✅ Integrado |

---

## 4. Endpoints do backend NÃO usados no frontend

| Endpoint | Uso sugerido |
|----------|--------------|
| `DELETE /friends/:friendId` | Remover amigo (ProfileScreen / PlayerProfileScreen) |
| `POST /friends/:userId/block` | Bloquear usuário |
| `PUT /posts/:id` | Editar post |
| `POST /posts/:id/comments` | Comentar em post |
| `GET /posts/:id/comments` | Listar comentários |
| `DELETE /posts/comments/:id` | Excluir comentário |
| `PATCH /notifications/:id/read` | Marcar notificação como lida |
| `POST /chats/:id/mark-as-read` | Marcar mensagens como lidas |
| `DELETE /chats/:id/members/:memberId` | Remover membro do grupo |
| `POST /chats/:id/leave` | Sair do chat |
| `DELETE /chats/:id` | Excluir chat |

---

## 5. Modelo de dados sugerido para novos módulos

### Achievements
```ts
{ id: string; title: string; icon: string; createdAt: Date }
```

### Rewards
```ts
{ id: string; title: string; price: number; stock: number; createdAt: Date }
```

### Games
```ts
{ id: string; name: string; category: string; players: string; active: boolean; createdAt: Date }
```

### Rooms
```ts
{
  id: string;
  game: string;
  organizerId: string;
  organizer: User;
  date: string;
  time: string;
  maxParticipants: number;
  isPublic: boolean;
  description: string;
  participants: User[];
  chatId?: string;  // chat associado à sala
}
```

### Finance (transações)
```ts
{
  id: string;
  description: string;
  value: number;
  type: 'in' | 'out';
  createdAt: Date;
}
```

### User (campos adicionais para admin)
- `banned: boolean` (se banido)
- `coins` já existe na entidade User

---

## 6. Observações técnicas

- **WebSocket**: `useWebSocketChat.ts` usa `http://localhost:3000` — no mobile, o host deve ser o mesmo da API (ex: `http://192.168.3.61:3000`).
- **ChatsListScreen**: Usa mock e não está na navegação principal; a aba "Chats" dentro de SocialScreen já usa `GET /chats`. ChatsListScreen pode ser removida ou mantida como alternativa.
- **Roles**: O backend já diferencia `USER` e `ADMIN`; os endpoints admin devem verificar `req.user.role === 'ADMIN'`.
