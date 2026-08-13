package main

import (
	"bytes"
	"html/template"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/yuin/goldmark"
	"gopkg.in/yaml.v3"
)

type Post struct {
	Title       string    `yaml:"title"`
	Date        time.Time `yaml:"date"`
	Description string    `yaml:"description"`
	Slug        string    `yaml:"slug"`
	ContentHTML template.HTML
}

type BlogStore struct {
	posts []Post
}

func LoadBlogs(dir string) (*BlogStore, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	var posts []Post
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".md") {
			continue
		}
		post, err := parsePost(filepath.Join(dir, entry.Name()))
		if err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}

	sort.Slice(posts, func(i, j int) bool {
		return posts[i].Date.After(posts[j].Date)
	})

	return &BlogStore{posts: posts}, nil
}

func (s *BlogStore) All() []Post {
	return s.posts
}

func (s *BlogStore) BySlug(slug string) (Post, bool) {
	for _, p := range s.posts {
		if p.Slug == slug {
			return p, true
		}
	}
	return Post{}, false
}

func parsePost(path string) (Post, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Post{}, err
	}

	content := string(data)
	parts := strings.SplitN(content, "---", 3)
	if len(parts) < 3 {
		return Post{}, err
	}

	var post Post
	if err := yaml.Unmarshal([]byte(parts[1]), &post); err != nil {
		return Post{}, err
	}

	var buf bytes.Buffer
	if err := goldmark.Convert([]byte(strings.TrimSpace(parts[2])), &buf); err != nil {
		return Post{}, err
	}
	post.ContentHTML = template.HTML(buf.Bytes())

	return post, nil
}
