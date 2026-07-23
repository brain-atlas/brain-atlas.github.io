package standalone

import "os/exec"

func OpenBrowser(rawURL string) error {
	name, args, err := browserCommand(rawURL)
	if err != nil {
		return err
	}
	command := exec.Command(name, args...)
	if err := command.Start(); err != nil {
		return err
	}
	go func() {
		_ = command.Wait()
	}()
	return nil
}
