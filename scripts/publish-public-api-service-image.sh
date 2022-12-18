# !/bin/bash

cd api

DOCKER_BUILDKIT=0

COMPOSE_DOCKER_CLI_BUILD=0

REGION="ap-northeast-1"

ECR_REPO="tetris"

ACCOUNT_ID=$1

VERSION=$2

DOCKER_IMAGE_TAG="public_api_service_v${VERSION}"

if ! [[ -x "$(command -v docker)" ]]; then
  echo "docker is not executable"
  exit 1
fi

if ! [[ -x "$(command -v aws)" ]]; then
  echo "aws is not executable"
  exit 1
fi

aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

docker build . -f Dockerfile.public -t ${DOCKER_IMAGE_TAG}

docker tag ${DOCKER_IMAGE_TAG} ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}:${DOCKER_IMAGE_TAG}

docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}:${DOCKER_IMAGE_TAG}