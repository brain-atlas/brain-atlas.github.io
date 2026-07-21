export function createDiagnostic(code, message, {
  line = 1,
  column = 1,
  path = '',
} = {}) {
  return {
    code,
    message,
    line,
    column,
    path,
  };
}

function errorPath(error) {
  if (error.keyword === 'additionalProperties') {
    return `${error.instancePath}/${error.params.additionalProperty}`;
  }
  if (error.keyword === 'required') {
    return `${error.instancePath}/${error.params.missingProperty}`;
  }
  return error.instancePath;
}

export function schemaErrorsToDiagnostics(scope, errors = [], {
  origin = { line: 1, column: 1 },
  locate,
} = {}) {
  return errors.map((error) => {
    const path = errorPath(error);
    const location = locate?.(path) ?? origin;
    return createDiagnostic(
      `${scope}.schema.${error.keyword}`,
      error.message ?? 'is invalid',
      { ...location, path },
    );
  });
}
