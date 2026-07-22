import assert from 'node:assert/strict';
import test from 'node:test';
import { isTaskBlocked } from './taskBlocking';
import { BoardItem, TaskItem, TextItem } from '../types';

function task(overrides: Partial<TaskItem>): TaskItem {
  return {
    id: 't',
    type: 'task',
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    zIndex: 1,
    text: 'task',
    done: false,
    ...overrides,
  };
}

function textItem(id: string): TextItem {
  return {
    id,
    type: 'text',
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    zIndex: 1,
    text: 'note',
    fontSize: 16,
  };
}

test('a task with no dependencies is never blocked', () => {
  const t = task({ id: 'a' });
  assert.equal(isTaskBlocked(t, [t]), false);
});

test('a task is blocked while a dependency is not done', () => {
  const dep = task({ id: 'dep', done: false });
  const t = task({ id: 'a', dependsOn: ['dep'] });
  assert.equal(isTaskBlocked(t, [t, dep]), true);
});

test('a task is unblocked once all dependencies are done', () => {
  const dep = task({ id: 'dep', done: true });
  const t = task({ id: 'a', dependsOn: ['dep'] });
  assert.equal(isTaskBlocked(t, [t, dep]), false);
});

test('a dangling dependency id does not block', () => {
  const t = task({ id: 'a', dependsOn: ['missing'] });
  assert.equal(isTaskBlocked(t, [t]), false);
});

test('a dependency id pointing at a non-task item does not block', () => {
  const other: BoardItem = textItem('note-1');
  const t = task({ id: 'a', dependsOn: ['note-1'] });
  assert.equal(isTaskBlocked(t, [t, other]), false);
});

test('is blocked if any of several dependencies is incomplete', () => {
  const done = task({ id: 'done-dep', done: true });
  const notDone = task({ id: 'open-dep', done: false });
  const t = task({ id: 'a', dependsOn: ['done-dep', 'open-dep'] });
  assert.equal(isTaskBlocked(t, [t, done, notDone]), true);
});
