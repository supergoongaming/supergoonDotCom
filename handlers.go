package main

import (
	"html/template"
	"net/http"
	"time"
)

type Project struct {
	Title       string
	Description string
	LiveURL     string
	CodeURL     string
	Year        string
}

var projects = []Project{
	{
		Title:       "Escape The Fate",
		Description: "A 2D JRPG built on a custom C engine with embedded Lua scripting.",
		LiveURL:     "https://etf.supergoon.com",
		CodeURL:     "https://github.com/kjblanchard/etf",
		Year:        "2025",
	},
	{
		Title:       "Supergoon Engine",
		Description: "A custom 2D game engine built with C and SDL3.",
		CodeURL:     "https://github.com/kjblanchard/sgEngine",
		Year:        "2025",
	},
	{
		Title:       "Supergoon World",
		Description: "A Mario-style platformer built with C++ and SDL2.",
		LiveURL:     "https://sgworld.supergoon.com",
		CodeURL:     "https://github.com/kjblanchard/SupergoonWorld",
		Year:        "2020",
	},
	{
		Title:       "Triple Triad",
		Description: "The FF8 card game recreated in Unity with C#.",
		LiveURL:     "https://tripletriad.supergoon.com",
		CodeURL:     "https://github.com/kjblanchard/TripleTriad",
		Year:        "2018",
	},
}

type Handler struct {
	pages map[string]*template.Template
	blogs *BlogStore
}

func NewHandler(pages map[string]*template.Template, blogs *BlogStore) *Handler {
	return &Handler{pages: pages, blogs: blogs}
}

func (h *Handler) Home(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	h.render(w, "home", nil)
}

func (h *Handler) Projects(w http.ResponseWriter, r *http.Request) {
	h.render(w, "projects", map[string]any{
		"Projects": projects,
	})
}

func (h *Handler) BlogList(w http.ResponseWriter, r *http.Request) {
	h.render(w, "blog_list", map[string]any{
		"Posts": h.blogs.All(),
	})
}

func (h *Handler) BlogPost(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	post, ok := h.blogs.BySlug(slug)
	if !ok {
		http.NotFound(w, r)
		return
	}
	h.render(w, "blog_post", map[string]any{
		"Post": post,
	})
}

func (h *Handler) SGForge(w http.ResponseWriter, r *http.Request) {
	h.render(w, "sgforge", nil)
}

func (h *Handler) render(w http.ResponseWriter, page string, data map[string]any) {
	tmpl, ok := h.pages[page]
	if !ok {
		http.Error(w, "page not found", http.StatusInternalServerError)
		return
	}
	if data == nil {
		data = map[string]any{}
	}
	data["Year"] = time.Now().Year()
	if err := tmpl.ExecuteTemplate(w, "base", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
