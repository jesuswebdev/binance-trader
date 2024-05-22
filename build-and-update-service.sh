#!/bin/bash

commit_hash="$(git rev-parse HEAD)"

if [ -z $commit_hash ]; 
then 
    echo "Commit hash cannot be empty"; 
else
    services='trader'

    for service in $services
    do
    echo Building image for service $service with commit hash: $commit_hash
    docker build -t jesuswebdev/binance-trader-$service:$commit_hash -f ./$service/Dockerfile .
    sed -i -e "s/.*image: jesuswebdev\/binance-trader-$service:.*/    image: jesuswebdev\/binance-trader-$service:$commit_hash/g" stack.yml
    docker push jesuswebdev/binance-trader-$service:$commit_hash
    ssh jesus@209.38.204.56 "docker pull jesuswebdev/binance-trader-$service:$commit_hash && exit"
    # ssh jesus@209.38.204.56 "docker pull jesuswebdev/binance-trader-$service:$commit_hash && docker service update --image jesuswebdev/binance-trader-$service:$commit_hash -d trader-api_$service && exit"
    # sed?
    done
    echo All images built and pushed
fi


