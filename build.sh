#!/bin/bash

commit_hash="$(git rev-parse HEAD)"

if [ -z $commit_hash ]; 
then 
    echo "Commit hash cannot be empty"; 
else
    services='account-observer candles-processor markets-observer positions-processor signals-processor trader cancel-unfilled-orders-service update-market-orders-service'

    for service in $services
    do
    echo Building image for service $service with commit hash: $commit_hash
    docker build -t jesuswebdev/binance-trader-$service:$commit_hash -f ./$service/Dockerfile .
    docker push jesuswebdev/binance-trader-$service:$commit_hash
   # ssh jesus@209.38.204.56 "docker pull jesuswebdev/binance-trader-$service:$commit_hash && docker service update --image jesuswebdev/binance-trader-$service:$commit_hash -d binance-trader_$service && exit"
    ssh jesus@209.38.204.56 "docker pull jesuswebdev/binance-trader-$service:$commit_hash && exit"
    done
    echo All images built and pushed
fi


