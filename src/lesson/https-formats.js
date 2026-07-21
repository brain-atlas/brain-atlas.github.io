export function isCredentialFreeHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) &&
      url.username === '' && url.password === '';
  } catch {
    return false;
  }
}

export default Object.freeze({
  'https-url': Object.freeze({ type: 'string', validate: isCredentialFreeHttps }),
});
