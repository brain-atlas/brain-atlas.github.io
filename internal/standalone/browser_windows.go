//go:build windows

package standalone

func browserCommand(rawURL string) (string, []string, error) {
	return "rundll32.exe", []string{"url.dll,FileProtocolHandler", rawURL}, nil
}
