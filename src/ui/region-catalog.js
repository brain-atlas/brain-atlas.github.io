function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function createRegionCatalogGroups(regions, streamLabels, query = '') {
  const needle = query.trim().toLocaleLowerCase();
  const groups = new Map();
  for (const region of regions) {
    const searchable = [
      region.name,
      region.atlasId,
      region.sourceName,
      region.parent,
      ...region.hierarchyPaths.flat(),
    ].join(' ').toLocaleLowerCase();
    if (needle && !searchable.includes(needle)) continue;
    const kind = region.catalogStatus;
    const key = `${kind}:${region.stream}`;
    if (!groups.has(key)) {
      const sourceRoot = region.hierarchyPaths[0]?.[0]
        ?? region.stream.replace(/^atlas-/, '').replaceAll('-', ' ');
      groups.set(key, {
        id: key,
        kind,
        label: kind === 'lesson-current' ? streamLabels[region.stream] : titleCase(sourceRoot),
        regions: [],
      });
    }
    groups.get(key).regions.push(region);
  }
  const currentOrder = Object.keys(streamLabels);
  const result = [...groups.values()].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'lesson-current' ? -1 : 1;
    if (a.kind === 'lesson-current') {
      return currentOrder.indexOf(a.id.split(':')[1]) - currentOrder.indexOf(b.id.split(':')[1]);
    }
    return a.label.localeCompare(b.label);
  });
  return Object.freeze(result.map((group) => Object.freeze({
    ...group,
    regions: Object.freeze([...group.regions]),
  })));
}
