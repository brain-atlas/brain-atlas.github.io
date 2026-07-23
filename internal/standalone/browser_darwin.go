//go:build darwin

package standalone

func browserCommand(rawURL string) (string, []string, error) {
	return "open", []string{rawURL}, nil
}
