export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startEscalationWorker } = await import("./lib/escalation");
    startEscalationWorker();
  }
}
