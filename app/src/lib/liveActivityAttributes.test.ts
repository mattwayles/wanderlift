/**
 * ActivityKit pairs the app's `Activity.request` with the widget that draws it by the
 * `WorkoutActivityAttributes` type, which therefore lives twice: in the native module that starts
 * the activity and in the widget target that renders it. If the copies drift, the activity either
 * fails to decode or silently never appears — nothing at build time catches it, so this does.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const APP = join(__dirname, '..', '..');

it('the module and the widget target share one WorkoutActivityAttributes', () => {
  const inModule = readFileSync(
    join(APP, 'modules/workout-live-activity/ios/WorkoutActivityAttributes.swift'),
    'utf8',
  );
  const inWidget = readFileSync(
    join(APP, 'targets/workout-activity/WorkoutActivityAttributes.swift'),
    'utf8',
  );
  expect(inWidget).toBe(inModule);
});

it('the JS state carries every field the Swift record reads', () => {
  const record = readFileSync(
    join(APP, 'modules/workout-live-activity/ios/WorkoutLiveActivityModule.swift'),
    'utf8',
  );
  const swiftFields = [...record.matchAll(/@Field var (\w+)/g)].map((m) => m[1]).sort();
  const jsIndex = readFileSync(join(APP, 'modules/workout-live-activity/index.ts'), 'utf8');
  const body = jsIndex.slice(jsIndex.indexOf('interface WorkoutActivityState'));
  const jsFields = [...body.slice(0, body.indexOf('\n}')).matchAll(/^\s+(\w+):/gm)]
    .map((m) => m[1])
    .sort();
  expect(jsFields).toEqual(swiftFields);
});
