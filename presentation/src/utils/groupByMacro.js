// categorySummary is already ordered contiguously by macro (see fund-analysis's
// merge-output step), so a single pass is enough — no sort needed here.
export const groupByMacro = (categorySummary) => {
  const grouped = [];
  let current = null;
  for (const cat of categorySummary) {
    if (!current || current.macro !== cat.macro) {
      current = { macro: cat.macro, categories: [] };
      grouped.push(current);
    }
    current.categories.push(cat);
  }
  return grouped;
};
