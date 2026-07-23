package site

import (
	"io/fs"
	"testing"
	"testing/fstest"
)

func TestSiteFSReturnsDistRoot(t *testing.T) {
	root := fstest.MapFS{
		"dist/index.html":    {Data: []byte("Brain Atlas")},
		"dist/assets/app.js": {Data: []byte("app")},
	}

	site, err := siteFS(root)
	if err != nil {
		t.Fatalf("siteFS: %v", err)
	}
	body, err := fs.ReadFile(site, "index.html")
	if err != nil {
		t.Fatalf("read index: %v", err)
	}
	if string(body) != "Brain Atlas" {
		t.Fatalf("index body %q", body)
	}
}

func TestSiteFSRejectsMissingIndex(t *testing.T) {
	_, err := siteFS(fstest.MapFS{
		"dist/.gitkeep": {Data: nil},
	})
	if err == nil {
		t.Fatal("siteFS accepted embed staging without index.html")
	}
}
