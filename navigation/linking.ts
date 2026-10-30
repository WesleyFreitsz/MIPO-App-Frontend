import { LinkingOptions, ParamListBase } from "@react-navigation/native";

export const linking: LinkingOptions<ParamListBase> = {
  prefixes: ["mipo://"],
  config: {
    screens: {
      ChatDetail: "chat/:chatId",
      PlayerProfile: "jogador/:userId",
      GameDetail: "jogo/:gameId",
      EventsList: "eventos/:eventId?",
      MonthlyGames: "jogos-do-mes",
      RewardsStore: "recompensas",
      StoreCheckIn: "checkin/:code",
      PlayCalls: "jogar/:callId?",
      Store: "na-mipo",
      Menu: "cardapio",
    },
  },
};
