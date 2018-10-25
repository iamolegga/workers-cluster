import * as colors from 'colors/safe';
import { common } from './common';

(async () => {
  await runTest(common);
  process.exit(0);
})();

async function runTest(testFn: () => Promise<string>) {
  try {
    const title = await testFn();
    // tslint:disable-next-line no-console
    console.log(colors.green('\t' + title + '\n'));
  } catch (e) {
    // tslint:disable-next-line no-console
    console.error(e);
    process.exit(1);
  }
}
