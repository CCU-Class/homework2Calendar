#!/bin/bash

# .env
set -o allexport
source .env
set +o allexport

./zip_dist.sh

ZIP_FILE="dist.zip"

if [ ! -f "$ZIP_FILE" ]; then
  echo "Not found $ZIP_FILE，please package extension to dist.zip"
  exit 1
fi

# 上傳
echo "upload $ZIP_FILE to Chrome Web Store..."

chrome-webstore-upload upload \
  --source "$ZIP_FILE" \
  --extension-id "$EXTENSION_ID" \
  --client-id "$CLIENT_ID" \
  --client-secret "$CLIENT_SECRET" \
  --refresh-token "$REFRESH_TOKEN"

if [ $? -eq 0 ]; then
  echo "upload success"
else
  echo "upload fail"
fi
