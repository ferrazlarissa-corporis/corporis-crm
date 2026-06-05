export type AgentModel = "claude-haiku" | "claude-sonnet";

export function chooseAgentModel(message: string): AgentModel {
  const complexSignals = ["diagnóstico", "hérnia", "cirurgia", "pós-parto", "dor na relação"];
  return complexSignals.some((signal) =>
    message.toLocaleLowerCase("pt-BR").includes(signal),
  )
    ? "claude-sonnet"
    : "claude-haiku";
}
