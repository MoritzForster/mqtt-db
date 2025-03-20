FROM node
WORKDIR /production/mqtt-db
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install 
COPY . .
EXPOSE 3306 1883
RUN chown -R node /production/mqtt-db
USER node
CMD ["npm", "start"]