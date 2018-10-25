import { startCluster } from '../build';

export async function common() {
  return new Promise<string>((res, rej) => {
    startCluster({ [`${__dirname}/mocks/worker.js`]: 1 }).then(
      () => res('Common test passed ✅'),
      rej,
    );
  });
}
