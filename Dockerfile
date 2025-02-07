FROM nginx:stable-bookworm
COPY index.html script.js styles.css /usr/share/nginx/html
CMD ["nginx", "-g", "daemon off;"]
