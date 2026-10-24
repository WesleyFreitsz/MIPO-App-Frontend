export const springs = {
  press: { damping: 15, stiffness: 400 },
  pop: { damping: 12, stiffness: 180 },
} as const;

export const durations = { enter: 550, stagger: 70, fade: 200, modalSwap: 400 } as const;

export const MAX_STAGGERED_ITEMS = 8;
