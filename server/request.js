const MAX_BODY_BYTES = 100_000;

function requestError(status, message) {
  return Object.assign(new Error(message), { status });
}

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let finished = false;
    req.on('data', chunk => {
      if (finished) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        finished = true;
        chunks.length = 0;
        reject(requestError(413, 'Yêu cầu quá lớn.'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (finished) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(requestError(400, 'JSON không hợp lệ.'));
      }
    });
    req.on('error', error => { if (!finished) reject(error); });
  });
}
