package standalone

import (
	"crypto/subtle"
	"errors"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

const (
	lifecyclePath         = "/_brain-atlas/lifecycle"
	sessionCookieName     = "brain_atlas_session"
	contentSecurityPolicy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
)

type lifecycleRegistry interface {
	Join() func()
}

type HandlerConfig struct {
	Site         fs.FS
	Lifecycle    lifecycleRegistry
	SessionToken string
}

type Handler struct {
	files        http.Handler
	lifecycle    lifecycleRegistry
	sessionToken string
}

func NewHandler(config HandlerConfig) (*Handler, error) {
	if config.Site == nil {
		return nil, errors.New("site filesystem is required")
	}
	if _, err := fs.Stat(config.Site, "index.html"); err != nil {
		return nil, errors.New("embedded site is missing index.html")
	}
	if config.Lifecycle == nil {
		return nil, errors.New("lifecycle registry is required")
	}
	if config.SessionToken == "" {
		return nil, errors.New("session token is required")
	}

	return &Handler{
		files:        http.FileServer(http.FS(config.Site)),
		lifecycle:    config.Lifecycle,
		sessionToken: config.SessionToken,
	}, nil
}

func (handler *Handler) ServeHTTP(response http.ResponseWriter, request *http.Request) {
	setSecurityHeaders(response.Header())

	if request.URL.Path == lifecyclePath {
		handler.serveLifecycle(response, request)
		return
	}
	if request.Method != http.MethodGet && request.Method != http.MethodHead {
		response.Header().Set("Allow", "GET, HEAD")
		http.Error(response, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	for _, segment := range strings.Split(request.URL.Path, "/") {
		if strings.HasPrefix(segment, ".") {
			http.NotFound(response, request)
			return
		}
	}

	if request.URL.Path == "/" || request.URL.Path == "/index.html" {
		http.SetCookie(response, &http.Cookie{
			Name:     sessionCookieName,
			Value:    handler.sessionToken,
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteStrictMode,
		})
	}
	setStaticHeaders(response.Header(), request.URL.Path)
	handler.files.ServeHTTP(response, request)
}

func (handler *Handler) serveLifecycle(response http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		response.Header().Set("Allow", "GET")
		http.Error(response, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := request.Cookie(sessionCookieName)
	if err != nil || subtle.ConstantTimeCompare([]byte(cookie.Value), []byte(handler.sessionToken)) != 1 {
		http.Error(response, "forbidden", http.StatusForbidden)
		return
	}

	flusher, ok := response.(http.Flusher)
	if !ok {
		http.Error(response, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	leave := handler.lifecycle.Join()
	defer leave()

	response.Header().Set("Cache-Control", "no-store")
	response.Header().Set("Content-Type", "text/plain; charset=utf-8")
	response.Header().Set("X-Accel-Buffering", "no")
	response.WriteHeader(http.StatusOK)
	_, _ = response.Write([]byte("connected\n"))
	flusher.Flush()
	<-request.Context().Done()
}

func setSecurityHeaders(header http.Header) {
	header.Set("Content-Security-Policy", contentSecurityPolicy)
	header.Set("Referrer-Policy", "no-referrer")
	header.Set("X-Content-Type-Options", "nosniff")
	header.Set("X-Frame-Options", "DENY")
}

func setStaticHeaders(header http.Header, requestPath string) {
	header.Set("Cache-Control", "no-cache")

	switch strings.ToLower(path.Ext(requestPath)) {
	case ".js":
		header.Set("Content-Type", "text/javascript; charset=utf-8")
	case ".json":
		header.Set("Content-Type", "application/json")
	case ".glb":
		header.Set("Content-Type", "model/gltf-binary")
	case ".obj":
		header.Set("Content-Type", "text/plain; charset=utf-8")
	case ".md":
		header.Set("Content-Type", "text/markdown; charset=utf-8")
	case ".cff":
		header.Set("Content-Type", "text/yaml; charset=utf-8")
	}
}
