package standalone

import (
	"sync"
	"time"
)

type lifecycleTimer interface {
	Stop() bool
}

type lifecycleAfterFunc func(time.Duration, func()) lifecycleTimer

type Lifecycle struct {
	mu         sync.Mutex
	grace      time.Duration
	afterFunc  lifecycleAfterFunc
	done       chan struct{}
	active     int
	armed      bool
	stopped    bool
	generation uint64
	timer      lifecycleTimer
}

func NewLifecycle(grace time.Duration) *Lifecycle {
	return newLifecycle(grace, func(duration time.Duration, fire func()) lifecycleTimer {
		return time.AfterFunc(duration, fire)
	})
}

func newLifecycle(grace time.Duration, afterFunc lifecycleAfterFunc) *Lifecycle {
	return &Lifecycle{
		grace:     grace,
		afterFunc: afterFunc,
		done:      make(chan struct{}),
	}
}

func (lifecycle *Lifecycle) Done() <-chan struct{} {
	return lifecycle.done
}

func (lifecycle *Lifecycle) Join() func() {
	lifecycle.mu.Lock()
	if lifecycle.stopped {
		lifecycle.mu.Unlock()
		return func() {}
	}

	lifecycle.armed = true
	lifecycle.active++
	lifecycle.generation++
	if lifecycle.timer != nil {
		lifecycle.timer.Stop()
		lifecycle.timer = nil
	}
	lifecycle.mu.Unlock()

	var once sync.Once
	return func() {
		once.Do(lifecycle.leave)
	}
}

func (lifecycle *Lifecycle) leave() {
	lifecycle.mu.Lock()
	defer lifecycle.mu.Unlock()

	if lifecycle.stopped || lifecycle.active == 0 {
		return
	}
	lifecycle.active--
	if !lifecycle.armed || lifecycle.active != 0 {
		return
	}

	lifecycle.generation++
	generation := lifecycle.generation
	lifecycle.timer = lifecycle.afterFunc(lifecycle.grace, func() {
		lifecycle.finish(generation)
	})
}

func (lifecycle *Lifecycle) finish(generation uint64) {
	lifecycle.mu.Lock()
	defer lifecycle.mu.Unlock()

	if lifecycle.stopped || lifecycle.active != 0 || lifecycle.generation != generation {
		return
	}
	lifecycle.stopped = true
	lifecycle.timer = nil
	close(lifecycle.done)
}
