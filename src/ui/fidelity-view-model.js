const STATUS_ORDER = [
  'data-derived',
  'derived',
  'mirrored',
  'modeled',
  'schematic',
  'illustrative',
  'display-only',
  'none',
];

const STATUS_LABELS = {
  'data-derived': 'Data-derived',
  derived: 'Derived',
  mirrored: 'Mirrored',
  modeled: 'Modeled',
  schematic: 'Schematic',
  illustrative: 'Illustrative',
  'display-only': 'Display-only',
  none: 'None',
};

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function orderedStatuses(statuses, { activity = false } = {}) {
  const unique = new Set(statuses);
  if (activity && unique.size > 1) unique.delete('none');
  return STATUS_ORDER.filter((status) => unique.has(status)).map((status) => STATUS_LABELS[status]);
}

function copyLinks(links) {
  return links.map(({ label, url }) => ({ label, url }));
}

export function createFidelityViewModel({ fidelityIds, entityIds = [] }, catalog) {
  if (!Array.isArray(fidelityIds) || fidelityIds.length === 0) {
    throw new TypeError('at least one fidelity record is required');
  }

  const sourceRecords = fidelityIds.map((id) => {
    const record = catalog.fidelityById?.[id];
    if (!record) throw new Error(`unknown fidelity record: ${id}`);
    return record;
  });
  const records = sourceRecords.map((record) => {
    const subjects = entityIds
      .map((entityId) => catalog.entitiesById?.[entityId])
      .filter((entity) => entity?.fidelity === record.id)
      .map(({ label }) => label);
    return {
      id: record.id,
      subjects,
      geometry: {
        statuses: record.geometry.statuses.map((status) => STATUS_LABELS[status]),
        summary: record.geometry.summary,
      },
      activity: {
        statuses: record.activity.statuses.map((status) => STATUS_LABELS[status]),
        summary: record.activity.summary,
        direction: record.activity.direction,
      },
      supports: [...record.supports],
      assumptions: [...record.assumptions],
      uncertainties: [...record.uncertainties],
      limitations: record.limitations
        .filter(({ material }) => material)
        .map(({ summary, material }) => ({ summary, material })),
      sources: copyLinks(record.sources),
      licenses: copyLinks(record.licenses),
      reviewed: record.reviewed,
    };
  });

  return freezeDeep({
    geometryStatuses: orderedStatuses(sourceRecords.flatMap(({ geometry }) => geometry.statuses)),
    activityStatuses: orderedStatuses(sourceRecords.flatMap(({ activity }) => activity.statuses), { activity: true }),
    records,
  });
}
