import cardsJson from "@/data/cards.json";

export type CardCombo = { k: string; v: string };
export type AcademyCard = {
  num: string;
  name: string;
  icon: string;
  core: string;
  tags: string[];
  notes: string;
  combos: CardCombo[];
  image?: string;
};

export const CARDS = (cardsJson as AcademyCard[]).map((card) => ({
  ...card,
  image: `/cards-jpg/${card.num}.jpg?v=20260331`,
}));
export const COMBO_QS = CARDS.flatMap((c, cardIdx) =>
  c.combos.map((cb) => ({ q: cb.k, a: cb.v, cardName: c.name, cardIcon: c.icon, cardIdx }))
);
