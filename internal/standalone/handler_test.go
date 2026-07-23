package standalone

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"
	"time"
)

const testSessionToken = "test-session-token"

type fakeLifecycleRegistry struct {
	joined chan struct{}
	left   chan struct{}
}

func newFakeLifecycleRegistry() *fakeLifecycleRegistry {
	return &fakeLifecycleRegistry{joined: make(chan struct{}), left: make(chan struct{})}
}

func (registry *fakeLifecycleRegistry) Join() func() {
	close(registry.joined)
	return func() { close(registry.left) }
}

func testSite() fstest.MapFS {
	return fstest.MapFS{
		"index.html":           {Data: []byte("<!doctype html><title>Brain Atlas</title>")},
		"assets/app-abc123.js": {Data: []byte("export default true")},
		"data/model.json":      {Data: []byte(`{"ok":true}`)},
		"models/brain.glb":     {Data: []byte("glTF")},
		"data/region.obj":      {Data: []byte("o region")},
		"DATA_LICENSES.md":     {Data: []byte("# Data licenses")},
		"CITATION.cff":         {Data: []byte("cff-version: 1.2.0")},
		"favicon.ico":          {Data: []byte("icon")},
		".gitkeep":             {Data: nil},
	}
}

func newTestHandler(t *testing.T, lifecycle lifecycleRegistry) http.Handler {
	t.Helper()
	handler, err := NewHandler(HandlerConfig{
		Site:         testSite(),
		Lifecycle:    lifecycle,
		SessionToken: testSessionToken,
	})
	if err != nil {
		t.Fatalf("NewHandler: %v", err)
	}
	return handler
}

func TestHandlerRootSetsStrictSessionCookieAndSecurityHeaders(t *testing.T) {
	handler := newTestHandler(t, newFakeLifecycleRegistry())
	request := httptest.NewRequest(http.MethodGet, "http://127.0.0.1:8080/?lesson=retina-to-v1", nil)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status %d, want 200", response.Code)
	}
	if response.Body.String() != "<!doctype html><title>Brain Atlas</title>" {
		t.Fatalf("unexpected root body %q", response.Body.String())
	}
	cookies := response.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("received %d cookies, want 1", len(cookies))
	}
	cookie := cookies[0]
	if cookie.Name != sessionCookieName || cookie.Value != testSessionToken {
		t.Fatalf("cookie %s=%q, want %s=%q", cookie.Name, cookie.Value, sessionCookieName, testSessionToken)
	}
	if !cookie.HttpOnly || cookie.SameSite != http.SameSiteStrictMode || cookie.Path != "/" {
		t.Fatalf("cookie flags = HttpOnly:%v SameSite:%v Path:%q", cookie.HttpOnly, cookie.SameSite, cookie.Path)
	}
	if got := response.Header().Get("Cache-Control"); got != "no-cache" {
		t.Fatalf("Cache-Control %q, want no-cache", got)
	}
	if got := response.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("X-Content-Type-Options %q, want nosniff", got)
	}
	if got := response.Header().Get("Content-Security-Policy"); got == "" {
		t.Fatal("missing Content-Security-Policy")
	}
}

func TestHandlerServesStaticTypesAndCachePolicies(t *testing.T) {
	handler := newTestHandler(t, newFakeLifecycleRegistry())
	tests := []struct {
		path        string
		contentType string
		cache       string
	}{
		{"/assets/app-abc123.js", "text/javascript; charset=utf-8", "no-cache"},
		{"/data/model.json", "application/json", "no-cache"},
		{"/models/brain.glb", "model/gltf-binary", "no-cache"},
		{"/data/region.obj", "text/plain; charset=utf-8", "no-cache"},
		{"/DATA_LICENSES.md", "text/markdown; charset=utf-8", "no-cache"},
		{"/CITATION.cff", "text/yaml; charset=utf-8", "no-cache"},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "http://127.0.0.1:8080"+tt.path, nil)
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)

			if response.Code != http.StatusOK {
				t.Fatalf("status %d, want 200", response.Code)
			}
			if got := response.Header().Get("Content-Type"); got != tt.contentType {
				t.Fatalf("Content-Type %q, want %q", got, tt.contentType)
			}
			if got := response.Header().Get("Cache-Control"); got != tt.cache {
				t.Fatalf("Cache-Control %q, want %q", got, tt.cache)
			}
		})
	}
}

func TestHandlerRejectsUnknownPathsAndUnsupportedMethods(t *testing.T) {
	handler := newTestHandler(t, newFakeLifecycleRegistry())

	for _, requestPath := range []string{"/missing", "/.gitkeep"} {
		unknown := httptest.NewRecorder()
		handler.ServeHTTP(unknown, httptest.NewRequest(http.MethodGet, "http://127.0.0.1:8080"+requestPath, nil))
		if unknown.Code != http.StatusNotFound {
			t.Fatalf("unknown path %q status %d, want 404", requestPath, unknown.Code)
		}
	}

	post := httptest.NewRecorder()
	handler.ServeHTTP(post, httptest.NewRequest(http.MethodPost, "http://127.0.0.1:8080/", nil))
	if post.Code != http.StatusMethodNotAllowed {
		t.Fatalf("POST status %d, want 405", post.Code)
	}
	if got := post.Header().Get("Allow"); got != "GET, HEAD" {
		t.Fatalf("Allow %q, want GET, HEAD", got)
	}
}

func TestLifecycleEndpointRequiresSessionCookie(t *testing.T) {
	lifecycle := newFakeLifecycleRegistry()
	handler := newTestHandler(t, lifecycle)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "http://127.0.0.1:8080"+lifecyclePath, nil))

	if response.Code != http.StatusForbidden {
		t.Fatalf("status %d, want 403", response.Code)
	}
	select {
	case <-lifecycle.joined:
		t.Fatal("unauthenticated request joined lifecycle")
	default:
	}
}

func TestLifecycleEndpointTracksRequestUntilCancellation(t *testing.T) {
	lifecycle := newFakeLifecycleRegistry()
	server := httptest.NewServer(newTestHandler(t, lifecycle))
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, server.URL+lifecyclePath, nil)
	if err != nil {
		t.Fatal(err)
	}
	request.AddCookie(&http.Cookie{Name: sessionCookieName, Value: testSessionToken})

	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatalf("lifecycle request: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(response.Body)
		t.Fatalf("status %d, want 200: %s", response.StatusCode, body)
	}

	select {
	case <-lifecycle.joined:
	case <-time.After(time.Second):
		t.Fatal("lifecycle request did not register")
	}

	cancel()
	response.Body.Close()
	select {
	case <-lifecycle.left:
	case <-time.After(time.Second):
		t.Fatal("lifecycle request did not leave after cancellation")
	}
}

func TestNewHandlerRejectsMissingIndex(t *testing.T) {
	_, err := NewHandler(HandlerConfig{
		Site:         fstest.MapFS{"asset.js": {Data: []byte("asset")}},
		Lifecycle:    newFakeLifecycleRegistry(),
		SessionToken: testSessionToken,
	})
	if err == nil {
		t.Fatal("NewHandler accepted a site without index.html")
	}
}
