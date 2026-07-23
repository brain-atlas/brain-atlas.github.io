const QUERY_MODES = new Set(['all', 'touches-any', 'connects-within', 'connects-between']);
const SPECIAL_SELECTOR_CODES = new Map([
  ['endpoint.unknown', -1],
  ['endpoint.ambiguous', -2],
]);
const INDEX_DATA = new WeakMap();

export const ALL_FIBRE_FILTER = Object.freeze({
  preset: null,
  mode: 'all',
  setA: Object.freeze([]),
  setB: Object.freeze([]),
});

function exactKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join('\0') === [...expected].sort().join('\0');
}

function requireInteger(value, label, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${label} must be an integer in range`);
  }
}

function qualityCode(statusClass) {
  if (statusClass === 'known') return 0;
  if (statusClass === 'unknown') return 1;
  if (statusClass === 'ambiguous') return 2;
  throw new RangeError(`unknown endpoint status class: ${statusClass}`);
}

function qualityName(code) {
  return ['known', 'unknown', 'ambiguous'][code];
}

function decodeEndpoint(tuple, tables, label) {
  if (!Array.isArray(tuple) || tuple.length !== 4) {
    throw new TypeError(`${label} must be a four-integer endpoint tuple`);
  }
  tuple.forEach((value, index) => requireInteger(value, `${label}[${index}]`));
  const [statusIndex, entityIndex, candidateIndex] = tuple;
  if (statusIndex >= tables.statuses.length) throw new RangeError(`${label} status index is out of range`);
  if (entityIndex >= tables.entities.length) throw new RangeError(`${label} entity index is out of range`);
  if (candidateIndex >= tables.candidateSets.length) throw new RangeError(`${label} candidate index is out of range`);
  const statusClass = tables.statuses[statusIndex].class;
  if (statusClass === 'known' && entityIndex === 0) {
    throw new TypeError(`${label} known endpoint requires an entity`);
  }
  if (statusClass !== 'known' && entityIndex !== 0) {
    throw new TypeError(`${label} ${statusClass} endpoint cannot assert an entity`);
  }
  return statusClass === 'known' ? entityIndex : SPECIAL_SELECTOR_CODES.get(`endpoint.${statusClass}`);
}

function decodeGroup(pairs, tables, label) {
  if (!Array.isArray(pairs)) throw new TypeError(`${label} endpoint group must be an array`);
  const endpointCodes = new Int16Array(pairs.length * 2);
  const quality = new Uint8Array(pairs.length);
  for (let index = 0; index < pairs.length; index++) {
    const pair = pairs[index];
    if (!Array.isArray(pair) || pair.length !== 2) {
      throw new TypeError(`${label}[${index}] must contain stored geometry endpoints A and B`);
    }
    const a = decodeEndpoint(pair[0], tables, `${label}[${index}][0]`);
    const b = decodeEndpoint(pair[1], tables, `${label}[${index}][1]`);
    endpointCodes[index * 2] = a;
    endpointCodes[index * 2 + 1] = b;
    const aQuality = qualityCode(tables.statuses[pair[0][0]].class);
    const bQuality = qualityCode(tables.statuses[pair[1][0]].class);
    quality[index] = aQuality === 2 || bQuality === 2 ? 2 : Math.max(aQuality, bQuality);
  }
  return { count: pairs.length, endpointCodes, quality };
}

function validateTables(artifact) {
  if (artifact?.schemaVersion !== 1) throw new TypeError('fibre endpoint artifact schemaVersion must be 1');
  if (!Array.isArray(artifact.statuses) || artifact.statuses.length === 0) {
    throw new TypeError('fibre endpoint artifact requires status records');
  }
  const statusIds = new Set();
  for (const [index, status] of artifact.statuses.entries()) {
    if (!exactKeys(status, ['id', 'class', 'method', 'confidence'])) {
      throw new TypeError(`fibre endpoint status ${index} has an invalid shape`);
    }
    if (typeof status.id !== 'string' || statusIds.has(status.id)) {
      throw new TypeError(`fibre endpoint status ${index} has an invalid or duplicate ID`);
    }
    qualityCode(status.class);
    statusIds.add(status.id);
  }
  if (!Array.isArray(artifact.entities) || artifact.entities[0] !== null) {
    throw new TypeError('fibre endpoint entity table must begin with null');
  }
  const entityIds = new Set();
  for (let index = 1; index < artifact.entities.length; index++) {
    const id = artifact.entities[index];
    if (typeof id !== 'string' || !id.startsWith('region.') || entityIds.has(id)) {
      throw new TypeError(`fibre endpoint entity ${index} is invalid or duplicate`);
    }
    entityIds.add(id);
  }
  if (!Array.isArray(artifact.candidateSets) || artifact.candidateSets.length === 0
    || !Array.isArray(artifact.candidateSets[0]) || artifact.candidateSets[0].length !== 0) {
    throw new TypeError('fibre endpoint candidate table must begin with an empty set');
  }
  for (const [candidateIndex, candidates] of artifact.candidateSets.entries()) {
    if (!Array.isArray(candidates)) throw new TypeError(`candidate set ${candidateIndex} must be an array`);
    let prior = 0;
    for (const entityIndex of candidates) {
      requireInteger(entityIndex, `candidate set ${candidateIndex}`, 1, artifact.entities.length - 1);
      if (entityIndex <= prior) throw new TypeError(`candidate set ${candidateIndex} must be sorted and unique`);
      prior = entityIndex;
    }
  }
  return { statuses: artifact.statuses, entities: artifact.entities, candidateSets: artifact.candidateSets, entityIds };
}

function countQuality(groups) {
  const counts = { known: 0, unknown: 0, ambiguous: 0 };
  for (const group of groups) {
    for (const code of group.quality) counts[qualityName(code)]++;
  }
  return counts;
}

export function createFibreEndpointIndex(artifact) {
  const tables = validateTables(artifact);
  if (!Array.isArray(artifact.association)) throw new TypeError('fibre endpoint association groups must be an array');
  const tractIds = new Set();
  const associationData = artifact.association.map((tract, tractIndex) => {
    if (!exactKeys(tract, ['id', 'L', 'R']) || typeof tract.id !== 'string' || tractIds.has(tract.id)) {
      throw new TypeError(`association endpoint group ${tractIndex} is invalid or duplicate`);
    }
    tractIds.add(tract.id);
    return {
      id: tract.id,
      L: decodeGroup(tract.L, tables, `association.${tract.id}.L`),
      R: decodeGroup(tract.R, tables, `association.${tract.id}.R`),
    };
  });
  if (!exactKeys(artifact.swm, ['endpoints', 'hemispheres'])
    || typeof artifact.swm.hemispheres !== 'string') {
    throw new TypeError('SWM endpoint record has an invalid shape');
  }
  const swmData = decodeGroup(artifact.swm.endpoints, tables, 'swm');
  if (artifact.swm.hemispheres.length !== swmData.count || /[^LR]/.test(artifact.swm.hemispheres)) {
    throw new TypeError('SWM endpoint hemisphere string is invalid');
  }

  const associationGroups = associationData.flatMap(({ L, R }) => [L, R]);
  const associationFibres = associationGroups.reduce((sum, group) => sum + group.count, 0);
  const swmFibres = swmData.count;
  const quality = countQuality([...associationGroups, swmData]);
  const counts = artifact.counts;
  if (!exactKeys(counts, ['associationFibres', 'swmFibres', 'endpoints', 'fibreQuality'])
    || associationFibres !== counts.associationFibres
    || swmFibres !== counts.swmFibres
    || (associationFibres + swmFibres) * 2 !== counts.endpoints
    || !exactKeys(counts.fibreQuality, ['known', 'unknown', 'ambiguous'])
    || Object.keys(quality).some((key) => quality[key] !== counts.fibreQuality[key])) {
    throw new TypeError('fibre endpoint artifact count or quality summary is invalid');
  }
  if (!Array.isArray(artifact.presets)) throw new TypeError('fibre endpoint preset audits must be an array');
  const presetIds = new Set();
  for (const audit of artifact.presets) {
    if (!exactKeys(audit, ['id', 'included', 'includedQuality', 'populationQuality'])
      || typeof audit.id !== 'string' || presetIds.has(audit.id)) {
      throw new TypeError('fibre endpoint preset audit is invalid or duplicate');
    }
    const included = audit.included;
    const includedQuality = audit.includedQuality;
    const populationQuality = audit.populationQuality;
    if (!exactKeys(included, ['association', 'swm', 'total', 'L', 'R'])
      || !exactKeys(includedQuality, ['known', 'unknown', 'ambiguous'])
      || !exactKeys(populationQuality, ['known', 'unknown', 'ambiguous'])
      || Object.values(included).some((value) => !Number.isSafeInteger(value) || value < 0)
      || Object.values(includedQuality).some((value) => !Number.isSafeInteger(value) || value < 0)
      || Object.values(populationQuality).some((value) => !Number.isSafeInteger(value) || value < 0)
      || included.association + included.swm !== included.total
      || included.L + included.R !== included.total
      || Object.values(includedQuality).reduce((sum, value) => sum + value, 0) !== included.total
      || Object.values(populationQuality).reduce((sum, value) => sum + value, 0) !== associationFibres + swmFibres
      || Object.keys(populationQuality).some((key) => populationQuality[key] !== counts.fibreQuality[key])) {
      throw new TypeError(`fibre endpoint preset audit counts are invalid: ${audit.id}`);
    }
    presetIds.add(audit.id);
  }

  const association = associationData.map(({ id, L, R }) => Object.freeze({
    id,
    L: Object.freeze({ count: L.count }),
    R: Object.freeze({ count: R.count }),
  }));
  const publicIndex = Object.freeze({
    schemaVersion: 1,
    association: Object.freeze(association),
    swm: Object.freeze({ count: swmData.count, hemispheres: artifact.swm.hemispheres }),
    selectorIds: Object.freeze([...tables.entityIds, ...SPECIAL_SELECTOR_CODES.keys()].sort()),
    presetIds: Object.freeze([...presetIds].sort()),
  });
  INDEX_DATA.set(publicIndex, { tables, associationData, swmData });
  return publicIndex;
}

function requireIndex(index) {
  const data = INDEX_DATA.get(index);
  if (!data) throw new TypeError('fibre endpoint index was not created by createFibreEndpointIndex');
  return data;
}

function sortedSelectors(value, label, allowed) {
  if (!Array.isArray(value) || value.some((selector) => typeof selector !== 'string')) {
    throw new TypeError(`${label} selectors must be an array of stable IDs`);
  }
  if (new Set(value).size !== value.length) throw new TypeError(`${label} selectors must be unique`);
  for (const selector of value) {
    if (!allowed.has(selector)) throw new RangeError(`unknown fibre endpoint selector: ${selector}`);
  }
  return [...value].sort((a, b) => a.localeCompare(b));
}

export function normalizeFibreFilterQuery(query, index) {
  requireIndex(index);
  if (!exactKeys(query, ['preset', 'mode', 'setA', 'setB'])) {
    throw new TypeError('fibre endpoint query has invalid keys or shape');
  }
  if (query.preset !== null && (typeof query.preset !== 'string' || !index.presetIds.includes(query.preset))) {
    throw new RangeError(`unknown fibre endpoint preset: ${query.preset}`);
  }
  if (!QUERY_MODES.has(query.mode)) throw new RangeError(`unknown fibre endpoint query mode: ${query.mode}`);
  const allowed = new Set(index.selectorIds);
  const setA = sortedSelectors(query.setA, 'setA', allowed);
  const setB = sortedSelectors(query.setB, 'setB', allowed);
  if (query.mode === 'all' && (setA.length || setB.length)) {
    throw new TypeError('all mode requires empty setA and setB');
  }
  if ((query.mode === 'touches-any' || query.mode === 'connects-within') && (!setA.length || setB.length)) {
    throw new TypeError(`${query.mode} mode requires nonempty setA and empty setB`);
  }
  if (query.mode === 'connects-between' && (!setA.length || !setB.length)) {
    throw new TypeError('connects-between mode requires nonempty setA and setB');
  }
  return Object.freeze({
    preset: query.preset,
    mode: query.mode,
    setA: Object.freeze(setA),
    setB: Object.freeze(setB),
  });
}

function selectorCodes(selectors, entities) {
  const entityIndex = new Map(entities.map((id, index) => [id, index]));
  return new Set(selectors.map((selector) => (
    SPECIAL_SELECTOR_CODES.get(selector) ?? entityIndex.get(selector)
  )));
}

function fibreMatches(a, b, query, setA, setB) {
  if (query.mode === 'all') return true;
  const aInA = setA.has(a);
  const bInA = setA.has(b);
  if (query.mode === 'touches-any') return aInA || bInA;
  if (query.mode === 'connects-within') return aInA && bInA;
  return (aInA && setB.has(b)) || (setB.has(a) && bInA);
}

function emptyCounts() {
  return { association: 0, swm: 0, total: 0, L: 0, R: 0 };
}

function emptyQuality() {
  return { known: 0, unknown: 0, ambiguous: 0 };
}

function filterGroup(group, enabled, query, setA, setB, selected, population, selectedQuality, populationQuality, kind, hemisphere) {
  const mask = new Uint8Array(group.count);
  if (!enabled) return mask;
  population[kind] += group.count;
  population.total += group.count;
  population[hemisphere] += group.count;
  for (let index = 0; index < group.count; index++) {
    const quality = qualityName(group.quality[index]);
    populationQuality[quality]++;
    const include = fibreMatches(
      group.endpointCodes[index * 2],
      group.endpointCodes[index * 2 + 1],
      query,
      setA,
      setB,
    );
    if (!include) continue;
    mask[index] = 1;
    selected[kind]++;
    selected.total++;
    selected[hemisphere]++;
    selectedQuality[quality]++;
  }
  return mask;
}

export function filterFibreEndpoints(index, query, hemispheres) {
  const data = requireIndex(index);
  const normalized = normalizeFibreFilterQuery(query, index);
  if (!exactKeys(hemispheres, ['L', 'R']) || typeof hemispheres.L !== 'boolean' || typeof hemispheres.R !== 'boolean') {
    throw new TypeError('fibre endpoint hemisphere policy requires boolean L and R');
  }
  const setA = selectorCodes(normalized.setA, data.tables.entities);
  const setB = selectorCodes(normalized.setB, data.tables.entities);
  const selected = emptyCounts();
  const population = emptyCounts();
  const selectedQuality = emptyQuality();
  const populationQuality = emptyQuality();
  const association = data.associationData.map((tract) => Object.freeze({
    id: tract.id,
    L: filterGroup(tract.L, hemispheres.L, normalized, setA, setB, selected, population, selectedQuality, populationQuality, 'association', 'L'),
    R: filterGroup(tract.R, hemispheres.R, normalized, setA, setB, selected, population, selectedQuality, populationQuality, 'association', 'R'),
  }));

  const swmMask = new Uint8Array(data.swmData.count);
  for (let indexValue = 0; indexValue < data.swmData.count; indexValue++) {
    const hemisphere = index.swm.hemispheres[indexValue];
    if (!hemispheres[hemisphere]) continue;
    population.swm++;
    population.total++;
    population[hemisphere]++;
    const quality = qualityName(data.swmData.quality[indexValue]);
    populationQuality[quality]++;
    const include = fibreMatches(
      data.swmData.endpointCodes[indexValue * 2],
      data.swmData.endpointCodes[indexValue * 2 + 1],
      normalized,
      setA,
      setB,
    );
    if (!include) continue;
    swmMask[indexValue] = 1;
    selected.swm++;
    selected.total++;
    selected[hemisphere]++;
    selectedQuality[quality]++;
  }

  return Object.freeze({
    query: normalized,
    association: Object.freeze(association),
    swm: swmMask,
    summary: Object.freeze({
      selected: Object.freeze(selected),
      population: Object.freeze(population),
      selectedQuality: Object.freeze(selectedQuality),
      populationQuality: Object.freeze(populationQuality),
    }),
  });
}

export function formatFibreFilterSummary(result) {
  const selected = result?.summary?.selected;
  const population = result?.summary?.population;
  const quality = result?.summary?.selectedQuality;
  if (!selected || !population || !quality) {
    throw new TypeError('fibre endpoint result requires selected, population, and quality summaries');
  }
  const activeHemispheres = [population.L > 0 ? 'left' : null, population.R > 0 ? 'right' : null]
    .filter(Boolean);
  const hemisphereText = activeHemispheres.length === 2
    ? 'left and right'
    : (activeHemispheres[0] ?? 'none');
  return `${selected.total.toLocaleString('en-US')} of ${population.total.toLocaleString('en-US')} fibres match: `
    + `${selected.association.toLocaleString('en-US')} association and ${selected.swm.toLocaleString('en-US')} superficial. `
    + `Active hemispheres: ${hemisphereText}. `
    + `Endpoint assignment quality among matches: ${quality.known.toLocaleString('en-US')} known, `
    + `${quality.unknown.toLocaleString('en-US')} unknown, and ${quality.ambiguous.toLocaleString('en-US')} ambiguous.`;
}

function coordinate(point, axis) {
  const value = Array.isArray(point) ? point[axis] : point[['x', 'y', 'z'][axis]];
  if (!Number.isFinite(value)) throw new TypeError('fibre point coordinates must be finite');
  return value;
}

function validateWriterInputs(polylines, mask, target, pointsPerSelected) {
  if (!Array.isArray(polylines) || !(mask instanceof Uint8Array) || mask.length !== polylines.length) {
    throw new TypeError('fibre geometry mask must be a Uint8Array matching the polylines');
  }
  if (!(target instanceof Float32Array)) throw new TypeError('fibre geometry target must be a Float32Array');
  let points = 0;
  for (let index = 0; index < polylines.length; index++) {
    if (!mask[index]) continue;
    const polyline = polylines[index];
    if (!Array.isArray(polyline) || polyline.length === 0) throw new TypeError('selected fibre polyline must contain points');
    points += pointsPerSelected(polyline);
  }
  if (target.length < points * 3) throw new RangeError('fibre geometry target capacity is too small');
  return points;
}

function writePoint(target, offset, point) {
  target[offset] = coordinate(point, 0);
  target[offset + 1] = coordinate(point, 1);
  target[offset + 2] = coordinate(point, 2);
  return offset + 3;
}

export function writeFilteredLineSegments(polylines, mask, target) {
  const vertexCount = validateWriterInputs(polylines, mask, target, (polyline) => Math.max(0, polyline.length - 1) * 2);
  let offset = 0;
  for (let fibreIndex = 0; fibreIndex < polylines.length; fibreIndex++) {
    if (!mask[fibreIndex]) continue;
    const polyline = polylines[fibreIndex];
    for (let pointIndex = 0; pointIndex < polyline.length - 1; pointIndex++) {
      offset = writePoint(target, offset, polyline[pointIndex]);
      offset = writePoint(target, offset, polyline[pointIndex + 1]);
    }
  }
  return vertexCount;
}

export function writeFilteredEndpointPositions(polylines, mask, target) {
  const pointCount = validateWriterInputs(polylines, mask, target, () => 2);
  let offset = 0;
  for (let fibreIndex = 0; fibreIndex < polylines.length; fibreIndex++) {
    if (!mask[fibreIndex]) continue;
    const polyline = polylines[fibreIndex];
    offset = writePoint(target, offset, polyline[0]);
    offset = writePoint(target, offset, polyline[polyline.length - 1]);
  }
  return pointCount;
}
