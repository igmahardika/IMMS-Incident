export function respondHttpError(res, error, { uniqueMessage, fallbackMessage = 'Request failed.' } = {}) {
  if (error?.status) {
    return res.status(error.status).json({ error: error.message });
  }

  if (uniqueMessage && error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(400).json({ error: uniqueMessage });
  }

  return res.status(500).json({ error: error?.message || fallbackMessage });
}

export function handleRoute(res, handler, options = {}) {
  try {
    const payload = handler();
    if (typeof options.onSuccess === 'function') {
      options.onSuccess(payload);
    }
    const responsePayload = typeof options.transform === 'function' ? options.transform(payload) : payload;
    return res.status(options.status ?? 200).json(responsePayload);
  } catch (error) {
    return respondHttpError(res, error, options);
  }
}

export async function handleAsyncRoute(res, handler, options = {}) {
  try {
    const payload = await handler();
    if (typeof options.onSuccess === 'function') {
      options.onSuccess(payload);
    }
    const responsePayload = typeof options.transform === 'function' ? options.transform(payload) : payload;
    return res.status(options.status ?? 200).json(responsePayload);
  } catch (error) {
    return respondHttpError(res, error, options);
  }
}
