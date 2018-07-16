import * as cluster from 'cluster';
import * as debugModule from 'debug';
import { basename } from 'path';

export interface IWorkers {
  [pathToWorker: string]: number;
}

export interface IWorker {
  start(): void;
  close(): void;
}

const debug = debugModule('workers-cluster');

export function startCluster(workers: IWorkers) {
  if (cluster.isMaster) {
    debug('initializing workers');
    Object.entries(workers).forEach(([WORKER_PATH, count]) => {
      for (let i = 0; i < count; i++) {
        const worker = cluster.fork({ WORKER_PATH });
        handleExit(worker, WORKER_PATH);
      }
    });
    debug(`all workers initialized`);

    process.on('SIGTERM', () => {
      debug('got SIGTERM, sending to workers');
      Object.values(cluster.workers).forEach(worker => {
        if (worker) {
          process.kill(worker.process.pid, 'SIGTERM');
        }
      });
    });
  } else {
    const worker = require(process.env.WORKER_PATH!) as IWorker;
    debug(`starting worker ${basename(process.env.WORKER_PATH!)}`);
    worker.start();
    process.on('SIGTERM', () => {
      debug(
        `worker ${basename(process.env.WORKER_PATH!)}:${
          process.pid
        } got SIGTERM, closing`,
      );
      worker.close();
    });
  }
}

function handleExit(worker: cluster.Worker, WORKER_PATH: string) {
  worker.on('exit', (code, signal) => {
    let message = `worker ${basename(WORKER_PATH)}:${worker.id}`;
    let toLog = false;

    if (signal) {
      message += ` was killed by signal: ${signal}`;
      toLog = true;
    } else if (code !== 0) {
      message += ` exited with error code: ${code}, restarting`;
      handleExit(cluster.fork({ WORKER_PATH }), WORKER_PATH);
      toLog = true;
    }

    if (toLog) {
      debug(message);
    }
  });
}
