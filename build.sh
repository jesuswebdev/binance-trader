#!/bin/bash

commit_hash="$(git rev-parse HEAD)"

if [ -z $commit_hash ]; 
then 
    echo "Commit hash cannot be empty"; 
else
    services='account-observer candles-processor markets-observer positions-processor signals-processor trader'

    for service in $services
    do
    echo Building image for service $service with commit hash: $commit_hash
    docker build -t jesuswebdev/binance-trader-$service:$commit_hash -f ./$service/Dockerfile .
    docker push jesuswebdev/binance-trader-$service:$commit_hash
    done
    echo All images built and pushed
fi


