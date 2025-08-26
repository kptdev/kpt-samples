FROM ubuntu:18.04

RUN apt-get update && \
    apt-get install -y wget sudo curl openssh-client

COPY run.sh .
RUN chmod 0555 ./run.sh

CMD ["./run.sh"]