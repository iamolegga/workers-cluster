# workers-cluster

**Run cluster of workers with graceful shutdown and autorestarting failed workers.**

## Example

```js
/**
 * index.js
 * 
 * In your entrypoint index.js file you should call
 * `startCluster` function with one argument - object, where
 * keys - are full paths to workers,
 * and values - are count of worker instances (child processes).
 * `startCluster` returns Promise, that will be fulfilled
 * only in master process and only when all workers instances
 * will be started
 */

const { startCluster } = require('workers-cluster');

const pathToWorkerA = `${__dirname}/workerA.js`;
const workerAInstances = 10;

const pathToWorkerB = `${__dirname}/workerB.js`;
const workerBInstances = 1;

const workers = {
  [pathToWorkerA]: workerAInstances,
  [pathToWorkerB]: workerBInstances,
};
startCluster(workers).then(() => {
  console.log('All workers have been started')
});

/**
 * workerA.js / workerB.js
 * 
 * Worker module MUST export `start` and `close` methods.
 * Both of them must return Promise.
 */

let interval
exports.start = async () => {
  interval = setInterval(() => {
    // this will break worker's process
    // but worker will be restarted automatically
    if (Math.random() < .1) {
      throw new Error('Ooops');
    }
    console.log(Date.now());
  }, 1000);
};
exports.close = () => {
  clearInterval(interval);
  return Promise.resolve();
};
```
