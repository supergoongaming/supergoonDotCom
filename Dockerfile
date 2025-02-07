FROM nginx:stable-bookworm
COPY index.html script.js styles.css /usr/share/nginx/html
COPY default.conf.template /etc/nginx/templates
ENV NGINX_HOST=supergoon.com
ENV NGINX_PORT=8080
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
