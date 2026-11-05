// node --test backend/cpuCategories.test.js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { getHiddenCpuCategories, setCpuCategoryVisible } from './cpuCategories.js';

let db;

before(async () => {
  db = await open({ filename: ':memory:', driver: sqlite3.Database });
  await db.exec('CREATE TABLE cpu_hidden_categories (category TEXT PRIMARY KEY)');
});

after(() => db.close());

test('何も設定していなければ隠すカテゴリはない', async () => {
  assert.deepEqual(await getHiddenCpuCategories(db), []);
});

test('非表示にしたカテゴリだけが返り、表示に戻すと消える', async () => {
  await setCpuCategoryVisible(db, 'ことわざ', false);
  await setCpuCategoryVisible(db, 'クラウド', false);
  assert.deepEqual((await getHiddenCpuCategories(db)).sort(), ['クラウド', 'ことわざ'].sort());
  await setCpuCategoryVisible(db, 'ことわざ', true);
  assert.deepEqual(await getHiddenCpuCategories(db), ['クラウド']);
  await setCpuCategoryVisible(db, 'クラウド', true);
});

test('同じ操作を繰り返してもエラーにならない', async () => {
  await setCpuCategoryVisible(db, 'ことわざ', false);
  await setCpuCategoryVisible(db, 'ことわざ', false);
  assert.deepEqual(await getHiddenCpuCategories(db), ['ことわざ']);
  await setCpuCategoryVisible(db, 'ことわざ', true);
  await setCpuCategoryVisible(db, 'ことわざ', true);
  assert.deepEqual(await getHiddenCpuCategories(db), []);
});
