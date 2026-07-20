# Node / Vite environment fragment.

# Put locally-installed CLIs (vite, etc.) on PATH.
PATH_add node_modules/.bin

# Install JS dependencies on first entry, or when package-lock.json changes.
# (Mirrors the sibling project's `uv sync` on entry.)
if [[ ! -d node_modules ]] || [[ package-lock.json -nt node_modules/.install-stamp ]]; then
  echo "brain-atlas: installing npm dependencies…"
  if npm install; then
    touch node_modules/.install-stamp
  fi
fi
