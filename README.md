# workers-cluster

**Run cluster of workers with graceful shutdown and autorestarting failed workers.**

## Example

```js
// index.js
const { startCluster } = require('workers-cluster');
const pathToWorker = `${__dirname}/workerA.js`;
const workerInstances = 10;
const workers = { [pathToWorker]: workerInstances };
startCluster(workers);

// workerA.js
let interval
// worker module must export `start` and `close` methods
exports.start = () => {
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
  // `close` method must explicitly exit from process
  process.exit(0);
};
```
