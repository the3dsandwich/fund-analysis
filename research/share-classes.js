// Share-class grouping and representative selection
//
// 1,028 funds = ~514 unique underlying funds
// Share classes differ in: fee tier (A/B/F), distribution (acc vs monthly), currency hedging
// Group by company + AUM (same underlying fund has identical AUM)

const groupByUnderlying = (funds) => {
  const groups = {};

  for (const fund of funds) {
    // Group key: company + rounded AUM (handles minor float differences)
    const aumKey = fund.fundSizeMillionsUsd != null
      ? Math.round(fund.fundSizeMillionsUsd)
      : 'no-aum';
    const key = `${fund.company}|${aumKey}`;

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(fund);
  }

  return groups;
};

const pickRepresentative = (group) => {
  if (group.length === 1) return group[0];

  // Score each fund - higher is better for representative
  const scored = group.map(fund => {
    let score = 0;
    const name = fund.name || '';

    // Prefer accumulation (no distribution keywords)
    const isDistribution = /月配|季配|年配|半年配|分派/.test(name);
    const isAccumulation = /累積|acc/i.test(name);

    if (isAccumulation) score += 10;
    if (!isDistribution) score += 5;

    // Prefer A-class over B/F/other
    // A-class typically has simpler naming or explicit "A股" / "A級"
    if (/A股|A級|A\s|A-|Class A|A class/i.test(name)) score += 3;
    // Penalize B/C/F classes
    if (/B股|B級|Class B|F股|F級|Class F/i.test(name)) score -= 3;

    // Penalize hedged variants (we want the base USD class)
    if (/對沖|避險|hedg/i.test(name)) score -= 2;

    // Tiebreaker: higher NAV (accumulation classes have higher NAV)
    score += (fund.nav || 0) * 0.001;

    return { fund, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].fund;
};

const assignShareClassInfo = (funds) => {
  const groups = groupByUnderlying(funds);

  // Build lookup: fund ID → group info
  const fundInfo = {};

  for (const [groupKey, group] of Object.entries(groups)) {
    const rep = pickRepresentative(group);

    for (const fund of group) {
      fundInfo[fund.id] = {
        underlyingId: groupKey,
        isRepresentative: fund.id === rep.id,
        siblingCount: group.length,
      };
    }
  }

  return fundInfo;
};

module.exports = { groupByUnderlying, pickRepresentative, assignShareClassInfo };
