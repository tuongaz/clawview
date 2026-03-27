package sessions

import (
	"bufio"
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

type cachedSession struct {
	modTime time.Time
	session Session
}

var (
	cacheMu sync.Mutex
	cache   = make(map[string]cachedSession)
)

var modelContextLimits = map[string]int{
	"claude-opus-4-6":           1_000_000,
	"claude-sonnet-4-6":         200_000,
	"claude-haiku-4-5-20251001": 200_000,
}

const defaultContextLimit = 200_000

func getModelContextLimit(model string) int {
	if limit, ok := modelContextLimits[model]; ok {
		return limit
	}
	return defaultContextLimit
}

// Session represents a parsed Claude Code session.
type Session struct {
	SessionID   string `json:"sessionId"`
	ProjectName string `json:"projectName"`
	CWD         string `json:"cwd"`
	GitBranch   string `json:"gitBranch"`
	Timestamp   string `json:"timestamp"`
	FirstPrompt    string `json:"firstPrompt"`
	LastUserPrompt string `json:"lastUserPrompt"`
	LastAction     string `json:"lastAction"`
	IsActive        bool   `json:"isActive"`
	WaitingForInput bool   `json:"waitingForInput"`
	UsesMemory      bool   `json:"usesMemory"`
	Version          string `json:"version"`
	ContextTokens    int    `json:"contextTokens"`
	MaxContextTokens int    `json:"maxContextTokens"`
	Model            string `json:"model"`
	Client           string `json:"client"`
}

// ProjectGroup groups sessions by project directory.
type ProjectGroup struct {
	ProjectName string    `json:"projectName"`
	Path        string    `json:"path"`
	Sessions    []Session `json:"sessions"`
}

type message struct {
	Type      string         `json:"type"`
	SessionID string         `json:"sessionId"`
	CWD       string         `json:"cwd"`
	GitBranch string         `json:"gitBranch"`
	Timestamp string         `json:"timestamp"`
	Message   messageContent `json:"message"`
	Version   string         `json:"version"`
}

type messageUsage struct {
	InputTokens              int `json:"input_tokens"`
	CacheCreationInputTokens int `json:"cache_creation_input_tokens"`
	CacheReadInputTokens     int `json:"cache_read_input_tokens"`
	OutputTokens             int `json:"output_tokens"`
}

type messageContent struct {
	Role       string       `json:"role"`
	Content    any          `json:"content"`
	StopReason string       `json:"stop_reason"`
	Model      string       `json:"model"`
	Usage      messageUsage `json:"usage"`
}

// LoadGroupedSessions reads all JSONL session files from ~/.claude/projects/,
// parses them, groups by project, and returns sorted results.
// If limit > 0, only that many sessions per project are returned.
func LoadGroupedSessions(limit int) ([]ProjectGroup, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	ideDir := filepath.Join(home, ".claude", "ide")
	ideMap := loadIDEMap(ideDir)

	pattern := filepath.Join(home, ".claude", "projects", "*", "*.jsonl")
	files, err := filepath.Glob(pattern)
	if err != nil {
		return nil, err
	}

	// Group sessions by project directory.
	projectMap := make(map[string][]Session)
	for _, f := range files {
		// Skip anything under a subagents/ directory.
		if strings.Contains(f, string(filepath.Separator)+"subagents"+string(filepath.Separator)) {
			continue
		}

		info, err := os.Stat(f)
		if err != nil {
			continue
		}

		cacheMu.Lock()
		cached, ok := cache[f]
		cacheMu.Unlock()

		var sess *Session
		if ok && cached.modTime.Equal(info.ModTime()) {
			s := cached.session
			sess = &s
		} else {
			sess, err = parseSession(f)
			if err != nil {
				continue
			}
			cacheMu.Lock()
			cache[f] = cachedSession{modTime: info.ModTime(), session: *sess}
			cacheMu.Unlock()
		}

		// Recompute isActive since it's time-dependent.
		if sess.Timestamp != "" {
			if t, err := time.Parse(time.RFC3339Nano, sess.Timestamp); err == nil {
				sess.IsActive = time.Since(t) < 5*time.Minute
			}
		}

		dirName := filepath.Base(filepath.Dir(f))
		sess.ProjectName = decodeProjectPath(dirName)
		if client, ok := ideMap[sess.CWD]; ok {
			sess.Client = client
		}
		projectMap[dirName] = append(projectMap[dirName], *sess)
	}

	// Build project groups.
	var groups []ProjectGroup
	for dirName, sessions := range projectMap {
		// Sort sessions by timestamp descending.
		sort.Slice(sessions, func(i, j int) bool {
			return sessions[i].Timestamp > sessions[j].Timestamp
		})

		if limit > 0 && len(sessions) > limit {
			sessions = sessions[:limit]
		}

		// Check if this project has a memory directory with files.
		memDir := filepath.Join(home, ".claude", "projects", dirName, "memory")
		hasMemory := false
		if entries, err := os.ReadDir(memDir); err == nil {
			for _, e := range entries {
				if !e.IsDir() && strings.HasSuffix(e.Name(), ".md") {
					hasMemory = true
					break
				}
			}
		}
		if hasMemory {
			for i := range sessions {
				sessions[i].UsesMemory = true
			}
		}

		decodedPath := decodeProjectPath(dirName)
		groups = append(groups, ProjectGroup{
			ProjectName: decodedPath,
			Path:        decodedPath,
			Sessions:    sessions,
		})
	}

	// Sort projects by most recent session timestamp descending.
	sort.Slice(groups, func(i, j int) bool {
		if len(groups[i].Sessions) == 0 {
			return false
		}
		if len(groups[j].Sessions) == 0 {
			return true
		}
		return groups[i].Sessions[0].Timestamp > groups[j].Sessions[0].Timestamp
	})

	return groups, nil
}

func parseSession(fpath string) (*Session, error) {
	f, err := os.Open(fpath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var (
		sess              Session
		firstPrompt       string
		lastUserPrompt    string
		lastAction        string
		lastTS            string
		waitingForInput   bool
		lastModel         string
		lastContextTokens int
	)

	scanner := bufio.NewScanner(f)
	// Increase buffer size for potentially large lines.
	scanner.Buffer(make([]byte, 0, 1024*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var msg message
		if err := json.Unmarshal(line, &msg); err != nil {
			continue
		}

		// Capture session metadata from first valid message.
		if sess.SessionID == "" && msg.SessionID != "" {
			sess.SessionID = msg.SessionID
		}
		if msg.CWD != "" {
			sess.CWD = msg.CWD
		}
		if msg.GitBranch != "" {
			sess.GitBranch = msg.GitBranch
		}
		if msg.Timestamp != "" {
			lastTS = msg.Timestamp
		}
		if msg.Version != "" {
			sess.Version = msg.Version
		}

		// Track whether session is waiting for user input.
		if msg.Type == "user" {
			waitingForInput = false
		} else if msg.Type == "assistant" && msg.Message.StopReason == "end_turn" {
			waitingForInput = true
		} else if msg.Type == "assistant" && msg.Message.StopReason == "tool_use" {
			waitingForInput = false
		}

		// Extract user prompts.
		if msg.Type == "user" {
			text := extractUserText(msg.Message.Content)
			if text != "" {
				if firstPrompt == "" {
					firstPrompt = truncate(text, 120)
				}
				lastUserPrompt = truncateKeepNewlines(text, 200)
			}
		}

		// Extract last action from assistant messages.
		if msg.Type == "assistant" {
			action := extractAction(msg.Message.Content)
			if action != "" {
				lastAction = action
			}

			// Track token usage from the latest assistant message.
			if msg.Message.Model != "" {
				lastModel = msg.Message.Model
			}
			u := msg.Message.Usage
			contextTotal := u.InputTokens + u.CacheCreationInputTokens + u.CacheReadInputTokens
			if contextTotal > 0 {
				lastContextTokens = contextTotal
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	if sess.SessionID == "" {
		return nil, os.ErrNotExist
	}

	sess.Timestamp = lastTS
	sess.FirstPrompt = firstPrompt
	sess.LastUserPrompt = lastUserPrompt
	sess.LastAction = truncate(lastAction, 160)
	sess.WaitingForInput = waitingForInput
	sess.Model = lastModel
	sess.ContextTokens = lastContextTokens
	sess.MaxContextTokens = getModelContextLimit(lastModel)

	// Determine if the session is active (last message within 5 minutes).
	if lastTS != "" {
		if t, err := time.Parse(time.RFC3339Nano, lastTS); err == nil {
			sess.IsActive = time.Since(t) < 5*time.Minute
		}
	}

	return &sess, nil
}

func extractUserText(content any) string {
	if content == nil {
		return ""
	}

	// User messages typically have string content.
	if s, ok := content.(string); ok {
		return s
	}

	// Sometimes content is an array of parts.
	if parts, ok := content.([]any); ok {
		for _, part := range parts {
			if m, ok := part.(map[string]any); ok {
				if t, ok := m["type"].(string); ok && t == "text" {
					if text, ok := m["text"].(string); ok {
						return text
					}
				}
			}
		}
	}

	return ""
}

func extractAction(content any) string {
	if content == nil {
		return ""
	}

	// If content is a string, return a snippet.
	if s, ok := content.(string); ok {
		return truncate(s, 80)
	}

	// Content is an array of parts; find the last tool_use or text.
	parts, ok := content.([]any)
	if !ok {
		return ""
	}

	var lastAction string
	for _, part := range parts {
		m, ok := part.(map[string]any)
		if !ok {
			continue
		}

		t, _ := m["type"].(string)
		switch t {
		case "tool_use":
			if name, ok := m["name"].(string); ok {
				detail := extractToolDetail(name, m["input"])
				if detail != "" {
					lastAction = name + ": " + detail
				} else {
					lastAction = name
				}
			}
		case "text":
			if text, ok := m["text"].(string); ok && text != "" {
				lastAction = truncate(text, 80)
			}
		}
	}

	return lastAction
}

func extractToolDetail(toolName string, input any) string {
	m, ok := input.(map[string]any)
	if !ok || m == nil {
		return ""
	}

	switch toolName {
	case "Read", "Edit", "Write":
		if fp, ok := m["file_path"].(string); ok {
			return truncate(fp, 120)
		}
	case "Bash":
		if desc, ok := m["description"].(string); ok && desc != "" {
			return truncate(desc, 120)
		}
		if cmd, ok := m["command"].(string); ok {
			return truncate(cmd, 120)
		}
	case "Grep":
		if pat, ok := m["pattern"].(string); ok {
			return truncate(pat, 80)
		}
	case "Glob":
		if pat, ok := m["pattern"].(string); ok {
			return truncate(pat, 80)
		}
	case "Agent":
		if desc, ok := m["description"].(string); ok {
			return truncate(desc, 120)
		}
	case "WebSearch", "WebFetch":
		if q, ok := m["query"].(string); ok {
			return truncate(q, 120)
		}
		if u, ok := m["url"].(string); ok {
			return truncate(u, 120)
		}
	}

	return ""
}

func decodeProjectPath(dirname string) string {
	if dirname == "" {
		return ""
	}

	// The directory name encodes a path by replacing "/" with "-".
	// e.g., "-Users-tuongaz-dev-foo" -> "/Users/tuongaz/dev/foo"
	// A leading "-" indicates an absolute path starting with "/".
	result := strings.ReplaceAll(dirname, "-", "/")
	return result
}

func truncate(s string, max int) string {
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.TrimSpace(s)
	if len(s) <= max {
		return s
	}
	if max <= 3 {
		return s[:max]
	}
	return s[:max-3] + "..."
}

func truncateKeepNewlines(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) <= max {
		return s
	}
	if max <= 3 {
		return s[:max]
	}
	return s[:max-3] + "..."
}
