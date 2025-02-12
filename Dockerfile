FROM nginx:stable-bookworm
COPY index.html /usr/share/nginx/html/
COPY projects/ /usr/share/nginx/html/projects/
COPY css/ /usr/share/nginx/html/css/
COPY blogs/ /usr/share/nginx/html/blogs/
COPY js/ /usr/share/nginx/html/js/
# ADD projects css js /usr/share/nginx/html
CMD ["nginx", "-g", "daemon off;"]
