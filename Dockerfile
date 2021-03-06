FROM node:0.12.7-wheezy
#FROM ubuntu:14.04

# update apt-get
RUN apt-get -y update && apt-get -y upgrade

# install build-essential
RUN apt-get -y install build-essential

RUN cd /tmp; git clone https://github.com/tj/mon; cd mon; make install

COPY . /src

RUN rm -rf /src/node_modules

RUN npm install -g npm

RUN cd /src; npm install

WORKDIR /src

EXPOSE 9999

CMD node /src/bin/server

# CMD node /src/bin/worker

# CMD node /src/bin/worker

# CMD node /src/bin/worker

# CMD node /src/bin/worker

# CMD node /src/bin/worker