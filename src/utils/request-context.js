import { AsyncLocalStorage } from 'node:async_hooks';

const requestContextStorage = new AsyncLocalStorage();

export const runWithRequestContext = (context, callback) =>
  requestContextStorage.run(context, callback);

export const getRequestContext = () => requestContextStorage.getStore() ?? {};

export const setRequestContextValues = (values) => {
  const context = requestContextStorage.getStore();

  if (!context || !values || typeof values !== 'object') {
    return;
  }

  Object.assign(context, values);
};
