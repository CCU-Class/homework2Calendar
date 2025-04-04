rm -rf dist_package
cp -r dist dist_package
jq 'del(.key)' dist/manifest.json > dist_package/manifest.json
zip -r dist.zip dist_package
rm -rf dist_package