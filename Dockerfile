FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY extension/links.js ./extension/links.js
COPY data/departments.json data/categories.json ./data/
EXPOSE 8787
USER node
CMD ["node", "server/index.js"]
