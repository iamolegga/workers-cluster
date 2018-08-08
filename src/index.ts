import * as cluster from 'cluster';
import * as debugModule from 'debug';
import { basename } from 'path';

export interface IWorkers {
  [pathToWorker: string]: number;
}

export interface IWorker {
  start(): Promise<void>;
  close(): Promise<void>;
}

interface INotifyMessage {
  WK_WORKER_STARTED: true;
}

const debug = debugModule('workers-cluster');
let restartChildOnError = true;

export function startCluster(workers: IWorkers) {
  if (cluster.isMaster) {
    const startMap = Object.keys(workers).reduce(
      (agg, current) => {
        agg[current] = 0;
        return agg;
      },
      {} as IWorkers,
    );

    process.on('SIGTERM', () => {
      restartChildOnError = false;
      debug('got SIGTERM, sending to workers');
      Object.values(cluster.workers).forEach(worker => {
        if (worker) {
          process.kill(worker.process.pid, 'SIGTERM');
        }
      });
    });

    debug('initializing workers');

    return new Promise<void>(resolve => {
      Object.entries(workers).forEach(([WK_WORKER_PATH, count]) => {
        for (let i = 0; i < count; i++) {
          const worker = cluster.fork({ WK_WORKER_PATH, WK_NOTIFY: true });
          handleFirstStart(workers, startMap, worker, WK_WORKER_PATH, resolve);
          handleExit(worker, WK_WORKER_PATH);
        }
      });
      debug(`all workers initialized`);
    });
  } else {
    const workerPath = process.env.WK_WORKER_PATH!;
    const worker = require(workerPath) as IWorker;

    debug(`starting worker ${basename(workerPath)}`);
    worker.start().then(notifyMaster);

    process.on('SIGTERM', () => {
      const workerMeta = `${basename(workerPath)}:${process.pid}`;
      debug(`worker ${workerMeta} got SIGTERM, closing`);
      worker.close().then(
        () => {
          debug(`worker ${workerMeta} shutted down gracefully`);
          process.exit(0);
        },
        (err: Error) => {
          debug(`worker ${workerMeta} shutted down with error \n%O`, err);
          process.exit(1);
        },
      );
    });
    return new Promise<void>(noop);
  }
}

function handleExit(worker: cluster.Worker, WK_WORKER_PATH: string) {
  worker.on('exit', (code, signal) => {
    let message = `worker ${basename(WK_WORKER_PATH)}:${worker.id}`;
    let toLog = false;

    if (signal) {
      message += ` was killed by signal: ${signal}`;
      toLog = true;
    } else if (code !== 0) {
      toLog = true;
      message += ` exited with error code: ${code}`;
      if (restartChildOnError) {
        message += ', restarting';
        handleExit(cluster.fork({ WK_WORKER_PATH }), WK_WORKER_PATH);
      }
    }

    if (toLog) {
      debug(message);
    }
  });
}

function handleFirstStart(
  workers: IWorkers,
  workersStarted: IWorkers,
  worker: cluster.Worker,
  workerPath: string,
  resolve: () => void,
) {
  worker.on('message', (msg: any) => {
    if (isNotifyMessage(msg)) {
      workersStarted[workerPath] += 1;
      if (Object.entries(workers).every(([k, v]) => workersStarted[k] === v)) {
        debug(`all workers started`);
        resolve();
      }
    }
  });
}

function notifyMaster() {
  if (process.env.WK_NOTIFY) {
    const message: INotifyMessage = { WK_WORKER_STARTED: true };
    process.send!(message);
  }
}

function isNotifyMessage(o: any): o is INotifyMessage {
  return typeof o === 'object' && o !== null && o.WK_WORKER_STARTED === true;
}

function noop() {} // tslint:disable-line no-empty
