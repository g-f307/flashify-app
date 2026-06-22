export type FlashinhoExpressionVariant = "muito_ruim" | "ruim" | "ok" | "boa" | "amei";

const FLASHINHO_EXPRESSION_SRC: Record<FlashinhoExpressionVariant, string> = {
  muito_ruim: "/flashinho_relat/flashinho_muito_ruim.png",
  ruim: "/flashinho_relat/flashinho_ruim.png",
  ok: "/flashinho_relat/flashinho_ok.png",
  boa: "/flashinho_relat/flashinho_boa.png",
  amei: "/flashinho_relat/flashinho_amei.png",
};

export function getFlashinhoExpressionSrc(variant: FlashinhoExpressionVariant) {
  return FLASHINHO_EXPRESSION_SRC[variant];
}
