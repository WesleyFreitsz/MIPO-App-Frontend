import { chatDisplay, filterAvailableUsers, filterChats, formatChatTime, relativeTime, toggleLikeInFeed } from "../socialFormat";

describe("chatDisplay", () => {
  const me = "ana";

  test("conversa privada usa o outro membro", () => {
    const chat = {
      id: "c1",
      type: "PRIVATE",
      name: "ignorado",
      members: [
        { userId: "ana", user: { id: "ana", name: "Ana" } },
        { userId: "jp", user: { id: "jp", name: "João Pedro", nickname: "jp", avatarUrl: "a.png" } },
      ],
    };
    expect(chatDisplay(chat, me)).toEqual({ title: "jp", avatar: "a.png", targetId: "jp" });
  });

  test("privada sem apelido usa o nome", () => {
    const chat = { id: "c1", type: "PRIVATE", members: [{ userId: "jp", user: { id: "jp", name: "João Pedro" } }] };
    expect(chatDisplay(chat, me).title).toBe("João Pedro");
  });

  test("privada sem o outro membro não quebra", () => {
    expect(chatDisplay({ id: "c1", type: "PRIVATE", members: [] }, me)).toEqual({ title: "Usuário", avatar: undefined, targetId: undefined });
  });

  test("grupo usa nome e imagem do grupo", () => {
    expect(chatDisplay({ id: "g1", type: "GROUP", name: "Galera do Euro", imageUrl: "g.png" }, me)).toEqual({
      title: "Galera do Euro",
      avatar: "g.png",
      targetId: "g1",
    });
  });
});

describe("filterChats", () => {
  const chats = [
    { id: "1", type: "PRIVATE" },
    { id: "2", type: "GROUP" },
    { id: "3", type: "EVENT" },
  ];

  test.each([
    ["ALL", ["1", "2", "3"]],
    ["PRIVATE", ["1"]],
    ["GROUPS", ["2", "3"]],
  ] as const)("%s", (filter, ids) => {
    expect(filterChats(chats, filter).map((c) => c.id)).toEqual(ids);
  });

  test("sem dados devolve lista vazia", () => {
    expect(filterChats(undefined, "ALL")).toEqual([]);
  });
});

describe("filterAvailableUsers", () => {
  const users = [
    { id: "1", name: "Ana Souza", nickname: "aninha" },
    { id: "2", name: "Bruno", nickname: null },
    { id: "3", name: "Carla", nickname: "CARLINHA" },
  ];

  test("busca por nome ou apelido, sem diferenciar maiúsculas", () => {
    expect(filterAvailableUsers(users, "carl").map((u) => u.id)).toEqual(["3"]);
    expect(filterAvailableUsers(users, "SOUZA").map((u) => u.id)).toEqual(["1"]);
  });

  test("busca vazia devolve todos", () => {
    expect(filterAvailableUsers(users, "")).toHaveLength(3);
  });

  test("ignora @ digitado na busca", () => {
    expect(filterAvailableUsers(users, "@aninha").map((u) => u.id)).toEqual(["1"]);
  });
});

describe("relativeTime", () => {
  const now = new Date(2026, 9, 23, 21, 0);

  test.each([
    [new Date(2026, 9, 23, 20, 59, 40), "agora"],
    [new Date(2026, 9, 23, 20, 48), "há 12 min"],
    [new Date(2026, 9, 23, 18, 0), "há 3 h"],
    [new Date(2026, 9, 22, 18, 0), "ontem"],
    [new Date(2026, 9, 10, 18, 0), "10/10"],
  ])("%s → %s", (date, expected) => {
    expect(relativeTime(date.toISOString(), now)).toBe(expected);
  });
});

describe("formatChatTime", () => {
  const now = new Date(2026, 9, 23, 21, 0);

  test("hoje mostra a hora", () => {
    expect(formatChatTime(new Date(2026, 9, 23, 9, 4).toISOString(), now)).toBe("09:04");
  });

  test("ontem mostra 'ontem'", () => {
    expect(formatChatTime(new Date(2026, 9, 22, 9, 4).toISOString(), now)).toBe("ontem");
  });

  test("antes mostra dia/mês", () => {
    expect(formatChatTime(new Date(2026, 8, 2, 9, 4).toISOString(), now)).toBe("02/09");
  });

  test("sem data fica vazio", () => {
    expect(formatChatTime(undefined, now)).toBe("");
  });
});

describe("toggleLikeInFeed", () => {
  const feed = {
    data: [
      { id: "p1", likedByUser: false, likeCount: 2 },
      { id: "p2", likedByUser: true, likeCount: 5 },
    ],
  };

  test("curtir soma um e marca", () => {
    expect(toggleLikeInFeed(feed, "p1")?.data[0]).toEqual({ id: "p1", likedByUser: true, likeCount: 3 });
  });

  test("descurtir tira um e desmarca", () => {
    expect(toggleLikeInFeed(feed, "p2")?.data[1]).toEqual({ id: "p2", likedByUser: false, likeCount: 4 });
  });

  test("contagem nunca fica negativa", () => {
    const weird = { data: [{ id: "p", likedByUser: true, likeCount: 0 }] };
    expect(toggleLikeInFeed(weird, "p")?.data[0].likeCount).toBe(0);
  });

  test("não mexe nos outros posts nem no original", () => {
    const next = toggleLikeInFeed(feed, "p1");
    expect(next?.data[1]).toBe(feed.data[1]);
    expect(feed.data[0].likeCount).toBe(2);
  });

  test("feed vazio continua vazio", () => {
    expect(toggleLikeInFeed(undefined, "p1")).toBeUndefined();
  });
});
