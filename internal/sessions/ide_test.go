package sessions

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadIDEMap(t *testing.T) {
	dir := t.TempDir()

	// Create a lock file simulating PyCharm on port 62809.
	lockData := `{"workspaceFolders":["/Users/me/dev/project-a","/Users/me/dev/project-b"],"pid":99999,"ideName":"PyCharm","transport":"ws","runningInWindows":false}`
	if err := os.WriteFile(filepath.Join(dir, "62809.lock"), []byte(lockData), 0644); err != nil {
		t.Fatal(err)
	}

	// Create a second lock file simulating VS Code.
	lockData2 := `{"workspaceFolders":["/Users/me/dev/project-c"],"pid":99998,"ideName":"VS Code","transport":"ws","runningInWindows":false}`
	if err := os.WriteFile(filepath.Join(dir, "55555.lock"), []byte(lockData2), 0644); err != nil {
		t.Fatal(err)
	}

	ideMap := loadIDEMap(dir)

	if ideMap["/Users/me/dev/project-a"] != "PyCharm" {
		t.Errorf("project-a: got %q, want %q", ideMap["/Users/me/dev/project-a"], "PyCharm")
	}
	if ideMap["/Users/me/dev/project-b"] != "PyCharm" {
		t.Errorf("project-b: got %q, want %q", ideMap["/Users/me/dev/project-b"], "PyCharm")
	}
	if ideMap["/Users/me/dev/project-c"] != "VS Code" {
		t.Errorf("project-c: got %q, want %q", ideMap["/Users/me/dev/project-c"], "VS Code")
	}
}

func TestLoadIDEMapEmptyDir(t *testing.T) {
	dir := t.TempDir()
	ideMap := loadIDEMap(dir)
	if len(ideMap) != 0 {
		t.Errorf("expected empty map, got %d entries", len(ideMap))
	}
}

func TestLoadIDEMapMalformedFile(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "bad.lock"), []byte("not json"), 0644); err != nil {
		t.Fatal(err)
	}
	ideMap := loadIDEMap(dir)
	if len(ideMap) != 0 {
		t.Errorf("expected empty map for malformed file, got %d entries", len(ideMap))
	}
}

func TestSessionClientFieldFromIDEMap(t *testing.T) {
	dir := t.TempDir()
	lockData := `{"workspaceFolders":["/tmp/proj"],"pid":99999,"ideName":"VS Code","transport":"ws"}`
	if err := os.WriteFile(filepath.Join(dir, "12345.lock"), []byte(lockData), 0644); err != nil {
		t.Fatal(err)
	}
	ideMap := loadIDEMap(dir)
	sess := Session{CWD: "/tmp/proj"}
	if name, ok := ideMap[sess.CWD]; ok {
		sess.Client = name
	}
	if sess.Client != "VS Code" {
		t.Errorf("Client = %q, want %q", sess.Client, "VS Code")
	}
}
