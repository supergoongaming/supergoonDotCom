package main

import (
	"html/template"
	"log"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	blogs, err := LoadBlogs("content/blogs")
	if err != nil {
		log.Fatalf("loading blogs: %v", err)
	}

	pages, err := loadTemplates()
	if err != nil {
		log.Fatalf("loading templates: %v", err)
	}

	h := NewHandler(pages, blogs)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /", h.Home)
	mux.HandleFunc("GET /projects", h.Projects)
	mux.HandleFunc("GET /blog", h.BlogList)
	mux.HandleFunc("GET /blog/{slug}", h.BlogPost)
	mux.HandleFunc("GET /sgforge", h.SGForge)
	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

func loadTemplates() (map[string]*template.Template, error) {
	funcMap := template.FuncMap{}

	pageNames := []string{"home", "projects", "blog_list", "blog_post", "sgforge"}
	pages := make(map[string]*template.Template, len(pageNames))

	for _, name := range pageNames {
		t, err := template.New("base.html").Funcs(funcMap).ParseFiles(
			"templates/base.html",
			"templates/"+name+".html",
		)
		if err != nil {
			return nil, err
		}
		pages[name] = t
	}

	return pages, nil
}
