#!/usr/bin/env bash
set -e

echo "########################"
echo "# build.sh"
echo "# Version = ${VERSION}"
echo "# Branch = ${BRANCH}"
echo "# npm version = $(npm -v)"
echo "########################"

# Rollup Build in ./dist
npm run build

if [ "$BRANCH" != "develop" ] && [ "$BRANCH" != "main" ] && [ "$BRANCH" != "" ]; then
    echo "Skip documentation as branch is not develop and not main (is: ${BRANCH}).";
    exit 0;
fi;


mkdir -p ./docs/
rm -rf ./docs/coverage/ ./docs/tests/


# Test Report in ./docs/tests
npx mocha --reporter mochawesome
mv -f ./mochawesome-report/mochawesome.html ./mochawesome-report/index.html
mv -f ./mochawesome-report ./docs/tests

# Coverage Report in ./doc/coverage
npm run coverage

# Sentry Release
if [ "$VERSION" != "" ]; then
    npx sentry-cli releases new -p ble2mqtt $VERSION
    npx sentry-cli releases set-commits $VERSION --auto
fi;
