package standalone

import (
	"sync"
	"testing"
	"time"
)

type fakeTimer struct {
	mu      sync.Mutex
	stopped bool
	fire    func()
}

func (timer *fakeTimer) Stop() bool {
	timer.mu.Lock()
	defer timer.mu.Unlock()
	wasActive := !timer.stopped
	timer.stopped = true
	return wasActive
}

func (timer *fakeTimer) FireEvenIfStopped() {
	timer.mu.Lock()
	fire := timer.fire
	timer.mu.Unlock()
	fire()
}

type fakeScheduler struct {
	durations []time.Duration
	timers    []*fakeTimer
}

func (scheduler *fakeScheduler) AfterFunc(duration time.Duration, fire func()) lifecycleTimer {
	timer := &fakeTimer{fire: fire}
	scheduler.durations = append(scheduler.durations, duration)
	scheduler.timers = append(scheduler.timers, timer)
	return timer
}

func assertNotDone(t *testing.T, done <-chan struct{}) {
	t.Helper()
	select {
	case <-done:
		t.Fatal("lifecycle shutdown fired unexpectedly")
	default:
	}
}

func assertDone(t *testing.T, done <-chan struct{}) {
	t.Helper()
	select {
	case <-done:
	default:
		t.Fatal("lifecycle shutdown did not fire")
	}
}

func TestLifecycleDoesNotShutdownBeforeFirstClient(t *testing.T) {
	scheduler := &fakeScheduler{}
	lifecycle := newLifecycle(10*time.Second, scheduler.AfterFunc)

	assertNotDone(t, lifecycle.Done())
	if len(scheduler.timers) != 0 {
		t.Fatalf("scheduled %d timers before first client, want 0", len(scheduler.timers))
	}
}

func TestLifecycleLastClientStartsGraceTimer(t *testing.T) {
	scheduler := &fakeScheduler{}
	lifecycle := newLifecycle(10*time.Second, scheduler.AfterFunc)
	leave := lifecycle.Join()

	leave()

	if len(scheduler.timers) != 1 {
		t.Fatalf("scheduled %d timers, want 1", len(scheduler.timers))
	}
	if scheduler.durations[0] != 10*time.Second {
		t.Fatalf("scheduled grace %s, want 10s", scheduler.durations[0])
	}
	assertNotDone(t, lifecycle.Done())
	scheduler.timers[0].FireEvenIfStopped()
	assertDone(t, lifecycle.Done())
}

func TestLifecycleReconnectCancelsStaleShutdown(t *testing.T) {
	scheduler := &fakeScheduler{}
	lifecycle := newLifecycle(10*time.Second, scheduler.AfterFunc)
	firstLeave := lifecycle.Join()
	firstLeave()
	staleTimer := scheduler.timers[0]

	secondLeave := lifecycle.Join()
	staleTimer.FireEvenIfStopped()
	assertNotDone(t, lifecycle.Done())

	secondLeave()
	if len(scheduler.timers) != 2 {
		t.Fatalf("scheduled %d timers, want 2", len(scheduler.timers))
	}
	scheduler.timers[1].FireEvenIfStopped()
	assertDone(t, lifecycle.Done())
}

func TestLifecycleWaitsForEveryClientAndLeaveIsIdempotent(t *testing.T) {
	scheduler := &fakeScheduler{}
	lifecycle := newLifecycle(10*time.Second, scheduler.AfterFunc)
	firstLeave := lifecycle.Join()
	secondLeave := lifecycle.Join()

	firstLeave()
	firstLeave()
	if len(scheduler.timers) != 0 {
		t.Fatal("scheduled shutdown while another client remained")
	}

	secondLeave()
	if len(scheduler.timers) != 1 {
		t.Fatalf("scheduled %d timers after last client, want 1", len(scheduler.timers))
	}
}
