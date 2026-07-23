//go:build !darwin && !linux && !windows

package standalone

import "fmt"

func browserCommand(string) (string, []string, error) {
	return "", nil, fmt.Errorf("opening the default browser is unsupported on this platform")
}
