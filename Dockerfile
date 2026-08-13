FROM nginx:stable-bookworm
COPY index.html /usr/share/nginx/html/
COPY projects/ /usr/share/nginx/html/projects/
COPY css/ /usr/share/nginx/html/css/
COPY blogs/ /usr/share/nginx/html/blogs/
COPY js/ /usr/share/nginx/html/js/
COPY sgforge-web /usr/share/nginx/html/sgforge-web/
CMD ["nginx", "-g", "daemon off;"]
