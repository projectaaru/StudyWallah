package handlers

import (
	"context"
	"encoding/xml"
	"net/http"
	"strings"
	"sync"
	"time"
)

// NeetUpdateItem represents a single exam news headline for the StudyWallah home card.
type NeetUpdateItem struct {
	Title       string `json:"title"`
	Source      string `json:"source"`
	PublishedAt string `json:"published_at"`
}

type rssFeed struct {
	Channel struct {
		Items []struct {
			Title   string `xml:"title"`
			PubDate string `xml:"pubDate"`
			Source  string `xml:"source"`
		} `xml:"item"`
	} `xml:"channel"`
}

// NewsHandler serves cached real-time NEET exam updates for the StudyWallah educational UI.
type NewsHandler struct {
	mu        sync.Mutex
	cached    []NeetUpdateItem
	fetchedAt time.Time
	client    *http.Client
}

// NewNewsHandler constructs a NewsHandler with a bounded HTTP client timeout.
func NewNewsHandler() *NewsHandler {
	return &NewsHandler{
		client: &http.Client{Timeout: 3 * time.Second},
	}
}

// GetNeetUpdates handles GET /api/v1/public/neet-updates.
func (h *NewsHandler) GetNeetUpdates(w http.ResponseWriter, r *http.Request) {
	items := h.getUpdates(r.Context())
	WriteJSON(w, http.StatusOK, map[string]any{
		"updates":    items,
		"updated_at": time.Now().UTC(),
	})
}

func (h *NewsHandler) getUpdates(ctx context.Context) []NeetUpdateItem {
	h.mu.Lock()
	defer h.mu.Unlock()

	if len(h.cached) > 0 && time.Since(h.fetchedAt) < 15*time.Minute {
		return h.cached
	}

	items, err := h.fetchGoogleNewsRSS(ctx)
	if err == nil && len(items) > 0 {
		h.cached = items
		h.fetchedAt = time.Now()
		return h.cached
	}

	if len(h.cached) > 0 {
		return h.cached
	}
	return fallbackNeetUpdates()
}

func (h *NewsHandler) fetchGoogleNewsRSS(ctx context.Context) ([]NeetUpdateItem, error) {
	const feedURL = "https://news.google.com/rss/search?q=NEET+UG+NTA+exam&hl=en-IN&gl=IN&ceid=IN:en"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, feedURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "StudyWallah/1.0")

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var feed rssFeed
	if err := xml.NewDecoder(resp.Body).Decode(&feed); err != nil {
		return nil, err
	}

	out := make([]NeetUpdateItem, 0, 4)
	for _, it := range feed.Channel.Items {
		title := strings.TrimSpace(it.Title)
		if title == "" {
			continue
		}
		source := strings.TrimSpace(it.Source)
		if idx := strings.LastIndex(title, " - "); idx > 0 {
			if source == "" {
				source = strings.TrimSpace(title[idx+3:])
			}
			title = strings.TrimSpace(title[:idx])
		}
		if source == "" {
			source = "Exam Desk"
		}
		pub := strings.TrimSpace(it.PubDate)
		if parsed, parseErr := time.Parse(time.RFC1123, pub); parseErr == nil {
			pub = parsed.Format("02 Jan")
		} else if len(pub) > 16 {
			pub = pub[:16]
		}
		out = append(out, NeetUpdateItem{
			Title:       title,
			Source:      source,
			PublishedAt: pub,
		})
		if len(out) >= 4 {
			break
		}
	}
	return out, nil
}

func fallbackNeetUpdates() []NeetUpdateItem {
	return []NeetUpdateItem{
		{
			Title:       "NTA NEET UG: NCERT Rationalised Class 11 & 12 Syllabus Guidelines",
			Source:      "NTA Bulletin",
			PublishedAt: "Latest",
		},
		{
			Title:       "NEET Biology & Organic Chemistry High-Weightage Chapters Checklist",
			Source:      "StudyWallah",
			PublishedAt: "Today",
		},
		{
			Title:       "All India NEET Mock Practice Window Open for Weekend Test",
			Source:      "Academic Cell",
			PublishedAt: "Today",
		},
	}
}
