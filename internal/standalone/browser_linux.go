//go:build linux

package standalone

func browserCommand(rawURL string) (string, []string, error) {
	return "xdg-open", []string{rawURL}, nil
}
