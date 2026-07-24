const TRACT_METADATA_KEYS = ['id', 'name', 'stream', 'color', 'np'];

function requireTracts(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new TypeError('tract source must be an object');
  }
  if (!Array.isArray(source.tracts)) throw new TypeError('tract source must contain a tracts array');
  return source.tracts;
}

export function projectTractMetadata(source) {
  const tracts = requireTracts(source);
  return {
    schemaVersion: 1,
    space: source.space,
    source: source.source,
    tracts: tracts.map((tract, index) => {
      if (!tract || typeof tract !== 'object' || Array.isArray(tract)) {
        throw new TypeError(`tract ${index} must be an object`);
      }
      return Object.fromEntries(TRACT_METADATA_KEYS.map((key) => {
        if (!(key in tract)) throw new TypeError(`tract ${index} is missing ${key}`);
        return [key, tract[key]];
      }));
    }),
  };
}

export function assertTractMetadataMatches(source, metadata) {
  const projected = projectTractMetadata(source);
  if (metadata?.schemaVersion !== projected.schemaVersion) throw new Error('tract metadata schema version differs');
  if (JSON.stringify(metadata.space) !== JSON.stringify(projected.space)) throw new Error('tract metadata space differs');
  if (metadata.source !== projected.source) throw new Error('tract metadata source differs');
  if (JSON.stringify(metadata.tracts) !== JSON.stringify(projected.tracts)) throw new Error('tract metadata records differ');
}
