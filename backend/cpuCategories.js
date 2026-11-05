// CPU 対戦のカテゴリ選択画面に出すカテゴリの設定。
// 隠すカテゴリだけを DB に持つので、設定していなければ（新しいカテゴリも）表示される。

export async function getHiddenCpuCategories(db) {
  const rows = await db.all('SELECT category FROM cpu_hidden_categories ORDER BY category');
  return rows.map(r => r.category);
}

export async function setCpuCategoryVisible(db, category, visible) {
  if (visible) {
    await db.run('DELETE FROM cpu_hidden_categories WHERE category = ?', [category]);
  } else {
    await db.run('INSERT OR IGNORE INTO cpu_hidden_categories (category) VALUES (?)', [category]);
  }
}
