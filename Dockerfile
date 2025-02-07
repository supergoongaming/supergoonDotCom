FROM nginx:stable-bookworm
COPY index.html script.js styles.css /usr/share/nginx/html
COPY nginx.conf /etc/nginx/
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
