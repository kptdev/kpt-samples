FROM ubuntu:20.04

RUN apt-get update -y
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y \
   python3 \
   python3-pip \
   python3-virtualenv \
   && update-alternatives --install /usr/bin/python python /usr/bin/python3 10

WORKDIR /app

RUN mkdir -p /src/code
RUN mkdir -p /app

COPY env-to-ini.py /src/code

CMD [ "python3", "/src/code/env-to-ini.py"]
