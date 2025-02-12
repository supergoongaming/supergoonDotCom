FROM nginx:stable-bookworm
COPY index.html projects/ css/ js/ /usr/share/nginx/html
# ADD projects css js /usr/share/nginx/html
CMD ["nginx", "-g", "daemon off;"]
