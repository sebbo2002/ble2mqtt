#!/usr/bin/env bash

if [ "$VERSION" != "" ]; then
    npx sentry-cli releases finalize ${VERSION}
fi;
