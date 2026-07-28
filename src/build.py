#!/usr/bin/env python3
import shutil
import sys
from datetime import datetime
from pathlib import Path

import markdown

SRC_DIR = Path(__file__).parent
TEMPLATES_DIR = SRC_DIR / "templates"
PAGES_DIR = SRC_DIR / "pages"
BLOGS_DIR = SRC_DIR / "blogs"
STATIC_DIR = SRC_DIR / "static"

PAGE_META = {
    "index": {
        "title": "Kevin Blanchard - Supergoon Games",
        "description": "A dad who loves to tinker with tech, gamedev, networking, devops, and more!",
        "canonical": "/",
    },
    "projects": {
        "title": "Projects | supergoon.com",
        "description": "Games and engines built by Kevin Blanchard",
        "canonical": "/projects.html",
    },
}


def parse_frontmatter(text):
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    meta = {}
    for line in parts[1].splitlines():
        if ":" in line:
            key, val = line.split(":", 1)
            meta[key.strip()] = val.strip()
    return meta, parts[2].strip()


def render_page(template, content, title, description, canonical, extra_scripts=""):
    return template.format_map({
        "title": title,
        "description": description,
        "canonical": canonical,
        "content": content,
        "extra_scripts": extra_scripts,
        "year": datetime.now().year,
    })


def build(dist_dir):
    dist = Path(dist_dir)
    if dist.exists():
        shutil.rmtree(dist)
    dist.mkdir(parents=True)

    # Copy static assets
    shutil.copytree(STATIC_DIR, dist, dirs_exist_ok=True)

    # Load base template
    template = (TEMPLATES_DIR / "base.html").read_text()

    # Parse blogs
    blogs = []
    for md_file in sorted(BLOGS_DIR.glob("*.md")):
        text = md_file.read_text()
        meta, body = parse_frontmatter(text)
        html_content = markdown.markdown(body, extensions=["fenced_code"])
        slug = meta.get("slug", md_file.stem)
        date_obj = datetime.strptime(meta["date"], "%Y-%m-%d").date()
        blogs.append({
            "title": meta["title"],
            "date_obj": date_obj,
            "date_display": date_obj.strftime("%B %Y"),
            "summary": meta.get("summary", ""),
            "slug": slug,
            "html_content": html_content,
        })

    # Generate individual blog pages
    blogs_dir = dist / "blogs"
    blogs_dir.mkdir(exist_ok=True)
    for blog in blogs:
        content = (
            f'<article>\n'
            f'<h1>{blog["title"]}</h1>\n'
            f'<p class="post-meta">{blog["date_display"]}</p>\n'
            f'{blog["html_content"]}\n'
            f'</article>'
        )
        html = render_page(
            template,
            content=content,
            title=f'{blog["title"]} | supergoon.com',
            description=blog["summary"],
            canonical=f'/blogs/{blog["slug"]}.html',
        )
        (blogs_dir / f'{blog["slug"]}.html').write_text(html)

    # Generate blog index
    blogs_sorted = sorted(blogs, key=lambda b: b["date_obj"], reverse=True)
    cards = []
    for blog in blogs_sorted:
        cards.append(
            f'<div class="card">\n'
            f'    <h3><a href="/blogs/{blog["slug"]}.html">{blog["title"]}</a></h3>\n'
            f'    <p>{blog["summary"]}</p>\n'
            f'    <p class="post-meta">{blog["date_display"]}</p>\n'
            f'</div>'
        )
    blog_index_content = f'<h1>Blog Posts</h1>\n<div class="cards">\n{"".join(cards)}\n</div>'
    html = render_page(
        template,
        content=blog_index_content,
        title="Blog | supergoon.com",
        description="Blog posts by Kevin Blanchard",
        canonical="/blogs/",
    )
    (blogs_dir / "index.html").write_text(html)

    # Generate static pages
    for page_file in PAGES_DIR.glob("*.html"):
        stem = page_file.stem
        meta = PAGE_META.get(stem, {})
        content = page_file.read_text()
        extra_scripts = ""
        if stem == "index":
            extra_scripts = '<script src="/js/typingText.js"></script>'
        html = render_page(
            template,
            content=content,
            title=meta.get("title", "supergoon.com"),
            description=meta.get("description", ""),
            canonical=meta.get("canonical", f"/{stem}.html"),
            extra_scripts=extra_scripts,
        )
        (dist / f"{stem}.html").write_text(html)

    # Summary
    count = sum(1 for _ in dist.rglob("*.html"))
    print(f"Built {count} HTML files into {dist}")


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "dist"
    build(out)
