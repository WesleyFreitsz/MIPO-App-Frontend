import * as Haptics from "expo-haptics";
import { haptic } from "../haptics";

test("tap usa impacto leve", () => {
  haptic.tap();
  expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
});

test("select usa feedback de seleção", () => {
  haptic.select();
  expect(Haptics.selectionAsync).toHaveBeenCalled();
});

test("success usa notificação de sucesso", () => {
  haptic.success();
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
});

test("falha do háptico nunca derruba a interação", async () => {
  (Haptics.impactAsync as jest.Mock).mockReturnValueOnce(Promise.reject(new Error("sem motor")));
  expect(() => haptic.tap()).not.toThrow();
  await Promise.resolve();
});
