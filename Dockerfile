FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:stable-alpine
ADD ./configs /home/nginx/configs
COPY --from=build /app/dist /build
# ADD ./cert /home/cert
CMD [ "nginx", "-c", "/home/nginx/configs/nginx.conf","-g", "daemon off;"]
EXPOSE 4451