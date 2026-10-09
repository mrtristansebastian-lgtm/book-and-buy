/* Export only supplied website files. Never reads editor storage or app state. */
(function (root) {
  const encoder = new TextEncoder();
  const safePath = path => typeof path === 'string' && path.length < 240 && !/^(?:\/|[a-z]:)/i.test(path) && !/[\\\x00-\x1f]/.test(path) && !path.split('/').some(part => !part || part === '.' || part === '..' || part.startsWith('.'));
  const allowed = /\.(?:html?|css|js|mjs|json|txt|md|csv|xml|svg|png|jpe?g|webp|gif|ico|avif|woff2?|ttf|otf|mp4|webm|mp3|wav|pdf)$/i;
  const secret = /(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|"private_key"\s*:|(?:api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token)\s*[=:]\s*["'][^"']{12,})/i;
  function validate(path, content) {
    if (!safePath(path) || !allowed.test(path) || /(?:^|\/)(?:firebase|credentials|service-account|secrets)(?:[.\/-]|$)/i.test(path) || /(?:^|\/)(?:local-services|local-ui|runtime-sdk|website-contract|site-export)\.js$/i.test(path)) throw new Error('This project contains a file that cannot be exported safely: ' + path);
    if (typeof content === 'string' && secret.test(content)) throw new Error('Remove credentials from your website files before downloading.');
  }
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function zip(files) {
    const chunks = [], central = []; let offset = 0, total = 0;
    if (files.length > 301) throw new Error('Too many website files to download.');
    for (const { path, bytes } of files) {
      validate(path, bytes); total += bytes.length;
      if (total > 80 * 1024 * 1024) throw new Error('Website download exceeds 80 MB.');
      const name = encoder.encode(path), crc = crc32(bytes);
      const local = new Uint8Array(30 + name.length), l = new DataView(local.buffer);
      l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true); l.setUint16(6, 0x800, true); l.setUint16(12, 33, true);
      l.setUint32(14, crc, true); l.setUint32(18, bytes.length, true); l.setUint32(22, bytes.length, true); l.setUint16(26, name.length, true); local.set(name, 30);
      const record = new Uint8Array(46 + name.length), c = new DataView(record.buffer);
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true); c.setUint16(14, 33, true);
      c.setUint32(16, crc, true); c.setUint32(20, bytes.length, true); c.setUint32(24, bytes.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true); record.set(name, 46);
      chunks.push(local, bytes); central.push(record); offset += local.length + bytes.length;
    }
    const centralSize = central.reduce((sum, bytes) => sum + bytes.length, 0), end = new Uint8Array(22), e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
    return new Blob([...chunks, ...central, end], { type: 'application/zip' });
  }
  root.BookBuySiteExport = Object.freeze({ validate, zip });
})(typeof window === 'undefined' ? globalThis : window);
