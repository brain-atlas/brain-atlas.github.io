{
  description = "brain-atlas — interactive 3D viewer of the human visual pathway";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            buildInputs = with pkgs; [
              nodejs_22   # Node 22 — runs Vite dev server + the Three.js build
              go          # Builds the CGO-free standalone localhost server
              git
              jq
            ];

            shellHook = ''
              # This project uses direnv for environment management. Block a bare
              # non-interactive `nix develop` (mirrors the sibling project), but
              # allow interactive shells, CI, and direnv evaluation.
              if [ -z "$CI" ] && [ -z "$DIRENV_IN_ENVRC" ] && [ ! -t 0 ]; then
                echo "❌ ERROR: non-interactive 'nix develop' is not supported."
                echo "   Run 'direnv allow' and use your shell, or 'nix develop' in a terminal."
                exit 1
              fi
            '';
          };
        });
    };
}
