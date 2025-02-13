function loadBlog(name, year) {
    fetch(`blogs/${year}/${name}.html`, { cache: 'no-cache' })
        .then(response => response.text())
        .then(html => {
            document.getElementById("blogs-section").innerHTML = html;
        })
        .catch(error => console.error('Error loading:', location, changeLocation, error));
}
