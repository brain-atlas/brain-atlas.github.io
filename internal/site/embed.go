package site

import (
	"embed"
	"fmt"
	"io/fs"
)

//go:embed all:dist
var embedded embed.FS

func FS() (fs.FS, error) {
	return siteFS(embedded)
}

func siteFS(root fs.FS) (fs.FS, error) {
	site, err := fs.Sub(root, "dist")
	if err != nil {
		return nil, fmt.Errorf("open embedded site: %w", err)
	}
	info, err := fs.Stat(site, "index.html")
	if err != nil || info.IsDir() {
		return nil, fmt.Errorf("embedded site is missing index.html; run npm run build:standalone")
	}
	return site, nil
}
