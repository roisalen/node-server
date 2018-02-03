from node:6

WORKDIR /app

COPY models/ .
COPY organisation-resource.js .
COPY representatives-resource.js .
COPY server.js .
COPY speaker-list-resource.js .
COPY statistics-resource.js .
COPY subject-resource.js .

COPY package.json .

RUN npm install
RUN npm install -g nodemon
RUN npm install longjohn

CMD [ "npm", "start" ]

