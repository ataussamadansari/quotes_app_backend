const runtimeState = {
  startedAt: new Date(),
  shuttingDown: false,
  shutdownSignal: null,
  shutdownStartedAt: null,
};

export const markShuttingDown = (signal) => {
  runtimeState.shuttingDown = true;
  runtimeState.shutdownSignal = signal;
  runtimeState.shutdownStartedAt = new Date();
};

export const getRuntimeState = () => ({
  ...runtimeState,
});

export const isShuttingDown = () => runtimeState.shuttingDown;
