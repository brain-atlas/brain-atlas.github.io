package standalone

import (
	"reflect"
	"runtime"
	"testing"
)

func TestBrowserCommandUsesPlatformDefaultURLHandler(t *testing.T) {
	const rawURL = "http://127.0.0.1:5180/"
	name, args, err := browserCommand(rawURL)
	if err != nil {
		t.Fatalf("browserCommand: %v", err)
	}

	var wantName string
	var wantArgs []string
	switch runtime.GOOS {
	case "darwin":
		wantName, wantArgs = "open", []string{rawURL}
	case "linux":
		wantName, wantArgs = "xdg-open", []string{rawURL}
	case "windows":
		wantName, wantArgs = "rundll32.exe", []string{"url.dll,FileProtocolHandler", rawURL}
	default:
		t.Skip("unsupported browser-launch platform")
	}
	if name != wantName || !reflect.DeepEqual(args, wantArgs) {
		t.Fatalf("browserCommand = %q %q, want %q %q", name, args, wantName, wantArgs)
	}
}
